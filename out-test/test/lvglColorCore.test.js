"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const lvglColorCore_1 = require("../src/lvglColorCore");
function assertColor(actual, expected) {
    strict_1.default.ok(actual, 'expected a color value');
    strict_1.default.equal(actual.red, expected.red / 255);
    strict_1.default.equal(actual.green, expected.green / 255);
    strict_1.default.equal(actual.blue, expected.blue / 255);
    strict_1.default.equal(actual.alpha, expected.alpha ?? 1);
}
(0, node_test_1.default)('parseHex6 parses RGB hex literals', () => {
    assertColor((0, lvglColorCore_1.parseHex6)('0xFFA500'), { red: 255, green: 165, blue: 0 });
    strict_1.default.equal((0, lvglColorCore_1.parseHex6)('0xFFFF'), undefined);
});
(0, node_test_1.default)('parseHex3 expands shorthand RGB hex literals', () => {
    assertColor((0, lvglColorCore_1.parseHex3)('0xFA5'), { red: 255, green: 170, blue: 85 });
    strict_1.default.equal((0, lvglColorCore_1.parseHex3)('0xFA55'), undefined);
});
(0, node_test_1.default)('parseHex8 ignores the leading byte and uses the RGB bytes', () => {
    assertColor((0, lvglColorCore_1.parseHex8)('0x80FFA500'), { red: 255, green: 165, blue: 0 });
    strict_1.default.equal((0, lvglColorCore_1.parseHex8)('0x123456'), undefined);
});
(0, node_test_1.default)('parseLvColorMake accepts decimal and hex byte arguments', () => {
    assertColor((0, lvglColorCore_1.parseLvColorMake)('lv_color_make(255, 170, 0)'), { red: 255, green: 170, blue: 0 });
    assertColor((0, lvglColorCore_1.parseLvColorMake)('lv_color_make(0xFF, 0xAA, 0x00)'), { red: 255, green: 170, blue: 0 });
    assertColor((0, lvglColorCore_1.parseLvColorMake)('lv_color_make(0X0F, 0x80, 0Xc0)'), { red: 15, green: 128, blue: 192 });
    strict_1.default.equal((0, lvglColorCore_1.parseLvColorMake)('lv_color_make(256, 0, 0)'), undefined);
});
(0, node_test_1.default)('toHex helpers keep uppercase output', () => {
    const color = { alpha: 1, blue: 0, green: 165 / 255, red: 1 };
    strict_1.default.equal((0, lvglColorCore_1.toHex6)(color), '0xFFA500');
    strict_1.default.equal((0, lvglColorCore_1.toHex3)({ alpha: 1, blue: 85 / 255, green: 170 / 255, red: 1 }), '0xFA5');
});
(0, node_test_1.default)('tryCompressHex6ToHex3 compresses only when nibble pairs match', () => {
    strict_1.default.equal((0, lvglColorCore_1.tryCompressHex6ToHex3)('0xAABBCC'), '0xABC');
    strict_1.default.equal((0, lvglColorCore_1.tryCompressHex6ToHex3)('0xABCD12'), undefined);
});
(0, node_test_1.default)('formatEditedToken preserves lv_color_make numeric style and hex8 prefix byte', () => {
    const color = { alpha: 1, blue: 0x56 / 255, green: 0x34 / 255, red: 0x12 / 255 };
    strict_1.default.equal((0, lvglColorCore_1.formatEditedToken)('0x80AABBCC', color), '0x80123456');
    strict_1.default.equal((0, lvglColorCore_1.formatEditedToken)('lv_color_make(255, 170, 0)', color), 'lv_color_make(18, 52, 86)');
    strict_1.default.equal((0, lvglColorCore_1.formatEditedToken)('lv_color_make(0xFF, 0xAA, 0x00)', color), 'lv_color_make(0x12, 0x34, 0x56)');
});
(0, node_test_1.default)('findLvglColorsInText matches supported forms and ignores comments, strings, and unrelated calls', () => {
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
    const matches = (0, lvglColorCore_1.findLvglColorsInText)(source);
    strict_1.default.equal(matches.length, 5);
    strict_1.default.deepEqual(matches.map((match) => match.format), ['hex6', 'hex8', 'hex3', 'make', 'make']);
    strict_1.default.equal(source.slice(matches[0].start, matches[0].end), '0xFFA500');
    strict_1.default.equal(source.slice(matches[1].start, matches[1].end), '0x80FFA500');
    strict_1.default.equal(source.slice(matches[3].start, matches[3].end), 'lv_color_make(255, 170, 0)');
});
//# sourceMappingURL=lvglColorCore.test.js.map