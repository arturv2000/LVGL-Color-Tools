export type LvglColorFormat = 'hex3' | 'hex6' | 'hex8' | 'makeFunction' | 'makeMacro' | 'palette';

export interface ColorValue {
  alpha: number;
  blue: number;
  green: number;
  red: number;
}

export interface OffsetMatch {
  color: ColorValue;
  end: number;
  format: LvglColorFormat;
  start: number;
}

export interface LvglColorScanOptions {
  enableColorMakeMacro?: boolean;
  enablePaletteDecorators?: boolean;
}

interface LvglPattern {
  createOffsetMatch(match: RegExpExecArray): OffsetMatch | undefined;
  regex: RegExp;
}

interface PaletteEntry {
  darken: readonly [string, string, string, string];
  lighten: readonly [string, string, string, string, string];
  main: string;
}

const DEFAULT_SCAN_OPTIONS: Required<LvglColorScanOptions> = {
  enableColorMakeMacro: true,
  enablePaletteDecorators: false,
};

const BYTE_ARGUMENT_PATTERN = '(?:\\d{1,3}|0[xX][0-9a-fA-F]{1,2})';
const PALETTE_ENUM_PATTERN = 'LV_PALETTE_[A-Z_]+';
const LV_COLOR_MAKE_FUNCTION_REGEX = new RegExp(
  `\\blv_color_make\\b\\s*\\(\\s*(${BYTE_ARGUMENT_PATTERN})\\s*,\\s*(${BYTE_ARGUMENT_PATTERN})\\s*,\\s*(${BYTE_ARGUMENT_PATTERN})\\s*\\)`,
  'g',
);
const LV_COLOR_MAKE_MACRO_REGEX = new RegExp(
  `\\bLV_COLOR_MAKE\\b\\s*\\(\\s*(${BYTE_ARGUMENT_PATTERN})\\s*,\\s*(${BYTE_ARGUMENT_PATTERN})\\s*,\\s*(${BYTE_ARGUMENT_PATTERN})\\s*\\)`,
  'g',
);
const LV_COLOR_MAKE_SINGLE_REGEX = new RegExp(
  `\\b(lv_color_make|LV_COLOR_MAKE)\\b\\s*\\(\\s*(${BYTE_ARGUMENT_PATTERN})\\s*,\\s*(${BYTE_ARGUMENT_PATTERN})\\s*,\\s*(${BYTE_ARGUMENT_PATTERN})\\s*\\)`
);
const LV_PALETTE_MAIN_REGEX = new RegExp(`\\blv_palette_main\\b\\s*\\(\\s*(${PALETTE_ENUM_PATTERN})\\s*\\)`, 'g');
const LV_PALETTE_LIGHTEN_REGEX = new RegExp(
  `\\blv_palette_lighten\\b\\s*\\(\\s*(${PALETTE_ENUM_PATTERN})\\s*,\\s*(${BYTE_ARGUMENT_PATTERN})\\s*\\)`,
  'g',
);
const LV_PALETTE_DARKEN_REGEX = new RegExp(
  `\\blv_palette_darken\\b\\s*\\(\\s*(${PALETTE_ENUM_PATTERN})\\s*,\\s*(${BYTE_ARGUMENT_PATTERN})\\s*\\)`,
  'g',
);
const PALETTE_EXPRESSION_REGEX = /\blv_palette_(?:main|lighten|darken)\b/;

