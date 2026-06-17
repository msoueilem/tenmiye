'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { config } from '@/lib/config';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

interface BlogPost {
  id: string;
  title: string;
  content: string;
  tags?: string[];
  featureImageUrl?: string | null;
  status: string;
  authorId: string;
  createdAt?: string | null;
}

function formatDate(createdAt: string | null | undefined): string {
  if (!createdAt) return '';
  return new Date(createdAt).toLocaleDateString('ar-MR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function excerpt(content: string, max = 160): string {
  const plain = content.replace(/[#*_`>\[\]]/g, '').trim();
  return plain.length <= max ? plain : plain.slice(0, max).trimEnd() + '...';
}

function readingTime(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function BlogCardSkeleton() {
  return (
    <div className="flex flex-col bg-white dark:bg-[#1a331a] rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden">
      <div className="h-48 w-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
      <div className="flex flex-col flex-1 p-7 gap-3">
        <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
        <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
      </div>
    </div>
  );
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch(`${config.apiUrl}/blog/posts`);
        if (!res.ok) throw new Error('Failed to fetch posts');
        const data = (await res.json()) as BlogPost[];
        if (mounted) {
          setPosts(data.filter((p) => p.status === 'published'));
        }
      } catch {
        if (mounted) setError(true);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => { mounted = false; };
  }, []);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    posts.forEach((p) => p.tags?.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [posts]);

  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      const matchesSearch =
        search.trim() === '' ||
        p.title.toLowerCase().includes(search.trim().toLowerCase()) ||
        p.content.toLowerCase().includes(search.trim().toLowerCase());
      const matchesTag = !activeTag || p.tags?.includes(activeTag);
      return matchesSearch && matchesTag;
    });
  }, [posts, search, activeTag]);

  return (
    <div className="min-h-screen bg-[#f8fcf8] dark:bg-[#102210] flex flex-col" dir="rtl">
      <Header />

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-12">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-4">المدونة</h1>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            أفكار وتحليلات من أعضاء مجموعة الإرادة لتنمية الغدية.
          </p>
        </div>

        {!loading && !error && posts.length > 0 && (
          <div className="mb-10 flex flex-col gap-4">
            <div className="relative max-w-md mx-auto w-full">
              <svg
                className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث في المقالات..."
                className="w-full rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a331a] py-2.5 pr-11 pl-4 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[#0df20d]/30 transition"
              />
            </div>

            {allTags.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => setActiveTag(null)}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                    activeTag === null
                      ? 'bg-[#0df20d] text-slate-900'
                      : 'bg-[#0df20d]/10 text-[#0a9e0a] hover:bg-[#0df20d]/20'
                  }`}
                >
                  الكل
                </button>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setActiveTag(tag === activeTag ? null : tag)}
                    className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                      activeTag === tag
                        ? 'bg-[#0df20d] text-slate-900'
                        : 'bg-[#0df20d]/10 text-[#0a9e0a] hover:bg-[#0df20d]/20'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <BlogCardSkeleton />
            <BlogCardSkeleton />
          </div>
        ) : error ? (
          <div className="py-20 text-center bg-white dark:bg-[#1a331a] rounded-3xl border border-dashed border-red-200 dark:border-red-900/40">
            <p className="text-red-500 font-bold mb-2">حدث خطأ في تحميل المقالات.</p>
            <p className="text-slate-500 text-sm">يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="py-20 text-center bg-white dark:bg-[#1a331a] rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
            <p className="text-slate-500">لا توجد مقالات منشورة بعد.</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="py-20 text-center bg-white dark:bg-[#1a331a] rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
            <p className="text-slate-500">لا توجد نتائج مطابقة لبحثك.</p>
          </div>
        ) : (
          <div
            className={
              filteredPosts.length === 1
                ? 'flex justify-center'
                : 'grid grid-cols-1 md:grid-cols-2 gap-8'
            }
          >
            {filteredPosts.map((p) => (
              <Link
                key={p.id}
                href={`/blog/${p.id}`}
                className={`group flex flex-col bg-white dark:bg-[#1a331a] rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-xl shadow-slate-200/20 hover:shadow-2xl hover:shadow-[#0df20d]/10 transition-all ${
                  filteredPosts.length === 1 ? 'w-full max-w-xl' : ''
                }`}
              >
                {p.featureImageUrl && (
                  <div className="relative h-48 w-full shrink-0 overflow-hidden">
                    <Image
                      src={p.featureImageUrl}
                      alt={p.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                )}
                <div className="flex flex-col flex-1 p-7">
                  {p.tags && p.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {p.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-[#0df20d]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#0a9e0a]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <h2 className="text-xl font-black text-slate-900 dark:text-white mb-3 group-hover:text-[#0df20d] transition-colors line-clamp-2">
                    {p.title}
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed line-clamp-3 flex-1">
                    {excerpt(p.content)}
                  </p>
                  <div className="mt-4 flex items-center gap-3 text-xs text-slate-400">
                    <span>{formatDate(p.createdAt)}</span>
                    <span>•</span>
                    <span>{readingTime(p.content)} دقيقة قراءة</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
