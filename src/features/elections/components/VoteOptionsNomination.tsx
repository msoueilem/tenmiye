import React, { useEffect } from 'react';
import { PublicMember } from '@/types/elections';

interface VoteOptionsNominationProps {
  disabled: boolean;
  selections: string[];
  onToggle: (id: string, max: number) => void;
  minPicks: number;
  maxPicks: number;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  searchResults: PublicMember[];
  onSearch: (query: string) => void;
  members: Record<string, PublicMember>;
}

export function VoteOptionsNomination({
  disabled,
  selections,
  onToggle,
  minPicks,
  maxPicks,
  searchQuery,
  setSearchQuery,
  searchResults,
  onSearch,
  members
}: VoteOptionsNominationProps) {

  useEffect(() => {
    if (disabled) return;
    
    const handler = setTimeout(() => {
      onSearch(searchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery, onSearch, disabled]);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-500">
        اختر بين {minPicks} و {maxPicks} أعضاء.
      </p>
      <div className="flex gap-2">
        <input 
          type="text" 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="ابحث عن اسم العضو..." 
          className="flex-1 border border-slate-200 rounded-lg px-4 py-2"
          disabled={disabled}
        />
      </div>
      {searchResults.length > 0 && (
        <div className="border border-slate-200 rounded-lg p-2 max-h-60 overflow-y-auto bg-slate-50">
          {searchResults.map(member => (
            <div key={member.id} className="flex justify-between items-center p-2 hover:bg-white rounded border-b border-slate-100 last:border-b-0">
              <span className="font-medium text-slate-700">{member.name}</span>
              <button 
                onClick={() => onToggle(member.id, maxPicks)}
                className={`text-sm px-3 py-1 rounded font-medium transition-colors ${
                  selections.includes(member.id) 
                    ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' 
                    : 'bg-primary text-deep-green hover:bg-yellow-400'
                }`}
                disabled={disabled}
              >
                {selections.includes(member.id) ? 'إزالة' : 'إضافة'}
              </button>
            </div>
          ))}
        </div>
      )}
      
      {selections.length > 0 && (
        <div className="mt-4 p-4 border border-slate-200 rounded-lg bg-slate-50">
          <h3 className="font-bold mb-3 text-slate-700">الأعضاء المختارون:</h3>
          <div className="flex flex-wrap gap-2">
            {selections.map(uid => (
              <div key={uid} className="bg-primary/20 border border-primary/30 text-deep-green px-3 py-1.5 rounded-full text-sm flex items-center gap-2 font-medium">
                {members[uid]?.name || uid}
                <button 
                  onClick={() => !disabled && onToggle(uid, maxPicks)} 
                  className="text-red-500 font-bold hover:text-red-700 flex items-center justify-center w-5 h-5 rounded-full hover:bg-red-50 disabled:opacity-50"
                  disabled={disabled}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}