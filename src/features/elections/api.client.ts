import { config } from '@/lib/config';
import { apiFetch, ApiError } from '@/lib/api';
import { Election, ElectionResults, ElectionOption } from '@/types/elections';

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
    const data = await res.json() as {
      id?: string;
      electionId?: string;
      type?: string;
      rankings?: { optionId: string; voteCount: number }[];
      results?: { selection: string; count: number }[];
    };
    const electionId = data.electionId ?? data.id ?? id;
    const results = data.results ?? (data.rankings ?? []).map((r) => ({
      selection: r.optionId,
      count: r.voteCount,
    }));
    return { electionId, results };
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
    await apiFetch('POST', `/elections/${electionId}/votes`, { body: { choices: selections }, tokenType: 'member' });
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

interface CreateElectionPayload {
  title: string;
  description?: string;
  type: 'yes_no' | 'multiple_choice' | 'board';
  options?: ElectionOption[];
  boardConfig?: { seatsCount: number };
  startTime?: string;
  endTime?: string;
  nominationStart?: string;
  nominationEnd?: string;
  dismissalStart?: string;
  dismissalEnd?: string;
  votingStart?: string;
  votingEnd?: string;
}

export async function updateScheduleApi(
  id: string,
  dates: Partial<Pick<CreateElectionPayload, 'nominationStart' | 'nominationEnd' | 'dismissalStart' | 'dismissalEnd' | 'votingStart' | 'votingEnd' | 'startTime' | 'endTime'>>,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await apiFetch('PATCH', `/elections/${id}/schedule`, { body: dates, tokenType: 'member' });
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof ApiError ? e.message : 'حدث خطأ أثناء تحديث المواعيد';
    return { ok: false, error: msg };
  }
}

export async function createElectionApi(data: CreateElectionPayload): Promise<{ id: string } | null> {
  try {
    return await apiFetch<{ id: string }>('POST', '/elections', { body: data, tokenType: 'member' });
  } catch {
    return null;
  }
}

export interface AdvanceExtra {
  nominationStart?: string;
  nominationEnd?: string;
  dismissalStart?: string;
  dismissalEnd?: string;
  votingStart?: string;
  votingEnd?: string;
  reason?: string;
}

export async function advanceElectionApi(
  id: string,
  targetStatus: 'nomination' | 'dismissal' | 'voting' | 'completed' | 'cancelled',
  extra?: AdvanceExtra,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await apiFetch('POST', `/elections/${id}/advance`, {
      body: { status: targetStatus, ...extra },
      tokenType: 'member',
    });
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof ApiError ? e.message : 'حدث خطأ أثناء تحديث حالة الانتخابات';
    return { ok: false, error: msg };
  }
}

export async function updateElectionApi(
  id: string,
  data: Partial<Pick<Election, 'title' | 'description' | 'type'>>,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await apiFetch('PATCH', `/elections/${id}`, { body: data, tokenType: 'member' });
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof ApiError ? e.message : 'حدث خطأ أثناء التعديل';
    return { ok: false, error: msg };
  }
}

export async function submitNominationsApi(
  electionId: string,
  nominees: string[],
): Promise<{ ok: boolean; error?: string }> {
  try {
    await apiFetch('POST', `/elections/${electionId}/nominations`, { body: { nominees }, tokenType: 'member' });
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof ApiError ? e.message : 'تعذر الاتصال بالخادم' };
  }
}

export async function dismissSelfApi(
  electionId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await apiFetch('DELETE', `/elections/${electionId}/nominations/me`, { tokenType: 'member' });
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof ApiError ? e.message : 'تعذر الاتصال بالخادم' };
  }
}

export async function deleteElectionApi(id: string): Promise<boolean> {
  try {
    await apiFetch('DELETE', `/elections/${id}`, { tokenType: 'member' });
    return true;
  } catch {
    return false;
  }
}
