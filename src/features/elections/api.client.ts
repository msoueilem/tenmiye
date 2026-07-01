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
      // yes_no / multiple_choice: a flat ranking of options, each with its human label
      rankings?: { optionId: string; voteCount: number; label?: string | null }[];
      // board: an object (or null until finalized), NOT a flat array; candidates carry a resolved name
      results?: { rankings?: { candidateUserId: string; voteCount: number; name?: string | null }[] } | null;
    };
    const electionId = data.electionId ?? data.id ?? id;
    // Board results come back as an object { rankings: [{candidateUserId, voteCount, name}], … }
    // or null before finalization; every other type returns a flat `rankings` array of options.
    // Normalize both into ElectionResults['results'] (with a display label) so the page never
    // calls .reduce on an object and never shows a raw id/UID.
    const results = data.type === 'board'
      ? (data.results?.rankings ?? []).map((r) => ({ selection: r.candidateUserId, count: r.voteCount, label: r.name ?? undefined }))
      : (data.rankings ?? []).map((r) => ({ selection: r.optionId, count: r.voteCount, label: r.label ?? undefined }));
    return { electionId, results };
  } catch {
    return null;
  }
}

export interface TopNominee {
  userId: string;
  nominationCount: number;
  name?: string | null;
}

export async function getTopNominationsApi(id: string): Promise<TopNominee[]> {
  try {
    const res = await fetch(`${config.apiUrl}/elections/${id}/nominations/top`);
    if (!res.ok) return [];
    const data = await res.json() as { nominees?: TopNominee[] };
    return data.nominees ?? [];
  } catch {
    return [];
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
  tokenType: 'admin' | 'member' = 'member',
): Promise<{ ok: boolean; error?: string }> {
  try {
    await apiFetch('PATCH', `/elections/${id}/schedule`, { body: dates, tokenType });
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof ApiError ? e.message : 'حدث خطأ أثناء تحديث المواعيد';
    return { ok: false, error: msg };
  }
}

export async function createElectionApi(data: CreateElectionPayload, tokenType: 'admin' | 'member' = 'member'): Promise<{ id: string } | null> {
  try {
    return await apiFetch<{ id: string }>('POST', '/elections', { body: data, tokenType });
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
  tokenType: 'admin' | 'member' = 'member',
): Promise<{ ok: boolean; error?: string }> {
  try {
    await apiFetch('POST', `/elections/${id}/advance`, {
      body: { status: targetStatus, ...extra },
      tokenType,
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
  tokenType: 'admin' | 'member' = 'member',
): Promise<{ ok: boolean; error?: string }> {
  try {
    await apiFetch('PATCH', `/elections/${id}`, { body: data, tokenType });
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof ApiError ? e.message : 'حدث خطأ أثناء التعديل';
    return { ok: false, error: msg };
  }
}

export async function getMyNominationApi(
  electionId: string,
): Promise<{ submitted: boolean; nominees: string[] }> {
  try {
    return await apiFetch<{ submitted: boolean; nominees: string[] }>('GET', `/elections/${electionId}/nominations/me`, { tokenType: 'member' });
  } catch {
    return { submitted: false, nominees: [] };
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

export async function deleteElectionApi(id: string, tokenType: 'admin' | 'member' = 'member'): Promise<boolean> {
  try {
    await apiFetch('DELETE', `/elections/${id}`, { tokenType });
    return true;
  } catch {
    return false;
  }
}

export async function finalizeElectionApi(id: string, tokenType: 'admin' | 'member' = 'member'): Promise<{ ok: boolean; error?: string }> {
  try {
    await apiFetch('POST', `/elections/${id}/finalize`, { tokenType });
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof ApiError ? e.message : 'حدث خطأ أثناء إعلان النتائج';
    return { ok: false, error: msg };
  }
}
