const _ = require('lodash');

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
				console.log('Change Input Source', event.options.num)
				self.novastar.input(event.options.num, function (response, error) {
					if (error) console.log('Error', error)
				})
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
				console.log('Change Brightness', event.options.num)
				self.novastar.brightness(event.options.num, null, function (response, error) {
					if (error) console.log('Error', error)
				})
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
				console.log('Display Mode', event.options.num)

				self.novastar.displaymode(event.options.num, function (response, error) {
					if (error) console.log('Error', error)
				})
			},
		},
		blackout: {
			name: 'Blackout',
			options: [],
			callback: async (event) => {
				console.log('Display Mode Blackout', event.options.num)

				self.novastar.blackout(function (response, error) {
					if (error) console.log('Error', error)
				})
			},
		},
		normal: {
			name: 'Normal',
			options: [],
			callback: async (event) => {
				console.log('Display Mode Normal', event.options.num)

				self.novastar.normal(function (response, error) {
					if (error) console.log('Error', error)
				})
			},
		},
		freeze: {
			name: 'Freeze',
			options: [],
			callback: async (event) => {
				console.log('Display Mode Freeze', event.options.num)

				self.novastar.freeze(function (response, error) {
					if (error) console.log('Error', error)
				})
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
				},
				{
					id: 'type',
					type: 'dropdown',
					label: 'Type',
					default: 3,
					choices: [
						{ id: 3, label: 'All' },
						{ id: 0, label: 'Red' },
						{ id: 1, label: 'Blue' },
						{ id: 2, label: 'Green' },
					],
				},
			],
			callback: async (event) => {
				console.log('Change Gamma', event.options.num, event.options.type)
				self.novastar.gamma(event.options.num, event.options.type, null, function (response, error) {
					if (error) console.log('Error', error)
				})
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
				console.log('Change Color Temp', event.options.num)
				self.novastar.colortemperature(event.options.num, null, function (response, error) {
					if (error) console.log('Error', error)
				})
			},
		},
		preset: {
			name: 'Preset',
			options: [
				{
					id: 'preset',
					type: 'textinput',
					label: 'Preset Name or Number',
				},
			],
			callback: async (event) => {
				console.log('Change Preset', event.options.preset)
				self.novastar.preset(event.options.preset, function (response, error) {
					if (error) console.log('Error', error)
				})
			},
		},
		workingmode: {
			name: 'Working Mode',
			options: [
				{
					id: 'mode',
					type: 'dropdown',
					label: 'Working Mode',
					default: 3,
					choices: [
						{ id: 3, label: 'All-In-One / Advanced' },
						{ id: 2, label: 'Send Only' },
					],
				},
			],
			callback: async (event) => {
				console.log('Change Workingmode', event.options.mode)
				self.novastar.workingmode(event.options.mode, function (response, error) {
					if (error) console.log('Error', error)
				})
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
				var defaultparams = {
					red: 4095,
					green: 4095,
					blue: 4095,
					gray: 255,
					gridWidth: 255,
					moveSpeed: 100,
					gradientStretch: 1,
					state: 1,
				}

				params = {
					red: event.options.red,
					green: event.options.green,
					blue: event.options.blue,
					gray: event.options.gray,
					gridWidth: event.options.gridWidth,
					moveSpeed: event.options.moveSpeed,
					gradientStretch: event.options.gradientStretch,
					state: 1,
				}

				console.log('Change Test Pattern', event.options.mode, params)
				self.novastar.testpattern(event.options.mode, params, function (response, error) {
					if (error) console.log('Error', error)
				})
			},
		},
	})
}
