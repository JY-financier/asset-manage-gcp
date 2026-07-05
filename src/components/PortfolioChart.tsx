"use client";

import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

export interface PortfolioSlice {
    name: string;   // 주식 / 파킹 / TDF / 예금 ...
    value: number;  // KRW
}

// 구분별 고정 색상 (파킹 = 주식 차트의 USHY와 동일한 teal)
const COLOR_BY_NAME: Record<string, string> = {
    "주식": "#6C5CE7",
    "파킹": "#00CEC9",
    "연금": "#FFA502",
};
const FALLBACK = ["#0984E3", "#E84393", "#2ED573", "#B2BEC3"];

interface PortfolioChartProps {
    slices: PortfolioSlice[];
}

export default function PortfolioChart({ slices }: PortfolioChartProps) {
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => setIsMounted(true), []);

    const data = slices.filter((s) => s.value > 0);
    const total = data.reduce((s, d) => s + d.value, 0);
    const fmt = (v: number) => `${new Intl.NumberFormat("ko-KR").format(Math.round(v))}원`;

    if (!isMounted) return <div className="card" style={{ height: "400px" }}>차트 로딩 중...</div>;

    return (
        <div className="card" style={{ height: "100%", minHeight: "400px", display: "flex", flexDirection: "column" }}>
            <h2 style={{ marginBottom: "16px", fontSize: "1.25rem", fontWeight: 600 }}>🥧 자산 구분 비중</h2>
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
                                <Cell key={`cell-${index}`} fill={COLOR_BY_NAME[entry.name] ?? FALLBACK[index % FALLBACK.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value: unknown) => {
                                const v = Number(value) || 0;
                                const pct = total > 0 ? (v / total) * 100 : 0;
                                return [`${fmt(v)} (${pct.toFixed(1)}%)`, "금액"];
                            }}
                            contentStyle={{
                                backgroundColor: "var(--bg-card-hover)",
                                border: "1px solid var(--border)",
                                borderRadius: "8px",
                                color: "var(--text-primary)",
                            }}
                            itemStyle={{ color: "var(--text-primary)" }}
                        />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ color: "var(--text-secondary)", fontSize: "0.85rem" }} />
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
                    <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "4px" }}>총자산</div>
                    <div style={{ fontSize: "1.15rem", fontWeight: 700 }}>{fmt(total)}</div>
                </div>
            </div>
        </div>
    );
}
