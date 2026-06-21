## NovaStar COEX

This module controls NovaStar COEX processors through the COEX HTTP API.

It has been tested with COEX firmware 1.4.0, 1.5.0, and 1.5.1 in both **Sender Only** and **All-in-One** working modes.

The module also includes compatibility paths for older COEX hardware/API versions reported in
`$(COEX:device_hw_version)` below `1.4.0`. For those versions, display mode, source switching,
preset recall, and sending card test pattern actions use the older device-level API routes.

### Configuration

- **Device IP**: IP address of the COEX processor
- **Device Port**: COEX API port, default `8001`

The module automatically reads the first available screen from the processor. In most setups, leaving action screen fields at `1` is correct; the module resolves this internally to the real COEX screen UUID.

### Actions

- **Set Screen Brightness**: set brightness from `0` to `100`. Values are converted internally to the COEX `0.0` to `1.0` API range.
- **Adjust Screen Brightness**: increase or decrease brightness by a step value.
- **Set Screen Gamma**: set screen gamma.
- **Adjust Screen Gamma**: increase or decrease gamma by a step value.
- **Set Screen Color Temperature**: set screen color temperature in kelvin.
- **Adjust Screen Color Temperature**: increase or decrease color temperature by a step value.
- **Set Screen Display Mode**: set display mode to Normal, Blackout, or Freeze.
- **Set Screen Normal**: return the screen to normal display mode.
- **Blackout Screen**: turn blackout on, off, or toggle it.
- **Freeze Screen**: turn freeze on, off, or toggle it.
- **Switch Source for Layer**: switch a layer to an input source. Layer and source menus are built from the values reported by the processor.
- **Enable Canvas Mapping**: turn canvas mapping on, off, or toggle it. This controls the mapping state used by the module feedback.
- **Apply Preset**: recall a COEX preset by sequence number.
- **Device Identify**: enable or disable device identification.
- **Set Sending Card Test Pattern**: set an internal sending card test pattern. The action exposes mode, RGB/gray values, grid width, move speed, gradient stretch, and state.

### Feedbacks

- **Brightness Matches Value**: active when the current brightness matches the configured value, with optional tolerance.
- **Display Mode Is**: active when the display mode is Normal, Blackout, or Freeze.
- **Preset Is Active**: active when the selected COEX preset reports as active.
- **Cabinet Mapping Is Enabled**: active when canvas mapping is enabled.
- **Layer Source Is**: active when a selected layer is using a selected source.

### Presets

The module includes ready-to-use presets for:

- Blackout, Freeze, Normal, and Mapping toggle buttons
- Brightness, Gamma, and Color Temperature rotary controls
- Brightness, Gamma, and Color Temperature step buttons
- COEX preset recall buttons with active feedback
- Layer source buttons for SDI, HDMI, and internal source
- Sender Only layer source buttons
- Internal Source / Sending Card test patterns: white, red, green, blue, slashes, and left-to-right gray gradient
- Device information display buttons

Source presets are generated from the input groups reported by the processor, so the button labels and source IDs can adapt to different COEX hardware.

### Main Variables

#### Screen and image

- `$(COEX:brightness)`
- `$(COEX:color_temperature)`
- `$(COEX:gamma)`
- `$(COEX:screen_id)`
- `$(COEX:screen_name)`
- `$(COEX:screen_working_mode)`
- `$(COEX:screen_master_frame_rate)`
- `$(COEX:display_mode)`
- `$(COEX:is_blackout)`
- `$(COEX:is_freeze)`
- `$(COEX:mapping_enabled)`

#### Layers, canvases, and sources

- `$(COEX:all_canvas_ids)`
- `$(COEX:all_layer_ids)`
- `$(COEX:all_layer_sources)`
- `$(COEX:layer_1_id)`
- `$(COEX:layer_2_id)`
- `$(COEX:layer_3_id)`
- `$(COEX:sender_only_layer_id)`
- `$(COEX:all_input_group_ids)`
- `$(COEX:all_input_groups)`
- `$(COEX:all_cabinet_ids)`
- `$(COEX:input_hdmi_1_group_id)`
- `$(COEX:input_hdmi_1_name)`
- `$(COEX:input_sdi_1_group_id)`
- `$(COEX:input_sdi_1_name)`
- `$(COEX:input_internal_group_id)`
- `$(COEX:input_internal_name)`

#### Input signal status

COEX 1.5.1 reports input link state and status for tested devices. Resolution, frame rate, color range, and color space variables are exposed for firmware or hardware that provides those fields, but may remain blank.

- `$(COEX:input_hdmi_1_link_status)`
- `$(COEX:input_hdmi_1_status)`
- `$(COEX:input_hdmi_1_port_id)`
- `$(COEX:input_hdmi_1_color_depth)`
- `$(COEX:input_sdi_1_link_status)`
- `$(COEX:input_sdi_1_status)`
- `$(COEX:input_sdi_1_port_id)`
- `$(COEX:input_sdi_1_color_depth)`
- `$(COEX:input_internal_link_status)`
- `$(COEX:input_internal_status)`
- `$(COEX:input_internal_port_id)`
- `$(COEX:input_internal_color_depth)`
- `$(COEX:all_input_statuses)`

#### Device and monitoring

- `$(COEX:device_custom_name)`
- `$(COEX:device_name)`
- `$(COEX:device_sn)`
- `$(COEX:device_mac)`
- `$(COEX:device_ip)`
- `$(COEX:device_hw_version)`
- `$(COEX:device_sw_version)`
- `$(COEX:main_board_temperature)`
- `$(COEX:fan_count)`
- `$(COEX:first_fan_speed)`
- `$(COEX:cabinet_count)`
- `$(COEX:screen_runtime)`

#### Presets

- `$(COEX:preset_1_name)` to `$(COEX:preset_10_name)`
- `$(COEX:preset_1_active)` to `$(COEX:preset_10_active)`

#### Debug variables

- `$(COEX:display_params_json)`
- `$(COEX:display_state_json)`
- `$(COEX:preset_info_json)`
- `$(COEX:device_info_json)`
- `$(COEX:input_sources_json)`
- `$(COEX:input_status_json)`
- `$(COEX:input_status_debug)`
- `$(COEX:last_command_response)`

### Notes

- COEX input source values are not assumed to be the same on every processor. The module uses the reported `groupID` values when building source menus and presets.
- In Sender Only mode, the layer used by COEX is reported as layer `1`.
- In All-in-One mode, the module ignores the non-layer `1` entry and uses the actual layer IDs reported by COEX.
- For COEX hardware/API versions below `1.4.0`, some commands do not use screen UUIDs. The module detects this from `$(COEX:device_hw_version)` and switches those commands to the older `/api/v1/device/...` routes.
- Some COEX API calls can return success while the visible effect depends on the processor working mode or current VMP/device state.
- Sending card test patterns use `/api/v1/device/input/pattern/test` on current firmware and `/api/v1/device/screen/controller/pattern/test` on legacy firmware. Full color presets use 12-bit style values (`4095`) based on NovaStar COEX examples.
