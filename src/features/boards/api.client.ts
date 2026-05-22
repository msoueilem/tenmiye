import { apiFetch } from '@/lib/api';
import type { Board, CreateBoardDto, UpdateBoardDto } from '@/types/boards';

export async function getBoards(tokenType: 'admin' | 'member' = 'member'): Promise<Board[]> {
  return apiFetch<Board[]>('GET', '/boards', { tokenType });
}

export async function getBoard(id: string, tokenType: 'admin' | 'member' = 'member'): Promise<Board> {
  return apiFetch<Board>('GET', `/boards/${id}`, { tokenType });
}

export async function createBoard(dto: CreateBoardDto, tokenType: 'admin' | 'member' = 'member'): Promise<Board> {
  return apiFetch<Board>('POST', '/boards', { body: dto, tokenType });
}

export async function updateBoard(id: string, dto: UpdateBoardDto, tokenType: 'admin' | 'member' = 'member'): Promise<Board> {
  return apiFetch<Board>('PATCH', `/boards/${id}`, { body: dto, tokenType });
}

export async function deleteBoard(id: string, tokenType: 'admin' | 'member' = 'admin'): Promise<void> {
  return apiFetch<void>('DELETE', `/boards/${id}`, { tokenType });
}
