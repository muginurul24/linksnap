"use client";

import {
  createContext,
  createElement,
  useContext,
  type ReactNode,
} from "react";
import type { UserPlan } from "@/lib/links/limits";

const PlanContext = createContext<UserPlan | null>(null);

export function PlanProvider({
  children,
  userPlan,
}: {
  children: ReactNode;
  userPlan: UserPlan;
}) {
  return createElement(PlanContext.Provider, { value: userPlan }, children);
}

export function usePlan(): UserPlan {
  const userPlan = useContext(PlanContext);

  if (!userPlan) {
    throw new Error("usePlan must be used within PlanProvider.");
  }

  return userPlan;
}
