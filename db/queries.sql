-- query: monthly_dashboard
-- For VS Code testing, temporarily uncomment this declaration and set the month:
-- DECLARE @monthStart date = '2026-11-01';
-- DECLARE @monthEnd date = '2026-12-01';

SELECT
    @monthStart AS monthStart,
    COALESCE(b.BudgetAmount, CONVERT(decimal(10,2), 0)) AS budgetAmount,
    COALESCE(SUM(e.Amount), CONVERT(decimal(10,2), 0)) AS amountSpent,
    COALESCE(b.BudgetAmount, CONVERT(decimal(10,2), 0))
        - COALESCE(SUM(e.Amount), CONVERT(decimal(10,2), 0)) AS remaining,
    COUNT(e.ExpenseID) AS expenseCount
FROM (VALUES (@monthStart)) AS requestedMonth (MonthStart)
LEFT JOIN dbo.MonthlyBudgets AS b
    ON b.MonthStart = requestedMonth.MonthStart
LEFT JOIN dbo.Expenses AS e
    ON e.ExpenseDate >= requestedMonth.MonthStart
    AND e.ExpenseDate < DATEADD(MONTH, 1, @monthStart)
GROUP BY b.BudgetAmount;

SELECT
    c.CategoryName AS category,
    COALESCE(SUM(e.Amount), CONVERT(decimal(10,2), 0)) AS amountSpent
FROM dbo.ExpenseCategories AS c
LEFT JOIN dbo.Expenses AS e
    ON e.CategoryID = c.CategoryID
    AND e.ExpenseDate >= @monthStart
    AND e.ExpenseDate < DATEADD(MONTH, 1, @monthStart)
GROUP BY c.CategoryID, c.CategoryName, c.SortOrder
ORDER BY c.SortOrder;

SELECT TOP (100)
    e.ExpenseID AS expenseID,
    e.Amount AS amount,
    c.CategoryName AS category,
    CONVERT(char(10), e.ExpenseDate, 23) AS expenseDate,
    e.Note AS note
FROM dbo.Expenses AS e
JOIN dbo.ExpenseCategories AS c
    ON c.CategoryID = e.CategoryID
WHERE e.ExpenseDate >= @monthStart
    AND e.ExpenseDate < DATEADD(MONTH, 1, @monthStart)
ORDER BY e.ExpenseDate DESC, e.ExpenseID DESC;

-- query: insert_expense
-- For VS Code, declare test values before running this section:
-- DECLARE @amount decimal(10,2) = 12.50;
-- DECLARE @category nvarchar(30) = N'Groceries';
-- DECLARE @expenseDate date = '2026-11-24';
-- DECLARE @note nvarchar(200) = N'Groceries for the week';
INSERT INTO dbo.Expenses (CategoryID, Amount, ExpenseDate, Note)
OUTPUT INSERTED.ExpenseID AS expenseID
SELECT
    c.CategoryID,
    @amount,
    @expenseDate,
    @note
FROM dbo.ExpenseCategories AS c
WHERE c.CategoryName = @category;

IF @@ROWCOUNT = 0
    THROW 50001, 'Unknown expense category.', 1;
