import { apiFetch } from '@/lib/api';
import type { Board, CreateBoardDto, UpdateBoardDto } from '@/types/boards';

export async function getBoards(): Promise<Board[]> {
  return apiFetch<Board[]>('GET', '/boards');
}

export async function getBoard(id: string): Promise<Board> {
  return apiFetch<Board>('GET', `/boards/${id}`);
}

export async function createBoard(dto: CreateBoardDto): Promise<Board> {
  return apiFetch<Board>('POST', '/boards', { body: dto, tokenType: 'member' });
}

export async function updateBoard(id: string, dto: UpdateBoardDto): Promise<Board> {
  return apiFetch<Board>('PATCH', `/boards/${id}`, { body: dto, tokenType: 'member' });
}

export async function deleteBoard(id: string): Promise<void> {
  return apiFetch<void>('DELETE', `/boards/${id}`, { tokenType: 'admin' });
}
