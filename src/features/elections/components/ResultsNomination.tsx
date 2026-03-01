import React from 'react';
import { PublicMember, NominationCount } from '@/types/elections';

interface ResultsNominationProps {
  topNominations: NominationCount[];
  members: Record<string, PublicMember>;
}

export function ResultsNomination({ topNominations, members }: ResultsNominationProps) {
  return (
    <div className="flex flex-col gap-3">
      {topNominations.length === 0 ? (
        <p className="text-slate-500 text-sm">لا توجد ترشيحات بعد.</p>
      ) : (
        topNominations.map((nom, idx) => (
          <div key={nom.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-slate-50">
            <div className="flex items-center gap-3">
              <span className="text-slate-400 font-bold w-6">{idx + 1}.</span>
              <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden border border-slate-300">
                {members[nom.nomineeUid]?.photoUrl && (
                  <img 
                    src={members[nom.nomineeUid].photoUrl} 
                    alt={members[nom.nomineeUid]?.name || "صورة العضو"} 
                    className="w-full h-full object-cover" 
                    loading="lazy" 
                    referrerPolicy="no-referrer" 
                  />
                )}
              </div>
              <span className="font-medium text-slate-700">{members[nom.nomineeUid]?.name || '...'}</span>
            </div>
            <span className="font-black text-lg text-primary drop-shadow-sm">{nom.count} صوت</span>
          </div>
        ))
      )}
    </div>
  );
}