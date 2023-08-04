const { InstanceBase, Regex, runEntrypoint, InstanceStatus } = require('@companion-module/base')
const UpgradeScripts = require('./upgrades')
const UpdateActions = require('./actions')
const UpdateFeedbacks = require('./feedbacks')
const UpdateVariableDefinitions = require('./variables')

//const Novastar = require('novastar-coex');
const Novastar = require('../../novastar-coex/index.js');
const _ = require('lodash');

const novastar = {};
const sources = [];
const sourcelist = [];

class ModuleInstance extends InstanceBase {
	constructor(internal) {
		super(internal)
	}

	async init(config) {
		this.config = config

		this.novastar = new Novastar(config.host)

		//console.log(config);
		var instance = this;
		this.novastar.sources(function(response, error) {
			//console.log(response);
			instance.sources = response

			instance.sourcelist = _.map(instance.sources, function (source) {
				return { id: source.name, label: source.name }
			})

			if (error) {
				instance.updateStatus(InstanceStatus.ConnectionFailure)
			} else {
				instance.updateStatus(InstanceStatus.Ok)
			}
			
			instance.updateActions() // export actions
		});
		
		this.updateFeedbacks() // export feedbacks
		this.updateVariableDefinitions() // export variable definitions
	}
	// When module gets deleted
	async destroy() {
		this.log('debug', 'destroy')
	}

	async configUpdated(config) {
		this.config = config
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
				default: 8001
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
