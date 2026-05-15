'use client';

import { useEffect, useState, use } from 'react';
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
  createdAt?: string | null;
}

function formatDate(createdAt: string | null | undefined): string {
  if (!createdAt) return '';
  return new Date(createdAt).toLocaleDateString('ar-MR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

export default function BlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch(`${config.apiUrl}/blog/posts/${id}`);
        if (res.status === 404) { if (mounted) setNotFound(true); }
        else if (res.ok && mounted) setPost(await res.json() as BlogPost);
      } catch { /* ignore */ }
      if (mounted) setLoading(false);
    }
    void load();
    return () => { mounted = false; };
  }, [id]);

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

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12">
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white mb-8 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
          العودة إلى المدونة
        </Link>

        {notFound || !post ? (
          <div className="py-20 text-center">
            <p className="text-slate-500 text-xl mb-4">لم يتم العثور على المقالة.</p>
            <Link href="/blog" className="text-[#0df20d] font-bold hover:underline">العودة إلى المدونة</Link>
          </div>
        ) : (
          <article>
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {post.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-[#0df20d]/10 px-3 py-1 text-xs font-bold text-[#0a9e0a]">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-3 leading-tight">
              {post.title}
            </h1>
            <p className="text-sm text-slate-400 mb-8">{formatDate(post.createdAt)}</p>

            {post.featureImageUrl && (
              <div className="relative h-72 w-full rounded-2xl overflow-hidden mb-10">
                <Image
                  src={post.featureImageUrl}
                  alt={post.title}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            <div className="prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 leading-relaxed text-base whitespace-pre-wrap">
              {post.content}
            </div>
          </article>
        )}
      </main>

      <Footer />
    </div>
  );
}
