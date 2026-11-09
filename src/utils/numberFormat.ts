/**
 * Utilities for Vietnamese standard number formatting.
 * Uses dot (.) as thousand separator (e.g., 11632 -> 11.632).
 */

/**
 * Formats a number with Vietnamese dot separators for thousands.
 * @example formatVNNumber(11632) => "11.632"
 * @example formatVNNumber(2076) => "2.076"
 * @example formatVNNumber(0) => "0"
 */
export function formatVNNumber(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === "") return "0";
  if (typeof val === "number") {
    return val.toLocaleString("vi-VN");
  }
  const cleanStr = String(val).trim();
  const num = Number(cleanStr.replace(/\./g, "").replace(/,/g, "."));
  if (isNaN(num)) return cleanStr;
  return num.toLocaleString("vi-VN");
}

/**
 * Automatically formats any raw integer with 4 or more digits inside a text or label.
 * Leaves dates (18/07/2026), laws (80/2021), codes, and phone numbers (starts with 0) intact.
 * @example formatTextNumbers("11632 người") => "11.632 người"
 * @example formatTextNumbers("2076 công dân") => "2.076 công dân"
 * @example formatTextNumbers("Quy mô 11632 nhân khẩu") => "Quy mô 11.632 nhân khẩu"
 */
export function formatTextNumbers(text: string): string {
  if (!text || typeof text !== "string") return text;
  return text.replace(/(?<![\/\-\w])\d{4,}(?![\/\-\w])/g, (match) => {
    // If it starts with 0 and has multiple digits, it's a phone number or citizen CCCD/ID
    if (match.startsWith("0") && match.length > 1) return match;
    const n = Number(match);
    return isNaN(n) ? match : n.toLocaleString("vi-VN");
  });
}

export default formatVNNumber;
