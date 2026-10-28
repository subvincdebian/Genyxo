"use client";
import { useEffect, useState } from "react";

export type Account = {
  id: number;
  name?: string;
  email: string;
  avatar?: string;
  credits: number;
  role: string;
};
export type Preferences = {
  memory: boolean;
  timezone: string;
  customInstructions: string;
  responseLanguage: string;
};
export type Security = {
  hasPassword: boolean;
  emailVerified: boolean;
  providers: string[];
};
export type Usage = {
  totalCredits: number;
  requests: number;
  period: number;
  timezone: string;
  days: { date: string; credits: number; requests: number }[];
  models: { name: string; credits: number; requests: number }[];
};
export type LedgerItem = {
  id: number;
  description?: string;
  type: "PURCHASE" | "SPEND" | "REFUND";
  status: string;
  amount: number;
  creditsAmount: number;
  createdAt: string;
};
export type Ledger = {
  items: LedgerItem[];
  meta: { totalItems: number; totalPages: number; currentPage: number };
};
export type Affiliate = {
  balance: number;
  invitedCount: number;
  referralLink: string;
};

export class AccountError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export async function accountRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem("authToken");
  if (!token) throw new AccountError("Sign in to manage your account.", 401);
  const response = await fetch(`/api/${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new AccountError(
      Array.isArray(data.message)
        ? data.message.join(" ")
        : data.detail || data.message || `Request failed (${response.status})`,
      response.status,
    );
  return data as T;
}

export function useAccountResource<T>(path: string) {
  const [state, setState] = useState<{
    path: string;
    data: T | null;
    error: AccountError | null;
    loading: boolean;
  }>({ path, data: null, error: null, loading: true });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const request = new AbortController();
    accountRequest<T>(path, { signal: request.signal }).then(
      (data) => {
        if (!request.signal.aborted)
          setState({ path, data, error: null, loading: false });
      },
      (error) => {
        if (!request.signal.aborted)
          setState({ path, data: null, error, loading: false });
      },
    );
    return () => request.abort();
  }, [path, revision]);
  return {
    data: state.path === path ? state.data : null,
    error: state.path === path ? state.error : null,
    loading: state.path !== path || state.loading,
    refresh: () => {
      setState((old) => ({ ...old, loading: true, error: null }));
      setRevision((old) => old + 1);
    },
  };
}

export function cacheAccount(account: Account) {
  try {
    for (const [key, value] of Object.entries({
      userName: account.name || "",
      userEmail: account.email,
      userAvatar: account.avatar || "",
      userCredits: String(account.credits),
    }))
      localStorage.setItem(key, value);
    document.dispatchEvent(new Event("genyxo:session"));
  } catch {
    /* The server remains the source of truth when browser storage is full. */
  }
}

export { signOutSession as signOut } from "@/entities/session";
