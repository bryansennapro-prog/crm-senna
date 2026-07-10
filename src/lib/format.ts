// =============================================================================
// Formatação e helpers de data/moeda. Sistema usa apenas BRL (premissas 4 e 5).
// =============================================================================

const pad = (n: number) => String(n).padStart(2, "0");

/** Converte string do banco em Date local, tratando datas puras (YYYY-MM-DD). */
function parseToDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** R$ 1.234,56 — sempre BRL. */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/** 20/06/2026 */
export function formatDate(value: string | null | undefined): string {
  const d = parseToDate(value);
  if (!d) return "—";
  return new Intl.DateTimeFormat("pt-BR").format(d);
}

/** 20/06/2026 14:30 */
export function formatDateTime(value: string | null | undefined): string {
  const d = parseToDate(value);
  if (!d) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

/** Data de hoje no formato 'YYYY-MM-DD' (horário local). */
export function todayISODate(): string {
  return toISODate(new Date());
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 'YYYY-MM-DD' deslocado em N dias a partir de hoje (ou de `from`). */
export function addDaysISODate(days: number, from = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + days);
  return toISODate(d);
}

/** Limites ISO do dia local (início e início do dia seguinte). */
export function localDayBoundsISO(date = new Date()): { start: string; end: string } {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

/** Dias entre hoje e a data informada (negativo = no passado). */
export function daysUntil(value: string | null | undefined): number | null {
  const d = parseToDate(value);
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/** Valor para <input type="datetime-local"> (local). */
export function toDatetimeLocalValue(iso: string | null | undefined): string {
  const d = iso ? new Date(iso) : new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

/** Converte o valor de <input type="datetime-local"> para ISO (UTC). */
export function fromDatetimeLocalValue(value: string): string {
  return new Date(value).toISOString();
}
