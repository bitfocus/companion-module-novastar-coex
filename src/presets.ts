import type {
	CompanionButtonStepActions,
	CompanionPresetDefinitions,
	CompanionPresetSection,
} from '@companion-module/base'
import { deflateSync } from 'node:zlib'
import type { ModuleSchema } from './main.js'
import type ModuleInstance from './main.js'

const SCREEN_ID = '1'
const WHITE = 0xffffff
const BLACK = 0x000000
const RED = 0xff0000
const BLUE = 0x0066ff
const GREEN = 0x00aa44
const AMBER = 0xffaa00
const DARK_GRAY = 0x30343b
const FONT_SIZE = 11
const PATTERN_IMAGE_SIZE = 72

const CRC_TABLE = Array.from({ length: 256 }, (_unused, index) => {
	let crc = index
	for (let bit = 0; bit < 8; bit++) {
		crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1
	}
	return crc >>> 0
})

function crc32(buffer: Buffer): number {
	let crc = 0xffffffff
	for (const byte of buffer) {
		crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
	}
	return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type: string, data: Buffer): Buffer {
	const typeBuffer = Buffer.from(type, 'ascii')
	const lengthBuffer = Buffer.alloc(4)
	lengthBuffer.writeUInt32BE(data.length, 0)
	const crcBuffer = Buffer.alloc(4)
	crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0)
	return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer])
}

function createPng64(
	width: number,
	height: number,
	pixel: (x: number, y: number) => [number, number, number, number],
): string {
	// Generate tiny PNG previews for Companion presets without shipping image assets.
	const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
	const ihdr = Buffer.alloc(13)
	ihdr.writeUInt32BE(width, 0)
	ihdr.writeUInt32BE(height, 4)
	ihdr[8] = 8
	ihdr[9] = 6

	const raw = Buffer.alloc((width * 4 + 1) * height)
	for (let y = 0; y < height; y++) {
		const rowOffset = y * (width * 4 + 1)
		raw[rowOffset] = 0
		for (let x = 0; x < width; x++) {
			const [red, green, blue, alpha] = pixel(x, y)
			const offset = rowOffset + 1 + x * 4
			raw[offset] = red
			raw[offset + 1] = green
			raw[offset + 2] = blue
			raw[offset + 3] = alpha
		}
	}

	return Buffer.concat([
		header,
		pngChunk('IHDR', ihdr),
		pngChunk('IDAT', deflateSync(raw)),
		pngChunk('IEND', Buffer.alloc(0)),
	]).toString('base64')
}

function solidPatternPng64(red: number, green: number, blue: number): string {
	return createPng64(PATTERN_IMAGE_SIZE, PATTERN_IMAGE_SIZE, () => [red, green, blue, 255])
}

function slashPatternPng64(): string {
	return createPng64(PATTERN_IMAGE_SIZE, PATTERN_IMAGE_SIZE, (x, y) => {
		const stripe = (x + y) % 24 < 8
		const value = stripe ? 245 : 0
		return [value, value, value, 255]
	})
}

function grayGradientPatternPng64(): string {
	return createPng64(PATTERN_IMAGE_SIZE, PATTERN_IMAGE_SIZE, (x) => {
		const value = Math.round((x / (PATTERN_IMAGE_SIZE - 1)) * 255)
		return [value, value, value, 255]
	})
}

const TEST_PATTERN_IMAGES = {
	white: solidPatternPng64(255, 255, 255),
	red: solidPatternPng64(255, 0, 0),
	green: solidPatternPng64(0, 255, 0),
	blue: solidPatternPng64(0, 102, 255),
	slash: slashPatternPng64(),
	grayGradient: grayGradientPatternPng64(),
}

function displayModeStep(mode: number): CompanionButtonStepActions<ModuleSchema> {
	return {
		down: [
			{
				actionId: 'set_display_mode',
				options: {
					screenId: SCREEN_ID,
					mode,
				},
			},
		],
		up: [],
	}
}

