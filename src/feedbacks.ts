import type ModuleInstance from './main.js'

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

export type FeedbacksSchema = {
	brightness_matches: {
		type: 'boolean'
		options: {
			screenId: string
			brightness: string
			tolerance: number
		}
	}
	display_mode_is: {
		type: 'boolean'
		options: {
			mode: number
		}
	}
	preset_is_active: {
		type: 'boolean'
		options: {
			screenId: string
			sequenceNumber: number
		}
	}
	mapping_is_enabled: {
		type: 'boolean'
		options: Record<string, never>
	}
	layer_source_is: {
		type: 'boolean'
		options: {
			layerId: string
			sourceId: string
		}
	}
}

export function UpdateFeedbacks(self: ModuleInstance): void {
	self.setFeedbackDefinitions({
		brightness_matches: {
			name: 'Brightness Matches Value',
			type: 'boolean',
			defaultStyle: {
				bgcolor: 0x00ff00,
				color: 0x000000,
			},
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
				{
					id: 'tolerance',
					type: 'number',
					label: 'Tolerance',
					default: 0,
					min: 0,
					max: 10,
					clampValues: true,
				},
			],
			callback: (feedback) => {
				const currentBrightness = self.getBrightness(feedback.options.screenId)

				if (currentBrightness === undefined) {
					return false
				}

				const expectedBrightness = parseNumberOption(feedback.options.brightness, 'Brightness', 0, 100)
				return Math.abs(currentBrightness - expectedBrightness) <= feedback.options.tolerance
			},
		},
		display_mode_is: {
			name: 'Display Mode Is',
			type: 'boolean',
			defaultStyle: {
				bgcolor: 0xff0000,
				color: 0xffffff,
			},
			options: [
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
			callback: (feedback) => {
				return self.getDisplayMode() === feedback.options.mode
			},
		},
		preset_is_active: {
			name: 'Preset Is Active',
			type: 'boolean',
			defaultStyle: {
				bgcolor: 0x0066ff,
				color: 0xffffff,
			},
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
			callback: (feedback) => {
				return self.isPresetActive(feedback.options.screenId, feedback.options.sequenceNumber)
			},
		},
		mapping_is_enabled: {
			name: 'Cabinet Mapping Is Enabled',
			type: 'boolean',
			defaultStyle: {
				bgcolor: 0xffaa00,
				color: 0x000000,
			},
			options: [],
			callback: () => {
				return self.getMappingEnabled() === true
			},
		},
		layer_source_is: {
			name: 'Layer Source Is',
			type: 'boolean',
			defaultStyle: {
				bgcolor: 0x00aa44,
				color: 0x000000,
			},
			options: [
				{
					id: 'layerId',
					type: 'dropdown',
					label: 'Layer',
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
			callback: (feedback) => {
				return self.isLayerSourceActive(feedback.options.layerId, feedback.options.sourceId)
			},
		},
	})
}
