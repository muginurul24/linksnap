const SLUG_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const DEFAULT_SLUG_LENGTH = 7;

export function generateRandomSlug(length = DEFAULT_SLUG_LENGTH): string {
  return Array.from({ length }, () => {
    const index = crypto.getRandomValues(new Uint32Array(1))[0] % SLUG_ALPHABET.length;
    return SLUG_ALPHABET[index];
  }).join("");
}
