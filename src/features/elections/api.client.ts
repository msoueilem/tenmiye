import { config } from '@/lib/config';
import { apiFetch } from '@/lib/api';
import { memberFetch, parseApiError } from '@/lib/memberApi';
import { BackendElection, ElectionResults } from '@/types/elections';

export async function getAllElections(): Promise<BackendElection[] | null> {
  try {
    const res = await fetch(`${config.apiUrl}/elections`);
    if (!res.ok) return null;
    return res.json() as Promise<BackendElection[]>;
  } catch {
    return null;
  }
}

export async function getElectionById(id: string): Promise<BackendElection | null> {
  try {
    const res = await fetch(`${config.apiUrl}/elections/${id}`);
    if (!res.ok) return null;
    return res.json() as Promise<BackendElection>;
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
  token: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await memberFetch(`/elections/${electionId}/votes`, token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selections }),
    });
    if (!res.ok) {
      return { ok: false, error: await parseApiError(res, 'حدث خطأ أثناء التصويت') };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'تعذر الاتصال بالخادم' };
  }
}

export async function getMyVotedElectionIds(token: string): Promise<Set<string>> {
  try {
    const res = await memberFetch('/me/votes', token);
    if (!res.ok) return new Set();
    const votes = (await res.json()) as Array<{ electionId: string }>;
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
  data: Pick<BackendElection, 'title' | 'description' | 'type' | 'startTime' | 'endTime'>,
): Promise<{ id: string } | null> {
  try {
    return await apiFetch<{ id: string }>('POST', '/elections', { body: data, tokenType: 'admin' });
  } catch {
    return null;
  }
}

export async function updateElectionApi(
  id: string,
  data: Partial<Pick<BackendElection, 'title' | 'description' | 'type' | 'status' | 'startTime' | 'endTime'>>,
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
