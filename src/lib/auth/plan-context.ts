"use client";

import {
  createContext,
  createElement,
  useContext,
  type ReactNode,
} from "react";
import type { UserPlan } from "@/lib/links/limits";

type PlanContextValue = {
  userPlan: UserPlan;
  role: string | null;
};

const PlanContext = createContext<PlanContextValue | null>(null);

export function PlanProvider({
  children,
  userPlan,
  role = null,
}: {
  children: ReactNode;
  userPlan: UserPlan;
  role?: string | null;
}) {
  return createElement(
    PlanContext.Provider,
    { value: { userPlan, role } },
    children,
  );
}

export function usePlan(): UserPlan {
  const context = useContext(PlanContext);

  if (!context) {
    throw new Error("usePlan must be used within PlanProvider.");
  }

  return context.userPlan;
}

export function useUserRole(): string | null {
  const context = useContext(PlanContext);

  if (!context) {
    throw new Error("useUserRole must be used within PlanProvider.");
  }

  return context.role;
}
