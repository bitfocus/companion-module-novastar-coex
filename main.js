const { InstanceBase, Regex, runEntrypoint, InstanceStatus } = require('@companion-module/base')
const UpgradeScripts = require('./upgrades')
const UpdateActions = require('./actions')
const UpdateFeedbacks = require('./feedbacks')
const UpdateVariableDefinitions = require('./variables')

// const Novastar = require('novastar-coex')
const Novastar = require('C:\\Users\\zhang\\Downloads\\projects\\companion-project\\novastar-coex\\index.js'); // if you'd like to use a local module
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
	}

	async init(config) {
		this.config = config
		this.updateStatus(InstanceStatus.Connecting) // Set initial status to Connecting
		this.displayParams = [] // Reset params on init
		this.sources = [] // Reset sources
		this.sourcelist = [] // Reset sourcelist
		this.presets = [] // Reset presets
		this.presetlist = [] // Reset presetlist

		// Clear any existing timer
		if (this.pollTimer) {
			clearInterval(this.pollTimer)
			this.pollTimer = null
		}

		if (config && config.host) {
			this.novastar = new Novastar(config.host, config.port) // Pass port too

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

				this.updateStatus(InstanceStatus.Ok)
				this.updateActions() // export actions after successful connection and data retrieval

				// Initial fetch of display params and start polling
				await this.pollDisplayParams()
				this.pollTimer = setInterval(() => this.pollDisplayParams(), 1000) // Poll every 5 seconds

			} catch (error) {
				this.log('error', `Connection or initial data fetch failed: ${error.message || JSON.stringify(error)}`) // Log the error
				this.updateStatus(InstanceStatus.ConnectionFailure)
				this.sources = [] // Clear sources on failure
				this.sourcelist = [] // Clear sourcelist on failure
				this.displayParams = [] // Clear display params on failure
				this.presets = [] // Clear presets on failure
				this.presetlist = [] // Clear presetlist on failure
				this.updateActions() // Still update actions, maybe with empty lists
				this.updateVariableDefinitions() // Update variables to reflect empty state
				this.checkVariables() // Update variable values (likely to empty/default)
			}
		} else {
			this.updateStatus(InstanceStatus.BadConfig) // Set status if host is not configured
			this.sources = []
			this.sourcelist = []
			this.displayParams = []
			this.presets = []
			this.presetlist = []
			this.updateActions() // Update actions even with bad config
			this.updateVariableDefinitions() // Update variables to reflect empty state
			this.checkVariables()
		}

		// These can be called regardless of connection status initially
		// updateVariableDefinitions and checkVariables are now called after fetching data or on error/bad config
		this.updateFeedbacks() // export feedbacks
	}

	// Method to fetch display parameters and update variables
	async pollDisplayParams() {
		if (!this.novastar) { // Remove the this.getStatus() check
			// Don't poll if not connected or configured properly
			return
		}
		try {
			const params = await this.novastar.getDisplayParams()
			// Check if params actually changed before updating everything
			if (!_.isEqual(params, this.displayParams)) {
				this.log('debug', 'Display parameters updated')
				this.displayParams = params || [] // Store the fetched parameters, ensure it's an array
				this.updateVariableDefinitions() // Re-define variables if screen count changes (unlikely but good practice)
				this.checkVariables() // Update the variable values
			}
		} catch (error) {
			this.log('warn', `Failed to poll display parameters: ${error.message || JSON.stringify(error)}`)
			// Optionally handle repeated errors, maybe change status
		}
	}

	// Method to update variable values based on stored displayParams
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
		this.setVariableValues(variableValues)
	}

	// When module gets deleted
	async destroy() {
		if (this.pollTimer) {
			clearInterval(this.pollTimer)
			this.pollTimer = null
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
		this.config = config
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
