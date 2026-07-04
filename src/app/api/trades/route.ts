import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient, TradeInsert } from '@/lib/supabase';
import { validateTrade } from '@/lib/tradeValidation';

// POST /api/trades — 신규 매매 기록
export async function POST(req: NextRequest) {
    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: '유효한 JSON 본문이 필요합니다.' }, { status: 400 });
    }

    let insert: TradeInsert;
    try {
        insert = validateTrade(body);
    } catch (e) {
        const msg = e instanceof Error ? e.message : '검증 실패';
        return NextResponse.json({ error: msg }, { status: 400 });
    }

    let supabase;
    try {
        supabase = getServiceClient();
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Supabase 초기화 실패';
        return NextResponse.json({ error: msg }, { status: 500 });
    }

    const { data, error } = await supabase
        .from('trades')
        .insert(insert)
        .select('*')
        .single();

    if (error) {
        return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
    }

    return NextResponse.json({ trade: data }, { status: 201 });
}

// GET /api/trades — 최근 매매 이력 조회 (?limit=..., ?ticker=...)
export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 100), 500);
    const ticker = url.searchParams.get('ticker');

    let supabase;
    try {
        supabase = getServiceClient();
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Supabase 초기화 실패';
        return NextResponse.json({ error: msg }, { status: 500 });
    }

    let query = supabase
        .from('trades')
        .select('*')
        .order('trade_date', { ascending: false })
        .order('id', { ascending: false })
        .limit(limit);

    if (ticker) {
        query = query.eq('ticker', ticker);
    }

    const { data, error } = await query;
    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ trades: data ?? [] });
}
