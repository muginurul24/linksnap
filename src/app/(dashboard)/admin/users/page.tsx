"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { UserTable } from "@/components/admin/user-table";
import { Loader2 } from "lucide-react";
import type { UserPlan } from "@/lib/links/limits";

type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  plan: UserPlan;
  linkCount: number;
  createdAt: Date;
  deletedAt: Date | null;
};

export default function AdminUsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const page = Number(searchParams.get("page") || "1");
  const search = searchParams.get("search") || "";
  const planFilter = searchParams.get("plan") || "";

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === "" || value === "all") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      router.push(`/admin/users?${params.toString()}`);
    },
    [searchParams, router],
  );

  useEffect(() => {
    let cancelled = false;
    const queryParams = new URLSearchParams();
    queryParams.set("page", String(page));
    queryParams.set("limit", "20");
    if (search) queryParams.set("search", search);
    if (planFilter) queryParams.set("plan", planFilter);

    fetch(`/api/v1/admin/users?${queryParams.toString()}`)
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error?.message || "Failed to load users");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setUsers(data.data || []);
        setTotal(data.meta?.total || 0);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [page, search, planFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">
          View, search, and manage all platform users.
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && (
        <UserTable
          users={users}
          total={total}
          page={page}
          limit={20}
          search={search}
          planFilter={planFilter}
          onPageChange={(p) => updateParams({ page: String(p) })}
          onSearch={(q) => updateParams({ search: q || undefined, page: undefined })}
          onPlanFilter={(p) => updateParams({ plan: p || undefined, page: undefined })}
        />
      )}
    </div>
  );
}
