import { prisma } from "@/lib/prisma";
import SimulatorApp from "@/components/simulator-app";
import { getCurrentUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";

export default async function SimulateurPage() {
  const user = await getCurrentUser();
  const facilities = await prisma.healthFacility.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true, tier: true },
    orderBy: { name: "asc" },
  });

  return (
    <main className="container">
      <h1 className="page-title">Simulateur</h1>
      <p className="page-sub">Calculez ce qui reste à votre charge pour un bon d&apos;examen.</p>
      {facilities.length === 0 ? (
        <div className="notice">Aucun établissement disponible pour l&apos;instant.</div>
      ) : (
        <SimulatorApp facilities={facilities} defaultStatus={user?.defaultCoverageType ?? null} loggedIn={!!user} />
      )}
    </main>
  );
}