const PALETTE_MAP: Readonly<Record<string, PaletteEntry>> = {
  LV_PALETTE_RED: {
    main: '0xF44336',
    lighten: ['0xEF5350', '0xE57373', '0xEF9A9A', '0xFFCDD2', '0xFFEBEE'],
    darken: ['0xE53935', '0xD32F2F', '0xC62828', '0xB71C1C'],
  },
  LV_PALETTE_PINK: {
    main: '0xE91E63',
    lighten: ['0xEC407A', '0xF06292', '0xF48FB1', '0xF8BBD0', '0xFCE4EC'],
    darken: ['0xD81B60', '0xC2185B', '0xAD1457', '0x880E4F'],
  },
  LV_PALETTE_PURPLE: {
    main: '0x9C27B0',
    lighten: ['0xAB47BC', '0xBA68C8', '0xCE93D8', '0xE1BEE7', '0xF3E5F5'],
    darken: ['0x8E24AA', '0x7B1FA2', '0x6A1B9A', '0x4A148C'],
  },
  LV_PALETTE_DEEP_PURPLE: {
    main: '0x673AB7',
    lighten: ['0x7E57C2', '0x9575CD', '0xB39DDB', '0xD1C4E9', '0xEDE7F6'],
    darken: ['0x5E35B1', '0x512DA8', '0x4527A0', '0x311B92'],
  },
  LV_PALETTE_INDIGO: {
    main: '0x3F51B5',
    lighten: ['0x5C6BC0', '0x7986CB', '0x9FA8DA', '0xC5CAE9', '0xE8EAF6'],
    darken: ['0x3949AB', '0x303F9F', '0x283593', '0x1A237E'],
  },
  LV_PALETTE_BLUE: {
    main: '0x2196F3',
    lighten: ['0x42A5F5', '0x64B5F6', '0x90CAF9', '0xBBDEFB', '0xE3F2FD'],
    darken: ['0x1E88E5', '0x1976D2', '0x1565C0', '0x0D47A1'],
  },
  LV_PALETTE_LIGHT_BLUE: {
    main: '0x03A9F4',
    lighten: ['0x29B6F6', '0x4FC3F7', '0x81D4FA', '0xB3E5FC', '0xE1F5FE'],
    darken: ['0x039BE5', '0x0288D1', '0x0277BD', '0x01579B'],
  },
  LV_PALETTE_CYAN: {
    main: '0x00BCD4',
    lighten: ['0x26C6DA', '0x4DD0E1', '0x80DEEA', '0xB2EBF2', '0xE0F7FA'],
    darken: ['0x00ACC1', '0x0097A7', '0x00838F', '0x006064'],
  },
  LV_PALETTE_TEAL: {
    main: '0x009688',
    lighten: ['0x26A69A', '0x4DB6AC', '0x80CBC4', '0xB2DFDB', '0xE0F2F1'],
    darken: ['0x00897B', '0x00796B', '0x00695C', '0x004D40'],
  },
  LV_PALETTE_GREEN: {
    main: '0x4CAF50',
    lighten: ['0x66BB6A', '0x81C784', '0xA5D6A7', '0xC8E6C9', '0xE8F5E9'],
    darken: ['0x43A047', '0x388E3C', '0x2E7D32', '0x1B5E20'],
  },
  LV_PALETTE_LIGHT_GREEN: {
    main: '0x8BC34A',
    lighten: ['0x9CCC65', '0xAED581', '0xC5E1A5', '0xDCEDC8', '0xF1F8E9'],
    darken: ['0x7CB342', '0x689F38', '0x558B2F', '0x33691E'],
  },
  LV_PALETTE_LIME: {
    main: '0xCDDC39',
    lighten: ['0xD4E157', '0xDCE775', '0xE6EE9C', '0xF0F4C3', '0xF9FBE7'],
    darken: ['0xC0CA33', '0xAFB42B', '0x9E9D24', '0x827717'],
  },
  LV_PALETTE_YELLOW: {
    main: '0xFFEB3B',
    lighten: ['0xFFEE58', '0xFFF176', '0xFFF59D', '0xFFF9C4', '0xFFFDE7'],
    darken: ['0xFDD835', '0xFBC02D', '0xF9A825', '0xF57F17'],
  },
  LV_PALETTE_AMBER: {
    main: '0xFFC107',
    lighten: ['0xFFCA28', '0xFFD54F', '0xFFE082', '0xFFECB3', '0xFFF8E1'],
    darken: ['0xFFB300', '0xFFA000', '0xFF8F00', '0xFF6F00'],
  },
  LV_PALETTE_ORANGE: {
    main: '0xFF9800',
    lighten: ['0xFFA726', '0xFFB74D', '0xFFCC80', '0xFFE0B2', '0xFFF3E0'],
    darken: ['0xFB8C00', '0xF57C00', '0xEF6C00', '0xE65100'],
  },
  LV_PALETTE_DEEP_ORANGE: {
    main: '0xFF5722',
    lighten: ['0xFF7043', '0xFF8A65', '0xFFAB91', '0xFFCCBC', '0xFBE9E7'],
    darken: ['0xF4511E', '0xE64A19', '0xD84315', '0xBF360C'],
  },
  LV_PALETTE_BROWN: {
    main: '0x795548',
    lighten: ['0x8D6E63', '0xA1887F', '0xBCAAA4', '0xD7CCC8', '0xEFEBE9'],
    darken: ['0x6D4C41', '0x5D4037', '0x4E342E', '0x3E2723'],
  },
  LV_PALETTE_BLUE_GREY: {
    main: '0x607D8B',
    lighten: ['0x78909C', '0x90A4AE', '0xB0BEC5', '0xCFD8DC', '0xECEFF1'],
    darken: ['0x546E7A', '0x455A64', '0x37474F', '0x263238'],
  },
  LV_PALETTE_GREY: {
    main: '0x9E9E9E',
    lighten: ['0xBDBDBD', '0xE0E0E0', '0xEEEEEE', '0xF5F5F5', '0xFAFAFA'],
    darken: ['0x757575', '0x616161', '0x424242', '0x212121'],
  },
};