function displayToggleStep(
	actionId: 'set_screen_blackout' | 'set_screen_freeze',
): CompanionButtonStepActions<ModuleSchema> {
	return {
		down: [
			{
				actionId,
				options: {
					screenId: SCREEN_ID,
					control: 'toggle',
				},
			},
		],
		up: [],
	}
}

function rotaryStep(
	actionId: 'adjust_screen_brightness' | 'adjust_screen_gamma' | 'adjust_screen_color_temperature',
	step: number,
) {
	return {
		down: [],
		up: [],
		rotate_left: [
			{
				actionId,
				options: {
					screenId: SCREEN_ID,
					step: -step,
				},
			},
		],
		rotate_right: [
			{
				actionId,
				options: {
					screenId: SCREEN_ID,
					step,
				},
			},
		],
	}
}

function adjustmentStep(
	actionId: 'adjust_screen_brightness' | 'adjust_screen_gamma' | 'adjust_screen_color_temperature',
	step: number,
): CompanionButtonStepActions<ModuleSchema> {
	return {
		down: [
			{
				actionId,
				options: {
					screenId: SCREEN_ID,
					step,
				},
			},
		],
		up: [],
	}
}

function applyPresetStep(sequenceNumber: number): CompanionButtonStepActions<ModuleSchema> {
	return {
		down: [
			{
				actionId: 'apply_preset',
				options: {
					screenId: SCREEN_ID,
					sequenceNumber,
				},
			},
		],
		up: [],
	}
}

function cabinetMappingToggleStep(canvasIds: string): CompanionButtonStepActions<ModuleSchema> {
	return {
		down: [
			{
				actionId: 'enable_cabinet_mapping',
				options: {
					canvasIds,
					control: 'toggle',
				},
			},
		],
		up: [],
	}
}

function sourceLayerStep(layerId: string, sourceId: string): CompanionButtonStepActions<ModuleSchema> {
	return {
		down: [
			{
				actionId: 'switch_layer_source',
				options: {
					screenId: SCREEN_ID,
					layerId,
					sourceId,
				},
			},
		],
		up: [],
	}
}

function testPatternStep(
	mode: number,
	parameters: {
		red?: number
		green?: number
		blue?: number
		gray?: number
		gridWidth?: number
		moveSpeed?: number
		gradientStretch?: number
		state?: number
	},
): CompanionButtonStepActions<ModuleSchema> {
	// Test pattern presets keep every action parameter explicit so users can edit from a preset.
	return {
		down: [
			{
				actionId: 'set_sending_card_test_pattern',
				options: {
					mode,
					red: parameters.red ?? 0,
					green: parameters.green ?? 0,
					blue: parameters.blue ?? 0,
					gray: parameters.gray ?? 0,
					gridWidth: parameters.gridWidth ?? 1,
					moveSpeed: parameters.moveSpeed ?? 50,
					gradientStretch: parameters.gradientStretch ?? 8,
					state: parameters.state ?? 0,
				},
			},
		],
		up: [],
	}
}

function infoPreset(name: string, text: string): CompanionPresetDefinitions<ModuleSchema>[string] {
	return {
		type: 'simple',
		name,
		style: {
			text,
			size: FONT_SIZE,
			color: WHITE,
			bgcolor: DARK_GRAY,
			show_topbar: false,
		},
		steps: [],
		feedbacks: [],
	}
}

