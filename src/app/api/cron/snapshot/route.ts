import { NextRequest, NextResponse } from 'next/server';
import { snapshotToday } from '@/lib/prices';

export const dynamic = 'force-dynamic';

// Vercel Cron이 매일 자정(KST) 호출.
// Vercel은 CRON_SECRET 환경변수가 있으면 요청에 Authorization: Bearer <CRON_SECRET> 헤더를 자동 주입.
// 미들웨어는 /api/cron 경로를 통과시키므로, 이 라우트가 직접 인증을 검사한다.
async function handle(req: NextRequest) {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
        const auth = req.headers.get('authorization');
        if (auth !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    try {
        const { snapshotDate, refresh } = await snapshotToday();
        return NextResponse.json({
            snapshot_date: snapshotDate,
            updated: refresh.updated,
            fx_usdkrw: refresh.fx_usdkrw,
            errors: refresh.errors,
        });
    } catch (e) {
        const msg = e instanceof Error ? e.message : '스냅샷 저장 실패';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    return handle(req);
}

export async function POST(req: NextRequest) {
    return handle(req);
}
