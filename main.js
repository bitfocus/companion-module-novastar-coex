const { InstanceBase, Regex, runEntrypoint, InstanceStatus } = require('@companion-module/base')
const UpgradeScripts = require('./upgrades')
const UpdateActions = require('./actions')
const UpdateFeedbacks = require('./feedbacks')
const UpdateVariableDefinitions = require('./variables')
const UpdatePresets = require('./presets')
const CoexApi = require('./coexapi')
const state = require('./state')

const Novastar = require('@novastar-dev/coex')
const _ = require('lodash')

// What gets polled how often. "every" is in poll ticks; "everyMs" is converted
// to ticks from the configured interval. "fast" endpoints decide the
// connection status.
const POLLS = [
	{ key: 'displayState', every: 1, fast: true, fn: (s) => s.api.displayState() },
	{ key: 'displayParams', every: 1, fast: true, fn: (s) => s.api.displayParams() },
	{ key: 'presets', every: 1, fast: true, fn: (s) => s.api.presetList() },
	{ key: 'inputs', every: 2, fn: (s) => s.api.sources() },
	{ key: 'screenInfo', every: 2, fn: (s) => s.api.screens() },
	{ key: 'monitorInfo', everyMs: 5000, monitor: true, fn: (s) => s.api.monitor() },
	{ key: 'screenOutput', everyMs: 5000, fn: (s) => s.api.screenOutput() },
	{ key: 'inputData', everyMs: 5000, fn: (s) => s.api.inputData() },
	{ key: 'screenBaseInfo', everyMs: 5000, fn: (s) => s.api.screenBaseInfo() },
	{ key: 'schedules', everyMs: 5000, fn: (s) => s.api.schedules() },
	{ key: 'backupInfo', everyMs: 5000, fn: (s) => s.api.backup() },
	{ key: 'audioInfo', everyMs: 5000, fn: (s) => s.api.audio() },
	{ key: 'snmpInfo', everyMs: 10000, fn: (s) => s.api.snmp() },
	{ key: 'mfCards', everyMs: 10000, fn: (s) => s.api.multifunctionCards() },
	{ key: 'deviceInfo', everyMs: 30000, fn: (s) => s.api.deviceInfo() },
	{ key: 'cabinetList', everyMs: 30000, fn: (s) => s.api.cabinets() },
]

class ModuleInstance extends InstanceBase {
	constructor(internal) {
		super(internal)
		this.pollTimer = null
		this.resetState()
	}

	resetState() {
		for (const p of POLLS) this[p.key] = null
		this.displayParams = []
		this.presets = []
		this.inputs = []
		this.sourcelist = []
		this.presetlist = []
		this.currentPresetName = 'Not Activated'
		this.pollCount = 0
		this.pollBusy = false
		this.failCount = {}
		this.unsupported = new Set()
		this.connected = false
		this.listSignature = ''
		this.variableIdSignature = ''
	}

	get pollIntervalMs() {
		return Math.max(200, parseInt(this.config?.pollInterval) || 500)
	}

	async init(config) {
		this.config = config
		this.stopPolling()
		this.resetState()

		this.updateActions()
		this.updateFeedbacks()
		this.updatePresets()
		this.updateVariableDefinitions()
		this.checkVariables()

		if (!config || !config.host) {
			this.updateStatus(InstanceStatus.BadConfig)
			return
		}

		this.updateStatus(InstanceStatus.Connecting)
		this.novastar = new Novastar(config.host, config.port)
		this.api = new CoexApi(config.host, config.port)

		// Polling also does the (re)connecting: if the controller is off or
		// rebooting, the status shows a failure and recovers on its own.
		this.pollAll(true).catch(() => {})
		this.pollTimer = setInterval(() => this.pollAll(false).catch(() => {}), this.pollIntervalMs)
	}

	stopPolling() {
		if (this.pollTimer) {
			clearInterval(this.pollTimer)
			this.pollTimer = null
		}
	}

	async pollAll(force) {
		if (!this.novastar || (this.pollBusy && !force)) return
		this.pollBusy = true
		try {
			const n = this.pollCount++
			// While disconnected only try the fast endpoints, every ~2 s
			if (!this.connected && !force && n % Math.max(1, Math.round(2000 / this.pollIntervalMs)) !== 0) return

			const due = POLLS.filter((p) => {
				if (p.monitor && this.config.pollMonitor === false) return false
				if (this.unsupported.has(p.key)) return false
				if (!this.connected && !p.fast) return false
				const every = p.every || Math.max(1, Math.round(p.everyMs / this.pollIntervalMs))
				return force || n % every === 0
			})

			let changed = false
			let fastOk = 0
			let fastTried = 0
			await Promise.all(
				due.map(async (p) => {
					if (p.fast) fastTried++
					try {
						const data = await p.fn(this)
						this.failCount[p.key] = 0
						if (p.fast) fastOk++
						if (!_.isEqual(data, this[p.key])) {
							this[p.key] = data
							changed = true
						}
					} catch (err) {
						const count = (this.failCount[p.key] || 0) + 1
						this.failCount[p.key] = count
						// An optional endpoint that keeps failing while the controller is
						// reachable is most likely not supported by this firmware.
						if (!p.fast && this.connected && count >= 3) {
							this.unsupported.add(p.key)
							this.log('info', `${p.key}: not available on this controller/firmware, polling stopped (${errText(err)})`)
						} else if (count === 1 && this.connected) {
							this.log('warn', `Polling ${p.key} failed: ${errText(err)}`)
						}
					}
				}),
			)

			if (fastTried > 0) {
				if (fastOk === 0 && (this.connected || force)) {
					if (this.connected) this.log('error', 'Connection to controller lost')
					this.connected = false
					this.updateStatus(InstanceStatus.ConnectionFailure)
					this.checkVariables()
					this.checkFeedbacks()
				} else if (fastOk > 0 && !this.connected) {
					this.connected = true
					this.unsupported.clear()
					this.log('info', 'Connected to controller')
					this.updateStatus(InstanceStatus.Ok)
					// fetch the rest right away instead of waiting for the slow tiers
					this.pollBusy = false
					return this.pollAll(true)
				}
			}

			if (changed) this.onDataChanged()
		} finally {
			this.pollBusy = false
		}
	}