export function findLvglColorsInText(text: string, options?: LvglColorScanOptions): OffsetMatch[] {
  const sanitizedText = sanitizeTextForScanning(text);
  const matches: OffsetMatch[] = [];

  for (const pattern of getLvglPatterns(options)) {
    pattern.regex.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = pattern.regex.exec(sanitizedText)) !== null) {
      const offsetMatch = pattern.createOffsetMatch(match);
      if (!offsetMatch) {
        continue;
      }

      matches.push(offsetMatch);

      if (pattern.regex.lastIndex === match.index) {
        pattern.regex.lastIndex += 1;
      }
    }
  }

  return matches.sort((left, right) => left.start - right.start);
}

export function parseHex6(token: string): ColorValue | undefined {
  const normalized = stripHexPrefix(token);
  if (!/^[0-9A-Fa-f]{6}$/.test(normalized)) {
    return undefined;
  }

  return {
    alpha: 1,
    blue: parseInt(normalized.slice(4, 6), 16) / 255,
    green: parseInt(normalized.slice(2, 4), 16) / 255,
    red: parseInt(normalized.slice(0, 2), 16) / 255,
  };
}

export function parseHex3(token: string): ColorValue | undefined {
  const normalized = stripHexPrefix(token);
  if (!/^[0-9A-Fa-f]{3}$/.test(normalized)) {
    return undefined;
  }

  const expanded = normalized
    .split('')
    .map((digit) => `${digit}${digit}`)
    .join('');

  return parseHex6(`0x${expanded}`);
}

export function parseHex8(token: string): ColorValue | undefined {
  const normalized = stripHexPrefix(token);
  if (!/^[0-9A-Fa-f]{8}$/.test(normalized)) {
    return undefined;
  }

  return parseHex6(`0x${normalized.slice(2)}`);
}

export function parseLvColorMake(token: string): ColorValue | undefined {
  const match = LV_COLOR_MAKE_SINGLE_REGEX.exec(token);
  if (!match) {
    return undefined;
  }

  const red = parseByteLiteral(match[2]);
  const green = parseByteLiteral(match[3]);
  const blue = parseByteLiteral(match[4]);

  if (red === undefined || green === undefined || blue === undefined) {
    return undefined;
  }

  return {
    alpha: 1,
    blue: blue / 255,
    green: green / 255,
    red: red / 255,
  };
}

export function toHex6(color: ColorValue): string {
  return `0x${channelToByteHex(color.red)}${channelToByteHex(color.green)}${channelToByteHex(color.blue)}`;
}

export function toHex3(color: ColorValue): string {
  return `0x${channelToNibbleHex(color.red)}${channelToNibbleHex(color.green)}${channelToNibbleHex(color.blue)}`;
}

export function tryCompressHex6ToHex3(token: string): string | undefined {
  const normalized = stripHexPrefix(token).toUpperCase();
  if (!/^[0-9A-F]{6}$/.test(normalized)) {
    return undefined;
  }

  if (
    normalized[0] === normalized[1] &&
    normalized[2] === normalized[3] &&
    normalized[4] === normalized[5]
  ) {
    return `0x${normalized[0]}${normalized[2]}${normalized[4]}`;
  }

  return undefined;
}

export function formatEditedToken(originalToken: string, color: ColorValue): string | undefined {
  const format = detectTokenFormat(originalToken);

  if (format === 'palette') {
    return undefined;
  }

  if (format === 'makeFunction' || format === 'makeMacro') {
    return toLvColorMake(color, prefersHexByteArguments(originalToken), format === 'makeMacro');
  }

  if (format === 'hex3') {
    return toHex3(color);
  }

  if (format === 'hex8') {
    const normalized = stripHexPrefix(originalToken).toUpperCase();
    return `0x${normalized.slice(0, 2)}${toHex6(color).slice(2)}`;
  }

  return toHex6(color);
}

export function isPaletteExpression(token: string): boolean {
  return PALETTE_EXPRESSION_REGEX.test(token);
}

