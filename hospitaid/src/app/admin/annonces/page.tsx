import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  addAnnouncement, addPartner, deleteAnnouncement, deletePartner, updateAnnouncement, updatePartner,
} from "../actions";

export const dynamic = "force-dynamic";

const dayFmt = new Intl.DateTimeFormat("sv-SE", { timeZone: "Africa/Libreville" }); // AAAA-MM-JJ
const day = (d: Date | null) => (d ? dayFmt.format(d) : "");

const ERRORS: Record<string, string> = {
  partner: "Encart refusé : nom et titre obligatoires ; les adresses (lien, image) doivent commencer par https://.",
  announcement: "Annonce refusée : texte obligatoire ; le lien doit commencer par https://.",
};

function ScheduleFields({ startsAt, endsAt, sortOrder, active }: { startsAt?: Date | null; endsAt?: Date | null; sortOrder?: number; active?: boolean }) {
  return (
    <>
      <div className="row-between" style={{ gap: 8 }}>
        <div className="field" style={{ flex: 1 }}><label>Début (facultatif)</label><input className="input" type="date" name="startsAt" defaultValue={day(startsAt ?? null)} /></div>
        <div className="field" style={{ flex: 1 }}><label>Fin (facultatif)</label><input className="input" type="date" name="endsAt" defaultValue={day(endsAt ?? null)} /></div>
      </div>
      <div className="row-between" style={{ gap: 8 }}>
        <div className="field" style={{ width: 110 }}><label>Ordre</label><input className="input" name="sortOrder" inputMode="numeric" defaultValue={sortOrder ?? 0} /></div>
        <label className="checkbox-row" style={{ alignItems: "center" }}><input type="checkbox" name="active" defaultChecked={active ?? true} /><span>Affiché</span></label>
      </div>
    </>
  );
}

export default async function AdminAdsPage({ searchParams }: { searchParams: { saved?: string; error?: string } }) {
  const [partners, announcements] = await Promise.all([
    prisma.partner.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] }),
    prisma.announcement.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] }),
  ]);

  return (
    <main className="container" style={{ maxWidth: 680 }}>
      <Link href="/admin" className="back-link">← Espace admin</Link>
      <h1 className="page-title">Partenaires et annonces</h1>
      <p className="page-sub">
        Les encarts partenaires apparaissent sur l&apos;accueil et sous le résultat d&apos;une simulation, toujours
        étiquetés « Partenaire ». La bande d&apos;annonces défile en bas de chaque page. Une annonce ou un encart
        avec dates ne s&apos;affiche que pendant la période choisie. Évitez tout contenu qui pourrait passer pour une
        information médicale officielle.
      </p>
      {searchParams.saved && <div className="notice notice-blue" role="status">Enregistré.</div>}
      {searchParams.error && <div className="notice" role="alert">{ERRORS[searchParams.error] ?? "Erreur."}</div>}

      <section className="card">
        <h2>Bande d&apos;annonces défilante</h2>
        <form action={addAnnouncement} className="stack" style={{ margin: "10px 0" }}>
          <div className="field"><label>Texte (160 caractères maximum)</label><input className="input" name="text" maxLength={160} required placeholder="Ex. Journée de dépistage gratuit samedi 12 octobre" /></div>
          <div className="field"><label>Lien (facultatif, https://…)</label><input className="input" name="linkUrl" placeholder="https://" /></div>
          <ScheduleFields />
          <button className="btn btn-primary btn-block">Ajouter l&apos;annonce</button>
        </form>
        <div className="stack">
          {announcements.map((a) => (
            <div key={a.id} className="card" style={{ margin: 0, padding: 12 }}>
              <form action={updateAnnouncement} className="stack">
                <input type="hidden" name="id" value={a.id} />
                <div className="field"><label>Texte</label><input className="input" name="text" maxLength={160} required defaultValue={a.text} /></div>
                <div className="field"><label>Lien</label><input className="input" name="linkUrl" defaultValue={a.linkUrl ?? ""} /></div>
                <ScheduleFields startsAt={a.startsAt} endsAt={a.endsAt} sortOrder={a.sortOrder} active={a.active} />
                <button className="btn btn-outline btn-small">Enregistrer</button>
              </form>
              <form action={deleteAnnouncement.bind(null, a.id)} style={{ marginTop: 6 }}><button className="link-btn">Supprimer cette annonce</button></form>
            </div>
          ))}
          {announcements.length === 0 && <p className="muted">Aucune annonce.</p>}
        </div>
      </section>

      <section className="card">
        <h2>Encarts partenaires</h2>
        <form action={addPartner} className="stack" style={{ margin: "10px 0" }}>
          <div className="field"><label>Nom du partenaire</label><input className="input" name="name" maxLength={60} required /></div>
          <div className="field"><label>Titre de l&apos;encart</label><input className="input" name="title" maxLength={80} required /></div>
          <div className="field"><label>Texte (300 caractères maximum)</label><textarea className="input" name="text" maxLength={300} rows={3} /></div>
          <div className="field"><label>Image (adresse https://…, facultatif)</label><input className="input" name="imageUrl" placeholder="https://" /></div>
          <div className="field"><label>Lien (https://…, facultatif)</label><input className="input" name="linkUrl" placeholder="https://" /></div>
          <ScheduleFields />
          <button className="btn btn-primary btn-block">Ajouter l&apos;encart</button>
        </form>
        <div className="stack">
          {partners.map((p) => (
            <div key={p.id} className="card" style={{ margin: 0, padding: 12 }}>
              <form action={updatePartner} className="stack">
                <input type="hidden" name="id" value={p.id} />
                <div className="field"><label>Nom du partenaire</label><input className="input" name="name" maxLength={60} required defaultValue={p.name} /></div>
                <div className="field"><label>Titre</label><input className="input" name="title" maxLength={80} required defaultValue={p.title} /></div>
                <div className="field"><label>Texte</label><textarea className="input" name="text" maxLength={300} rows={3} defaultValue={p.text} /></div>
                <div className="field"><label>Image</label><input className="input" name="imageUrl" defaultValue={p.imageUrl ?? ""} /></div>
                <div className="field"><label>Lien</label><input className="input" name="linkUrl" defaultValue={p.linkUrl ?? ""} /></div>
                <ScheduleFields startsAt={p.startsAt} endsAt={p.endsAt} sortOrder={p.sortOrder} active={p.active} />
                <button className="btn btn-outline btn-small">Enregistrer</button>
              </form>
              <form action={deletePartner.bind(null, p.id)} style={{ marginTop: 6 }}><button className="link-btn">Supprimer cet encart</button></form>
            </div>
          ))}
          {partners.length === 0 && <p className="muted">Aucun encart partenaire.</p>}
        </div>
      </section>
    </main>
  );
}
