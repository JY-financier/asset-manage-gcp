import React from "react";
import Link from "next/link";
import { getServiceClient, TradeRow } from "@/lib/supabase";
import Navigation from "@/components/Navigation";
import TradeForm, { TradeFormInitial } from "@/components/TradeForm";

export const dynamic = "force-dynamic";

async function fetchTrade(id: number): Promise<TradeRow | null> {
    try {
        const supabase = getServiceClient();
        const { data } = await supabase.from("trades").select("*").eq("id", id).maybeSingle();
        return (data as TradeRow) ?? null;
    } catch {
        return null;
    }
}

export default async function EditTradePage({ params }: { params: Promise<{ id: string }> }) {
    const { id: idStr } = await params;
    const id = Number(idStr);
    const trade = Number.isInteger(id) ? await fetchTrade(id) : null;

    return (
        <main className="container" style={{ padding: "40px 16px", minHeight: "100vh", paddingBottom: "80px" }}>
            <header style={{ marginBottom: "24px" }}>
                <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "4px" }}>거래 수정</h1>
                <p className="text-secondary">기존 거래 내역을 고칩니다. 평단·누적수량은 자동 재계산됩니다.</p>
            </header>

            <Navigation />

            {!trade ? (
                <div className="card" style={{ maxWidth: "720px" }}>
                    <p style={{ marginBottom: "16px" }}>해당 거래를 찾을 수 없습니다. (id: {idStr})</p>
                    <Link href="/trades" className="btn" style={{ display: "inline-block" }}>
                        매매일지로 돌아가기
                    </Link>
                </div>
            ) : (
                <TradeForm
                    tradeId={trade.id}
                    initial={{
                        ticker: trade.ticker,
                        name: trade.name,
                        category: trade.category ?? "주식(국내)",
                        account: trade.account ?? "",
                        trade_date: trade.trade_date,
                        side: trade.side,
                        price: String(trade.price),
                        quantity: String(trade.quantity),
                        fee: trade.fee ? String(trade.fee) : "",
                        currency: trade.currency,
                        memo: trade.memo ?? "",
                    } satisfies TradeFormInitial}
                />
            )}
        </main>
    );
}
