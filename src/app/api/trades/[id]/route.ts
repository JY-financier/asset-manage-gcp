import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient, TradeInsert } from '@/lib/supabase';
import { validateTrade } from '@/lib/tradeValidation';

function parseId(idStr: string): number | null {
    const id = Number(idStr);
    if (!Number.isInteger(id) || id <= 0) return null;
    return id;
}

// GET /api/trades/[id] — 단건 조회 (수정 화면 프리필용)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id: idStr } = await params;
    const id = parseId(idStr);
    if (id === null) return NextResponse.json({ error: '잘못된 id' }, { status: 400 });

    let supabase;
    try {
        supabase = getServiceClient();
    } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : '초기화 실패' }, { status: 500 });
    }

    const { data, error } = await supabase.from('trades').select('*').eq('id', id).maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: '해당 거래를 찾을 수 없습니다.' }, { status: 404 });

    return NextResponse.json({ trade: data });
}

// PATCH /api/trades/[id] — 거래 수정
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

    let update: TradeInsert;
    try {
        update = validateTrade(body);
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
        .from('trades')
        .update(update)
        .eq('id', id)
        .select('*')
        .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: '해당 거래를 찾을 수 없습니다.' }, { status: 404 });

    return NextResponse.json({ trade: data });
}

// DELETE /api/trades/[id] — 거래 삭제
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

    const { error } = await supabase.from('trades').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
}
