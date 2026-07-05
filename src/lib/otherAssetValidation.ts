import { OtherAssetInsert, Currency } from './supabase';

const ALLOWED_CURRENCIES: Currency[] = ['KRW', 'USD', 'JPY'];

export function validateOtherAsset(body: unknown): OtherAssetInsert {
    if (!body || typeof body !== 'object') {
        throw new Error('요청 본문이 올바르지 않습니다.');
    }
    const b = body as Record<string, unknown>;

    const category = String(b.category ?? '').trim();
    const name = String(b.name ?? '').trim();
    const currency = (String(b.currency ?? 'KRW').trim().toUpperCase() || 'KRW') as Currency;

    if (!category) throw new Error('구분(category)이 필요합니다.');
    if (!name) throw new Error('name(항목명)이 필요합니다.');
    if (!ALLOWED_CURRENCIES.includes(currency)) {
        throw new Error("currency는 'KRW', 'USD', 'JPY' 중 하나여야 합니다.");
    }

    if (b.amount === null || b.amount === undefined || b.amount === '') {
        throw new Error('amount(평가금액)이 비어 있습니다.');
    }
    const amount = typeof b.amount === 'number' ? b.amount : Number(String(b.amount).replace(/,/g, ''));
    if (!Number.isFinite(amount)) throw new Error('amount는 숫자여야 합니다.');
    if (amount < 0) throw new Error('amount는 음수일 수 없습니다.');

    // 원금(연금에서만 사용, 선택). 파킹은 null.
    let principal: number | null = null;
    if (b.principal !== null && b.principal !== undefined && b.principal !== '') {
        principal = typeof b.principal === 'number' ? b.principal : Number(String(b.principal).replace(/,/g, ''));
        if (!Number.isFinite(principal)) throw new Error('원금은 숫자여야 합니다.');
        if (principal < 0) throw new Error('원금은 음수일 수 없습니다.');
    }

    return {
        category,
        subcategory: b.subcategory ? String(b.subcategory).trim() : null,
        name,
        account: b.account ? String(b.account).trim() : null,
        principal,
        amount,
        currency,
        memo: b.memo ? String(b.memo).trim() : null,
    };
}
