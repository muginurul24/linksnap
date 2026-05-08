"use client";

import { useState } from "react";
import { CheckCircle2, Copy, Key, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PlanGate } from "@/components/plan-gate";
import { isSuperAdmin } from "@/lib/auth/superadmin-utils";
import { Badge } from "@/components/ui/badge";
import { DeleteConfirmationDialog } from "@/components/dashboard/delete-confirmation-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePlan, useUserRole } from "@/lib/auth/plan-context";
import type { UserPlan } from "@/lib/links/limits";

export type ApiKeyPanelItem = {
  createdAt: string;
  id: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  name: string;
};

type ApiKeysPanelProps = {
  initialApiKeys: ApiKeyPanelItem[];
};

type ApiKeyCreateResponse =
  | {
      data: {
        apiKey: ApiKeyPanelItem;
        key: string;
        maskedKey: string;
      };
      success: true;
    }
  | {
      error: {
        message: string;
      };
      success: false;
    };

type ApiKeyDeleteResponse =
  | {
      data: {
        deleted: true;
        id: string;
      };
      success: true;
    }
  | {
      error: {
        message: string;
      };
      success: false;
    };

function canManageApiKeys(plan: UserPlan, role?: string | null): boolean {
  if (isSuperAdmin(role)) return true;
  return plan === "PRO" || plan === "BUSINESS";
}

function formatDateTime(value: string | null): string {
  if (!value) return "Never";

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

async function copyToClipboard(value: string): Promise<void> {
  await navigator.clipboard.writeText(value);
  toast.success("Copied.");
}

export function ApiKeysPanel({ initialApiKeys }: ApiKeysPanelProps) {
  const plan = usePlan();
  const role = useUserRole();
  const [apiKeys, setApiKeys] = useState(initialApiKeys);
  const [createdKey, setCreatedKey] = useState<{
    key: string;
    maskedKey: string;
  } | null>(null);
  const [keyName, setKeyName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [apiKeyToDelete, setApiKeyToDelete] = useState<ApiKeyPanelItem | null>(
    null,
  );

  async function createApiKey() {
    setIsCreating(true);

    try {
      const response = await fetch("/api/v1/settings/api-keys", {
        body: JSON.stringify({ name: keyName }),
        headers: {
          "content-type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        method: "POST",
      });
      const body = (await response.json()) as ApiKeyCreateResponse;

      if (!body.success) {
        toast.error(body.error.message);
        return;
      }

      setApiKeys((current) => [body.data.apiKey, ...current]);
      setCreatedKey({
        key: body.data.key,
        maskedKey: body.data.maskedKey,
      });
      setKeyName("");
      toast.success("API key created.");
    } catch {
      toast.error("Unable to create API key.");
    } finally {
      setIsCreating(false);
    }
  }

  async function deleteApiKey(id: string) {
    setDeletingId(id);

    try {
      const response = await fetch(`/api/v1/settings/api-keys/${id}`, {
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
        method: "DELETE",
      });
      const body = (await response.json()) as ApiKeyDeleteResponse;

      if (!body.success) {
        toast.error(body.error.message);
        return;
      }

      setApiKeys((current) => current.filter((apiKey) => apiKey.id !== id));
      setApiKeyToDelete(null);
      toast.success("API key revoked.");
    } catch {
      toast.error("Unable to revoke API key.");
    } finally {
      setDeletingId(null);
    }
  }

  const canCreateApiKeys = canManageApiKeys(plan, role);

  return (
    <div className="space-y-4">
      <PlanGate
        allowed={canCreateApiKeys}
        upgradeMessage="API key access requires Pro or Business plan."
        upgradeUrl="/settings/billing?upgrade=api-keys"
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor="api-key-name">
            API key name
          </label>
          <Input
            className="flex-1"
            disabled={!canCreateApiKeys}
            id="api-key-name"
            maxLength={80}
            onChange={(event) => setKeyName(event.target.value)}
            placeholder="Production integration"
            value={keyName}
          />
          <Button
            disabled={
              !canCreateApiKeys || isCreating || keyName.trim().length === 0
            }
            onClick={() => void createApiKey()}
            size="sm"
            type="button"
          >
            {isCreating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Create Key
          </Button>
        </div>
      </PlanGate>

      {createdKey ? (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 className="size-4 text-primary" />
            New API key
          </div>
          <div className="flex flex-col gap-2 rounded-md bg-background p-2 sm:flex-row sm:items-center sm:justify-between">
            <code className="break-all font-mono text-xs">{createdKey.maskedKey}</code>
            <Button
              onClick={() => void copyToClipboard(createdKey.key)}
              size="sm"
              type="button"
              variant="outline"
            >
              <Copy className="size-4" />
              Copy Key
            </Button>
          </div>
        </div>
      ) : null}

      {canCreateApiKeys && apiKeys.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <Key className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="text-sm font-medium">No API keys yet</p>
        </div>
      ) : null}

      {apiKeys.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Prefix</TableHead>
              <TableHead>Last used</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-12 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {apiKeys.map((apiKey) => (
              <TableRow key={apiKey.id}>
                <TableCell className="font-medium">{apiKey.name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono">
                    {apiKey.keyPrefix}...
                  </Badge>
                </TableCell>
                <TableCell>{formatDateTime(apiKey.lastUsedAt)}</TableCell>
                <TableCell>{formatDateTime(apiKey.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    aria-label={`Revoke ${apiKey.name}`}
                    disabled={deletingId === apiKey.id}
                    onClick={() => setApiKeyToDelete(apiKey)}
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                  >
                    {deletingId === apiKey.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
      <DeleteConfirmationDialog
        isDeleting={apiKeyToDelete ? deletingId === apiKeyToDelete.id : false}
        name={apiKeyToDelete?.name ?? "this API key"}
        onConfirm={() => {
          if (apiKeyToDelete) void deleteApiKey(apiKeyToDelete.id);
        }}
        onOpenChange={(open) => {
          if (!open) setApiKeyToDelete(null);
        }}
        open={apiKeyToDelete !== null}
      />
    </div>
  );
}
