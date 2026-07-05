import React from "react";
import Link from "next/link";
import { getServiceClient, HoldingRow, OtherAssetRow } from "@/lib/supabase";
import { GAIN_COLOR, LOSS_COLOR } from "@/lib/colors";
import Navigation from "@/components/Navigation";
import PortfolioChart, { PortfolioSlice } from "@/components/PortfolioChart";
import DeleteAssetButton from "@/components/DeleteAssetButton";
import { PlusCircle, Pencil } from "lucide-react";

export const revalidate = 0;

const FX_TICKER = "FX:USDKRW";
// 표시 순서 (주식은 별도 합산). 파킹=자유 이동, 연금=정기예금·TDF 등 묶인 돈
const CATEGORY_ORDER = ["파킹", "연금"];

interface PageData {
    holdings: HoldingRow[];
    assets: OtherAssetRow[];
    fxRate: number | null;
    error: string | null;
}

async function fetchData(): Promise<PageData> {
    try {
        const supabase = getServiceClient();
        const [hRes, aRes, fxRes] = await Promise.all([
            supabase.from("holdings_v").select("*"),
            supabase.from("other_assets").select("*").order("category").order("amount", { ascending: false }),
            supabase.from("prices").select("current_price").eq("ticker", FX_TICKER).maybeSingle(),
        ]);
        if (hRes.error) return { holdings: [], assets: [], fxRate: null, error: hRes.error.message };
        return {
            holdings: (hRes.data ?? []) as HoldingRow[],
            assets: (aRes.data ?? []) as OtherAssetRow[],
            fxRate: fxRes.data?.current_price ?? null,
            error: null,
        };
    } catch (e) {
        return { holdings: [], assets: [], fxRate: null, error: e instanceof Error ? e.message : "알 수 없는 오류" };
    }
}

function toKrw(value: number, currency: string, fxRate: number | null): number {
    if (currency === "KRW") return value;
    if (currency === "USD") return fxRate ? value * fxRate : 0;
    if (currency === "JPY") return fxRate ? value * (fxRate / 1000) : 0; // 근사(엔은 미사용 가정)
    return value;
}

