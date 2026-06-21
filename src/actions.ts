import type ModuleInstance from './main.js'

type ToggleMode = 'on' | 'off' | 'toggle'

const TEST_PATTERN_MODE_CHOICES = [
	{ id: 0, label: 'Pure Color' },
	{ id: 16, label: 'Horizontal Stripes Down' },
	{ id: 17, label: 'Horizontal Stripes Right' },
	{ id: 18, label: 'Slashes' },
	{ id: 19, label: 'Backslashes' },
	{ id: 20, label: 'Grid Down Right' },
	{ id: 21, label: 'Grid Right' },
	{ id: 32, label: 'Red Gradient Left to Right' },
	{ id: 33, label: 'Green Gradient Left to Right' },
	{ id: 34, label: 'Blue Gradient Left to Right' },
	{ id: 35, label: 'Gray Gradient Left to Right' },
	{ id: 36, label: 'Red Gradient Top to Bottom' },
	{ id: 37, label: 'Green Gradient Top to Bottom' },
	{ id: 38, label: 'Blue Gradient Top to Bottom' },
	{ id: 39, label: 'Gray Gradient Top to Bottom' },
	{ id: 48, label: 'Lightning' },
]

function parseNumberOption(value: string, label: string, min: number, max: number): number {
	const parsed = Number(value)

	if (!Number.isFinite(parsed)) {
		throw new Error(`${label} must be a number`)
	}

	if (parsed < min || parsed > max) {
		throw new Error(`${label} must be between ${min} and ${max}`)
	}

	return parsed
}

function parseIntegerOption(value: string, label: string, min: number, max: number): number {
	const normalizedValue = normalizeOptionNumber(value)
	const parsed = parseNumberOption(normalizedValue, label, min, max)

	if (!Number.isInteger(parsed)) {
		throw new Error(`${label} must be an integer`)
	}

	return parsed
}

function normalizeOptionNumber(value: string): string {
	const trimmedValue = value.trim()
	const leadingNumber = trimmedValue.match(/^\d+/)
	return leadingNumber?.[0] || trimmedValue
}

function companionBrightnessToCoex(brightness: number): number {
	// COEX expects brightness as 0.0-1.0, while Companion exposes it as 0-100%.
	// The old 1 -> 1.1 workaround is not needed: 1% is sent as 0.01, while 100% is sent as 1.
	return brightness / 100
}

function clampNumber(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max)
}

function parseIntegerStringListOption(value: string, label: string): string[] {
	const values = value
		.split(',')
		.map((item) => normalizeOptionNumber(item.trim()))
		.filter(Boolean)

	if (values.length === 0 || values.some((item) => !/^\d+$/.test(item))) {
		throw new Error(`${label} must be a comma-separated list of integers`)
	}

	return values
}

function parseIntegerListOption(value: string, label: string): number[] {
	return parseIntegerStringListOption(value, label).map(Number)
}

async function setDisplayMode(self: ModuleInstance, screenId: string, mode: number): Promise<void> {
	if (self.usesLegacyDeviceApi()) {
		await self.coexRequest('PUT', '/api/v1/device/screen/displaymode', {
			value: mode,
		})
		await self.refreshDisplayParams()
		return
	}

	await self.coexRequest('PUT', '/api/v1/screen/output/displaymode', {
		screenIdList: [self.resolveScreenId(screenId)],
		value: mode,
	})
	await self.refreshDisplayParams()
}

function resolveDisplayToggleMode(self: ModuleInstance, targetMode: number, toggleMode: ToggleMode): number {
	if (toggleMode === 'on') return targetMode
	if (toggleMode === 'off') return 0

	return self.getDisplayMode() === targetMode ? 0 : targetMode
}

function resolveMappingToggleMode(self: ModuleInstance, toggleMode: ToggleMode): boolean {
	if (toggleMode === 'on') return true
	if (toggleMode === 'off') return false

	return self.getMappingEnabled() !== true
}

async function setBrightness(self: ModuleInstance, screenId: string, brightness: number): Promise<void> {
	await self.coexRequest('PUT', '/api/v1/screen/brightness', {
		screenIdList: [self.resolveScreenId(screenId)],
		brightness: companionBrightnessToCoex(brightness),
	})
	await self.refreshDisplayParams()
}

async function setGamma(self: ModuleInstance, screenId: string, gamma: number): Promise<void> {
	await self.coexRequest('PUT', '/api/v1/screen/gamma', {
		screenIdList: [self.resolveScreenId(screenId)],
		gamma,
	})
	await self.refreshDisplayParams()
}

