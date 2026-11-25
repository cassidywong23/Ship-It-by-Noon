IF OBJECT_ID(N'dbo.ExpenseCategories', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ExpenseCategories (
        CategoryID int IDENTITY(1,1) NOT NULL,
        CategoryName nvarchar(30) NOT NULL,
        SortOrder tinyint NOT NULL,
        CONSTRAINT PK_ExpenseCategories PRIMARY KEY (CategoryID),
        CONSTRAINT UQ_ExpenseCategories_CategoryName UNIQUE (CategoryName),
        CONSTRAINT UQ_ExpenseCategories_SortOrder UNIQUE (SortOrder)
    );
END;

IF OBJECT_ID(N'dbo.MonthlyBudgets', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.MonthlyBudgets (
        MonthStart date NOT NULL,
        BudgetAmount decimal(10,2) NOT NULL,
        CONSTRAINT PK_MonthlyBudgets PRIMARY KEY (MonthStart),
        CONSTRAINT CK_MonthlyBudgets_FirstOfMonth CHECK (DAY(MonthStart) = 1),
        CONSTRAINT CK_MonthlyBudgets_BudgetAmount CHECK (BudgetAmount > 0)
    );
END;

IF OBJECT_ID(N'dbo.Expenses', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Expenses (
        ExpenseID int IDENTITY(1,1) NOT NULL,
        CategoryID int NOT NULL,
        Amount decimal(10,2) NOT NULL,
        ExpenseDate date NOT NULL,
        Note nvarchar(200) NULL,
        CreatedAt datetime2(0) NOT NULL
            CONSTRAINT DF_Expenses_CreatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_Expenses PRIMARY KEY (ExpenseID),
        CONSTRAINT CK_Expenses_Amount CHECK (Amount > 0),
        CONSTRAINT FK_Expenses_ExpenseCategories
            FOREIGN KEY (CategoryID) REFERENCES dbo.ExpenseCategories (CategoryID)
    );
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.Expenses')
      AND name = N'IX_Expenses_ExpenseDate'
)
BEGIN
    CREATE INDEX IX_Expenses_ExpenseDate
        ON dbo.Expenses (ExpenseDate DESC, ExpenseID DESC);
END;
