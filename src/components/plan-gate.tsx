import Link from "next/link";
import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { ArrowRight, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

type DisableableProps = {
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  onChange?: unknown;
  onCheckedChange?: unknown;
  onClick?: unknown;
  type?: string;
  value?: unknown;
  checked?: unknown;
  defaultChecked?: unknown;
  defaultValue?: unknown;
  href?: unknown;
  tabIndex?: number;
  "aria-disabled"?: boolean;
};

type PlanGateProps = {
  allowed: boolean;
  children: ReactNode;
  className?: string;
  upgradeMessage: string;
  upgradeUrl: string;
};

type PlanGateQuotaProps = Omit<PlanGateProps, "allowed"> & {
  limit: number;
  used: number;
};

const disabledNativeElements = new Set([
  "button",
  "fieldset",
  "input",
  "optgroup",
  "option",
  "select",
  "textarea",
]);

function isLikelyInteractiveCustomElement(props: DisableableProps): boolean {
  return (
    "disabled" in props ||
    "onChange" in props ||
    "onCheckedChange" in props ||
    "onClick" in props ||
    "value" in props ||
    "checked" in props ||
    "defaultChecked" in props ||
    "defaultValue" in props ||
    "href" in props ||
    "name" in props ||
    Boolean(props.type) ||
    Boolean(props.id)
  );
}

function shouldApplyDisabled(element: ReactElement<DisableableProps>): boolean {
  if (typeof element.type === "string") {
    return disabledNativeElements.has(element.type);
  }

  return isLikelyInteractiveCustomElement(element.props);
}

function disableInteractiveChildren(children: ReactNode): ReactNode {
  return Children.map(children, (child) => {
    if (!isValidElement<DisableableProps>(child)) return child;

    const childProps = child.props;
    const nextChildren = childProps.children
      ? disableInteractiveChildren(childProps.children)
      : childProps.children;
    const disabledProps = shouldApplyDisabled(child)
      ? {
          "aria-disabled": true,
          disabled: true,
          tabIndex: -1,
        }
      : {};

    return cloneElement(child, {
      ...disabledProps,
      children: nextChildren,
    });
  });
}

function PlanGateRoot({
  allowed,
  children,
  className,
  upgradeMessage,
  upgradeUrl,
}: PlanGateProps) {
  if (allowed) return <>{children}</>;

  return (
    <fieldset
      aria-disabled="true"
      className={cn(
        "group space-y-2 rounded-lg border border-dashed border-border bg-muted/25 p-3",
        className,
      )}
      data-disabled="true"
      data-plan-gate-state="locked"
      disabled
    >
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Lock className="size-4" aria-hidden="true" />
        <span>Plan upgrade required</span>
      </div>
      <div className="pointer-events-none opacity-60">
        {disableInteractiveChildren(children)}
      </div>
      <div className="space-y-1 text-sm text-muted-foreground">
        <p>{upgradeMessage}</p>
        <Link
          className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          href={upgradeUrl}
        >
          Upgrade
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
    </fieldset>
  );
}

function PlanGateQuota({ limit, used, ...props }: PlanGateQuotaProps) {
  const allowed = used < limit;

  if (allowed) return <PlanGateRoot {...props} allowed />;

  return (
    <PlanGateRoot {...props} allowed={false}>
      {props.children}
      <p className="text-xs text-muted-foreground">Quota: {used}/{limit}</p>
    </PlanGateRoot>
  );
}

PlanGateRoot.displayName = "PlanGate";
PlanGateQuota.displayName = "PlanGate.Quota";

export const PlanGate = Object.assign(PlanGateRoot, {
  Quota: PlanGateQuota,
});
