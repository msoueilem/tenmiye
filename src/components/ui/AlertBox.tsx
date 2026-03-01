import React from 'react';

interface AlertBoxProps {
  variant: 'success' | 'error' | 'warning' | 'info';
  children: React.ReactNode;
}

export function AlertBox({ variant, children }: AlertBoxProps) {
  const styles = {
    success: 'text-green-600 bg-green-50',
    error: 'text-red-600 bg-red-50',
    warning: 'text-orange-600 bg-orange-50',
    info: 'text-blue-600 bg-blue-50',
  };

  return (
    <p className={`${styles[variant]} p-3 rounded-lg text-sm font-medium`}>
      {children}
    </p>
  );
}
