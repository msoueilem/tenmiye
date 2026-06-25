'use client';

import React, { useState, useEffect } from 'react';
import { MemberSearchResult } from '@/types/users';
import { searchMembers } from '@/features/users/api.client';

interface CandidatePickerProps {
  onSelect: (member: MemberSearchResult) => void;
  excludeIds?: string[];
}

export function CandidatePicker({ onSelect, excludeIds = [] }: CandidatePickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MemberSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length >= 2) {
        setLoading(true);
        setError(null);
        try {
          const data = await searchMembers(query);
          setResults(data.filter((m) => !excludeIds.includes(m.id)));
        } catch {
          setError('حدث خطأ أثناء البحث.');
          setResults([]);
        } finally {
          setLoading(false);
        }
      } else {
        setResults([]);
        setError(null);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, excludeIds]);

  return (
    <div className="relative">
      <div className="relative group">
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
          <span className="material-symbols-outlined">search</span>
        </div>
        <input
          className={`block w-full rounded-lg border bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0df20d]/20 outline-none pr-10 py-2.5 text-sm ${
            error ? 'border-red-300' : 'border-slate-200 dark:border-slate-700'
          }`}
          placeholder="ابحث عن عضو (بالاسم)..."
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loading && (
        <div className="absolute top-full right-0 mt-1 w-full bg-white dark:bg-[#1a331a] border border-slate-200 dark:border-slate-800 rounded-lg p-4 text-center z-50">
          <div className="inline-block w-4 h-4 border-2 border-[#0df20d] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="absolute top-full right-0 mt-1 w-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-lg p-3 z-50 text-xs text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && results.length > 0 && (
        <div className="absolute top-full right-0 mt-1 w-full bg-white dark:bg-[#1a331a] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
          <ul className="py-1">
            {results.map((member) => (
              <li key={member.id}>
                <button
                  onClick={() => { onSelect(member); setQuery(''); setResults([]); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-right hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-[#0b3d0b]/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-sm text-[#0b3d0b]">person</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">{member.fullName}</span>
                    {member.fullNameAr && (
                      <span className="text-[10px] text-slate-500">{member.fullNameAr}</span>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!loading && query.length >= 2 && results.length === 0 && (
        <div className="absolute top-full right-0 mt-1 w-full bg-white dark:bg-[#1a331a] border border-slate-200 dark:border-slate-800 rounded-lg p-4 text-center z-50 text-xs text-slate-500">
          لا توجد نتائج
        </div>
      )}
    </div>
  );
}
