import React from 'react';
import { PublicMember } from '@/types/elections';

interface VoteOptionsPickMemberProps {
  disabled: boolean;
  selections: string[];
  onToggle: (id: string, max: number) => void;
  candidateUids: string[];
  maxSelections: number;
  members: Record<string, PublicMember>;
}

export function VoteOptionsPickMember({ disabled, selections, onToggle, candidateUids, maxSelections, members }: VoteOptionsPickMemberProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {candidateUids.map((uid: string) => (
        <button
          key={uid}
          disabled={disabled}
          onClick={() => onToggle(uid, maxSelections)}
          className={`p-4 rounded-lg flex items-center gap-4 border text-right transition-colors ${
            selections.includes(uid)
              ? 'bg-primary/10 border-primary'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden shrink-0">
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
          <div>
            <div className="font-bold">{members[uid]?.name || 'جاري التحميل...'}</div>
          </div>
        </button>
      ))}
    </div>
  );
}