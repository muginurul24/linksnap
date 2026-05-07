"use client";

import { useState } from "react";
import { CheckCircle2, Copy, Key, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  plan: UserPlan;
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

function canManageApiKeys(plan: UserPlan): boolean {
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

export function ApiKeysPanel({ initialApiKeys, plan }: ApiKeysPanelProps) {
  const [apiKeys, setApiKeys] = useState(initialApiKeys);
  const [createdKey, setCreatedKey] = useState<{
    key: string;
    maskedKey: string;
  } | null>(null);
  const [keyName, setKeyName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
      toast.success("API key revoked.");
    } catch {
      toast.error("Unable to revoke API key.");
    } finally {
      setDeletingId(null);
    }
  }

  if (!canManageApiKeys(plan)) {
    return (
      <div className="rounded-lg border bg-muted/50 p-6 text-center">
        <Key className="mx-auto mb-3 size-8 text-muted-foreground" />
        <p className="text-sm font-medium">Upgrade to Pro to access API keys</p>
        <p className="mt-1 text-xs text-muted-foreground">
          API access is available on Pro and Business plans.
        </p>
        <ButtonLink
          className="mt-4"
          href="/settings/billing?upgrade=api-keys"
          size="sm"
          variant="outline"
        >
          Upgrade Plan
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="api-key-name">
          API key name
        </label>
        <Input
          className="flex-1"
          id="api-key-name"
          maxLength={80}
          onChange={(event) => setKeyName(event.target.value)}
          placeholder="Production integration"
          value={keyName}
        />
        <Button
          disabled={isCreating || keyName.trim().length === 0}
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

      {apiKeys.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <Key className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="text-sm font-medium">No API keys yet</p>
        </div>
      ) : (
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
                    onClick={() => void deleteApiKey(apiKey.id)}
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
      )}
    </div>
  );
}