export function UpdatePresets(self: ModuleInstance): void {
	const structure: CompanionPresetSection[] = [
		{
			id: 'sources',
			name: 'Sources',
			definitions: [
				{
					id: 'layer_1_sources',
					name: 'Layer 1 Sources',
					type: 'simple',
					presets: ['layer_1_sdi_1', 'layer_1_hdmi_1', 'layer_1_internal'],
				},
				{
					id: 'layer_2_sources',
					name: 'Layer 2 Sources',
					type: 'simple',
					presets: ['layer_2_sdi_1', 'layer_2_hdmi_1', 'layer_2_internal'],
				},
				{
					id: 'layer_3_sources',
					name: 'Layer 3 Sources',
					type: 'simple',
					presets: ['layer_3_sdi_1', 'layer_3_hdmi_1', 'layer_3_internal'],
				},
				{
					id: 'sender_only_layer_sources',
					name: 'Sender Only Layer 1 Sources',
					type: 'simple',
					presets: ['sender_only_layer_sdi_1', 'sender_only_layer_hdmi_1', 'sender_only_layer_internal'],
				},
			],
		},
		{
			id: 'test_patterns',
			name: 'Test Patterns',
			definitions: [
				{
					id: 'internal_source_test_patterns',
					name: 'Internal Source / Sending Card Test Patterns',
					type: 'simple',
					presets: [
						'test_pattern_white',
						'test_pattern_red',
						'test_pattern_green',
						'test_pattern_blue',
						'test_pattern_slash',
						'test_pattern_gray_gradient_lr',
					],
				},
			],
		},
		{
			id: 'display',
			name: 'Display',
			definitions: [
				{
					id: 'display_modes',
					name: 'Display Modes',
					type: 'simple',
					presets: ['blackout_toggle', 'freeze_toggle', 'normal', 'cabinet_mapping_toggle'],
				},
			],
		},
		{
			id: 'image_adjustments',
			name: 'Image Adjustments',
			definitions: [
				{
					id: 'rotary_controls',
					name: 'Rotary Controls',
					type: 'simple',
					presets: ['brightness_rotary', 'gamma_rotary', 'color_temperature_rotary'],
				},
				{
					id: 'step_buttons',
					name: 'Step Buttons',
					type: 'simple',
					presets: [
						'brightness_value',
						'brightness_down',
						'brightness_up',
						'gamma_value',
						'gamma_down',
						'gamma_up',
						'color_temperature_value',
						'color_temperature_down',
						'color_temperature_up',
					],
				},
			],
		},
		{
			id: 'presets',
			name: 'Presets',
			definitions: [
				{
					id: 'preset_buttons',
					name: 'Preset Buttons',
					type: 'simple',
					presets: Array.from({ length: 10 }, (_unused, index) => `preset_${index + 1}`),
				},
			],
		},
		{
			id: 'information',
			name: 'Information',
			definitions: [
				{
					id: 'device_information',
					name: 'Device Information',
					type: 'simple',
					presets: [
						'info_screen_name',
						'info_cabinet_count',
						'info_device_custom_name',
						'info_device_versions',
						'info_device_ip',
						'info_device_mac',
						'info_main_board_temperature',
					],
				},
			],
		},
	]

	const presets: CompanionPresetDefinitions<ModuleSchema> = {
		blackout_toggle: {
			type: 'simple',
			name: 'Blackout Toggle',
			style: {
				text: 'BLACKOUT',
				size: FONT_SIZE,
				color: WHITE,
				bgcolor: BLACK,
				show_topbar: false,
			},
			options: {
				stepAutoProgress: false,
			},
			steps: [displayToggleStep('set_screen_blackout')],
			feedbacks: [
				{
					feedbackId: 'display_mode_is',
					options: { mode: 1 },
					style: { bgcolor: RED, color: WHITE },
				},
			],
		},
		freeze_toggle: {
			type: 'simple',
			name: 'Freeze Toggle',
			style: {
				text: 'FREEZE',
				size: FONT_SIZE,
				color: WHITE,
				bgcolor: BLACK,
				show_topbar: false,
			},
			options: {
				stepAutoProgress: false,
			},
			steps: [displayToggleStep('set_screen_freeze')],
			feedbacks: [
				{
					feedbackId: 'display_mode_is',
					options: { mode: 2 },
					style: { bgcolor: RED, color: WHITE },
				},
			],
		},
		normal: {
			type: 'simple',
			name: 'Normal',
			style: {
				text: 'NORMAL',
				size: FONT_SIZE,
				color: WHITE,
				bgcolor: GREEN,
				show_topbar: false,
			},
			steps: [displayModeStep(0)],
			feedbacks: [
				{
					feedbackId: 'display_mode_is',
					options: { mode: 0 },
					style: { bgcolor: GREEN, color: WHITE },
				},
			],
		},
		cabinet_mapping_toggle: {
			type: 'simple',
			name: 'Cabinet Mapping Toggle',
			style: {
				text: 'CABINET\\nMAPPING',
				size: FONT_SIZE,
				color: WHITE,
				bgcolor: DARK_GRAY,
				show_topbar: false,
			},
			options: {
				stepAutoProgress: false,
			},
			steps: [cabinetMappingToggleStep(self.getAllCanvasIds())],
			feedbacks: [
				{
					feedbackId: 'mapping_is_enabled',
					options: {},
					style: { bgcolor: AMBER, color: BLACK },
				},
			],
		},
		test_pattern_white: {
			type: 'simple',
			name: 'Test Pattern White',
			style: {
				text: '',
				size: FONT_SIZE,
				color: BLACK,
				bgcolor: WHITE,
				png64: TEST_PATTERN_IMAGES.white,
				pngalignment: 'center:center',
				show_topbar: false,
			},
			steps: [testPatternStep(0, { red: 4095, green: 4095, blue: 4095, gray: 4095 })],
			feedbacks: [],
		},
		test_pattern_red: {
			type: 'simple',
			name: 'Test Pattern Red',
			style: {
				text: '',
				size: FONT_SIZE,
				color: WHITE,
				bgcolor: RED,
				png64: TEST_PATTERN_IMAGES.red,
				pngalignment: 'center:center',
				show_topbar: false,
			},
			steps: [testPatternStep(0, { red: 4095, gray: 4095 })],
			feedbacks: [],
		},
		test_pattern_green: {
			type: 'simple',
			name: 'Test Pattern Green',
			style: {
				text: '',
				size: FONT_SIZE,
				color: BLACK,
				bgcolor: GREEN,
				png64: TEST_PATTERN_IMAGES.green,
				pngalignment: 'center:center',
				show_topbar: false,
			},
			steps: [testPatternStep(0, { green: 4095, gray: 4095 })],
			feedbacks: [],
		},
		test_pattern_blue: {
			type: 'simple',
			name: 'Test Pattern Blue',
			style: {
				text: '',
				size: FONT_SIZE,
				color: WHITE,
				bgcolor: BLUE,
				png64: TEST_PATTERN_IMAGES.blue,
				pngalignment: 'center:center',
				show_topbar: false,
			},
			steps: [testPatternStep(0, { blue: 4095, gray: 4095 })],
			feedbacks: [],
		},
		test_pattern_slash: {
			type: 'simple',
			name: 'Test Pattern Slashes',
			style: {
				text: '',
				size: 18,
				color: WHITE,
				bgcolor: BLACK,
				png64: TEST_PATTERN_IMAGES.slash,
				pngalignment: 'center:center',
				show_topbar: false,
			},
			steps: [
				testPatternStep(18, { red: 4095, green: 4095, blue: 4095, gray: 4095, gridWidth: 8, moveSpeed: 50, state: 1 }),
			],
			feedbacks: [],
		},
		test_pattern_gray_gradient_lr: {
			type: 'simple',
			name: 'Test Pattern Gray Gradient Left to Right',
			style: {
				text: '',
				size: FONT_SIZE,
				color: WHITE,
				bgcolor: DARK_GRAY,
				png64: TEST_PATTERN_IMAGES.grayGradient,
				pngalignment: 'center:center',
				show_topbar: false,
			},
			steps: [testPatternStep(35, { gray: 4095, gradientStretch: 8 })],
			feedbacks: [],
		},
		brightness_rotary: {
			type: 'simple',
			name: 'Brightness Rotary +/- 1',
			style: {
				text: 'BRIGHTNESS\\n$(COEX:brightness)%',
				size: FONT_SIZE,
				color: WHITE,
				bgcolor: BLACK,
				show_topbar: false,
			},
			steps: [rotaryStep('adjust_screen_brightness', 1)],
			feedbacks: [],
		},
		gamma_rotary: {
			type: 'simple',
			name: 'Gamma Rotary +/- 0.1',
			style: {
				text: 'GAMMA\\n$(COEX:gamma)',
				size: FONT_SIZE,
				color: WHITE,
				bgcolor: BLUE,
				show_topbar: false,
			},
			steps: [rotaryStep('adjust_screen_gamma', 0.1)],
			feedbacks: [],
		},
		color_temperature_rotary: {
			type: 'simple',
			name: 'Color Temperature Rotary +/- 100',
			style: {
				text: 'TEMP\\n$(COEX:color_temperature)K',
				size: FONT_SIZE,
				color: BLACK,
				bgcolor: AMBER,
				show_topbar: false,
			},
			steps: [rotaryStep('adjust_screen_color_temperature', 100)],
			feedbacks: [],
		},
		brightness_down: {
			type: 'simple',
			name: 'Brightness -1',
			style: {
				text: 'BRIGHTNESS\\n-1',
				size: FONT_SIZE,
				color: WHITE,
				bgcolor: BLACK,
				show_topbar: false,
			},
			steps: [adjustmentStep('adjust_screen_brightness', -1)],
			feedbacks: [],
		},
		brightness_value: {
			type: 'simple',
			name: 'Brightness Value',
			style: {
				text: '$(COEX:brightness)%',
				size: FONT_SIZE,
				color: WHITE,
				bgcolor: BLACK,
				show_topbar: false,
			},
			steps: [],
			feedbacks: [],
		},
		brightness_up: {
			type: 'simple',
			name: 'Brightness +1',
			style: {
				text: 'BRIGHTNESS\\n+1',
				size: FONT_SIZE,
				color: WHITE,
				bgcolor: BLACK,
				show_topbar: false,
			},
			steps: [adjustmentStep('adjust_screen_brightness', 1)],
			feedbacks: [],
		},
		gamma_down: {
			type: 'simple',
			name: 'Gamma -0.05',
			style: {
				text: 'GAMMA\\n-0.05',
				size: FONT_SIZE,
				color: WHITE,
				bgcolor: BLUE,
				show_topbar: false,
			},
			steps: [adjustmentStep('adjust_screen_gamma', -0.05)],
			feedbacks: [],
		},
		gamma_value: {
			type: 'simple',
			name: 'Gamma Value',
			style: {
				text: '$(COEX:gamma)',
				size: FONT_SIZE,
				color: WHITE,
				bgcolor: BLUE,
				show_topbar: false,
			},
			steps: [],
			feedbacks: [],
		},
		gamma_up: {
			type: 'simple',
			name: 'Gamma +0.05',
			style: {
				text: 'GAMMA\\n+0.05',
				size: FONT_SIZE,
				color: WHITE,
				bgcolor: BLUE,
				show_topbar: false,
			},
			steps: [adjustmentStep('adjust_screen_gamma', 0.05)],
			feedbacks: [],
		},
		color_temperature_down: {
			type: 'simple',
			name: 'Color Temperature -100',
			style: {
				text: 'COLOR TEMP\\n-100',
				size: FONT_SIZE,
				color: BLACK,
				bgcolor: AMBER,
				show_topbar: false,
			},
			steps: [adjustmentStep('adjust_screen_color_temperature', -100)],
			feedbacks: [],
		},
		color_temperature_value: {
			type: 'simple',
			name: 'Color Temperature Value',
			style: {
				text: '$(COEX:color_temperature)K',
				size: FONT_SIZE,
				color: BLACK,
				bgcolor: AMBER,
				show_topbar: false,
			},
			steps: [],
			feedbacks: [],
		},
		color_temperature_up: {
			type: 'simple',
			name: 'Color Temperature +100',
			style: {
				text: 'COLOR TEMP\\n+100',
				size: FONT_SIZE,
				color: BLACK,
				bgcolor: AMBER,
				show_topbar: false,
			},
			steps: [adjustmentStep('adjust_screen_color_temperature', 100)],
			feedbacks: [],
		},
		info_screen_name: infoPreset('Screen Name', 'SCREEN :\\n$(COEX:screen_name)'),
		info_cabinet_count: infoPreset('Cabinet Count', 'PANELS :\\n$(COEX:cabinet_count)'),
		info_device_custom_name: infoPreset('Device Custom Name', 'DEVICE :\\n$(COEX:device_custom_name)'),
		info_device_versions: infoPreset(
			'Device Hardware/Software Versions',
			'HW : $(COEX:device_hw_version)\\nSW : $(COEX:device_sw_version)',
		),
		info_device_ip: infoPreset('Device IP', 'IP\\n$(COEX:device_ip)'),
		info_device_mac: infoPreset('Device MAC', 'MAC\\n$(COEX:device_mac)'),
		info_main_board_temperature: infoPreset('Main Board Temperature', 'MAIN TEMP :\\n$(COEX:main_board_temperature)°C'),
	}

	const sourcePresets = [
		{
			id: 'sdi_1',
			label: 'SDI 1',
			name: self.getNamedInputPreset('sdi1').name,
			groupId: self.getNamedInputPreset('sdi1').id,
			color: 0x7a3cff,
			textColor: WHITE,
		},
		{
			id: 'hdmi_1',
			label: 'HDMI 1',
			name: self.getNamedInputPreset('hdmi1').name,
			groupId: self.getNamedInputPreset('hdmi1').id,
			color: 0x0f7cff,
			textColor: WHITE,
		},
		{
			id: 'internal',
			label: 'Internal',
			name: self.getNamedInputPreset('internal').name,
			groupId: self.getNamedInputPreset('internal').id,
			color: 0x20c46b,
			textColor: BLACK,
		},
	]

	for (let layerNumber = 1; layerNumber <= 3; layerNumber++) {
		for (const source of sourcePresets) {
			presets[`layer_${layerNumber}_${source.id}`] = {
				type: 'simple',
				name: `Layer ${layerNumber} ${source.label}`,
				style: {
					text: `L${layerNumber}\\n${source.name}`,
					size: FONT_SIZE,
					color: source.textColor,
					bgcolor: source.color,
					show_topbar: false,
				},
				steps: [sourceLayerStep(self.getLayerPresetId(layerNumber as 1 | 2 | 3), source.groupId)],
				feedbacks: [
					{
						feedbackId: 'layer_source_is',
						options: {
							layerId: self.getLayerPresetId(layerNumber as 1 | 2 | 3),
							sourceId: source.groupId,
						},
						style: {
							bgcolor: WHITE,
							color: BLACK,
						},
					},
				],
			}
		}
	}

	for (const source of sourcePresets) {
		presets[`sender_only_layer_${source.id}`] = {
			type: 'simple',
			name: `Sender Only Layer ${source.label}`,
			style: {
				text: `SL1\\n${source.name}`,
				size: FONT_SIZE,
				color: source.textColor,
				bgcolor: source.color,
				show_topbar: false,
			},
			steps: [sourceLayerStep(self.getSenderOnlyLayerPresetId(), source.groupId)],
			feedbacks: [
				{
					feedbackId: 'layer_source_is',
					options: {
						layerId: self.getSenderOnlyLayerPresetId(),
						sourceId: source.groupId,
					},
					style: {
						bgcolor: WHITE,
						color: BLACK,
					},
				},
			],
		}
	}

	for (let sequenceNumber = 1; sequenceNumber <= 10; sequenceNumber++) {
		presets[`preset_${sequenceNumber}`] = {
			type: 'simple',
			name: `Preset ${sequenceNumber}`,
			style: {
				text: `$(COEX:preset_${sequenceNumber}_name)`,
				size: FONT_SIZE,
				color: WHITE,
				bgcolor: BLACK,
				show_topbar: false,
			},
			steps: [applyPresetStep(sequenceNumber)],
			feedbacks: [
				{
					feedbackId: 'preset_is_active',
					options: {
						screenId: SCREEN_ID,
						sequenceNumber,
					},
					style: {
						bgcolor: BLUE,
						color: WHITE,
					},
				},
			],
		}
	}

	self.setPresetDefinitions(structure, presets)
}
