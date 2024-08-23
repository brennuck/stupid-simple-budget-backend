const express = require("express");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const cors = require("cors");

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

app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
});
