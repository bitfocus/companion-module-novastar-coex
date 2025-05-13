const { InstanceBase, Regex, runEntrypoint, InstanceStatus } = require('@companion-module/base')
const UpgradeScripts = require('./upgrades')
const UpdateActions = require('./actions')
const UpdateFeedbacks = require('./feedbacks')
const UpdateVariableDefinitions = require('./variables')

const Novastar = require('@novastar-dev/coex')
const _ = require('lodash')

const novastar = {}
const sources = []
const sourcelist = []

class ModuleInstance extends InstanceBase {
  constructor(internal) {
    super(internal)
    this.pollTimer = null // Timer for polling
    this.displayParams = [] // Store display parameters
    this.presets = [] // Store presets
    this.presetlist = [] // Store presets for dropdown
    this.currentPresetName = 'Not Activated' // Store current preset name
    this.displayState = null // Store current display state
    this.initialDataFetched = false // Add a flag to track if initial data fetch is complete
  }

  async init(config) {
    this.config = config
    this.updateStatus(InstanceStatus.Connecting) // Set initial status to Connecting
    this.displayParams = [] // Reset params on init
    this.sources = [] // Reset sources
    this.sourcelist = [] // Reset sourcelist
    this.presets = [] // Reset presets
    this.presetlist = [] // Reset presetlist
    this.displayState = null // Reset display state
    this.initialDataFetched = false // Reset flag

    // Clear any existing timer
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }

    // Update actions, feedbacks, and variables definitions immediately
    // so the user can see them even if the connection fails or is pending.
    this.updateActions()
    this.updateFeedbacks()
    this.updateVariableDefinitions()
    this.checkVariables() // Update with default/empty values

