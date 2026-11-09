const { buildVariables } = require('./state')

// Variable definitions come from the same builder as the values (state.js),
// so a variable only exists when the device actually reports it.
module.exports = async function (self) {
	const vars = buildVariables(self)
	self.variableIdSignature = vars.map((v) => v.id).join('|')
	self.setVariableDefinitions(vars.map((v) => ({ variableId: v.id, name: v.name })))
}
