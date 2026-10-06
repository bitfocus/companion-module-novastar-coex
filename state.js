// Turns raw device data into Companion variables (definitions + values from
// one place, so they never drift apart) and provides helpers for feedbacks.

const INPUT_TYPES = {
	0: 'DVI',
	1: 'Dual-DVI',
	2: 'HDMI 1.4',
	3: 'HDMI 2.0',
	4: 'DP 1.1',
	5: 'DP 1.2',
	6: 'DP 1.4',
	7: '3G-SDI',
	8: '6G-SDI',
	9: '12G-SDI',
	10: 'PiP Video',
	11: 'HDMI 1.2',
	12: 'HDMI 2.1',
	13: 'Internal',
}

const HEALTH_LABELS = ['OK', 'Alarm', 'Fault']
const FAN_LABELS = ['Chassis', 'Front L', 'Front R', 'FPGA A', 'FPGA B']
const CHIP_LABELS = ['ARM', 'FPGA A', 'FPGA B']
const HDR_MODES = { 0: 'HDR10', 1: 'HLG', 2: 'SDR', 255: 'Auto' }
const BIT_DEPTHS = { 0: '8 bit', 1: '10 bit', 2: '12 bit', 255: 'Follow input' }
const WORKING_MODES = { 0: 'Send-Only', 1: 'All-In-One' }
const DEVICE_MODES = { 1: 'Fiber converter', 2: 'Sending card', 3: 'All-in-one' }
const UPDATE_STATES = { 0: 'Latest', 1: 'Update available', 2: 'Update (not direct)' }

// Display mode codes, same as the library sends and the displaymode API documents:
// 0 = Normal, 1 = Blackout, 2 = Freeze
const DISPLAY_MODES = { 0: 'Normal', 1: 'Blackout', 2: 'Freeze' }

const arr = (x) => (Array.isArray(x) ? x : [])
const onOff = (b) => (b === undefined || b === null ? '' : b ? 'On' : 'Off')

function round1(v) {
	const n = Number(v)
	return Number.isFinite(n) ? Math.round(n * 10) / 10 : ''
}

function formatRuntime(seconds) {
	const s = Number(seconds)
	if (!Number.isFinite(s) || s < 0) return ''
	const h = Math.floor(s / 3600)
	const m = Math.floor((s % 3600) / 60)
	return `${h}:${String(m).padStart(2, '0')}`
}

function displayModeName(code) {
	return DISPLAY_MODES[code] || 'Unknown'
}

function canvasStates(self) {
	return arr(self.displayState?.displayState).map((c) => ({
		canvasID: c.canvasID,
		mode: displayModeName(c.displayMode),
		code: c.displayMode,
	}))
}

// ---------- Inputs ----------

function inputHasSignal(input) {
	return !!input && Number(input.sourceStatus) === 1
}

function inputResolution(input) {
	const r = input && input.actualResolution
	if (!inputHasSignal(input) || !r || !r.width || !r.height) return ''
	const hz = input.actualRefreshRate ? `@${Math.round(Number(input.actualRefreshRate) * 100) / 100}` : ''
	return `${r.width}x${r.height}${hz}`
}

function findInput(self, key) {
	return arr(self.inputs).find((i) => i.name === key || String(i.id) === String(key))
}

function inputByGroupId(self, groupId) {
	return arr(self.inputs).find((i) => String(i.groupId) === String(groupId))
}

// Per-input settings from /device/input (EDID, HDR, colour). The port list is
// matched to the source list by logicId == id, falling back to list order.
function inputPortConfigs(self) {
	const d = self.inputData || {}
	return arr(d.InputPortConfig || d.inputPortConfig || d.inputPortConfigs || d.InputPortConfigs)
}

function inputPortConfig(self, input, index) {
	const list = inputPortConfigs(self)
	return list.find((p) => p.logicId !== undefined && String(p.logicId) === String(input.id)) || list[index]
}

// ---------- Screens / layers ----------

