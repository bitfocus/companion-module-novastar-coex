// Minimal client for the NovaStar COEX OpenAPI (HTTP, default port 8001).
// Used for everything the @novastar-dev/coex library does not cover.
// Endpoints and bodies follow https://api.coex.novastar.tech/en/

class CoexApi {
	constructor(host, port) {
		this.baseurl = `http://${host}:${port || 8001}`
		this.timeout = 4000
	}

	async request(method, path, body) {
		const opts = { method, headers: {}, signal: AbortSignal.timeout(this.timeout) }
		if (body !== undefined) {
			opts.headers['Content-Type'] = 'application/json'
			opts.body = JSON.stringify(body)
		}
		const res = await fetch(this.baseurl + path, opts)
		let data
		try {
			data = await res.json()
		} catch (e) {
			throw new Error(`${method} ${path}: HTTP ${res.status}, no JSON`)
		}
		if (data && typeof data === 'object' && 'code' in data) {
			if (data.code && data.code !== 0 && data.code !== 200) {
				const msg = data.message || `code ${data.code}`
				const err = new Error(`${method} ${path}: ${msg}`)
				if (msg === 'device locked') {
					err.message += ' (VMP is connected from another PC - close VMP or run Companion on that PC)'
				}
				throw err
			}
			return data.data
		}
		if (!res.ok) throw new Error(`${method} ${path}: HTTP ${res.status}`)
		return data
	}

	get(path) {
		return this.request('GET', path)
	}
	put(path, body) {
		return this.request('PUT', path, body)
	}
	post(path, body) {
		return this.request('POST', path, body)
	}

	// ---- Reads ----
	async displayState() {
		return this.get('/api/v1/screen/output/display/state')
	}
	async displayParams() {
		const d = await this.get('/api/v1/screen/displayparams')
		return Array.isArray(d) ? d : (d?.list ?? [])
	}
	async presetList() {
		const d = await this.get('/api/v1/preset')
		if (Array.isArray(d)) return d
		return d?.screenPresets?.[0]?.presets ?? []
	}
	async sources() {
		const d = await this.get('/api/v1/device/input/sources')
		return Array.isArray(d) ? d : []
	}
	screens() {
		return this.get('/api/v1/screen')
	}
	screenBaseInfo() {
		return this.get('/api/v1/screen/base/info')
	}
	screenOutput() {
		return this.get('/api/v1/screen/output')
	}
	schedules() {
		return this.get('/api/v1/screen/schedule/all')
	}
	monitor() {
		return this.get('/api/v1/device/monitor/info?isNeedCabinetInfo=0')
	}
	deviceInfo() {
		return this.get('/api/v1/device/hw')
	}
	cabinets() {
		return this.get('/api/v1/device/cabinet')
	}
	backup() {
		return this.get('/api/v1/device/backup')
	}
	audio() {
		return this.get('/api/v1/device/audio')
	}
	snmp() {
		return this.get('/api/v1/device/snmpstate')
	}
	multifunctionCards() {
		return this.get('/api/v1/device/multifunc-card/detailinfo')
	}
	inputData() {
		return this.get('/api/v1/device/input')
	}

	// ---- Screen / output ----
	displayMode(value, screenIdList = []) {
		return this.put('/api/v1/screen/output/displaymode', { value, screenIdList })
	}
	brightness(brightness, screenIdList) {
		return this.put('/api/v1/screen/brightness', { screenIdList, brightness })
	}
	colorTemperature(colorTemperature, screenIdList) {
		return this.put('/api/v1/screen/colortemperature', { screenIdList, colorTemperature })
	}
	gamma(gamma, screenIdList) {
		return this.put('/api/v1/screen/gamma', { screenIdList, gamma })
	}
	brightnessLimitOnOff(state, screenIdList) {
		return this.post('/api/v1/screen/output/max-brightness', { screenIdList, type: 1, state })
	}
	brightnessLimitValue(screenIdList, type, nit, ratio) {
		return this.post('/api/v1/screen/output/max-brightness', { screenIdList, type, nit, ratio })
	}
	gamut(name, screenIdList) {
		return this.put('/api/v1/screen/output/gamut', { name, screenIdList })
	}
	lut3dEnable(enable, screenIdList) {
		return this.put('/api/v1/screen/processing/threedlut/enable', { screenIdList, enable })
	}
	lut3dStrength(strength, screenIdList) {
		return this.put('/api/v1/screen/processing/threedlut/strength', { screenIdList, strength })
	}
	colorCorrection(enable, screenIdList) {
		return this.put('/api/v1/screen/processing/colorcorrect/enable', { enable, screenIdList })
	}
	scheduleOnOff(screenId, enable) {
		return this.post('/api/v1/screen/schedule/enable/update', { screenId, enable })
	}
	layerSource(screenID, layers) {
		return this.put('/api/v1/screen/layer/input', { screenID, layers })
	}
	multiModeScreens(screenIdList, modeId) {
		return this.put('/api/v1/screen/output/multimode', { screenIdList, modeId })
	}
	bitDepth(bitDepth, screenIdList) {
		return this.put('/api/v1/screen/output/bitdepth', { screenIdList, bitDepth })
	}
	syncSource(selectSource, screenIdList) {
		return this.put('/api/v1/screen/output/sync/source', { screenIdList, selectSource })
	}
	threeD(enable, screenIdList) {
		return this.put('/api/v1/screen/output/threed/enable', { screenIdList, enable })
	}
	threeDEmitter(enable, screenIdList) {
		return this.put('/api/v1/screen/output/threed/emitter', { Enable: enable, screenIdList })
	}

