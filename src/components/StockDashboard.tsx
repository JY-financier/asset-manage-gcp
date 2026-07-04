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

// 좁은 화면(모바일)에서 숨길 열에 부여하는 클래스 (globals.css의 미디어 쿼리와 연동)
const HIDE = "col-desktop-only";

export default function StockDashboard({ holdings }: StockDashboardProps) {
    const thBase: React.CSSProperties = { padding: "12px 8px", whiteSpace: "nowrap" };
    const tdBase: React.CSSProperties = { padding: "12px 8px", whiteSpace: "nowrap" };

    return (
        <div className="card" style={{ marginBottom: "24px" }}>
            <h2 style={{ marginBottom: "16px", fontSize: "1.25rem", fontWeight: 600 }}>
                📈 보유 종목 현황
            </h2>
            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                            <th style={thBase}>종목</th>
                            <th style={{ ...thBase, textAlign: "right" }}>현재가</th>
                            <th style={{ ...thBase, textAlign: "right" }}>수익률</th>
                            <th style={{ ...thBase, textAlign: "right" }}>평가금액</th>
                            <th style={{ ...thBase, textAlign: "right" }}>손익</th>
                            <th className={HIDE} style={{ ...thBase, textAlign: "right" }}>수량</th>
                            <th className={HIDE} style={{ ...thBase, textAlign: "right" }}>평단</th>
                            <th className={HIDE} style={thBase}>구분</th>
                            <th className={HIDE} style={thBase}>계좌</th>
                        </tr>
                    </thead>
                    <tbody>
                        {holdings.length === 0 && (
                            <tr>
                                <td colSpan={9} style={{ padding: "24px", textAlign: "center", color: "var(--text-secondary)" }}>
                                    보유 종목이 없습니다. 우측 상단 &ldquo;거래 추가&rdquo;로 매매 기록을 시작하십시오.
                                </td>
                            </tr>
                        )}
                        {holdings.map((h, idx) => {
                            const returnRate =
                                h.current_price && h.avg_buy_price > 0
                                    ? h.current_price / h.avg_buy_price - 1
                                    : null;
                            const color =
                                returnRate === null
                                    ? "inherit"
                                    : returnRate > 0
                                    ? GAIN_COLOR
                                    : returnRate < 0
                                    ? LOSS_COLOR
                                    : "inherit";
                            const arrow =
                                returnRate === null || returnRate === 0 ? (
                                    <Minus size={16} color="var(--text-secondary)" />
                                ) : returnRate > 0 ? (
                                    <TrendingUp size={16} />
                                ) : (
                                    <TrendingDown size={16} />
                                );
                            const rowStyle: React.CSSProperties = {
                                borderBottom: idx === holdings.length - 1 ? "none" : "1px solid var(--border)",
                            };

                            return (
                                <tr key={h.ticker} style={rowStyle}>
                                    {/* 종목 */}
                                    <td style={{ ...tdBase, whiteSpace: "normal" }}>
                                        <div style={{ fontWeight: 600 }}>{h.name}</div>
                                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{h.ticker}</div>
                                    </td>
                                    {/* 현재가 */}
                                    <td style={{ ...tdBase, textAlign: "right" }}>
                                        {formatPrice(h.current_price, h.currency)}
                                    </td>
                                    {/* 수익률 */}
                                    <td style={{ ...tdBase, textAlign: "right", fontWeight: 600, color }}>
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px" }}>
                                            {arrow}
                                            {formatPercent(returnRate)}
                                        </div>
                                    </td>
                                    {/* 평가금액 */}
                                    <td style={{ ...tdBase, textAlign: "right", fontWeight: 600 }}>
                                        {formatMoney(h.market_value, h.currency)}
                                    </td>
                                    {/* 손익 */}
                                    <td style={{ ...tdBase, textAlign: "right", fontWeight: 600, color }}>
                                        {h.unrealized_pnl !== null && h.unrealized_pnl !== undefined
                                            ? `${h.unrealized_pnl > 0 ? "+" : ""}${formatMoney(h.unrealized_pnl, h.currency)}`
                                            : "-"}
                                    </td>
                                    {/* 수량 (모바일 숨김) */}
                                    <td className={HIDE} style={{ ...tdBase, textAlign: "right" }}>
                                        {h.total_qty.toLocaleString("ko-KR", { maximumFractionDigits: 4 })}
                                    </td>
                                    {/* 평단 (모바일 숨김) */}
                                    <td className={HIDE} style={{ ...tdBase, textAlign: "right", color: "var(--text-secondary)" }}>
                                        {formatPrice(h.avg_buy_price, h.currency)}
                                    </td>
                                    {/* 구분 (모바일 숨김) */}
                                    <td className={HIDE} style={{ ...tdBase, color: "var(--text-secondary)" }}>
                                        {h.category ?? "-"}
                                    </td>
                                    {/* 계좌 (모바일 숨김) */}
                                    <td className={HIDE} style={{ ...tdBase, color: "var(--text-secondary)" }}>
                                        {h.account ?? "-"}
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
