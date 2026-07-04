import { NextResponse } from 'next/server';
import { getServiceClient, HoldingRow } from '@/lib/supabase';

// GET /api/holdings — holdings_v 뷰 조회 (현재 보유 종목)
export async function GET() {
    let supabase;
    try {
        supabase = getServiceClient();
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Supabase 초기화 실패';
        return NextResponse.json({ error: msg }, { status: 500 });
    }

    const { data, error } = await supabase
        .from('holdings_v')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ holdings: (data ?? []) as HoldingRow[] });
}
