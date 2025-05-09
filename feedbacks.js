const { combineRgb } = require('@companion-module/base')

// Helper function to convert Kelvin to RGB
// Based on algorithm by Tanner Helland
function kelvinToRgb(kelvin) {
	// Clamp Kelvin value to a reasonable range for the algorithm
	const temp = Math.max(1000, Math.min(40000, kelvin)) / 100;
	let r, g, b;

	// Red
	if (temp <= 66) {
		r = 255;
	} else {
		r = temp - 60;
		r = 329.698727446 * Math.pow(r, -0.1332047592);
		r = Math.max(0, Math.min(255, r));
	}

	// Green
	if (temp <= 66) {
		g = temp;
		g = 99.4708025861 * Math.log(g) - 161.1195681661;
		g = Math.max(0, Math.min(255, g));
	} else {
		g = temp - 60;
		g = 288.1221695283 * Math.pow(g, -0.0755148492);
		g = Math.max(0, Math.min(255, g));
	}

	// Blue
	if (temp >= 66) {
		b = 255;
	} else {
		if (temp <= 19) {
			b = 0;
		} else {
			b = temp - 10;
			b = 138.5177312231 * Math.log(b) - 305.0447927307;
			b = Math.max(0, Math.min(255, b));
		}
	}

	// Return Companion compatible color value
	return combineRgb(Math.round(r), Math.round(g), Math.round(b));
}


module.exports = async function (self) {
	self.setFeedbackDefinitions({
		// ... existing feedback definitions ... // (Keep if any)

		// Renamed and changed to advanced feedback
		screen_color_temperature_display: {
			name: 'Screen Color Temperature Display',
			type: 'advanced', // Changed from 'boolean'
			label: 'Display Screen Color Temperature as Background Color',
			// No defaultStyle needed, callback provides the style
			options: [
				{
					id: 'screenIndex',
					type: 'number',
					label: 'Screen Index (0-based)',
					default: 0,
					min: 0,
					max: 10, // Adjust max as needed or make dynamic later
				},
				// Removed comparison and value options
			],
			callback: (feedback, bank) => { // bank object might be useful for default colors
				const screenIndex = feedback.options.screenIndex;

				// Ensure displayParams exists and the index is valid
				if (!self.displayParams || screenIndex >= self.displayParams.length || screenIndex < 0) {
					return {}; // Return empty style if data is missing
				}

				const currentValue = self.displayParams[screenIndex]?.colorTemperature;

				if (currentValue === undefined || currentValue === null) {
					return {}; // Return empty style if current value is not available
				}

				try {
					const calculatedColor = kelvinToRgb(currentValue);
					return { bgcolor: calculatedColor }; // Return the calculated background color
				} catch (e) {
					self.log('error', `Failed to calculate color for Kelvin ${currentValue}: ${e}`);
					return {}; // Return empty style on error
				}
			},
		},
		// ... other feedback definitions ...
	})
}
