import React from "react";
import { getServiceClient, HoldingRow } from "@/lib/supabase";
import StockDashboard from "@/components/StockDashboard";
import AssetChart from "@/components/AssetChart";
import Navigation from "@/components/Navigation";
import PriceRefresher from "@/components/PriceRefresher";

export const revalidate = 0; // 새 거래·시세 즉시 반영. 데이터 규모 작아 매번 fetch OK.

const FX_TICKER = "FX:USDKRW";

interface PageData {
    holdings: HoldingRow[];
    fxRate: number | null;
    lastPriceUpdate: string | null;
    error: string | null;
}

async function fetchData(): Promise<PageData> {
    try {
        const supabase = getServiceClient();
        const [holdingsRes, fxRes] = await Promise.all([
            supabase
                .from("holdings_v")
                .select("*")
                .order("category", { ascending: true })
                .order("name", { ascending: true }),
            supabase.from("prices").select("current_price, updated_at").eq("ticker", FX_TICKER).maybeSingle(),
        ]);

        if (holdingsRes.error) {
            return { holdings: [], fxRate: null, lastPriceUpdate: null, error: holdingsRes.error.message };
        }

        const holdings = (holdingsRes.data ?? []) as HoldingRow[];
        const fxRate = fxRes.data?.current_price ?? null;

        // 가장 최근 시세 갱신 시각
        const lastPriceUpdate = holdings.reduce<string | null>((latest, h) => {
            if (!h.price_updated_at) return latest;
            return !latest || h.price_updated_at > latest ? h.price_updated_at : latest;
        }, null);

        return { holdings, fxRate, lastPriceUpdate, error: null };
    } catch (e) {
        const msg = e instanceof Error ? e.message : "알 수 없는 오류";
        return { holdings: [], fxRate: null, lastPriceUpdate: null, error: msg };
    }
}

// KRW 환산 값 (USD 자산은 환율 적용, 환율 없으면 null)
function toKrw(value: number | null, currency: string, fxRate: number | null): number | null {
    if (value === null) return null;
    if (currency === "KRW") return value;
    if (currency === "USD") return fxRate ? value * fxRate : null;
    return null;
}

export default async function Home() {
    const { holdings, fxRate, lastPriceUpdate, error } = await fetchData();

    const formatCurrency = (value: number) =>
        `${new Intl.NumberFormat("ko-KR").format(Math.round(value))}원`;

    // KRW 통일 집계
    let totalCost = 0;
    let totalValue = 0;
    let valueMissing = false; // 시세 없는 종목 존재 여부

    for (const h of holdings) {
        const cost = toKrw(h.total_cost, h.currency, fxRate);
        if (cost !== null) totalCost += cost;

        const mv = toKrw(h.market_value, h.currency, fxRate);
        if (mv === null) {
            valueMissing = true;
        } else {
            totalValue += mv;
        }
    }

    const totalPnl = !valueMissing && totalCost > 0 ? totalValue - totalCost : null;
    const totalReturn = totalPnl !== null && totalCost > 0 ? totalPnl / totalCost : null;
    const pnlColor = totalPnl === null ? "#fff" : totalPnl >= 0 ? "#FFD5DA" : "#CDE7FF";

    return (
        <main
            className="container"
            style={{ padding: "40px 16px", minHeight: "100vh", paddingBottom: "80px" }}
        >
            <header style={{ marginBottom: "24px" }}>
                <h1
                    style={{
                        fontSize: "2rem",
                        fontWeight: 800,
                        marginBottom: "8px",
                        background: "linear-gradient(135deg, #6C5CE7, #a29bfe)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                    }}
                >
                    개인 자산 대시보드
                </h1>
                <p className="text-secondary">Supabase 기반 실시간 매매일지 · 포트폴리오</p>
            </header>

            <Navigation />

            <div style={{ marginBottom: "16px" }}>
                <PriceRefresher lastUpdatedAt={lastPriceUpdate} />
            </div>

            {error && (
                <div
                    className="card"
                    style={{ marginBottom: "24px", borderColor: "var(--danger)", color: "var(--danger)" }}
                >
                    <strong>데이터 로드 실패:</strong> {error}
                </div>
            )}

            <div
                className="card"
                style={{
                    marginBottom: "24px",
                    background: "linear-gradient(135deg, var(--accent) 0%, #a29bfe 100%)",
                    color: "#fff",
                    border: "none",
                }}
            >
                <div style={{ display: "flex", flexWrap: "wrap", gap: "24px", justifyContent: "space-between" }}>
                    <div>
                        <div style={{ fontSize: "0.95rem", opacity: 0.9, marginBottom: "4px" }}>총 평가금액 (KRW 환산)</div>
                        <div style={{ fontSize: "2rem", fontWeight: 800 }}>
                            {valueMissing ? "시세 갱신 필요" : formatCurrency(totalValue)}
                        </div>
                        {fxRate && (
                            <div style={{ fontSize: "0.75rem", opacity: 0.75, marginTop: "4px" }}>
                                환율 USD/KRW {new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 2 }).format(fxRate)}
                            </div>
                        )}
                    </div>
                    <div>
                        <div style={{ fontSize: "0.95rem", opacity: 0.9, marginBottom: "4px" }}>총 매입원가</div>
                        <div style={{ fontSize: "2rem", fontWeight: 800 }}>{formatCurrency(totalCost)}</div>
                        <div style={{ fontSize: "0.75rem", opacity: 0.75, marginTop: "4px" }}>
                            보유 {holdings.length}종목
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: "0.95rem", opacity: 0.9, marginBottom: "4px" }}>평가손익</div>
                        <div style={{ fontSize: "2rem", fontWeight: 800, color: pnlColor }}>
                            {totalPnl === null
                                ? "-"
                                : `${totalPnl >= 0 ? "+" : ""}${formatCurrency(totalPnl)}`}
                        </div>
                        {totalReturn !== null && (
                            <div style={{ fontSize: "0.85rem", fontWeight: 700, marginTop: "4px", color: pnlColor }}>
                                {totalReturn >= 0 ? "+" : ""}
                                {(totalReturn * 100).toFixed(2)}%
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <StockDashboard holdings={holdings} />
                <AssetChart holdings={holdings} fxRate={fxRate} />
            </div>
        </main>
    );
}
