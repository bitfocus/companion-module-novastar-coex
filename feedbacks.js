const { combineRgb } = require('@companion-module/base')
const state = require('./state')

const RED = combineRgb(200, 0, 0)
const GREEN = combineRgb(0, 140, 0)
const BLUE = combineRgb(0, 90, 200)
const ORANGE = combineRgb(230, 120, 0)
const WHITE = combineRgb(255, 255, 255)
const BLACK = combineRgb(0, 0, 0)

// Kelvin -> RGB (Tanner Helland's approximation)
function kelvinToRgb(kelvin) {
	const temp = Math.max(1000, Math.min(40000, kelvin)) / 100
	let r, g, b
	if (temp <= 66) {
		r = 255
		g = Math.max(0, Math.min(255, 99.4708025861 * Math.log(temp) - 161.1195681661))
	} else {
		r = Math.max(0, Math.min(255, 329.698727446 * Math.pow(temp - 60, -0.1332047592)))
		g = Math.max(0, Math.min(255, 288.1221695283 * Math.pow(temp - 60, -0.0755148492)))
	}
	if (temp >= 66) b = 255
	else if (temp <= 19) b = 0
	else b = Math.max(0, Math.min(255, 138.5177312231 * Math.log(temp - 10) - 305.0447927307))
	return combineRgb(Math.round(r), Math.round(g), Math.round(b))
}

