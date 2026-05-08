"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useState, useCallback } from "react";
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

type Props = {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onSearch: (query: string) => void;
  onPlanFilter: (plan: string) => void;
  search: string;
  planFilter: string;
};

const PLAN_BADGE_COLORS: Record<string, "default" | "secondary" | "outline"> = {
  FREE: "outline",
  PRO: "secondary",
  BUSINESS: "default",
};

export function UserTable({
  users,
  total,
  page,
  limit,
  onPageChange,
  onSearch,
  onPlanFilter,
  search,
  planFilter,
}: Props) {
  const [searchValue, setSearchValue] = useState(search);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleSearch = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        onSearch(searchValue);
      }
    },
    [searchValue, onSearch],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by email or name..."
            className="pl-8"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={handleSearch}
          />
        </div>
        <Select value={planFilter} onValueChange={(v) => onPlanFilter(v ?? "all")}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="All plans" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All plans</SelectItem>
            <SelectItem value="FREE">Free</SelectItem>
            <SelectItem value="PRO">Pro</SelectItem>
            <SelectItem value="BUSINESS">Business</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Links</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="hover:underline"
                    >
                      <div className="font-medium">{user.name || "Unnamed"}</div>
                      <div className="text-xs text-muted-foreground">
                        {user.email}
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={PLAN_BADGE_COLORS[user.plan] || "outline"}>
                      {user.plan}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.linkCount}</TableCell>
                  <TableCell>
                    {user.deletedAt ? (
                      <Badge variant="outline" className="text-destructive">
                        Suspended
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-emerald-600">
                        Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({total} users)
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
