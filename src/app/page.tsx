import React from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { TeamHierarchy } from '@/components/TeamHierarchy';
import { InitiativesCarousel } from '@/components/InitiativesCarousel';
import { JoinForm } from '@/components/JoinForm';
import { ContactForm } from '@/components/ContactForm';
import { getPublicLandingData } from '@/lib/firebase/queries';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home() {
  let data = null;
  let error = null;

  try {
    data = await getPublicLandingData();
  } catch (err) {
    console.error('Error in Home:', err);
    error = 'حدث خطأ أثناء جلب البيانات';
  }

  // If no data and no error, it means the document doesn't exist yet
  // We should still show the page but with "No data" state as per requirements
  // OR we can show the default design data as a fallback if the user preferred that.
  // The requirements say: Add Arabic loading/empty states: "جارٍ التحميل…" "لا توجد بيانات حالياً"

  if (error) {
    return (
      <div className="bg-background-light dark:bg-background-dark flex min-h-screen items-center justify-center text-slate-900 dark:text-slate-100">
        <div className="px-4 text-center">
          <h1 className="mb-4 text-2xl font-bold text-red-500">{error}</h1>
          <p>يرجى التحقق من إعدادات Firebase والمحاولة مرة أخرى.</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-background-light dark:bg-background-dark flex min-h-screen items-center justify-center text-slate-900 dark:text-slate-100">
        <div className="flex flex-col items-center gap-4 px-4 text-center">
          <div className="border-primary h-12 w-12 animate-spin rounded-full border-4 border-t-transparent"></div>
          <h1 className="text-2xl font-bold">
            لا توجد بيانات حالياً - FORCE REFRESH
          </h1>
          <p className="text-slate-500">
            يرجى إضافة مستند في Firestore بمسار settings-simple/public
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="group/design-root relative flex min-h-screen w-full flex-col">
      <div className="layout-container flex h-full grow flex-col">
        <Header />

        <main className="flex flex-1 flex-col items-center">
          <div className="flex w-full max-w-[1280px] flex-col gap-10 px-4 py-5 md:px-10">
            {/* Hero Section */}
            <div className="@container">
              <div className="@[480px]:p-4">
                <div
                  className="border-primary relative flex min-h-[480px] flex-col items-center justify-center gap-6 overflow-hidden border-b-4 bg-cover bg-center bg-no-repeat p-8 shadow-lg @[480px]:gap-8 @[480px]:rounded-xl"
                  style={{
                    backgroundImage:
                      'linear-gradient(rgba(6, 78, 59, 0.85), rgba(10, 31, 10, 0.9)), url("/assets/images/cover.png")',
                  }}
                >
                  <div className="relative z-10 flex max-w-[800px] flex-col gap-4 text-center">
                    <h1 className="text-4xl leading-tight font-black tracking-[-0.033em] text-white drop-shadow-md @[480px]:text-6xl">
                      مجموعة الإرادة{' '}
                      <span className="text-primary">لتنمية الغدية</span>
                    </h1>
                    <h2 className="mx-auto max-w-2xl text-base leading-relaxed font-normal text-slate-200 @[480px]:text-xl">
                      رؤيتنا بناء مستقبل مشرق وتنمية مستدامة لمجتمعنا، نسعى
                      لتمكين الأفراد وتعزيز القيم من خلال العمل الجماعي
                      والمبادرات الهادفة.
                    </h2>
                  </div>
                  <div className="relative z-10 flex flex-wrap justify-center gap-4">
                    <a
                      className="bg-primary text-deep-green shadow-primary/20 flex h-12 min-w-[140px] cursor-pointer items-center justify-center overflow-hidden rounded-lg px-8 text-base leading-normal font-bold tracking-[0.015em] shadow-lg transition-transform hover:scale-105"
                      href="#join-us"
                    >
                      <span className="truncate">انضم إلينا الآن</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Section */}
            <div className="grid grid-cols-1 gap-6 px-4 md:grid-cols-3">
              <div className="hover:border-primary/50 group flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-100 bg-white p-8 shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-800">
                <div className="bg-deep-green/10 text-deep-green dark:text-primary group-hover:bg-deep-green group-hover:text-primary mb-2 rounded-full p-3 transition-colors">
                  <span className="material-symbols-outlined text-3xl">
                    groups
                  </span>
                </div>
                <p className="text-base leading-normal font-medium text-slate-600 dark:text-slate-400">
                  عضو مسجل
                </p>
                <p className="tracking-light text-4xl leading-tight font-bold text-slate-900 dark:text-white">
                  +{data.membersCount?.toLocaleString() || '1,250+'}
                </p>
              </div>
              <div className="hover:border-primary/50 group flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-100 bg-white p-8 shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-800">
                <div className="bg-deep-green/10 text-deep-green dark:text-primary group-hover:bg-deep-green group-hover:text-primary mb-2 rounded-full p-3 transition-colors">
                  <span className="material-symbols-outlined text-3xl">
                    volunteer_activism
                  </span>
                </div>
                <p className="text-base leading-normal font-medium text-slate-600 dark:text-slate-400">
                  مبادرة نشطة
                </p>
                <p className="tracking-light text-4xl leading-tight font-bold text-slate-900 dark:text-white">
                  {data.initiatives?.length || 15}
                </p>
              </div>
              <div className="hover:border-primary/50 group flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-100 bg-white p-8 shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-800">
                <div className="bg-deep-green/10 text-deep-green dark:text-primary group-hover:bg-deep-green group-hover:text-primary mb-2 rounded-full p-3 transition-colors">
                  <span className="material-symbols-outlined text-3xl">
                    savings
                  </span>
                </div>
                <p className="text-base leading-normal font-medium text-slate-600 dark:text-slate-400">
                  مشروع منجز
                </p>
                <p className="tracking-light text-4xl leading-tight font-bold text-slate-900 dark:text-white">
                  48
                </p>
              </div>
            </div>

            {/* About Section */}
            <div
              className="flex flex-col items-center gap-10 rounded-2xl border border-slate-100 bg-white px-4 py-12 shadow-sm lg:flex-row dark:border-slate-700 dark:bg-slate-800"
              id="about-us"
            >
              <div className="flex flex-1 flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <div className="text-primary flex items-center gap-2 font-bold">
                    <span className="bg-primary h-[2px] w-8"></span>
                    <span>من نحن</span>
                  </div>
                  <h2 className="text-3xl leading-tight font-bold text-slate-900 md:text-4xl dark:text-white">
                    تاريخ عريق من{' '}
                    <span className="text-deep-green dark:text-emerald-400">
                      العطاء والتميز
                    </span>
                  </h2>
                </div>
                <div className="prose prose-slate dark:prose-invert max-w-none">
                  <p className="text-lg leading-relaxed whitespace-pre-line text-slate-600 dark:text-slate-300">
                    {data.aboutText ||
                      `تأسست &quot;مجموعة الإرادة لتنمية الغدية&quot; في شهر يناير من عام 2015، على يد نخبة من شباب وشابات الوطن الغيورين، بقيادة المهندس محمد عبدالله وفريقه الطموح. انطلقت المجموعة برؤية واضحة تهدف إلى سد الفجوات التنموية في الأحياء الأكثر احتياجاً، وترسيخ ثقافة العمل التطوعي المنظم.`}
                  </p>
                  {!data.aboutText && (
                    <p className="mt-4 text-lg leading-relaxed text-slate-600 dark:text-slate-300">
                      منذ انطلاقنا، ونحن نعمل بجد لتحويل التحديات إلى فرص،
                      مستثمرين طاقات الشباب في بناء مجتمع متماسك وقوي.
                    </p>
                  )}
                </div>
                <div className="mt-4 flex flex-col gap-4">
                  <h3 className="border-b border-slate-200 pb-2 text-xl font-bold text-slate-800 dark:border-slate-700 dark:text-slate-100">
                    أبرز الإنجازات:
                  </h3>
                  <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <li className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-primary mt-1">
                        check_circle
                      </span>
                      <span className="text-slate-600 dark:text-slate-300">
                        ترميم وتجهيز 12 مدرسة ابتدائية في المناطق النائية.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-primary mt-1">
                        check_circle
                      </span>
                      <span className="text-slate-600 dark:text-slate-300">
                        إطلاق حملة &quot;دفء الشتاء&quot; التي خدمت أكثر من 5000
                        أسرة.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-primary mt-1">
                        check_circle
                      </span>
                      <span className="text-slate-600 dark:text-slate-300">
                        تأسيس مركز &quot;الإرادة&quot; للتدريب المهني وتخريج 300
                        متدرب.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-primary mt-1">
                        check_circle
                      </span>
                      <span className="text-slate-600 dark:text-slate-300">
                        تنظيم أكبر حملة تشجير حضرية، بزراعة 1000 شجرة.
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="w-full flex-1 lg:max-w-[500px]">
                <div className="relative rotate-2 overflow-hidden rounded-2xl border-8 border-white shadow-2xl transition-transform duration-500 hover:rotate-0 dark:border-slate-700">
                  <div
                    className="aspect-[4/5] bg-cover bg-center"
                    style={{
                      backgroundImage:
                        'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBZYltJ--me2BXZz85vQZDKcfqydShHxdIxp2fBo7----sK30QcHui2_klvBdTUZzPvIcU3wuiaeKovd4ACpB6NDFV4oF5QR0DAkB26BY68bHRltdClYxrh9lvtKbqhNeoHJFBTT6dzcSN7riPTMCqjGTIkSg9lkO1_MLOoIcKT0K2S47be-R7C5i9bPc-OYgrz6k6ei3zr-ZXGYxDA34aa0WcUl81AD-RUsSn0nt6pMn5gcxiPYTqW79VSkEjmgTghrUstyZu2aCfZ")',
                    }}
                  ></div>
                  <div className="absolute bottom-0 w-full bg-gradient-to-t from-black/80 to-transparent p-6 pt-20">
                    <p className="text-xl font-bold text-white">
                      جانب من أنشطتنا الميدانية
                    </p>
                    <p className="text-sm text-slate-300">
                      التزام مستمر بخدمة المجتمع
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Initiatives Section */}
            <InitiativesCarousel initiatives={data.initiatives} />

            {/* Hierarchy Section */}
            <div id="hierarchy">
              <TeamHierarchy data={data.teamHierarchy} />
            </div>

            {/* Contact & Join Us Section */}
            <div
              className="mb-10 flex flex-col gap-8 px-4 py-8 md:flex-row"
              id="join-us"
            >
              <JoinForm />
              <ContactForm />
            </div>

            {/* Contact Info Footer Section */}
            <div className="flex flex-col items-center justify-center gap-6 border-t border-slate-200 py-8 md:flex-row dark:border-slate-800">
              <h3 className="ml-4 w-full text-center text-xl font-bold text-slate-700 md:w-auto md:text-right dark:text-slate-300">
                معلومات التواصل:
              </h3>
              <div className="flex flex-wrap justify-center gap-6 md:gap-10">
                <a
                  className="group flex items-center gap-3 transition-colors"
                  href={`tel:${data.contact?.phone || '+222 22 33 44 55'}`}
                >
                  <div className="bg-deep-green/10 text-deep-green group-hover:bg-primary group-hover:text-deep-green flex h-10 w-10 items-center justify-center rounded-full transition-colors">
                    <span className="material-symbols-outlined">call</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-500">رقم الهاتف</span>
                    <span
                      className="font-display font-bold text-slate-800 dark:text-white"
                      dir="ltr"
                    >
                      {data.contact?.phone || '+222 22 33 44 55'}
                    </span>
                  </div>
                </a>
                <a
                  className="group flex items-center gap-3 transition-colors"
                  href={`https://wa.me/${(data.contact?.whatsapp || '+222 36 77 88 99').replace(/\D/g, '')}`}
                >
                  <div className="bg-deep-green/10 text-deep-green group-hover:bg-primary group-hover:text-deep-green flex h-10 w-10 items-center justify-center rounded-full transition-colors">
                    <span className="material-symbols-outlined">chat</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-500">واتساب</span>
                    <span
                      className="font-display font-bold text-slate-800 dark:text-white"
                      dir="ltr"
                    >
                      {data.contact?.whatsapp || '+222 36 77 88 99'}
                    </span>
                  </div>
                </a>
                <a
                  className="group flex items-center gap-3 transition-colors"
                  href={`mailto:${data.contact?.email || 'info@aleradah-group.mr'}`}
                >
                  <div className="bg-deep-green/10 text-deep-green group-hover:bg-primary group-hover:text-deep-green flex h-10 w-10 items-center justify-center rounded-full transition-colors">
                    <span className="material-symbols-outlined">mail</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-500">
                      البريد الإلكتروني
                    </span>
                    <span className="font-bold text-slate-800 dark:text-white">
                      {data.contact?.email || 'info@aleradah-group.mr'}
                    </span>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
