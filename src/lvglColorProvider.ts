import * as vscode from 'vscode';
import { ColorValue, findLvglColorsInText, formatEditedToken } from './lvglColorCore';

export {
  findLvglColorsInText,
  formatEditedToken,
  parseHex3,
  parseHex6,
  parseHex8,
  parseLvColorMake,
  toHex3,
  toHex6,
  tryCompressHex6ToHex3,
} from './lvglColorCore';

export class LvglColorProvider implements vscode.DocumentColorProvider {
  provideDocumentColors(document: vscode.TextDocument): vscode.ColorInformation[] {
    return findLvglColorsInText(document.getText()).map((match) => {
      const range = new vscode.Range(document.positionAt(match.start), document.positionAt(match.end));
      return new vscode.ColorInformation(range, toVsCodeColor(match.color));
    });
  }

  provideColorPresentations(
    color: vscode.Color,
    context: { document: vscode.TextDocument; range: vscode.Range },
  ): vscode.ColorPresentation[] {
    const originalToken = context.document.getText(context.range);
    const replacement = formatEditedToken(originalToken, fromVsCodeColor(color));
    const presentation = new vscode.ColorPresentation(replacement);

    presentation.textEdit = vscode.TextEdit.replace(context.range, replacement);

    return [presentation];
  }
}

function toVsCodeColor(color: ColorValue): vscode.Color {
  return new vscode.Color(color.red, color.green, color.blue, color.alpha);
}

function fromVsCodeColor(color: vscode.Color): ColorValue {
  return {
    alpha: color.alpha,
    blue: color.blue,
    green: color.green,
    red: color.red,
  };
}
