import type { TenantSummary, UserSummary } from "@/lib/api";

export type SessionState = {
  token: string | null;
  user: UserSummary | null;
  tenant: TenantSummary | null;
  tenantId: string | null;
};

type JwtPayload = {
  tenant_id?: string;
  email?: string;
  role?: string;
  sub?: string;
};

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return atob(padded);
}

export function parseTokenPayload(token: string): JwtPayload | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) {
      return null;
    }
    return JSON.parse(decodeBase64Url(payload)) as JwtPayload;
  } catch {
    return null;
  }
}

export function getSessionState(): SessionState {
  if (typeof window === "undefined") {
    return { token: null, user: null, tenant: null, tenantId: null };
  }

  const token = localStorage.getItem("zap_token");
  const user = localStorage.getItem("zap_user");
  const tenant = localStorage.getItem("zap_tenant");
  const tokenPayload = token ? parseTokenPayload(token) : null;

  const parsedUser = user ? (JSON.parse(user) as UserSummary) : null;
  const parsedTenant = tenant ? (JSON.parse(tenant) as TenantSummary) : null;
  const tenantId = parsedTenant?.id ?? parsedUser?.tenant_id ?? tokenPayload?.tenant_id ?? null;

  return {
    token,
    user: parsedUser,
    tenant: parsedTenant,
    tenantId,
  };
}

export function persistSession(input: { token: string; user?: UserSummary; tenant?: TenantSummary | null }): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem("zap_token", input.token);
  if (input.user) {
    localStorage.setItem("zap_user", JSON.stringify(input.user));
  }

  const currentTenant = input.tenant ?? getSessionState().tenant;
  if (currentTenant) {
    localStorage.setItem("zap_tenant", JSON.stringify(currentTenant));
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem("zap_token");
  localStorage.removeItem("zap_user");
  localStorage.removeItem("zap_tenant");
}
