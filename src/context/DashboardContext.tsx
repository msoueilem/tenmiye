'use client';

import React, { createContext, useContext } from 'react';
import { User } from 'firebase/auth';
import { Admin } from '@/lib/firebase/queries';

interface DashboardContextProps {
  user: User | null;
  admin: Admin | null;
}

const DashboardContext = createContext<DashboardContextProps>({
  user: null,
  admin: null,
});

export const useDashboard = () => useContext(DashboardContext);

export function DashboardProvider({
  children,
  user,
  admin,
}: {
  children: React.ReactNode;
  user: User | null;
  admin: Admin | null;
}) {
  return (
    <DashboardContext.Provider value={{ user, admin }}>
      {children}
    </DashboardContext.Provider>
  );
}
