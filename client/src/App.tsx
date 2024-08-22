import React from "react";
import "./App.css";
import { AccountsTable } from "./components/AccountsTable";
import { Col, Row, Skeleton, Typography } from "antd";
import { TransactionsTable } from "./components/TransactionsTable";

function App() {
    const [data, setData] = React.useState<any>(null);

    React.useEffect(() => {
        fetch("/accounts")
            .then((res) => res.json())
            .then((data) => setData(data));
    }, []);

    let children;

    if (!data) {
        children = <Skeleton active />;
    } else {
        children = (
            <>
                <AccountsTable data={data} />
                <TransactionsTable />
            </>
        );
    }

    console.log("data -->", data);

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
