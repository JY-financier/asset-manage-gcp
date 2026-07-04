import React from "react";
import Link from "next/link";
import { getServiceClient, TradeRow } from "@/lib/supabase";
import Navigation from "@/components/Navigation";
import DeleteTradeButton from "@/components/DeleteTradeButton";
import { PlusCircle, Pencil } from "lucide-react";

export const revalidate = 0; // 항상 최신 데이터

async function fetchTrades(): Promise<{ trades: TradeRow[]; error: string | null }> {
    try {
        const supabase = getServiceClient();
        const { data, error } = await supabase
            .from("trades")
            .select("*")
            .order("trade_date", { ascending: false })
            .order("id", { ascending: false })
            .limit(500);
        if (error) return { trades: [], error: error.message };
        return { trades: (data ?? []) as TradeRow[], error: null };
    } catch (e) {
        const msg = e instanceof Error ? e.message : "알 수 없는 오류";
        return { trades: [], error: msg };
    }
}

function formatMoney(value: number, currency: string) {
    const rounded = currency === "USD" || currency === "JPY"
        ? value.toFixed(2)
        : Math.round(value).toString();
    const nf = new Intl.NumberFormat("ko-KR").format(Number(rounded));
    if (currency === "KRW") return `${nf}원`;
    if (currency === "USD") return `$${nf}`;
    if (currency === "JPY") return `¥${nf}`;
    return `${nf} ${currency}`;
}

export default async function TradesPage() {
    const { trades, error } = await fetchTrades();

    return (
        <main className="container" style={{ padding: "40px 16px", minHeight: "100vh", paddingBottom: "80px" }}>
            <header
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                    marginBottom: "24px",
                    flexWrap: "wrap",
                    gap: "16px",
                }}
            >
                <div>
                    <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "4px" }}>매매일지</h1>
                    <p className="text-secondary">
                        전체 거래 {trades.length}건 (최근 500건)
                    </p>
                </div>
                <Link
                    href="/trades/new"
                    className="btn"
                    style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
                >
                    <PlusCircle size={18} />
                    거래 추가
                </Link>
            </header>

            <Navigation />

            {error && (
                <div className="card" style={{ marginBottom: "24px", borderColor: "var(--danger)", color: "var(--danger)" }}>
                    <strong>데이터 로드 실패:</strong> {error}
                </div>
            )}

            <div className="card">
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", minWidth: "900px" }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                                <th style={{ padding: "12px 8px" }}>거래일</th>
                                <th style={{ padding: "12px 8px" }}>종목</th>
                                <th style={{ padding: "12px 8px" }}>구분</th>
                                <th style={{ padding: "12px 8px" }}>계좌</th>
                                <th style={{ padding: "12px 8px", textAlign: "center" }}>매매</th>
                                <th style={{ padding: "12px 8px", textAlign: "right" }}>단가</th>
                                <th style={{ padding: "12px 8px", textAlign: "right" }}>수량</th>
                                <th style={{ padding: "12px 8px", textAlign: "right" }}>금액</th>
                                <th style={{ padding: "12px 8px" }}>메모</th>
                                <th style={{ padding: "12px 8px", textAlign: "center" }}>관리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {trades.length === 0 && (
                                <tr>
                                    <td colSpan={10} style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
                                        매매 기록이 없습니다. 상단 &ldquo;거래 추가&rdquo;로 시작하십시오.
                                    </td>
                                </tr>
                            )}
                            {trades.map((t, idx) => {
                                const amount = t.price * t.quantity + (t.fee || 0);
                                const isBuy = t.side === "BUY";
                                return (
                                    <tr
                                        key={t.id}
                                        style={{
                                            borderBottom: idx === trades.length - 1 ? "none" : "1px solid var(--border)",
                                        }}
                                    >
                                        <td style={{ padding: "12px 8px", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                                            {t.trade_date}
                                        </td>
                                        <td style={{ padding: "12px 8px" }}>
                                            <div style={{ fontWeight: 600 }}>{t.name}</div>
                                            <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>{t.ticker}</div>
                                        </td>
                                        <td style={{ padding: "12px 8px", color: "var(--text-secondary)" }}>{t.category ?? "-"}</td>
                                        <td style={{ padding: "12px 8px", color: "var(--text-secondary)" }}>{t.account ?? "-"}</td>
                                        <td style={{ padding: "12px 8px", textAlign: "center" }}>
                                            <span
                                                style={{
                                                    display: "inline-block",
                                                    padding: "4px 10px",
                                                    borderRadius: "999px",
                                                    fontSize: "0.75rem",
                                                    fontWeight: 700,
                                                    background: isBuy ? "rgba(255,71,87,0.15)" : "rgba(55,162,235,0.15)",
                                                    color: isBuy ? "#FF4757" : "#37A2EB",
                                                }}
                                            >
                                                {isBuy ? "매수" : "매도"}
                                            </span>
                                        </td>
                                        <td style={{ padding: "12px 8px", textAlign: "right" }}>
                                            {formatMoney(t.price, t.currency)}
                                        </td>
                                        <td style={{ padding: "12px 8px", textAlign: "right" }}>
                                            {t.quantity.toLocaleString("ko-KR", { maximumFractionDigits: 4 })}
                                        </td>
                                        <td style={{ padding: "12px 8px", textAlign: "right", fontWeight: 600 }}>
                                            {formatMoney(amount, t.currency)}
                                        </td>
                                        <td style={{ padding: "12px 8px", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                                            {t.memo ?? ""}
                                        </td>
                                        <td style={{ padding: "12px 8px", whiteSpace: "nowrap" }}>
                                            <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                                                <Link
                                                    href={`/trades/${t.id}/edit`}
                                                    aria-label="거래 수정"
                                                    title="수정"
                                                    style={{
                                                        border: "1px solid var(--border)",
                                                        color: "var(--text-secondary)",
                                                        borderRadius: "6px",
                                                        padding: "6px 8px",
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                    }}
                                                >
                                                    <Pencil size={15} />
                                                </Link>
                                                <DeleteTradeButton
                                                    id={t.id}
                                                    label={`${t.trade_date} · ${t.name} · ${isBuy ? "매수" : "매도"} ${t.quantity}주 @ ${formatMoney(t.price, t.currency)}`}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
    );
}
