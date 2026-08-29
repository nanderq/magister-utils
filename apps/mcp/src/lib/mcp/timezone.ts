interface ToolRequestContext {
  _meta?: Record<string, unknown>;
  requestInfo?: { headers?: Record<string, string | string[] | undefined> };
}

const ISO_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(Z|[+-]\d{2}:\d{2})?$/i;

export function isValidTimeZone(value: string): boolean {
  if (!value || value.length > 100) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

function stringHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function resolveUserTimeZone(context: ToolRequestContext, requested?: string): string | undefined {
  const location = context._meta?.["openai/userLocation"];
  const locationTimeZone = location && typeof location === "object"
    ? (location as Record<string, unknown>).timezone ?? (location as Record<string, unknown>).timeZone
    : undefined;
  const headers = context.requestInfo?.headers;
  const candidates = [
    requested,
    locationTimeZone,
    context._meta?.timeZone,
    context._meta?.timezone,
    headers ? stringHeader(headers["x-time-zone"]) : undefined,
    headers ? stringHeader(headers["x-timezone"]) : undefined,
  ];

  return candidates.find((candidate): candidate is string =>
    typeof candidate === "string" && isValidTimeZone(candidate)
  );
}

function offsetFor(date: Date, timeZone: string): string {
  const name = new Intl.DateTimeFormat("en", {
    timeZone,
    timeZoneName: "longOffset",
  }).formatToParts(date).find((part) => part.type === "timeZoneName")?.value;
  if (!name || name === "GMT") return "+00:00";
  const match = /^GMT([+-]\d{2}:\d{2})$/.exec(name);
  if (!match) throw new RangeError(`Could not determine the UTC offset for ${timeZone}`);
  return match[1];
}

function offsetMilliseconds(offset: string): number {
  const sign = offset.startsWith("-") ? -1 : 1;
  const [hours, minutes] = offset.slice(1).split(":").map(Number);
  return sign * (hours * 60 + minutes) * 60_000;
}

function formatInstant(date: Date, timeZone: string): string {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
    hourCycle: "h23",
  }).formatToParts(date).map((part) => [part.type, part.value]));

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}.${parts.fractionalSecond}${offsetFor(date, timeZone)}`;
}

export function localizeTimestamp(value: string, timeZone: string): string {
  const match = ISO_DATE_TIME.exec(value);
  if (!match) return value;

  const [, year, month, day, hour, minute, second = "00", fraction = "", sourceOffset] = match;
  const milliseconds = Number(fraction.padEnd(3, "0").slice(0, 3));

  if (sourceOffset) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : formatInstant(date, timeZone);
  }

  // Magister can return local wall-clock values without an offset. Attach the
  // requested zone's offset without changing the displayed local clock time.
  const wallClockUtc = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second), milliseconds);
  const wallClockDate = new Date(wallClockUtc);
  if (
    wallClockDate.getUTCFullYear() !== Number(year)
    || wallClockDate.getUTCMonth() !== Number(month) - 1
    || wallClockDate.getUTCDate() !== Number(day)
  ) return value;

  let offset = offsetFor(wallClockDate, timeZone);
  const instant = new Date(wallClockUtc - offsetMilliseconds(offset));
  offset = offsetFor(instant, timeZone);
  const normalizedFraction = `${milliseconds}`.padStart(3, "0");
  return `${year}-${month}-${day}T${hour}:${minute}:${second}.${normalizedFraction}${offset}`;
}

export function localizeTimestamps<T>(value: T, timeZone: string): T {
  if (typeof value === "string") return localizeTimestamp(value, timeZone) as T;
  if (Array.isArray(value)) return value.map((item) => localizeTimestamps(item, timeZone)) as T;
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key,
    localizeTimestamps(item, timeZone),
  ])) as T;
}
