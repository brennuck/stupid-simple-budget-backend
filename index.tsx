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

// const performWeeklyDeposits = async () => {
//     const accounts = await getWeeklyDeposits();
//     const today = new Date();

//     for (const account of accounts) {
//         try {
//             const startDate = new Date(account.insert_start_date);
//             let shouldDeposit = false;

//             switch (account.insert_frequency) {
//                 case "weekly":
//                     shouldDeposit = (today.getTime() - startDate.getTime()) % (7 * 24 * 60 * 60 * 1000) === 0;
//                     break;
//                 case "bi-weekly":
//                     shouldDeposit = (today.getTime() - startDate.getTime()) % (14 * 24 * 60 * 60 * 1000) === 0;
//                     break;
//                 case "monthly":
//                     shouldDeposit = today.getDate() === startDate.getDate();
//                     break;
//             }

//             if (shouldDeposit) {
//                 const transaction = await createDepositTransaction({
//                     amount: account.insert_amount,
//                     description: `Automatic ${account.insert_frequency} deposit`,
//                     date: today.toISOString(),
//                     account_id: account.id,
//                 });
//                 await depositToAccount(transaction.to_account_id, transaction.amount);
//                 console.log(
//                     `Automatic ${account.insert_frequency} deposit of ${account.insert_amount} to account ${account.id} successful`
//                 );
//             }
//         } catch (error) {
//             console.error(`Error performing automatic deposit to account ${account.id}:`, error);
//         }
//     }
// };

// const getWeeklyDeposits = async () => {
//     const result = await pool.query(
//         "SELECT id, insert_frequency, insert_amount, insert_start_date FROM accounts where insert_frequency is not null and insert_amount is not null and insert_start_date is not null;"
//     );
//     return result.rows;
// };

const getAccounts = async () => {
    const client = await pool.connect();
    try {
        // Check if accounts table exists
        const tableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'accounts'
            );
        `);

        if (!tableCheck.rows[0].exists) {
            throw new Error("Accounts table does not exist");
        }

        const result = await client.query("SELECT * FROM accounts order by id asc;");
        return result.rows;
    } catch (error) {
        console.error("Error in getAccounts:", error);
        throw error;
    } finally {
        client.release();
    }
};

const createAccount = async (account) => {
    const result = await pool.query("INSERT INTO accounts (name, balance, type) VALUES ($1, $2, $3) RETURNING *;", [
        account.name,
        account.balance,
        account.type,
    ]);
    return result.rows[0];
};

const getTransactions = async () => {
    const client = await pool.connect();
    try {
        // Check if transactions table exists
        const tableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'transactions'
            );
        `);

        if (!tableCheck.rows[0].exists) {
            throw new Error("Transactions table does not exist");
        }

        const result = await client.query("SELECT * FROM transactions order by created_at desc;");
        return result.rows;
    } catch (error) {
        console.error("Error in getTransactions:", error);
        throw error;
    } finally {
        client.release();
    }
};

const createTransaction = async (transaction) => {
    console.log(transaction);
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        if (transaction.type === "expense") {
            await pool.query(
                "INSERT INTO transactions (amount, description, date, from_account_id) VALUES ($1, $2, $3, $4);",
                [transaction.amount, transaction.description, transaction.date, transaction.account_id]
            );
            await pool.query("UPDATE accounts SET balance = balance + $1 WHERE id = $2;", [
                transaction.amount,
                transaction.account_id,
            ]);
            if (transaction.account_id !== 1 && transaction.account_id !== 9) {
                await pool.query("UPDATE accounts SET balance = balance + $1 WHERE name = 'savings';", [
                    transaction.amount,
                ]);
            }
        } else {
            await pool.query(
                "INSERT INTO transactions (amount, description, date, to_account_id) VALUES ($1, $2, $3, $4) RETURNING *;",
                [transaction.amount, transaction.description, transaction.date, transaction.account_id]
            );
            await pool.query("UPDATE accounts SET balance = balance + $1 WHERE id = $2;", [
                transaction.amount,
                transaction.account_id,
            ]);
        }

        await client.query("COMMIT");
    } catch (e) {
        await client.query("ROLLBACK");
        throw e;
    } finally {
        client.release();
    }
};

const getAllData = async () => {
    const accounts = await getAccounts();
    const transactions = await getTransactions();
    return { accounts, transactions };
};

const createTables = async () => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query(`
      CREATE TABLE accounts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        balance NUMERIC(10, 2) NOT NULL,
        type VARCHAR(50) NOT NULL
      );
    `);

        await client.query(`
        CREATE TABLE transactions (
        id SERIAL PRIMARY KEY,
        amount NUMERIC(10, 2) NOT NULL,
        description TEXT,
        date DATE NOT NULL,
        from_account_id INTEGER REFERENCES accounts(id),
        to_account_id INTEGER REFERENCES accounts(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

const insertAccounts = async (accounts) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        for (const account of accounts) {
            await client.query(
                `
                INSERT INTO accounts (name, balance, type) VALUES ($1, $2, $3);
            `,
                [account.name, account.balance, account.type]
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

const insertTransactions = async (transactions) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        for (const transaction of transactions) {
            await client.query(
                `INSERT INTO transactions (amount, description, date, from_account_id, to_account_id) VALUES ($1, $2, $3, $4, $5);`,
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

const insertData = async (data) => {
    try {
        await insertAccounts(data.accounts);
        await insertTransactions(data.transactions);
    } catch (error) {
        console.error("Error inserting data:", error);
        throw error;
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
    try {
        const accounts = await getAccounts();
        return res.json(accounts);
    } catch (error) {
        console.error("Error fetching accounts:", error);
        return res.status(500).json({
            error: error.message || "An error occurred while fetching accounts",
        });
    }
});

app.post("/account", async (req, res) => {
    const account = await createAccount(req.body);
    return res.json(account);
});

app.get("/transactions", async (req, res) => {
    try {
        const transactions = await getTransactions();
        return res.json(transactions);
    } catch (error) {
        console.error("Error fetching transactions:", error);
        return res.status(500).json({
            error: error.message || "An error occurred while fetching transactions",
        });
    }
});

app.post("/transaction", async (req, res) => {
    const transaction = await createTransaction(req.body);
    return res.json(transaction);
});

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
        await createTables();
        await insertData(req.body);
        res.json({ status: 200, message: "Data uploaded successfully" });
    } catch (error) {
        console.error("Error uploading data:", error);
        res.status(500).json({ error: "An error occurred while uploading data" });
    }
});

// Schedule the deposits to run daily at midnight
// cron.schedule("0 0 * * *", () => {
//     console.log("Running daily deposit check");
//     performWeeklyDeposits();
// });

app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
});
