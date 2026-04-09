"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { signup, type SignupPayload } from "@/lib/api";
import { persistSession } from "@/lib/auth";

type Props = {
  onSwitchToLogin: () => void;
};

const initialState: SignupPayload = {
  company_name: "",
  owner_name: "",
  owner_email: "",
  owner_password: "",
  whatsapp_number: "",
  plan_name: "starter",
};

export function SignupForm({ onSwitchToLogin }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<SignupPayload>(initialState);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!acceptedTerms) {
      setError("Você precisa aceitar os termos de uso e a política de privacidade.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const result = await signup({
        ...form,
        whatsapp_number: form.whatsapp_number || undefined,
      });
      persistSession({
        token: result.access_token,
        tenant: result.tenant ?? null,
        user: result.owner,
      });
      router.push("/dashboard");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Falha ao criar sua conta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <h3 className="font-serif text-xl tracking-[-0.04em] text-[color:var(--color-ink)]">Comece sua operação</h3>
        <p className="mt-1.5 text-sm leading-6 text-[color:var(--color-muted)]">
          Crie sua empresa e receba o acesso inicial em segundos.
        </p>
      </div>

      <label className="block">
        <span className="field-label">Empresa</span>
        <input
          className="field-input"
          required
          value={form.company_name}
          onChange={(event) => setForm((current) => ({ ...current, company_name: event.target.value }))}
          placeholder="Loja Exemplo"
        />
      </label>

      <label className="block">
        <span className="field-label">Responsável</span>
        <input
          className="field-input"
          required
          value={form.owner_name}
          onChange={(event) => setForm((current) => ({ ...current, owner_name: event.target.value }))}
          placeholder="Joao Silva"
        />
      </label>

      <label className="block">
        <span className="field-label">E-mail</span>
        <input
          className="field-input"
          required
          type="email"
          value={form.owner_email}
          onChange={(event) => setForm((current) => ({ ...current, owner_email: event.target.value }))}
          placeholder="joao@empresa.com"
        />
      </label>

      <label className="block">
        <span className="field-label">Senha</span>
        <input
          className="field-input"
          required
          type="password"
          minLength={6}
          value={form.owner_password}
          onChange={(event) => setForm((current) => ({ ...current, owner_password: event.target.value }))}
          placeholder="Mínimo de 6 caracteres"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="field-label">WhatsApp da empresa</span>
        <input
            className="field-input"
          value={form.whatsapp_number}
          onChange={(event) => setForm((current) => ({ ...current, whatsapp_number: event.target.value }))}
          placeholder="5511999999999"
        />
        </label>

        <label className="block">
          <span className="field-label">Plano</span>
        <select
            className="field-input"
          value={form.plan_name}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              plan_name: event.target.value as SignupPayload["plan_name"],
            }))
          }
        >
          <option value="starter">Starter</option>
          <option value="smarter">Smarter</option>
        </select>
        </label>
      </div>

      <label className="toggle-card flex items-start gap-3">
        <input
          checked={acceptedTerms}
          className="mt-1 h-4 w-4"
          onChange={(event) => setAcceptedTerms(event.target.checked)}
          type="checkbox"
        />
        <span className="text-sm leading-6 text-[color:var(--color-muted)]">
          Concordo com os{" "}
          <Link className="font-semibold text-[color:var(--color-copper)] transition hover:text-[color:var(--color-brand)]" href="/termos" target="_blank">
            termos de uso
          </Link>{" "}
          e com a{" "}
          <Link className="font-semibold text-[color:var(--color-copper)] transition hover:text-[color:var(--color-brand)]" href="/privacidade" target="_blank">
            política de privacidade
          </Link>{" "}
          e li as diretrizes de{" "}
          <Link className="font-semibold text-[color:var(--color-copper)] transition hover:text-[color:var(--color-brand)]" href="/lgpd" target="_blank">
            tratamento de dados LGPD
          </Link>
          .
        </span>
      </label>

      {error ? (
        <p className="rounded-2xl border border-[rgba(255,120,120,0.22)] bg-[rgba(120,28,28,0.16)] px-4 py-3 text-sm font-medium text-[rgb(255,196,196)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          {error}
        </p>
      ) : null}

      <button
        className="inline-flex w-full items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(104,198,131,0.95),rgba(72,145,96,0.96))] px-5 py-3.5 text-sm font-semibold text-[#07110b] shadow-[0_12px_24px_rgba(72,145,96,0.24)] transition duration-200 hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-wait disabled:opacity-70"
        disabled={loading || !acceptedTerms}
        type="submit"
      >
        {loading ? "Criando conta..." : "Criar conta"}
      </button>

      <p className="text-sm text-[color:var(--color-muted)]">
        Já possui acesso?{" "}
        <button className="font-semibold text-[color:var(--color-copper)] transition hover:text-[color:var(--color-brand)]" onClick={onSwitchToLogin} type="button">
          Entrar agora
        </button>
      </p>
    </form>
  );
}
