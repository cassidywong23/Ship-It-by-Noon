The Daybook database files are:

- `schema.sql`: creates `ExpenseCategories`, `MonthlyBudgets`, and `Expenses`.
- `load.js`: creates the schema and seeds the six fixed categories, 20 monthly budgets, and 20 sample expenses.
- `queries.sql`: parameterized, month-filtered dashboard and expense-insert queries used by the Express API.

After the project database and `.env` are set up, run `npm run load` from the project root. The loader keeps existing expenses and does not duplicate its sample data when run again. The initial current-month budget is made-up demo data.

Then start the web app with `npm start` and open <http://localhost:3000>.
