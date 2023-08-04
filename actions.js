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
					default: _.get(self,'sourcelist[0].id'),
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
	})
}
