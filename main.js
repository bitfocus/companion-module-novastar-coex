const { InstanceBase, Regex, runEntrypoint, InstanceStatus } = require('@companion-module/base')
const UpgradeScripts = require('./upgrades')
const UpdateActions = require('./actions')
const UpdateFeedbacks = require('./feedbacks')
const UpdateVariableDefinitions = require('./variables')

// const Novastar = require('novastar-coex')
const Novastar = require('C:\\Users\\zhang\\Downloads\\projects\\novastar-coex\\index.js'); // if you'd like to use a local module
const _ = require('lodash')

const novastar = {}
const sources = []
const sourcelist = []

class ModuleInstance extends InstanceBase {
	constructor(internal) {
		super(internal)
	}

	async init(config) {
		this.config = config
		this.updateStatus(InstanceStatus.Connecting) // Set initial status to Connecting

		if (config && config.host) {
			this.novastar = new Novastar(config.host)
			// var instance = this // No longer needed with async/await and arrow functions

			try {
				const response = await this.novastar.sources() // Await the promise
				this.sources = response
				this.log('info', 'Connected')

				this.sourcelist = _.map(this.sources, function (source) {
					return { id: source.name, label: source.name }
				})

				this.updateStatus(InstanceStatus.Ok)
				this.updateActions() // export actions after successful connection and source retrieval
			} catch (error) {
				this.log('error', `Connection failed: ${error.message || error}`) // Log the error
				this.updateStatus(InstanceStatus.ConnectionFailure)
				this.sources = [] // Clear sources on failure
				this.sourcelist = [] // Clear sourcelist on failure
				this.updateActions() // Still update actions, maybe with empty source list
			}
		} else {
			this.updateStatus(InstanceStatus.BadConfig) // Set status if host is not configured
			this.sources = []
			this.sourcelist = []
			this.updateActions() // Update actions even with bad config
		}

		// These can be called regardless of connection status initially
		this.updateFeedbacks() // export feedbacks
		this.updateVariableDefinitions() // export variable definitions
	}
	// When module gets deleted
	async destroy() {
		this.log('debug', 'destroy')
	}

	async configUpdated(config) {
		this.log('info', 'Reloading config')
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
