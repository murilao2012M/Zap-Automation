"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-[color:var(--color-bg)] px-4 py-10 text-[color:var(--color-ink)]">
        <main className="mx-auto flex max-w-[720px] flex-col gap-4 rounded-[32px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-8 shadow-[0_20px_50px_rgba(12,24,18,0.12)]">
          <span className="pill w-fit">Monitoramento ativo</span>
          <h1 className="font-serif text-4xl tracking-[-0.05em]">Algo saiu do esperado.</h1>
          <p className="text-sm leading-7 text-[color:var(--color-muted)]">
            Registramos esse erro para investigacao. Voce pode tentar novamente agora ou voltar para a tela inicial.
          </p>
          <div className="flex flex-wrap gap-3">
            <button className="primary-button px-5 py-3" onClick={reset} type="button">
              Tentar novamente
            </button>
            <Link className="secondary-button px-5 py-3" href="/">
              Voltar para a home
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
