import { InstanceBase, InstanceStatus, type SomeCompanionConfigField } from '@companion-module/base'
import { GetConfigFields, type ModuleConfig } from './config.js'
import { UpdateVariableDefinitions, type VariablesSchema } from './variables.js'
import { UpgradeScripts } from './upgrades.js'
import { UpdateActions, type ActionsSchema } from './actions.js'
import { UpdateFeedbacks, type FeedbacksSchema } from './feedbacks.js'
import { UpdatePresets } from './presets.js'

type CoexResponse<T = unknown> = {
	code: number
	data: T
	message?: string
}

type ScreenDisplayParam = {
	screenId?: string | number
	screenID?: string | number
	brightness?: number
	colorTemperature?: number
	gamma?: number
}

type JsonRecord = Record<string, unknown>
type Choice = { id: string; label: string }
type NamedInput = { id: string; name: string }
type NamedInputKey = 'hdmi1' | 'sdi1' | 'internal'
type PresetInfoResponse = {
	screenPresets?: Array<{
		screenID?: string | number
		presets?: Array<{
			sequenceNumber?: number
			name?: string
			state?: boolean
		}>
	}>
}
type DisplayStateResponse = {
	mappingState?: Array<{ canvasID?: string | number; enable?: boolean }>
	displayState?: Array<{ canvasID?: string | number; displayMode?: number }>
}

type ScreenInfoResponse = {
	screens?: JsonRecord[]
}

