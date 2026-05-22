import { apiFetch } from '@/lib/api';
import type { BlogPost, CreateBlogDto, UpdateBlogDto, BlogStatus } from '@/types/blog';

export async function getPublishedBlogs(): Promise<BlogPost[]> {
  return apiFetch<BlogPost[]>('GET', '/blog/posts');
}

export async function getAllBlogs(tokenType: 'admin' | 'member' = 'member'): Promise<BlogPost[]> {
  return apiFetch<BlogPost[]>('GET', '/blog/posts/all', { tokenType });
}

export async function getBlog(id: string, tokenType: 'admin' | 'member' = 'member'): Promise<BlogPost> {
  return apiFetch<BlogPost>('GET', `/blog/posts/${id}`, { tokenType });
}

export async function createBlog(dto: CreateBlogDto, tokenType: 'admin' | 'member' = 'member'): Promise<BlogPost> {
  return apiFetch<BlogPost>('POST', '/blog/posts', { body: dto, tokenType });
}

export async function updateBlog(id: string, dto: UpdateBlogDto, tokenType: 'admin' | 'member' = 'member'): Promise<BlogPost> {
  return apiFetch<BlogPost>('PATCH', `/blog/posts/${id}`, { body: dto, tokenType });
}

export async function updateBlogStatus(id: string, status: BlogStatus, tokenType: 'admin' | 'member' = 'member'): Promise<BlogPost> {
  return apiFetch<BlogPost>('PATCH', `/blog/posts/${id}/status`, { body: { status }, tokenType });
}

export async function deleteBlog(id: string, tokenType: 'admin' | 'member' = 'admin'): Promise<void> {
  return apiFetch<void>('DELETE', `/blog/posts/${id}`, { tokenType });
}
