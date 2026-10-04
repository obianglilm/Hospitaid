"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Accueil", icon: "🏠" },
  { href: "/simulateur", label: "Simulateur", icon: "🧮" },
  { href: "/etablissements", label: "Établissements", icon: "🏥" },
  { href: "/mon-compte", label: "Compte", icon: "👤" },
];

export default function BottomNav() {
  const pathname = usePathname() ?? "/";
  if (pathname.startsWith("/admin")) return null;
  return (
    <nav className="bottom-nav" aria-label="Navigation principale">
      {ITEMS.map((i) => {
        const isAccountTab = i.href === "/mon-compte";
        const active = i.href === "/"
          ? pathname === "/"
          : isAccountTab
            ? ["/mon-compte", "/connexion", "/inscription"].some((p) => pathname.startsWith(p))
            : pathname.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} className={active ? "active" : ""}>
            <span className="ic">{i.icon}</span>
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
