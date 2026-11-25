/** Indian financial year (April to March), formatted like "2026-27". */
export function financialYear(date: Date): string {
  const year = date.getFullYear();
  const start = date.getMonth() >= 3 ? year : year - 1;
  const end = String((start + 1) % 100).padStart(2, '0');
  return `${start}-${end}`;
}
