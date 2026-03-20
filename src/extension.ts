import * as vscode from 'vscode';
import { LvglColorProvider } from './lvglColorProvider';

export function activate(context: vscode.ExtensionContext): void {
  const provider = new LvglColorProvider();
  const selector: vscode.DocumentSelector = [{ language: 'c' }, { language: 'cpp' }];

  context.subscriptions.push(vscode.languages.registerColorProvider(selector, provider));
}

export function deactivate(): void {}
