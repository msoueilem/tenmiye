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
  status?: string;
  createdAt?: string | null;
}

function formatDate(createdAt: string | null | undefined): string {
  if (!createdAt) return '';
  return new Date(createdAt).toLocaleDateString('ar-MR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function readingTime(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function excerpt(content: string, max = 110): string {
  const plain = content.replace(/[#*_`>\[\]]/g, '').trim();
  return plain.length <= max ? plain : plain.slice(0, max).trimEnd() + '...';
}

export default function BlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    setShareUrl(window.location.href);
  }, [id]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch(`${config.apiUrl}/blog/posts/${id}`);
        if (res.status === 404) {
          if (mounted) setNotFound(true);
        } else if (res.ok) {
          const data = (await res.json()) as BlogPost;
          if (mounted) setPost(data);

          try {
            const allRes = await fetch(`${config.apiUrl}/blog/posts`);
            if (allRes.ok && mounted) {
              const all = (await allRes.json()) as BlogPost[];
              const published = all.filter(
                (p) => p.status === 'published' && p.id !== data.id,
              );
              const tags = data.tags ?? [];
              const scored = published
                .map((p) => ({
                  post: p,
                  score: (p.tags ?? []).filter((t) => tags.includes(t)).length,
                }))
                .sort((a, b) => b.score - a.score)
                .filter((entry) => entry.score > 0 || tags.length === 0);
              setRelatedPosts(scored.slice(0, 3).map((e) => e.post));
            }
          } catch {
            /* related posts are non-critical */
          }
        }
      } catch {
        /* ignore */
      }
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

  const shareText = post ? encodeURIComponent(post.title) : '';
  const encodedUrl = encodeURIComponent(shareUrl);

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
          <>
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
              <div className="flex items-center gap-3 text-sm text-slate-400 mb-8">
                <span>{formatDate(post.createdAt)}</span>
                <span>•</span>
                <span>{readingTime(post.content)} دقيقة قراءة</span>
              </div>

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

              <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">شارك المقالة</p>
                <div className="flex items-center gap-3">
                  <a
                    href={`https://wa.me/?text=${shareText}%20${encodedUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition"
                    aria-label="مشاركة عبر واتساب"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-1.732-.866-2.868-1.547-4.01-3.506-.302-.521.302-.484.864-1.61.095-.198.048-.371-.05-.52-.099-.149-.669-1.611-.916-2.206-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.273.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.05 3.13 4.97 4.266 2.92 1.137 2.92.757 3.469.71.55-.05 1.758-.718 2.006-1.413.248-.694.248-1.29.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                      <path d="M12.025 2C6.5 2 2 6.477 2 11.989c0 2.158.708 4.151 1.917 5.79L2.5 22l4.375-1.387a10.05 10.05 0 0 0 5.15 1.41h.004c5.524 0 10.024-4.477 10.024-9.989C22.053 6.523 17.55 2.046 12.025 2zm0 18.13a8.1 8.1 0 0 1-4.13-1.13l-.296-.176-3.07.97.99-2.957-.193-.305a8.08 8.08 0 0 1-1.255-4.343c0-4.475 3.652-8.117 8.157-8.117 4.504 0 8.155 3.642 8.155 8.117 0 4.476-3.65 8.118-8.158 8.118z"/>
                    </svg>
                  </a>
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2]/20 transition"
                    aria-label="مشاركة عبر فيسبوك"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22 12.06C22 6.505 17.523 2 12 2S2 6.505 2 12.06c0 5.022 3.657 9.184 8.438 9.94v-7.03H7.898v-2.91h2.54V9.845c0-2.507 1.492-3.89 3.777-3.89 1.094 0 2.238.196 2.238.196v2.46h-1.26c-1.243 0-1.63.772-1.63 1.563v1.876h2.773l-.443 2.91h-2.33V22c4.78-.756 8.437-4.918 8.437-9.94z"/>
                    </svg>
                  </a>
                </div>
              </div>
            </article>

            {relatedPosts.length > 0 && (
              <section className="mt-16">
                <h2 className="text-xl font-black text-slate-900 dark:text-white mb-6">مقالات ذات صلة</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  {relatedPosts.map((rp) => (
                    <Link
                      key={rp.id}
                      href={`/blog/${rp.id}`}
                      className="group flex flex-col bg-white dark:bg-[#1a331a] rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden hover:shadow-lg hover:shadow-[#0df20d]/10 transition-all"
                    >
                      {rp.featureImageUrl && (
                        <div className="relative h-32 w-full shrink-0 overflow-hidden">
                          <Image
                            src={rp.featureImageUrl}
                            alt={rp.title}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        </div>
                      )}
                      <div className="p-4 flex flex-col flex-1">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2 group-hover:text-[#0df20d] transition-colors mb-2">
                          {rp.title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 flex-1">
                          {excerpt(rp.content)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
