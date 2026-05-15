import { MemberAuthProvider } from '@/context/MemberAuthContext';
import { ShellRouter } from '@/components/dashboard/ShellRouter';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <MemberAuthProvider>
      <ShellRouter>{children}</ShellRouter>
    </MemberAuthProvider>
  );
}
