import { MemberAuthProvider } from '@/context/MemberAuthContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <MemberAuthProvider>{children}</MemberAuthProvider>;
}
