import React from "react";
import { Table, Tag, Typography } from "antd";
import { formatCurrency } from "../../utils";

export const TransactionsTable = ({ data }: any) => {
    const typeIdMap = {
        1: { color: "green", category: "Savings Account" },
        2: { color: "magenta", category: "Brennon Allowance" },
        3: { color: "magenta", category: "Kayla Allowance" },
        4: { color: "magenta", category: "Jo Allowance" },
        5: { color: "warning", category: "Grocery Budget" },
        6: { color: "warning", category: "Gas Budget" },
        7: { color: "green", category: "Brennon Roth IRA" },
        8: { color: "green", category: "Kayla Roth IRA" },
        9: { color: "blue", category: "Stock Market" },
    } as const;

    const columns = [
        {
            title: "Description",
            dataIndex: "description",
            key: "description",
        },
        {
            title: "Amount",
            dataIndex: "amount",
            key: "amount",
            render: (balance: number) => <Typography.Text>{formatCurrency(balance)}</Typography.Text>,
        },
        {
            title: "Date",
            dataIndex: "date",
            key: "date",
            render: (date: string) => (
                <Typography.Text>
                    {new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                </Typography.Text>
            ),
        },
        {
            title: "Type",
            dataIndex: ["from_account_id", "to_account_id"],
            key: "account_id",
            render: (text: string, record: any) => {
                const accountId = record.from_account_id || record.to_account_id;
                const typeId = Number(accountId) as keyof typeof typeIdMap;
                const { color, category } = typeIdMap[typeId] || { color: "default", category: "unknown" };
                return <Tag color={color}>{category}</Tag>;
            },
        },
    ];

    return (
        <Table dataSource={data} columns={columns} size="small" bordered title={() => "Transactions"} loading={!data} />
    );
};
