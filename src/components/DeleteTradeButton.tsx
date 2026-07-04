"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

interface DeleteTradeButtonProps {
    id: number;
    label: string; // 확인 다이얼로그에 표시할 거래 설명 (예: "삼성전자 10주")
}

export default function DeleteTradeButton({ id, label }: DeleteTradeButtonProps) {
    const router = useRouter();
    const [busy, setBusy] = useState(false);

    async function handleDelete() {
        if (!window.confirm(`이 거래를 삭제할까요?\n\n${label}\n\n삭제하면 되돌릴 수 없습니다.`)) return;
        setBusy(true);
        try {
            const res = await fetch(`/api/trades/${id}`, { method: "DELETE" });
            if (!res.ok) {
                const json = await res.json().catch(() => ({}));
                alert(`삭제 실패: ${json.error ?? `HTTP ${res.status}`}`);
                return;
            }
            router.refresh();
        } catch (e) {
            alert(`삭제 실패: ${e instanceof Error ? e.message : "네트워크 오류"}`);
        } finally {
            setBusy(false);
        }
    }

    return (
        <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            aria-label="거래 삭제"
            title="삭제"
            style={{
                background: "transparent",
                border: "1px solid var(--border)",
                color: busy ? "var(--text-secondary)" : "#37A2EB",
                borderRadius: "6px",
                padding: "6px 8px",
                cursor: busy ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
            }}
        >
            <Trash2 size={15} />
        </button>
    );
}