async function setColorTemperature(self: ModuleInstance, screenId: string, colorTemperature: number): Promise<void> {
	await self.coexRequest('PUT', '/api/v1/screen/colortemperature', {
		screenIdList: [self.resolveScreenId(screenId)],
		colorTemperature,
	})
	await self.refreshDisplayParams()
}

export type ActionsSchema = {
	set_screen_brightness: {
		options: {
			screenId: string
			brightness: string
		}
	}
	adjust_screen_brightness: {
		options: {
			screenId: string
			step: number
		}
	}
	set_screen_gamma: {
		options: {
			screenId: string
			gamma: string
		}
	}
	adjust_screen_gamma: {
		options: {
			screenId: string
			step: number
		}
	}
	set_screen_color_temperature: {
		options: {
			screenId: string
			colorTemperature: string
		}
	}
	adjust_screen_color_temperature: {
		options: {
			screenId: string
			step: number
		}
	}
	set_display_mode: {
		options: {
			screenId: string
			mode: number
		}
	}
	set_screen_normal: {
		options: {
			screenId: string
		}
	}
	set_screen_blackout: {
		options: {
			screenId: string
			control: ToggleMode
		}
	}
	set_screen_freeze: {
		options: {
			screenId: string
			control: ToggleMode
		}
	}
	switch_layer_source: {
		options: {
			screenId: string
			layerId: string
			sourceId: string
		}
	}
	enable_cabinet_mapping: {
		options: {
			canvasIds: string
			control: ToggleMode
		}
	}
	apply_preset: {
		options: {
			screenId: string
			sequenceNumber: number
		}
	}
	device_identify: {
		options: {
			enable: boolean
		}
	}
	set_sending_card_test_pattern: {
		options: {
			mode: number
			red: number
			green: number
			blue: number
			gray: number
			gridWidth: number
			moveSpeed: number
			gradientStretch: number
			state: number
		}
	}
}

