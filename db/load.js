require("dotenv").config();

const fs = require("fs");
const path = require("path");
const sql = require("mssql");

const config = {
  server: process.env.DB_SERVER,
  port: Number(process.env.DB_PORT || 1433),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  options: { encrypt: true, trustServerCertificate: true }
};

const categories = [
  { name: "Bills", sortOrder: 1 },
  { name: "Groceries", sortOrder: 2 },
  { name: "Shopping", sortOrder: 3 },
  { name: "Eating Out", sortOrder: 4 },
  { name: "Entertainment", sortOrder: 5 },
  { name: "Other", sortOrder: 6 }
];

const budgetAmounts = [
  910, 940, 920, 950, 900, 930, 915, 960, 925, 900,
  950, 925, 910, 940, 900, 935, 920, 955, 925, 950
];

const sampleExpenses = [
  { daysAgo: 0, amount: 68.00, category: "Bills", note: "Phone bill" },
  { daysAgo: 1, amount: 42.80, category: "Groceries", note: "Weekly groceries" },
  { daysAgo: 3, amount: 12.50, category: "Eating Out", note: "Boba with friends" },
  { daysAgo: 4, amount: 16.00, category: "Entertainment", note: "Student movie ticket" },
  { daysAgo: 5, amount: 25.00, category: "Bills", note: "Internet bill" },
  { daysAgo: 7, amount: 18.42, category: "Groceries", note: "Fruit and breakfast" },
  { daysAgo: 9, amount: 34.99, category: "Shopping", note: "Laundry supplies" },
  { daysAgo: 10, amount: 9.75, category: "Eating Out", note: "Lunch between classes" },
  { daysAgo: 12, amount: 53.10, category: "Groceries", note: "Weekly groceries" },
  { daysAgo: 14, amount: 7.50, category: "Other", note: "Printing for class" },
  { daysAgo: 16, amount: 11.99, category: "Entertainment", note: "Music subscription" },
  { daysAgo: 18, amount: 21.60, category: "Eating Out", note: "Dinner with a friend" },
  { daysAgo: 21, amount: 40.00, category: "Bills", note: "Electricity bill" },
  { daysAgo: 24, amount: 26.45, category: "Groceries", note: "Pantry staples" },
  { daysAgo: 28, amount: 22.00, category: "Shopping", note: "Thrifted sweater" },
  { daysAgo: 32, amount: 8.25, category: "Eating Out", note: "Coffee and a snack" },
  { daysAgo: 35, amount: 32.00, category: "Entertainment", note: "Museum admission" },
  { daysAgo: 40, amount: 15.00, category: "Other", note: "Backpack zipper repair" },
  { daysAgo: 45, amount: 46.70, category: "Groceries", note: "Weekly groceries" },
  { daysAgo: 55, amount: 18.00, category: "Bills", note: "Cloud storage subscription" }
];

function monthStart(monthsAgo, now) {
  return new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
}

function dateDaysAgo(daysAgo, now) {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  date.setDate(date.getDate() - daysAgo);
  return date;
}

async function seedData(transaction) {
  for (const category of categories) {
    await new sql.Request(transaction)
      .input("categoryName", sql.NVarChar(30), category.name)
      .input("sortOrder", sql.TinyInt, category.sortOrder)
      .query(`
        IF NOT EXISTS (
          SELECT 1
          FROM dbo.ExpenseCategories
          WHERE CategoryName = @categoryName
        )
        BEGIN
          INSERT INTO dbo.ExpenseCategories (CategoryName, SortOrder)
          VALUES (@categoryName, @sortOrder);
        END;
      `);
  }

  const now = new Date();
  for (let monthsAgo = 19; monthsAgo >= 0; monthsAgo -= 1) {
    const index = 19 - monthsAgo;
    await new sql.Request(transaction)
      .input("monthStart", sql.Date, monthStart(monthsAgo, now))
      .input("budgetAmount", sql.Decimal(10, 2), budgetAmounts[index])
      .query(`
        IF NOT EXISTS (
          SELECT 1
          FROM dbo.MonthlyBudgets
          WHERE MonthStart = @monthStart
        )
        BEGIN
          INSERT INTO dbo.MonthlyBudgets (MonthStart, BudgetAmount)
          VALUES (@monthStart, @budgetAmount);
        END;
      `);
  }

  const existingExpenses = await new sql.Request(transaction)
    .query("SELECT COUNT(*) AS totalExpenses FROM dbo.Expenses;");

  if (existingExpenses.recordset[0].totalExpenses > 0) {
    return 0;
  }

  for (const expense of sampleExpenses) {
    await new sql.Request(transaction)
      .input("categoryName", sql.NVarChar(30), expense.category)
      .input("amount", sql.Decimal(10, 2), expense.amount)
      .input("expenseDate", sql.Date, dateDaysAgo(expense.daysAgo, now))
      .input("note", sql.NVarChar(200), expense.note)
      .query(`
        INSERT INTO dbo.Expenses (CategoryID, Amount, ExpenseDate, Note)
        SELECT c.CategoryID, @amount, @expenseDate, @note
        FROM dbo.ExpenseCategories AS c
        WHERE c.CategoryName = @categoryName;
      `);
  }

  return sampleExpenses.length;
}

async function main() {
  if (!config.server || !config.user || !config.password || !config.database) {
    throw new Error("Fill in DB_SERVER, DB_USER, DB_PASSWORD, and DB_NAME in .env first.");
  }

  const pool = await sql.connect(config);
  try {
    const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
    await pool.request().batch(schema);

    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const insertedExpenses = await seedData(transaction);
      await transaction.commit();
      console.log("OK: expense tables are ready.");
      console.log("Ensured 6 categories and 20 monthly budgets.");
      if (insertedExpenses > 0) {
        console.log(`Inserted ${insertedExpenses} sample expenses.`);
      } else {
        console.log("Existing expenses were preserved; sample rows were not duplicated.");
      }
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } finally {
    await pool.close();
  }
}

main().catch((error) => {
  console.error("FAILED to load the spending tracker database:", error.message);
  console.error("Check the .env connection settings and make sure you are on UW Wi-Fi or Husky OnNet.");
  process.exitCode = 1;
});