function screenList(self) {
	return arr(self.screenInfo?.screens)
}

// All screen IDs known from any source (screen list or display params)
function allScreenIds(self) {
	const ids = screenList(self).map((s) => s.screenID)
	if (ids.length) return ids
	return arr(self.displayParams)
		.map((p) => p.screenId)
		.filter(Boolean)
}

function screenLayers(screen) {
	if (!screen) return []
	const sets = arr(screen.layersInWorkingMode)
	const current = sets.find((s) => s.workingMode === screen.workingMode) || sets[0]
	return arr(current?.layers)
}

function layerInputName(self, layer) {
	if (!layer) return ''
	const input = inputByGroupId(self, layer.source)
	return input ? input.name : String(layer.source ?? '')
}

// ---------- Health ----------

function deviceHealth(self) {
	const info = self.monitorInfo
	if (!info) return { level: -1, label: 'Unknown', detail: '' }
	const issues = []
	let level = 0
	const check = (status, what) => {
		const s = Number(status)
		if (s > 0) {
			level = Math.max(level, s)
			issues.push(`${what} ${HEALTH_LABELS[s] || s}`)
		}
	}
	check(info.mainBoardTemperature?.status, 'Mainboard temp')
	check(info.mainBoardVoltage?.status, 'Mainboard voltage')
	arr(info.fanInfos).forEach((f) => check(f.status, `Fan ${FAN_LABELS[f.fanType] ?? f.fanType}`))
	arr(info.temperatureInfos).forEach((t) =>
		check(t.status, `Temp ${CHIP_LABELS[t.temperatureType] ?? t.temperatureType}`),
	)
	arr(info.voltageInfos).forEach((v) => check(v.status, `Voltage ${CHIP_LABELS[v.voltageType] ?? v.voltageType}`))
	arr(info.controllerPortMonitorInfos).forEach((p) => check(p.status, `Port ${p.controllerPortID}`))
	arr(info.cardMonitorInfo).forEach((c) => check(c.status, `Card ${c.cardID}`))
	arr(info.outputStatus).forEach((o) => check(o.status, `Output ${o.outputID}`))
	const cab = cabinetHealth(self)
	if (cab.errorCount > 0) {
		level = Math.max(level, cab.level)
		issues.push(`${cab.errorCount} Cabinet(s) ${HEALTH_LABELS[cab.level] || ''}`.trim())
	}
	return { level, label: HEALTH_LABELS[level] || 'Fault', detail: issues.join(', ') }
}

// Receiving cards / cabinets from monitor info (cabinets[].rvCards[])
function cabinetHealth(self) {
	const cabinets = arr(self.monitorInfo?.cabinets)
	const result = {
		count: cabinets.length,
		rvCount: 0,
		errorCount: 0,
		linkErrors: 0,
		level: 0,
		list: [],
		maxTemp: null,
		maxHumidity: null,
		minVoltage: null,
	}
	cabinets.forEach((cab, ci) => {
		const name = `Cab ${cab.CabinetID ?? cab.cabinetID ?? cab.index ?? ci + 1}`
		let lvl = 0
		const why = []
		const check = (status, what) => {
			const s = Number(status)
			if (s > 0) {
				lvl = Math.max(lvl, s)
				if (!why.includes(what)) why.push(what)
			}
		}
		const temps = []
		check(cab.temperature?.status, 'Temp')
		check(cab.voltage?.status, 'Voltage')
		if (Number.isFinite(Number(cab.temperature?.value))) temps.push(Number(cab.temperature.value))
		arr(cab.powerInfo).forEach((p) => check(p.status, 'Power supply'))
		arr(cab.rvCards).forEach((rv) => {
			result.rvCount++
			check(rv.temperature?.status, 'Temp')
			check(rv.voltage?.status, 'Voltage')
			check(rv.humidity?.status, 'Humidity')
			arr(rv.errorBit).forEach((e) => check(e.status, 'Error bit'))
			check(rv.backupStatus?.status, 'Backup')
			const link = rv.nextCabinetLinkStatus
			if (link && (link.linkStatus === false || Number(link.status) > 0)) {
				result.linkErrors++
				lvl = Math.max(lvl, Number(link.status) > 0 ? Number(link.status) : 1)
				if (!why.includes('Link')) why.push('Link')
			}
			arr(rv.moduleInfos).forEach((m) => {
				check(m.temperature?.status, 'Module temp')
				check(m.voltage?.status, 'Module voltage')
			})
			const t = Number(rv.temperature?.value)
			if (Number.isFinite(t)) temps.push(t)
			const h = Number(rv.humidity?.value)
			if (Number.isFinite(h)) result.maxHumidity = Math.max(result.maxHumidity ?? h, h)
			const v = Number(rv.voltage?.value)
			if (Number.isFinite(v) && v > 0) result.minVoltage = Math.min(result.minVoltage ?? v, v)
		})
		temps.forEach((t) => (result.maxTemp = Math.max(result.maxTemp ?? t, t)))
		if (lvl > 0) {
			result.errorCount++
			result.level = Math.max(result.level, lvl)
			result.list.push(`${name} (${why.join('/')})`)
		}
	})
	return result
}

