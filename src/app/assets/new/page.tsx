import React from "react";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import OtherAssetForm from "@/components/OtherAssetForm";
import { ArrowLeft } from "lucide-react";

export default async function NewAssetPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
    const { type } = await searchParams;
    const category = type === "연금" ? "연금" : "파킹";

    return (
        <main className="container" style={{ padding: "40px 16px", minHeight: "100vh", paddingBottom: "80px" }}>
            <header style={{ marginBottom: "24px" }}>
                <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "4px" }}>{category} 추가</h1>
                <p className="text-secondary">
                    {category === "연금" ? "정기예금·TDF 등 묶인 자산을 추가합니다." : "자유롭게 이동 가능한 현금성 자산을 추가합니다."}
                </p>
            </header>

            <Navigation />

            <div style={{ marginBottom: "16px" }}>
                <Link href="/portfolio" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--text-secondary)" }}>
                    <ArrowLeft size={16} /> 대시보드로
                </Link>
            </div>

            <OtherAssetForm fixedCategory={category} />
        </main>
    );
}
