import React from "react";
import Link from "next/link";
import { getServiceClient, OtherAssetRow, Currency } from "@/lib/supabase";
import Navigation from "@/components/Navigation";
import OtherAssetForm, { OtherAssetFormInitial } from "@/components/OtherAssetForm";

export const dynamic = "force-dynamic";

async function fetchAsset(id: number): Promise<OtherAssetRow | null> {
    try {
        const supabase = getServiceClient();
        const { data } = await supabase.from("other_assets").select("*").eq("id", id).maybeSingle();
        return (data as OtherAssetRow) ?? null;
    } catch {
        return null;
    }
}

export default async function EditAssetPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: idStr } = await params;
    const id = Number(idStr);
    const asset = Number.isInteger(id) ? await fetchAsset(id) : null;
    const category = asset?.category === "연금" ? "연금" : "파킹";

    return (
        <main className="container" style={{ padding: "40px 16px", minHeight: "100vh", paddingBottom: "80px" }}>
            <header style={{ marginBottom: "24px" }}>
                <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "4px" }}>{category} 수정</h1>
                <p className="text-secondary">자산의 금액·구분을 고칩니다.</p>
            </header>

            <Navigation />

            {!asset ? (
                <div className="card" style={{ maxWidth: "720px" }}>
                    <p style={{ marginBottom: "16px" }}>해당 자산을 찾을 수 없습니다. (id: {idStr})</p>
                    <Link href="/portfolio" className="btn" style={{ display: "inline-block" }}>
                        대시보드로 돌아가기
                    </Link>
                </div>
            ) : (
                <OtherAssetForm
                    fixedCategory={category}
                    assetId={asset.id}
                    initial={{
                        subcategory: asset.subcategory ?? "예금",
                        name: asset.name,
                        account: asset.account ?? "",
                        principal: asset.principal !== null && asset.principal !== undefined ? String(asset.principal) : "",
                        amount: String(asset.amount),
                        currency: asset.currency as Currency,
                        memo: asset.memo ?? "",
                    } satisfies OtherAssetFormInitial}
                />
            )}
        </main>
    );
}
