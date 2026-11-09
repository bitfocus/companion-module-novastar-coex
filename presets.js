const { combineRgb } = require('@companion-module/base')

const WHITE = combineRgb(255, 255, 255)
const BLACK = combineRgb(0, 0, 0)
const GREY = combineRgb(40, 40, 40)

module.exports = function (self) {
	const presets = {}

	presets['toggle_blackout'] = {
		type: 'button',
		category: 'Display',
		name: 'Blackout toggle (red when active)',
		style: { text: 'BLACK\\nOUT', size: '18', color: WHITE, bgcolor: GREY },
		steps: [{ down: [{ actionId: 'toggle_blackout', options: {} }], up: [] }],
		feedbacks: [
			{
				feedbackId: 'display_mode',
				options: { mode: 'Blackout', canvas: -1 },
				style: { bgcolor: combineRgb(200, 0, 0), color: WHITE },
			},
		],
	}

	presets['toggle_freeze'] = {
		type: 'button',
		category: 'Display',
		name: 'Freeze toggle (blue when active)',
		style: { text: 'FREEZE', size: '18', color: WHITE, bgcolor: GREY },
		steps: [{ down: [{ actionId: 'toggle_freeze', options: {} }], up: [] }],
		feedbacks: [
			{
				feedbackId: 'display_mode',
				options: { mode: 'Freeze', canvas: -1 },
				style: { bgcolor: combineRgb(0, 90, 220), color: WHITE },
			},
		],
	}

	presets['display_status'] = {
		type: 'button',
		category: 'Status',
		name: 'Display state + brightness',
		style: {
			text: `$(${self.label}:display_state)\\n$(${self.label}:screen_0_brightness)`,
			size: '14',
			color: WHITE,
			bgcolor: combineRgb(0, 120, 0),
		},
		steps: [],
		feedbacks: [
			{
				feedbackId: 'display_mode',
				options: { mode: 'Blackout', canvas: -1 },
				style: { bgcolor: combineRgb(200, 0, 0) },
			},
			{
				feedbackId: 'display_mode',
				options: { mode: 'Freeze', canvas: -1 },
				style: { bgcolor: combineRgb(0, 90, 220) },
			},
		],
	}

	presets['device_health'] = {
		type: 'button',
		category: 'Status',
		name: 'Controller health / temperature',
		style: {
			text: `$(${self.label}:device_health)\\n$(${self.label}:mainboard_temp)°C`,
			size: '14',
			color: WHITE,
			bgcolor: combineRgb(0, 120, 0),
		},
		steps: [],
		feedbacks: [
			{ feedbackId: 'device_health', options: { level: 1 }, style: { bgcolor: combineRgb(230, 120, 0), color: BLACK } },
			{ feedbackId: 'device_health', options: { level: 2 }, style: { bgcolor: combineRgb(200, 0, 0), color: WHITE } },
		],
	}

	presets['cabinet_status'] = {
		type: 'button',
		category: 'Status',
		name: 'Cabinets: errors / highest temperature',
		style: {
			text: `CAB $(${self.label}:cabinet_errors)/$(${self.label}:cabinet_count)\\n$(${self.label}:cabinet_max_temp)°C`,
			size: '14',
			color: WHITE,
			bgcolor: combineRgb(0, 120, 0),
		},
		steps: [],
		feedbacks: [
			{
				feedbackId: 'cabinet_error',
				options: { what: 'any' },
				style: { bgcolor: combineRgb(230, 120, 0), color: BLACK },
			},
			{
				feedbackId: 'cabinet_error',
				options: { what: 'fault' },
				style: { bgcolor: combineRgb(200, 0, 0), color: WHITE },
			},
			{
				feedbackId: 'cabinet_error',
				options: { what: 'link' },
				style: { bgcolor: combineRgb(200, 0, 0), color: WHITE },
			},
		],
	}

	presets['connection'] = {
		type: 'button',
		category: 'Status',
		name: 'Controller connection',
		style: { text: `$(${self.label}:device_name)\\nOFFLINE`, size: '14', color: WHITE, bgcolor: combineRgb(200, 0, 0) },
		steps: [{ down: [{ actionId: 'refresh', options: {} }], up: [] }],
		feedbacks: [
			{
				feedbackId: 'connected',
				options: {},
				style: { text: `$(${self.label}:device_name)\\nONLINE`, bgcolor: combineRgb(0, 120, 0), color: WHITE },
			},
		],
	}

	presets['brightness_up'] = {
		type: 'button',
		category: 'Display',
		name: 'Brightness +5 %',
		style: { text: `BRT +\\n$(${self.label}:screen_0_brightness)`, size: '14', color: WHITE, bgcolor: GREY },
		steps: [{ down: [{ actionId: 'brightness_step', options: { screen: 'all', step: 5 } }], up: [] }],
		feedbacks: [],
	}

	presets['brightness_down'] = {
		type: 'button',
		category: 'Display',
		name: 'Brightness -5 %',
		style: { text: `BRT -\\n$(${self.label}:screen_0_brightness)`, size: '14', color: WHITE, bgcolor: GREY },
		steps: [{ down: [{ actionId: 'brightness_step', options: { screen: 'all', step: -5 } }], up: [] }],
		feedbacks: [],
	}

	presets['identify'] = {
		type: 'button',
		category: 'Display',
		name: 'Cabinet mapping on/off (hold)',
		style: { text: 'CAB\\nMAP', size: '18', color: WHITE, bgcolor: GREY },
		steps: [
			{
				down: [{ actionId: 'cabinet_mapping', options: { cabinets: '', state: 'on' } }],
				up: [{ actionId: 'cabinet_mapping', options: { cabinets: '', state: 'off' } }],
			},
		],
		feedbacks: [],
	}

	// Layer inputs (All-in-One mode): one button per input for the first layer of each screen
	;(self.layerChoices ? self.layerChoices() : [])
		.filter((l, i, all) => all.findIndex((x) => x.id.split('|')[0] === l.id.split('|')[0]) === i)
		.forEach((layer, li) => {
			;(self.inputs || []).forEach((input, i) => {
				if (!input.name) return
				presets[`layer_${li}_input_${i}`] = {
					type: 'button',
					category: `Layer inputs: ${layer.label}`,
					name: `${layer.label}: ${input.name}`,
					style: { text: input.name, size: '14', color: WHITE, bgcolor: GREY },
					steps: [
						{
							down: [{ actionId: 'layer_source', options: { layer: layer.id, source: String(input.groupId) } }],
							up: [],
						},
					],
					feedbacks: [
						{
							feedbackId: 'layer_input',
							options: { input: input.name, layer: layer.id },
							style: { bgcolor: combineRgb(0, 140, 0), color: WHITE },
						},
						{
							feedbackId: 'input_signal',
							options: { input: input.name },
							isInverted: true,
							style: { color: combineRgb(255, 80, 80) },
						},
					],
				}
			})
		})

	// One button per input: switches to it, green with signal, red without
	;(self.inputs || []).forEach((input, i) => {
		if (!input.name) return
		presets[`input_${i}`] = {
			type: 'button',
			category: 'Inputs (Send-Only mode)',
			name: `Input ${input.name}`,
			style: {
				text: `${input.name}\\n$(${self.label}:input_${i}_resolution)`,
				size: '14',
				color: WHITE,
				bgcolor: combineRgb(150, 0, 0),
			},
			steps: [{ down: [{ actionId: 'source', options: { num: input.name } }], up: [] }],
			feedbacks: [
				{
					feedbackId: 'input_signal',
					options: { input: input.name },
					style: { bgcolor: combineRgb(0, 140, 0), color: WHITE },
				},
			],
		}
	})

	// One button per preset: recalls it, blue while active
	;(self.presetlist || []).forEach((p, i) => {
		presets[`preset_${i}`] = {
			type: 'button',
			category: 'Presets',
			name: `Preset ${p.label}`,
			style: { text: p.label, size: '14', color: WHITE, bgcolor: GREY },
			steps: [{ down: [{ actionId: 'preset', options: { preset: p.id } }], up: [] }],
			feedbacks: [
				{
					feedbackId: 'preset_active',
					options: { preset: p.id },
					style: { bgcolor: combineRgb(0, 90, 200), color: WHITE },
				},
			],
		}
	})

	self.setPresetDefinitions(presets)
}