module.exports = async function (self) {
	const screenOpt = (withAny = true) => ({
		id: 'screen',
		type: 'dropdown',
		label: 'Screen',
		default: withAny ? 'all' : (self.screenChoices()[0]?.id ?? ''),
		choices: withAny ? [{ id: 'all', label: 'Any screen' }, ...self.screenChoices()] : self.screenChoices(),
		allowCustom: true,
	})
	const screenIdsFor = (value) => (!value || value === 'all' ? state.allScreenIds(self) : [value])

	self.setFeedbackDefinitions({
		// ---------- Display ----------
		display_mode: {
			name: 'Display Mode is…',
			description: 'True when the display (any or a specific canvas) is in the chosen mode, e.g. Blackout',
			type: 'boolean',
			defaultStyle: { bgcolor: RED, color: WHITE },
			options: [
				{
					id: 'mode',
					type: 'dropdown',
					label: 'Mode',
					default: 'Blackout',
					choices: [
						{ id: 'Normal', label: 'Normal' },
						{ id: 'Blackout', label: 'Blackout' },
						{ id: 'Freeze', label: 'Freeze' },
					],
				},
				{
					id: 'canvas',
					type: 'number',
					label: 'Canvas index (0-based, -1 = any canvas)',
					default: -1,
					min: -1,
					max: 32,
				},
			],
			callback: (feedback) => {
				const canvases = state.canvasStates(self)
				const idx = Number(feedback.options.canvas)
				if (idx >= 0) return canvases[idx]?.mode === feedback.options.mode
				return canvases.some((c) => c.mode === feedback.options.mode)
			},
		},

		preset_active: {
			name: 'Preset is active',
			type: 'boolean',
			defaultStyle: { bgcolor: BLUE, color: WHITE },
			options: [
				{
					id: 'preset',
					type: 'dropdown',
					label: 'Preset',
					default: self.presetlist?.[0]?.id ?? '',
					choices: self.presetlist || [],
					allowCustom: true,
				},
			],
			callback: (feedback) => self.currentPresetName === feedback.options.preset,
		},

		brightness_compare: {
			name: 'Screen brightness compare',
			description: 'Compare the brightness (0-100 %) of a screen with a value',
			type: 'boolean',
			defaultStyle: { bgcolor: ORANGE, color: BLACK },
			options: [
				screenOpt(),
				{
					id: 'op',
					type: 'dropdown',
					label: 'Condition',
					default: 'eq',
					choices: [
						{ id: 'eq', label: '=' },
						{ id: 'gte', label: '>=' },
						{ id: 'lte', label: '<=' },
					],
				},
				{ id: 'value', type: 'number', label: 'Brightness %', default: 100, min: 0, max: 100 },
			],
			callback: (feedback) => {
				const ids = screenIdsFor(feedback.options.screen)
				const params = (self.displayParams || []).filter((p) => ids.includes(p.screenId) || ids.length === 0)
				const v = Number(feedback.options.value)
				return params.some((p) => {
					const pct = Math.round((p.brightness || 0) * 100)
					if (feedback.options.op === 'gte') return pct >= v
					if (feedback.options.op === 'lte') return pct <= v
					return pct === v
				})
			},
		},

		screen_color_temperature_display: {
			name: 'Screen Color Temperature Display',
			type: 'advanced',
			description: 'Colors the button background like the current screen color temperature',
			options: [{ id: 'screenIndex', type: 'number', label: 'Screen Index (0-based)', default: 0, min: 0, max: 10 }],
			callback: (feedback) => {
				const p = self.displayParams?.[feedback.options.screenIndex]
				if (!p || p.colorTemperature === undefined || p.colorTemperature === null) return {}
				try {
					return { bgcolor: kelvinToRgb(p.colorTemperature) }
				} catch (e) {
					return {}
				}
			},
		},

		// ---------- Inputs / layers ----------
		input_signal: {
			name: 'Input has signal',
			description: 'True when the chosen input reports a signal (use "invert" for a no-signal warning)',
			type: 'boolean',
			defaultStyle: { bgcolor: GREEN, color: WHITE },
			options: [
				{
					id: 'input',
					type: 'dropdown',
					label: 'Input',
					default: self.sourcelist?.[0]?.id ?? '',
					choices: self.sourcelist || [],
					allowCustom: true,
				},
			],
			callback: (feedback) => state.inputHasSignal(state.findInput(self, feedback.options.input)),
		},

		any_input_signal: {
			name: 'Any input has signal',
			type: 'boolean',
			defaultStyle: { bgcolor: GREEN, color: WHITE },
			options: [],
			callback: () => (self.inputs || []).some(state.inputHasSignal),
		},

		layer_input: {
			name: 'Input is on screen/layer',
			description: 'True when the chosen input is the source of a layer (any or a specific screen/layer)',
			type: 'boolean',
			defaultStyle: { bgcolor: GREEN, color: WHITE },
			options: [
				{
					id: 'input',
					type: 'dropdown',
					label: 'Input',
					default: self.sourcelist?.[0]?.id ?? '',
					choices: self.sourcelist || [],
					allowCustom: true,
				},
				{
					id: 'layer',
					type: 'dropdown',
					label: 'Layer',
					default: 'any',
					choices: [{ id: 'any', label: 'Any layer on any screen' }, ...self.layerChoices()],
					allowCustom: true,
				},
			],
			callback: (feedback) => {
				const input = state.findInput(self, feedback.options.input)
				if (!input) return false
				const want = String(feedback.options.layer || 'any')
				return state.screenList(self).some((s) =>
					state.screenLayers(s).some((l) => {
						if (want !== 'any' && want !== `${s.screenID}|${l.id}`) return false
						return String(l.source) === String(input.groupId)
					}),
				)
			},
		},

		input_hdr_mode: {
			name: 'Input HDR mode is…',
			type: 'boolean',
			defaultStyle: { bgcolor: BLUE, color: WHITE },
			options: [
				{
					id: 'input',
					type: 'dropdown',
					label: 'Input',
					default: self.sourcelist?.[0]?.id ?? '',
					choices: self.sourcelist || [],
					allowCustom: true,
				},
				{
					id: 'mode',
					type: 'dropdown',
					label: 'HDR mode',
					default: 255,
					choices: Object.entries(state.HDR_MODES).map(([id, label]) => ({ id: Number(id), label })),
				},
			],
			callback: (feedback) => {
				const input = state.findInput(self, feedback.options.input)
				if (!input) return false
				const cfg = state.inputPortConfig(self, input, (self.inputs || []).indexOf(input))
				return Number(cfg?.hdrParameter?.overrideHdrType) === Number(feedback.options.mode)
			},
		},

		// ---------- Output / screen settings ----------
		bitdepth_is: {
			name: 'Output bit depth is…',
			type: 'boolean',
			defaultStyle: { bgcolor: BLUE, color: WHITE },
			options: [
				screenOpt(),
				{
					id: 'bitdepth',
					type: 'dropdown',
					label: 'Bit depth (setting)',
					default: 1,
					choices: Object.entries(state.BIT_DEPTHS).map(([id, label]) => ({ id: Number(id), label })),
				},
			],
			callback: (feedback) =>
				screenIdsFor(feedback.options.screen).some(
					(id, i) =>
						Number(state.outputForScreen(self, id, i)?.outputBitDepth?.bitDepth) === Number(feedback.options.bitdepth),
				),
		},

		threed_enabled: {
			name: '3D is on',
			type: 'boolean',
			defaultStyle: { bgcolor: BLUE, color: WHITE },
			options: [screenOpt()],
			callback: (feedback) =>
				screenIdsFor(feedback.options.screen).some(
					(id, i) => state.outputForScreen(self, id, i)?.threeD?.enable === true,
				),
		},

		gamut_is: {
			name: 'Color gamut is…',
			type: 'boolean',
			defaultStyle: { bgcolor: BLUE, color: WHITE },
			options: [
				screenOpt(),
				{
					id: 'name',
					type: 'dropdown',
					label: 'Gamut',
					default: state.gamutNames(self)[0] ?? '',
					choices: state.gamutNames(self).map((n) => ({ id: n, label: n })),
					allowCustom: true,
				},
			],
			callback: (feedback) =>
				screenIdsFor(feedback.options.screen).some(
					(id, i) => state.outputForScreen(self, id, i)?.gamutList?.currentGamutName === feedback.options.name,
				),
		},

		multimode_is: {
			name: 'Multi-mode is…',
			type: 'boolean',
			defaultStyle: { bgcolor: BLUE, color: WHITE },
			options: [
				screenOpt(),
				{
					id: 'mode',
					type: 'dropdown',
					label: 'Mode',
					default: state.multiModes(self)[0]?.id ?? 0,
					choices: state.multiModes(self),
					allowCustom: true,
				},
			],
			callback: (feedback) => {
				const list = self.screenBaseInfo?.multiModeInfo || []
				const ids = screenIdsFor(feedback.options.screen)
				return list.some(
					(m) =>
						(ids.includes(m.screenID) || ids.length === 0) &&
						String(m.multiModeParam?.currentModeId) === String(feedback.options.mode),
				)
			},
		},

		schedule_enabled: {
			name: 'Brightness schedule is on',
			type: 'boolean',
			defaultStyle: { bgcolor: BLUE, color: WHITE },
			options: [screenOpt()],
			callback: (feedback) =>
				screenIdsFor(feedback.options.screen).some((id, i) => state.scheduleForScreen(self, id, i)?.enable === true),
		},

		// ---------- Device ----------
		device_health: {
			name: 'Device health warning',
			description: 'Alarm/fault anywhere: temperatures, fans, voltages, ports, cards, outputs or cabinets',
			type: 'boolean',
			defaultStyle: { bgcolor: ORANGE, color: BLACK },
			options: [
				{
					id: 'level',
					type: 'dropdown',
					label: 'Trigger at',
					default: 1,
					choices: [
						{ id: 1, label: 'Alarm or Fault' },
						{ id: 2, label: 'Fault only' },
					],
				},
			],
			callback: (feedback) => state.deviceHealth(self).level >= Number(feedback.options.level),
		},

		cabinet_error: {
			name: 'Cabinet / receiving card problem',
			description: 'Any cabinet reports alarm/fault (temperature, voltage, humidity, error bits, link, power, modules)',
			type: 'boolean',
			defaultStyle: { bgcolor: RED, color: WHITE },
			options: [
				{
					id: 'what',
					type: 'dropdown',
					label: 'Trigger on',
					default: 'any',
					choices: [
						{ id: 'any', label: 'Any cabinet problem' },
						{ id: 'link', label: 'Link (cable) errors only' },
						{ id: 'fault', label: 'Faults only (no alarms)' },
					],
				},
			],
			callback: (feedback) => {
				const c = state.cabinetHealth(self)
				if (feedback.options.what === 'link') return c.linkErrors > 0
				if (feedback.options.what === 'fault') return c.level >= 2
				return c.errorCount > 0
			},
		},

		cabinet_count_below: {
			name: 'Fewer cabinets than expected',
			description: 'True when the monitor reports fewer cabinets than you enter (e.g. a cabinet dropped off the chain)',
			type: 'boolean',
			defaultStyle: { bgcolor: RED, color: WHITE },
			options: [{ id: 'count', type: 'number', label: 'Expected cabinets', default: 1, min: 1, max: 10000 }],
			callback: (feedback) => {
				if (!self.monitorInfo) return false
				return state.cabinetHealth(self).count < Number(feedback.options.count)
			},
		},

		temp_above: {
			name: 'Temperature above…',
			type: 'boolean',
			defaultStyle: { bgcolor: ORANGE, color: BLACK },
			options: [
				{
					id: 'source',
					type: 'dropdown',
					label: 'Sensor',
					default: 'mainboard',
					choices: [
						{ id: 'mainboard', label: 'Controller mainboard' },
						{ id: 'chips', label: 'Controller chips (ARM/FPGA, highest)' },
						{ id: 'cabinet', label: 'Cabinets (highest)' },
					],
				},
				{ id: 'temp', type: 'number', label: '°C', default: 60, min: 0, max: 150 },
			],
			callback: (feedback) => {
				const info = self.monitorInfo
				if (!info) return false
				let t = null
				if (feedback.options.source === 'mainboard') t = Number(info.mainBoardTemperature?.value)
				else if (feedback.options.source === 'chips')
					t = Math.max(...(info.temperatureInfos || []).map((x) => Number(x.temperature)).filter(Number.isFinite))
				else t = state.cabinetHealth(self).maxTemp
				return Number.isFinite(t) && t > Number(feedback.options.temp)
			},
		},

		port_status: {
			name: 'Controller port / output not OK',
			type: 'boolean',
			defaultStyle: { bgcolor: RED, color: WHITE },
			options: [
				{
					id: 'kind',
					type: 'dropdown',
					label: 'Which',
					default: 'port',
					choices: [
						{ id: 'port', label: 'Controller ports' },
						{ id: 'output', label: 'Outputs' },
						{ id: 'card', label: 'Cards' },
					],
				},
				{ id: 'index', type: 'number', label: 'Index (0-based, -1 = any)', default: -1, min: -1, max: 64 },
			],
			callback: (feedback) => {
				const info = self.monitorInfo || {}
				const list =
					feedback.options.kind === 'output'
						? info.outputStatus
						: feedback.options.kind === 'card'
							? info.cardMonitorInfo
							: info.controllerPortMonitorInfos
				const arr = Array.isArray(list) ? list : []
				const idx = Number(feedback.options.index)
				if (idx >= 0) return Number(arr[idx]?.status) > 0
				return arr.some((x) => Number(x.status) > 0)
			},
		},

		backup_configured: {
			name: 'Backup controller configured',
			type: 'boolean',
			defaultStyle: { bgcolor: GREEN, color: WHITE },
			options: [],
			callback: () => !!(self.backupInfo && (self.backupInfo.backup || self.backupInfo.backupName)),
		},

		audio_enabled: {
			name: 'Audio (SPDIF) output is on',
			type: 'boolean',
			defaultStyle: { bgcolor: GREEN, color: WHITE },
			options: [],
			callback: () => self.audioInfo?.enable === true,
		},

		snmp_enabled: {
			name: 'SNMP is on',
			type: 'boolean',
			defaultStyle: { bgcolor: GREEN, color: WHITE },
			options: [],
			callback: () => self.snmpInfo?.state === true,
		},

		test_pattern_active: {
			name: 'Sending-card test pattern is on',
			type: 'boolean',
			defaultStyle: { bgcolor: ORANGE, color: BLACK },
			options: [],
			callback: () => self.inputData?.testPattern?.parameters?.state === 1,
		},

		mfcard_linked: {
			name: 'Multifunction card connected',
			type: 'boolean',
			defaultStyle: { bgcolor: GREEN, color: WHITE },
			options: [
				{ id: 'index', type: 'number', label: 'Card index (0-based, -1 = all)', default: -1, min: -1, max: 32 },
			],
			callback: (feedback) => {
				const cards = Array.isArray(self.mfCards) ? self.mfCards : []
				const idx = Number(feedback.options.index)
				if (idx >= 0) return String(cards[idx]?.linkStatus) === '1'
				return cards.length > 0 && cards.every((c) => String(c.linkStatus) === '1')
			},
		},

		connected: {
			name: 'Controller connected',
			type: 'boolean',
			defaultStyle: { bgcolor: GREEN, color: WHITE },
			options: [],
			callback: () => !!self.connected,
		},
	})
}
