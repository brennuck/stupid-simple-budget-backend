import React, { useState, useEffect } from "react";
import "./App.css";
import { AccountsTable } from "./components/AccountsTable";
import { Col, Row, Skeleton, Typography, Button, message, Upload, theme, ConfigProvider } from "antd";
import { TransactionsTable } from "./components/TransactionsTable";
import { API_URL } from "./config";
import "./ThemeStyle.css";
import PasswordProtection from "./components/PasswordProtection";
import { DownloadOutlined, UploadOutlined } from "@ant-design/icons";

function App() {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [accountsData, setAccountsData] = useState<any>(null);
    const [transactionsData, setTransactionsData] = useState<any>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

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
        if (isAuthenticated) {
            fetchData();
        }
    }, [isAuthenticated]);

    const onDataUpdate = () => {
        fetchData();
    };

    const handleCorrectPassword = () => {
        setIsAuthenticated(true);
    };

    const handleDownload = async () => {
        try {
            const apiUrl = API_URL ? API_URL : "";
            const response = await fetch(`${apiUrl}/download-data`);
            if (!response.ok) {
                throw new Error("Failed to download data");
            }
            const data = await response.json();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.style.display = "none";
            a.href = url;
            a.download = "budget_data.json";
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error downloading data:", error);
            message.error("Failed to download data");
        }
    };

    const handleUpload = async (file: File) => {
        try {
            const fileContent = await file.text();
            const data = JSON.parse(fileContent);
            const url = API_URL ? API_URL : "";
            const response = await fetch(`${url}/upload-data`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                throw new Error("Failed to upload data");
            }
            message.success("Data uploaded successfully");
            fetchData();
        } catch (error) {
            console.error("Error uploading data:", error);
            message.error("Failed to upload data");
        }
    };

    let children;

    if (!isAuthenticated) {
        children = <PasswordProtection onCorrectPassword={handleCorrectPassword} />;
    } else if (!accountsData) {
        children = (
            <>
                <Skeleton active />
                <Upload
                    accept=".json"
                    showUploadList={false}
                    beforeUpload={(file) => {
                        handleUpload(file);
                        return false;
                    }}
                >
                    <Button icon={<UploadOutlined />}>Upload Data</Button>
                </Upload>
            </>
        );
    } else {
        children = (
            <>
                <AccountsTable data={accountsData} onDataUpdate={onDataUpdate} />
                <TransactionsTable data={transactionsData} />
                <div style={{ marginTop: "20px", display: "flex", justifyContent: "space-between" }}>
                    <Button icon={<DownloadOutlined />} onClick={handleDownload}>
                        Download Data
                    </Button>
                    <Upload
                        accept=".json"
                        showUploadList={false}
                        beforeUpload={(file) => {
                            handleUpload(file);
                            return false;
                        }}
                    >
                        <Button icon={<UploadOutlined />}>Upload Data</Button>
                    </Upload>
                </div>
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
                {isAuthenticated && (
                    <Row>
                        <Col offset={1}>
                            <Typography.Title level={2} onClick={toggleTheme} style={{ cursor: "pointer" }}>
                                Stupid Simple Budget
                            </Typography.Title>
                        </Col>
                    </Row>
                )}
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
