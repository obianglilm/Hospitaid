import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <Link href="/confidentialite">Confidentialité</Link>
        <span aria-hidden="true"> · </span>
        <Link href="/admin">Espace administrateur</Link>
      </div>
      <p>
        Service d&apos;information non officiel. Les tarifs sont donnés à titre indicatif et doivent être
        confirmés auprès de l&apos;établissement et de la CNAMGS.
      </p>
    </footer>
  );
}
