'use client';

import React from 'react';
import { DashboardHome } from '@/components/DashboardHome';
import { useDashboard } from '@/context/DashboardContext';

export default function DashboardPage() {
  const { session } = useDashboard();

  if (!session) return null;

  return <DashboardHome session={session} />;
}
