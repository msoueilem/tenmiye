'use client';

import { useEffect, useState } from 'react';
import type { BlogPost, CreateBlogDto } from '@/types/blog';
import {
  getAllBlogs,
  createBlog,
  updateBlog,
  updateBlogStatus,
  deleteBlog,
} from '@/features/blog/api.client';

type Mode = 'list' | 'create' | 'edit';

const emptyForm = (): CreateBlogDto => ({
  title: '',
  slug: '',
  content: '',
  tags: [],
});

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [mode, setMode] = useState<Mode>('list');
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [form, setForm] = useState<CreateBlogDto>(emptyForm());
  const [tagsInput, setTagsInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getAllBlogs('admin').then(setPosts).catch(() => setError('فشل تحميل المقالات'));
  }, []);

  const resetForm = () => {
    setForm(emptyForm());
    setTagsInput('');
    setEditing(null);
    setMode('list');
    setError('');
  };

  const handleEdit = (post: BlogPost) => {
    setEditing(post);
    setForm({ title: post.title, slug: post.slug, content: post.content, tags: post.tags ?? [] });
    setTagsInput((post.tags ?? []).join(', '));
    setMode('edit');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المقال؟')) return;
    setLoading(true);
    try {
      await deleteBlog(id, 'admin');
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setError('فشل الحذف');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (post: BlogPost) => {
    const next = post.status === 'published' ? 'draft' : 'published';
    setLoading(true);
    try {
      await updateBlogStatus(post.id, next, 'admin');
      const refreshed = await getAllBlogs('admin');
      setPosts(refreshed);
    } catch {
      setError('فشل تغيير الحالة');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
    const payload = { ...form, tags };
    setLoading(true);
    setError('');
    try {
      if (mode === 'edit' && editing) {
        await updateBlog(editing.id, payload, 'admin');
      } else {
        await createBlog(payload, 'admin');
      }
      const refreshed = await getAllBlogs('admin');
      setPosts(refreshed);
      resetForm();
    } catch {
      setError('فشل الحفظ');
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'create' || mode === 'edit') {
    return (
      <div className="p-6 max-w-3xl mx-auto" dir="rtl">
        <h1 className="text-xl font-bold text-[#d4af37] mb-6">
          {mode === 'edit' ? 'تعديل المقال' : 'مقال جديد'}
        </h1>
        {error && <p className="text-red-400 mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#d4af37]/30"
            placeholder="عنوان المقال"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            required
          />
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#d4af37]/30"
            placeholder="المعرّف (slug)"
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
            className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#d4af37]/30"
            placeholder="محتوى المقال"
            value={form.content}
            onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
            rows={10}
            minLength={10}
            required
          />
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#d4af37]/30"
            placeholder="الوسوم (مفصولة بفاصلة)"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
          />
          <div className="mt-2 flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-[#d4af37] px-4 py-3 font-bold text-slate-900 hover:bg-[#c9a227] disabled:opacity-50"
            >
              {loading ? 'جاري الحفظ...' : 'حفظ'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="flex-1 rounded-lg border border-slate-700 px-4 py-3 text-slate-400 hover:text-white"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="p-6" dir="rtl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#d4af37]">المدونة</h1>
        <button
          onClick={() => setMode('create')}
          className="rounded-lg bg-[#d4af37] px-4 py-2 font-bold text-slate-900 hover:bg-[#c9a227]"
        >
          + مقال جديد
        </button>
      </div>
      {error && <p className="mb-4 text-red-400">{error}</p>}
      <div className="space-y-3">
        {posts.map((post) => (
          <div
            key={post.id}
            className="flex items-center justify-between rounded-lg border border-[#d4af37]/20 bg-white/5 p-4"
          >
            <div>
              <p className="font-semibold text-white">{post.title}</p>
              <p className="text-sm text-slate-400">
                {post.slug} •{' '}
                <span
                  className={
                    post.status === 'published'
                      ? 'text-green-400'
                      : post.status === 'draft'
                        ? 'text-slate-400'
                        : 'text-slate-500'
                  }
                >
                  {post.status === 'published'
                    ? 'منشور'
                    : post.status === 'draft'
                      ? 'مسودة'
                      : 'مؤرشف'}
                </span>
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleToggleStatus(post)}
                disabled={loading}
                className="text-sm text-blue-400 hover:underline disabled:opacity-50"
              >
                {post.status === 'published' ? 'إلغاء النشر' : 'نشر'}
              </button>
              <button onClick={() => handleEdit(post)} className="text-sm text-[#d4af37] hover:underline">
                تعديل
              </button>
              <button
                onClick={() => handleDelete(post.id)}
                disabled={loading}
                className="text-sm text-red-400 hover:underline disabled:opacity-50"
              >
                حذف
              </button>
            </div>
          </div>
        ))}
        {posts.length === 0 && (
          <p className="py-8 text-center text-slate-500">لا توجد مقالات</p>
        )}
      </div>
    </div>
  );
}
