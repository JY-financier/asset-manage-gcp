"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ListOrdered, PlusCircle } from "lucide-react";

const items = [
    { href: "/", label: "대시보드", icon: LayoutDashboard },
    { href: "/trades", label: "매매일지", icon: ListOrdered },
    { href: "/trades/new", label: "거래 추가", icon: PlusCircle },
];

export default function Navigation() {
    const pathname = usePathname();

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
                const active =
                    href === "/"
                        ? pathname === "/"
                        : pathname === href || pathname.startsWith(href + "/");
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
