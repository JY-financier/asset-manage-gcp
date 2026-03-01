import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
    const currentPath = request.nextUrl.pathname;

    // 로그인 페이지나 API 등은 예외 처리
    if (currentPath.startsWith('/login') || currentPath.startsWith('/api') || currentPath.startsWith('/_next')) {
        return NextResponse.next();
    }

    const appPassword = process.env.APP_PASSWORD;

    // 환경변수에 패스워드가 설정되지 않았으면 통과 (개발 편의성)
    if (!appPassword) {
        return NextResponse.next();
    }

    const token = request.cookies.get('app_auth_token')?.value;

    // 토큰이 비밀번호와 일치하지 않으면 로그인 페이지로 리다이렉트
    if (token !== appPassword) {
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
