import { apiFetch } from '@/lib/api';
import type { BlogPost, CreateBlogDto, UpdateBlogDto, BlogStatus } from '@/types/blog';

export async function getPublishedBlogs(): Promise<BlogPost[]> {
  return apiFetch<BlogPost[]>('GET', '/blog');
}

export async function getAllBlogs(): Promise<BlogPost[]> {
  return apiFetch<BlogPost[]>('GET', '/blog/all', { tokenType: 'member' });
}

export async function getBlog(id: string): Promise<BlogPost> {
  return apiFetch<BlogPost>('GET', `/blog/${id}`);
}

export async function createBlog(dto: CreateBlogDto): Promise<BlogPost> {
  return apiFetch<BlogPost>('POST', '/blog', { body: dto, tokenType: 'member' });
}

export async function updateBlog(id: string, dto: UpdateBlogDto): Promise<BlogPost> {
  return apiFetch<BlogPost>('PATCH', `/blog/${id}`, { body: dto, tokenType: 'member' });
}

export async function updateBlogStatus(id: string, status: BlogStatus): Promise<BlogPost> {
  return apiFetch<BlogPost>('PATCH', `/blog/${id}/status`, { body: { status }, tokenType: 'member' });
}

export async function deleteBlog(id: string): Promise<void> {
  return apiFetch<void>('DELETE', `/blog/${id}`, { tokenType: 'admin' });
}
