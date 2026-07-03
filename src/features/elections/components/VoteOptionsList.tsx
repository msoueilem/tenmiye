import React from 'react';
import { ElectionOption } from '@/types/elections';

interface VoteOptionsListProps {
  options: ElectionOption[];
  disabled: boolean;
  selections: string[];
  setSelections: (val: string[]) => void;
}

/** Single-select list of an election's configured options (for multiple_choice votes). */
export function VoteOptionsList({ options, disabled, selections, setSelections }: VoteOptionsListProps) {
  if (options.length === 0) {
    return <p className="text-sm text-slate-500">لا توجد خيارات متاحة لهذا التصويت.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {options.map((opt) => {
        const selected = selections.includes(opt.id);
        return (
          <button
            key={opt.id}
            disabled={disabled}
            onClick={() => setSelections([opt.id])}
            className={`w-full text-right py-4 px-4 rounded-lg font-bold border transition-colors ${
              selected
                ? 'bg-primary text-deep-green border-primary'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
