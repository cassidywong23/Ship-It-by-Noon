require("dotenv").config();

const fs = require("fs");
const express = require("express");
const path = require("path");
const sql = require("mssql");

const app = express();
const webDirectory = path.join(__dirname, "..", "web");
const queriesPath = path.join(__dirname, "..", "db", "queries.sql");
const port = Number(process.env.PORT) || 3000;
const allowedCategories = new Set([
  "Bills",
  "Groceries",
  "Shopping",
  "Eating Out",
  "Entertainment",
  "Other"
]);

function loadQueries() {
  const contents = fs.readFileSync(queriesPath, "utf8");
  const sections = new Map();
  let currentName = null;
  let currentLines = [];

  for (const line of contents.split(/\r?\n/)) {
    const marker = /^-- query:\s+([a-z_]+)\s*$/i.exec(line);
    if (marker) {
      if (currentName) {
        sections.set(currentName, currentLines.join("\n").trim());
      }
      currentName = marker[1];
      currentLines = [];
    } else if (currentName) {
      currentLines.push(line);
    }
  }

  if (currentName) {
    sections.set(currentName, currentLines.join("\n").trim());
  }

  for (const name of ["monthly_dashboard", "insert_expense"]) {
    if (!sections.has(name)) {
      throw new Error(`Missing "${name}" query in db/queries.sql.`);
    }
  }
  return sections;
}

const queries = loadQueries();
const databaseConfig = {
  server: process.env.DB_SERVER,
  port: Number(process.env.DB_PORT || 1433),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  options: { encrypt: true, trustServerCertificate: true }
};
let poolPromise;

function getPool() {
  if (!databaseConfig.server || !databaseConfig.user || !databaseConfig.password || !databaseConfig.database) {
    throw new Error("Database settings are missing from .env.");
  }

  if (!poolPromise) {
    poolPromise = sql.connect(databaseConfig).catch((error) => {
      poolPromise = null;
      throw error;
    });
  }
  return poolPromise;
}

function isValidMonth(value) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value);
  return Boolean(match && Number(match[1]) > 0);
}

function isValidDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match || Number(match[1]) < 1) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(0);
  parsed.setFullYear(year, month - 1, day);
  return parsed.getFullYear() === year
    && parsed.getMonth() === month - 1
    && parsed.getDate() === day;
}

app.use(express.json({ limit: "10kb" }));

app.get("/api/expenses", async (req, res) => {
  const now = new Date();
  const localMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const month = req.query.month === undefined ? localMonth : req.query.month;
  if (typeof month !== "string" || !isValidMonth(month)) {
    return res.status(400).json({ error: "month must use YYYY-MM format." });
  }

  try {
    const monthStart = `${month}-01`;
    const result = await (await getPool()).request()
      .input("monthStart", sql.Date, monthStart)
      .query(queries.get("monthly_dashboard"));

    if (result.recordsets.length !== 3 || result.recordsets[0].length !== 1) {
      throw new Error("The monthly dashboard query returned an unexpected result.");
    }

    const summary = result.recordsets[0][0];
    const expenses = result.recordsets[2].map((expense) => ({
      expenseID: expense.expenseID,
      amount: Number(expense.amount),
      category: expense.category,
      date: String(expense.expenseDate).slice(0, 10),
      note: expense.note
    }));

    return res.json({
      month,
      summary: {
        budgetAmount: Number(summary.budgetAmount),
        amountSpent: Number(summary.amountSpent),
        remaining: Number(summary.remaining),
        expenseCount: Number(summary.expenseCount)
      },
      categoryTotals: result.recordsets[1].map((category) => ({
        category: category.category,
        amountSpent: Number(category.amountSpent)
      })),
      expenses
    });
  } catch (error) {
    console.error("GET /api/expenses failed:", error.message);
    return res.status(500).json({ error: "Could not load expenses. Check the database setup and connection." });
  }
});

app.post("/api/expenses", async (req, res) => {
  const body = req.body && typeof req.body === "object" && !Array.isArray(req.body)
    ? req.body
    : {};

  if (typeof body.amount !== "number" || !Number.isFinite(body.amount) || body.amount <= 0 || body.amount > 99999999.99) {
    return res.status(400).json({ error: "amount must be a number greater than 0 and no more than 99,999,999.99." });
  }
  if (typeof body.category !== "string" || !allowedCategories.has(body.category)) {
    return res.status(400).json({ error: "Choose one of the listed expense categories." });
  }
  if (typeof body.date !== "string" || !isValidDate(body.date)) {
    return res.status(400).json({ error: "date must be a valid date in YYYY-MM-DD format." });
  }
  if (body.note !== undefined && body.note !== null && typeof body.note !== "string") {
    return res.status(400).json({ error: "note must be text." });
  }
  const note = typeof body.note === "string" ? body.note.trim() : "";
  if (note.length > 200) {
    return res.status(400).json({ error: "note must be 200 characters or fewer." });
  }
  const amount = Math.round(body.amount * 100) / 100;
  if (amount <= 0) {
    return res.status(400).json({ error: "amount must be at least one cent." });
  }

  try {
    const result = await (await getPool()).request()
      .input("amount", sql.Decimal(10, 2), amount)
      .input("category", sql.NVarChar(30), body.category)
      .input("expenseDate", sql.Date, body.date)
      .input("note", sql.NVarChar(200), note || null)
      .query(queries.get("insert_expense"));

    if (result.recordset.length !== 1) {
      throw new Error("The expense insert did not return an ID.");
    }
    return res.status(201).json({ expenseID: result.recordset[0].expenseID });
  } catch (error) {
    console.error("POST /api/expenses failed:", error.message);
    return res.status(500).json({ error: "Could not save the expense. Check the database setup and connection." });
  }
});

app.use(express.static(webDirectory));

app.listen(port, () => {
  console.log(`Daybook is ready at http://localhost:${port}`);
});
