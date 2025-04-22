# Frank's SQL Formatter

A clean, opinionated SQL formatter for data professionals who want readable SQL, Frank's way.

![Demo](img/franks-sql-formatter.gif)

## Features

- Formats SQL to a consistent, readable style
- Smart handling of SELECT columns, JOINs, QUALIFY, and GROUP BY
- Works great with Power BI, Qlik, Teradata, SQL Server, Databricks, and more

## Usage

1. Open a `.sql` file in VS Code.
2. Select the SQL you want to format (or leave nothing selected to format the whole file).
3. Run the command:  
   **Command Palette** → `franks-sql-formatter`  
   or **shortcut** → `ctrl+alt+f`

**Before:**
```sql
SELECT a.id, a.name, b.amount, SUM(c.score) as total_score FROM users a LEFT JOIN orders b ON a.id = b.user_id INNER JOIN scores c ON a.id = c.user_id WHERE a.status = 'active' AND b.amount > 500 QUALIFY ROW_NUMBER() OVER (PARTITION BY a.id ORDER BY b.amount DESC) = 1 GROUP BY 1,2,3;
```

**After**

```sql
SELECT

    a.id,
    a.name,
    b.amount,
    SUM(c.score) AS total_score

FROM users a

LEFT JOIN orders b ON a.id = b.user_id
INNER JOIN scores c ON a.id = c.user_id

WHERE a.status = 'active'
    AND b.amount > 500

QUALIFY ROW_NUMBER() OVER (PARTITION BY a.id ORDER BY b.amount DESC) = 1

GROUP BY
    1,
    2,
    3;
```

## Why Frank's?

* No more fighting with inconsistent SQL styles
* Designed for real-world analytics and BI workflows
* Fast, simple, and open source

## Known Issues

--

## Release Notes

### 0.0.1

Initial release of franks-sql-formatter
