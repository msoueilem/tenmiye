import { LoginForm } from '@/components/dashboard/LoginForm';

export const metadata = { title: 'تسجيل الدخول — بوابة الأعضاء' };

export default function LoginPage() {
  return (
    <div
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0b3d0b] to-[#071a07] px-4 py-12"
    >
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-black text-white">بوابة الأعضاء</h1>
          <p className="mt-2 text-slate-400">مجموعة الإرادة لتنمية الغدية</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
