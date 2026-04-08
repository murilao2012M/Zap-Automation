"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { login } from "@/lib/api";
import { persistSession } from "@/lib/auth";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await login({ email, password });
      persistSession({
        token: result.access_token,
        user: result.user,
      });
      router.push("/dashboard");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Falha ao entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <h3 className="font-serif text-xl tracking-[-0.04em] text-[color:var(--color-ink)]">Entrar na plataforma</h3>
        <p className="mt-1.5 text-sm leading-6 text-[color:var(--color-muted)]">
          Acesse o ambiente da sua empresa e continue sua operação.
        </p>
      </div>

      <label className="block">
        <span className="field-label">E-mail</span>
        <input
          className="field-input"
          required
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
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
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Sua senha"
        />
      </label>

      {error ? (
        <p className="rounded-2xl border border-[rgba(255,120,120,0.22)] bg-[rgba(120,28,28,0.16)] px-4 py-3 text-sm font-medium text-[rgb(255,196,196)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          {error}
        </p>
      ) : null}

      <button
        className="inline-flex w-full items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(104,198,131,0.95),rgba(72,145,96,0.96))] px-5 py-3.5 text-sm font-semibold text-[#07110b] shadow-[0_12px_24px_rgba(72,145,96,0.24)] transition duration-200 hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-wait disabled:opacity-70"
        disabled={loading}
        type="submit"
      >
        {loading ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
