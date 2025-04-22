import * as vscode from 'vscode';
import { format } from 'sql-formatter';

function customFormat(sql: string): string {
// Use sql-formatter for base formatting
let formatted = format(sql, {
language: 'sql',
keywordCase: 'upper',
linesBetweenQueries: 2,
tabWidth: 4,
});

// Indent columns under SELECT
formatted = formatted.replace(
    /SELECT\s*\n([\s\S]*?)\nFROM/g,
    (match, cols) => {
        const indentedCols = cols
            .split('\n')
            .map((line: string) => '    ' + line.trim())
            .join('\n');
        return 'SELECT\n\n' + indentedCols + '\n\nFROM';
    }
);

// Flatten FROM/JOIN/ON blocks
formatted = formatted.replace(
    /FROM\s*\n([\s\S]*?)(?=\nWHERE|\nQUALIFY|\nGROUP BY|;)/gi,
    (match, fromBlock) => {
        const lines = fromBlock
            .split('\n')
            .map((line: string) => line.trim())
            .filter((line: string) => line.length > 0);

        let rebuilt = '';
        lines.forEach((line: string, idx: number) => {
            if (idx === 0) {
                rebuilt += 'FROM ' + line + '\n';
            } else if (/^(LEFT|RIGHT|INNER|OUTER|FULL|CROSS)?\s*JOIN/i.test(line)) {
                rebuilt += '\n' + line;
            } else if (/^ON /i.test(line)) {
                rebuilt += ' ' + line;
            } else {
                rebuilt += '\n' + line;
            }
        });

        return rebuilt + '\n';
    }
);

// Remove extra newlines after WHERE and before AND
formatted = formatted.replace(/\nAND/g, ' AND');

// QUALIFY: keep window function on one line
formatted = formatted.replace(
    /QUALIFY\s+ROW_NUMBER\(\)\s+OVER\s*\(([\s\S]*?)\)\s*=\s*([^\s;]+)/g,
    (match, overClause, qualifierValue) => {
        const singleLine = overClause
            .replace(/\s+/g, ' ')
            .replace(/\s*,\s*/g, ', ');
        return `\n\nQUALIFY ROW_NUMBER() OVER (${singleLine}) = ${qualifierValue}\n\n`;
    }
);    

// Indent GROUP BY list
formatted = formatted.replace(
    /GROUP BY\s+([\s\S]*?);/g,
    (match, groupCols) => {
        const indented = groupCols
            .split(',')
            .map((col: string) => '    ' + col.trim())
            .join(',\n');
        return 'GROUP BY\n' + indented + ';';
    }
);

// Remove trailing spaces and extra blank lines
formatted = formatted.replace(/[ \t]+$/gm, '');
formatted = formatted.replace(/\n{3,}/g, '\n\n');

return formatted.trim();
}

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

            const formatted = customFormat(sql);

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
                const formatted = customFormat(sql);
                const firstLine = document.lineAt(0);
                const lastLine = document.lineAt(document.lineCount - 1);
                const fullRange = new vscode.Range(firstLine.range.start, lastLine.range.end);
                return [vscode.TextEdit.replace(fullRange, formatted)];
            }
        })
    );

context.subscriptions.push(disposable);
}

export function deactivate() {}