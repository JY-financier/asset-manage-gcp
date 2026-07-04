import React from "react";
import Navigation from "@/components/Navigation";
import TradeForm from "@/components/TradeForm";

export default function NewTradePage() {
    return (
        <main className="container" style={{ padding: "40px 16px", minHeight: "100vh", paddingBottom: "80px" }}>
            <header style={{ marginBottom: "24px" }}>
                <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "4px" }}>거래 추가</h1>
                <p className="text-secondary">매수·매도 내역을 기록합니다. 평단·누적수량은 자동 계산됩니다.</p>
            </header>

            <Navigation />

            <TradeForm />
        </main>
    );
}
