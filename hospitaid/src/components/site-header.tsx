import Link from "next/link";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, verifySessionToken } from "@/lib/admin-auth";
import { USER_COOKIE_NAME, verifyUserToken } from "@/lib/user-session";

export default async function SiteHeader() {
  const jar = cookies();
  const userId = await verifyUserToken(jar.get(USER_COOKIE_NAME)?.value);
  const isAdmin = await verifySessionToken(jar.get(ADMIN_COOKIE_NAME)?.value);

  return (
    <>
      <div className="tricolor" />
      <header className="site-header">
        <div className="site-header-inner">
          <Link href="/" className="brand-link">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="site-logo" src="/logo.jpg" alt="Logo HospitAid" />
            <span>
              <span className="site-name">HospitAid</span>
              <span className="site-tag">Parce que chaque patient compte.</span>
            </span>
          </Link>
          <div className="header-actions">
            {isAdmin && <Link href="/admin" className="pill pill-red">Admin</Link>}
            {userId ? (
              <Link href="/mon-compte" className="pill">Mon compte</Link>
            ) : (
              <Link href="/connexion" className="pill">Se connecter</Link>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
