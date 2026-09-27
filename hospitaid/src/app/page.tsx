import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Home() {
  let lettresCount = 0;
  let rulesCount = 0;
  let facilitiesCount = 0;
  let examsCount = 0;
  let dbError: string | null = null;

  try {
    lettresCount = await prisma.lettreCle.count();
    rulesCount = await prisma.coverageRule.count();
    facilitiesCount = await prisma.healthFacility.count();
    examsCount = await prisma.exam.count();
  } catch (e) {
    dbError = e instanceof Error ? e.message : "Erreur de connexion à la base de données.";
  }

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "32px 20px", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ color: "#04578F", fontSize: 26, marginBottom: 4 }}>HospitAid</h1>
      <p style={{ color: "#5B6672", marginTop: 0 }}>Parce que chaque patient compte.</p>

      <div style={{ background: "#fff", border: "1px solid #E3E1DC", borderRadius: 12, padding: 18, marginTop: 20 }}>
        <h2 style={{ fontSize: 16, marginTop: 0 }}>État du back-end (Phase 2-3)</h2>
        {dbError ? (
          <p style={{ color: "#E14547" }}>⚠️ Connexion à la base de données impossible : {dbError}</p>
        ) : (
          <>
            <p style={{ margin: "6px 0" }}>✅ Application déployée avec succès</p>
            <p style={{ margin: "6px 0" }}>✅ Connexion à la base de données OK</p>
            <p style={{ margin: "6px 0" }}>✅ {lettresCount} lettres-clés chargées (Annexe 1 CNAMGS)</p>
            <p style={{ margin: "6px 0" }}>✅ {rulesCount} règles de couverture par défaut chargées</p>
            <p style={{ margin: "6px 0" }}>✅ {facilitiesCount} établissements chargés (non vérifiés)</p>
            <p style={{ margin: "6px 0" }}>✅ {examsCount} actes de la nomenclature importés (à vérifier)</p>
          </>
        )}
      </div>

      <p style={{ color: "#5B6672", fontSize: 13, marginTop: 20, lineHeight: 1.6 }}>
        Les pages publiques (recherche, fiches examens, établissements) arrivent en Phase 4.
      </p>
    </main>
  );
}
