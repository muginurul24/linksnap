"use client";

import {
  ArrowDown,
  ArrowUp,
  Bot,
  CalendarRange,
  Globe2,
  GripVertical,
  MonitorSmartphone,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlanGate } from "@/components/plan-gate";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CountryCombobox } from "@/components/smart-rules/country-combobox";
import {
  addConditionToRule,
  addRuleToBuilder,
  DEVICE_VALUES,
  getBotConditionValues,
  getBotCustomPatternText,
  getConditionControlKind,
  getReadableRuleSummary,
  getTimeRangeValue,
  moveRule,
  PREDEFINED_BOTS,
  removeConditionFromRule,
  removeRuleFromBuilder,
  RULE_CONDITION_OPERATORS,
  RULE_CONDITION_TYPES,
  setBotCustomPatterns,
  setBotPatternSelection,
  setTimeRangeValue,
  updateConditionType,
  type RuleBuilderValue,
  type RuleConditionOperator,
  type RuleConditionType,
  type RuleConditionValue,
  type SmartRuleBuilderCondition,
  type SmartRuleBuilderRule,
} from "@/lib/rules/rule-builder";
import { cn } from "@/lib/utils";

type RuleBuilderProps = {
  className?: string;
  defaultDestinationUrl?: string;
  disabled?: boolean;
  onChange: (value: RuleBuilderValue) => void;
  quota?: {
    limit: number;
    upgradeMessage: string;
    upgradeUrl: string;
  };
  value: RuleBuilderValue;
};

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30";

function getConditionIcon(type: RuleConditionType) {
  if (type === "country") return <Globe2 className="size-4" />;
  if (type === "device") return <MonitorSmartphone className="size-4" />;
  if (type === "bot") return <Bot className="size-4" />;

  return <CalendarRange className="size-4" />;
}

function getSingleValue(value: RuleConditionValue): string {
  return Array.isArray(value) ? value[0] ?? "" : value;
}

function ConditionValueControl({
  condition,
  disabled,
  onChange,
}: {
  condition: SmartRuleBuilderCondition;
  disabled: boolean;
  onChange: (condition: SmartRuleBuilderCondition) => void;
}) {
  const controlKind = getConditionControlKind(condition.type);

  if (controlKind === "country-combobox") {
    return (
      <CountryCombobox
        value={getSingleValue(condition.value)}
        onValueChange={(countryCode) => onChange({ ...condition, value: countryCode })}
        disabled={disabled}
      />
    );
  }

  if (controlKind === "device-select") {
    return (
      <select
        className={selectClassName}
        value={getSingleValue(condition.value)}
        onChange={(event) => onChange({ ...condition, value: event.target.value })}
        disabled={disabled}
      >
        {DEVICE_VALUES.map((device) => (
          <option key={device} value={device}>
            {device[0].toUpperCase()}
            {device.slice(1)}
          </option>
        ))}
      </select>
    );
  }

  if (controlKind === "time-range") {
    const [start, end] = getTimeRangeValue(condition);
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          type="datetime-local"
          value={start}
          onChange={(event) =>
            onChange(setTimeRangeValue(condition, "start", event.target.value))
          }
          disabled={disabled}
          aria-label="Start date"
        />
        <Input
          type="datetime-local"
          value={end}
          onChange={(event) =>
            onChange(setTimeRangeValue(condition, "end", event.target.value))
          }
          disabled={disabled}
          aria-label="End date"
        />
      </div>
    );
  }

  const selectedBots = getBotConditionValues(condition);

  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {PREDEFINED_BOTS.map((bot) => (
          <label
            key={bot}
            className="flex min-h-8 items-center gap-2 rounded-lg border border-border px-2 text-sm"
          >
            <input
              type="checkbox"
              checked={selectedBots.includes(bot)}
              onChange={(event) =>
                onChange(setBotPatternSelection(condition, bot, event.target.checked))
              }
              disabled={disabled}
              className="size-3.5"
            />
            <span className="truncate">{bot}</span>
          </label>
        ))}
      </div>
      <Input
        value={getBotCustomPatternText(condition)}
        onChange={(event) => onChange(setBotCustomPatterns(condition, event.target.value))}
        disabled={disabled}
        placeholder="Custom patterns, comma-separated"
      />
    </div>
  );
}