export function UpdateActions(self: ModuleInstance): void {
	self.setActionDefinitions({
		set_screen_brightness: {
			name: 'Set Screen Brightness',
			options: [
				{
					id: 'screenId',
					type: 'textinput',
					label: 'Screen ID',
					default: '1',
					useVariables: true,
				},
				{
					id: 'brightness',
					type: 'textinput',
					label: 'Brightness',
					default: '50',
					useVariables: true,
				},
			],
			callback: async (event) => {
				const brightness = parseNumberOption(event.options.brightness, 'Brightness', 0, 100)
				await setBrightness(self, event.options.screenId, brightness)
			},
		},
		adjust_screen_brightness: {
			name: 'Adjust Screen Brightness',
			options: [
				{
					id: 'screenId',
					type: 'textinput',
					label: 'Screen ID',
					default: '1',
					useVariables: true,
				},
				{
					id: 'step',
					type: 'number',
					label: 'Step',
					default: 1,
					min: -100,
					max: 100,
				},
			],
			callback: async (event) => {
				const current = self.getBrightness(event.options.screenId)
				if (current === undefined) throw new Error('Current brightness is unknown')
				await setBrightness(self, event.options.screenId, clampNumber(current + event.options.step, 0, 100))
			},
		},
		set_screen_gamma: {
			name: 'Set Screen Gamma',
			options: [
				{
					id: 'screenId',
					type: 'textinput',
					label: 'Screen ID',
					default: '1',
					useVariables: true,
				},
				{
					id: 'gamma',
					type: 'textinput',
					label: 'Gamma',
					default: '2.8',
					useVariables: true,
				},
			],
			callback: async (event) => {
				const gamma = parseNumberOption(event.options.gamma, 'Gamma', 0, 10)
				await setGamma(self, event.options.screenId, gamma)
			},
		},
		adjust_screen_gamma: {
			name: 'Adjust Screen Gamma',
			options: [
				{
					id: 'screenId',
					type: 'textinput',
					label: 'Screen ID',
					default: '1',
					useVariables: true,
				},
				{
					id: 'step',
					type: 'number',
					label: 'Step',
					default: 0.1,
					min: -10,
					max: 10,
				},
			],
			callback: async (event) => {
				const current = self.getGamma(event.options.screenId)
				if (current === undefined) throw new Error('Current gamma is unknown')
				await setGamma(self, event.options.screenId, clampNumber(current + event.options.step, 0, 10))
			},
		},
		set_screen_color_temperature: {
			name: 'Set Screen Color Temperature',
			options: [
				{
					id: 'screenId',
					type: 'textinput',
					label: 'Screen ID',
					default: '1',
					useVariables: true,
				},
				{
					id: 'colorTemperature',
					type: 'textinput',
					label: 'Color Temperature',
					default: '6500',
					useVariables: true,
				},
			],
			callback: async (event) => {
				const colorTemperature = parseNumberOption(event.options.colorTemperature, 'Color temperature', 1000, 20000)
				await setColorTemperature(self, event.options.screenId, colorTemperature)
			},
		},
		adjust_screen_color_temperature: {
			name: 'Adjust Screen Color Temperature',
			options: [
				{
					id: 'screenId',
					type: 'textinput',
					label: 'Screen ID',
					default: '1',
					useVariables: true,
				},
				{
					id: 'step',
					type: 'number',
					label: 'Step',
					default: 100,
					min: -20000,
					max: 20000,
				},
			],
			callback: async (event) => {
				const current = self.getColorTemperature(event.options.screenId)
				if (current === undefined) throw new Error('Current color temperature is unknown')
				await setColorTemperature(self, event.options.screenId, clampNumber(current + event.options.step, 1000, 20000))
			},
		},
		set_display_mode: {
			name: 'Set Screen Display Mode',
			options: [
				{
					id: 'screenId',
					type: 'textinput',
					label: 'Screen ID',
					default: '1',
					useVariables: true,
				},
				{
					id: 'mode',
					type: 'dropdown',
					label: 'Mode',
					default: 0,
					choices: [
						{ id: 0, label: 'Normal' },
						{ id: 1, label: 'Blackout' },
						{ id: 2, label: 'Freeze' },
					],
				},
			],
			callback: async (event) => {
				await setDisplayMode(self, event.options.screenId, event.options.mode)
			},
		},
		set_screen_normal: {
			name: 'Set Screen Normal',
			options: [
				{
					id: 'screenId',
					type: 'textinput',
					label: 'Screen ID',
					default: '1',
					useVariables: true,
				},
			],
			callback: async (event) => {
				await setDisplayMode(self, event.options.screenId, 0)
			},
		},
		set_screen_blackout: {
			name: 'Blackout Screen',
			options: [
				{
					id: 'screenId',
					type: 'textinput',
					label: 'Screen ID',
					default: '1',
					useVariables: true,
				},
				{
					id: 'control',
					type: 'dropdown',
					label: 'Control',
					default: 'toggle',
					choices: [
						{ id: 'on', label: 'On' },
						{ id: 'off', label: 'Off' },
						{ id: 'toggle', label: 'Toggle' },
					],
				},
			],
			callback: async (event) => {
				await setDisplayMode(self, event.options.screenId, resolveDisplayToggleMode(self, 1, event.options.control))
			},
		},
		set_screen_freeze: {
			name: 'Freeze Screen',
			options: [
				{
					id: 'screenId',
					type: 'textinput',
					label: 'Screen ID',
					default: '1',
					useVariables: true,
				},
				{
					id: 'control',
					type: 'dropdown',
					label: 'Control',
					default: 'toggle',
					choices: [
						{ id: 'on', label: 'On' },
						{ id: 'off', label: 'Off' },
						{ id: 'toggle', label: 'Toggle' },
					],
				},
			],
			callback: async (event) => {
				await setDisplayMode(self, event.options.screenId, resolveDisplayToggleMode(self, 2, event.options.control))
			},
		},
		switch_layer_source: {
			name: 'Switch Source for Layer',
			options: [
				{
					id: 'screenId',
					type: 'textinput',
					label: 'Screen ID',
					default: '1',
					useVariables: true,
				},
				{
					id: 'layerId',
					type: 'dropdown',
					label: 'Layer ID',
					default: self.getLayerChoices()[0]?.id || '0',
					choices: self.getLayerChoices(),
					allowCustom: true,
				},
				{
					id: 'sourceId',
					type: 'dropdown',
					label: 'Source',
					default: self.getInputGroupChoices()[0]?.id || '0',
					choices: self.getInputGroupChoices(),
					allowCustom: true,
				},
			],
			callback: async (event) => {
				const sourceId = parseIntegerOption(event.options.sourceId, 'Source ID', 0, Number.MAX_SAFE_INTEGER)
				if (self.usesLegacyDeviceApi()) {
					await self.coexRequest('PUT', '/api/v1/device/screen/input', {
						groupId: sourceId,
					})
					await self.refreshDisplayParams()
					return
				}

				// In Sender Only mode COEX still switches source through layer 1.
				const layerId =
					self.getScreenWorkingMode() === 0
						? 1
						: parseIntegerOption(event.options.layerId, 'Layer ID', 0, Number.MAX_SAFE_INTEGER)

				await self.coexRequest('PUT', '/api/v1/screen/layer/input', {
					screenID: self.resolveScreenId(event.options.screenId),
					layers: [
						{
							id: layerId,
							source: sourceId,
						},
					],
				})
				await self.refreshDisplayParams()
			},
		},
		enable_cabinet_mapping: {
			name: 'Enable Canvas Mapping',
			options: [
				{
					id: 'canvasIds',
					type: 'dropdown',
					label: 'Canvas IDs',
					default: self.getCanvasChoices()[0]?.id || '0',
					choices: self.getCanvasChoices(),
					allowCustom: true,
				},
				{
					id: 'control',
					type: 'dropdown',
					label: 'Control',
					default: 'toggle',
					choices: [
						{ id: 'on', label: 'On' },
						{ id: 'off', label: 'Off' },
						{ id: 'toggle', label: 'Toggle' },
					],
				},
			],
			callback: async (event) => {
				await self.coexRequest('PUT', '/api/v1/screen/output/canvas/mapping', {
					canvasIDs: parseIntegerListOption(event.options.canvasIds, 'Canvas IDs'),
					enable: resolveMappingToggleMode(self, event.options.control),
				})
				await self.refreshDisplayParams()
			},
		},
		apply_preset: {
			name: 'Apply Preset',
			options: [
				{
					id: 'screenId',
					type: 'textinput',
					label: 'Screen ID',
					default: '1',
					useVariables: true,
				},
				{
					id: 'sequenceNumber',
					type: 'number',
					label: 'Preset Number',
					default: 0,
					min: 0,
					max: 999,
					clampValues: true,
				},
			],
			callback: async (event) => {
				if (self.usesLegacyDeviceApi()) {
					await self.coexRequest('PUT', '/api/v1/device/currentpreset', {
						sequenceNumber: event.options.sequenceNumber,
					})
					await self.refreshDisplayParams()
					return
				}

				await self.coexRequest('POST', '/api/v1/preset/current/update', {
					screenID: self.resolveScreenId(event.options.screenId),
					sequenceNumber: event.options.sequenceNumber,
				})
				await self.refreshDisplayParams()
			},
		},
		device_identify: {
			name: 'Device Identify',
			options: [
				{
					id: 'enable',
					type: 'checkbox',
					label: 'Enable',
					default: true,
				},
			],
			callback: async (event) => {
				await self.coexRequest('PUT', '/api/v1/device/hw/mapping', {
					enable: event.options.enable,
				})
			},
		},
		set_sending_card_test_pattern: {
			name: 'Set Sending Card Test Pattern',
			options: [
				{
					id: 'mode',
					type: 'dropdown',
					label: 'Mode',
					default: 0,
					choices: TEST_PATTERN_MODE_CHOICES,
				},
				{
					id: 'red',
					type: 'number',
					label: 'Red',
					default: 0,
					min: 0,
					max: 4095,
					clampValues: true,
				},
				{
					id: 'green',
					type: 'number',
					label: 'Green',
					default: 0,
					min: 0,
					max: 4095,
					clampValues: true,
				},
				{
					id: 'blue',
					type: 'number',
					label: 'Blue',
					default: 0,
					min: 0,
					max: 4095,
					clampValues: true,
				},
				{
					id: 'gray',
					type: 'number',
					label: 'Gray',
					default: 0,
					min: 0,
					max: 4095,
					clampValues: true,
				},
				{
					id: 'gridWidth',
					type: 'number',
					label: 'Grid Width',
					default: 1,
					min: 0,
					max: 255,
					clampValues: true,
				},
				{
					id: 'moveSpeed',
					type: 'number',
					label: 'Move Speed',
					default: 50,
					min: 0,
					max: 100,
					clampValues: true,
				},
				{
					id: 'gradientStretch',
					type: 'number',
					label: 'Gradient Stretch',
					default: 8,
					min: 1,
					max: 20,
					clampValues: true,
				},
				{
					id: 'state',
					type: 'dropdown',
					label: 'State',
					default: 0,
					choices: [
						{ id: 0, label: 'Static' },
						{ id: 1, label: 'Moving' },
					],
				},
			],
			callback: async (event) => {
				await self.coexRequest(
					'PUT',
					self.usesLegacyDeviceApi()
						? '/api/v1/device/screen/controller/pattern/test'
						: '/api/v1/device/input/pattern/test',
					{
						mode: event.options.mode,
						parameters: {
							// NovaStar examples use 12-bit channel values for full intensity.
							red: event.options.red,
							green: event.options.green,
							blue: event.options.blue,
							gray: event.options.gray,
							gridWidth: event.options.gridWidth,
							moveSpeed: event.options.moveSpeed,
							gradientStretch: event.options.gradientStretch,
							state: event.options.state,
						},
					},
				)
			},
		},
	})
}
