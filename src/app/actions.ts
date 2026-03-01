"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function loginAction(prevState: any, formData: FormData) {
    const password = formData.get("password") as string;
    const appPassword = process.env.APP_PASSWORD;

    if (appPassword && password === appPassword) {
        const cookieStore = await cookies();
        cookieStore.set("app_auth_token", password, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 60 * 24 * 30, // 30일 상시 로그인
            path: "/",
        });

        redirect("/");
    } else {
        return { error: "비밀번호가 일치하지 않습니다." };
    }
}
