const express = require("express");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const cors = require("cors");
const cron = require("node-cron");

require("dotenv").config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
});

pool.connect((err, client, release) => {
    if (err) {
        return console.error("Error acquiring client", err.stack);
    }
});

const app = express();

const PORT = process.env.PORT || 2933;

app.use(cors());
app.use(bodyParser.json());
app.use(
    bodyParser.urlencoded({
        extended: true,
    })
);

const performWeeklyDeposits = async () => {
    const accounts = await getWeeklyDeposits();
    const today = new Date();

    for (const account of accounts) {
        try {
            const startDate = new Date(account.insert_start_date);
            let shouldDeposit = false;

            switch (account.insert_frequency) {
                case "weekly":
                    shouldDeposit = (today.getTime() - startDate.getTime()) % (7 * 24 * 60 * 60 * 1000) === 0;
                    break;
                case "bi-weekly":
                    shouldDeposit = (today.getTime() - startDate.getTime()) % (14 * 24 * 60 * 60 * 1000) === 0;
                    break;
                case "monthly":
                    shouldDeposit = today.getDate() === startDate.getDate();
                    break;
            }

            if (shouldDeposit) {
                const transaction = await createDepositTransaction({
                    amount: account.insert_amount,
                    description: `Automatic ${account.insert_frequency} deposit`,
                    date: today.toISOString(),
                    account_id: account.id,
                });
                await depositToAccount(transaction.to_account_id, transaction.amount);
                console.log(
                    `Automatic ${account.insert_frequency} deposit of ${account.insert_amount} to account ${account.id} successful`
                );
            }
        } catch (error) {
            console.error(`Error performing automatic deposit to account ${account.id}:`, error);
        }
    }
};

const getWeeklyDeposits = async () => {
    const result = await pool.query(
        "SELECT id, insert_frequency, insert_amount, insert_start_date FROM accounts where insert_frequency is not null and insert_amount is not null and insert_start_date is not null;"
    );
    return result.rows;
};

const getAccounts = async () => {
    const result = await pool.query("SELECT * FROM accounts order by id asc;");
    return result.rows;
};

const getTransactions = async () => {
    const result = await pool.query("SELECT * FROM transactions order by created_at desc;");
    return result.rows;
};

const createWithdrawalTransaction = async (transaction) => {
    const result = await pool.query(
        "INSERT INTO transactions (amount, description, date, from_account_id) VALUES ($1, $2, $3, $4) RETURNING *;",
        [`-${transaction.amount}`, transaction.description, transaction.date, transaction.account_id]
    );
    return result.rows[0];
};

const createDepositTransaction = async (transaction) => {
    const result = await pool.query(
        "INSERT INTO transactions (amount, description, date, to_account_id) VALUES ($1, $2, $3, $4) RETURNING *;",
        [transaction.amount, transaction.description, transaction.date, transaction.account_id]
    );
    return result.rows[0];
};

const withdrawFromAccount = async (account_id, amount) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await client.query("UPDATE accounts SET balance = balance + $1 WHERE id = $2 RETURNING *;", [
            amount,
            account_id,
        ]);

        if (account_id !== 1) {
            await client.query("UPDATE accounts SET balance = balance + $1 WHERE name = 'savings';", [amount]);
        }

        await client.query("COMMIT");
        return result.rows[0];
    } catch (e) {
        await client.query("ROLLBACK");
        throw e;
    } finally {
        client.release();
    }
};

const depositToAccount = async (account_id, amount) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await client.query("UPDATE accounts SET balance = balance + $1 WHERE id = $2 RETURNING *;", [
            amount,
            account_id,
        ]);

        if (account_id !== 1) {
            await client.query("UPDATE accounts SET balance = balance - $1 WHERE name = 'savings';", [amount]);
        }

        await client.query("COMMIT");
        return result.rows[0];
    } catch (e) {
        await client.query("ROLLBACK");
        throw e;
    } finally {
        client.release();
    }
};

