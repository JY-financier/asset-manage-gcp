"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import { CheckCircle2, AlertCircle } from "lucide-react";

type Side = "BUY" | "SELL";
type Currency = "KRW" | "USD" | "JPY";

const CATEGORY_OPTIONS = [
    "주식(국내)",
    "주식(미국)",
    "리츠(국내)",
    "리츠(미국)",
    "채권(국내)",
    "채권(미국)",
    "ETF",
    "기타",
];

interface TickerSuggestion {
    ticker: string;
    name: string;
    category: string | null;
    account: string | null;
    currency: string;
}

function todayStr() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

export default function NewTradePage() {
    const router = useRouter();

    const [ticker, setTicker] = useState("");
    const [name, setName] = useState("");
    const [category, setCategory] = useState("주식(국내)");
    const [account, setAccount] = useState("");
    const [tradeDate, setTradeDate] = useState(todayStr());
    const [side, setSide] = useState<Side>("BUY");
    const [price, setPrice] = useState("");
    const [quantity, setQuantity] = useState("");
    const [fee, setFee] = useState("");
    const [currency, setCurrency] = useState<Currency>("KRW");
    const [memo, setMemo] = useState("");

    const [suggestions, setSuggestions] = useState<TickerSuggestion[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // 기존 보유 종목을 가져와서 자동완성 제공
    useEffect(() => {
        fetch("/api/holdings")
            .then((r) => r.json())
            .then((json) => {
                if (Array.isArray(json.holdings)) {
                    setSuggestions(
                        json.holdings.map((h: TickerSuggestion) => ({
                            ticker: h.ticker,
                            name: h.name,
                            category: h.category,
                            account: h.account,
                            currency: h.currency,
                        }))
                    );
                }
            })
            .catch(() => { /* 자동완성은 실패해도 폼은 동작 */ });
    }, []);

    function applySuggestion(s: TickerSuggestion) {
        setTicker(s.ticker);
        setName(s.name);
        if (s.category) setCategory(s.category);
        if (s.account) setAccount(s.account);
        if (s.currency && ["KRW", "USD", "JPY"].includes(s.currency)) {
            setCurrency(s.currency as Currency);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setSuccess(false);
        setSubmitting(true);

        try {
            const res = await fetch("/api/trades", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ticker: ticker.trim(),
                    name: name.trim(),
                    category,
                    account: account.trim() || null,
                    trade_date: tradeDate,
                    side,
                    price: Number(price),
                    quantity: Number(quantity),
                    fee: fee ? Number(fee) : 0,
                    currency,
                    memo: memo.trim() || null,
                }),
            });
            const json = await res.json();
            if (!res.ok) {
                setError(json.error || `요청 실패 (HTTP ${res.status})`);
                return;
            }
            setSuccess(true);
            // 잠깐 성공 표시 후 매매일지로 이동
            setTimeout(() => {
                router.push("/trades");
                router.refresh();
            }, 800);
        } catch (err) {
            setError(err instanceof Error ? err.message : "네트워크 오류");
        } finally {
            setSubmitting(false);
        }
    }

    const inputStyle = { marginBottom: "12px" };
    const labelStyle: React.CSSProperties = {
        display: "block",
        fontSize: "0.85rem",
        color: "var(--text-secondary)",
        marginBottom: "6px",
        fontWeight: 500,
    };

    return (
        <main className="container" style={{ padding: "40px 16px", minHeight: "100vh", paddingBottom: "80px" }}>
            <header style={{ marginBottom: "24px" }}>
                <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "4px" }}>거래 추가</h1>
                <p className="text-secondary">매수·매도 내역을 기록합니다. 평단·누적수량은 자동 계산됩니다.</p>
            </header>

            <Navigation />

            <div className="card" style={{ maxWidth: "720px" }}>
                <form onSubmit={handleSubmit}>
                    {/* 종목 (티커 자동완성) */}
                    <div style={inputStyle}>
                        <label style={labelStyle}>종목 코드 (ticker) *</label>
                        <input
                            className="input"
                            list="ticker-suggestions"
                            placeholder="예: KRX:005930, NASDAQ:AAPL"
                            value={ticker}
                            onChange={(e) => {
                                const v = e.target.value;
                                setTicker(v);
                                const found = suggestions.find((s) => s.ticker === v);
                                if (found) applySuggestion(found);
                            }}
                            required
                        />
                        <datalist id="ticker-suggestions">
                            {suggestions.map((s) => (
                                <option key={s.ticker} value={s.ticker}>
                                    {s.name}
                                </option>
                            ))}
                        </datalist>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                            기존 보유 종목은 자동완성됩니다 ({suggestions.length}개).
                        </div>
                    </div>

                    <div style={inputStyle}>
                        <label style={labelStyle}>종목명 *</label>
                        <input
                            className="input"
                            placeholder="예: 삼성전자"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                        <div>
                            <label style={labelStyle}>구분</label>
                            <select
                                className="input"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                            >
                                {CATEGORY_OPTIONS.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>계좌</label>
                            <input
                                className="input"
                                placeholder="예: 메리츠, 삼성증권 연금"
                                value={account}
                                onChange={(e) => setAccount(e.target.value)}
                            />
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                        <div>
                            <label style={labelStyle}>거래일 *</label>
                            <input
                                className="input"
                                type="date"
                                value={tradeDate}
                                onChange={(e) => setTradeDate(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>매매 구분 *</label>
                            <div style={{ display: "flex", gap: "8px" }}>
                                <button
                                    type="button"
                                    className="btn"
                                    onClick={() => setSide("BUY")}
                                    style={{
                                        flex: 1,
                                        background: side === "BUY" ? "#FF4757" : "rgba(255,255,255,0.06)",
                                        color: side === "BUY" ? "#fff" : "var(--text-secondary)",
                                    }}
                                >
                                    매수
                                </button>
                                <button
                                    type="button"
                                    className="btn"
                                    onClick={() => setSide("SELL")}
                                    style={{
                                        flex: 1,
                                        background: side === "SELL" ? "#37A2EB" : "rgba(255,255,255,0.06)",
                                        color: side === "SELL" ? "#fff" : "var(--text-secondary)",
                                    }}
                                >
                                    매도
                                </button>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                        <div>
                            <label style={labelStyle}>단가 *</label>
                            <input
                                className="input"
                                type="number"
                                inputMode="decimal"
                                step="any"
                                min="0"
                                placeholder="예: 70000"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>수량 *</label>
                            <input
                                className="input"
                                type="number"
                                inputMode="decimal"
                                step="any"
                                min="0"
                                placeholder="예: 10"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>통화</label>
                            <select
                                className="input"
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value as Currency)}
                            >
                                <option value="KRW">KRW</option>
                                <option value="USD">USD</option>
                                <option value="JPY">JPY</option>
                            </select>
                        </div>
                    </div>

                    <div style={inputStyle}>
                        <label style={labelStyle}>수수료 (선택)</label>
                        <input
                            className="input"
                            type="number"
                            inputMode="decimal"
                            step="any"
                            min="0"
                            placeholder="0"
                            value={fee}
                            onChange={(e) => setFee(e.target.value)}
                        />
                    </div>

                    <div style={{ marginBottom: "24px" }}>
                        <label style={labelStyle}>메모 (선택)</label>
                        <input
                            className="input"
                            placeholder="예: 실적 발표 전 분할매수 1차"
                            value={memo}
                            onChange={(e) => setMemo(e.target.value)}
                        />
                    </div>

                    {error && (
                        <div
                            style={{
                                background: "rgba(255,71,87,0.1)",
                                border: "1px solid rgba(255,71,87,0.4)",
                                color: "var(--danger)",
                                padding: "12px",
                                borderRadius: "8px",
                                marginBottom: "16px",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                            }}
                        >
                            <AlertCircle size={18} />
                            {error}
                        </div>
                    )}
                    {success && (
                        <div
                            style={{
                                background: "rgba(46,213,115,0.1)",
                                border: "1px solid rgba(46,213,115,0.4)",
                                color: "var(--success)",
                                padding: "12px",
                                borderRadius: "8px",
                                marginBottom: "16px",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                            }}
                        >
                            <CheckCircle2 size={18} />
                            저장되었습니다. 매매일지로 이동합니다...
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn"
                        style={{ width: "100%", padding: "14px" }}
                        disabled={submitting}
                    >
                        {submitting ? "저장 중..." : "거래 저장"}
                    </button>
                </form>
            </div>
        </main>
    );
}
