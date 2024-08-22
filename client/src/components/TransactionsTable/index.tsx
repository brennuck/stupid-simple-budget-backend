import React from "react";
import { Table, Tag, Typography } from "antd";
import { formatCurrency } from "../../utiils";

export const TransactionsTable = () => {
    const [data, setData] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    const typeIdMap = {
        1: { color: "green", category: "Savings Account" },
        5: { color: "magenta", category: "Brennon Allowance" },
        6: { color: "magenta", category: "Kayla Allowance" },
        7: { color: "magenta", category: "Jo Allowance" },
        8: { color: "warning", category: "Grocery Budget" },
        9: { color: "warning", category: "Gas Budget" },
        10: { color: "green", category: "Brennon Roth IRA" },
        11: { color: "green", category: "Kayla Roth IRA" },
        12: { color: "blue", category: "Stock Market" },
    } as const;

    React.useEffect(() => {
        fetch("/transactions")
            .then((res) => res.json())
            .then((data) => setData(data))
            .finally(() => setLoading(false));
    }, []);

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
            dataIndex: "from_account_id",
            key: "from_account_id",
            render: (from_account_id: string) => {
                const typeId = Number(from_account_id) as keyof typeof typeIdMap;
                const { color, category } = typeIdMap[typeId] || { color: "default", category: "unknown" };
                return <Tag color={color}>{category}</Tag>;
            },
        },
    ];

    return (
        <Table
            dataSource={data}
            columns={columns}
            size="small"
            bordered
            title={() => "Transactions"}
            loading={loading}
        />
    );
};
