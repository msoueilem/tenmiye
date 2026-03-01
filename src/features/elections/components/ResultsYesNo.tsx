import React from 'react';

interface ResultsYesNoProps {
  stats?: Record<string, number>;
}

export function ResultsYesNo({ stats }: ResultsYesNoProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center bg-green-50 border border-green-100 p-4 rounded-lg">
        <span className="font-bold text-green-700">نعم</span>
        <span className="text-xl font-black text-green-800">{stats?.yes || 0}</span>
      </div>
      <div className="flex justify-between items-center bg-red-50 border border-red-100 p-4 rounded-lg">
        <span className="font-bold text-red-700">لا</span>
        <span className="text-xl font-black text-red-800">{stats?.no || 0}</span>
      </div>
    </div>
  );
}
