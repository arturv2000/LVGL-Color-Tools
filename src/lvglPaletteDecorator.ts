import * as vscode from 'vscode';
import { ColorValue, findLvglColorsInText } from './lvglColorCore';

export class LvglPaletteDecorator implements vscode.Disposable {
  private readonly decorationType = vscode.window.createTextEditorDecorationType({
    rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
  });

  private readonly disposables: vscode.Disposable[] = [];

  constructor() {
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
          this.updateEditor(editor);
        }
      }),
      vscode.window.onDidChangeVisibleTextEditors((editors) => {
        this.updateEditors(editors);
      }),
      vscode.workspace.onDidChangeTextDocument((event) => {
        this.updateEditors(
          vscode.window.visibleTextEditors.filter((editor) => editor.document === event.document),
        );
      }),
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('lvglColorTools.enablePaletteDecorators')) {
          this.updateEditors(vscode.window.visibleTextEditors);
        }
      }),
      this.decorationType,
    );

    this.updateEditors(vscode.window.visibleTextEditors);
  }

  dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }

  private updateEditors(editors: readonly vscode.TextEditor[]): void {
    for (const editor of editors) {
      this.updateEditor(editor);
    }
  }

  private updateEditor(editor: vscode.TextEditor): void {
    if (!this.isSupportedEditor(editor)) {
      editor.setDecorations(this.decorationType, []);
      return;
    }

    if (!this.isPaletteDecoratorEnabled()) {
      editor.setDecorations(this.decorationType, []);
      return;
    }

    const decorations = findLvglColorsInText(editor.document.getText(), {
      enableColorMakeMacro: this.isColorMakeMacroEnabled(),
      enablePaletteDecorators: true,
    })
      .filter((match) => match.format === 'palette')
      .map((match) => this.toDecorationOption(editor.document, match));

    editor.setDecorations(this.decorationType, decorations);
  }

  private isSupportedEditor(editor: vscode.TextEditor): boolean {
    const languageId = editor.document.languageId;
    return languageId === 'c' || languageId === 'cpp';
  }

  private isPaletteDecoratorEnabled(): boolean {
    return vscode.workspace.getConfiguration('lvglColorTools').get<boolean>('enablePaletteDecorators', false);
  }

  private isColorMakeMacroEnabled(): boolean {
    return vscode.workspace.getConfiguration('lvglColorTools').get<boolean>('enableColorMakeMacro', true);
  }

  private toDecorationOption(document: vscode.TextDocument, match: { color: ColorValue; start: number; end: number }): vscode.DecorationOptions {
    const swatchColor = toCssColor(match.color);

    return {
      range: new vscode.Range(document.positionAt(match.start), document.positionAt(match.end)),
      hoverMessage: 'LVGL palette preview only. Editing via the color picker is intentionally disabled for palette expressions.',
      renderOptions: {
        before: {
          backgroundColor: swatchColor,
          border: '1px solid rgba(127, 127, 127, 0.55)',
          contentText: ' ',
          height: '0.9em',
          margin: '0 0.25em 0 0',
          width: '0.9em',
        },
      },
    };
  }
}

function toCssColor(color: ColorValue): string {
  const red = Math.round(color.red * 255);
  const green = Math.round(color.green * 255);
  const blue = Math.round(color.blue * 255);
  const alpha = Math.max(0, Math.min(1, color.alpha));

  return `rgba(${red}, ${green}, ${blue}, ${alpha.toFixed(3)})`;
}
