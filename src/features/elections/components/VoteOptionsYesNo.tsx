import React from 'react';

interface VoteOptionsYesNoProps {
  disabled: boolean;
  selections: string[];
  setSelections: (val: string[]) => void;
}

export function VoteOptionsYesNo({ disabled, selections, setSelections }: VoteOptionsYesNoProps) {
  return (
    <div className="flex gap-4">
      {['yes', 'no'].map(opt => (
        <button
          key={opt}
          disabled={disabled}
          onClick={() => setSelections([opt])}
          className={`flex-1 py-4 rounded-lg font-bold border transition-colors ${
            selections.includes(opt) 
              ? 'bg-primary text-deep-green border-primary' 
              : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {opt === 'yes' ? 'نعم' : 'لا'}
        </button>
      ))}
    </div>
  );
}
