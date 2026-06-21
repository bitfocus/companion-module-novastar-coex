import type ModuleInstance from './main.js'

export type VariablesSchema = {
	brightness: number
	color_temperature: number
	gamma: number
	screen_count: number
	screen_id: string
	screen_name: string
	screen_working_mode: number
	screen_low_latency: boolean
	screen_master_frame_rate: number
	canvas_count: number
	all_canvas_ids: string
	layer_count: number
	all_layer_ids: string
	all_layer_sources: string
	layer_1_id: string
	layer_2_id: string
	layer_3_id: string
	sender_only_layer_id: string
	cabinet_count: number
	all_cabinet_ids: string
	display_mode: number
	is_blackout: boolean
	is_freeze: boolean
	mapping_enabled: boolean
	device_name: string
	device_custom_name: string
	device_model_id: number
	device_sn: string
	device_mac: string
	device_type: string
	device_hw_version: string
	device_sw_version: string
	device_ip: string
	device_uptime: number
	device_memory_size: number
	monitor_backup_status: number
	main_board_temperature: number
	main_board_temperature_status: number
	main_board_voltage: number
	main_board_voltage_status: number
	fan_count: number
	first_fan_speed: number
	first_fan_status: number
	cabinet_power_number: number
	screen_runtime: number
	input_status_count: number
	output_status_count: number
	all_screen_names: string
	all_input_group_ids: string
	all_input_groups: string
	input_hdmi_1_group_id: string
	input_hdmi_1_name: string
	input_hdmi_1_resolution: string
	input_hdmi_1_frame_rate: string
	input_hdmi_1_color_depth: string
	input_hdmi_1_color_range: string
	input_hdmi_1_color_space: string
	input_hdmi_1_link_status: boolean
	input_hdmi_1_status: number
	input_hdmi_1_port_id: number
	input_sdi_1_group_id: string
	input_sdi_1_name: string
	input_sdi_1_resolution: string
	input_sdi_1_frame_rate: string
	input_sdi_1_color_depth: string
	input_sdi_1_color_range: string
	input_sdi_1_color_space: string
	input_sdi_1_link_status: boolean
	input_sdi_1_status: number
	input_sdi_1_port_id: number
	input_internal_group_id: string
	input_internal_name: string
	input_internal_resolution: string
	input_internal_frame_rate: string
	input_internal_color_depth: string
	input_internal_color_range: string
	input_internal_color_space: string
	input_internal_link_status: boolean
	input_internal_status: number
	input_internal_port_id: number
	all_input_statuses: string
	input_status_debug: string
	preset_1_name: string
	preset_1_active: boolean
	preset_2_name: string
	preset_2_active: boolean
	preset_3_name: string
	preset_3_active: boolean
	preset_4_name: string
	preset_4_active: boolean
	preset_5_name: string
	preset_5_active: boolean
	preset_6_name: string
	preset_6_active: boolean
	preset_7_name: string
	preset_7_active: boolean
	preset_8_name: string
	preset_8_active: boolean
	preset_9_name: string
	preset_9_active: boolean
	preset_10_name: string
	preset_10_active: boolean
	display_params_json: string
	display_state_json: string
	preset_info_json: string
	device_info_json: string
	input_sources_json: string
	input_status_json: string
	last_command_response: string
}

