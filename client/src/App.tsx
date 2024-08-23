import React, { useState, useEffect } from "react";
import "./App.css";
import { AccountsTable } from "./components/AccountsTable";
import { Col, Row, Skeleton, Typography } from "antd";
import { TransactionsTable } from "./components/TransactionsTable";
import { API_URL } from "./config";
import { ConfigProvider, theme } from "antd";
import "./ThemeStyle.css";

function App() {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [accountsData, setAccountsData] = useState<any>(null);
    const [transactionsData, setTransactionsData] = useState<any>(null);

    const toggleTheme = () => {
        setIsDarkMode(!isDarkMode);
    };

    const fetchData = () => {
        const url = API_URL ? API_URL : "";
        fetch(`${url}/accounts`)
            .then((res) => res.json())
            .then((data) => setAccountsData(data));

        fetch(`${url}/transactions`)
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
        <ConfigProvider
            theme={{
                algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
                token: { colorPrimary: "#A28089" },
            }}
        >
            <div className={isDarkMode ? "dark-mode" : "light-mode"}>
                <Row>
                    <Col offset={1}>
                        <Typography.Title level={2} onClick={toggleTheme} style={{ cursor: "pointer" }}>
                            Stupid Simple Budget
                        </Typography.Title>
                    </Col>
                </Row>
                <Row>
                    <Col offset={1} span={22}>
                        {children}
                    </Col>
                </Row>
            </div>
        </ConfigProvider>
    );
}

export default App;