function detectTokenFormat(token: string): LvglColorFormat {
  if (/\bLV_COLOR_MAKE\b/.test(token)) {
    return 'makeMacro';
  }

  if (/\blv_color_make\b/.test(token)) {
    return 'makeFunction';
  }

  if (isPaletteExpression(token)) {
    return 'palette';
  }

  const normalized = stripHexPrefix(token);

  if (/^[0-9A-Fa-f]{3}$/.test(normalized)) {
    return 'hex3';
  }

  if (/^[0-9A-Fa-f]{8}$/.test(normalized)) {
    return 'hex8';
  }

  return 'hex6';
}

function parseColorToken(token: string, format: 'hex3' | 'hex6' | 'hex8'): ColorValue | undefined {
  if (format === 'hex3') {
    return parseHex3(token);
  }

  if (format === 'hex8') {
    return parseHex8(token);
  }

  return parseHex6(token);
}

function createHexOffsetMatch(match: RegExpExecArray, format: 'hex3' | 'hex6' | 'hex8'): OffsetMatch | undefined {
  const literal = match[1];
  const start = match.index + match[0].indexOf(literal);
  const color = parseColorToken(literal, format);

  if (!color) {
    return undefined;
  }

  return {
    color,
    end: start + literal.length,
    format,
    start,
  };
}

function createMakeOffsetMatch(match: RegExpExecArray, format: 'makeFunction' | 'makeMacro'): OffsetMatch | undefined {
  const color = parseLvColorMake(match[0]);
  if (!color) {
    return undefined;
  }

  return {
    color,
    end: match.index + match[0].length,
    format,
    start: match.index,
  };
}

function createPaletteMainOffsetMatch(match: RegExpExecArray): OffsetMatch | undefined {
  const color = resolvePaletteColor(match[1], 'main');
  if (!color) {
    return undefined;
  }

  const start = match.index + match[0].indexOf(match[1]);

  return {
    color,
    end: start + match[1].length,
    format: 'palette',
    start,
  };
}

function createPaletteVariantOffsetMatch(
  match: RegExpExecArray,
  variant: 'darken' | 'lighten',
  maxLevel: 4 | 5,
): OffsetMatch | undefined {
  const level = parseByteLiteral(match[2]);
  if (level === undefined || level < 1 || level > maxLevel) {
    return undefined;
  }

  const color = resolvePaletteColor(match[1], variant, level);
  if (!color) {
    return undefined;
  }

  const start = match.index + match[0].indexOf(match[1]);

  return {
    color,
    end: start + match[1].length,
    format: 'palette',
    start,
  };
}

function getLvglPatterns(options?: LvglColorScanOptions): LvglPattern[] {
  const resolved = resolveScanOptions(options);
  const patterns: LvglPattern[] = [
    {
      regex: /\blv_color_hex\b\s*\(\s*(0[xX][0-9a-fA-F]{8})\s*\)/g,
      createOffsetMatch: (match) => createHexOffsetMatch(match, 'hex8'),
    },
    {
      regex: /\blv_color_hex\b\s*\(\s*(0[xX][0-9a-fA-F]{6})\s*\)/g,
      createOffsetMatch: (match) => createHexOffsetMatch(match, 'hex6'),
    },
    {
      regex: /\blv_color_hex3\b\s*\(\s*(0[xX][0-9a-fA-F]{3})\s*\)/g,
      createOffsetMatch: (match) => createHexOffsetMatch(match, 'hex3'),
    },
    {
      regex: LV_COLOR_MAKE_FUNCTION_REGEX,
      createOffsetMatch: (match) => createMakeOffsetMatch(match, 'makeFunction'),
    },
  ];

  if (resolved.enableColorMakeMacro) {
    patterns.push({
      regex: LV_COLOR_MAKE_MACRO_REGEX,
      createOffsetMatch: (match) => createMakeOffsetMatch(match, 'makeMacro'),
    });
  }

  if (resolved.enablePaletteDecorators) {
    patterns.push(
      {
        regex: LV_PALETTE_MAIN_REGEX,
        createOffsetMatch: createPaletteMainOffsetMatch,
      },
      {
        regex: LV_PALETTE_LIGHTEN_REGEX,
        createOffsetMatch: (match) => createPaletteVariantOffsetMatch(match, 'lighten', 5),
      },
      {
        regex: LV_PALETTE_DARKEN_REGEX,
        createOffsetMatch: (match) => createPaletteVariantOffsetMatch(match, 'darken', 4),
      },
    );
  }

  return patterns;
}

function resolveScanOptions(options?: LvglColorScanOptions): Required<LvglColorScanOptions> {
  return {
    enableColorMakeMacro: options?.enableColorMakeMacro ?? DEFAULT_SCAN_OPTIONS.enableColorMakeMacro,
    enablePaletteDecorators: options?.enablePaletteDecorators ?? DEFAULT_SCAN_OPTIONS.enablePaletteDecorators,
  };
}

