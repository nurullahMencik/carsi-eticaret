/** Card helpers for the demo payment form. Card data never leaves the server action. */

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function luhnValid(cardNumber: string): boolean {
  const digits = digitsOnly(cardNumber);
  if (digits.length < 12 || digits.length > 19) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

/** "MM/YY" -> true when the card is valid through the end of that month. */
export function expiryValid(expiry: string, now: Date = new Date()): boolean {
  const m = /^(\d{2})\s*\/\s*(\d{2})$/.exec(expiry.trim());
  if (!m) return false;
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return false;
  const endOfMonth = new Date(Date.UTC(year, month, 1));
  return endOfMonth > now;
}

export function maskCard(cardNumber: string): string {
  const d = digitsOnly(cardNumber);
  return `${d.slice(0, 6)}******${d.slice(-4)}`;
}
