import * as vscode from 'vscode';
import { LvglPaletteDecorator } from './lvglPaletteDecorator';
import { LvglColorProvider } from './lvglColorProvider';

export function activate(context: vscode.ExtensionContext): void {
  const provider = new LvglColorProvider();
  const paletteDecorator = new LvglPaletteDecorator();
  const selector: vscode.DocumentSelector = [{ language: 'c' }, { language: 'cpp' }];

  context.subscriptions.push(vscode.languages.registerColorProvider(selector, provider));
  context.subscriptions.push(paletteDecorator);
}

export function deactivate(): void {}
