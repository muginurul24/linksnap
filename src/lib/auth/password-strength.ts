export type PasswordStrength = "Weak" | "Fair" | "Strong";

export function getPasswordStrength(password: string): PasswordStrength | null {
  if (!password) return null;

  const checks = [
    password.length >= 8,
    password.length >= 12,
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;

  if (score <= 3) return "Weak";
  if (score <= 5) return "Fair";
  return "Strong";
}

export function getPasswordStrengthClassName(
  strength: PasswordStrength,
): string {
  const classNames: Record<PasswordStrength, string> = {
    Fair: "text-amber-600 dark:text-amber-400",
    Strong: "text-emerald-600 dark:text-emerald-400",
    Weak: "text-destructive",
  };

  return classNames[strength];
}
