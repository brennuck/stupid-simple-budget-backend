const setupCreateTransaction = () => {
    jest.resetModules();
    process.env.DATABASE_URL = "postgres://localhost/test";

    const clientQuery = jest.fn().mockResolvedValue({ rows: [] });
    const release = jest.fn();
    const connect = jest.fn().mockResolvedValue({ query: clientQuery, release });
    const poolQuery = jest.fn();

    jest.doMock("pg", () => ({
        Pool: jest.fn(() => ({
            connect,
            query: poolQuery,
        })),
    }));

    const module = require("./index.tsx");

    return {
        ...module,
        clientQuery,
        release,
        connect,
        poolQuery,
    };
};

describe("createTransaction", () => {
    it("avoids double updating Marcus when expense is recorded directly against the savings account", async () => {
        const { createTransaction, clientQuery, release, connect } = setupCreateTransaction();
        const initialConnectCalls = connect.mock.calls.length;

        await createTransaction({
            type: "expense",
            amount: -50,
            description: "Test expense",
            date: "2024-01-02",
            account_id: "1",
            take_from_savings: true,
        });

        expect(connect.mock.calls.length).toBe(initialConnectCalls + 1);
        expect(clientQuery).toHaveBeenNthCalledWith(1, "BEGIN");
        expect(clientQuery).toHaveBeenCalledWith(
            "INSERT INTO transactions (amount, description, date, from_account_id) VALUES ($1, $2, $3, $4);",
            [-50, "Test expense", "2024-01-02", 1]
        );
        expect(clientQuery).toHaveBeenCalledWith(
            "UPDATE accounts SET balance = balance + $1 WHERE id = $2;",
            [-50, 1]
        );
        expect(clientQuery).not.toHaveBeenCalledWith(
            "UPDATE accounts SET balance = balance + $1 WHERE name = 'Marcus';",
            expect.any(Array)
        );
        expect(clientQuery).toHaveBeenLastCalledWith("COMMIT");
        expect(release).toHaveBeenCalledTimes(1);
    });

    it("updates Marcus when an expense is taken from savings for another account", async () => {
        const { createTransaction, clientQuery } = setupCreateTransaction();

        await createTransaction({
            type: "expense",
            amount: -75,
            description: "Shared expense",
            date: "2024-01-03",
            account_id: "2",
            take_from_savings: true,
        });

        expect(clientQuery).toHaveBeenCalledWith(
            "INSERT INTO transactions (amount, description, date, from_account_id) VALUES ($1, $2, $3, $4);",
            [-75, "Shared expense", "2024-01-03", 2]
        );
        expect(clientQuery).toHaveBeenCalledWith(
            "UPDATE accounts SET balance = balance + $1 WHERE id = $2;",
            [-75, 2]
        );
        expect(clientQuery).toHaveBeenCalledWith(
            "UPDATE accounts SET balance = balance + $1 WHERE name = 'Marcus';",
            [-75]
        );
    });

    it("transfers from Marcus on deposits that are funded by savings", async () => {
        const { createTransaction, clientQuery } = setupCreateTransaction();

        await createTransaction({
            type: "deposit",
            amount: 125,
            description: "Savings transfer",
            date: "2024-01-04",
            account_id: "3",
            take_from_savings: true,
        });

        expect(clientQuery).toHaveBeenCalledWith(
            "INSERT INTO transactions (amount, description, date, to_account_id) VALUES ($1, $2, $3, $4) RETURNING *;",
            [125, "Savings transfer", "2024-01-04", 3]
        );
        expect(clientQuery).toHaveBeenCalledWith(
            "UPDATE accounts SET balance = balance + $1 WHERE id = $2;",
            [125, 3]
        );
        expect(clientQuery).toHaveBeenCalledWith(
            "UPDATE accounts SET balance = balance - $1 WHERE name = 'Marcus';",
            [125]
        );
    });
});
