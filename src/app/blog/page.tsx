'use client';

import { useEffect, useState } from 'react';
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

export default function BlogPage() {
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
      <div className="min-h-screen bg-[#f8fcf8] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#0df20d] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fcf8] dark:bg-[#102210] flex flex-col" dir="rtl">
      <Header />

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-12">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-4">المدونة</h1>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            أفكار وتحليلات من أعضاء مجموعة الإرادة لتنمية الغدية.
          </p>
        </div>

        {posts.length === 0 ? (
          <div className="py-20 text-center bg-white dark:bg-[#1a331a] rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
            <p className="text-slate-500">لا توجد مقالات منشورة بعد.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {posts.map((p) => (
              <Link
                key={p.id}
                href={`/blog/${p.id}`}
                className="group flex flex-col bg-white dark:bg-[#1a331a] rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-xl shadow-slate-200/20 hover:shadow-2xl hover:shadow-[#0df20d]/10 transition-all"
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
                  <p className="mt-4 text-xs text-slate-400">{formatDate(p.createdAt)}</p>
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
