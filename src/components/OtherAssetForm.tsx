"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle } from "lucide-react";

type Currency = "KRW" | "USD" | "JPY";
type Category = "파킹" | "연금";

const SUBCATEGORY_OPTIONS = ["예금", "TDF"];

export interface OtherAssetFormInitial {
    subcategory: string;
    name: string;
    account: string;
    principal: string;
    amount: string;
    currency: Currency;
    memo: string;
}

interface OtherAssetFormProps {
    fixedCategory: Category;   // 파킹 또는 연금 (버튼에서 지정)
    assetId?: number;          // 있으면 수정(PATCH)
    initial?: Partial<OtherAssetFormInitial>;
}

export default function OtherAssetForm({ fixedCategory, assetId, initial }: OtherAssetFormProps) {
    const router = useRouter();
    const isEdit = assetId !== undefined;
    const isPension = fixedCategory === "연금";

    const [subcategory, setSubcategory] = useState(initial?.subcategory ?? "예금");
    const [name, setName] = useState(initial?.name ?? "");
    const [account, setAccount] = useState(initial?.account ?? "");
    const [principal, setPrincipal] = useState(initial?.principal ?? "");
    const [amount, setAmount] = useState(initial?.amount ?? "");
    const [currency, setCurrency] = useState<Currency>(initial?.currency ?? "KRW");
    const [memo, setMemo] = useState(initial?.memo ?? "");

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setSuccess(false);
        setSubmitting(true);
        try {
            const res = await fetch(isEdit ? `/api/assets/${assetId}` : "/api/assets", {
                method: isEdit ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    category: fixedCategory,
                    subcategory: isPension ? subcategory : null,
                    name: name.trim(),
                    account: account.trim() || null,
                    principal: isPension && principal ? Number(principal) : null,
                    amount: Number(amount),
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
            setTimeout(() => {
                router.push("/portfolio");
                router.refresh();
            }, 700);
        } catch (err) {
            setError(err instanceof Error ? err.message : "네트워크 오류");
        } finally {
            setSubmitting(false);
        }
    }

    const labelStyle: React.CSSProperties = {
        display: "block",
        fontSize: "0.85rem",
        color: "var(--text-secondary)",
        marginBottom: "6px",
        fontWeight: 500,
    };

    return (
        <div className="card" style={{ maxWidth: "720px" }}>
            <div style={{ marginBottom: "16px", fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                구분: <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{fixedCategory}</span>
            </div>

            <form onSubmit={handleSubmit}>
                {/* 연금: 세부구분(예금/TDF) — 토글 버튼 */}
                {isPension && (
                    <div style={{ marginBottom: "12px" }}>
                        <label style={labelStyle}>세부구분 *</label>
                        <div style={{ display: "flex", gap: "8px" }}>
                            {SUBCATEGORY_OPTIONS.map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    className="btn"
                                    onClick={() => setSubcategory(s)}
                                    style={{
                                        flex: 1,
                                        background: subcategory === s ? "var(--accent)" : "rgba(255,255,255,0.06)",
                                        color: subcategory === s ? "#fff" : "var(--text-secondary)",
                                    }}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div style={{ marginBottom: "12px" }}>
                    <label style={labelStyle}>항목명 *</label>
                    <input
                        className="input"
                        placeholder={isPension ? "예: 우리은행 정기예금, 한국투자TDF2050" : "예: TIGER CD1년금리액티브, 예수금"}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                </div>

                {/* 연금: 원금 + 평가금액 / 파킹: 평가금액만 */}
                {isPension ? (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 0.7fr", gap: "12px", marginBottom: "12px" }}>
                        <div>
                            <label style={labelStyle}>원금 *</label>
                            <input
                                className="input"
                                type="number"
                                inputMode="decimal"
                                step="any"
                                min="0"
                                placeholder="예: 3000000"
                                value={principal}
                                onChange={(e) => setPrincipal(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>평가금액 *</label>
                            <input
                                className="input"
                                type="number"
                                inputMode="decimal"
                                step="any"
                                min="0"
                                placeholder="예: 3772848"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>통화</label>
                            <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
                                <option value="KRW">KRW</option>
                                <option value="USD">USD</option>
                                <option value="JPY">JPY</option>
                            </select>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px", marginBottom: "12px" }}>
                        <div>
                            <label style={labelStyle}>평가금액 *</label>
                            <input
                                className="input"
                                type="number"
                                inputMode="decimal"
                                step="any"
                                min="0"
                                placeholder="예: 19253070"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>통화</label>
                            <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
                                <option value="KRW">KRW</option>
                                <option value="USD">USD</option>
                                <option value="JPY">JPY</option>
                            </select>
                        </div>
                    </div>
                )}

                <div style={{ marginBottom: "12px" }}>
                    <label style={labelStyle}>계좌</label>
                    <input
                        className="input"
                        placeholder="예: 삼성증권 연금, 신한 IRP, 메리츠"
                        value={account}
                        onChange={(e) => setAccount(e.target.value)}
                    />
                </div>

                <div style={{ marginBottom: "24px" }}>
                    <label style={labelStyle}>메모 (선택)</label>
                    <input
                        className="input"
                        placeholder={isPension ? "예: 만기 2026-12" : "선택 입력"}
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
                        {isEdit ? "수정되었습니다." : "저장되었습니다."} 대시보드로 이동합니다...
                    </div>
                )}

                <button type="submit" className="btn" style={{ width: "100%", padding: "14px" }} disabled={submitting}>
                    {submitting ? "저장 중..." : isEdit ? `${fixedCategory} 수정` : `${fixedCategory} 저장`}
                </button>
            </form>
        </div>
    );
}
