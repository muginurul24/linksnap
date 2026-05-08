"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuditLogTable } from "@/components/admin/audit-log-table";
import { Loader2 } from "lucide-react";

type AuditLogEntry = {
  id: string;
  action: string;
  adminUserId: string;
  targetUserId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
};

export default function AdminAuditLogPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const page = Number(searchParams.get("page") || "1");
  const actionFilter = searchParams.get("action") || "";

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
      router.push(`/admin/audit-log?${params.toString()}`);
    },
    [searchParams, router],
  );

  useEffect(() => {
    let cancelled = false;
    const queryParams = new URLSearchParams();
    queryParams.set("page", String(page));
    queryParams.set("limit", "20");
    if (actionFilter) queryParams.set("action", actionFilter);

    fetch(`/api/v1/admin/audit-log?${queryParams.toString()}`)
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error?.message || "Failed to load audit log");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setEntries(data.data || []);
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
  }, [page, actionFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground">
          Track all admin actions across the platform.
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
        <AuditLogTable
          entries={entries}
          total={total}
          page={page}
          limit={20}
          actionFilter={actionFilter}
          onPageChange={(p) => updateParams({ page: String(p) })}
          onActionFilter={(a) => updateParams({ action: a || undefined, page: undefined })}
        />
      )}
    </div>
  );
}
