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

app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
});
