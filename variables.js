module.exports = async function (self) {
	const variableDefinitions = []

	// Check if displayParams exists and is an array
	if (Array.isArray(self.displayParams)) {
		self.displayParams.forEach((param, index) => {
			const screenLabel = `Screen ${index + 1}` // Use index for label as ID might be long/complex

			// Add variable for Screen ID (optional, but potentially useful)
			variableDefinitions.push({
				variableId: `screen_${index}_id`,
				name: `${screenLabel} ID`,
			})

			// Add variable for Brightness
			variableDefinitions.push({
				variableId: `screen_${index}_brightness`,
				name: `${screenLabel} Brightness`,
			})

			// Add variable for Color Temperature
			variableDefinitions.push({
				variableId: `screen_${index}_colortemp`,
				name: `${screenLabel} Color Temperature`,
			})

			// Add variable for Gamma
			variableDefinitions.push({
				variableId: `screen_${index}_gamma`,
				name: `${screenLabel} Gamma`,
			})
		})
	} else {
		// Optionally add placeholder variables or a status variable if no params are available
		variableDefinitions.push({
			variableId: 'connection_status',
			name: 'Device Status',
		})
	}

	self.setVariableDefinitions(variableDefinitions)
}
