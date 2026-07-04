"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

const STALE_MINUTES = 30;

interface PriceRefresherProps {
    lastUpdatedAt: string | null; // prices 테이블의 가장 최근 updated_at (ISO)
}

export default function PriceRefresher({ lastUpdatedAt }: PriceRefresherProps) {
    const router = useRouter();
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const autoTriggered = useRef(false);

    const ageMinutes = lastUpdatedAt
        ? Math.floor((Date.now() - new Date(lastUpdatedAt).getTime()) / 60000)
        : null;

    async function refresh() {
        if (refreshing) return;
        setRefreshing(true);
        setError(null);
        try {
            const res = await fetch("/api/prices/refresh", { method: "POST" });
            const json = await res.json();
            if (!res.ok) {
                setError(json.error || `갱신 실패 (HTTP ${res.status})`);
                return;
            }
            if (Array.isArray(json.errors) && json.errors.length > 0) {
                setError(`일부 실패: ${json.errors.join(" / ")}`);
            }
            router.refresh();
        } catch (e) {
            setError(e instanceof Error ? e.message : "네트워크 오류");
        } finally {
            setRefreshing(false);
        }
    }

    // 페이지 진입 시 시세가 오래됐으면 1회 자동 갱신
    useEffect(() => {
        if (autoTriggered.current) return;
        autoTriggered.current = true;
        if (ageMinutes === null || ageMinutes >= STALE_MINUTES) {
            refresh();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <button
                type="button"
                className="btn"
                onClick={refresh}
                disabled={refreshing}
                style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 14px", fontSize: "0.85rem" }}
            >
                <RefreshCw size={15} className={refreshing ? "spin" : undefined} style={refreshing ? { animation: "spin 1s linear infinite" } : undefined} />
                {refreshing ? "시세 갱신 중..." : "시세 새로고침"}
            </button>
            <span className="text-secondary" style={{ fontSize: "0.8rem" }}>
                {refreshing
                    ? "네이버·Yahoo에서 시세를 가져오는 중입니다"
                    : ageMinutes === null
                    ? "아직 시세 정보가 없습니다"
                    : ageMinutes < 1
                    ? "방금 업데이트됨"
                    : `${ageMinutes}분 전 업데이트`}
            </span>
            {error && (
                <span className="text-danger" style={{ fontSize: "0.8rem" }}>{error}</span>
            )}
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
