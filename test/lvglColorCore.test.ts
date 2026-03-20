import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findLvglColorsInText,
  formatEditedToken,
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

test('parseLvColorMake accepts decimal and hex byte arguments', () => {
  assertColor(parseLvColorMake('lv_color_make(255, 170, 0)'), { red: 255, green: 170, blue: 0 });
  assertColor(parseLvColorMake('lv_color_make(0xFF, 0xAA, 0x00)'), { red: 255, green: 170, blue: 0 });
  assertColor(parseLvColorMake('lv_color_make(0X0F, 0x80, 0Xc0)'), { red: 15, green: 128, blue: 192 });
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

test('formatEditedToken preserves lv_color_make numeric style and hex8 prefix byte', () => {
  const color: ColorValue = { alpha: 1, blue: 0x56 / 255, green: 0x34 / 255, red: 0x12 / 255 };

  assert.equal(formatEditedToken('0x80AABBCC', color), '0x80123456');
  assert.equal(formatEditedToken('lv_color_make(255, 170, 0)', color), 'lv_color_make(18, 52, 86)');
  assert.equal(formatEditedToken('lv_color_make(0xFF, 0xAA, 0x00)', color), 'lv_color_make(0x12, 0x34, 0x56)');
});

test('findLvglColorsInText matches supported forms and ignores comments, strings, and unrelated calls', () => {
  const source = [
    'lv_color_hex(0xFFA500);',
    'lv_color_hex(0x80FFA500);',
    'lv_color_hex3(0xFA5);',
    'lv_color_make(255, 170, 0);',
    'lv_color_make(0xFF, 0xAA, 0x00);',
    '"lv_color_hex(0x112233)";',
    '/* lv_color_make(0x10, 0x20, 0x30) */',
    'foo(0xFFA500);',
  ].join('\n');

  const matches = findLvglColorsInText(source);

  assert.equal(matches.length, 5);
  assert.deepEqual(matches.map((match) => match.format), ['hex6', 'hex8', 'hex3', 'make', 'make']);
  assert.equal(source.slice(matches[0].start, matches[0].end), '0xFFA500');
  assert.equal(source.slice(matches[1].start, matches[1].end), '0x80FFA500');
  assert.equal(source.slice(matches[3].start, matches[3].end), 'lv_color_make(255, 170, 0)');
});
