'use client';

import React, { createContext, useContext } from 'react';

export interface AdminSession {
  userId: string;
  permissions: string[];
  googleEmail: string | null;
}

interface DashboardContextProps {
  session: AdminSession | null;
  logout: () => Promise<void>;
}

const DashboardContext = createContext<DashboardContextProps>({
  session: null,
  logout: async () => {},
});

export const useDashboard = () => useContext(DashboardContext);

export function DashboardProvider({
  children,
  session,
  logout,
}: {
  children: React.ReactNode;
  session: AdminSession | null;
  logout: () => Promise<void>;
}) {
  return (
    <DashboardContext.Provider value={{ session, logout }}>
      {children}
    </DashboardContext.Provider>
  );
}
