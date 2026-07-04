import { NextResponse } from 'next/server';
import { refreshPrices } from '@/lib/prices';

export const dynamic = 'force-dynamic';

async function handle() {
    try {
        const result = await refreshPrices();
        // 응답에서 내부 prices 배열은 제외 (요약만 반환)
        const { prices: _prices, ...summary } = result;
        void _prices;
        return NextResponse.json(summary);
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
