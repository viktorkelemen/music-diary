# Daisy Seed 3 Eurorack Dev Kit

This target is for the official **Seed 3 Eurorack Dev Kit**, also sold as the
Eurorack starter kit. It uses the same six-band analyser, twelve sine oscillators,
exact envelope freeze, fifteen chord banks and stereo routing as Legio.
The larger panel provides independent Q and sine-release controls.

## Panel map

Numbers follow the PCB/front-panel VR1..VR8 and CV IN 1..4 labels, not physical
left-to-right guesses. Toggle orientation uses libDaisy's logical position names;
confirm physical left/right on the kit.

| Control | Function |
|---|---|
| VR1 | Chromatic root C1–C3; center C2; changing root resets rotation |
| VR2 | Analysis Q, exponential 2–250 |
| VR3 | Sine-envelope release, exponential 30 ms–4 s, independent of Q |
| VR4 | Bank: HEX, cvChord, Chordery 14–26, with selection hysteresis |
| VR5 | Chord/key position in current bank, with selection hysteresis |
| VR6 | Input feed gain 0–100%, smoothed over ~10 ms |
| VR7 | Output level 0–100%, smoothed over ~10 ms |
| VR8 | Reserved |
| SW1 tactile | Advance one chord/key, wrapping |
| SW2 tactile | Octave 0 → +1 → −1 → 0 |
| SW3 three-position toggle | Center Resynth / logical left Resonator / logical right Both; 5.33 ms debounce then 5 ms crossfade |
| SW4 two-position toggle | Closed/pressed = latch freeze; open = live unless Gate 1 is high |
| RGB LED | Blue Resynth / red Resonator / magenta Both; green 1–15 bank blink count overlays mode color |
| Mono LED | On while frozen |

The USB log also reports the exact numeric mode (0/1/2). Bank announcements
restart after a persisted selection change, including octave/mode.

## Connections

| Jack | Function |
|---|---|
| AUDIO IN L/R | Averaged mono excitation for the analysis bank |
| AUDIO OUT L/R | Odd/even bands, respectively; 100% wet |
| CV IN 1 | Original stepped rotation: rising 0.42 V thresholds, 20 mV hysteresis; negative voltage clamps to zero |
| CV IN 2 | Additive Q position: +5 V adds the full normalized knob travel, −5 V subtracts it |
| CV IN 3 | Additive release position with the same normalized scaling |
| CV IN 4 | Additive root position: +5 V adds 24 semitones; final root clamps to C1–C3 |
| GATE IN 1 | High = exact freeze; ORed with SW4 |
| GATE IN 2 | Rising edge advances chord/key; short triggers sampled per audio frame |
| CV OUT 1/2 | Reserved, held at 0 V |
| MIDI / microSD | Reserved |

CV voltage conversion is isolated in `firmware/seed3/main.cpp`: the official
bipolar ADC reading is multiplied by 5 for nominal volts. Voltage accuracy has
not been measured on this module. Chord knob moves select an absolute position;
CV, Gate 2 and SW1 advance from that position. Root/bank moves retain the source
rotation-reset behavior. All state changes preserve oscillator phase.

Release formula for the summed, clamped VR3/CV3 position `x`:
`tau = 0.030 * (4.0 / 0.030)^x` seconds. Attack remains 2 ms.
In Resynth/Both, freeze holds all envelopes exactly; in Resonator, the unchanged
raw filter tail decays. Input mute ramps to zero over 5 ms in every mode.

## First play

1. Connect a sound to AUDIO IN L/R and patch AUDIO OUT L/R to a stereo mixer.
2. Put VR1 at center, VR2 around halfway, and VR3 around three-quarters.
3. Turn VR6 and VR7 up; either at zero mutes the signal path.
4. First boot starts in HEX / octave 0 / Resynth. VR5 selects the chord position.
5. Sweep VR4 to select banks, then use VR5 or SW1 to change harmony.
6. Close SW4 or raise Gate 1 to hold a sine chord indefinitely.

## Settings

Bank, octave and output mode save after two idle seconds at QSPI `0x7fe000`,
separate from the final sector used by Legio/Bloom. Blank/recognized sectors are
writable; unrelated nonempty data disables saves and uses defaults. The firmware
prints `persistence=0` in that case. Saved bank/mode win until the corresponding
physical selector moves; root, Q, release, chord position and gains come from the
panel. Settings writes use libDaisy PersistentStorage and are not power-fail atomic.

## Build

```sh
git clone --recurse-submodules git@github.com:viktorkelemen/spectral-chord-resynth.git
cd spectral-chord-resynth
make test
make sanitize
make libs-seed3 -j4 GCC_PATH=/path/to/arm-gnu-toolchain/bin
make firmware-seed3 GCC_PATH=/path/to/arm-gnu-toolchain/bin
```

Output: `firmware/seed3/build/spectral_chord_resynth_seed3.{elf,hex,bin}`.
Validated with Arm GNU 15.2.1: 120,928 bytes flash, 74,272 bytes SRAM and
16,960 bytes D2 RAM. Standard upstream newlib syscall/RWX warnings remain.
Legio uses `make libs` / `make firmware` and a separate library pin/output name.

`make package` builds both targets and writes versioned binaries, ELF/HEX,
SHA-256 hashes and a manifest into `dist/`. The website provides the two `.bin`
images and their manifest for download. These are compiled builds; neither
hardware target was flashed during this task.

## Manual flashing

Use the **Seed 3's own USB port**. Hold BOOT, tap RESET, release BOOT to enter
STM32 ROM DFU. With `dfu-util` installed:

```sh
make -C firmware/seed3 program-dfu
```

This `BOOT_NONE` build writes internal flash at `0x08000000` and replaces the
current application/bootloader. The dev kit's separate external USB connector
does not expose ROM DFU. No automatic flash action is part of any build/package
command. Back up your current firmware before choosing to replace it.

## Verification

`make test` retains the original DSP/chord/control tests and adds the Seed 3 panel
adapter, selector hysteresis, CV summing/clamps, bank/chord ranges, octave/mode
handling, saved selection pickup, and independent-release behavior in the real
DSP. At the same Q=2, a 4-second release produces over 1,000 times the remaining
envelope of a 30-ms release 500 ms after an impulse. Exact freeze and default
Legio compatibility also pass. `make sanitize` includes these tests.

USB logs include bank, mode, persistence availability, and peak user-callback
CPU percentage. This excludes libDaisy conversion/interrupt overhead and is not
a complete deadline benchmark. Bench timing, audible output, voltage calibration,
LED/toggle physical orientation and power-cycle persistence remain unverified.

## Official references

- [Seed 3 Eurorack Dev Kit](https://docs.daisy.audio/product/Seed3-Euro-Dev-Kit/)
- [Hardware API](https://docs.daisy.audio/libDaisy/classdaisy_1_1eurorack__devkit_1_1Hardware/)
- [Pinout PDF](https://daisy.nyc3.cdn.digitaloceanspaces.com/products/seed-3-euro/seed-3-euro-dev-kit-pinout.pdf)
- [Pinned hardware adapter](https://github.com/electro-smith/libDaisy/blob/08087203debc646d3710ec8caa35bac6cf20ab5e/src/eurorack_devkit.cpp)
