import React from 'react';
import { PublicMember } from '@/types/elections';

interface ResultsPickMemberProps {
  candidateUids: string[];
  stats?: Record<string, number>;
  members: Record<string, PublicMember>;
}

export function ResultsPickMember({ candidateUids, stats, members }: ResultsPickMemberProps) {
  return (
    <div className="flex flex-col gap-3">
      {candidateUids.map((uid: string) => (
        <div key={uid} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden border border-slate-300">
              {members[uid]?.photoUrl && (
                <img 
                  src={members[uid].photoUrl} 
                  alt={members[uid]?.name || "صورة العضو"} 
                  className="w-full h-full object-cover" 
                  loading="lazy" 
                  referrerPolicy="no-referrer" 
                />
              )}
            </div>
            <span className="font-medium text-slate-700">{members[uid]?.name || '...'}</span>
          </div>
          <span className="font-black text-lg text-slate-800">{stats?.[uid] || 0} صوت</span>
        </div>
      ))}
    </div>
  );
}