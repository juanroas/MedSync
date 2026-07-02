"use client";

import { ErrorBanner, buttonClass, inputClass } from "@/components/ui";
import { api, getSession, saveSession } from "@/services/api";
import { KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getSession()) router.replace("/login");
  }, [router]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (newPassword !== confirmation) {
      setError("A confirmação não corresponde à nova senha.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.changePassword(currentPassword, newPassword);
      const user = await api.me();
      saveSession(user);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível alterar a senha.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-[100dvh] place-items-center bg-mist p-6">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl bg-white p-8 shadow-soft">
        <span className="grid size-12 place-items-center rounded-2xl bg-teal-50 text-teal-600">
          <KeyRound size={22} />
        </span>
        <h1 className="mt-6 text-2xl font-bold text-ink">Defina sua senha</h1>
        <p className="mt-2 text-sm text-slate-500">
          A senha temporária deve ser substituída antes de acessar a plataforma.
        </p>
        <div className="mt-7 space-y-5">
          {error && <ErrorBanner message={error} />}
          <PasswordField label="Senha temporária" value={currentPassword} onChange={setCurrentPassword} />
          <PasswordField label="Nova senha" value={newPassword} onChange={setNewPassword} />
          <PasswordField label="Confirmar nova senha" value={confirmation} onChange={setConfirmation} />
          <button className={`${buttonClass} w-full`} disabled={loading}>
            {loading ? "Alterando..." : "Salvar nova senha"}
          </button>
        </div>
      </form>
    </main>
  );
}

function PasswordField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
      <input
        className={inputClass}
        type="password"
        value={value}
        minLength={12}
        onChange={(event) => onChange(event.target.value)}
        required
      />
    </label>
  );
}
