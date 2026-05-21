import { MemberAuthProvider } from '@/context/MemberAuthContext';

export default function ElectionLayout({ children }: { children: React.ReactNode }) {
  return <MemberAuthProvider>{children}</MemberAuthProvider>;
}
