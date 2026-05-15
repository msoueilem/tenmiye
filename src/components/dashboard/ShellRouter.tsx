'use client';

import { usePathname } from 'next/navigation';
import { DashboardShell } from './DashboardShell';

const SHELL_EXCLUDED = ['/dashboard/login', '/dashboard/set-password'];

export function ShellRouter({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (SHELL_EXCLUDED.includes(pathname)) return <>{children}</>;
  return <DashboardShell>{children}</DashboardShell>;
}
