import { AppShell } from "@/components/app-shell";

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

