

module.exports = function (self) {
	self.setActionDefinitions({
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
				self.novastar.brightness(event.options.num, null, function(response, error) {
					if (error) console.log('Error', error);
				});
				
			},
		},
		display_mode: {
			name: 'Display Mode',
			options: [
				{
					id: 'num',
					type: 'dropdown',
					label: 'Mode',
					default: 'normal',
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
	})
}
