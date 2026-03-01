import React from 'react';

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
}

export function PrimaryButton({ loading, children, className = '', ...props }: PrimaryButtonProps) {
  return (
    <button
      {...props}
      className={`mt-6 w-full py-4 rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
    >
      {loading ? 'جاري الإرسال...' : children}
    </button>
  );
}
