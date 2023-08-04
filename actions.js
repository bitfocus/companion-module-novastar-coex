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
					default: 'Normal',
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
		colortemp: {
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
	})
}
