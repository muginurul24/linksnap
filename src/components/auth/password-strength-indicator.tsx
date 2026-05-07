import {
  getPasswordStrength,
  getPasswordStrengthClassName,
} from "@/lib/auth/password-strength";
import { cn } from "@/lib/utils";

type PasswordStrengthIndicatorProps = {
  password: string;
};

export function PasswordStrengthIndicator({
  password,
}: PasswordStrengthIndicatorProps) {
  const strength = getPasswordStrength(password);
  if (!strength) return null;

  return (
    <p
      aria-live="polite"
      className={cn("text-xs font-medium", getPasswordStrengthClassName(strength))}
    >
      Password strength: {strength}
    </p>
  );
}
