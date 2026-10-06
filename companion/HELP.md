## companion-module-novastar-coex

This module is based on [novastar-coex](https://github.com/atomicinfotech/novastar-coex), so a lot of the notes and documentation are applicable to this project.

# Currently Supported Actions

- Change Input Source
- Brightness
- Display Mode
- Blackout
- Normal
- Freeze
- Gamma
- Color Temperature
- Preset
- Working Mode
- Test Pattern

# Full API coverage

Everything the NovaStar COEX OpenAPI offers for live operation is now available as actions, feedbacks and variables. The module reconnects on its own if the controller is rebooted or the network drops.

## Actions

**Display / screen:** Display mode per screen, brightness per screen, brightness up/down step, color temperature, gamma, brightness limit (on/off, nits or %), color gamut, 3D LUT on/off and strength, color correction on/off, brightness schedule on/off, multi-mode, output bit depth, output sync source, 3D and 3D emitter, primary/backup verify.

**Layers / inputs:** Layer source (All-in-One mode, per screen and layer), input saturation, contrast, black level, hue, RGB shadow and highlight per color, color reset, EDID, HDR mode, internal source format, sending-card test pattern on/off.

**Device:** Audio (SPDIF) output, controller identify (LCD color), controller mapping, set controller time to Companion time, automatic time/NTP, time zone, controller name, SNMP, refresh all data.

**Cabinets / receiving cards** (IDs comma separated, empty = all): test pattern, cabinet mapping (numbers on screen), brightness (% or nits), RGB brightness, RGBW component, color temperature, behaviour without signal (black/last frame), thermal compensation on/off, strength and mode, multi-mode.

## Feedbacks

Display mode, preset active, brightness compare, color temperature color, input has signal, any input signal, input on screen/layer, input HDR mode, output bit depth, 3D on, color gamut, multi-mode, schedule on, device health (alarm/fault anywhere), cabinet problem (any/link/fault), fewer cabinets than expected, temperature above (mainboard/chips/cabinets), port/output/card not OK, backup configured, audio on, SNMP on, test pattern on, multifunction card connected, controller connected.

## Variables

- **Display:** `display_state`, `blackout_active`, `freeze_active`, `canvas_N_state`, `current_preset_name`, `connected`
- **Screens:** `screen_N_name`, `_brightness`, `_brightness_num`, `_colortemp`, `_gamma`, `_working_mode`, `_frame_rate`, `_active_input`, `_layer_M_input`, `_bitdepth`, `_bitdepth_current`, `_output_framerate`, `_3d`, `_low_latency`, `_gamut`, `_multimode`, `_schedule`
- **Inputs:** `input_N_name`, `_id`, `_type`, `_signal`, `_resolution`, `_bitdepth`, `_range`, `_edid`, `_hdr_mode`, `_hdr_current`, `_contrast`, `_saturation`, `_hue`, `inputs_with_signal`, `test_pattern`
- **Controller health:** `device_health`, `device_health_detail`, `mainboard_temp`, `mainboard_voltage`, `fan_N_speed`, `temp_N`, `port_N_status`, `output_N_status`, `card_N_status`, `device_runtime`, `device_total_runtime`
- **Cabinets:** `cabinet_count`, `cabinet_count_configured`, `rvcard_count`, `cabinet_errors`, `cabinet_error_list`, `cabinet_link_errors`, `cabinet_max_temp`, `cabinet_max_humidity`, `cabinet_min_voltage`
- **Device:** `device_model`, `device_custom_name`, `device_sn`, `device_firmware`, `device_hw_version`, `device_ip`, `device_mac`, `device_mode`, `device_update_state`, `device_memory_used`
- **Backup / audio / SNMP / sensors:** `backup_master_name`, `backup_backup_name`, `backup_configured`, `backup_status_code`, `audio_output`, `audio_source`, `snmp`, `mfcard_N_link`, `mfcard_N_light`, `mfcard_N_temp`, `mfcard_N_humidity`, `mfcard_N_power`

Variables only appear when the controller reports the data. Functions the firmware doesn't support (e.g. audio before V1.5.0) are detected and skipped automatically.

## Presets

Blackout/Freeze toggles, display status, controller health, cabinet status, connection status, brightness ±5 %, cabinet mapping (hold), one button per input per screen layer (green = on layer, red text = no signal), one button per input (Send-Only mode), one button per preset.

## Polling

Display state, brightness and presets at the configured interval (default 500 ms), inputs and layers every 2nd cycle, health/cabinets/output settings every ~5 s, device info and cabinet list every ~30 s.

## Not included

3D LUT file upload/delete, custom gamma tables, custom gamut coordinates, detailed color correction data, canvas mapping and moving cabinets, preset editing and log export. These need files or large data sets and are better done in VMP.

# Compatibility

This module has been tested extensively with the MX40 Pro processor, but it should work with all NovaStar COEX/VMP devices (MX40 Pro, KU20, CX80 Pro).

# Known Issues

1. Input selection currently only works when processor is in "Send Only" working mode. Input selection on layers when in All in One mode is not yet supported. As soon as the API supports it, and we get documentation, it will be implemented.

2. Setting working mode to 3 (All-In-One) doesn't work.

3. If you are running COEX VMP software, the processor will be locked to only recieve API commands from that device/ip. Attempting to run API commands from any other device/IP will return a "device locked" error. Current workaround is to close VMP, or run the commands from the same computer that is running the VMP software client.

Submit issues on [Github](https://github.com/bitfocus/companion-module-novastar-coex/issues)
