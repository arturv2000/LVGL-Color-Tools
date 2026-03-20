import * as vscode from 'vscode';

type LvglColorFormat = 'hex3' | 'hex6' | 'hex8';

interface OffsetMatch {
  color: vscode.Color;
  end: number;
  format: LvglColorFormat;
  start: number;
}

const LVGL_PATTERNS: ReadonlyArray<{ format: LvglColorFormat; regex: RegExp }> = [
  {
    format: 'hex8',
    regex: /\blv_color_hex\b\s*\(\s*(0x[0-9a-fA-F]{8})\s*\)/g,
  },
  {
    format: 'hex6',
    regex: /\blv_color_hex\b\s*\(\s*(0x[0-9a-fA-F]{6})\s*\)/g,
  },
  {
    format: 'hex3',
    regex: /\blv_color_hex3\b\s*\(\s*(0x[0-9a-fA-F]{3})\s*\)/g,
  },
];

export class LvglColorProvider implements vscode.DocumentColorProvider {
  provideDocumentColors(document: vscode.TextDocument): vscode.ColorInformation[] {
    return findLvglColorsInText(document.getText()).map((match) => {
      const range = new vscode.Range(document.positionAt(match.start), document.positionAt(match.end));
      return new vscode.ColorInformation(range, match.color);
    });
  }

  provideColorPresentations(
    color: vscode.Color,
    context: { document: vscode.TextDocument; range: vscode.Range },
  ): vscode.ColorPresentation[] {
    const originalToken = context.document.getText(context.range);
    const replacement = formatEditedToken(originalToken, color);
    const presentation = new vscode.ColorPresentation(replacement);

    presentation.textEdit = vscode.TextEdit.replace(context.range, replacement);

    return [presentation];
  }
}

export function findLvglColorsInText(text: string): OffsetMatch[] {
  const sanitizedText = sanitizeTextForScanning(text);
  const matches: OffsetMatch[] = [];

  for (const pattern of LVGL_PATTERNS) {
    pattern.regex.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = pattern.regex.exec(sanitizedText)) !== null) {
      const literal = match[1];
      const start = match.index + match[0].indexOf(literal);
      const color = parseColorToken(literal, pattern.format);

      if (!color) {
        continue;
      }

      matches.push({
        color,
        end: start + literal.length,
        format: pattern.format,
        start,
      });

      if (pattern.regex.lastIndex === match.index) {
        pattern.regex.lastIndex += 1;
      }
    }
  }

  return matches.sort((left, right) => left.start - right.start);
}

export function parseHex6(token: string): vscode.Color | undefined {
  const normalized = stripHexPrefix(token);
  if (!/^[0-9A-Fa-f]{6}$/.test(normalized)) {
    return undefined;
  }

  return new vscode.Color(
    parseInt(normalized.slice(0, 2), 16) / 255,
    parseInt(normalized.slice(2, 4), 16) / 255,
    parseInt(normalized.slice(4, 6), 16) / 255,
    1,
  );
}

export function parseHex3(token: string): vscode.Color | undefined {
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

export function parseHex8(token: string): vscode.Color | undefined {
  const normalized = stripHexPrefix(token);
  if (!/^[0-9A-Fa-f]{8}$/.test(normalized)) {
    return undefined;
  }

  return parseHex6(`0x${normalized.slice(2)}`);
}

export function toHex6(color: vscode.Color): string {
  return `0x${channelToByteHex(color.red)}${channelToByteHex(color.green)}${channelToByteHex(color.blue)}`;
}

export function toHex3(color: vscode.Color): string {
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

function formatEditedToken(originalToken: string, color: vscode.Color): string {
  const format = detectTokenFormat(originalToken);

  if (format === 'hex3') {
    return toHex3(color);
  }

  if (format === 'hex8') {
    const normalized = stripHexPrefix(originalToken).toUpperCase();
    return `0x${normalized.slice(0, 2)}${toHex6(color).slice(2)}`;
  }

  return toHex6(color);
}

function detectTokenFormat(token: string): LvglColorFormat {
  const normalized = stripHexPrefix(token);

  if (/^[0-9A-Fa-f]{3}$/.test(normalized)) {
    return 'hex3';
  }

  if (/^[0-9A-Fa-f]{8}$/.test(normalized)) {
    return 'hex8';
  }

  return 'hex6';
}

function parseColorToken(token: string, format: LvglColorFormat): vscode.Color | undefined {
  if (format === 'hex3') {
    return parseHex3(token);
  }

  if (format === 'hex8') {
    return parseHex8(token);
  }

  return parseHex6(token);
}

function channelToByteHex(value: number): string {
  return clampToByte(clampUnit(value) * 255).toString(16).toUpperCase().padStart(2, '0');
}

function channelToNibbleHex(value: number): string {
  return Math.round(clampUnit(value) * 15).toString(16).toUpperCase();
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
