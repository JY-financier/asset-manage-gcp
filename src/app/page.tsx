import React from "react";
import { getServiceClient, HoldingRow } from "@/lib/supabase";
import { GAIN_COLOR, LOSS_COLOR } from "@/lib/colors";
import StockDashboard from "@/components/StockDashboard";
import AssetChart from "@/components/AssetChart";
import Navigation from "@/components/Navigation";
import PriceRefresher from "@/components/PriceRefresher";

export const revalidate = 0; // 새 거래·시세 즉시 반영. 데이터 규모 작아 매번 fetch OK.

const FX_TICKER = "FX:USDKRW";

interface SnapshotRow {
    ticker: string;
    price: number;
    currency: string;
    snapshot_date: string;
}

interface PageData {
    holdings: HoldingRow[];
    fxRate: number | null;
    lastPriceUpdate: string | null;
    snapshots: Map<string, SnapshotRow>;
    error: string | null;
}

async function fetchData(): Promise<PageData> {
    try {
        const supabase = getServiceClient();
        const [holdingsRes, fxRes, snapRes] = await Promise.all([
            supabase
                .from("holdings_v")
                .select("*")
                .order("category", { ascending: true })
                .order("name", { ascending: true }),
            supabase.from("prices").select("current_price, updated_at").eq("ticker", FX_TICKER).maybeSingle(),
            supabase.from("price_snapshots").select("ticker, price, currency, snapshot_date"),
        ]);

        if (holdingsRes.error) {
            return { holdings: [], fxRate: null, lastPriceUpdate: null, snapshots: new Map(), error: holdingsRes.error.message };
        }

        const holdings = (holdingsRes.data ?? []) as HoldingRow[];
        const fxRate = fxRes.data?.current_price ?? null;

        const lastPriceUpdate = holdings.reduce<string | null>((latest, h) => {
            if (!h.price_updated_at) return latest;
            return !latest || h.price_updated_at > latest ? h.price_updated_at : latest;
        }, null);

        // 티커별 최신 스냅샷만 남긴다
        const snapshots = new Map<string, SnapshotRow>();
        for (const s of (snapRes.data ?? []) as SnapshotRow[]) {
            const ex = snapshots.get(s.ticker);
            if (!ex || s.snapshot_date > ex.snapshot_date) snapshots.set(s.ticker, s);
        }

        return { holdings, fxRate, lastPriceUpdate, snapshots, error: null };
    } catch (e) {
        const msg = e instanceof Error ? e.message : "알 수 없는 오류";
        return { holdings: [], fxRate: null, lastPriceUpdate: null, snapshots: new Map(), error: msg };
    }
}

// USD 값을 KRW로 환산 (환율 없으면 null)
function toKrw(value: number | null, currency: string, fxRate: number | null): number | null {
    if (value === null) return null;
    if (currency === "KRW") return value;
    if (currency === "USD") return fxRate ? value * fxRate : null;
    return null;
}

// 정렬 우선순위: 주식(국내) → 주식(미국) → 리츠(미국) → 채권(미국) → 그외
function categoryRank(category: string | null): number {
    switch (category) {
        case "주식(국내)": return 0;
        case "주식(미국)": return 1;
        case "리츠(미국)": return 2;
        case "채권(미국)": return 3;
        default: return 4;
    }
}
// 통화 우선순위: 원화 먼저 → 달러 → 그외
function currencyRank(currency: string): number {
    if (currency === "KRW") return 0;
    if (currency === "USD") return 1;
    return 2;
}
// 그룹 내 평가금액 큰 순 (시세 없으면 매입원가로 대체)
function sortValue(h: HoldingRow): number {
    return h.market_value ?? h.total_cost ?? 0;
}
function sortHoldings(holdings: HoldingRow[]): HoldingRow[] {
    return [...holdings].sort((a, b) => {
        const c = categoryRank(a.category) - categoryRank(b.category);
        if (c !== 0) return c;
        const cur = currencyRank(a.currency) - currencyRank(b.currency);
        if (cur !== 0) return cur;
        return sortValue(b) - sortValue(a);
    });
}

