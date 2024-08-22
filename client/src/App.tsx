import React, { useState, useEffect } from "react";
import "./App.css";
import { AccountsTable } from "./components/AccountsTable";
import { Col, Row, Skeleton, Typography } from "antd";
import { TransactionsTable } from "./components/TransactionsTable";

function App() {
    const [accountsData, setAccountsData] = useState<any>(null);
    const [transactionsData, setTransactionsData] = useState<any>(null);

    const fetchData = () => {
        fetch("/accounts")
            .then((res) => res.json())
            .then((data) => setAccountsData(data));

        fetch("/transactions")
            .then((res) => res.json())
            .then((data) => setTransactionsData(data));
    };

    useEffect(() => {
        fetchData();
    }, []);

    const onDataUpdate = () => {
        fetchData();
    };

    let children;

    if (!accountsData) {
        children = <Skeleton active />;
    } else {
        children = (
            <>
                <AccountsTable data={accountsData} onDataUpdate={onDataUpdate} />
                <TransactionsTable data={transactionsData} />
            </>
        );
    }

    return (
        <>
            <Row>
                <Col offset={1}>
                    <Typography.Title level={2}>Stupid Simple Budget</Typography.Title>
                </Col>
            </Row>
            <Row>
                <Col offset={1} span={22}>
                    {children}
                </Col>
            </Row>
        </>
    );
}

export default App;
