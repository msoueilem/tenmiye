'use client';

import React from 'react';
import { DashboardHome } from '@/components/DashboardHome';
import { useDashboard } from '@/context/DashboardContext';

export default function DashboardPage() {
  const { user, admin } = useDashboard();
  
  if (!user || !admin) return null;
  
  return <DashboardHome user={user} admin={admin} />;
}
