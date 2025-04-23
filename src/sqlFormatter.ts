export class sqlFormatter {
    private indentString = '    '; // 4 spaces for indentation
    private indentLevel = 0;

    format(sql: string): string {
        // Normalize input: remove extra whitespace, trim
        sql = sql.replace(/\s+/g, ' ').trim();

        // Split into major clauses
        const clauses = this.splitIntoClauses(sql);
        let formatted = '';

        for (const clause of clauses) {
            formatted += this.formatClause(clause) + '\n';
        }

        return formatted.trim() + ';';
    }

    private splitIntoClauses(sql: string): string[] {
        // Major SQL clauses to split on
        const clauseKeywords = [
            'SELECT',
            'FROM',
            'INNER JOIN',
            'LEFT JOIN',
            'RIGHT JOIN',
            'WHERE',
            'GROUP BY',
            'HAVING',
            'ORDER BY'
        ];

        const clauses: string[] = [];
        let currentClause = '';
        let parenCount = 0;
        let inSubquery = false;

        const tokens = sql.split(' ');

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];

            if (token === '(') {
                parenCount++;
                inSubquery = true;
            } else if (token === ')') {
                parenCount--;
                if (parenCount === 0) {
                    inSubquery = false;
                }
            }

            currentClause += token + ' ';

            // Check if next token starts a new clause
            const nextToken = tokens[i + 1] || '';
            const nextTwoTokens = tokens.slice(i + 1, i + 3).join(' ').toUpperCase();
            if (!inSubquery && clauseKeywords.includes(nextToken.toUpperCase()) ||
                clauseKeywords.includes(nextTwoTokens)) {
                clauses.push(currentClause.trim());
                currentClause = '';
            }
        }

        if (currentClause.trim()) {
            clauses.push(currentClause.trim());
        }

        return clauses;
    }

    private formatClause(clause: string): string {
        const upperClause = clause.toUpperCase();
        let formatted = '';

        if (upperClause.startsWith('SELECT')) {
            formatted = this.formatSelect(clause);
        } else if (upperClause.startsWith('FROM')) {
            formatted = this.formatFrom(clause);
        } else if (upperClause.startsWith('INNER JOIN') || upperClause.startsWith('LEFT JOIN') || upperClause.startsWith('RIGHT JOIN')) {
            formatted = this.formatJoin(clause);
        } else if (upperClause.startsWith('WHERE')) {
            formatted = this.formatWhere(clause);
        } else if (upperClause.startsWith('GROUP BY')) {
            formatted = this.formatGroupBy(clause);
        } else if (upperClause.startsWith('HAVING')) {
            formatted = this.formatHaving(clause);
        } else if (upperClause.startsWith('ORDER BY')) {
            formatted = this.formatOrderBy(clause);
        } else {
            formatted = this.indent(clause);
        }

        return formatted;
    }

    private formatSelect(clause: string): string {
        const lines = ['SELECT\n'];
        this.indentLevel++;

        // Split columns by comma, handle complex expressions
        const selectBody = clause.slice(6).trim();
        const columns = this.splitColumns(selectBody);

        for (let i = 0; i < columns.length; i++) {
            const column = columns[i].trim();
            if (column.toUpperCase().startsWith('CASE')) {
                lines.push(this.formatCase(column));
            } else if (column.includes('OVER')) {
                lines.push(this.formatWindowFunction(column));
            } else {
                lines.push(this.indent(column + (i < columns.length - 1 ? ',' : '')));
            }
        }

        this.indentLevel--;
        return lines.join('\n');
    }

    private formatFrom(clause: string): string {
        this.indentLevel = 0;
        return '\nFROM ' + clause.slice(4).trim();
    }

    private formatJoin(clause: string): string {
        const parts = clause.split(' ON ');
        if (parts.length === 2) {
            let joinClause = parts[0].trim();
            if (joinClause.toUpperCase().includes('SELECT')) {
                // Subquery in JOIN
                this.indentLevel++;
                joinClause = '\n' + joinClause.split(' ').map((token, i) => {
                    if (token.toUpperCase() === 'SELECT') {
                        return '\n' + this.indent('SELECT');
                    }
                    return token;
                }).join(' ');
                this.indentLevel--;
            }
            return '\n' + joinClause + '\nON ' + parts[1].trim();
        }
        return '\n' + clause;
    }

    private formatWhere(clause: string): string {
        const conditions = clause.slice(5).trim().split(' AND ');
        const lines = ['\nWHERE'];

        for (let i = 0; i < conditions.length; i++) {
            const condition = conditions[i].trim();
            if (condition.includes('SELECT')) {
                lines.push(this.formatSubquery(condition));
            } else if (condition.includes('IN (')) {
                lines.push(this.formatInClause(condition));
            } else {
                lines.push(this.indent(condition + (i < conditions.length - 1 ? ' AND' : '')));
            }
        }

        return lines.join('\n');
    }

    private formatGroupBy(clause: string): string {
        const columns = clause.slice(8).trim().split(',');
        const lines = ['\nGROUP BY'];

        for (let i = 0; i < columns.length; i++) {
            lines.push(this.indent(columns[i].trim() + (i < columns.length - 1 ? ',' : '')));
        }

        return lines.join('\n');
    }

    private formatHaving(clause: string): string {
        return '\nHAVING ' + clause.slice(6).trim();
    }

    private formatOrderBy(clause: string): string {
        const columns = clause.slice(8).trim().split(',');
        const lines = ['\nORDER BY'];

        for (let i = 0; i < columns.length; i++) {
            lines.push(this.indent(columns[i].trim() + (i < columns.length - 1 ? ',' : '')));
        }

        return lines.join('\n');
    }

    private formatCase(clause: string): string {
        const lines = [this.indent('CASE')];
        this.indentLevel++;

        const parts = clause.split(' ');
        let currentLine = '';
        for (let i = 1; i < parts.length; i++) {
            const token = parts[i];
            if (token.toUpperCase() === 'WHEN') {
                if (currentLine) {
                    lines.push(this.indent(currentLine.trim()));
                }
                currentLine = 'WHEN ';
            } else if (token.toUpperCase() === 'THEN') {
                currentLine += 'THEN ';
            } else if (token.toUpperCase() === 'ELSE') {
                if (currentLine) {
                    lines.push(this.indent(currentLine.trim()));
                }
                currentLine = 'ELSE ';
            } else if (token.toUpperCase() === 'END') {
                if (currentLine) {
                    lines.push(this.indent(currentLine.trim()));
                }
                lines.push(this.indent('END'));
                currentLine = '';
            } else {
                currentLine += token + ' ';
            }
        }

        this.indentLevel--;
        return lines.join('\n');
    }

    private formatWindowFunction(clause: string): string {
        const parts = clause.split(' OVER ');
        const func = parts[0].trim();
        const over = parts[1].trim().slice(1, -1); // Remove parentheses
        const overParts = over.split('PARTITION BY');
        let formatted = this.indent(func + ' OVER (');

        this.indentLevel++;
        if (overParts.length > 1) {
            formatted += '\n' + this.indent('PARTITION BY ' + overParts[1].split(' ORDER BY ')[0].trim());
            const orderBy = overParts[1].split(' ORDER BY ')[1];
            if (orderBy) {
                formatted += '\n' + this.indent('ORDER BY ' + orderBy.split(' ROWS ')[0].trim());
                const rows = orderBy.split(' ROWS ')[1];
                if (rows) {
                    formatted += '\n' + this.indent('ROWS ' + rows.trim());
                }
            }
        } else {
            formatted += '\n' + this.indent(over);
        }
        this.indentLevel--;

        formatted += ')';
        return formatted;
    }

    private formatSubquery(clause: string): string {
        const subqueryStart = clause.indexOf('(');
        const prefix = clause.slice(0, subqueryStart).trim();
        const subquery = clause.slice(subqueryStart + 1, clause.lastIndexOf(')')).trim();

        const lines = [this.indent(prefix + ' (')];
        this.indentLevel++;

        // Recursively format subquery
        const subFormatter = new sqlFormatter();
        const formattedSubquery = subFormatter.format(subquery).split('\n');
        for (const line of formattedSubquery) {
            lines.push(this.indent(line));
        }

        this.indentLevel--;
        lines.push(this.indent(')'));

        return lines.join('\n');
    }

    private formatInClause(clause: string): string {
        const parts = clause.split(' IN (');
        const prefix = parts[0].trim();
        const values = parts[1].slice(0, -1).split(',').map(v => v.trim());
        const lines = [this.indent(prefix + ' IN (')];

        this.indentLevel++;
        for (let i = 0; i < values.length; i++) {
            lines.push(this.indent(values[i] + (i < values.length - 1 ? ',' : '')));
        }
        this.indentLevel--;
        lines.push(this.indent(')'));

        return lines.join('\n');
    }

    private splitColumns(selectBody: string): string[] {
        const columns: string[] = [];
        let currentColumn = '';
        let parenCount = 0;
        let inCase = false;

        const tokens = selectBody.split(' ');

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];

            if (token.toUpperCase() === 'CASE') {
                inCase = true;
            } else if (token.toUpperCase() === 'END' && inCase) {
                inCase = false;
            }

            if (token === '(') {
                parenCount++;
            } else if (token === ')') {
                parenCount--;
            }

            currentColumn += token + ' ';

            if (!inCase && parenCount === 0 && token === ',' && tokens[i + 1] !== 'OVER') {
                columns.push(currentColumn.slice(0, -2)); // Remove trailing comma and space
                currentColumn = '';
            }
        }

        if (currentColumn.trim()) {
            columns.push(currentColumn.trim());
        }

        return columns;
    }

    private indent(text: string): string {
        return this.indentString.repeat(this.indentLevel) + text;
    }
}