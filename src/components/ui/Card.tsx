import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-white p-6 rounded-xl shadow-sm border border-slate-200 ${className}`}>
      {children}
    </div>
  );
}
