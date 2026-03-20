import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findLvglColorsInText,
  formatEditedToken,
  isPaletteExpression,
  parseHex3,
  parseHex6,
  parseHex8,
  parseLvColorMake,
  toHex3,
  toHex6,
  tryCompressHex6ToHex3,
  type ColorValue,
} from '../src/lvglColorCore';

function assertColor(
  actual: ColorValue | undefined,
  expected: { red: number; green: number; blue: number; alpha?: number },
): void {
  assert.ok(actual, 'expected a color value');
  assert.equal(actual.red, expected.red / 255);
  assert.equal(actual.green, expected.green / 255);
  assert.equal(actual.blue, expected.blue / 255);
  assert.equal(actual.alpha, expected.alpha ?? 1);
}

test('parseHex6 parses RGB hex literals', () => {
  assertColor(parseHex6('0xFFA500'), { red: 255, green: 165, blue: 0 });
  assert.equal(parseHex6('0xFFFF'), undefined);
});

test('parseHex3 expands shorthand RGB hex literals', () => {
  assertColor(parseHex3('0xFA5'), { red: 255, green: 170, blue: 85 });
  assert.equal(parseHex3('0xFA55'), undefined);
});

test('parseHex8 ignores the leading byte and uses the RGB bytes', () => {
  assertColor(parseHex8('0x80FFA500'), { red: 255, green: 165, blue: 0 });
  assert.equal(parseHex8('0x123456'), undefined);
});

test('parseLvColorMake accepts function and macro forms with decimal and hex byte arguments', () => {
  assertColor(parseLvColorMake('lv_color_make(255, 170, 0)'), { red: 255, green: 170, blue: 0 });
  assertColor(parseLvColorMake('lv_color_make(0xFF, 0xAA, 0x00)'), { red: 255, green: 170, blue: 0 });
  assertColor(parseLvColorMake('LV_COLOR_MAKE(0X0F, 0x80, 0Xc0)'), { red: 15, green: 128, blue: 192 });
  assert.equal(parseLvColorMake('lv_color_make(256, 0, 0)'), undefined);
});

test('toHex helpers keep uppercase output', () => {
  const color: ColorValue = { alpha: 1, blue: 0, green: 165 / 255, red: 1 };
  assert.equal(toHex6(color), '0xFFA500');
  assert.equal(toHex3({ alpha: 1, blue: 85 / 255, green: 170 / 255, red: 1 }), '0xFA5');
});

test('tryCompressHex6ToHex3 compresses only when nibble pairs match', () => {
  assert.equal(tryCompressHex6ToHex3('0xAABBCC'), '0xABC');
  assert.equal(tryCompressHex6ToHex3('0xABCD12'), undefined);
});

test('formatEditedToken preserves lv_color_make style, macro name, and hex8 prefix byte', () => {
  const color: ColorValue = { alpha: 1, blue: 0x56 / 255, green: 0x34 / 255, red: 0x12 / 255 };

  assert.equal(formatEditedToken('0x80AABBCC', color), '0x80123456');
  assert.equal(formatEditedToken('lv_color_make(255, 170, 0)', color), 'lv_color_make(18, 52, 86)');
  assert.equal(formatEditedToken('LV_COLOR_MAKE(0xFF, 0xAA, 0x00)', color), 'LV_COLOR_MAKE(0x12, 0x34, 0x56)');
});

test('palette expressions are decorator-only', () => {
  const color: ColorValue = { alpha: 1, blue: 0, green: 0, red: 1 };

  assert.equal(isPaletteExpression('lv_palette_main(LV_PALETTE_RED)'), true);
  assert.equal(formatEditedToken('lv_palette_main(LV_PALETTE_RED)', color), undefined);
});

test('findLvglColorsInText matches default supported forms and ignores comments, strings, and unrelated calls', () => {
  const source = [
    'lv_color_hex(0xFFA500);',
    'lv_color_hex(0x80FFA500);',
    'lv_color_hex3(0xFA5);',
    'lv_color_make(255, 170, 0);',
    'LV_COLOR_MAKE(0xFF, 0xAA, 0x00);',
    '"LV_COLOR_MAKE(0x11, 0x22, 0x33)";',
    '/* lv_color_make(0x10, 0x20, 0x30) */',
    'foo(0xFFA500);',
  ].join('\n');

  const matches = findLvglColorsInText(source);

  assert.equal(matches.length, 5);
  assert.deepEqual(matches.map((match) => match.format), ['hex6', 'hex8', 'hex3', 'makeFunction', 'makeMacro']);
  assert.equal(source.slice(matches[0].start, matches[0].end), '0xFFA500');
  assert.equal(source.slice(matches[1].start, matches[1].end), '0x80FFA500');
  assert.equal(source.slice(matches[3].start, matches[3].end), 'lv_color_make(255, 170, 0)');
  assert.equal(source.slice(matches[4].start, matches[4].end), 'LV_COLOR_MAKE(0xFF, 0xAA, 0x00)');
});

test('findLvglColorsInText can disable LV_COLOR_MAKE support', () => {
  const source = 'LV_COLOR_MAKE(0xFF, 0xAA, 0x00);';

  const matches = findLvglColorsInText(source, { enableColorMakeMacro: false });

  assert.equal(matches.length, 0);
});

test('findLvglColorsInText can enable palette decorators for literal palette calls', () => {
  const source = [
    'lv_palette_main(LV_PALETTE_RED);',
    'lv_palette_lighten(LV_PALETTE_BLUE, 2);',
    'lv_palette_darken(LV_PALETTE_GREEN, 0x03);',
    'lv_palette_lighten(LV_PALETTE_ORANGE, 6);',
  ].join('\n');

  const matches = findLvglColorsInText(source, { enablePaletteDecorators: true });

  assert.equal(matches.length, 3);
  assert.deepEqual(matches.map((match) => match.format), ['palette', 'palette', 'palette']);
  assert.equal(source.slice(matches[0].start, matches[0].end), 'LV_PALETTE_RED');
  assert.equal(source.slice(matches[1].start, matches[1].end), 'LV_PALETTE_BLUE');
  assert.equal(source.slice(matches[2].start, matches[2].end), 'LV_PALETTE_GREEN');
  assertColor(matches[0].color, { red: 244, green: 67, blue: 54 });
  assertColor(matches[1].color, { red: 100, green: 181, blue: 246 });
  assertColor(matches[2].color, { red: 46, green: 125, blue: 50 });
});
