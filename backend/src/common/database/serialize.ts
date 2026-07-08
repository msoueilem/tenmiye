/**
 * Normalizes a Mongoose lean document for API responses:
 * renames `_id` -> `id` (as a string), drops the internal `__v`, and keeps
 * `id` first for a stable response shape. Dates are left as `Date` and
 * serialize to ISO strings via `JSON.stringify` automatically.
 */
export function serialize<T extends { _id: unknown }>(doc: T): Record<string, unknown> {
  const out: Record<string, unknown> = { id: String(doc._id) };
  for (const [key, value] of Object.entries(doc as Record<string, unknown>)) {
    if (key === '_id' || key === '__v') continue;
    out[key] = value;
  }
  return out;
}
