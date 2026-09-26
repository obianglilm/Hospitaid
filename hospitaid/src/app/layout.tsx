import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "HospitAid",
  description: "Connaissez vos examens. Comprenez votre ticket modérateur.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
