"use client";

import React, { useActionState } from "react";
import { loginAction } from "@/app/actions";
import { Lock } from "lucide-react";

const initialState = { error: "" };

export default function LoginPage() {
    const [state, formAction, isPending] = useActionState(loginAction, initialState);

    return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "16px" }}>
            <div className="card" style={{ maxWidth: "400px", width: "100%", textAlign: "center" }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px", color: "var(--accent)" }}>
                    <Lock size={48} />
                </div>
                <h1 style={{ fontSize: "1.5rem", marginBottom: "8px", fontWeight: 700 }}>대시보드 잠금</h1>
                <p className="text-secondary" style={{ marginBottom: "32px" }}>접근을 위해 비밀번호를 입력해주세요.</p>

                <form action={formAction}>
                    <input
                        type="password"
                        name="password"
                        className="input"
                        placeholder="비밀번호"
                        required
                        style={{ marginBottom: "16px" }}
                    />

                    {state?.error && (
                        <div className="text-danger" style={{ marginBottom: "16px", fontSize: "0.875rem" }}>
                            {state.error}
                        </div>
                    )}

                    <button type="submit" className="btn" style={{ width: "100%" }} disabled={isPending}>
                        {isPending ? "확인 중..." : "접속하기"}
                    </button>
                </form>
            </div>
        </div>
    );
}