// ---------- Screen output (bit depth, 3D, gamut...) ----------

function screenOutputs(self) {
	const d = self.screenOutput
	if (Array.isArray(d)) return d
	if (d && Array.isArray(d.screens)) return d.screens
	return d ? [d] : []
}

function outputForScreen(self, screenId, index) {
	const list = screenOutputs(self)
	return list.find((o) => o.screenid === screenId || o.screenId === screenId || o.screenID === screenId) || list[index]
}

function gamutNames(self) {
	const names = new Set()
	screenOutputs(self).forEach((o) => {
		arr(o.gamutList?.colorGamutInfoList).forEach((g) => {
			const n = g?.colorGamutInfo?.targetGamut?.name
			if (n) names.add(n)
		})
		if (o.gamutList?.currentGamutName) names.add(o.gamutList.currentGamutName)
	})
	return [...names]
}

function multiModeForScreen(self, screenId, index) {
	const list = arr(self.screenBaseInfo?.multiModeInfo)
	return list.find((m) => m.screenID === screenId) || list[index]
}

function multiModes(self) {
	const seen = new Map()
	arr(self.screenBaseInfo?.multiModeInfo).forEach((m) => {
		arr(m.multiModeParam?.modeInfo).forEach((mode) => {
			if (!seen.has(mode.modeId)) seen.set(mode.modeId, mode.modeName || `Mode ${mode.modeId}`)
		})
	})
	return [...seen.entries()].map(([id, label]) => ({ id, label }))
}

function scheduleForScreen(self, screenId, index) {
	const list = arr(self.schedules)
	return list.find((s) => s.screenId === screenId) || list[index]
}

// ---------- Variables ----------

