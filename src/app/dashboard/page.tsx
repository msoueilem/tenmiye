import { redirect } from 'next/navigation';

// Redirect root /dashboard to /dashboard/profile
export default function DashboardHome() {
  redirect('/dashboard/profile');
}
