import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "MedSync — Telemedicina simples e humana",
    template: "%s | MedSync",
  },
  description:
    "Agenda, sala de vídeo e prontuário para médicos e clínicas atenderem pacientes com segurança.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
