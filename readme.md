# LVGL Color Tools

LVGL-aware color decorators and color picker editing for C and C++ files in Visual Studio Code.

## What It Does

This extension recognizes supported LVGL color helper calls and lets VS Code show native color decorators only on the hex argument, not on unrelated numeric literals.

Supported patterns in the MVP:

```c
lv_color_hex(0xFFA500)
lv_color_hex(0xFFAA5500)
lv_color_hex3(0xFA5)
```

Supported spacing variants:

```c
lv_color_hex(  0xFFA500 )
lv_color_hex( 0xFFAA5500 )
lv_color_hex3(0xFA5 )
```

## Behavior

The extension:

- highlights only the hex token inside supported LVGL calls
- uses the built-in VS Code color picker
- writes edited values back in uppercase LVGL-compatible syntax
- preserves the leading byte of `0xAARRGGBB` values while editing only the RGB portion
- ignores unrelated hex literals such as `0xFFA500` outside the supported functions

Examples that should be decorated:

```c
lv_color_t orange = lv_color_hex(0xFFA500);
lv_color_t packed = lv_color_hex(0xFFAAAAAA);
lv_color_t soft = lv_color_hex( 0xAABBCC );
lv_color_t shortc = lv_color_hex3(0xFA5);
```

Examples that should not be decorated:

```c
uint32_t mask = 0xFFA500;
#define MY_HEX 0x123456
foo(0xABCDEF);
"lv_color_hex(0xFFA500)"
/* lv_color_hex(0xFFA500) */
```

## Current Scope

The MVP intentionally does not support:

- nested macros
- computed expressions
- variables passed to LVGL color helpers
- palette enums such as `LV_PALETTE_RED`
- theme-derived colors
- custom wrapper macros or functions

## Implementation Notes

The extension uses a `DocumentColorProvider` registered for `c` and `cpp`.

Detection is based on lightweight regex scanning plus a small text sanitizer that blanks out comments and quoted strings before matching. That keeps the implementation simple while avoiding the most obvious false positives.

For `lv_color_hex3(...)`, edited colors are quantized back to 12-bit RGB so the result stays valid as `0xRGB`.

For `lv_color_hex(0xAARRGGBB)`, the highest byte is treated as passthrough metadata. The color preview and picker use only `RRGGBB`, and edited values keep the original `AA` byte unchanged.

## Project Structure

```text
.
|-- .vscode/
|   |-- launch.json
|   `-- tasks.json
|-- src/
|   |-- extension.ts
|   `-- lvglColorProvider.ts
|-- CHANGELOG.md
|-- package.json
|-- readme.md
`-- tsconfig.json
```

## Build

Install dependencies:

```bash
npm install
```

Compile once:

```bash
npm run compile
```

Watch mode:

```bash
npm run watch
```

Package a VSIX:

```bash
npm run package
```

## Run In VS Code

1. Open this folder in VS Code.
2. Run `npm install`.
3. Run `npm run compile` or start the watcher.
4. Press `F5` to launch an Extension Development Host.
5. Open a C or C++ file containing supported LVGL color calls.

## Known Limitations

- Parsing is regex-based rather than AST-based.
- The comment/string sanitizer is intentionally lightweight and may not cover every edge case in preprocessor-heavy code.
- `lv_color_hex3(...)` edits are rounded to the nearest representable 12-bit color.
- `0xAARRGGBB` support treats `AA` as preserved metadata rather than an editable alpha channel.

## Next Improvements

- configurable function names
- LVGL project auto-detection
- stronger parsing for edge cases
- unit tests for parsing and formatting helpers
