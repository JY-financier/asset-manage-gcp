import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient, OtherAssetInsert } from '@/lib/supabase';
import { validateOtherAsset } from '@/lib/otherAssetValidation';

function parseId(idStr: string): number | null {
    const id = Number(idStr);
    if (!Number.isInteger(id) || id <= 0) return null;
    return id;
}

// PATCH /api/assets/[id] — 수정 (updated_at 갱신 포함)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id: idStr } = await params;
    const id = parseId(idStr);
    if (id === null) return NextResponse.json({ error: '잘못된 id' }, { status: 400 });

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: '유효한 JSON 본문이 필요합니다.' }, { status: 400 });
    }

    let update: OtherAssetInsert;
    try {
        update = validateOtherAsset(body);
    } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : '검증 실패' }, { status: 400 });
    }

    let supabase;
    try {
        supabase = getServiceClient();
    } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : '초기화 실패' }, { status: 500 });
    }

    const { data, error } = await supabase
        .from('other_assets')
        .update({ ...update, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: '해당 자산을 찾을 수 없습니다.' }, { status: 404 });
    return NextResponse.json({ asset: data });
}

// DELETE /api/assets/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id: idStr } = await params;
    const id = parseId(idStr);
    if (id === null) return NextResponse.json({ error: '잘못된 id' }, { status: 400 });

    let supabase;
    try {
        supabase = getServiceClient();
    } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : '초기화 실패' }, { status: 500 });
    }

    const { error } = await supabase.from('other_assets').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
}
