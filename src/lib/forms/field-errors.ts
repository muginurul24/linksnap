export type FieldErrors<Field extends string> = Partial<Record<Field, string>>;

type FlattenableFieldError<Field extends string> = {
  flatten: () => {
    fieldErrors: Partial<Record<Field, string[] | undefined>>;
  };
};

type SafeParseLike<Field extends string> =
  | { success: true }
  | { error: FlattenableFieldError<Field>; success: false };

export function firstFieldErrors<Field extends string>(
  errors: Partial<Record<Field, string[] | undefined>>,
): FieldErrors<Field> {
  const nextErrors: FieldErrors<Field> = {};

  for (const field of Object.keys(errors) as Field[]) {
    nextErrors[field] = errors[field]?.[0];
  }

  return nextErrors;
}

export function fieldErrorFromParseResult<Field extends string>(
  result: SafeParseLike<Field>,
  field: Field,
): string | undefined {
  if (result.success) return undefined;

  return firstFieldErrors(result.error.flatten().fieldErrors)[field];
}

export function clearFieldError<Field extends string>(
  errors: FieldErrors<Field>,
  field: Field,
): FieldErrors<Field> {
  if (errors[field] === undefined) return errors;

  return { ...errors, [field]: undefined };
}
