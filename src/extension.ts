import * as vscode from 'vscode';
import { sqlFormatter } from './sqlFormatter';

export function activate(context: vscode.ExtensionContext) {
    // Command for manual formatting
    let disposable = vscode.commands.registerCommand(
        'franks-sql-formatter.helloWorld',
        () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                return;
            }
            const document = editor.document;
            const selection = editor.selection;
            const sql = selection.isEmpty
                ? document.getText()
                : document.getText(selection);

            const formatter = new sqlFormatter();
            const formatted = formatter.format(sql);

            editor.edit(editBuilder => {
                if (selection.isEmpty) {
                    const firstLine = document.lineAt(0);
                    const lastLine = document.lineAt(document.lineCount - 1);
                    const textRange = new vscode.Range(
                        firstLine.range.start,
                        lastLine.range.end
                    );
                    editBuilder.replace(textRange, formatted);
                } else {
                    editBuilder.replace(selection, formatted);
                }
            });
        }
    );
    context.subscriptions.push(disposable);

    // Register as a document formatter for SQL
    context.subscriptions.push(
        vscode.languages.registerDocumentFormattingEditProvider('sql', {
            provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
                const sql = document.getText();
                const formatter = new sqlFormatter();
                const formatted = formatter.format(sql);
                const firstLine = document.lineAt(0);
                const lastLine = document.lineAt(document.lineCount - 1);
                const fullRange = new vscode.Range(firstLine.range.start, lastLine.range.end);
                return [vscode.TextEdit.replace(fullRange, formatted)];
            }
        })
    );
}

export function deactivate() {}