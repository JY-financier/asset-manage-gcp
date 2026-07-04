"use client";

import React, { useState, useEffect, useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { HoldingRow } from "@/lib/supabase";

interface AssetChartProps {
    holdings: HoldingRow[];
}

const COLORS = [
    "#6C5CE7", "#2ED573", "#FF4757", "#FFA502",
    "#0984E3", "#00B894", "#E84393", "#FDCB6E",
    "#00CEC9", "#D63031", "#B2BEC3",
];

// KRW로 통일한 대략적인 원가 (USD/JPY는 시세 없을 시 현지가 그대로 사용 - 정확한 환율은 Phase 4에서)
function costInKrw(h: HoldingRow): number {
    return h.total_cost || 0;
}

export default function AssetChart({ holdings }: AssetChartProps) {
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => setIsMounted(true), []);

    const data = useMemo(() => {
        const totalCost = holdings.reduce((s, h) => s + costInKrw(h), 0);
        return holdings
            .filter((h) => costInKrw(h) > 0)
            .map((h) => ({
                name: h.name,
                value: costInKrw(h),
                ratio: totalCost > 0 ? costInKrw(h) / totalCost : 0,
                currency: h.currency,
            }));
    }, [holdings]);

    const totalCost = data.reduce((s, d) => s + d.value, 0);

    const formatCurrency = (value: number) =>
        `${new Intl.NumberFormat("ko-KR").format(Math.round(value))}원`;

    if (!isMounted) {
        return <div className="card" style={{ height: "400px" }}>차트 로딩 중...</div>;
    }

    return (
        <div className="card" style={{ height: "100%", minHeight: "400px", display: "flex", flexDirection: "column" }}>
            <h2 style={{ marginBottom: "8px", fontSize: "1.25rem", fontWeight: 600 }}>🥧 종목별 비중 (매입원가 기준)</h2>
            <p className="text-secondary" style={{ marginBottom: "16px", fontSize: "0.85rem" }}>
                Phase 4에서 실시간 시세 반영 시 평가금액 기준으로 자동 전환됩니다.
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
                        총 매입원가
                    </div>
                    <div style={{ fontSize: "1.15rem", fontWeight: 700 }}>{formatCurrency(totalCost)}</div>
                </div>
            </div>
        </div>
    );
}
