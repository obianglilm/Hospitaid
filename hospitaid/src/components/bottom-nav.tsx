"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Accueil", icon: "🏠" },
  { href: "/simulateur", label: "Simulateur", icon: "🧮" },
  { href: "/etablissements", label: "Établissements", icon: "🏥" },
];

export default function BottomNav() {
  const pathname = usePathname() ?? "/";
  if (pathname.startsWith("/admin")) return null;
  return (
    <nav className="bottom-nav" aria-label="Navigation principale">
      {ITEMS.map((i) => {
        const active = i.href === "/" ? pathname === "/" : pathname.startsWith(i.href);
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
