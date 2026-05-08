"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

type AuditLogEntry = {
  id: string;
  action: string;
  adminUserId: string;
  targetUserId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
};

type Props = {
  entries: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
  actionFilter: string;
  onPageChange: (page: number) => void;
  onActionFilter: (action: string) => void;
};

const ACTION_LABELS: Record<string, { label: string; color: "default" | "secondary" | "outline" | "destructive" }> = {
  "user.plan.change": { label: "Plan Change", color: "secondary" },
  "user.suspend": { label: "Suspend", color: "destructive" },
  "user.unsuspend": { label: "Unsuspend", color: "default" },
  "system.config": { label: "Config", color: "outline" },
  "admin.login": { label: "Login", color: "outline" },
};

const ACTION_OPTIONS = [
  { value: "all", label: "All actions" },
  { value: "user.plan.change", label: "Plan Change" },
  { value: "user.suspend", label: "Suspend" },
  { value: "user.unsuspend", label: "Unsuspend" },
  { value: "system.config", label: "Config" },
  { value: "admin.login", label: "Login" },
];

export function AuditLogTable({
  entries,
  total,
  page,
  limit,
  actionFilter,
  onPageChange,
  onActionFilter,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={actionFilter} onValueChange={(v) => onActionFilter(v ?? "all")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            {ACTION_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[160px]">Timestamp</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Admin ID</TableHead>
              <TableHead>Target User</TableHead>
              <TableHead>Metadata</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No audit log entries found.
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => {
                const actionInfo = ACTION_LABELS[entry.action] || {
                  label: entry.action,
                  color: "outline" as const,
                };
                return (
                  <TableRow key={entry.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={actionInfo.color}>{actionInfo.label}</Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {entry.adminUserId.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {entry.targetUserId
                        ? `${entry.targetUserId.slice(0, 8)}...`
                        : "—"}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs">
                      {entry.metadata
                        ? JSON.stringify(entry.metadata)
                        : "—"}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({total} entries)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
