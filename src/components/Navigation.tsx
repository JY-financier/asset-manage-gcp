"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ListOrdered, PlusCircle } from "lucide-react";

const items = [
    { href: "/", label: "대시보드", icon: LayoutDashboard },
    { href: "/trades", label: "매매일지", icon: ListOrdered },
    { href: "/trades/new", label: "거래 추가", icon: PlusCircle },
];

function matches(href: string, pathname: string): boolean {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
}

export default function Navigation() {
    const pathname = usePathname();

    // 매칭되는 항목 중 가장 구체적인(가장 긴) 경로 하나만 활성화한다.
    // 예) /trades/new 에서는 /trades 가 아니라 /trades/new 만 활성화.
    const activeHref = items
        .filter((it) => matches(it.href, pathname))
        .sort((a, b) => b.href.length - a.href.length)[0]?.href;

    return (
        <nav
            style={{
                display: "flex",
                gap: "8px",
                marginBottom: "24px",
                flexWrap: "wrap",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "8px",
            }}
        >
            {items.map(({ href, label, icon: Icon }) => {
                const active = href === activeHref;
                return (
                    <Link
                        key={href}
                        href={href}
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "10px 16px",
                            borderRadius: "8px",
                            fontWeight: 600,
                            fontSize: "0.9rem",
                            background: active ? "var(--accent)" : "transparent",
                            color: active ? "#fff" : "var(--text-secondary)",
                            transition: "background 0.15s ease, color 0.15s ease",
                        }}
                    >
                        <Icon size={16} />
                        {label}
                    </Link>
                );
            })}
        </nav>
    );
}
