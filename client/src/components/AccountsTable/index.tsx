import { Table, Tag, Typography, message } from "antd";
import { formatCurrency } from "../../utils";
import { MinusSquareTwoTone, PlusSquareTwoTone } from "@ant-design/icons";
import { useState } from "react";
import { API_URL } from "../../config";

export const AccountsTable = ({ data, onDataUpdate }: { data: any[]; onDataUpdate: () => void }) => {
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
            message.error("Failed to deposit - Invalid amount - null");
            return;
        }

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            setLoading(false);
            message.error("Failed to deposit - Invalid amount " + numAmount);
            return;
        }

        const description = prompt("Enter description:");

        if (description === null) {
            setLoading(false);
            message.error("Failed to deposit - Invalid description " + description);
            return;
        }

        try {
            const url = API_URL ? API_URL : "";
            const response = await fetch(`${url}/deposit`, {
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
                message.error("Failed to deposit");
                return;
            }

            message.success("Deposit successful");
            onDataUpdate();
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
            message.error("Failed to withdraw - Invalid amount - null");
            return;
        }

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            message.error("Failed to withdraw - Invalid amount " + numAmount);
            setLoading(false);
            return;
        }

        const description = prompt("Enter description:");

        if (description === null) {
            message.error("Failed to withdraw - Invalid description " + description);
            setLoading(false);
            return;
        }

        try {
            const url = API_URL ? API_URL : "";
            const response = await fetch(`${url}/withdrawal`, {
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
                message.error("Failed to withdraw");
                console.log("error", response);
                return;
            }

            message.success("Withdrawal successful");
            onDataUpdate();
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
            width: 91.6,
        },
        {
            title: "Type",
            dataIndex: "type",
            key: "type",
            render: (type: AccountType) => <Tag color={typeColorMap[type]}>{type}</Tag>,
        },
        {
            title: "Deposit",
            dataIndex: ["insert_frequency", "insert_amount"],
            key: "insert",
            render: (text: string, record: any) => (
                <Tag>
                    {record.insert_frequency !== "never" && record.insert_frequency}
                    {record.insert_amount && `- ${formatCurrency(record.insert_amount)}`}
                </Tag>
            ),
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
