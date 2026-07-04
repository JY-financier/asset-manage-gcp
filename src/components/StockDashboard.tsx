"use client";

import React from "react";
import { HoldingRow } from "@/lib/supabase";
import { GAIN_COLOR, LOSS_COLOR } from "@/lib/colors";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StockDashboardProps {
    holdings: HoldingRow[];
}

function formatMoney(value: number | null | undefined, currency: string) {
    if (value === null || value === undefined) return "-";
    const rounded = Math.round(value);
    const nf = new Intl.NumberFormat("ko-KR").format(rounded);
    if (currency === "KRW") return `${nf}원`;
    if (currency === "USD") return `$${nf}`;
    if (currency === "JPY") return `¥${nf}`;
    return `${nf} ${currency}`;
}

function formatPrice(value: number | null | undefined, currency: string) {
    if (value === null || value === undefined) return "-";
    const decimals = currency === "USD" || currency === "JPY" ? 2 : 0;
    const nf = new Intl.NumberFormat("ko-KR", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(value);
    if (currency === "KRW") return `${nf}원`;
    if (currency === "USD") return `$${nf}`;
    if (currency === "JPY") return `¥${nf}`;
    return `${nf} ${currency}`;
}

function formatPercent(value: number | null | undefined) {
    if (value === null || value === undefined) return "-";
    return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(2)}%`;
}

export default function StockDashboard({ holdings }: StockDashboardProps) {
    return (
        <div className="card" style={{ marginBottom: "24px" }}>
            <h2 style={{ marginBottom: "16px", fontSize: "1.25rem", fontWeight: 600 }}>
                📈 보유 종목 현황
            </h2>
            <div style={{ overflowX: "auto" }}>
                <table
                    style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        textAlign: "left",
                        minWidth: "820px",
                    }}
                >
                    <thead>
                        <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                            <th style={{ padding: "12px 8px" }}>종목</th>
                            <th style={{ padding: "12px 8px" }}>구분</th>
                            <th style={{ padding: "12px 8px" }}>계좌</th>
                            <th style={{ padding: "12px 8px", textAlign: "right" }}>수량</th>
                            <th style={{ padding: "12px 8px", textAlign: "right" }}>평단</th>
                            <th style={{ padding: "12px 8px", textAlign: "right" }}>현재가</th>
                            <th style={{ padding: "12px 8px", textAlign: "right" }}>평가금액</th>
                            <th style={{ padding: "12px 8px", textAlign: "right" }}>손익</th>
                            <th style={{ padding: "12px 8px", textAlign: "right" }}>수익률</th>
                        </tr>
                    </thead>
                    <tbody>
                        {holdings.length === 0 && (
                            <tr>
                                <td colSpan={9} style={{ padding: "24px", textAlign: "center", color: "var(--text-secondary)" }}>
                                    보유 종목이 없습니다. 우측 상단 "거래 추가"로 매매 기록을 시작하십시오.
                                </td>
                            </tr>
                        )}
                        {holdings.map((h, idx) => {
                            const returnRate =
                                h.current_price && h.avg_buy_price > 0
                                    ? h.current_price / h.avg_buy_price - 1
                                    : null;
                            const pnlColor =
                                returnRate === null
                                    ? "inherit"
                                    : returnRate > 0
                                    ? GAIN_COLOR
                                    : returnRate < 0
                                    ? LOSS_COLOR
                                    : "inherit";
                            const arrow =
                                returnRate === null ? (
                                    <Minus size={16} color="var(--text-secondary)" />
                                ) : returnRate > 0 ? (
                                    <TrendingUp size={16} />
                                ) : returnRate < 0 ? (
                                    <TrendingDown size={16} />
                                ) : (
                                    <Minus size={16} color="var(--text-secondary)" />
                                );

                            return (
                                <tr
                                    key={h.ticker}
                                    style={{
                                        borderBottom:
                                            idx === holdings.length - 1
                                                ? "none"
                                                : "1px solid var(--border)",
                                    }}
                                >
                                    <td style={{ padding: "12px 8px" }}>
                                        <div style={{ fontWeight: 600 }}>{h.name}</div>
                                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                                            {h.ticker}
                                        </div>
                                    </td>
                                    <td style={{ padding: "12px 8px", color: "var(--text-secondary)" }}>
                                        {h.category ?? "-"}
                                    </td>
                                    <td style={{ padding: "12px 8px", color: "var(--text-secondary)" }}>
                                        {h.account ?? "-"}
                                    </td>
                                    <td style={{ padding: "12px 8px", textAlign: "right" }}>
                                        {h.total_qty.toLocaleString("ko-KR", { maximumFractionDigits: 4 })}
                                    </td>
                                    <td style={{ padding: "12px 8px", textAlign: "right", color: "var(--text-secondary)" }}>
                                        {formatPrice(h.avg_buy_price, h.currency)}
                                    </td>
                                    <td style={{ padding: "12px 8px", textAlign: "right" }}>
                                        {formatPrice(h.current_price, h.currency)}
                                    </td>
                                    <td style={{ padding: "12px 8px", textAlign: "right", fontWeight: 600 }}>
                                        {formatMoney(h.market_value, h.currency)}
                                    </td>
                                    <td
                                        style={{
                                            padding: "12px 8px",
                                            textAlign: "right",
                                            fontWeight: 600,
                                            color: pnlColor,
                                        }}
                                    >
                                        {h.unrealized_pnl !== null && h.unrealized_pnl !== undefined
                                            ? `${h.unrealized_pnl > 0 ? "+" : ""}${formatMoney(h.unrealized_pnl, h.currency)}`
                                            : "-"}
                                    </td>
                                    <td
                                        style={{
                                            padding: "12px 8px",
                                            textAlign: "right",
                                            fontWeight: 600,
                                            color: pnlColor,
                                        }}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px" }}>
                                            {arrow}
                                            {formatPercent(returnRate)}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