	// ---- Input ----
	inputShadow(inputIdList, type, shadow) {
		return this.put('/api/v1/device/input/shadow', { inputIdList, type, shadow })
	}
	inputHighlight(inputIdList, type, highLight) {
		return this.put('/api/v1/device/input/highlight', { inputIdList, type, highLight })
	}
	inputSaturation(inputIdList, saturation) {
		return this.put('/api/v1/device/input/saturation', { inputIdList, saturation })
	}
	inputHue(inputIdList, hue) {
		return this.put('/api/v1/device/input/hue', { inputIdList, hue })
	}
	inputReset(inputIdList) {
		return this.put('/api/v1/device/input/reset', { inputIdList, type: 0 })
	}
	edid(inputId, width, height, refreshRate, isCustom) {
		return this.put(`/api/v1/device/input/${inputId}/edid`, {
			para: { resolution: { width, height }, refreshRate, isCustom },
		})
	}
	hdrMode(inputId, hdrMode) {
		return this.put(`/api/v1/device/input/${inputId}/hdrmode`, { hdrMode })
	}
	internalSource(width, height, refreshrate, bitdepth, isEdidCustom) {
		return this.put('/api/v1/device/input/internalsource', { width, height, refreshrate, bitdepth, isEdidCustom })
	}
	testPattern(mode, parameters) {
		return this.put('/api/v1/device/input/pattern/test', { mode, parameters })
	}

	// ---- Device ----
	audioOutput(enable, source) {
		return this.post('/api/v1/device/audio', { enable, source })
	}
	colorBeacon(enable, color) {
		return this.post('/api/v1/device/hw/colorBeacon', { enable, color })
	}
	deviceIdentify(enable) {
		return this.put('/api/v1/device/hw/mapping', { enable })
	}
	backupVerify(screenID, verifyType) {
		return this.post('/api/v1/device/backup/verify', { screenID, verifyType })
	}
	systemTime(d, isUTC) {
		return this.put('/api/v1/device/hw/systemtime', {
			year: d.year,
			month: d.month,
			day: d.day,
			hour: d.hour,
			minute: d.minute,
			second: d.second,
			isUTC,
		})
	}
	autoTime(enable, timeSource) {
		return this.put('/api/v1/device/time/enable', { enable, timeSource })
	}
	timezone(timezone) {
		return this.post('/api/v1/device/timezone', { timezone })
	}
	controllerName(customName) {
		return this.put('/api/v1/device/hw/customname', { customName })
	}
	snmpOnOff(state) {
		return this.put('/api/v1/device/snmpstate', { state })
	}

	// ---- Cabinets (receiving cards) ----
	noDataSignal(idList, prestoreImageType) {
		return this.put('/api/v1/device/cabinet/prestoreimage', { idList, abnormalMode: 1, prestoreImageType })
	}
	thermalOnOff(idList, enable) {
		return this.put('/api/v1/device/correctionop/cabinets/thermacal/enable', { idList, enable })
	}
	thermalAmount(idList, amount) {
		return this.put('/api/v1/device/correctionop/cabinets/thermacal/amount', { idList, amount })
	}
	thermalMode(idList, mode) {
		return this.put('/api/v1/device/correctionop/cabinets/thermacal/mode', { idList, mode })
	}
	cabinetRgbBrightness(idList, r, g, b) {
		return this.put('/api/v1/device/cabinet/rgb/brightness', { idList, r, g, b })
	}
	cabinetBrightness(idList, ratio, nit) {
		const body = { idList, ratio }
		if (nit !== undefined && nit !== null && nit !== '') body.nit = nit
		return this.put('/api/v1/device/cabinet/brightness', body)
	}
	cabinetColorTemperature(idList, value) {
		return this.put('/api/v1/device/cabinet/colortemperature', { idList, value })
	}
	cabinetTestPattern(idList, testmode) {
		return this.put('/api/v1/device/cabinet/testpattern', { idList, testmode })
	}
	cabinetMapping(idList, enable) {
		return this.put('/api/v1/device/cabinet/mapping', { idList, enable })
	}
	cabinetMultiMode(idList, modeId) {
		return this.put('/api/v1/device/cabinet/multimode', { idList, modeId })
	}
	cabinetRgbw(idList, changeType, value) {
		return this.post('/api/v1/device/cabinet/rgbwbrightness', { idList, changeType, value })
	}
}

module.exports = CoexApi