export default async function Home() {
    const { holdings: rawHoldings, fxRate, lastPriceUpdate, snapshots, error } = await fetchData();
    const holdings = sortHoldings(rawHoldings);

    const formatCurrency = (value: number) =>
        `${new Intl.NumberFormat("ko-KR").format(Math.round(value))}원`;
    const formatSigned = (value: number) =>
        `${value >= 0 ? "+" : "-"}${new Intl.NumberFormat("ko-KR").format(Math.abs(Math.round(value)))}원`;

    // ---- KRW 통일 집계 ----
    let totalCost = 0;
    let totalValue = 0;
    let valueMissing = false;

    // 전일비 집계
    let dayChange = 0;
    let dayBaseline = 0;
    let dayChangeAvailable = snapshots.size > 0;

    for (const h of holdings) {
        const cost = toKrw(h.total_cost, h.currency, fxRate);
        if (cost !== null) totalCost += cost;

        const mv = toKrw(h.market_value, h.currency, fxRate);
        if (mv === null) {
            valueMissing = true;
        } else {
            totalValue += mv;
        }

        // 전일비: (현재가 - 스냅샷가) * 수량, KRW 환산
        const snap = snapshots.get(h.ticker);
        if (snap && h.current_price !== null) {
            const diffStored = (h.current_price - snap.price) * h.total_qty;
            const baseStored = snap.price * h.total_qty;
            if (h.currency === "USD") {
                if (fxRate) {
                    dayChange += diffStored * fxRate;
                    dayBaseline += baseStored * fxRate;
                } else {
                    dayChangeAvailable = false;
                }
            } else {
                dayChange += diffStored;
                dayBaseline += baseStored;
            }
        } else if (h.current_price !== null) {
            // 시세는 있는데 스냅샷이 없는 종목 → 전일비 불완전
            dayChangeAvailable = false;
        }
    }

    const totalPnl = !valueMissing && totalCost > 0 ? totalValue - totalCost : null;
    const totalReturn = totalPnl !== null && totalCost > 0 ? totalPnl / totalCost : null;
    const dayChangePct = dayChangeAvailable && dayBaseline > 0 ? dayChange / dayBaseline : null;

    const metricValueStyle: React.CSSProperties = { fontSize: "1.6rem", fontWeight: 800, lineHeight: 1.2 };
    const metricLabelStyle: React.CSSProperties = { fontSize: "0.9rem", opacity: 0.9, marginBottom: "6px" };

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
                    자산 대시보드
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
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                        gap: "20px",
                    }}
                >
                    {/* 총 평가금액 */}
                    <div>
                        <div style={metricLabelStyle}>총 평가금액</div>
                        <div style={metricValueStyle}>
                            {valueMissing ? "시세 갱신 필요" : formatCurrency(totalValue)}
                        </div>
                        {fxRate && (
                            <div style={{ fontSize: "0.72rem", opacity: 0.72, marginTop: "4px" }}>
                                환율 USD/KRW {new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 2 }).format(fxRate)}
                            </div>
                        )}
                    </div>

                    {/* 총 매입원가 */}
                    <div>
                        <div style={metricLabelStyle}>총 매입원가</div>
                        <div style={metricValueStyle}>{formatCurrency(totalCost)}</div>
                        <div style={{ fontSize: "0.72rem", opacity: 0.72, marginTop: "4px" }}>
                            보유 {holdings.length}종목
                        </div>
                    </div>

                    {/* 평가손익 */}
                    <div>
                        <div style={metricLabelStyle}>평가손익</div>
                        <div style={{ ...metricValueStyle, color: totalPnl === null ? "#fff" : totalPnl >= 0 ? GAIN_COLOR : LOSS_COLOR }}>
                            {totalPnl === null ? "-" : formatSigned(totalPnl)}
                        </div>
                        {totalReturn !== null && (
                            <div style={{ fontSize: "0.85rem", fontWeight: 700, marginTop: "4px", color: totalReturn >= 0 ? GAIN_COLOR : LOSS_COLOR }}>
                                {totalReturn >= 0 ? "+" : ""}
                                {(totalReturn * 100).toFixed(2)}%
                            </div>
                        )}
                    </div>

                    {/* 전일비 */}
                    <div>
                        <div style={metricLabelStyle}>전일비</div>
                        <div style={{ ...metricValueStyle, color: !dayChangeAvailable ? "#fff" : dayChange >= 0 ? GAIN_COLOR : LOSS_COLOR }}>
                            {!dayChangeAvailable ? "준비 중" : formatSigned(dayChange)}
                        </div>
                        {dayChangePct !== null ? (
                            <div style={{ fontSize: "0.85rem", fontWeight: 700, marginTop: "4px", color: dayChangePct >= 0 ? GAIN_COLOR : LOSS_COLOR }}>
                                {dayChangePct >= 0 ? "+" : ""}
                                {(dayChangePct * 100).toFixed(2)}%
                            </div>
                        ) : (
                            <div style={{ fontSize: "0.72rem", opacity: 0.72, marginTop: "4px" }}>
                                자정 스냅샷 기준
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
