"use client";

import { useEffect, useState, useTransition } from "react";
import PartnerCard from "@/components/partner-card";
import type { PartnerView } from "@/lib/ads";

type SearchResult =
  | { kind: "exam"; id: string; label: string; category: string; meta: string }
  | { kind: "consultation"; code: string; label: string; category: string; meta: string };
type Selected = { key: string; kind: "exam" | "consultation"; id?: string; code?: string; label: string };
type Facility = { id: string; name: string; tier: string | null };
type StatusId = "EXONERE" | "PLEIN" | "PLEIN_ALD" | "PAF";
type PriceLine = { label: string; ok: boolean; reason?: string; notCovered?: boolean; ticket?: number };
type PriceResult = { error?: string; lines?: PriceLine[]; total?: number; saved?: boolean; facility?: { name: string } };

const STATUSES: { id: StatusId; label: string; meta: string; rate: number }[] = [
  { id: "EXONERE", label: "Exonéré", meta: "Femme enceinte déclarée", rate: 100 },
  { id: "PLEIN", label: "Plein", meta: "Affection courante", rate: 80 },
  { id: "PLEIN_ALD", label: "Plein — ALD", meta: "Affection de longue durée", rate: 90 },
  { id: "PAF", label: "PAF", meta: "Particulier à ses frais (non assuré)", rate: 0 },
];

function money(n: number) {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u202F") + " FCFA";
}

