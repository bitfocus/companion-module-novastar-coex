const _ = require('lodash')

module.exports = function (self) {
  self.setActionDefinitions({
    source: {
      name: 'Change Input Source',
      options: [
        {
          id: 'num',
          type: 'dropdown',
          label: 'Mode',
          default: _.get(self, 'sourcelist[0].id'),
          choices: self.sourcelist,
        },
      ],
      callback: async (event) => {
        self.log('debug', 'Change Input Source: ' + event.options.num) // Use self.log
        try {
          // Use await and try/catch, remove callback function
          const response = await self.novastar.input(event.options.num)
          self.log('debug', 'Input change response: ' + JSON.stringify(response)) // Log success if needed
        } catch (error) {
          self.log('error', `Error changing input source: ${error.message || error}`) // Use self.log for errors
        }
      },
    },
    brightness: {
      name: 'Brightness',
      options: [
        {
          id: 'num',
          type: 'number',
          label: 'Brightness',
          default: 50,
          min: 0,
          max: 100,
        },
      ],
      callback: async (event) => {
        self.log('info', 'Change Brightness: ' + event.options.num) // Use self.log
        try {
          // Use await and try/catch, remove callback function (assuming brightness takes value and optional screenId)
          const response = await self.novastar.brightness(event.options.num, null)
          self.log('debug', 'Brightness change response: ' + JSON.stringify(response)) // Log success if needed
        } catch (error) {
          self.log('error', `Error changing brightness: ${error.message || error}`) // Use self.log for errors
        }
      },
    },
    gamma: {
      name: 'Gamma',
      options: [
        {
          id: 'num',
          type: 'number',
          label: 'Gamma',
          default: 2.8,
          min: 1,
          max: 4,
        }
      ],
      callback: async (event) => {
        self.log('info', `Change Gamma: Value=${event.options.num}`) // Use self.log
        try {
          // Use await and try/catch, remove callback function (assuming gamma takes value, type, optional screenId)
          const response = await self.novastar.gamma(event.options.num, null)
          self.log('debug', 'Gamma change response: ' + JSON.stringify(response)) // Log success if needed
        } catch (error) {
          self.log('error', `Error changing gamma: ${error.message || error}`) // Use self.log for errors
        }
      },
    },
    display_mode: {
      name: 'Display Mode',
      options: [
        {
          id: 'num',
          type: 'dropdown',
          label: 'Mode',
          default: 0,
          choices: [
            { id: 0, label: 'Normal' },
            { id: 1, label: 'Blackout' },
            { id: 2, label: 'Freeze' },
          ],
        },
      ],
      callback: async (event) => {
        // Map the numeric value to a descriptive string
        const modeMap = {
          0: 'Normal',
          1: 'Blackout',
          2: 'Freeze',
        };
        const modeName = modeMap[event.options.num] || 'Unknown'; // Get the name or default to 'Unknown'

        self.log('info', 'Display Mode: ' + modeName); // Use the mode name in the log
        try {
          // Use await and try/catch, remove callback function
          const response = await self.novastar.displaymode(event.options.num)
          self.log('debug', 'Display mode change response: ' + JSON.stringify(response)) // Log success if needed
        } catch (error) {
          self.log('error', `Error changing display mode: ${error.message || error}`) // Use self.log for errors
        }
      },
    },
    colortemp: {
      name: 'Color Temperature',
      options: [
        {
          id: 'num',
          type: 'number',
          label: 'Color Temp',
          default: 6500,
          min: 1700,
          max: 15000,
        },
      ],
      callback: async (event) => {
        self.log('info', 'Change Color Temp: ' + event.options.num) // Use self.log
        try {
          // Use await and try/catch, remove callback function (assuming colortemperature takes value, optional screenId)
          const response = await self.novastar.colortemperature(event.options.num, null)
          self.log('debug', 'Color temp change response: ' + JSON.stringify(response)) // Log success if needed
        } catch (error) {
          self.log('error', `Error changing color temperature: ${error.message || error}`) // Use self.log for errors
        }
      },
    },
    preset: {
      name: 'Preset',
      options: [
        {
          id: 'preset',
          type: 'dropdown', // Change type to dropdown
          label: 'Preset Name',
          default: _.get(self, 'presetlist[0].id'), // Default to the first preset name
          choices: self.presetlist, // Use the dynamic list from main.js
        },
      ],
      callback: async (event) => {
        self.log('info', 'Change Preset: ' + event.options.preset) // Use self.log
        try {
          // Use await and try/catch, remove callback function (assuming applyPreset takes name or ID)
          const response = await self.novastar.applyPreset(event.options.preset, null)
          self.log('info', `Successfully applied preset: ${event.options.preset}`)
          self.log('debug', 'Apply preset response: ' + JSON.stringify(response))
          // Optional: Force a poll after applying preset to update state immediately
          // await self.pollData(...) for presets
        } catch (error) {
          self.log('error', `Failed to apply preset: ${error.message || error}`) // Use self.log for errors
        }
      },
    },
    testpattern: {
      name: 'Test Pattern',
      options: [
        {
          id: 'mode',
          type: 'dropdown',
          label: 'Test Pattern',
          default: 0,
          choices: [
            { id: 0, label: 'Color' },
            { id: 16, label: 'Horizontal stripes to the bottom' },
            { id: 17, label: 'Horizontal stripes to the right' },
            { id: 18, label: 'Slashes' },
            { id: 19, label: 'Backslashes' },
            { id: 20, label: 'Grid to the bottom right' },
            { id: 21, label: 'Grid to the right' },
            { id: 32, label: 'Left-to-right red gradient' },
            { id: 33, label: 'Left-to-right green gradient' },
            { id: 34, label: 'Left-to-right blue gradient' },
            { id: 35, label: 'Left-to-right gray gradient' },
            { id: 36, label: 'Top-to-bottom red gradient' },
            { id: 37, label: 'Top-to-bottom green gradient' },
            { id: 38, label: 'Top-to-bottom blue gradient' },
            { id: 39, label: 'Top-to-bottom gray gradient' },
            { id: 48, label: 'Lightning' },
          ],
        },
        {
          id: 'params',
          type: 'static-text',
          label:
            'Some of the test patterns use optional parameters, such as color values for "Color" pattern, or speed for gradients and other patterns. Default values are included.',
        },
        {
          id: 'red',
          type: 'number',
          label: 'Red',
          default: 4095,
          min: 0,
          max: 4095,
        },
        {
          id: 'green',
          type: 'number',
          label: 'Green',
          default: 4095,
          min: 0,
          max: 4095,
        },
        {
          id: 'blue',
          type: 'number',
          label: 'Blue',
          default: 4095,
          min: 0,
          max: 4095,
        },
        {
          id: 'gray',
          type: 'number',
          label: 'Grayscale / Brightness',
          default: 255,
          min: 0,
          max: 255,
        },
        {
          id: 'gridWidth',
          type: 'number',
          label: 'Grid Width / Size',
          default: 255,
          min: 0,
          max: 255,
        },
        {
          id: 'moveSpeed',
          type: 'number',
          label: 'Movement Speed',
          default: 100,
          min: 0,
          max: 100,
        },
        {
          id: 'gradientStretch',
          type: 'number',
          label: 'Gradient Stretch',
          default: 1,
          min: 1,
          max: 20,
        },
      ],
      callback: async (event) => {
        // Construct params object from options
        const params = {
          red: event.options.red,
          green: event.options.green,
          blue: event.options.blue,
          gray: event.options.gray,
          gridWidth: event.options.gridWidth,
          moveSpeed: event.options.moveSpeed,
          gradientStretch: event.options.gradientStretch,
          state: 1, // Assuming state 1 means 'on'
        }

        self.log('info', `Change Test Pattern: Mode=${event.options.mode}, Params=${JSON.stringify(params)}`) // Use self.log

        try {
          // Use await and try/catch, remove callback function
          const response = await self.novastar.testpattern(event.options.mode, params)
          self.log('debug', 'Test pattern change response: ' + JSON.stringify(response)) // Log success if needed
        } catch (error) {
          self.log('error', `Error changing test pattern: ${error.message || error}`) // Use self.log for errors
        }
      },
    },
    // New action to set 3D LUT status
    set_3dlut_status: {
      name: '3D LUT Status (Set)',
      options: [
        {
          id: 'enable', // The value will be true or false
          type: 'dropdown',
          label: 'Status',
          default: false, // Default to disabled
          choices: [
            { id: true, label: 'Enable' },
            { id: false, label: 'Disable' },
          ],
        },
        {
          id: 'screenids',
          type: 'textinput',
          label: 'Screen IDs (optional, comma-separated, blank for all)',
          default: '',
        }
      ],
      callback: async (event) => {
        const enableValue = event.options.enable; // This will be true or false
        const screenIdsOption = event.options.screenids.trim() || null; // Use null if blank
        const statusLabel = enableValue ? 'Enable' : 'Disable';

        self.log('debug', `Set 3D LUT Status to ${statusLabel} for screens: ${screenIdsOption || 'all'}`);

        try {
          // Call the library function directly with the selected state using await
          const response = await self.novastar.enable3DLut(enableValue, screenIdsOption);
          self.log('info', `Successfully set 3D LUT Status to ${statusLabel} for screens: ${screenIdsOption || 'all'}`);
          self.log('debug', 'Set 3D LUT status response: ' + JSON.stringify(response));
        } catch (error) {
          self.log('error', `Failed to set 3D LUT status: ${error.message || error}`); // Use self.log for errors
        }
      },
    },
    toggle_blackout: {
      name: 'Toggle Blackout/Normal',
      options: [], // No options needed
      callback: async (event) => {
        self.log('info', 'Toggling Blackout/Normal state...')
        try {
          // 1. Get the current display state
          const currentStateData = await self.novastar.getDisplayState()
          // Assuming the first screen's state is representative
          const currentMode = currentStateData?.displayState?.[0]?.displayMode

          self.log('debug', `Current display mode number: ${currentMode}`)

          // 2. Decide which action to call
          let response
          if (currentMode === 1) { // Currently Blackout
            self.log('info', 'Currently Blackout, switching to Normal')
            response = await self.novastar.normal() // Call normal() alias
          } else if (currentMode === 0) { // Currently Normal
            self.log('info', 'Currently Normal, switching to Blackout')
            response = await self.novastar.blackout() // Call blackout() alias
          } else if (currentMode === 2) { // Currently Freeze
            self.log('warn', 'Display is currently Frozen. Toggling to Blackout.')
            response = await self.novastar.blackout() // Or choose to switch to Normal if preferred
          } else {
            self.log('warn', `Unknown current display mode (${currentMode}). Attempting to switch to Blackout.`)
            response = await self.novastar.blackout() // Fallback action
          }
          self.log('debug', 'Toggle action response: ' + JSON.stringify(response))

        } catch (error) {
          self.log('error', `Error toggling blackout state: ${error.message || error}`)
          console.error(`[${self.id}] Raw error object during toggle_blackout:`, error)
        }
      },
    },
    // New action to toggle freeze
    toggle_freeze: {
      name: 'Toggle Freeze/Normal',
      options: [], // No options needed
      callback: async (event) => {
        self.log('info', 'Toggling Freeze/Normal state...')
        try {
          // 1. Get the current display state
          const currentStateData = await self.novastar.getDisplayState()
          // Assuming the first screen's state is representative
          const currentMode = currentStateData?.displayState?.[0]?.displayMode

          self.log('debug', `Current display mode number: ${currentMode}`)

          // 2. Decide which action to call
          let response
          if (currentMode === 2) { // Currently Freeze
            self.log('info', 'Currently Freeze, switching to Normal')
            response = await self.novastar.normal() // Call normal() alias
          } else if (currentMode === 0) { // Currently Normal
            self.log('info', 'Currently Normal, switching to Freeze')
            response = await self.novastar.freeze() // Call freeze() alias
          } else if (currentMode === 1) { // Currently Blackout
            self.log('warn', 'Display is currently Blackout. Toggling to Freeze.')
            response = await self.novastar.freeze() // Or choose to switch to Normal if preferred
          } else {
            self.log('warn', `Unknown current display mode (${currentMode}). Attempting to switch to Freeze.`)
            response = await self.novastar.freeze() // Fallback action
          }
          self.log('debug', 'Toggle action response: ' + JSON.stringify(response))

        } catch (error) {
          self.log('error', `Error toggling freeze state: ${error.message || error}`)
          console.error(`[${self.id}] Raw error object during toggle_freeze:`, error)
        }
      },
    },
  })
}
