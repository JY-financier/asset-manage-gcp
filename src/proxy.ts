import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
    const currentPath = request.nextUrl.pathname;

    // 로그인 페이지·정적 리소스는 예외
    if (currentPath.startsWith('/login') || currentPath.startsWith('/_next')) {
        return NextResponse.next();
    }

    const appPassword = process.env.APP_PASSWORD;

    // 환경변수에 패스워드가 설정되지 않았으면 통과 (개발 편의성)
    if (!appPassword) {
        return NextResponse.next();
    }

    const token = request.cookies.get('app_auth_token')?.value;
    const authorized = token === appPassword;

    if (authorized) {
        return NextResponse.next();
    }

    // 미인증 상태 처리
    if (currentPath.startsWith('/api')) {
        // API는 로그인 리다이렉트 대신 401 JSON 반환
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 페이지는 로그인으로 리다이렉트
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
