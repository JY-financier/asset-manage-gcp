import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 브라우저·서버 어디서든 안전하게 쓸 수 있는 읽기 전용 클라이언트
export function getPublicClient(): SupabaseClient {
    if (!SUPABASE_URL || !PUBLISHABLE_KEY) {
        throw new Error('Supabase URL 또는 Publishable key가 설정되지 않았습니다. 환경변수를 확인하십시오.');
    }
    return createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
        auth: { persistSession: false },
    });
}

// 서버(API Route, Server Component, Server Action) 전용. RLS 우회.
// 절대 클라이언트 컴포넌트에서 호출하지 말 것.
export function getServiceClient(): SupabaseClient {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
        throw new Error('Supabase URL 또는 Service role key가 설정되지 않았습니다. 서버 환경변수를 확인하십시오.');
    }
    return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
    });
}

// =====================
// 도메인 타입
// =====================

export type TradeSide = 'BUY' | 'SELL';
export type Currency = 'KRW' | 'USD' | 'JPY';

export interface TradeRow {
    id: number;
    ticker: string;
    name: string;
    category: string | null;
    account: string | null;
    trade_date: string; // YYYY-MM-DD
    side: TradeSide;
    price: number;
    quantity: number;
    fee: number;
    currency: Currency;
    memo: string | null;
    created_at: string;
}

export interface TradeInsert {
    ticker: string;
    name: string;
    category?: string | null;
    account?: string | null;
    trade_date: string;
    side: TradeSide;
    price: number;
    quantity: number;
    fee?: number;
    currency?: Currency;
    memo?: string | null;
}

export interface HoldingRow {
    ticker: string;
    name: string;
    category: string | null;
    account: string | null;
    currency: Currency;
    total_qty: number;
    avg_buy_price: number;
    total_cost: number;
    current_price: number | null;
    price_updated_at: string | null;
    market_value: number | null;
    unrealized_pnl: number | null;
}