export default function SimulatorApp({
  facilities,
  defaultStatus,
  loggedIn,
  patientName: initialPatientName,
  partners,
}: {
  facilities: Facility[];
  defaultStatus: StatusId | null;
  loggedIn: boolean;
  patientName: string;
  partners: PartnerView[];
}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState<Selected[]>([]);
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusId | null>(defaultStatus);
  const [priceResult, setPriceResult] = useState<PriceResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [patientName, setPatientName] = useState(initialPatientName);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((d) => setResults(d.results ?? []))
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const keyOf = (r: SearchResult) => (r.kind === "exam" ? `exam:${r.id}` : `consultation:${r.code}`);

  function toggle(r: SearchResult) {
    const key = keyOf(r);
    setSelected((prev) =>
      prev.some((s) => s.key === key)
        ? prev.filter((s) => s.key !== key)
        : [
            ...prev,
            r.kind === "exam"
              ? { key, kind: "exam", id: r.id, label: r.label }
              : { key, kind: "consultation", code: r.code, label: r.label },
          ]
    );
  }

  function computePrice() {
    if (!facilityId || !status) return;
    startTransition(async () => {
      try {
        const res = await fetch("/api/price", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: selected.map((s) => ({ kind: s.kind, id: s.id, code: s.code })),
            facilityId,
            status,
          }),
        });
        setPriceResult(await res.json());
      } catch {
        setPriceResult({ error: "Le calcul a échoué. Vérifiez votre connexion et réessayez." });
      }
      setStep(4);
    });
  }

  async function downloadPdf() {
    if (!facilityId || !status) return;
    setPdfBusy(true);
    setPdfError(null);
    try {
      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: selected.map((s) => ({ kind: s.kind, id: s.id, code: s.code })),
          facilityId,
          status,
          patientName,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        setPdfError(d?.error ?? "Impossible de générer le PDF pour le moment.");
        return;
      }
      const blob = await res.blob();
      const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? "HospitAid-simulation.pdf";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch {
      setPdfError("Le téléchargement a échoué. Vérifiez votre connexion et réessayez.");
    } finally {
      setPdfBusy(false);
    }
  }

  function reset() {
    setStep(1); setSelected([]); setFacilityId(null); setStatus(defaultStatus); setPriceResult(null); setQuery(""); setResults([]);
  }

  return (
    <div>
      <div className="steps">
        {[1, 2, 3, 4].map((s) => <i key={s} className={s <= step ? "on" : ""} />)}
      </div>

      {step === 1 && (
        <section>
          <h2 style={{ fontSize: 18 }}>1. Quels examens ou prestations ?</h2>
          <p className="muted" style={{ margin: "4px 0 12px" }}>
            Tapez un nom courant (« glycémie », « échographie », « consultation »…). Plusieurs choix possibles.
          </p>
          <input className="input" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un examen ou une prestation…" />
          <div className="stack" style={{ marginTop: 10 }}>
            {results.map((r) => {
              const isSel = selected.some((s) => s.key === keyOf(r));
              return (
                <button key={keyOf(r)} className={`option ${isSel ? "selected" : ""}`} onClick={() => toggle(r)}>
                  <span>{r.label}<span className="meta">{r.category}{r.meta ? ` · ${r.meta}` : ""}</span></span>
                  <span className="check">{isSel ? "✓" : ""}</span>
                </button>
              );
            })}
            {query.trim().length >= 2 && results.length === 0 && (
              <p className="muted">Aucun résultat pour « {query} ».</p>
            )}
          </div>
          {selected.length > 0 && (
            <div className="selection-bar">
              <span>{selected.length} sélectionné{selected.length > 1 ? "s" : ""}</span>
              <button className="btn btn-white btn-small" onClick={() => setStep(2)}>Continuer →</button>
            </div>
          )}
        </section>
      )}

      {step === 2 && (
        <section>
          <h2 style={{ fontSize: 18 }}>2. Dans quel établissement ?</h2>
          <p className="muted" style={{ margin: "4px 0 12px" }}>Un seul établissement par bon d&apos;examen.</p>
          <div className="stack">
            {facilities.map((f) => (
              <button key={f.id} className={`option ${facilityId === f.id ? "selected" : ""}`}
                onClick={() => { setFacilityId(f.id); setStep(3); }}>
                <span>{f.name}</span><span className="check" />
              </button>
            ))}
          </div>
          <button className="link-btn" onClick={() => setStep(1)}>← Retour</button>
        </section>
      )}

      {step === 3 && (
        <section>
          <h2 style={{ fontSize: 18 }}>3. Votre statut CNAMGS</h2>
          <p className="muted" style={{ margin: "4px 0 12px" }}>Détermine la part prise en charge.</p>
          <div className="stack">
            {STATUSES.map((s) => (
              <button key={s.id} className={`option ${status === s.id ? "selected" : ""}`} onClick={() => setStatus(s.id)}>
                <span>{s.label}<span className="meta">{s.meta}</span></span>
                <span className="badge">{s.rate} %</span>
              </button>
            ))}
          </div>
          <div className="row-between" style={{ marginTop: 14 }}>
            <button className="link-btn" onClick={() => setStep(2)}>← Retour</button>
            <button className="btn btn-primary" style={{ flex: 1 }} disabled={!status || isPending} onClick={computePrice}>
              {isPending ? "Calcul…" : "Calculer →"}
            </button>
          </div>
        </section>
      )}

      {step === 4 && priceResult && (
        <section>
          <div className="ticket">
            <h3>Ticket modérateur</h3>
            <p style={{ fontWeight: 600, margin: "4px 0 10px" }}>{priceResult.facility?.name}</p>
            {priceResult.error && <p style={{ color: "#C2282A" }}>{priceResult.error}</p>}
            {priceResult.lines?.map((l, i) => (
              <div key={i} className="t-row">
                <span>
                  {l.label}
                  {!l.ok && <span style={{ color: "#C2282A", fontSize: 12 }}> — {l.reason}</span>}
                  {l.ok && l.notCovered && <span className="mini-flag">Non pris en charge CNAMGS</span>}
                </span>
                {l.ok && <span className="n">{money(l.ticket ?? 0)}</span>}
              </div>
            ))}
            <div className="t-total">
              <span style={{ fontWeight: 700 }}>Total à votre charge</span>
              <span className="amount">{money(priceResult.total ?? 0)}</span>
            </div>
          </div>
          <div className="notice">
            Ces informations proviennent de données en cours de vérification et ne remplacent pas une
            confirmation auprès de l&apos;établissement ou de la CNAMGS.
          </div>
          <div className="card" style={{ marginTop: 12 }}>
            <div className="field">
              <label htmlFor="patientName">Nom du patient (pour l&apos;en-tête du PDF, facultatif)</label>
              <input className="input" id="patientName" value={patientName} maxLength={80} onChange={(e) => setPatientName(e.target.value)} placeholder="Ex. Marie Ndong" />
            </div>
            <button className="btn btn-red btn-block" style={{ marginTop: 10 }} disabled={pdfBusy} onClick={downloadPdf}>
              {pdfBusy ? "Préparation du PDF…" : "Télécharger en PDF"}
            </button>
            {pdfError && <p style={{ color: "#C2282A", fontSize: 13, margin: "8px 0 0" }} role="alert">{pdfError}</p>}
          </div>
          {partners.length > 0 && (
            <div className="stack" style={{ marginTop: 12 }}>
              {partners.map((p) => <PartnerCard key={p.id} partner={p} />)}
            </div>
          )}
          {loggedIn ? (
            priceResult.saved && <p className="muted">Cette simulation est enregistrée dans votre historique (Mon compte).</p>
          ) : (
            <p className="muted">
              Envie de garder l&apos;historique de vos simulations ? <a href="/inscription" style={{ color: "#0577BE" }}>Créez votre profil</a>.
            </p>
          )}
          <button className="btn btn-primary btn-block" onClick={reset}>Nouvelle simulation</button>
        </section>
      )}
    </div>
  );
}
