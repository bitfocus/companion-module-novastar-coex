# companion-module-novastar-coex

Bitfocus Companion module for controlling NovaStar COEX processors through the COEX HTTP API.

This module has been tested with COEX firmware **1.4.0**, **1.5.0**, and **1.5.1** in both **Sender Only** and **All-in-One** working modes.

It also includes compatibility routes for older COEX hardware/API versions reported by
`$(COEX:device_hw_version)` below **1.4.0**.

## Features

- Screen brightness, gamma, and color temperature control
- Normal, blackout, and freeze display modes
- Source switching by COEX layer and input `groupID`
- Canvas mapping toggle with feedback
- COEX preset recall with active-state feedback
- Device identification
- Sending card test patterns
- Dynamic source and layer dropdowns based on values reported by the processor
- Ready-to-use Companion presets for common controls
- Device, screen, source, layer, and monitoring variables

## Configuration

The module requires:

- **Device IP**
- **Device Port**, default `8001`

The module automatically reads the first screen reported by the processor. Action fields using `Screen ID` can usually be left at the default value `1`; the module resolves it internally to the real COEX screen UUID.

## Tested Hardware / Firmware

Tested on NovaStar COEX electronics running firmware **1.4.0**, **1.5.0**, and **1.5.1**:

- Sender Only mode
- All-in-One mode

Other COEX firmware versions or hardware variants may expose different input groups, layer IDs, or monitoring fields.

For versions below **1.4.0**, the module switches the affected commands to older device-level API routes:
display mode, source switching, preset recall, and sending card test pattern.

## Main Controls

Actions include:

- Set / adjust brightness
- Set / adjust gamma
- Set / adjust color temperature
- Set normal / blackout / freeze modes
- Switch source for layer
- Enable canvas mapping
- Apply preset
- Device identify
- Set sending card test pattern

Feedbacks include:

- Brightness matches value
- Display mode is active
- Preset is active
- Canvas mapping is enabled
- Layer source is active

## Variables

The module exposes variables for:

- Screen state: brightness, gamma, color temperature, display mode, working mode
- Layers and sources: layer IDs, current layer sources, input groups
- Input status: link status, port ID, status values
- Device info: name, custom name, IP, MAC, serial number, hardware/software versions
- Monitoring: main board temperature, fan info, runtime, cabinet count
- COEX presets: preset names and active states
- Debug JSON responses for troubleshooting

For the complete variable list and Companion usage details, see [companion/HELP.md](./companion/HELP.md).

## Source Switching Notes

COEX input values should not be assumed to be the same on every processor. The module reads available inputs from the processor and uses the reported `groupID` values when building dropdowns and presets.

In Sender Only mode, COEX reports layer `1`. In All-in-One mode, the module uses the actual layer IDs reported by COEX and avoids treating the non-layer `1` entry as a usable layer.

## License

MIT. See [LICENSE](./LICENSE).
