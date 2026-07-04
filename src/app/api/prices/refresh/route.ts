import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const UA = 'Mozilla/5.0 (compatible; AssetDashboard/1.0)';
const US_PREFIXES = ['NASDAQ:', 'NYSE:', 'NYSEARCA:', 'BATS:', 'AMEX:'];
export const FX_TICKER = 'FX:USDKRW';

interface PriceResult {
    ticker: string;
    price: number;
    currency: string;
}

async function fetchNaverPrice(code: string): Promise<number> {
    const res = await fetch(`https://m.stock.naver.com/api/stock/${code}/basic`, {
        headers: { 'User-Agent': UA },
        cache: 'no-store',
    });
    if (!res.ok) throw new Error(`Naver HTTP ${res.status}`);
    const json = await res.json();
    const raw = String(json.closePrice ?? '').replace(/,/g, '');
    const price = Number(raw);
    if (!Number.isFinite(price) || price <= 0) throw new Error(`Naver 가격 파싱 실패: ${json.closePrice}`);
    return price;
}

async function fetchYahooPrice(symbol: string): Promise<number> {
    const res = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
        { headers: { 'User-Agent': UA }, cache: 'no-store' }
    );
    if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`);
    const json = await res.json();
    const price = json?.chart?.result?.[0]?.meta?.regularMarketPrice;
    if (!Number.isFinite(price) || price <= 0) throw new Error(`Yahoo 가격 파싱 실패 (${symbol})`);
    return price;
}

async function refreshPrices() {
    const supabase = getServiceClient();

    // 보유 종목 + 각 종목의 매수 통화 (평단과 같은 통화로 시세를 저장해야 손익 계산이 맞음)
    const { data: holdings, error: hErr } = await supabase
        .from('holdings_v')
        .select('ticker, currency');
    if (hErr) throw new Error(`holdings 조회 실패: ${hErr.message}`);

    const tickers = (holdings ?? []) as { ticker: string; currency: string }[];

    // USD 시세를 KRW 평단과 비교해야 하는 종목이 있으면 환율 필요
    const needsFx = tickers.some(
        (t) => US_PREFIXES.some((p) => t.ticker.startsWith(p)) && t.currency === 'KRW'
    );

    let fxRate: number | null = null;
    const errors: string[] = [];

    if (needsFx) {
        try {
            fxRate = await fetchYahooPrice('KRW=X');
        } catch (e) {
            errors.push(`환율 조회 실패: ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    const results = await Promise.allSettled(
        tickers.map(async (t): Promise<PriceResult> => {
            if (t.ticker.startsWith('KRX:')) {
                const code = t.ticker.slice(4);
                const price = await fetchNaverPrice(code);
                return { ticker: t.ticker, price, currency: 'KRW' };
            }
            const usPrefix = US_PREFIXES.find((p) => t.ticker.startsWith(p));
            if (usPrefix) {
                const symbol = t.ticker.slice(usPrefix.length);
                const usd = await fetchYahooPrice(symbol);
                if (t.currency === 'KRW') {
                    if (!fxRate) throw new Error(`${t.ticker}: 환율 없음 (KRW 환산 불가)`);
                    return { ticker: t.ticker, price: usd * fxRate, currency: 'KRW' };
                }
                return { ticker: t.ticker, price: usd, currency: 'USD' };
            }
            throw new Error(`${t.ticker}: 지원하지 않는 티커 형식`);
        })
    );

    const updates: { ticker: string; current_price: number; currency: string; updated_at: string }[] = [];
    const now = new Date().toISOString();

    results.forEach((r, i) => {
        if (r.status === 'fulfilled') {
            updates.push({
                ticker: r.value.ticker,
                current_price: Math.round(r.value.price * 10000) / 10000,
                currency: r.value.currency,
                updated_at: now,
            });
        } else {
            errors.push(`${tickers[i].ticker}: ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`);
        }
    });

    // 환율 자체도 저장 (대시보드에서 USD 자산의 KRW 환산 표시에 사용)
    if (fxRate) {
        updates.push({ ticker: FX_TICKER, current_price: fxRate, currency: 'KRW', updated_at: now });
    }

    if (updates.length > 0) {
        const { error: upErr } = await supabase.from('prices').upsert(updates);
        if (upErr) throw new Error(`prices upsert 실패: ${upErr.message}`);
    }

    return {
        updated: updates.length,
        fx_usdkrw: fxRate,
        errors,
        updated_at: now,
    };
}

async function handle() {
    try {
        const result = await refreshPrices();
        return NextResponse.json(result);
    } catch (e) {
        const msg = e instanceof Error ? e.message : '시세 갱신 실패';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

export async function POST() {
    return handle();
}

// 브라우저 주소창에서 직접 갱신할 수 있도록 GET도 허용 (인증은 미들웨어가 처리)
export async function GET() {
    return handle();
}
