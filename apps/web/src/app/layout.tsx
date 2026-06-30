import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "MedSync — Telemedicina simples e humana",
    template: "%s | MedSync",
  },
  description:
    "Plataforma de telemedicina para conectar médicos e pacientes com segurança.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