export default async function PortfolioPage() {
    const { holdings, assets, fxRate, error } = await fetchData();

    const fmt = (v: number) => `${new Intl.NumberFormat("ko-KR").format(Math.round(v))}원`;

    // 주식 합계 (평가금액 우선, 없으면 매입원가)
    const stockTotal = holdings.reduce((sum, h) => {
        const base = h.market_value ?? h.total_cost ?? 0;
        return sum + toKrw(base, h.currency, fxRate);
    }, 0);

    // 비주식: 구분별 합계
    const byCategory = new Map<string, number>();
    for (const a of assets) {
        byCategory.set(a.category, (byCategory.get(a.category) ?? 0) + toKrw(a.amount, a.currency, fxRate));
    }

    // 섹션별 분리
    const parkingAssets = assets.filter((a) => a.category === "파킹");
    const pensionAssets = assets.filter((a) => a.category === "연금");

    const moneyOf = (v: number, currency: string) =>
        currency === "USD"
            ? `$${new Intl.NumberFormat("ko-KR").format(Math.round(v))}`
            : currency === "JPY"
            ? `¥${new Intl.NumberFormat("ko-KR").format(Math.round(v))}`
            : `${new Intl.NumberFormat("ko-KR").format(Math.round(v))}원`;

    const grandTotal = stockTotal + Array.from(byCategory.values()).reduce((s, v) => s + v, 0);

    // 요약 카드용 구분 목록: 주식 + 존재하는 카테고리(정해진 순서)
    const cards: { label: string; value: number }[] = [{ label: "주식 합계", value: stockTotal }];
    for (const cat of CATEGORY_ORDER) {
        if (byCategory.has(cat)) cards.push({ label: cat, value: byCategory.get(cat)! });
    }
    // CATEGORY_ORDER에 없는 커스텀 구분도 뒤에 추가
    for (const [cat, val] of byCategory) {
        if (!CATEGORY_ORDER.includes(cat)) cards.push({ label: cat, value: val });
    }

    const slices: PortfolioSlice[] = [
        { name: "주식", value: stockTotal },
        ...cards.filter((c) => c.label !== "주식 합계").map((c) => ({ name: c.label, value: c.value })),
    ];

    return (
        <main className="container" style={{ padding: "40px 16px", minHeight: "100vh", paddingBottom: "80px" }}>
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
                    통합 대시보드
                </h1>
                <p className="text-secondary">주식 + 현금성 + TDF + 예금 = 총자산</p>
            </header>

            <Navigation />

            {error && (
                <div className="card" style={{ marginBottom: "24px", borderColor: "var(--danger)", color: "var(--danger)" }}>
                    <strong>데이터 로드 실패:</strong> {error}
                </div>
            )}

            {/* 총자산 강조 카드 */}
            <div className="card" style={{ marginBottom: "24px", background: "var(--accent)", color: "#fff", border: "none" }}>
                <div style={{ fontSize: "0.95rem", opacity: 0.9, marginBottom: "6px" }}>총자산</div>
                <div style={{ fontSize: "2.2rem", fontWeight: 800 }}>{fmt(grandTotal)}</div>
                {fxRate && (
                    <div style={{ fontSize: "0.72rem", opacity: 0.72, marginTop: "6px" }}>
                        USD 자산은 환율 {new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 2 }).format(fxRate)}로 KRW 환산
                    </div>
                )}
            </div>

            {/* 구분별 요약 카드 */}
            <div className="pf-summary-grid" style={{ marginBottom: "24px" }}>
                {cards.map((c) => {
                    const pct = grandTotal > 0 ? (c.value / grandTotal) * 100 : 0;
                    return (
                        <div key={c.label} className="card pf-summary-card" style={{ padding: "16px" }}>
                            <div className="pf-summary-label" style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
                                {c.label}
                            </div>
                            <div className="pf-summary-figures">
                                <span className="pf-summary-amount">{fmt(c.value)}</span>
                                <span className="pf-summary-pct">{pct.toFixed(1)}%</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div style={{ marginBottom: "24px" }}>
                <PortfolioChart slices={slices} />
            </div>

            {/* 파킹 섹션 */}
            <div className="card" style={{ marginBottom: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
                    <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>🅿️ 파킹</h2>
                    <Link href="/assets/new?type=파킹" className="btn" style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                        <PlusCircle size={18} /> 파킹 추가
                    </Link>
                </div>
                <div style={{ overflowX: "auto" }}>
                    <table className="parking-table" style={{ borderCollapse: "collapse", textAlign: "left", minWidth: "480px" }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                                <th style={{ padding: "12px 8px", textAlign: "center" }}>항목</th>
                                <th style={{ padding: "12px 8px", textAlign: "center" }}>평가금액</th>
                                <th style={{ padding: "12px 8px", textAlign: "center" }}>계좌</th>
                                <th className="col-desktop-only" style={{ padding: "12px 8px", textAlign: "center" }}>메모</th>
                                <th style={{ padding: "12px 8px", textAlign: "center" }}>관리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {parkingAssets.length === 0 && (
                                <tr>
                                    <td colSpan={5} style={{ padding: "28px", textAlign: "center", color: "var(--text-secondary)" }}>
                                        등록된 파킹 자산이 없습니다. &ldquo;파킹 추가&rdquo;로 시작하십시오.
                                    </td>
                                </tr>
                            )}
                            {parkingAssets.map((a, idx) => {
                                const money = moneyOf(a.amount, a.currency);
                                return (
                                    <tr key={a.id} style={{ borderBottom: idx === parkingAssets.length - 1 ? "none" : "1px solid var(--border)" }}>
                                        <td style={{ padding: "12px 8px", fontWeight: 500 }}>{a.name}</td>
                                        <td style={{ padding: "12px 8px", textAlign: "right", fontWeight: 600 }}>{money}</td>
                                        <td style={{ padding: "12px 8px", color: "var(--text-secondary)" }}>{a.account ?? "-"}</td>
                                        <td className="col-desktop-only" style={{ padding: "12px 8px", color: "var(--text-secondary)", fontSize: "0.85rem" }}>{a.memo ?? "-"}</td>
                                        <td style={{ padding: "12px 8px", whiteSpace: "nowrap" }}>
                                            <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                                                <Link href={`/assets/${a.id}/edit`} aria-label="자산 수정" title="수정" style={{ border: "1px solid var(--border)", color: "var(--text-secondary)", borderRadius: "6px", padding: "6px 8px", display: "inline-flex", alignItems: "center" }}>
                                                    <Pencil size={15} />
                                                </Link>
                                                <DeleteAssetButton id={a.id} label={`파킹 · ${a.name} · ${money}`} />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 연금 섹션 */}
            <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
                    <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>🏦 연금</h2>
                    <Link href="/assets/new?type=연금" className="btn" style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                        <PlusCircle size={18} /> 연금 추가
                    </Link>
                </div>
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", minWidth: "760px" }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                                <th style={{ padding: "12px 8px", textAlign: "center" }}>구분</th>
                                <th style={{ padding: "12px 8px", textAlign: "center" }}>항목명</th>
                                <th style={{ padding: "12px 8px", textAlign: "center" }}>원금</th>
                                <th style={{ padding: "12px 8px", textAlign: "center" }}>수익률</th>
                                <th style={{ padding: "12px 8px", textAlign: "center" }}>평가금액</th>
                                <th style={{ padding: "12px 8px", textAlign: "center" }}>손익</th>
                                <th style={{ padding: "12px 8px", textAlign: "center" }}>계좌</th>
                                <th style={{ padding: "12px 8px", textAlign: "center" }}>관리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pensionAssets.length === 0 && (
                                <tr>
                                    <td colSpan={8} style={{ padding: "28px", textAlign: "center", color: "var(--text-secondary)" }}>
                                        등록된 연금 자산이 없습니다. &ldquo;연금 추가&rdquo;로 시작하십시오.
                                    </td>
                                </tr>
                            )}
                            {pensionAssets.map((a, idx) => {
                                const hasPrincipal = a.principal !== null && a.principal !== undefined && a.principal > 0;
                                const pnl = hasPrincipal ? a.amount - (a.principal as number) : null;
                                const rate = hasPrincipal ? (a.amount / (a.principal as number)) - 1 : null;
                                const color = rate === null ? "inherit" : rate > 0 ? GAIN_COLOR : rate < 0 ? LOSS_COLOR : "inherit";
                                return (
                                    <tr key={a.id} style={{ borderBottom: idx === pensionAssets.length - 1 ? "none" : "1px solid var(--border)" }}>
                                        <td style={{ padding: "12px 8px", color: "var(--text-secondary)" }}>{a.subcategory ?? "-"}</td>
                                        <td style={{ padding: "12px 8px", fontWeight: 500 }}>{a.name}</td>
                                        <td style={{ padding: "12px 8px", textAlign: "right", color: "var(--text-secondary)" }}>
                                            {hasPrincipal ? moneyOf(a.principal as number, a.currency) : "-"}
                                        </td>
                                        <td style={{ padding: "12px 8px", textAlign: "right", fontWeight: 600, color }}>
                                            {rate === null ? "-" : `${rate >= 0 ? "+" : ""}${(rate * 100).toFixed(2)}%`}
                                        </td>
                                        <td style={{ padding: "12px 8px", textAlign: "right", fontWeight: 600 }}>{moneyOf(a.amount, a.currency)}</td>
                                        <td style={{ padding: "12px 8px", textAlign: "right", fontWeight: 600, color }}>
                                            {pnl === null ? "-" : `${pnl > 0 ? "+" : ""}${moneyOf(pnl, a.currency)}`}
                                        </td>
                                        <td style={{ padding: "12px 8px", color: "var(--text-secondary)" }}>{a.account ?? "-"}</td>
                                        <td style={{ padding: "12px 8px", whiteSpace: "nowrap" }}>
                                            <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                                                <Link href={`/assets/${a.id}/edit`} aria-label="자산 수정" title="수정" style={{ border: "1px solid var(--border)", color: "var(--text-secondary)", borderRadius: "6px", padding: "6px 8px", display: "inline-flex", alignItems: "center" }}>
                                                    <Pencil size={15} />
                                                </Link>
                                                <DeleteAssetButton id={a.id} label={`연금 · ${a.name} · ${moneyOf(a.amount, a.currency)}`} />
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