function isJsonRecord(value: unknown): value is JsonRecord {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asRecordArray(value: unknown): JsonRecord[] {
	return Array.isArray(value) ? value.filter(isJsonRecord) : []
}

function getString(record: JsonRecord | undefined, key: string): string | undefined {
	const value = record?.[key]
	return primitiveToString(value)
}

function getNumber(record: JsonRecord | undefined, key: string): number | undefined {
	const value = Number(record?.[key])
	return Number.isFinite(value) ? value : undefined
}

function getFirstNumber(record: JsonRecord | undefined, keys: string[]): number | undefined {
	for (const key of keys) {
		const value = getNumber(record, key)
		if (value !== undefined) {
			return value
		}
	}

	return undefined
}

function getBoolean(record: JsonRecord | undefined, key: string): boolean | undefined {
	const value = record?.[key]
	return typeof value === 'boolean' ? value : undefined
}

function getFirstBoolean(record: JsonRecord | undefined, keys: string[]): boolean | undefined {
	for (const key of keys) {
		const value = getBoolean(record, key)
		if (value !== undefined) {
			return value
		}
	}

	return undefined
}

function getFirstString(record: JsonRecord | undefined, keys: string[]): string | undefined {
	for (const key of keys) {
		const value = getString(record, key)
		if (value !== undefined) {
			return value
		}
	}

	return undefined
}

function getNestedNumber(record: JsonRecord | undefined, key: string, nestedKey: string): number | undefined {
	const nested = record?.[key]
	return isJsonRecord(nested) ? getNumber(nested, nestedKey) : undefined
}

function findNestedNumber(value: unknown, keys: string[], maxDepth = 5): number | undefined {
	if (maxDepth < 0) {
		return undefined
	}

	if (isJsonRecord(value)) {
		const directValue = getFirstNumber(value, keys)
		if (directValue !== undefined) {
			return directValue
		}

		for (const nested of Object.values(value)) {
			const nestedValue = findNestedNumber(nested, keys, maxDepth - 1)
			if (nestedValue !== undefined) {
				return nestedValue
			}
		}
	}

	if (Array.isArray(value)) {
		for (const item of value) {
			const nestedValue = findNestedNumber(item, keys, maxDepth - 1)
			if (nestedValue !== undefined) {
				return nestedValue
			}
		}
	}

	return undefined
}

function findNestedString(value: unknown, keys: string[], maxDepth = 5): string | undefined {
	if (maxDepth < 0) {
		return undefined
	}

	if (isJsonRecord(value)) {
		const directValue = getFirstString(value, keys)
		if (directValue !== undefined) {
			return directValue
		}

		for (const nested of Object.values(value)) {
			const nestedValue = findNestedString(nested, keys, maxDepth - 1)
			if (nestedValue !== undefined) {
				return nestedValue
			}
		}
	}

	if (Array.isArray(value)) {
		for (const item of value) {
			const nestedValue = findNestedString(item, keys, maxDepth - 1)
			if (nestedValue !== undefined) {
				return nestedValue
			}
		}
	}

	return undefined
}

function findNestedRecordArray(value: unknown, keys: string[], maxDepth = 5): JsonRecord[] {
	if (maxDepth < 0) {
		return []
	}

	if (Array.isArray(value)) {
		const records = asRecordArray(value)
		if (records.length > 0) {
			return records
		}
	}

	if (!isJsonRecord(value)) {
		return []
	}

	for (const key of keys) {
		const records = asRecordArray(value[key])
		if (records.length > 0) {
			return records
		}
	}

	for (const nested of Object.values(value)) {
		const records = findNestedRecordArray(nested, keys, maxDepth - 1)
		if (records.length > 0) {
			return records
		}
	}

	return []
}

function findScreen(screens: JsonRecord[], screenId: string): JsonRecord | undefined {
	return screens.find((screen) => getString(screen, 'screenID') === screenId) || screens[0]
}

function countLayers(screen: JsonRecord | undefined): number {
	return asRecordArray(screen?.layersInWorkingMode).reduce((count, layerGroup) => {
		return count + asRecordArray(layerGroup.layers).length
	}, 0)
}

function getLayerRecords(screen: JsonRecord | undefined): JsonRecord[] {
	return asRecordArray(screen?.layersInWorkingMode).flatMap((layerGroup) => asRecordArray(layerGroup.layers))
}

function findLayerId(layer: JsonRecord | undefined): string | undefined {
	return getFirstString(layer, ['id', 'ID', 'layerId', 'layerID', 'layer_id'])
}

function findLayerSource(layer: JsonRecord | undefined): string | undefined {
	return getFirstString(layer, ['source', 'sourceId', 'sourceID', 'source_id', 'input', 'inputSource', 'inputSourceID'])
}

function findCanvasId(canvas: JsonRecord | undefined): string | undefined {
	return getFirstString(canvas, ['id', 'ID', 'canvasID', 'canvasId', 'canvas_id'])
}

function findCabinetId(cabinet: JsonRecord | undefined): string | undefined {
	return getFirstString(cabinet, ['id', 'ID', 'cabinetID', 'cabinetId', 'cabinet_id'])
}

function findInputGroupId(source: JsonRecord | undefined): string | undefined {
	return getFirstString(source, ['groupId', 'groupID', 'group_id'])
}

function findInputSourceName(source: JsonRecord | undefined): string | undefined {
	return getFirstString(source, [
		'name',
		'sourceName',
		'source_name',
		'inputName',
		'input_name',
		'customName',
		'custom_name',
		'type',
	])
}

function normalizeInputSources(data: unknown): JsonRecord[] {
	return findNestedRecordArray(data, ['sources', 'inputSources', 'input_sources', 'sourceInfos', 'sourceList', 'list'])
}

function joinIdList(records: JsonRecord[], getId: (record: JsonRecord) => string | undefined): string {
	return records
		.map((record) => getId(record))
		.filter(Boolean)
		.join(',')
}

function joinIdNameList(
	records: JsonRecord[],
	getId: (record: JsonRecord) => string | undefined,
	getName: (record: JsonRecord) => string | undefined,
): string {
	return records
		.map((record) => {
			const id = getId(record)
			if (!id) {
				return undefined
			}

			const name = getName(record)
			return name ? `${id}:${name}` : id
		})
		.filter(Boolean)
		.join(',')
}

function buildCanvasChoices(
	selectedScreen: JsonRecord | undefined,
	displayState: DisplayStateResponse | undefined,
): Choice[] {
	const canvasIds = [
		...asRecordArray(selectedScreen?.canvases).map((canvas) => findCanvasId(canvas)),
		...(displayState?.mappingState || []).map((state) =>
			state.canvasID === undefined ? undefined : state.canvasID.toString(),
		),
	].filter((id): id is string => id !== undefined)

	const uniqueCanvasIds = [...new Set(canvasIds)]
	const choices = uniqueCanvasIds.map((id, index) => ({
		id,
		label: `Canvas ${index + 1} (${id})`,
	}))
	const allIds = choices.map((choice) => choice.id).join(',')

	return allIds ? [{ id: allIds, label: `All canvases (${choices.length})` }, ...choices] : []
}

function normalizeSearchText(value: string | undefined): string {
	return (value || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function findInputSourceByName(
	inputSources: JsonRecord[],
	match: (normalizedName: string) => boolean,
): JsonRecord | undefined {
	return inputSources.find((source) => match(normalizeSearchText(findInputSourceName(source))))
}

function findNamedInputVariables(inputSources: JsonRecord[]): Partial<VariablesSchema> {
	const namedInputs = findNamedInputs(inputSources)

	return {
		input_hdmi_1_group_id: namedInputs.hdmi1.id,
		input_hdmi_1_name: namedInputs.hdmi1.name,
		input_sdi_1_group_id: namedInputs.sdi1.id,
		input_sdi_1_name: namedInputs.sdi1.name,
		input_internal_group_id: namedInputs.internal.id,
		input_internal_name: namedInputs.internal.name,
	}
}

function findInputStatusRecords(monitorInfo: JsonRecord | undefined): JsonRecord[] {
	return asRecordArray(monitorInfo?.screenSourceStatus)
}

function getInputMatchKeys(record: JsonRecord | undefined): Set<string> {
	const keys = [
		'groupId',
		'groupID',
		'group_id',
		'id',
		'ID',
		'source',
		'sourceId',
		'sourceID',
		'source_id',
		'sourceChannel',
		'source_channel',
		'input',
		'inputId',
		'inputID',
		'input_id',
	]
	const values = keys.map((key) => getString(record, key)).filter((value): value is string => value !== undefined)
	for (const key of keys) {
		const nestedValue = findNestedString(record, [key], 2)
		if (nestedValue !== undefined) {
			values.push(nestedValue)
		}
	}

	return new Set(values)
}

function findInputStatus(
	source: NamedInput,
	inputSources: JsonRecord[],
	inputStatusRecords: JsonRecord[],
): JsonRecord | undefined {
	const sourceRecord = inputSources.find((item) => findInputGroupId(item) === source.id)
	const sourceKeys = getInputMatchKeys(sourceRecord)
	sourceKeys.add(source.id)

	return inputStatusRecords.find((status) => {
		const statusKeys = getInputMatchKeys(status)
		for (const key of sourceKeys) {
			if (statusKeys.has(key)) {
				return true
			}
		}

		return normalizeSearchText(findInputSourceName(status)).includes(normalizeSearchText(source.name))
	})
}

function mergeInputStatus(
	source: NamedInput,
	inputSources: JsonRecord[],
	inputStatusRecords: JsonRecord[],
): JsonRecord | undefined {
	const sourceRecord = inputSources.find((item) => findInputGroupId(item) === source.id)
	const statusRecord = findInputStatus(source, inputSources, inputStatusRecords)

	if (!sourceRecord && !statusRecord) {
		return undefined
	}

	// Signal format fields are usually on /device/input/sources, while link state is on monitor info.
	return {
		...(sourceRecord || {}),
		...(statusRecord || {}),
	}
}

function buildInputResolution(status: JsonRecord | undefined): string {
	const actualResolution = status?.actualResolution
	if (isJsonRecord(actualResolution)) {
		const width = getNumber(actualResolution, 'width')
		const height = getNumber(actualResolution, 'height')
		if (width !== undefined && height !== undefined) {
			return `${width}x${height}`
		}
	}

	const directResolution = getFirstString(status, ['resolution', 'format', 'inputResolution'])
	if (directResolution !== undefined) {
		return directResolution
	}

	const width = findNestedNumber(status, ['width', 'inputWidth', 'hActive', 'horizontalActive', 'sourceWidth'])
	const height = findNestedNumber(status, ['height', 'inputHeight', 'vActive', 'verticalActive', 'sourceHeight'])
	return width !== undefined && height !== undefined ? `${width}x${height}` : ''
}

function buildInputBitDepth(status: JsonRecord | undefined): string {
	const bitDepth = findNestedNumber(status, ['bitDepth', 'colorDepth', 'color_depth', 'depth'])
	if (bitDepth === undefined) {
		return ''
	}

	const labels: Record<number, string> = {
		0: '8-bit',
		1: '10-bit',
		2: '12-bit',
		255: 'Follow input',
	}

	return labels[bitDepth] || bitDepth.toString()
}

function buildInputColorRange(status: JsonRecord | undefined): string {
	const range = findNestedNumber(status, ['range', 'colorRange', 'quantizationRange', 'color_range'])
	if (range === undefined) {
		return ''
	}

	const labels: Record<number, string> = {
		0: 'Limited',
		1: 'Full',
		255: 'Auto',
	}

	return labels[range] || range.toString()
}

function buildInputStatusVariables(
	prefix: 'input_hdmi_1' | 'input_sdi_1' | 'input_internal',
	status: JsonRecord | undefined,
): Record<string, string | number | boolean> {
	return {
		[`${prefix}_resolution`]: buildInputResolution(status),
		[`${prefix}_frame_rate`]:
			findNestedString(status, ['actualRefreshRate', 'frameRate', 'framerate', 'refreshRate', 'frequency', 'freq']) ||
			'',
		[`${prefix}_color_depth`]: buildInputBitDepth(status),
		[`${prefix}_color_range`]: buildInputColorRange(status),
		[`${prefix}_color_space`]: findNestedString(status, ['colorSpace', 'colorFormat', 'color_space']) || '',
		[`${prefix}_link_status`]: getFirstBoolean(status, ['linkStatus', 'link_status']) ?? false,
		[`${prefix}_status`]: getFirstNumber(status, ['status', 'inputStatus']) ?? 0,
		[`${prefix}_port_id`]: getFirstNumber(status, ['portID', 'portId', 'port_id']) ?? 0,
	}
}

function buildAllInputStatuses(inputStatusRecords: JsonRecord[]): string {
	return inputStatusRecords
		.map((status, index) => {
			const name = findInputSourceName(status) || `Input ${index + 1}`
			const groupId = getFirstString(status, ['groupID', 'groupId', 'group_id'])
			const resolution = buildInputResolution(status)
			const frameRate = findNestedString(status, [
				'actualRefreshRate',
				'frameRate',
				'framerate',
				'refreshRate',
				'frequency',
				'freq',
			])
			const linkStatus = getFirstBoolean(status, ['linkStatus', 'link_status'])
			return [
				name,
				groupId ? `group=${groupId}` : '',
				resolution,
				frameRate,
				linkStatus === true ? 'link=up' : 'link=down',
			]
				.filter(Boolean)
				.join(' ')
		})
		.join(', ')
}

function buildInputStatusDebug(inputStatusRecords: JsonRecord[]): string {
	return inputStatusRecords.map((status, index) => `${index + 1}:${stringifyJson(status)}`).join(' | ')
}

function findNamedInputStatusVariables(
	inputSources: JsonRecord[],
	inputStatusRecords: JsonRecord[],
): Partial<VariablesSchema> {
	const namedInputs = findNamedInputs(inputSources)
	const hdmi1Status = mergeInputStatus(namedInputs.hdmi1, inputSources, inputStatusRecords)
	const sdi1Status = mergeInputStatus(namedInputs.sdi1, inputSources, inputStatusRecords)
	const internalStatus = mergeInputStatus(namedInputs.internal, inputSources, inputStatusRecords)

	return {
		...buildInputStatusVariables('input_hdmi_1', hdmi1Status),
		...buildInputStatusVariables('input_sdi_1', sdi1Status),
		...buildInputStatusVariables('input_internal', internalStatus),
		all_input_statuses: buildAllInputStatuses(inputStatusRecords),
		input_status_debug: buildInputStatusDebug(inputStatusRecords),
	}
}

function findNamedInputs(inputSources: JsonRecord[]): Record<NamedInputKey, NamedInput> {
	const hdmi1 = findInputSourceByName(inputSources, (name) => name.includes('hdmi') && name.endsWith('1'))
	const sdi1 =
		findInputSourceByName(inputSources, (name) => name.includes('sdi') && name.endsWith('1')) ||
		findInputSourceByName(inputSources, (name) => name.includes('sdi'))
	const internal = findInputSourceByName(inputSources, (name) => name.includes('internal'))

	return {
		hdmi1: {
			id: findInputGroupId(hdmi1) || '',
			name: findInputSourceName(hdmi1) || 'HDMI 1',
		},
		sdi1: {
			id: findInputGroupId(sdi1) || '',
			name: findInputSourceName(sdi1) || 'SDI 1',
		},
		internal: {
			id: findInputGroupId(internal) || '',
			name: findInputSourceName(internal) || 'INTERNAL',
		},
	}
}

function buildLayerVariables(
	selectedLayers: JsonRecord[],
): Required<Pick<VariablesSchema, 'layer_1_id' | 'layer_2_id' | 'layer_3_id' | 'sender_only_layer_id'>> {
	const layerIds = selectedLayers.map((layer) => findLayerId(layer)).filter((id): id is string => id !== undefined)
	// All-in-One reports a non-layer entry "1"; real switchable layers follow it.
	const controllableLayerIds = layerIds.length > 1 ? layerIds.filter((id) => id !== '1') : layerIds

	return {
		layer_1_id: controllableLayerIds[0] || '',
		layer_2_id: controllableLayerIds[1] || '',
		layer_3_id: controllableLayerIds[2] || '',
		sender_only_layer_id: layerIds[0] || '1',
	}
}

function buildLayerChoices(selectedLayers: JsonRecord[], screenWorkingMode: number | undefined): Choice[] {
	const layerIds = selectedLayers.map((layer) => findLayerId(layer)).filter((id): id is string => id !== undefined)
	if (screenWorkingMode === 0) {
		return [{ id: '1', label: 'Sender Only' }]
	}

	const controllableLayerIds = layerIds.length > 1 ? layerIds.filter((id) => id !== '1') : layerIds

	const choices: Choice[] = controllableLayerIds.map((id, index) => ({
		id,
		label: `Layer ${index + 1} (${id})`,
	}))

	return choices.length > 0 ? choices : [{ id: '0', label: 'Layer 0' }]
}

function buildInputGroupChoices(inputSources: JsonRecord[]): Choice[] {
	const choices = inputSources
		.map((source) => {
			const id = findInputGroupId(source)
			if (!id) {
				return undefined
			}

			const name = findInputSourceName(source)
			return {
				id,
				label: name ? `${name} (${id})` : id,
			}
		})
		.filter((choice): choice is Choice => choice !== undefined)

	return choices.length > 0 ? choices : [{ id: '0', label: 'Source 0' }]
}

function stringifyJson(value: unknown): string {
	if (value === undefined) {
		return ''
	}

	try {
		return JSON.stringify(value)
	} catch {
		return ''
	}
}

function primitiveToString(value: unknown): string | undefined {
	if (value === undefined || value === null) {
		return undefined
	}

	if (typeof value === 'string') {
		return value
	}

	if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
		return value.toString()
	}

	return stringifyJson(value)
}

function summarizeCommandResponse(
	method: 'GET' | 'POST' | 'PUT' | 'DELETE',
	path: string,
	body: unknown,
	response: unknown,
	status?: number,
): string {
	const bodyText = body === undefined ? '' : ` ${stringifyJson(body)}`
	const responseText = stringifyJson(response) || '(empty response)'
	const statusText = status === undefined ? '' : ` HTTP ${status}`
	return `${method} ${path}${bodyText} =>${statusText} ${responseText}`
}

function buildActivePresetMap(presetInfo: PresetInfoResponse | undefined): Map<string, Set<number>> {
	const result = new Map<string, Set<number>>()

	for (const screenPreset of presetInfo?.screenPresets || []) {
		const screenId = screenPreset.screenID === undefined ? '' : String(screenPreset.screenID)
		const activePresets = new Set<number>()

		for (const preset of screenPreset.presets || []) {
			if (preset.state === true && typeof preset.sequenceNumber === 'number') {
				activePresets.add(preset.sequenceNumber)
			}
		}

		if (screenId) {
			result.set(screenId, activePresets)
		}
	}

	return result
}

function buildPresetVariables(presetInfo: PresetInfoResponse | undefined): Partial<VariablesSchema> {
	const result: Record<string, string | boolean> = {}
	const presets = presetInfo?.screenPresets?.[0]?.presets || []

	for (let sequenceNumber = 1; sequenceNumber <= 10; sequenceNumber++) {
		const preset = presets.find((item) => item.sequenceNumber === sequenceNumber)
		result[`preset_${sequenceNumber}_name`] = preset?.name || `Preset ${sequenceNumber}`
		result[`preset_${sequenceNumber}_active`] = preset?.state === true
	}

	return result
}

function coexBrightnessToCompanion(brightness: number | undefined): number | undefined {
	if (brightness === undefined) {
		return undefined
	}

	// Some endpoints return 0.0-1.0 and others may already return 0-100.
	const companionBrightness = brightness >= 0 && brightness <= 1 ? brightness * 100 : brightness
	return Math.round(companionBrightness * 10) / 10
}

function parseVersionParts(version: string | undefined): [number, number, number] | undefined {
	const match = version?.match(/(\d+)\.(\d+)(?:\.(\d+))?/)
	if (!match) {
		return undefined
	}

	return [Number(match[1]), Number(match[2]), Number(match[3] || 0)]
}

function isVersionBefore(version: string | undefined, major: number, minor: number, patch: number): boolean {
	const parts = parseVersionParts(version)
	if (!parts) {
		return false
	}

	const [currentMajor, currentMinor, currentPatch] = parts
	if (currentMajor !== major) return currentMajor < major
	if (currentMinor !== minor) return currentMinor < minor
	return currentPatch < patch
}

function normalizeDisplayParams(data: unknown): ScreenDisplayParam[] {
	const sourceRecords = findNestedRecordArray(data, [
		'list',
		'screens',
		'screenDisplayParams',
		'displayParams',
		'screenParams',
	])
	if (sourceRecords.length === 0 && isJsonRecord(data)) {
		sourceRecords.push(data)
	}

	const result: ScreenDisplayParam[] = []

	for (const item of sourceRecords) {
		const rawScreenId = getFirstString(item, ['screenId', 'screenID', 'screen_id', 'id'])
		const brightness = getFirstNumber(item, ['brightness', 'brightnessValue', 'screenBrightness'])
		const colorTemperature = getFirstNumber(item, [
			'colorTemperature',
			'colourTemperature',
			'colorTemp',
			'color_temperature',
			'temperature',
		])
		const gamma = getFirstNumber(item, ['gamma', 'gammaValue'])

		if (
			rawScreenId !== undefined ||
			brightness !== undefined ||
			colorTemperature !== undefined ||
			gamma !== undefined
		) {
			result.push({
				screenId: rawScreenId,
				brightness: coexBrightnessToCompanion(brightness),
				colorTemperature,
				gamma,
			})
		}
	}

	return result
}

export type ModuleSchema = {
	config: ModuleConfig
	secrets: undefined
	actions: ActionsSchema
	feedbacks: FeedbacksSchema
	variables: VariablesSchema
}

export { UpgradeScripts }

export default class ModuleInstance extends InstanceBase<ModuleSchema> {
	config!: ModuleConfig // Setup in init()
	private displayParamsByScreen = new Map<string, ScreenDisplayParam>()
	private displayMode: number | undefined
	private mappingEnabled: boolean | undefined
	private screenWorkingMode: number | undefined
	private deviceHardwareVersion: string | undefined
	private layerSourcesByLayer = new Map<string, string>()
	private activePresetByScreen = new Map<string, Set<number>>()
	private displayParamsPollTimer: ReturnType<typeof setInterval> | undefined
	private layerChoices: Choice[] = [{ id: '0', label: 'Layer 0' }]
	private inputGroupChoices: Choice[] = [{ id: '0', label: 'Source 0' }]
	private canvasChoices: Choice[] = [{ id: '0', label: 'Canvas 0' }]
	private actionChoicesSignature = ''
	private layerPresetIds = {
		layer1: '',
		layer2: '',
		layer3: '',
		senderOnly: '1',
	}
	private namedInputs: Record<NamedInputKey, NamedInput> = {
		hdmi1: { id: '', name: 'HDMI 1' },
		sdi1: { id: '', name: 'SDI 1' },
		internal: { id: '', name: 'INTERNAL' },
	}

	constructor(internal: unknown) {
		super(internal)
	}

	async init(config: ModuleConfig): Promise<void> {
		this.config = config

		this.updateConnectionStatus()

		this.updateActions() // export actions
		this.updateFeedbacks() // export feedbacks
		this.updatePresets() // export Presets
		this.updateVariableDefinitions() // export variable definitions
		this.startDisplayParamsPolling()
	}
	// When module gets deleted
	async destroy(): Promise<void> {
		this.stopDisplayParamsPolling()
		this.log('debug', 'destroy')
	}

	async configUpdated(config: ModuleConfig): Promise<void> {
		this.config = config
		this.updateConnectionStatus()
		this.startDisplayParamsPolling()
	}

	private updateConnectionStatus(): void {
		if (!this.config.host) {
			this.updateStatus(InstanceStatus.BadConfig, 'Device IP is required')
			return
		}

		this.updateStatus(InstanceStatus.Ok)
	}

	async coexRequest<T = unknown>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown): Promise<T> {
		return this.coexRequestWithBody(method, path, body === undefined ? undefined : JSON.stringify(body), body)
	}

	async coexRequestRaw<T = unknown>(
		method: 'GET' | 'POST' | 'PUT' | 'DELETE',
		path: string,
		rawBody: string,
	): Promise<T> {
		return this.coexRequestWithBody(method, path, rawBody, rawBody)
	}

	private async coexRequestWithBody<T = unknown>(
		method: 'GET' | 'POST' | 'PUT' | 'DELETE',
		path: string,
		rawBody?: string,
		summaryBody?: unknown,
	): Promise<T> {
		if (!this.config.host) {
			throw new Error('Device IP must be configured')
		}

		const deviceKey = `${this.config.host}:${this.config.port}`
		const response = await fetch(`http://${deviceKey}${path}`, {
			method,
			headers: {
				'Content-Type': 'application/json',
				'Device-Key': deviceKey,
			},
			body: rawBody,
		})

		const responseText = await response.text().catch(() => '')
		let json: CoexResponse<T> | T | undefined
		try {
			json = responseText ? (JSON.parse(responseText) as CoexResponse<T> | T) : undefined
		} catch {
			json = undefined
		}
		if (method !== 'GET') {
			this.setVariableValues({
				last_command_response: summarizeCommandResponse(method, path, summaryBody, json, response.status),
			})
		}

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`)
		}

		if (!json) {
			if (method !== 'GET') {
				return undefined as T
			}

			throw new Error('COEX API returned an empty or invalid JSON response')
		}

		const jsonRecord: unknown = json
		if (isJsonRecord(jsonRecord) && typeof jsonRecord['code'] === 'number') {
			const code = jsonRecord['code']
			if (code !== 0) {
				const message = primitiveToString(jsonRecord['message']) || `COEX API returned code ${code}`
				throw new Error(message)
			}

			return jsonRecord['data'] as T
		}

		return json as T
	}

	getBrightness(screenId: string): number | undefined {
		return this.getDisplayParam(screenId)?.brightness
	}

	getGamma(screenId: string): number | undefined {
		return this.getDisplayParam(screenId)?.gamma
	}

	getColorTemperature(screenId: string): number | undefined {
		return this.getDisplayParam(screenId)?.colorTemperature
	}

	getDisplayMode(): number | undefined {
		return this.displayMode
	}

	getMappingEnabled(): boolean | undefined {
		return this.mappingEnabled
	}

	getScreenWorkingMode(): number | undefined {
		return this.screenWorkingMode
	}

	usesLegacyDeviceApi(): boolean {
		// COEX 1.4+ uses the current screen/layer API; older 1.0-1.3 firmware uses device-scoped routes.
		return isVersionBefore(this.deviceHardwareVersion, 1, 4, 0)
	}

	getLayerChoices(): Choice[] {
		return this.layerChoices
	}

	getInputGroupChoices(): Choice[] {
		return this.inputGroupChoices
	}

	isLayerSourceActive(layerId: string, sourceId: string): boolean {
		return this.layerSourcesByLayer.get(layerId.trim()) === sourceId.trim()
	}

	getCanvasChoices(): Choice[] {
		return this.canvasChoices
	}

	getAllCanvasIds(): string {
		return this.canvasChoices[0]?.id || '0'
	}

	getLayerPresetId(layerNumber: 1 | 2 | 3): string {
		return this.layerPresetIds[`layer${layerNumber}`] || '0'
	}

	getSenderOnlyLayerPresetId(): string {
		return this.layerPresetIds.senderOnly || '1'
	}

	getNamedInputPreset(key: NamedInputKey): NamedInput {
		const input = this.namedInputs[key]
		return {
			id: input.id || '0',
			name: input.name,
		}
	}

	resolveScreenId(screenId: string): string {
		const trimmedScreenId = screenId.trim()
		const exactMatch = this.displayParamsByScreen.get(trimmedScreenId)
		if (exactMatch?.screenId !== undefined) {
			return exactMatch.screenId.toString()
		}

		if (trimmedScreenId === '' || trimmedScreenId === '1') {
			// The UI defaults to "1"; COEX commands need the real screen UUID when available.
			return this.getDisplayParam('')?.screenId?.toString() || trimmedScreenId || '1'
		}

		return trimmedScreenId
	}

	isPresetActive(screenId: string, sequenceNumber: number): boolean {
		const activePresets = this.activePresetByScreen.get(screenId) || this.activePresetByScreen.values().next().value
		return activePresets?.has(sequenceNumber) || false
	}

	private updateActionChoices(layerChoices: Choice[], inputGroupChoices: Choice[], canvasChoices: Choice[]): void {
		const signature = JSON.stringify({ layerChoices, inputGroupChoices, canvasChoices })
		if (signature === this.actionChoicesSignature) {
			return
		}

		this.layerChoices = layerChoices
		this.inputGroupChoices = inputGroupChoices
		this.canvasChoices = canvasChoices.length > 0 ? canvasChoices : [{ id: '0', label: 'Canvas 0' }]
		this.actionChoicesSignature = signature
		this.updateActions()
		this.updatePresets()
	}

	private getDisplayParam(screenId: string): ScreenDisplayParam | undefined {
		if (screenId) {
			const exactMatch = this.displayParamsByScreen.get(screenId)
			if (exactMatch !== undefined) {
				return exactMatch
			}
		}

		const first = this.displayParamsByScreen.values().next()
		return first.done ? undefined : first.value
	}

	async refreshDisplayParams(): Promise<void> {
		if (!this.config.host) {
			return
		}

		try {
			const [
				displayParamsResult,
				screenInfoResult,
				displayStateResult,
				presetInfoResult,
				deviceInfoResult,
				monitorInfoResult,
				cabinetInfoResult,
				inputSourcesResult,
			] = await Promise.allSettled([
				this.coexRequest<unknown>('GET', '/api/v1/screen/displayparams'),
				this.coexRequest<ScreenInfoResponse>('GET', '/api/v1/screen'),
				this.coexRequest<DisplayStateResponse>('GET', '/api/v1/screen/output/display/state'),
				this.coexRequest<PresetInfoResponse>('GET', '/api/v1/preset'),
				this.coexRequest<JsonRecord>('GET', '/api/v1/device/hw'),
				this.coexRequest<JsonRecord>('GET', '/api/v1/device/monitor/info'),
				this.coexRequest<JsonRecord[]>('GET', '/api/v1/device/cabinet'),
				this.coexRequest<unknown>('GET', '/api/v1/device/input/sources'),
			])

			const data = displayParamsResult.status === 'fulfilled' ? displayParamsResult.value : {}
			const rawList = normalizeDisplayParams(data)
			const nextDisplayParamsByScreen = new Map<string, ScreenDisplayParam>()

			for (const [index, item] of rawList.entries()) {
				const rawScreenId = item.screenId ?? item.screenID ?? index + 1
				nextDisplayParamsByScreen.set(String(rawScreenId), {
					screenId: rawScreenId,
					brightness: item.brightness,
					colorTemperature: item.colorTemperature,
					gamma: item.gamma,
				})
			}

			this.displayParamsByScreen = nextDisplayParamsByScreen

			const displayParams = this.getDisplayParam('')
			const variableScreenId =
				displayParams?.screenId === undefined
					? String(this.displayParamsByScreen.keys().next().value || '')
					: String(displayParams.screenId)
			const screenInfo = screenInfoResult.status === 'fulfilled' ? screenInfoResult.value : undefined
			const screens = Array.isArray(screenInfo?.screens) ? screenInfo.screens : []
			const selectedScreen = findScreen(screens, variableScreenId)
			const displayState = displayStateResult.status === 'fulfilled' ? displayStateResult.value : undefined
			const presetInfo = presetInfoResult.status === 'fulfilled' ? presetInfoResult.value : undefined
			const selectedDisplayState = Array.isArray(displayState?.displayState) ? displayState.displayState[0] : undefined
			const selectedMappingState = Array.isArray(displayState?.mappingState) ? displayState.mappingState[0] : undefined
			const deviceInfo = deviceInfoResult.status === 'fulfilled' ? deviceInfoResult.value : undefined
			const monitorInfo = monitorInfoResult.status === 'fulfilled' ? monitorInfoResult.value : undefined
			const cabinetInfo =
				cabinetInfoResult.status === 'fulfilled' && Array.isArray(cabinetInfoResult.value)
					? cabinetInfoResult.value
					: []
			const inputSourceInfo = inputSourcesResult.status === 'fulfilled' ? inputSourcesResult.value : undefined
			const inputSources = normalizeInputSources(inputSourceInfo)
			const inputStatusRecords = findInputStatusRecords(monitorInfo)
			const selectedLayers = getLayerRecords(selectedScreen)
			const layerVariables = buildLayerVariables(selectedLayers)
			this.layerPresetIds = {
				layer1: layerVariables.layer_1_id,
				layer2: layerVariables.layer_2_id,
				layer3: layerVariables.layer_3_id,
				senderOnly: layerVariables.sender_only_layer_id,
			}
			this.namedInputs = findNamedInputs(inputSources)
			const firstFan = asRecordArray(monitorInfo?.fanInfos)[0]
			this.deviceHardwareVersion = getString(deviceInfo, 'hwVersion')
			this.displayMode = getNumber(selectedDisplayState, 'displayMode')
			this.mappingEnabled = getBoolean(selectedMappingState, 'enable')
			this.screenWorkingMode = getNumber(selectedScreen, 'workingMode')
			this.layerSourcesByLayer = new Map(
				selectedLayers
					.map((layer) => {
						const layerId = findLayerId(layer)
						const sourceId = findLayerSource(layer)
						return layerId && sourceId ? ([layerId, sourceId] as const) : undefined
					})
					.filter((entry): entry is readonly [string, string] => entry !== undefined),
			)
			this.updateActionChoices(
				buildLayerChoices(selectedLayers, this.screenWorkingMode),
				buildInputGroupChoices(inputSources),
				buildCanvasChoices(selectedScreen, displayState),
			)
			this.activePresetByScreen = buildActivePresetMap(presetInfo)

			this.setVariableValues({
				brightness: displayParams?.brightness,
				color_temperature: displayParams?.colorTemperature,
				gamma: displayParams?.gamma,
				screen_count: screens.length,
				screen_id: getString(selectedScreen, 'screenID'),
				screen_name: getString(selectedScreen, 'screenName'),
				screen_working_mode: this.screenWorkingMode,
				screen_low_latency: getBoolean(selectedScreen, 'lowLatency'),
				screen_master_frame_rate: getNumber(selectedScreen, 'masterFrameRate'),
				canvas_count: asRecordArray(selectedScreen?.canvases).length,
				all_canvas_ids: joinIdList(asRecordArray(selectedScreen?.canvases), findCanvasId),
				layer_count: countLayers(selectedScreen),
				all_layer_ids: joinIdList(selectedLayers, findLayerId),
				all_layer_sources: selectedLayers
					.map((layer) => {
						const layerId = findLayerId(layer)
						const sourceId = findLayerSource(layer)
						return layerId && sourceId ? `${layerId}:${sourceId}` : undefined
					})
					.filter(Boolean)
					.join(','),
				...layerVariables,
				cabinet_count: cabinetInfo.length,
				all_cabinet_ids: joinIdList(cabinetInfo, findCabinetId),
				display_mode: this.displayMode,
				is_blackout: this.displayMode === 1,
				is_freeze: this.displayMode === 2,
				mapping_enabled: this.mappingEnabled,
				device_name: getString(deviceInfo, 'name'),
				device_custom_name: getString(deviceInfo, 'customName'),
				device_model_id: getNumber(deviceInfo, 'modelID'),
				device_sn: getString(deviceInfo, 'sn'),
				device_mac: getString(deviceInfo, 'mac'),
				device_type: getString(deviceInfo, 'type'),
				device_hw_version: getString(deviceInfo, 'hwVersion'),
				device_sw_version: getString(deviceInfo, 'swVersion'),
				device_ip: getString(deviceInfo, 'ip'),
				device_uptime: getNumber(deviceInfo, 'uptime'),
				device_memory_size: getNumber(deviceInfo, 'memorySize'),
				monitor_backup_status: findNestedNumber(monitorInfo, ['backupStatus', 'backup_status', 'monitorBackupStatus']),
				main_board_temperature: getNestedNumber(monitorInfo, 'mainBoardTemperature', 'value'),
				main_board_temperature_status: getNestedNumber(monitorInfo, 'mainBoardTemperature', 'status'),
				main_board_voltage: getNestedNumber(monitorInfo, 'mainBoardVoltage', 'value'),
				main_board_voltage_status: getNestedNumber(monitorInfo, 'mainBoardVoltage', 'status'),
				fan_count: asRecordArray(monitorInfo?.fanInfos).length,
				first_fan_speed: getNumber(firstFan, 'fanSpeed'),
				first_fan_status: getNumber(firstFan, 'status'),
				cabinet_power_number: findNestedNumber(monitorInfo, [
					'cabinetPowerNumber',
					'cabinet_power_number',
					'cabinetPower',
					'powerNumber',
				]),
				screen_runtime: findNestedNumber(monitorInfo, [
					'screenRunTime',
					'screenRuntime',
					'screen_run_time',
					'screen_runtime',
				]),
				input_status_count: asRecordArray(monitorInfo?.screenSourceStatus).length,
				output_status_count: asRecordArray(monitorInfo?.outputStatus).length,
				all_screen_names: screens
					.map((screen) => getString(screen, 'screenName'))
					.filter(Boolean)
					.join(','),
				all_input_group_ids: joinIdList(inputSources, findInputGroupId),
				all_input_groups: joinIdNameList(inputSources, findInputGroupId, findInputSourceName),
				...findNamedInputVariables(inputSources),
				...findNamedInputStatusVariables(inputSources, inputStatusRecords),
				...buildPresetVariables(presetInfo),
				display_params_json: stringifyJson(data),
				display_state_json: stringifyJson(displayState),
				preset_info_json: stringifyJson(presetInfo),
				device_info_json: stringifyJson(deviceInfo),
				input_sources_json: stringifyJson(inputSourceInfo),
				input_status_json: stringifyJson(inputStatusRecords),
			})
			this.checkFeedbacks(
				'brightness_matches',
				'display_mode_is',
				'preset_is_active',
				'mapping_is_enabled',
				'layer_source_is',
			)
		} catch (error) {
			this.log('debug', `Failed to retrieve COEX variables: ${String(error)}`)
		}
	}

	private startDisplayParamsPolling(): void {
		this.stopDisplayParamsPolling()

		if (!this.config.host) {
			return
		}

		void this.refreshDisplayParams()
		this.displayParamsPollTimer = setInterval(() => {
			void this.refreshDisplayParams()
		}, 1000)
	}

	private stopDisplayParamsPolling(): void {
		if (this.displayParamsPollTimer) {
			clearInterval(this.displayParamsPollTimer)
			this.displayParamsPollTimer = undefined
		}
	}

	// Return config fields for web config
	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields()
	}

	updateActions(): void {
		UpdateActions(this)
	}

	updateFeedbacks(): void {
		UpdateFeedbacks(this)
	}

	updatePresets(): void {
		UpdatePresets(this)
	}

	updateVariableDefinitions(): void {
		UpdateVariableDefinitions(this)
	}
}
