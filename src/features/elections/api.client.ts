import { config } from '@/lib/config';
import { apiFetch, ApiError } from '@/lib/api';
import { Election, ElectionResults } from '@/types/elections';

export async function getAllElections(): Promise<Election[] | null> {
  try {
    const res = await fetch(`${config.apiUrl}/elections`);
    if (!res.ok) return null;
    return res.json() as Promise<Election[]>;
  } catch {
    return null;
  }
}

export async function getElectionById(id: string): Promise<Election | null> {
  try {
    const res = await fetch(`${config.apiUrl}/elections/${id}`);
    if (!res.ok) return null;
    return res.json() as Promise<Election>;
  } catch {
    return null;
  }
}

export async function getElectionResults(id: string): Promise<ElectionResults | null> {
  try {
    const res = await fetch(`${config.apiUrl}/elections/${id}/results`);
    if (!res.ok) return null;
    return res.json() as Promise<ElectionResults>;
  } catch {
    return null;
  }
}

export async function castVoteApi(
  electionId: string,
  selections: string[],
  _token: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await apiFetch('POST', `/elections/${electionId}/votes`, { body: { selections }, tokenType: 'member' });
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof ApiError ? e.message : 'تعذر الاتصال بالخادم' };
  }
}

export async function getMyVotedElectionIds(_token: string): Promise<Set<string>> {
  try {
    const votes = await apiFetch<Array<{ electionId: string }>>('GET', '/me/votes', { tokenType: 'member' });
    return new Set(votes.map((v) => v.electionId));
  } catch {
    return new Set();
  }
}

export async function checkMyVote(electionId: string, token: string): Promise<boolean> {
  const ids = await getMyVotedElectionIds(token);
  return ids.has(electionId);
}

export async function createElectionApi(
  data: Pick<Election, 'title' | 'description' | 'type' | 'startTime' | 'endTime'>,
): Promise<{ id: string } | null> {
  try {
    return await apiFetch<{ id: string }>('POST', '/elections', { body: data, tokenType: 'admin' });
  } catch {
    return null;
  }
}

export async function updateElectionApi(
  id: string,
  data: Partial<Pick<Election, 'title' | 'description' | 'type' | 'status' | 'startTime' | 'endTime'>>,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await apiFetch('PATCH', `/elections/${id}`, { body: data, tokenType: 'admin' });
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'حدث خطأ أثناء التعديل';
    return { ok: false, error: msg };
  }
}

export async function deleteElectionApi(id: string): Promise<boolean> {
  try {
    await apiFetch('DELETE', `/elections/${id}`, { tokenType: 'admin' });
    return true;
  } catch {
    return false;
  }
}
