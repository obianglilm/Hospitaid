import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const TIER_LABELS: Record<string, string> = {
  CHU_PUBLIC: "Centre hospitalier de référence (public)",
  HOPITAL_REGIONAL: "Hôpital régional (public)",
  CENTRE_SANTE: "Centre médical / centre de santé (public)",
  PRIVE_JOUR: "Secteur privé",
  PRIVE_NUIT: "Secteur privé (nuits, dimanches, fériés)",
};

export default async function EtablissementsPage() {
  const facilities = await prisma.healthFacility.findMany({
    where: { status: "ACTIVE" },
    include: { type: true },
    orderBy: { name: "asc" },
  });

  return (
    <main className="container">
      <h1 className="page-title">Établissements</h1>
      <p className="page-sub">Libreville et environs. Informations en cours de vérification.</p>
      <div className="stack">
        {facilities.map((f) => (
          <Link key={f.id} href={`/etablissements/${f.id}`} className="option">
            <span>
              {f.name}
              <span className="meta">
                {f.type.label}{f.tier ? ` · ${TIER_LABELS[f.tier] ?? f.tier}` : ""} · {f.city}
              </span>
            </span>
            <span className={`badge ${f.verifiedAt ? "badge-ok" : "badge-warn"}`}>
              {f.verifiedAt ? "Vérifié" : "Non vérifié"}
            </span>
          </Link>
        ))}
        {facilities.length === 0 && <p className="muted">Aucun établissement pour l&apos;instant.</p>}
      </div>
    </main>
  );
}
