"use client";

import React, { useState, useEffect, useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { HoldingRow } from "@/lib/supabase";

interface AssetChartProps {
    holdings: HoldingRow[];
    fxRate: number | null; // USD/KRW
}

const COLORS = [
    "#6C5CE7", "#2ED573", "#FF4757", "#FFA502",
    "#0984E3", "#00B894", "#E84393", "#FDCB6E",
    "#00CEC9", "#D63031", "#B2BEC3",
];

// 평가금액 우선, 없으면 매입원가. USD는 환율 적용해 KRW로 통일.
function valueInKrw(h: HoldingRow, fxRate: number | null): number {
    const base = h.market_value ?? h.total_cost ?? 0;
    if (h.currency === "USD") return fxRate ? base * fxRate : 0;
    return base;
}

export default function AssetChart({ holdings, fxRate }: AssetChartProps) {
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => setIsMounted(true), []);

    const hasMarketValue = holdings.some((h) => h.market_value !== null);

    const data = useMemo(() => {
        const total = holdings.reduce((s, h) => s + valueInKrw(h, fxRate), 0);
        return holdings
            .filter((h) => valueInKrw(h, fxRate) > 0)
            .map((h) => ({
                name: h.name,
                value: valueInKrw(h, fxRate),
                ratio: total > 0 ? valueInKrw(h, fxRate) / total : 0,
                currency: h.currency,
            }));
    }, [holdings, fxRate]);

    const totalCost = data.reduce((s, d) => s + d.value, 0);

    const formatCurrency = (value: number) =>
        `${new Intl.NumberFormat("ko-KR").format(Math.round(value))}원`;

    if (!isMounted) {
        return <div className="card" style={{ height: "400px" }}>차트 로딩 중...</div>;
    }

    return (
        <div className="card" style={{ height: "100%", minHeight: "400px", display: "flex", flexDirection: "column" }}>
            <h2 style={{ marginBottom: "8px", fontSize: "1.25rem", fontWeight: 600 }}>
                🥧 종목별 비중 ({hasMarketValue ? "평가금액" : "매입원가"} 기준)
            </h2>
            <p className="text-secondary" style={{ marginBottom: "16px", fontSize: "0.85rem" }}>
                {hasMarketValue
                    ? "USD 자산은 현재 환율로 KRW 환산했습니다."
                    : "시세 갱신 후 평가금액 기준으로 자동 전환됩니다."}
            </p>
            <div style={{ flex: 1, position: "relative", minHeight: "300px" }}>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={80}
                            outerRadius={120}
                            paddingAngle={3}
                            dataKey="value"
                            stroke="none"
                            animationBegin={0}
                            animationDuration={1200}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value: unknown, _name: unknown, item: { payload?: { ratio?: number } }) => {
                                const pct = item?.payload?.ratio ?? 0;
                                return [`${(pct * 100).toFixed(2)}%`, "비중"];
                            }}
                            contentStyle={{
                                backgroundColor: "var(--bg-card-hover)",
                                border: "1px solid var(--border)",
                                borderRadius: "8px",
                                color: "var(--text-primary)",
                            }}
                            itemStyle={{ color: "var(--text-primary)" }}
                        />
                        <Legend
                            verticalAlign="bottom"
                            height={36}
                            iconType="circle"
                            wrapperStyle={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}
                        />
                    </PieChart>
                </ResponsiveContainer>

                <div
                    style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        textAlign: "center",
                        pointerEvents: "none",
                        marginTop: "-18px",
                    }}
                >
                    <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "4px" }}>
                        {hasMarketValue ? "총 평가금액" : "총 매입원가"}
                    </div>
                    <div style={{ fontSize: "1.15rem", fontWeight: 700 }}>{formatCurrency(totalCost)}</div>
                </div>
            </div>
        </div>
    );
}
