export default function SiteHeader() {
  return (
    <>
      <div className="tricolor" />
      <header className="site-header">
        <div className="site-header-inner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="site-logo" src="/logo.jpg" alt="Logo HospitAid" />
          <div>
            <div className="site-name">HospitAid</div>
            <div className="site-tag">Parce que chaque patient compte.</div>
          </div>
        </div>
      </header>
    </>
  );
}
