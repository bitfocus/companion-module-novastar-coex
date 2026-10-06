// Additional actions covering the rest of the COEX OpenAPI.
const state = require('./state')

const ON_OFF = [
	{ id: 'on', label: 'On' },
	{ id: 'off', label: 'Off' },
	{ id: 'toggle', label: 'Toggle' },
]

const BEACON_COLORS = [
	{ id: '121,10,10', label: 'Burgundy' },
	{ id: '60,115,167', label: 'Deep blue' },
	{ id: '60,154,50', label: 'Green' },
	{ id: '230,160,0', label: 'Amber' },
	{ id: '150,60,170', label: 'Purple' },
	{ id: '255,255,255', label: 'White' },
]

const RX_TEST_MODES = [
	{ id: 1, label: 'Normal display (off)' },
	{ id: 4, label: 'Red' },
	{ id: 5, label: 'Green' },
	{ id: 6, label: 'Blue' },
	{ id: 7, label: 'White' },
	{ id: 8, label: 'Horizontal lines' },
	{ id: 9, label: 'Vertical lines' },
	{ id: 10, label: 'Slashes' },
	{ id: 11, label: 'Checkerboard' },
	{ id: 12, label: 'Grayscale' },
	{ id: 13, label: 'Aging' },
]

module.exports = function (self) {
	// ---- shared option builders ----
	const screenOpt = () => ({
		id: 'screen',
		type: 'dropdown',
		label: 'Screen',
		default: 'all',
		choices: self.screenChoices(true),
		allowCustom: true,
	})
	const singleScreenOpt = () => ({
		id: 'screen',
		type: 'dropdown',
		label: 'Screen',
		default: self.screenChoices()[0]?.id ?? '',
		choices: self.screenChoices(),
		allowCustom: true,
	})
	const inputOpt = (withAll = true) => ({
		id: 'input',
		type: 'dropdown',
		label: 'Input',
		default: withAll ? 'all' : (self.inputIdChoices()[0]?.id ?? '0'),
		choices: self.inputIdChoices(withAll),
		allowCustom: true,
	})
	const cabinetOpt = () => ({
		id: 'cabinets',
		type: 'textinput',
		label: 'Cabinet IDs (comma separated, empty = all cabinets)',
		default: '',
		useVariables: true,
	})
	const onOffOpt = (label = 'State', toggle = false) => ({
		id: 'state',
		type: 'dropdown',
		label,
		default: 'on',
		choices: toggle ? ON_OFF : ON_OFF.filter((c) => c.id !== 'toggle'),
	})
	const resolveOnOff = (value, current) => (value === 'toggle' ? !current : value === 'on')

	const cabinets = async (event, context) => {
		let text = event.options.cabinets
		if (context && typeof context.parseVariablesInString === 'function')
			text = await context.parseVariablesInString(text)
		const ids = self.resolveCabinets(text)
		if (!ids.length) throw new Error('No cabinet IDs (cabinet list not loaded yet?)')
		return ids
	}

	const screenData = (screenId) => {
		const ids = state.allScreenIds(self)
		const idx = Math.max(0, ids.indexOf(screenId))
		return { idx, id: screenId }
	}

	return {
		// ================= Screen / output =================
		display_mode_screen: {
			name: 'Display Mode (per screen)',
			options: [
				screenOpt(),
				{
					id: 'mode',
					type: 'dropdown',
					label: 'Mode',
					default: 1,
					choices: [
						{ id: 0, label: 'Normal' },
						{ id: 1, label: 'Blackout' },
						{ id: 2, label: 'Freeze' },
					],
				},
			],
			callback: (e) =>
				self.run('Display mode', (api) =>
					api.displayMode(Number(e.options.mode), e.options.screen === 'all' ? [] : [e.options.screen]),
				),
		},

		brightness_screen: {
			name: 'Brightness (per screen)',
			options: [screenOpt(), { id: 'value', type: 'number', label: 'Brightness %', default: 100, min: 0, max: 100 }],
			callback: (e) =>
				self.run('Brightness', (api) =>
					api.brightness(Number(e.options.value) / 100, self.resolveScreens(e.options.screen)),
				),
		},

		brightness_step: {
			name: 'Brightness up/down (step)',
			description: 'Changes the brightness relative to the current value',
			options: [
				screenOpt(),
				{ id: 'step', type: 'number', label: 'Step % (negative = darker)', default: 5, min: -100, max: 100 },
			],
			callback: (e) =>
				self.run('Brightness step', async (api) => {
					const ids = self.resolveScreens(e.options.screen)
					for (const id of ids) {
						const p = (self.displayParams || []).find((x) => x.screenId === id) || self.displayParams?.[0]
						const cur = Math.round((p?.brightness ?? 0) * 100)
						const next = Math.max(0, Math.min(100, cur + Number(e.options.step)))
						await api.brightness(next / 100, [id])
					}
				}),
		},

		colortemp_screen: {
			name: 'Color Temperature (per screen)',
			options: [screenOpt(), { id: 'value', type: 'number', label: 'Kelvin', default: 6500, min: 1700, max: 15000 }],
			callback: (e) =>
				self.run('Color temperature', (api) =>
					api.colorTemperature(Number(e.options.value), self.resolveScreens(e.options.screen)),
				),
		},

		gamma_screen: {
			name: 'Gamma (per screen)',
			options: [screenOpt(), { id: 'value', type: 'number', label: 'Gamma', default: 2.8, min: 1, max: 4, step: 0.1 }],
			callback: (e) =>
				self.run('Gamma', (api) => api.gamma(Number(e.options.value), self.resolveScreens(e.options.screen))),
		},

		brightness_limit_onoff: {
			name: 'Brightness limit on/off',
			options: [screenOpt(), onOffOpt()],
			callback: (e) =>
				self.run('Brightness limit', (api) =>
					api.brightnessLimitOnOff(resolveOnOff(e.options.state, false), self.resolveScreens(e.options.screen)),
				),
		},

		brightness_limit_value: {
			name: 'Brightness limit value',
			options: [
				screenOpt(),
				{
					id: 'type',
					type: 'dropdown',
					label: 'Limit by',
					default: 3,
					choices: [
						{ id: 2, label: 'Nits' },
						{ id: 3, label: 'Percent' },
					],
				},
				{ id: 'nit', type: 'number', label: 'Nits (when limiting by nits)', default: 1000, min: 0, max: 65535 },
				{ id: 'percent', type: 'number', label: 'Percent (when limiting by %)', default: 80, min: 0, max: 100 },
			],
			callback: (e) =>
				self.run('Brightness limit value', (api) =>
					api.brightnessLimitValue(
						self.resolveScreens(e.options.screen),
						Number(e.options.type),
						Number(e.options.nit),
						Number(e.options.percent) / 100,
					),
				),
		},

		gamut: {
			name: 'Color gamut',
			options: [
				screenOpt(),
				{
					id: 'name',
					type: 'dropdown',
					label: 'Gamut (name as in VMP)',
					default: state.gamutNames(self)[0] ?? 'sRGB',
					choices: state.gamutNames(self).map((n) => ({ id: n, label: n })),
					allowCustom: true,
				},
			],
			callback: (e) => self.run('Gamut', (api) => api.gamut(e.options.name, self.resolveScreens(e.options.screen))),
		},

		lut3d_onoff: {
			name: '3D LUT on/off (per screen)',
			options: [screenOpt(), onOffOpt()],
			callback: (e) =>
				self.run('3D LUT', (api) =>
					api.lut3dEnable(resolveOnOff(e.options.state, false), self.resolveScreens(e.options.screen)),
				),
		},

		lut3d_strength: {
			name: '3D LUT strength',
			options: [screenOpt(), { id: 'value', type: 'number', label: 'Strength %', default: 100, min: 0, max: 100 }],
			callback: (e) =>
				self.run('3D LUT strength', (api) =>
					api.lut3dStrength(Number(e.options.value), self.resolveScreens(e.options.screen)),
				),
		},

		color_correction: {
			name: 'Color correction on/off',
			options: [screenOpt(), onOffOpt()],
			callback: (e) =>
				self.run('Color correction', (api) =>
					api.colorCorrection(resolveOnOff(e.options.state, false), self.resolveScreens(e.options.screen)),
				),
		},

		schedule_onoff: {
			name: 'Brightness schedule on/off',
			options: [screenOpt(), onOffOpt('State', true)],
			callback: (e) =>
				self.run('Schedule', async (api) => {
					for (const id of self.resolveScreens(e.options.screen)) {
						const { idx } = screenData(id)
						const cur = state.scheduleForScreen(self, id, idx)?.enable === true
						await api.scheduleOnOff(id, resolveOnOff(e.options.state, cur))
					}
				}),
		},

		layer_source: {
			name: 'Layer source (All-in-One mode)',
			description: 'Puts an input on a specific layer of a screen',
			options: [
				{
					id: 'layer',
					type: 'dropdown',
					label: 'Screen / layer',
					default: self.layerChoices()[0]?.id ?? '',
					choices: self.layerChoices(),
					allowCustom: true,
				},
				{
					id: 'source',
					type: 'dropdown',
					label: 'Input',
					default: self.inputGroupChoices()[0]?.id ?? '0',
					choices: self.inputGroupChoices(),
					allowCustom: true,
				},
			],
			callback: (e) =>
				self.run('Layer source', (api) => {
					const [screenID, layerId] = String(e.options.layer).split('|')
					if (!screenID || layerId === undefined) throw new Error('Choose a screen/layer')
					return api.layerSource(screenID, [{ id: Number(layerId), source: Number(e.options.source) }])
				}),
		},

		multimode_screen: {
			name: 'Multi-mode (per screen)',
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
			callback: (e) =>
				self.run('Multi-mode', (api) =>
					api.multiModeScreens(self.resolveScreens(e.options.screen), Number(e.options.mode)),
				),
		},

		output_bitdepth: {
			name: 'Output bit depth',
			options: [
				screenOpt(),
				{
					id: 'bitdepth',
					type: 'dropdown',
					label: 'Bit depth',
					default: 255,
					choices: Object.entries(state.BIT_DEPTHS).map(([id, label]) => ({ id: Number(id), label })),
				},
			],
			callback: (e) =>
				self.run('Bit depth', (api) => api.bitDepth(Number(e.options.bitdepth), self.resolveScreens(e.options.screen))),
		},

		sync_source: {
			name: 'Output sync source',
			options: [
				screenOpt(),
				{
					id: 'source',
					type: 'dropdown',
					label: 'Sync to input',
					default: self.inputGroupChoices()[0]?.id ?? '0',
					choices: self.inputGroupChoices(),
					allowCustom: true,
				},
			],
			callback: (e) =>
				self.run('Sync source', (api) =>
					api.syncSource(Number(e.options.source), self.resolveScreens(e.options.screen)),
				),
		},

		threed_onoff: {
			name: '3D on/off',
			options: [screenOpt(), onOffOpt('State', true)],
			callback: (e) =>
				self.run('3D', async (api) => {
					const ids = self.resolveScreens(e.options.screen)
					const cur = ids.some((id, i) => state.outputForScreen(self, id, i)?.threeD?.enable === true)
					await api.threeD(resolveOnOff(e.options.state, cur), ids)
				}),
		},

		threed_emitter: {
			name: '3D emitter on/off',
			options: [screenOpt(), onOffOpt()],
			callback: (e) =>
				self.run('3D emitter', (api) =>
					api.threeDEmitter(resolveOnOff(e.options.state, false), self.resolveScreens(e.options.screen)),
				),
		},

		backup_verify: {
			name: 'Primary/backup verify',
			options: [
				singleScreenOpt(),
				{
					id: 'type',
					type: 'dropdown',
					label: 'Verify',
					default: 0,
					choices: [
						{ id: 0, label: 'Off' },
						{ id: 1, label: 'Primary only' },
						{ id: 2, label: 'Backup only' },
					],
				},
			],
			callback: (e) => self.run('Backup verify', (api) => api.backupVerify(e.options.screen, Number(e.options.type))),
		},

		// ================= Inputs =================
		input_saturation: {
			name: 'Input saturation',
			options: [
				inputOpt(),
				{ id: 'value', type: 'number', label: 'Saturation (0-200, 100 = neutral)', default: 100, min: 0, max: 200 },
			],
			callback: (e) =>
				self.run('Saturation', (api) =>
					api.inputSaturation(self.resolveInputs(e.options.input), Number(e.options.value)),
				),
		},

		input_contrast: {
			name: 'Input contrast',
			options: [
				inputOpt(),
				{ id: 'value', type: 'number', label: 'Contrast (0-200, 100 = neutral)', default: 100, min: 0, max: 200 },
			],
			callback: (e) =>
				self.run('Contrast', (api) =>
					api.inputHighlight(self.resolveInputs(e.options.input), 3, Number(e.options.value)),
				),
		},

		input_black_level: {
			name: 'Input black level',
			options: [
				inputOpt(),
				{ id: 'value', type: 'number', label: 'Black level (0-200, 100 = neutral)', default: 100, min: 0, max: 200 },
			],
			callback: (e) =>
				self.run('Black level', (api) =>
					api.inputShadow(self.resolveInputs(e.options.input), 3, Number(e.options.value)),
				),
		},

		input_hue: {
			name: 'Input hue',
			options: [
				inputOpt(),
				{ id: 'value', type: 'number', label: 'Hue (-180 to 180)', default: 0, min: -180, max: 180 },
			],
			callback: (e) =>
				self.run('Hue', (api) => api.inputHue(self.resolveInputs(e.options.input), Number(e.options.value))),
		},

		input_rgb_shadow: {
			name: 'Input RGB shadow (per color)',
			options: [
				inputOpt(),
				{
					id: 'color',
					type: 'dropdown',
					label: 'Color',
					default: 0,
					choices: [
						{ id: 0, label: 'Red' },
						{ id: 1, label: 'Green' },
						{ id: 2, label: 'Blue' },
					],
				},
				{ id: 'value', type: 'number', label: 'Value (0-200, 100 = neutral)', default: 100, min: 0, max: 200 },
			],
			callback: (e) =>
				self.run('RGB shadow', (api) =>
					api.inputShadow(self.resolveInputs(e.options.input), Number(e.options.color), Number(e.options.value)),
				),
		},

		input_rgb_highlight: {
			name: 'Input RGB highlight (per color)',
			options: [
				inputOpt(),
				{
					id: 'color',
					type: 'dropdown',
					label: 'Color',
					default: 0,
					choices: [
						{ id: 0, label: 'Red' },
						{ id: 1, label: 'Green' },
						{ id: 2, label: 'Blue' },
					],
				},
				{ id: 'value', type: 'number', label: 'Value (0-200, 100 = neutral)', default: 100, min: 0, max: 200 },
			],
			callback: (e) =>
				self.run('RGB highlight', (api) =>
					api.inputHighlight(self.resolveInputs(e.options.input), Number(e.options.color), Number(e.options.value)),
				),
		},

		input_color_reset: {
			name: 'Input color adjustments reset',
			options: [inputOpt()],
			callback: (e) => self.run('Color reset', (api) => api.inputReset(self.resolveInputs(e.options.input))),
		},

		input_edid: {
			name: 'Input EDID',
			options: [
				inputOpt(false),
				{ id: 'width', type: 'number', label: 'Width', default: 1920, min: 64, max: 8192 },
				{ id: 'height', type: 'number', label: 'Height', default: 1080, min: 64, max: 8192 },
				{ id: 'rate', type: 'number', label: 'Refresh rate (Hz)', default: 50, min: 1, max: 240, step: 0.01 },
				{ id: 'custom', type: 'checkbox', label: 'Custom resolution (not from the preset list)', default: false },
			],
			callback: (e) =>
				self.run('EDID', (api) =>
					api.edid(
						Number(e.options.input),
						Number(e.options.width),
						Number(e.options.height),
						Number(e.options.rate),
						!!e.options.custom,
					),
				),
		},

		input_hdr_mode: {
			name: 'Input HDR mode',
			options: [
				inputOpt(false),
				{
					id: 'mode',
					type: 'dropdown',
					label: 'HDR mode',
					default: 255,
					choices: Object.entries(state.HDR_MODES).map(([id, label]) => ({ id: Number(id), label })),
				},
			],
			callback: (e) => self.run('HDR mode', (api) => api.hdrMode(Number(e.options.input), Number(e.options.mode))),
		},

		internal_source: {
			name: 'Internal source format',
			options: [
				{ id: 'width', type: 'number', label: 'Width', default: 1920, min: 64, max: 8192 },
				{ id: 'height', type: 'number', label: 'Height', default: 1080, min: 64, max: 8192 },
				{ id: 'rate', type: 'number', label: 'Refresh rate (Hz)', default: 50, min: 1, max: 240, step: 0.01 },
				{
					id: 'bitdepth',
					type: 'dropdown',
					label: 'Bit depth',
					default: 0,
					choices: [
						{ id: 0, label: '8 bit' },
						{ id: 1, label: '10 bit' },
						{ id: 2, label: '12 bit' },
					],
				},
				{ id: 'custom', type: 'checkbox', label: 'Custom EDID', default: false },
			],
			callback: (e) =>
				self.run('Internal source', (api) =>
					api.internalSource(
						Number(e.options.width),
						Number(e.options.height),
						Number(e.options.rate),
						Number(e.options.bitdepth),
						!!e.options.custom,
					),
				),
		},

		testpattern_off: {
			name: 'Test Pattern off (sending card)',
			options: [],
			callback: () =>
				self.run('Test pattern off', (api) => {
					const mode = self.inputData?.testPattern?.mode ?? 0
					return api.testPattern(mode, {
						red: 0,
						green: 0,
						blue: 0,
						gray: 0,
						gridWidth: 16,
						moveSpeed: 0,
						gradientStretch: 1,
						state: 0,
					})
				}),
		},

		// ================= Device =================
		audio_output: {
			name: 'Audio (SPDIF) output',
			options: [
				onOffOpt('Audio', true),
				{
					id: 'source',
					type: 'dropdown',
					label: 'Audio from input',
					default: self.inputGroupChoices()[0]?.id ?? '0',
					choices: self.inputGroupChoices(),
					allowCustom: true,
				},
			],
			callback: (e) =>
				self.run('Audio', (api) =>
					api.audioOutput(resolveOnOff(e.options.state, self.audioInfo?.enable === true), Number(e.options.source)),
				),
		},

		controller_identify: {
			name: 'Controller identify (color on front LCD)',
			options: [
				onOffOpt(),
				{
					id: 'color',
					type: 'dropdown',
					label: 'Color',
					default: '60,154,50',
					choices: BEACON_COLORS,
					allowCustom: true,
				},
			],
			callback: (e) =>
				self.run('Controller identify', (api) => {
					const [r, g, b] = String(e.options.color)
						.split(',')
						.map((x) => Math.max(0, Math.min(255, Number(x) || 0)))
					return api.colorBeacon(resolveOnOff(e.options.state, false), { r, g, b })
				}),
		},

		device_identify: {
			name: 'Controller mapping (identify on screen)',
			options: [onOffOpt()],
			callback: (e) => self.run('Device identify', (api) => api.deviceIdentify(resolveOnOff(e.options.state, false))),
		},

		sync_time: {
			name: 'Set controller time to Companion time',
			options: [{ id: 'utc', type: 'checkbox', label: 'Send as UTC', default: false }],
			callback: (e) =>
				self.run('System time', (api) => {
					const d = new Date()
					const utc = !!e.options.utc
					return api.systemTime(
						{
							year: utc ? d.getUTCFullYear() : d.getFullYear(),
							month: (utc ? d.getUTCMonth() : d.getMonth()) + 1,
							day: utc ? d.getUTCDate() : d.getDate(),
							hour: utc ? d.getUTCHours() : d.getHours(),
							minute: utc ? d.getUTCMinutes() : d.getMinutes(),
							second: utc ? d.getUTCSeconds() : d.getSeconds(),
						},
						utc,
					)
				}),
		},

		auto_time: {
			name: 'Automatic time on/off',
			options: [
				onOffOpt(),
				{
					id: 'source',
					type: 'dropdown',
					label: 'Time source',
					default: 1,
					choices: [
						{ id: 0, label: 'PC' },
						{ id: 1, label: 'NTP server' },
					],
				},
			],
			callback: (e) =>
				self.run('Auto time', (api) => api.autoTime(resolveOnOff(e.options.state, true), Number(e.options.source))),
		},

		timezone: {
			name: 'Controller time zone',
			options: [{ id: 'tz', type: 'textinput', label: 'Time zone (e.g. Europe/Berlin)', default: 'Europe/Berlin' }],
			callback: (e) => self.run('Time zone', (api) => api.timezone(String(e.options.tz).trim())),
		},

		controller_name: {
			name: 'Controller name',
			options: [{ id: 'name', type: 'textinput', label: 'Name', default: '', useVariables: true }],
			callback: async (e, context) => {
				const name = context?.parseVariablesInString
					? await context.parseVariablesInString(e.options.name)
					: e.options.name
				return self.run('Controller name', (api) => api.controllerName(String(name).slice(0, 255)))
			},
		},

		snmp_onoff: {
			name: 'SNMP on/off',
			options: [onOffOpt('State', true)],
			callback: (e) =>
				self.run('SNMP', (api) => api.snmpOnOff(resolveOnOff(e.options.state, self.snmpInfo?.state === true))),
		},

		// ================= Cabinets / receiving cards =================
		cabinet_test_pattern: {
			name: 'Cabinet test pattern (receiving cards)',
			options: [cabinetOpt(), { id: 'mode', type: 'dropdown', label: 'Pattern', default: 4, choices: RX_TEST_MODES }],
			callback: (e, ctx) =>
				self.run('Cabinet test pattern', async (api) =>
					api.cabinetTestPattern(await cabinets(e, ctx), Number(e.options.mode)),
				),
		},

		cabinet_mapping: {
			name: 'Cabinet mapping (show cabinet numbers)',
			options: [cabinetOpt(), onOffOpt()],
			callback: (e, ctx) =>
				self.run('Cabinet mapping', async (api) =>
					api.cabinetMapping(await cabinets(e, ctx), resolveOnOff(e.options.state, false)),
				),
		},

		cabinet_brightness: {
			name: 'Cabinet brightness',
			options: [
				cabinetOpt(),
				{ id: 'value', type: 'number', label: 'Brightness %', default: 100, min: 0, max: 100 },
				{ id: 'nit', type: 'textinput', label: 'or nits (optional, leave empty to use %)', default: '' },
			],
			callback: (e, ctx) =>
				self.run('Cabinet brightness', async (api) => {
					const nit = String(e.options.nit ?? '').trim()
					return api.cabinetBrightness(
						await cabinets(e, ctx),
						Number(e.options.value) / 100,
						nit === '' ? undefined : Number(nit),
					)
				}),
		},

		cabinet_rgb_brightness: {
			name: 'Cabinet RGB brightness',
			options: [
				cabinetOpt(),
				{ id: 'r', type: 'number', label: 'Red (0-255)', default: 255, min: 0, max: 255 },
				{ id: 'g', type: 'number', label: 'Green (0-255)', default: 255, min: 0, max: 255 },
				{ id: 'b', type: 'number', label: 'Blue (0-255)', default: 255, min: 0, max: 255 },
			],
			callback: (e, ctx) =>
				self.run('Cabinet RGB brightness', async (api) =>
					api.cabinetRgbBrightness(
						await cabinets(e, ctx),
						Number(e.options.r),
						Number(e.options.g),
						Number(e.options.b),
					),
				),
		},

		cabinet_rgbw: {
			name: 'Cabinet RGBW component brightness',
			options: [
				cabinetOpt(),
				{
					id: 'type',
					type: 'dropdown',
					label: 'Component',
					default: 1,
					choices: [
						{ id: 1, label: 'White (all)' },
						{ id: 2, label: 'Red' },
						{ id: 3, label: 'Green' },
						{ id: 4, label: 'Blue' },
					],
				},
				{ id: 'value', type: 'number', label: 'Value %', default: 100, min: 0, max: 100 },
			],
			callback: (e, ctx) =>
				self.run('Cabinet RGBW', async (api) =>
					api.cabinetRgbw(await cabinets(e, ctx), Number(e.options.type), Number(e.options.value) / 100),
				),
		},

		cabinet_colortemp: {
			name: 'Cabinet color temperature',
			options: [cabinetOpt(), { id: 'value', type: 'number', label: 'Kelvin', default: 6500, min: 1700, max: 15000 }],
			callback: (e, ctx) =>
				self.run('Cabinet color temp', async (api) =>
					api.cabinetColorTemperature(await cabinets(e, ctx), Number(e.options.value)),
				),
		},

		cabinet_no_signal: {
			name: 'Cabinet behaviour without data signal',
			options: [
				cabinetOpt(),
				{
					id: 'type',
					type: 'dropdown',
					label: 'Show',
					default: 0,
					choices: [
						{ id: 0, label: 'Black' },
						{ id: 1, label: 'Last frame' },
					],
				},
			],
			callback: (e, ctx) =>
				self.run('No data signal', async (api) => api.noDataSignal(await cabinets(e, ctx), Number(e.options.type))),
		},

		cabinet_thermal_onoff: {
			name: 'Cabinet thermal compensation on/off',
			options: [cabinetOpt(), onOffOpt()],
			callback: (e, ctx) =>
				self.run('Thermal compensation', async (api) =>
					api.thermalOnOff(await cabinets(e, ctx), resolveOnOff(e.options.state, false)),
				),
		},

		cabinet_thermal_amount: {
			name: 'Cabinet thermal compensation strength',
			options: [
				cabinetOpt(),
				{ id: 'value', type: 'number', label: 'Strength (0-255)', default: 128, min: 0, max: 255 },
			],
			callback: (e, ctx) =>
				self.run('Thermal strength', async (api) => api.thermalAmount(await cabinets(e, ctx), Number(e.options.value))),
		},

		cabinet_thermal_mode: {
			name: 'Cabinet thermal compensation mode',
			options: [
				cabinetOpt(),
				{
					id: 'mode',
					type: 'dropdown',
					label: 'Mode',
					default: 1,
					choices: [
						{ id: 0, label: 'Manual' },
						{ id: 1, label: 'Auto' },
					],
				},
			],
			callback: (e, ctx) =>
				self.run('Thermal mode', async (api) => api.thermalMode(await cabinets(e, ctx), Number(e.options.mode))),
		},

		cabinet_multimode: {
			name: 'Cabinet multi-mode',
			options: [
				cabinetOpt(),
				{
					id: 'mode',
					type: 'dropdown',
					label: 'Mode',
					default: state.multiModes(self)[0]?.id ?? 0,
					choices: state.multiModes(self),
					allowCustom: true,
				},
			],
			callback: (e, ctx) =>
				self.run('Cabinet multi-mode', async (api) =>
					api.cabinetMultiMode(await cabinets(e, ctx), Number(e.options.mode)),
				),
		},

		refresh: {
			name: 'Refresh all data now',
			options: [],
			callback: () => self.pollAll(true),
		},
	}
}
