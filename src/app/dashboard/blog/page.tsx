'use client';

import { useEffect, useState } from 'react';
import { useMemberAuth } from '@/context/MemberAuthContext';
import type { BlogPost, CreateBlogDto } from '@/types/blog';
import {
  getAllBlogs,
  getPublishedBlogs,
  createBlog,
  updateBlog,
  updateBlogStatus,
} from '@/features/blog/api.client';

type Mode = 'list' | 'create' | 'edit';

const emptyForm = (): CreateBlogDto => ({
  title: '',
  slug: '',
  content: '',
  tags: [],
});

function excerpt(content: string, max = 120): string {
  const plain = content.replace(/[#*_`>\[\]]/g, '').trim();
  return plain.length <= max ? plain : plain.slice(0, max).trimEnd() + '...';
}

function formatDate(createdAt: string): string {
  return new Date(createdAt).toLocaleDateString('ar-MR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function ArticleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

export default function DashboardBlogPage() {
  const { user } = useMemberAuth();
  const permissions = user?.permissions ?? [];
  const canWrite = permissions.includes('MODERATE_BLOG');
  const canModerate = canWrite;

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [mode, setMode] = useState<Mode>('list');
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [form, setForm] = useState<CreateBlogDto>(emptyForm());
  const [tagsInput, setTagsInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fn = canWrite || canModerate ? getAllBlogs : getPublishedBlogs;
    fn()
      .then(setPosts)
      .catch(() => setError('فشل تحميل المقالات'))
      .finally(() => setLoading(false));
  }, [canWrite, canModerate]);

  const resetForm = () => {
    setForm(emptyForm());
    setTagsInput('');
    setEditing(null);
    setMode('list');
    setError('');
  };

  const handleEdit = (post: BlogPost) => {
    if (!canWrite) return;
    setEditing(post);
    setForm({ title: post.title, slug: post.slug, content: post.content, tags: post.tags ?? [] });
    setTagsInput((post.tags ?? []).join(', '));
    setMode('edit');
  };

  const handleToggleStatus = async (post: BlogPost) => {
    if (!canModerate && !canWrite) return;
    const next = post.status === 'published' ? 'draft' : 'published';
    setSaving(true);
    try {
      const updated = await updateBlogStatus(post.id, next);
      setPosts((prev) => prev.map((p) => (p.id === post.id ? updated : p)));
    } catch {
      setError('فشل تغيير حالة المقال');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) return;
    const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
    const payload = { ...form, tags };
    setSaving(true);
    setError('');
    try {
      if (mode === 'edit' && editing) {
        const updated = await updateBlog(editing.id, payload);
        setPosts((prev) => prev.map((p) => (p.id === editing.id ? updated : p)));
      } else {
        const created = await createBlog(payload);
        setPosts((prev) => [created, ...prev]);
      }
      resetForm();
    } catch {
      setError('فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 h-8 w-28 animate-pulse rounded-lg bg-white/10" />
        <ul className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <li key={i} className="rounded-xl border border-white/10 bg-[#071a07] p-5">
              <div className="flex items-start gap-4">
                <div className="mt-0.5 h-8 w-8 shrink-0 animate-pulse rounded-full bg-white/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-white/10" />
                  <div className="h-3 w-full animate-pulse rounded bg-white/5" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (mode === 'create' || mode === 'edit') {
    return (
      <div className="mx-auto max-w-2xl" dir="rtl">
        <h1 className="mb-6 text-xl font-bold text-[#0df20d]">
          {mode === 'edit' ? 'تعديل المقال' : 'مقال جديد'}
        </h1>
        {error && <p className="mb-4 text-red-400">{error}</p>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#0df20d]/30"
            placeholder="عنوان المقال"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            required
          />
          <input
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#0df20d]/30"
            placeholder="المعرّف (slug) — حروف لاتينية وأرقام وشرطات"
            value={form.slug}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
              }))
            }
            required
          />
          <textarea
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#0df20d]/30"
            placeholder="محتوى المقال"
            value={form.content}
            onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
            rows={10}
            minLength={10}
            required
          />
          <input
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#0df20d]/30"
            placeholder="الوسوم (مفصولة بفاصلة)"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
          />
          <div className="mt-2 flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-[#0df20d] px-4 py-3 font-bold text-slate-900 hover:bg-[#0be00b] disabled:opacity-50"
            >
              {saving ? 'جاري الحفظ...' : 'حفظ'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="flex-1 rounded-lg border border-white/10 px-4 py-3 text-slate-400 hover:text-white"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl" dir="rtl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">المدونة</h1>
        {canWrite && (
          <button
            onClick={() => setMode('create')}
            className="rounded-lg bg-[#0df20d] px-4 py-2 font-bold text-slate-900 hover:bg-[#0be00b]"
          >
            + مقال جديد
          </button>
        )}
      </div>
      {error && <p className="mb-4 text-red-400">{error}</p>}

      {posts.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-[#071a07] px-8 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-slate-500">
            <ArticleIcon />
          </div>
          <p className="text-slate-400">لا توجد مقالات بعد.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {posts.map((p) => (
            <li key={p.id} className="rounded-xl border border-white/10 bg-[#071a07] p-5">
              <div className="flex items-start gap-4">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0df20d]/15 text-[#0df20d]">
                  <ArticleIcon />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="mb-1 font-semibold leading-snug text-white">{p.title}</p>
                  {p.tags && p.tags.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1">
                      {p.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="line-clamp-2 text-sm text-slate-400">{excerpt(p.content)}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="text-xs text-slate-600">{formatDate(p.createdAt)}</span>
                    <span
                      className={`text-xs ${
                        p.status === 'published' ? 'text-green-500' : 'text-slate-500'
                      }`}
                    >
                      {p.status === 'published' ? 'منشور' : p.status === 'draft' ? 'مسودة' : 'مؤرشف'}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  {(canModerate || canWrite) && (
                    <button
                      onClick={() => handleToggleStatus(p)}
                      disabled={saving}
                      className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-bold text-blue-400 transition-colors hover:bg-white/10 disabled:opacity-50"
                    >
                      {p.status === 'published' ? 'إلغاء النشر' : 'نشر'}
                    </button>
                  )}
                  {canWrite && (
                    <button
                      onClick={() => handleEdit(p)}
                      className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-bold text-[#0df20d] transition-colors hover:bg-white/10"
                    >
                      تعديل
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