	// Called after any polled data changed
	onDataChanged() {
		this.presets = Array.isArray(this.presets) ? this.presets : []
		this.displayParams = Array.isArray(this.displayParams) ? this.displayParams : []
		this.inputs = Array.isArray(this.inputs) ? this.inputs : []

		const active = this.presets.find((p) => p.state === true)
		this.currentPresetName = active ? active.name : 'Not Activated'
		this.sourcelist = this.inputs.map((s) => ({ id: s.name, label: s.name }))
		this.presetlist = this.presets.map((p) => ({ id: p.name, label: p.name }))

		// Dropdown contents changed -> rebuild actions/feedbacks/presets
		const sig = JSON.stringify([
			this.sourcelist,
			this.presetlist,
			this.screenChoices(),
			this.layerChoices(),
			state.gamutNames(this),
			state.multiModes(this),
		])
		if (sig !== this.listSignature) {
			this.listSignature = sig
			this.updateActions()
			this.updateFeedbacks()
			this.updatePresets()
		}

		this.checkVariables()
		this.checkFeedbacks()
	}

	checkVariables() {
		const vars = state.buildVariables(this)
		const sig = vars.map((v) => v.id).join('|')
		if (sig !== this.variableIdSignature) {
			this.variableIdSignature = sig
			this.setVariableDefinitions(vars.map((v) => ({ variableId: v.id, name: v.name })))
		}
		const values = {}
		vars.forEach((v) => (values[v.id] = v.value))
		this.setVariableValues(values)
	}

	// ---- Choice helpers used by actions / feedbacks ----

	screenChoices(withAll = false) {
		const screens = state.screenList(this)
		const list = screens.length
			? screens.map((s, i) => ({ id: s.screenID, label: s.screenName || `Screen ${i + 1}` }))
			: state.allScreenIds(this).map((id, i) => ({ id, label: `Screen ${i + 1}` }))
		return withAll ? [{ id: 'all', label: 'All screens' }, ...list] : list
	}

	layerChoices() {
		const out = []
		state.screenList(this).forEach((s, si) => {
			state.screenLayers(s).forEach((l, li) => {
				out.push({ id: `${s.screenID}|${l.id}`, label: `${s.screenName || `Screen ${si + 1}`} – Layer ${li + 1}` })
			})
		})
		return out
	}

	inputIdChoices(withAll = false) {
		const list = this.inputs.map((s) => ({ id: String(s.id), label: s.name || `Input ${s.id}` }))
		return withAll ? [{ id: 'all', label: 'All inputs' }, ...list] : list
	}

	inputGroupChoices() {
		return this.inputs.map((s) => ({ id: String(s.groupId), label: s.name || `Group ${s.groupId}` }))
	}

	// Resolve an action's screen option to a screen ID list
	resolveScreens(value) {
		if (!value || value === 'all') return state.allScreenIds(this)
		return [value]
	}

	// Resolve an input option ('all' or an id) to an input ID list
	resolveInputs(value) {
		if (!value || value === 'all') return this.inputs.map((i) => i.id)
		return [Number(value)]
	}

	// Cabinet IDs: blank = all configured cabinets, otherwise comma separated IDs
	resolveCabinets(text) {
		const t = String(text ?? '').trim()
		if (!t || t.toLowerCase() === 'all')
			return (Array.isArray(this.cabinetList) ? this.cabinetList : []).map((c) => c.id)
		return t
			.split(/[\s,;]+/)
			.filter(Boolean)
			.map(Number)
			.filter((n) => Number.isFinite(n))
	}

	// Run an API call from an action, log errors, and refresh state soon after
	async run(label, fn) {
		if (!this.api) {
			this.log('warn', `${label}: not connected`)
			return
		}
		try {
			await fn(this.api)
			this.log('debug', `${label}: OK`)
		} catch (err) {
			this.log('error', `${label} failed: ${errText(err)}`)
		}
		setTimeout(() => this.pollAll(true).catch(() => {}), 300)
	}

	async destroy() {
		this.stopPolling()
		this.log('debug', 'destroy')
	}

	async configUpdated(config) {
		this.log('info', 'Reloading config')
		await this.init(config)
	}

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
			{
				type: 'number',
				id: 'pollInterval',
				label: 'Poll interval (ms)',
				width: 4,
				default: 500,
				min: 200,
				max: 10000,
			},
			{
				type: 'checkbox',
				id: 'pollMonitor',
				label: 'Poll hardware / cabinet monitoring (every ~5 s)',
				width: 8,
				default: true,
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

	updatePresets() {
		UpdatePresets(this)
	}
}

function errText(err) {
	if (!err) return 'unknown error'
	if (typeof err === 'string') return err
	return err.message || err.error || JSON.stringify(err)
}

runEntrypoint(ModuleInstance, UpgradeScripts)
