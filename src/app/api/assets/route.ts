import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient, OtherAssetInsert } from '@/lib/supabase';
import { validateOtherAsset } from '@/lib/otherAssetValidation';

// GET /api/assets — 비주식 자산 목록
export async function GET() {
    let supabase;
    try {
        supabase = getServiceClient();
    } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : '초기화 실패' }, { status: 500 });
    }

    const { data, error } = await supabase
        .from('other_assets')
        .select('*')
        .order('category', { ascending: true })
        .order('amount', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ assets: data ?? [] });
}

// POST /api/assets — 신규 비주식 자산
export async function POST(req: NextRequest) {
    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: '유효한 JSON 본문이 필요합니다.' }, { status: 400 });
    }

    let insert: OtherAssetInsert;
    try {
        insert = validateOtherAsset(body);
    } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : '검증 실패' }, { status: 400 });
    }

    let supabase;
    try {
        supabase = getServiceClient();
    } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : '초기화 실패' }, { status: 500 });
    }

    const { data, error } = await supabase.from('other_assets').insert(insert).select('*').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ asset: data }, { status: 201 });
}
