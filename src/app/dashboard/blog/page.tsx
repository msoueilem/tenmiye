'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { config } from '@/lib/config';

interface BlogPost {
  id: string;
  title: string;
  content: string;
  tags?: string[];
  createdAt?: string | null;
}

function excerpt(content: string, max = 120): string {
  const plain = content.replace(/[#*_`>\[\]]/g, '').trim();
  return plain.length <= max ? plain : plain.slice(0, max).trimEnd() + '...';
}

function formatDate(createdAt: string | null | undefined): string {
  if (!createdAt) return '';
  return new Date(createdAt).toLocaleDateString('ar-MR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function ArticleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

export default function DashboardBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch(`${config.apiUrl}/blog/posts`);
        if (res.ok && mounted) setPosts(await res.json() as BlogPost[]);
      } catch { /* ignore */ }
      if (mounted) setLoading(false);
    }
    void load();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0df20d] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-white">المدونة</h1>

      {posts.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-[#071a07] px-8 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-slate-500">
            <ArticleIcon />
          </div>
          <p className="text-slate-400">لا توجد مقالات منشورة بعد.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {posts.map((p) => (
            <li key={p.id} className="rounded-xl border border-white/10 bg-[#071a07] p-5">
              <div className="flex items-start gap-4">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0df20d]/15 text-[#0df20d]">
                  <ArticleIcon />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white leading-snug mb-1">{p.title}</p>
                  {p.tags && p.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {p.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-400">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-sm text-slate-400 line-clamp-2">{excerpt(p.content)}</p>
                  <p className="mt-2 text-xs text-slate-600">{formatDate(p.createdAt)}</p>
                </div>
                <Link
                  href={`/blog/${p.id}`}
                  className="shrink-0 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-400 transition-colors hover:bg-white/10"
                >
                  قراءة
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
