import { Table, Tag, Typography, message } from "antd";
import { formatCurrency } from "../../utiils";
import { MinusSquareTwoTone, PlusSquareTwoTone } from "@ant-design/icons";
import { useState } from "react";

export const AccountsTable = ({ data }: { data: any[] }) => {
    const [loading, setLoading] = useState(false);

    const typeColorMap = {
        savings: "green",
        allowance: "magenta",
        budget: "warning",
        stock_market: "blue",
    } as const;

    type AccountType = keyof typeof typeColorMap;

    const handleDeposit = async (id: number) => {
        setLoading(true);
        const amount = prompt("Enter deposit amount:");
        if (amount === null) {
            setLoading(false);
            return;
        }

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            message.error("Invalid amount");
            setLoading(false);
            return;
        }

        const description = prompt("Enter description:");

        if (description === null) {
            setLoading(false);
            return;
        }

        try {
            const response = await fetch("/deposit", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    amount: numAmount,
                    description,
                    date: new Date().toISOString(),
                    account_id: id,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to deposit");
            }

            message.success("Deposit successful");
            // onDataUpdate();
        } catch (error) {
            console.error("Error depositing:", error);
            message.error("Failed to deposit");
        } finally {
            setLoading(false);
        }
    };

    const handleWithdraw = async (id: number) => {
        setLoading(true);
        const amount = prompt("Enter withdrawal amount:");
        if (amount === null) {
            setLoading(false);
            return;
        }

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            message.error("Invalid amount");
            setLoading(false);
            return;
        }

        const description = prompt("Enter description:");

        if (description === null) {
            setLoading(false);
            return;
        }

        try {
            const response = await fetch("/withdrawal", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    amount: numAmount,
                    description,
                    date: new Date().toISOString(),
                    account_id: id,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to deposit");
            }

            message.success("Withdrawal successful");
            // onDataUpdate();
        } catch (error) {
            console.error("Error depositing:", error);
            message.error("Failed to deposit");
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            title: "Name",
            dataIndex: "friendly_name",
            key: "friendly_name",
            width: 131,
        },
        {
            title: "Balance",
            dataIndex: "balance",
            key: "balance",
            render: (balance: number) => <Typography.Text>{formatCurrency(balance)}</Typography.Text>,
        },
        {
            title: "Type",
            dataIndex: "type",
            key: "type",
            render: (type: AccountType) => <Tag color={typeColorMap[type]}>{type}</Tag>,
        },
        {
            title: "",
            dataIndex: "id",
            key: "deposit",
            width: 20,
            render: (id: number) => <PlusSquareTwoTone onClick={() => handleDeposit(id)} />,
        },
        {
            title: "",
            dataIndex: "id",
            key: "action",
            width: 20,
            render: (id: number) => <MinusSquareTwoTone onClick={() => handleWithdraw(id)} />,
        },
    ];

    return (
        <Table dataSource={data} columns={columns} size="small" bordered title={() => "Accounts"} loading={loading} />
    );
};
