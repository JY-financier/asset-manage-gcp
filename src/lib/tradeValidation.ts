import { TradeInsert, TradeSide, Currency } from './supabase';

const ALLOWED_SIDES: TradeSide[] = ['BUY', 'SELL'];
const ALLOWED_CURRENCIES: Currency[] = ['KRW', 'USD', 'JPY'];

function parseNumeric(value: unknown, field: string, allowZero = true): number {
    if (value === null || value === undefined || value === '') {
        throw new Error(`${field}이(가) 비어 있습니다.`);
    }
    const n = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
    if (!Number.isFinite(n)) {
        throw new Error(`${field}은(는) 숫자여야 합니다.`);
    }
    if (!allowZero && n <= 0) {
        throw new Error(`${field}은(는) 0보다 커야 합니다.`);
    }
    if (n < 0) {
        throw new Error(`${field}은(는) 음수일 수 없습니다.`);
    }
    return n;
}

// 거래 입력값 검증 (POST 신규 / PATCH 수정 공용)
export function validateTrade(body: unknown): TradeInsert {
    if (!body || typeof body !== 'object') {
        throw new Error('요청 본문이 올바르지 않습니다.');
    }
    const b = body as Record<string, unknown>;

    const ticker = String(b.ticker ?? '').trim();
    const name = String(b.name ?? '').trim();
    const trade_date = String(b.trade_date ?? '').trim();
    const side = String(b.side ?? '').trim().toUpperCase() as TradeSide;
    const currency = (String(b.currency ?? 'KRW').trim().toUpperCase() || 'KRW') as Currency;

    if (!ticker) throw new Error('ticker가 필요합니다.');
    if (!name) throw new Error('name(종목명)이 필요합니다.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trade_date)) {
        throw new Error('trade_date는 YYYY-MM-DD 형식이어야 합니다.');
    }
    if (!ALLOWED_SIDES.includes(side)) {
        throw new Error("side는 'BUY' 또는 'SELL'이어야 합니다.");
    }
    if (!ALLOWED_CURRENCIES.includes(currency)) {
        throw new Error("currency는 'KRW', 'USD', 'JPY' 중 하나여야 합니다.");
    }

    const price = parseNumeric(b.price, 'price', false);
    const quantity = parseNumeric(b.quantity, 'quantity', false);
    const fee = b.fee === undefined || b.fee === null || b.fee === ''
        ? 0
        : parseNumeric(b.fee, 'fee');

    return {
        ticker,
        name,
        category: b.category ? String(b.category).trim() : null,
        account: b.account ? String(b.account).trim() : null,
        trade_date,
        side,
        price,
        quantity,
        fee,
        currency,
        memo: b.memo ? String(b.memo).trim() : null,
    };
}
