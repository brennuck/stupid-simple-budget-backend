import React, { useState } from "react";
import { Input, Button, message } from "antd";

interface PasswordProtectionProps {
    onCorrectPassword: () => void;
}

const PasswordProtection: React.FC<PasswordProtectionProps> = ({ onCorrectPassword }) => {
    const [password, setPassword] = useState("");

    const handleSubmit = () => {
        if (password === process.env.REACT_APP_PASSWORD) {
            onCorrectPassword();
        } else {
            message.error("Incorrect password");
        }
    };

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100vh",
            }}
        >
            <Input.Password
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                style={{ width: 300, marginBottom: 16 }}
            />
            <Button onClick={handleSubmit} type="primary">
                Submit
            </Button>
        </div>
    );
};

export default PasswordProtection;