export function UpdateVariableDefinitions(self: ModuleInstance): void {
	self.setVariableDefinitions({
		brightness: { name: 'Screen brightness' },
		color_temperature: { name: 'Screen color temperature' },
		gamma: { name: 'Screen gamma' },
		screen_count: { name: 'Screen count' },
		screen_id: { name: 'Selected screen ID' },
		screen_name: { name: 'Selected screen name' },
		screen_working_mode: { name: 'Selected screen working mode' },
		screen_low_latency: { name: 'Selected screen low latency' },
		screen_master_frame_rate: { name: 'Selected screen master frame rate' },
		canvas_count: { name: 'Selected screen canvas count' },
		all_canvas_ids: { name: 'Selected screen canvas IDs' },
		layer_count: { name: 'Selected screen layer count' },
		all_layer_ids: { name: 'Selected screen layer IDs' },
		all_layer_sources: { name: 'Selected screen layer current sources' },
		layer_1_id: { name: 'Layer 1 ID' },
		layer_2_id: { name: 'Layer 2 ID' },
		layer_3_id: { name: 'Layer 3 ID' },
		sender_only_layer_id: { name: 'Sender-only layer ID' },
		cabinet_count: { name: 'Cabinet count' },
		all_cabinet_ids: { name: 'All cabinet IDs' },
		display_mode: { name: 'Display mode' },
		is_blackout: { name: 'Blackout enabled' },
		is_freeze: { name: 'Freeze enabled' },
		mapping_enabled: { name: 'Mapping enabled' },
		device_name: { name: 'Device name' },
		device_custom_name: { name: 'Device custom name' },
		device_model_id: { name: 'Device model ID' },
		device_sn: { name: 'Device serial number' },
		device_mac: { name: 'Device MAC address' },
		device_type: { name: 'Device type' },
		device_hw_version: { name: 'Device hardware version' },
		device_sw_version: { name: 'Device software version' },
		device_ip: { name: 'Device reported IP' },
		device_uptime: { name: 'Device uptime' },
		device_memory_size: { name: 'Device memory size' },
		monitor_backup_status: { name: 'Monitor backup status' },
		main_board_temperature: { name: 'Main board temperature' },
		main_board_temperature_status: { name: 'Main board temperature status' },
		main_board_voltage: { name: 'Main board voltage' },
		main_board_voltage_status: { name: 'Main board voltage status' },
		fan_count: { name: 'Fan count' },
		first_fan_speed: { name: 'First fan speed' },
		first_fan_status: { name: 'First fan status' },
		cabinet_power_number: { name: 'Cabinet power number' },
		screen_runtime: { name: 'Screen runtime' },
		input_status_count: { name: 'Input status count' },
		output_status_count: { name: 'Output status count' },
		all_screen_names: { name: 'All screen names' },
		all_input_group_ids: { name: 'All input group IDs' },
		all_input_groups: { name: 'All input groups' },
		input_hdmi_1_group_id: { name: 'HDMI 1 input group ID' },
		input_hdmi_1_name: { name: 'HDMI 1 input name' },
		input_hdmi_1_resolution: { name: 'HDMI 1 input resolution' },
		input_hdmi_1_frame_rate: { name: 'HDMI 1 input frame rate' },
		input_hdmi_1_color_depth: { name: 'HDMI 1 input color depth' },
		input_hdmi_1_color_range: { name: 'HDMI 1 input color range' },
		input_hdmi_1_color_space: { name: 'HDMI 1 input color space' },
		input_hdmi_1_link_status: { name: 'HDMI 1 input link status' },
		input_hdmi_1_status: { name: 'HDMI 1 input status' },
		input_hdmi_1_port_id: { name: 'HDMI 1 input port ID' },
		input_sdi_1_group_id: { name: 'SDI 1 input group ID' },
		input_sdi_1_name: { name: 'SDI 1 input name' },
		input_sdi_1_resolution: { name: 'SDI 1 input resolution' },
		input_sdi_1_frame_rate: { name: 'SDI 1 input frame rate' },
		input_sdi_1_color_depth: { name: 'SDI 1 input color depth' },
		input_sdi_1_color_range: { name: 'SDI 1 input color range' },
		input_sdi_1_color_space: { name: 'SDI 1 input color space' },
		input_sdi_1_link_status: { name: 'SDI 1 input link status' },
		input_sdi_1_status: { name: 'SDI 1 input status' },
		input_sdi_1_port_id: { name: 'SDI 1 input port ID' },
		input_internal_group_id: { name: 'Internal input group ID' },
		input_internal_name: { name: 'Internal input name' },
		input_internal_resolution: { name: 'Internal input resolution' },
		input_internal_frame_rate: { name: 'Internal input frame rate' },
		input_internal_color_depth: { name: 'Internal input color depth' },
		input_internal_color_range: { name: 'Internal input color range' },
		input_internal_color_space: { name: 'Internal input color space' },
		input_internal_link_status: { name: 'Internal input link status' },
		input_internal_status: { name: 'Internal input status' },
		input_internal_port_id: { name: 'Internal input port ID' },
		all_input_statuses: { name: 'All input statuses' },
		input_status_debug: { name: 'Input status debug summary' },
		preset_1_name: { name: 'Preset 1 name' },
		preset_1_active: { name: 'Preset 1 active' },
		preset_2_name: { name: 'Preset 2 name' },
		preset_2_active: { name: 'Preset 2 active' },
		preset_3_name: { name: 'Preset 3 name' },
		preset_3_active: { name: 'Preset 3 active' },
		preset_4_name: { name: 'Preset 4 name' },
		preset_4_active: { name: 'Preset 4 active' },
		preset_5_name: { name: 'Preset 5 name' },
		preset_5_active: { name: 'Preset 5 active' },
		preset_6_name: { name: 'Preset 6 name' },
		preset_6_active: { name: 'Preset 6 active' },
		preset_7_name: { name: 'Preset 7 name' },
		preset_7_active: { name: 'Preset 7 active' },
		preset_8_name: { name: 'Preset 8 name' },
		preset_8_active: { name: 'Preset 8 active' },
		preset_9_name: { name: 'Preset 9 name' },
		preset_9_active: { name: 'Preset 9 active' },
		preset_10_name: { name: 'Preset 10 name' },
		preset_10_active: { name: 'Preset 10 active' },
		display_params_json: { name: 'Raw display parameters JSON' },
		display_state_json: { name: 'Raw display state JSON' },
		preset_info_json: { name: 'Raw preset information JSON' },
		device_info_json: { name: 'Raw device information JSON' },
		input_sources_json: { name: 'Raw input sources JSON' },
		input_status_json: { name: 'Raw input status JSON' },
		last_command_response: { name: 'Last COEX command response' },
	})
}
