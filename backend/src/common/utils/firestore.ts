import { Timestamp } from 'firebase-admin/firestore';

export function serializeDoc(data: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!data) return {};
  return Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, v instanceof Timestamp ? v.toDate().toISOString() : v]),
  );
}