// Returns [{ id, name, value }]
function buildVariables(self) {
	const out = []
	const add = (id, name, value) => out.push({ id, name, value: value === undefined || value === null ? '' : value })

	// Screens
	const screens = screenList(self)
	const params = arr(self.displayParams)
	const screenCount = Math.max(screens.length, params.length)
	for (let i = 0; i < screenCount; i++) {
		const s = screens[i]
		const p = params.find((x) => s && x.screenId === s.screenID) || params[i]
		const id = s?.screenID ?? p?.screenId
		const L = `Screen ${i + 1}`
		add(`screen_${i}_id`, `${L} ID`, id)
		add(`screen_${i}_name`, `${L} Name`, s?.screenName)
		if (p) {
			const pct = Math.round((p.brightness || 0) * 100)
			add(`screen_${i}_brightness`, `${L} Brightness (%)`, `${pct}%`)
			add(`screen_${i}_brightness_num`, `${L} Brightness (number 0-100)`, pct)
			add(
				`screen_${i}_colortemp`,
				`${L} Color Temperature`,
				p.colorTemperature !== undefined ? p.colorTemperature + 'K' : '',
			)
			add(`screen_${i}_gamma`, `${L} Gamma`, p.gamma)
		}
		if (s) {
			add(`screen_${i}_working_mode`, `${L} Working Mode`, WORKING_MODES[s.workingMode] ?? s.workingMode)
			add(`screen_${i}_frame_rate`, `${L} Master Frame Rate`, round1(s.masterFrameRate))
			const layers = screenLayers(s)
			add(`screen_${i}_active_input`, `${L} Input on first layer`, layerInputName(self, layers[0]))
			layers.forEach((layer, li) => {
				add(`screen_${i}_layer_${li}_input`, `${L} Layer ${li + 1} Input`, layerInputName(self, layer))
			})
		}
		const o = outputForScreen(self, id, i)
		if (o) {
			add(
				`screen_${i}_bitdepth`,
				`${L} Output Bit Depth (setting)`,
				BIT_DEPTHS[o.outputBitDepth?.bitDepth] ?? o.outputBitDepth?.bitDepth,
			)
			add(
				`screen_${i}_bitdepth_current`,
				`${L} Output Bit Depth (current)`,
				BIT_DEPTHS[o.outputBitDepth?.currentBitDepth] ?? o.outputBitDepth?.currentBitDepth,
			)
			add(`screen_${i}_output_framerate`, `${L} Output Frame Rate`, round1(o.currentFrameRate))
			add(`screen_${i}_3d`, `${L} 3D`, onOff(o.threeD?.enable))
			add(`screen_${i}_low_latency`, `${L} Low Latency`, onOff(o.lowDelay))
			add(`screen_${i}_gamut`, `${L} Color Gamut`, o.gamutList?.currentGamutName)
		}
		const mm = multiModeForScreen(self, id, i)
		if (mm) {
			const cur = mm.multiModeParam?.currentModeId
			const mode = arr(mm.multiModeParam?.modeInfo).find((m) => m.modeId === cur)
			add(`screen_${i}_multimode`, `${L} Multi-Mode`, mode?.modeName ?? cur)
		}
		const sch = scheduleForScreen(self, id, i)
		if (sch) add(`screen_${i}_schedule`, `${L} Schedule`, onOff(sch.enable))
	}

	add('connected', 'Controller connected (1/0)', self.connected ? 1 : 0)

	// Preset / display state
	add('current_preset_name', 'Current Preset Name', self.currentPresetName || 'Not Activated')
	const canvases = canvasStates(self)
	add('display_state', 'Current Display State (Normal/Blackout/Freeze)', canvases.length ? canvases[0].mode : 'Unknown')
	add('display_state_code', 'Current Display State (raw code)', canvases.length ? canvases[0].code : '')
	add('blackout_active', 'Blackout active (1/0)', canvases.some((c) => c.mode === 'Blackout') ? 1 : 0)
	add('freeze_active', 'Freeze active (1/0)', canvases.some((c) => c.mode === 'Freeze') ? 1 : 0)
	canvases.forEach((c, i) => add(`canvas_${i}_state`, `Canvas ${c.canvasID ?? i + 1} Display State`, c.mode))

	// Inputs
	const inputs = arr(self.inputs)
	inputs.forEach((input, i) => {
		const L = `Input ${i + 1}${input.name ? ` (${input.name})` : ''}`
		add(`input_${i}_name`, `${L} Name`, input.name)
		add(`input_${i}_id`, `${L} ID`, input.id)
		add(`input_${i}_type`, `${L} Type`, INPUT_TYPES[input.type] ?? String(input.type ?? ''))
		add(`input_${i}_signal`, `${L} Signal (OK/No Signal)`, inputHasSignal(input) ? 'OK' : 'No Signal')
		add(`input_${i}_resolution`, `${L} Resolution@Hz`, inputResolution(input))
		add(`input_${i}_bitdepth`, `${L} Bit Depth`, input.bitDepth)
		add(`input_${i}_range`, `${L} Range`, input.range === 1 ? 'Full' : input.range === 0 ? 'Limited' : '')
		const cfg = inputPortConfig(self, input, i)
		if (cfg) {
			const e = cfg.edidInfo
			add(
				`input_${i}_edid`,
				`${L} EDID`,
				e?.resolution ? `${e.resolution.width}x${e.resolution.height}@${e.refreshRate}` : '',
			)
			add(
				`input_${i}_hdr_mode`,
				`${L} HDR Mode (setting)`,
				HDR_MODES[cfg.hdrParameter?.overrideHdrType] ?? cfg.hdrParameter?.overrideHdrType,
			)
			add(`input_${i}_hdr_current`, `${L} HDR (detected)`, cfg.hdrParameter?.realHdrType)
			add(`input_${i}_contrast`, `${L} Contrast`, cfg.cscParameter?.ContrastValue)
			add(`input_${i}_saturation`, `${L} Saturation`, cfg.cscParameter?.SaturationValue)
			add(`input_${i}_hue`, `${L} Hue`, cfg.cscParameter?.HueValue)
		}
	})
	add('inputs_with_signal', 'Number of inputs with signal', inputs.filter(inputHasSignal).length)

	// Sending card test pattern
	const tp = self.inputData?.testPattern
	if (tp) add('test_pattern', 'Sending-card test pattern', tp.parameters?.state === 1 ? `On (mode ${tp.mode})` : 'Off')

	// Hardware monitoring
	const info = self.monitorInfo
	const health = deviceHealth(self)
	add('device_health', 'Device Health (OK/Alarm/Fault)', health.label)
	add(
		'device_health_detail',
		'Device Health detail (what is not OK)',
		health.detail || (health.level === 0 ? 'All OK' : ''),
	)
	add('device_name', 'Controller Name', info?.name ?? self.deviceInfo?.customName ?? self.deviceInfo?.name)
	add('device_runtime', 'Controller Uptime (h:mm)', formatRuntime(info?.runtime))
	add('device_total_runtime', 'Controller total runtime (h:mm)', formatRuntime(info?.totalRuntime))
	add('mainboard_temp', 'Mainboard Temperature (°C)', round1(info?.mainBoardTemperature?.value))
	add('mainboard_voltage', 'Mainboard Voltage (V)', round1(info?.mainBoardVoltage?.value))
	arr(info?.fanInfos).forEach((f, i) =>
		add(`fan_${i}_speed`, `Fan ${FAN_LABELS[f.fanType] ?? i + 1} Speed (RPM)`, f.fanSpeed ?? f.speed),
	)
	arr(info?.temperatureInfos).forEach((t, i) =>
		add(`temp_${i}`, `Temperature ${CHIP_LABELS[t.temperatureType] ?? i + 1} (°C)`, round1(t.temperature)),
	)
	arr(info?.controllerPortMonitorInfos).forEach((p, i) =>
		add(
			`port_${i}_status`,
			`Controller Port ${p.controllerPortID ?? i + 1} Status`,
			HEALTH_LABELS[p.status] ?? p.status,
		),
	)
	arr(info?.outputStatus).forEach((o, i) =>
		add(`output_${i}_status`, `Output ${o.outputID ?? i + 1} Status`, HEALTH_LABELS[o.status] ?? o.status),
	)
	arr(info?.cardMonitorInfo).forEach((c, i) =>
		add(
			`card_${i}_status`,
			`Card ${c.cardID ?? i + 1} (${['Input', 'Output', 'Expansion', 'Backplane'][c.cardType] ?? c.cardType}) Status`,
			HEALTH_LABELS[c.status] ?? c.status,
		),
	)
	add('backup_status_code', 'Backup status (raw code from monitor)', info?.backupStatus)

	// Cabinets
	const cab = cabinetHealth(self)
	add('cabinet_count', 'Cabinets (monitored)', cab.count)
	add('rvcard_count', 'Receiving cards (monitored)', cab.rvCount)
	add('cabinet_errors', 'Cabinets with alarm/fault', cab.errorCount)
	add('cabinet_error_list', 'Cabinets with alarm/fault (list)', cab.list.join(', ') || 'None')
	add('cabinet_link_errors', 'Cabinet link errors', cab.linkErrors)
	add('cabinet_max_temp', 'Highest cabinet temperature (°C)', cab.maxTemp === null ? '' : round1(cab.maxTemp))
	add('cabinet_max_humidity', 'Highest cabinet humidity', cab.maxHumidity === null ? '' : round1(cab.maxHumidity))
	add('cabinet_min_voltage', 'Lowest receiving-card voltage (V)', cab.minVoltage === null ? '' : round1(cab.minVoltage))
	add('cabinet_count_configured', 'Cabinets (configured)', arr(self.cabinetList).length || '')

	// Device info
	const hw = self.deviceInfo
	if (hw) {
		add('device_model', 'Controller Model', hw.name)
		add('device_custom_name', 'Controller Custom Name', hw.customName)
		add('device_sn', 'Controller Serial Number', hw.sn)
		add('device_firmware', 'Controller Firmware', hw.swVersion)
		add('device_hw_version', 'Controller Hardware Version', hw.hwVersion)
		add('device_ip', 'Controller IP', hw.ip)
		add('device_mac', 'Controller MAC', hw.mac)
		add('device_mode', 'Controller Mode', DEVICE_MODES[hw.mode] ?? hw.mode)
		add('device_update_state', 'Firmware update state', UPDATE_STATES[hw.updateState] ?? hw.updateState)
		if (hw.memorySize)
			add('device_memory_used', 'Controller memory used (%)', Math.round((hw.memoryUsed / hw.memorySize) * 100))
	}

	// Backup
	const b = self.backupInfo
	add('backup_master_name', 'Primary controller name', b?.masterName)
	add('backup_master_mac', 'Primary controller MAC', b?.master)
	add('backup_backup_name', 'Backup controller name', b?.backupName)
	add('backup_backup_mac', 'Backup controller MAC', b?.backup)
	add('backup_configured', 'Backup configured (1/0)', b && (b.backup || b.backupName) ? 1 : 0)

	// Audio / SNMP
	const a = self.audioInfo
	add('audio_output', 'Audio (SPDIF) output', onOff(a?.enable))
	add('audio_source', 'Audio source', a ? (inputByGroupId(self, a.source)?.name ?? a.source) : '')
	add('snmp', 'SNMP', onOff(self.snmpInfo?.state))

	// Multifunction cards / sensors
	const mf = arr(self.mfCards)
	add('mfcard_count', 'Multifunction cards', mf.length)
	mf.forEach((c, i) => {
		const L = `MF card ${i + 1}`
		add(`mfcard_${i}_link`, `${L} Link`, String(c.linkStatus) === '1' ? 'Connected' : 'Disconnected')
		const light = arr(c.lightSensorInfos)[0]
		if (light) add(`mfcard_${i}_light`, `${L} Ambient brightness`, light.brightness)
		const env = arr(c.environmentSensorInfos)[0]
		if (env) {
			add(`mfcard_${i}_temp`, `${L} Sensor temperature`, round1(env.temperature))
			add(`mfcard_${i}_humidity`, `${L} Sensor humidity`, round1(env.humidity))
		}
		const power = c.powerInfo
		if (power) add(`mfcard_${i}_power`, `${L} Power`, onOff(power.allPowerState))
	})

	return out
}

module.exports = {
	INPUT_TYPES,
	HDR_MODES,
	BIT_DEPTHS,
	displayModeName,
	canvasStates,
	inputHasSignal,
	findInput,
	inputByGroupId,
	screenList,
	allScreenIds,
	screenLayers,
	deviceHealth,
	cabinetHealth,
	outputForScreen,
	gamutNames,
	multiModes,
	scheduleForScreen,
	inputPortConfig,
	buildVariables,
}
