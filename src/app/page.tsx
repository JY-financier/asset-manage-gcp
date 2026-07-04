import React from "react";
import { getServiceClient, HoldingRow } from "@/lib/supabase";
import StockDashboard from "@/components/StockDashboard";
import AssetChart from "@/components/AssetChart";
import Navigation from "@/components/Navigation";

export const revalidate = 0; // 새 거래 즉시 반영. 데이터 규모 작아 매번 fetch OK.

async function fetchHoldings(): Promise<{ holdings: HoldingRow[]; error: string | null }> {
    try {
        const supabase = getServiceClient();
        const { data, error } = await supabase
            .from("holdings_v")
            .select("*")
            .order("category", { ascending: true })
            .order("name", { ascending: true });
        if (error) return { holdings: [], error: error.message };
        return { holdings: (data ?? []) as HoldingRow[], error: null };
    } catch (e) {
        const msg = e instanceof Error ? e.message : "알 수 없는 오류";
        return { holdings: [], error: msg };
    }
}

export default async function Home() {
    const { holdings, error } = await fetchHoldings();

    const formatCurrency = (value: number) =>
        `${new Intl.NumberFormat("ko-KR").format(Math.round(value))}원`;

    // 원가 기준 총 자산 (KRW 원가만 합산 — Phase 4에서 시세 반영 후 평가금액으로 교체)
    const totalCostKrw = holdings
        .filter((h) => h.currency === "KRW")
        .reduce((acc, h) => acc + (h.total_cost || 0), 0);

    const usdCount = holdings.filter((h) => h.currency === "USD").length;
    const totalPositions = holdings.length;

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

            {error && (
                <div
                    className="card"
                    style={{
                        marginBottom: "24px",
                        borderColor: "var(--danger)",
                        color: "var(--danger)",
                    }}
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
                        <div style={{ fontSize: "1rem", opacity: 0.9, marginBottom: "4px" }}>보유 종목</div>
                        <div style={{ fontSize: "2rem", fontWeight: 800 }}>{totalPositions}개</div>
                        {usdCount > 0 && (
                            <div style={{ fontSize: "0.85rem", opacity: 0.85, marginTop: "4px" }}>
                                (KRW {totalPositions - usdCount}개 · USD {usdCount}개)
                            </div>
                        )}
                    </div>
                    <div>
                        <div style={{ fontSize: "1rem", opacity: 0.9, marginBottom: "4px" }}>KRW 총 매입원가</div>
                        <div style={{ fontSize: "2rem", fontWeight: 800 }}>{formatCurrency(totalCostKrw)}</div>
                        <div style={{ fontSize: "0.75rem", opacity: 0.75, marginTop: "4px" }}>
                            평가금액은 Phase 4 시세 연동 후 표시
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <StockDashboard holdings={holdings} />
                <AssetChart holdings={holdings} />
            </div>
        </main>
    );
}