    if (config && config.host) {
      this.novastar = new Novastar(config.host, config.port) // Pass port too
      // Start asynchronous initialization without awaiting
      this.asyncInitialize().catch(error => {
        // Catch errors from asyncInitialize to prevent unhandled promise rejections
        this.log('error', `Async initialization failed: ${error.message || JSON.stringify(error)}`)
        // Potentially set a specific error status if not already handled within asyncInitialize
        if (this.initialDataFetched === false) {
          // Check if it failed before any success
          this.updateStatus(InstanceStatus.ConnectionFailure)
        }
      })
    } else {
      this.updateStatus(InstanceStatus.BadConfig) // Set status if host is not configured
      // Ensure lists are empty and UI reflects this
      this.sources = []
      this.sourcelist = []
      this.displayParams = []
      this.presets = []
      this.presetlist = []
      this.displayState = null
      this.updateActions() // Reflect empty lists in actions
      this.updateVariableDefinitions()
      this.checkVariables()
    }
  }

  // New method for asynchronous initialization tasks
  async asyncInitialize() {
    try {
      // Fetch sources first
      const sourcesResponse = await this.novastar.sources() // Await the promise
      this.sources = sourcesResponse
      this.log('info', 'Connected and fetched sources')

      this.sourcelist = _.map(this.sources, function (source) {
        return { id: source.name, label: source.name }
      })

      // Fetch presets
      const presetsResponse = await this.novastar.getPreset()
      this.presets = presetsResponse || [] // Ensure it's an array
      this.log('info', 'Fetched presets')

      this.presetlist = _.map(this.presets, function (preset) {
        // Use preset name for both id and label for simplicity in action callback
        return { id: preset.name, label: preset.name }
      })

      // Find the active preset
      const activePreset = this.presets.find((p) => p.state === true)
      this.currentPresetName = activePreset ? activePreset.name : 'Not Activated'

      this.updateStatus(InstanceStatus.Ok)
      this.initialDataFetched = true // Mark initial data fetch as successful
      this.updateActions() // export actions after successful connection and data retrieval
      this.updateVariableDefinitions() // Update definitions based on fetched data (e.g., screen count)
      this.checkVariables() // Update variable values

      // Initial fetch using Promise.all for parallel execution
      await Promise.all([
        this.pollData(
          this.novastar.getDisplayParams.bind(this.novastar),
          'displayParams',
          this.processDisplayParamsData,
          'Display parameters'
        ),
        this.pollData(
          this.novastar.getPreset.bind(this.novastar), // Use the correct function name
          'presets',
          this.processPresetsData,
          'Presets'
        ),
        this.pollData(
          this.novastar.getDisplayState.bind(this.novastar),
          'displayState',
          this.processDisplayStateData,
          'Display state'
        ),
      ])

      // Start the combined polling timer
      // Clear any existing timer before starting a new one
      if (this.pollTimer) {
        clearInterval(this.pollTimer)
      }
      this.pollTimer = setInterval(async () => {
        // Make interval callback async
        // Run polling in parallel
        await Promise.all([
          this.pollData(
            this.novastar.getDisplayParams.bind(this.novastar),
            'displayParams',
            this.processDisplayParamsData,
            'Display parameters'
          ),
          this.pollData(
            this.novastar.getPreset.bind(this.novastar), // Use the correct function name
            'presets',
            this.processPresetsData,
            'Presets'
          ),
          this.pollData(
            this.novastar.getDisplayState.bind(this.novastar),
            'displayState',
            this.processDisplayStateData,
            'Display state'
          ),
        ])
      }, 500) // Poll every 0.5 seconds (adjust as needed)
    } catch (error) {
      this.log('error', `Connection or initial data fetch failed: ${error.message || JSON.stringify(error)}`) // Log the error
      this.updateStatus(InstanceStatus.ConnectionFailure)
      this.initialDataFetched = false // Mark as failed
      this.sources = [] // Clear sources on failure
      this.sourcelist = [] // Clear sourcelist on failure
      this.displayParams = [] // Clear display params on failure
      this.presets = [] // Clear presets on failure
      this.presetlist = [] // Clear presetlist on failure
      this.displayState = null // Clear display state on failure
      this.updateActions() // Still update actions, maybe with empty lists
      this.updateVariableDefinitions() // Update variables to reflect empty state
      this.checkVariables() // Update variable values (likely to empty/default)
      // Rethrow the error if you want the caller (this.init's catch block) to also handle it
      // throw error; // Or handle it fully here
    }
  }

  // Generic method to poll data from the device
  async pollData(apiMethod, stateProperty, processDataCallback, errorMsgPrefix) {
    if (!this.novastar) {
      return
    }
    try {
      const newData = await apiMethod()
      const currentData = this[stateProperty]

      // Ensure newData is always an array for comparison for list-based properties
      // Adjust for displayState which is an object, not an array
      const safeNewData =
        stateProperty === 'presets' || stateProperty === 'displayParams'
          ? newData || []
          : newData

      if (!_.isEqual(safeNewData, currentData)) {
        this.log('debug', `${errorMsgPrefix} updated`)
        this[stateProperty] = safeNewData // Update the main state property

        // Call the specific processing logic
        if (processDataCallback) {
          processDataCallback.call(this, safeNewData) // Use .call to maintain 'this' context
        }
      }
    } catch (error) {
      this.log('warn', `Failed to poll ${errorMsgPrefix.toLowerCase()}: ${error.message || JSON.stringify(error)}`)
    }
  }

  // Specific callback for processing display parameters data
  processDisplayParamsData(newParams) {
    // this.displayParams is already updated by pollData
    this.updateVariableDefinitions() // Re-define variables if screen count changes
    this.checkVariables() // Update the variable values
    this.checkFeedbacks() // Add this line to trigger feedback updates
  }

  // Specific callback for processing presets data
  processPresetsData(newPresets) {
    // this.presets is already updated by pollData
    // Update preset list for dropdowns
    this.presetlist = _.map(newPresets, function (preset) {
      return { id: preset.name, label: preset.name }
    })
    // Update actions only if initial data has been fetched, to avoid errors if presetlist is used before populated
    if (this.initialDataFetched) {
      this.updateActions()
    }

    // Find the active preset
    const activePreset = newPresets.find((p) => p.state === true)
    const newPresetName = activePreset ? activePreset.name : 'Not Activated'

    // Update the variable only if the name changed
    if (newPresetName !== this.currentPresetName) {
      this.currentPresetName = newPresetName
      // Update variables including the preset name
      this.checkVariables()
      this.checkFeedbacks() // Add this line
    } else {
      // Optional: If other feedbacks depend on the full preset list,
      // you might want to call checkFeedbacks() here too, even if the
    }
  }

  // Specific callback for processing display state data
  processDisplayStateData(newState) {
    // this.displayState is already updated by pollData
    this.checkVariables() // Update variable values
    this.checkFeedbacks() // Update feedbacks if any depend on display state
  }

  // Method to update variable values based on stored data
  checkVariables() {
    const variableValues = {}
    if (Array.isArray(this.displayParams)) {
      this.displayParams.forEach((param, index) => {
        const screenLabel = `Screen ${index + 1}` // Use index for label as ID might be long
        variableValues[`screen_${index}_id`] = param.screenId
        // Convert brightness to percentage string
        const brightnessPercent = Math.round((param.brightness || 0) * 100)
        variableValues[`screen_${index}_brightness`] = `${brightnessPercent}%`
        variableValues[`screen_${index}_colortemp`] = param.colorTemperature + 'K'
        variableValues[`screen_${index}_gamma`] = param.gamma
      })
    }
    // Set the current preset name variable
    variableValues['current_preset_name'] = this.currentPresetName || 'Not Activated'

    // Set the display state variable
    if (this.displayState && this.displayState.displayState && this.displayState.displayState.length > 0) {
      const currentMode = this.displayState.displayState[0].displayMode
      const modeMap = {
        0: 'Normal',
        1: 'Blackout',
        2: 'Freeze',
      }
      variableValues['display_state'] = modeMap[currentMode] || 'Unknown'
    } else {
      variableValues['display_state'] = 'Unknown' // Default if state is unavailable
    }

    this.setVariableValues(variableValues)
  }

  // When module gets deleted
  async destroy() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
    // Add any other necessary cleanup, like stopping the Novastar connection if applicable
    if (this.novastar && typeof this.novastar.disconnect === 'function') {
      // Assuming a disconnect method
      try {
        await this.novastar.disconnect()
        this.log('info', 'Disconnected from Novastar device.')
      } catch (error) {
        this.log('error', `Error during disconnect: ${error.message || JSON.stringify(error)}`)
      }
    }
    this.log('debug', 'destroy')
  }

  async configUpdated(config) {
    this.log('info', 'Reloading config')
    // Clear old timer before re-init
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
    // If there's an existing Novastar instance, attempt to clean it up
    if (this.novastar && typeof this.novastar.disconnect === 'function') {
      try {
        await this.novastar.disconnect() // Assuming a disconnect method
        this.log('info', 'Disconnected from Novastar device due to re-config.')
      } catch (error) {
        this.log('warn', `Error disconnecting previous Novastar instance: ${error.message}`)
      }
    }
    this.config = config
    // Re-initialize with the new config.
    // The init method itself will handle starting asyncInitialize.
    this.init(config)
  }

  // Return config fields for web config
  getConfigFields() {
    return [
      {
        type: 'textinput',
        id: 'host',
        label: 'Target IP',
        width: 8,
        regex: Regex.IP,
      },
      {
        type: 'textinput',
        id: 'port',
        label: 'Target Port',
        width: 4,
        regex: Regex.PORT,
        default: 8001,
      },
    ]
  }

  updateActions() {
    UpdateActions(this)
  }

  updateFeedbacks() {
    UpdateFeedbacks(this)
  }

  updateVariableDefinitions() {
    UpdateVariableDefinitions(this)
  }
}

runEntrypoint(ModuleInstance, UpgradeScripts)
