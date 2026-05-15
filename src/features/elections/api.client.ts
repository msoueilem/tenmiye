import { config } from '@/lib/config';
import { memberFetch } from '@/lib/memberApi';
import { BackendElection, ElectionResults } from '@/types/elections';

export async function getAllElections(): Promise<BackendElection[]> {
  try {
    const res = await fetch(`${config.apiUrl}/elections`);
    if (!res.ok) return [];
    return res.json() as Promise<BackendElection[]>;
  } catch {
    return [];
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
      const json = await res.json().catch(() => ({})) as { message?: string };
      return { ok: false, error: json.message ?? 'حدث خطأ أثناء التصويت' };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'تعذر الاتصال بالخادم' };
  }
}

export async function checkMyVote(electionId: string, token: string): Promise<boolean> {
  try {
    const res = await memberFetch('/me/votes', token);
    if (!res.ok) return false;
    const votes = (await res.json()) as Array<{ electionId: string }>;
    return votes.some((v) => v.electionId === electionId);
  } catch {
    return false;
  }
}

export async function createElectionApi(
  data: Pick<BackendElection, 'title' | 'description' | 'type' | 'startTime' | 'endTime'>,
  token: string,
): Promise<{ id: string } | null> {
  try {
    const res = await memberFetch('/elections', token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) return null;
    return res.json() as Promise<{ id: string }>;
  } catch {
    return null;
  }
}

export async function updateElectionApi(
  id: string,
  data: Partial<Pick<BackendElection, 'title' | 'description' | 'type' | 'status' | 'startTime' | 'endTime'>>,
  token: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await memberFetch(`/elections/${id}`, token, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({})) as { message?: string };
      return { ok: false, error: json.message };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'تعذر الاتصال بالخادم' };
  }
}

export async function deleteElectionApi(id: string, token: string): Promise<boolean> {
  try {
    const res = await memberFetch(`/elections/${id}`, token, { method: 'DELETE' });
    return res.ok;
  } catch {
    return false;
  }
}