app.get("/", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW() as current_time");
        return res.json({
            status: "healthy",
            database_connection: "successful",
            current_time: result.rows[0].current_time,
            message: "HEALTHY",
        });
    } catch (error) {
        console.error("Database connection error:", error);
        return res.status(500).json({
            status: "unhealthy",
            database_connection: "failed",
            error: "Unable to connect to the database",
            message: "UNHEALTHY",
        });
    }
});

app.get("/accounts", async (req, res) => {
    const accounts = await getAccounts();
    return res.json(accounts);
});

app.get("/transactions", async (req, res) => {
    const transactions = await getTransactions();
    return res.json(transactions);
});

app.post("/withdrawal", async (req, res) => {
    const transaction = await createWithdrawalTransaction(req.body);
    await withdrawFromAccount(transaction.from_account_id, transaction.amount);
    return res.json(transaction);
});

app.post("/deposit", async (req, res) => {
    const transaction = await createDepositTransaction(req.body);
    await depositToAccount(transaction.to_account_id, transaction.amount);
    return res.json(transaction);
});

// Schedule the deposits to run daily at midnight
cron.schedule("0 0 * * *", () => {
    console.log("Running daily deposit check");
    performWeeklyDeposits();
});

// Add these functions after the existing ones

const getAllData = async () => {
    const accounts = await getAccounts();
    const transactions = await getTransactions();
    return { accounts, transactions };
};

const createTablesIfNotExist = async () => {
    const client = await pool.connect();
    try {
        await client.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        friendly_name VARCHAR(255),
        balance NUMERIC(10, 2) NOT NULL,
        type VARCHAR(50),
        insert_frequency VARCHAR(50),
        insert_amount NUMERIC(10, 2),
        insert_start_date DATE
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        amount NUMERIC(10, 2) NOT NULL,
        description TEXT,
        date DATE NOT NULL,
        from_account_id INTEGER REFERENCES accounts(id),
        to_account_id INTEGER REFERENCES accounts(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    } finally {
        client.release();
    }
};

const insertData = async (data) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // Insert accounts
        for (const account of data.accounts) {
            await client.query(
                `
        INSERT INTO accounts (name, friendly_name, balance, type, insert_frequency, insert_amount, insert_start_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          friendly_name = EXCLUDED.friendly_name,
          balance = EXCLUDED.balance,
          type = EXCLUDED.type,
          insert_frequency = EXCLUDED.insert_frequency,
          insert_amount = EXCLUDED.insert_amount,
          insert_start_date = EXCLUDED.insert_start_date
      `,
                [
                    account.name,
                    account.friendly_name,
                    account.balance,
                    account.type,
                    account.insert_frequency,
                    account.insert_amount,
                    account.insert_start_date,
                ]
            );
        }

        // Insert transactions
        for (const transaction of data.transactions) {
            await client.query(
                `
        INSERT INTO transactions (amount, description, date, from_account_id, to_account_id)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET
          amount = EXCLUDED.amount,
          description = EXCLUDED.description,
          date = EXCLUDED.date,
          from_account_id = EXCLUDED.from_account_id,
          to_account_id = EXCLUDED.to_account_id
      `,
                [
                    transaction.amount,
                    transaction.description,
                    transaction.date,
                    transaction.from_account_id,
                    transaction.to_account_id,
                ]
            );
        }

        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

// Add these new routes after the existing ones

app.get("/download-data", async (req, res) => {
    try {
        const data = await getAllData();
        res.json(data);
    } catch (error) {
        console.error("Error downloading data:", error);
        res.status(500).json({ error: "An error occurred while downloading data" });
    }
});

app.post("/upload-data", async (req, res) => {
    try {
        await createTablesIfNotExist();
        await insertData(req.body);
        res.json({ message: "Data uploaded successfully" });
    } catch (error) {
        console.error("Error uploading data:", error);
        res.status(500).json({ error: "An error occurred while uploading data" });
    }
});

app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
});