function resolvePaletteColor(
  paletteName: string,
  variant: 'darken' | 'lighten' | 'main',
  level?: number,
): ColorValue | undefined {
  const entry = PALETTE_MAP[paletteName];
  if (!entry) {
    return undefined;
  }

  if (variant === 'main') {
    return parseHex6(entry.main);
  }

  if (!level) {
    return undefined;
  }

  const token = variant === 'lighten' ? entry.lighten[level - 1] : entry.darken[level - 1];
  return parseHex6(token);
}

function channelToByteHex(value: number): string {
  return clampToByte(clampUnit(value) * 255).toString(16).toUpperCase().padStart(2, '0');
}

function channelToByteValue(value: number): number {
  return clampToByte(clampUnit(value) * 255);
}

function channelToNibbleHex(value: number): string {
  return Math.round(clampUnit(value) * 15).toString(16).toUpperCase();
}

function toLvColorMake(color: ColorValue, useHexByteArguments: boolean, useMacroName: boolean): string {
  const name = useMacroName ? 'LV_COLOR_MAKE' : 'lv_color_make';
  const red = channelToByteValue(color.red);
  const green = channelToByteValue(color.green);
  const blue = channelToByteValue(color.blue);

  if (useHexByteArguments) {
    return `${name}(${toByteHexLiteral(red)}, ${toByteHexLiteral(green)}, ${toByteHexLiteral(blue)})`;
  }

  return `${name}(${red}, ${green}, ${blue})`;
}

function prefersHexByteArguments(token: string): boolean {
  return /0x/i.test(token);
}

function toByteHexLiteral(value: number): string {
  return `0x${value.toString(16).toUpperCase().padStart(2, '0')}`;
}

function clampUnit(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }

  if (value < 0) {
    return 0;
  }

  if (value > 1) {
    return 1;
  }

  return value;
}

function clampToByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function sanitizeTextForScanning(text: string): string {
  const chars = text.split('');
  let state: 'blockComment' | 'code' | 'doubleQuote' | 'lineComment' | 'singleQuote' = 'code';

  for (let index = 0; index < chars.length; index += 1) {
    const char = chars[index];
    const next = chars[index + 1];

    if (state === 'code') {
      if (char === '/' && next === '/') {
        chars[index] = ' ';
        chars[index + 1] = ' ';
        state = 'lineComment';
        index += 1;
        continue;
      }

      if (char === '/' && next === '*') {
        chars[index] = ' ';
        chars[index + 1] = ' ';
        state = 'blockComment';
        index += 1;
        continue;
      }

      if (char === '"') {
        chars[index] = ' ';
        state = 'doubleQuote';
      } else if (char === '\'') {
        chars[index] = ' ';
        state = 'singleQuote';
      }

      continue;
    }

    if (state === 'lineComment') {
      if (char === '\r' || char === '\n') {
        state = 'code';
      } else {
        chars[index] = ' ';
      }

      continue;
    }

    if (state === 'blockComment') {
      if (char === '*' && next === '/') {
        chars[index] = ' ';
        chars[index + 1] = ' ';
        state = 'code';
        index += 1;
      } else if (char !== '\r' && char !== '\n') {
        chars[index] = ' ';
      }

      continue;
    }

    if (char === '\\') {
      chars[index] = ' ';

      if (index + 1 < chars.length && chars[index + 1] !== '\r' && chars[index + 1] !== '\n') {
        chars[index + 1] = ' ';
        index += 1;
      }

      continue;
    }

    if (
      (state === 'doubleQuote' && char === '"') ||
      (state === 'singleQuote' && char === '\'')
    ) {
      chars[index] = ' ';
      state = 'code';
      continue;
    }

    if (char === '\r' || char === '\n') {
      state = 'code';
      continue;
    }

    chars[index] = ' ';
  }

  return chars.join('');
}

function stripHexPrefix(token: string): string {
  return token.startsWith('0x') || token.startsWith('0X') ? token.slice(2) : token;
}

function parseByteLiteral(token: string): number | undefined {
  if (/^0[xX][0-9A-Fa-f]{1,2}$/.test(token)) {
    return Number.parseInt(token.slice(2), 16);
  }

  if (!/^\d{1,3}$/.test(token)) {
    return undefined;
  }

  const value = Number.parseInt(token, 10);
  if (value < 0 || value > 255) {
    return undefined;
  }

  return value;
}