function RuleConditionRow({
  condition,
  disabled,
  onChange,
  onRemove,
  removable,
}: {
  condition: SmartRuleBuilderCondition;
  disabled: boolean;
  onChange: (condition: SmartRuleBuilderCondition) => void;
  onRemove: () => void;
  removable: boolean;
}) {
  return (
    <div className="grid gap-2 rounded-lg border border-border bg-muted/20 p-2 lg:grid-cols-[160px_120px_minmax(0,1fr)_32px]">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{getConditionIcon(condition.type)}</span>
        <select
          className={selectClassName}
          value={condition.type}
          onChange={(event) =>
            onChange(
              updateConditionType(condition, event.target.value as RuleConditionType),
            )
          }
          disabled={disabled}
          aria-label="Condition type"
        >
          {RULE_CONDITION_TYPES.map((type) => (
            <option key={type} value={type}>
              {type[0].toUpperCase()}
              {type.slice(1)}
            </option>
          ))}
        </select>
      </div>
      <select
        className={selectClassName}
        value={condition.operator}
        onChange={(event) =>
          onChange({
            ...condition,
            operator: event.target.value as RuleConditionOperator,
          })
        }
        disabled={disabled}
        aria-label="Condition operator"
      >
        {RULE_CONDITION_OPERATORS.map((operator) => (
          <option key={operator} value={operator}>
            {operator === "is" ? "is" : "is not"}
          </option>
        ))}
      </select>
      <ConditionValueControl
        condition={condition}
        disabled={disabled}
        onChange={onChange}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        disabled={disabled || !removable}
        aria-label="Remove condition"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}

function updateRuleCondition(
  rule: SmartRuleBuilderRule,
  condition: SmartRuleBuilderCondition,
): SmartRuleBuilderRule {
  return {
    ...rule,
    conditions: rule.conditions.map((item) =>
      item.id === condition.id ? condition : item,
    ),
  };
}

export function RuleBuilder({
  className,
  defaultDestinationUrl,
  disabled = false,
  onChange,
  quota,
  value,
}: RuleBuilderProps) {
  const updateRule = (nextRule: SmartRuleBuilderRule) => {
    onChange({
      ...value,
      rules: value.rules.map((rule) => (rule.id === nextRule.id ? nextRule : rule)),
    });
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-3">
        {value.rules.map((rule, index) => (
          <div key={rule.id} className="space-y-3 rounded-lg border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <GripVertical className="size-4 text-muted-foreground" />
                <p className="font-medium">Rule #{index + 1}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() =>
                    onChange({ ...value, rules: moveRule(value.rules, rule.id, "up") })
                  }
                  disabled={disabled || index === 0}
                  aria-label="Move rule up"
                >
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() =>
                    onChange({
                      ...value,
                      rules: moveRule(value.rules, rule.id, "down"),
                    })
                  }
                  disabled={disabled || index === value.rules.length - 1}
                  aria-label="Move rule down"
                >
                  <ArrowDown className="size-4" />
                </Button>
                <Label
                  htmlFor={`${rule.id}-active`}
                  className="text-sm text-muted-foreground"
                >
                  Active
                </Label>
                <Switch
                  id={`${rule.id}-active`}
                  checked={rule.isActive}
                  onCheckedChange={(isActive) => updateRule({ ...rule, isActive })}
                  disabled={disabled}
                />
              </div>
            </div>

            <div className="space-y-2">
              {rule.conditions.map((condition) => (
                <RuleConditionRow
                  key={condition.id}
                  condition={condition}
                  disabled={disabled}
                  removable={rule.conditions.length > 1}
                  onChange={(nextCondition) =>
                    updateRule(updateRuleCondition(rule, nextCondition))
                  }
                  onRemove={() =>
                    updateRule(removeConditionFromRule(rule, condition.id))
                  }
                />
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => updateRule(addConditionToRule(rule))}
                disabled={disabled}
              >
                <Plus className="size-4" />
                Add condition
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => onChange(removeRuleFromBuilder(value, rule.id))}
                disabled={disabled || value.rules.length === 1}
              >
                <Trash2 className="size-4" />
                Delete rule
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`${rule.id}-destination`}>Redirect to</Label>
              <Input
                id={`${rule.id}-destination`}
                type="url"
                inputMode="url"
                value={rule.destinationUrl}
                onChange={(event) =>
                  updateRule({ ...rule, destinationUrl: event.target.value })
                }
                placeholder="https://example.com/campaign"
                disabled={disabled}
              />
            </div>

            <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              {getReadableRuleSummary(rule)}
            </p>
          </div>
        ))}
      </div>

      <PlanGate.Quota
        limit={quota?.limit ?? Number.POSITIVE_INFINITY}
        used={quota ? value.rules.length : 0}
        upgradeMessage={quota?.upgradeMessage ?? ""}
        upgradeUrl={quota?.upgradeUrl ?? "#"}
      >
        <Button
          type="button"
          variant="outline"
          onClick={() => onChange(addRuleToBuilder(value))}
          disabled={disabled}
        >
          <Plus className="size-4" />
          Add rule
        </Button>
      </PlanGate.Quota>

      <div className="space-y-1.5 rounded-lg border border-border p-3">
        <Label htmlFor="smartRulesFallbackDestination">Default destination</Label>
        <Input
          id="smartRulesFallbackDestination"
          type="url"
          inputMode="url"
          value={value.fallbackDestinationUrl}
          onChange={(event) =>
            onChange({ ...value, fallbackDestinationUrl: event.target.value })
          }
          placeholder={defaultDestinationUrl || "https://example.com/fallback"}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
