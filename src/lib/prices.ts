import { getServiceClient } from './supabase';

const UA = 'Mozilla/5.0 (compatible; AssetDashboard/1.0)';
const US_PREFIXES = ['NASDAQ:', 'NYSE:', 'NYSEARCA:', 'BATS:', 'AMEX:'];
export const FX_TICKER = 'FX:USDKRW';

export interface PriceUpdate {
    ticker: string;
    current_price: number;
    currency: string;
    updated_at: string;
}

export interface RefreshResult {
    updated: number;
    fx_usdkrw: number | null;
    errors: string[];
    updated_at: string;
    prices: PriceUpdate[];
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

// 보유 종목의 최신 시세를 조회해 prices 테이블에 upsert
export async function refreshPrices(): Promise<RefreshResult> {
    const supabase = getServiceClient();

    const { data: holdings, error: hErr } = await supabase
        .from('holdings_v')
        .select('ticker, currency');
    if (hErr) throw new Error(`holdings 조회 실패: ${hErr.message}`);

    const tickers = (holdings ?? []) as { ticker: string; currency: string }[];

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
        tickers.map(async (t): Promise<{ ticker: string; price: number; currency: string }> => {
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

    const updates: PriceUpdate[] = [];
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

    if (fxRate) {
        updates.push({ ticker: FX_TICKER, current_price: fxRate, currency: 'KRW', updated_at: now });
    }

    if (updates.length > 0) {
        const { error: upErr } = await supabase.from('prices').upsert(updates);
        if (upErr) throw new Error(`prices upsert 실패: ${upErr.message}`);
    }

    return { updated: updates.length, fx_usdkrw: fxRate, errors, updated_at: now, prices: updates };
}

// KST 기준 오늘 날짜 (YYYY-MM-DD)
export function kstDateString(): string {
    return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

// 시세를 갱신하고 그 결과를 오늘자 스냅샷으로 저장 (매일 자정 cron이 호출)
export async function snapshotToday(): Promise<{ snapshotDate: string; refresh: RefreshResult }> {
    const refresh = await refreshPrices();
    const supabase = getServiceClient();
    const snapshotDate = kstDateString();

    const rows = refresh.prices.map((p) => ({
        ticker: p.ticker,
        snapshot_date: snapshotDate,
        price: p.current_price,
        currency: p.currency,
    }));

    if (rows.length > 0) {
        const { error } = await supabase
            .from('price_snapshots')
            .upsert(rows, { onConflict: 'ticker,snapshot_date' });
        if (error) throw new Error(`snapshot upsert 실패: ${error.message}`);
    }

    return { snapshotDate, refresh };
}
