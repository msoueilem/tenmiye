# GEMINI.md - مجموعة الإرادة لتنمية الغدية (Simple Landing Page)

هذا المستند يوفر سياقاً تعليمياً لـ Gemini للتعامل مع مشروع "مجموعة الإرادة". المشروع هو تطبيق Next.js بسيط يمثل صفحة تعريفية (Landing Page) باللغة العربية.

## نظرة عامة على المشروع (Project Overview)

- **الغرض**: صفحة هبوط لمبادرة تنموية في موريتانيا، تشمل التعريف بالمجموعة، المبادرات، الهيكل التنظيمي، ونماذج تواصل.
- **التقنيات المستخدمة**:
  - **Framework**: Next.js 15 (App Router)
  - **Language**: TypeScript
  - **Styling**: Tailwind CSS 4.0
  - **Backend**: Firebase Firestore (Client SDK)
  - **Formatting/Linting**: Prettier, ESLint

## بنية البيانات (Architecture & Data)

- المشروع يعتمد بالكامل على **Firebase Firestore** لجلب البيانات الديناميكية.
- **قاعدة التسمية**: جميع المجموعات (Collections) في Firestore يجب أن تنتهي باللاحقة `-simple`.
- **المجموعات الرئيسية**:
  - `settings-simple/public`: يحتوي على نصوص الصفحة، عداد الأعضاء، وقائمة المبادرات، وهيكل الفريق.
  - `join-requests-simple`: يخزن طلبات الانضمام المرسلة عبر الاستمارة.
  - `messages-simple`: يخزن الرسائل المرسلة عبر نموذج التواصل.

## تشغيل المشروع (Building & Running)

- **تثبيت المكتبات**: `npm install`
- **التطوير المحلي**: `npm run dev`
- **بناء المشروع**: `npm run build`
- **تنسيق الكود**: `npm run format` (Prettier)
- **فحص الجودة**: `npm run lint` (ESLint)
- **تهيئة البيانات**: `node --env-file=.env scripts/bootstrap.mjs` (لرفع البيانات الأولية لـ Firestore).

## اتفاقيات التطوير (Development Conventions)

- **اللغة والاتجاه**: الواجهة عربية بالكامل (Arabic-only) وتستخدم اتجاه `dir="rtl"`.
- **المكونات**:
  - `TeamHierarchy`: مكون مخصص لعرض الهيكل التنظيمي بشكل شجري، يعتمد على JSON.
  - `JoinForm` & `ContactForm`: مكونات Client-side تتعامل مباشرة مع Firestore.
- **الأنماط**: يتم استخدام Tailwind CSS مع متغيرات مخصصة في `app/globals.css` (مثل `--color-primary` للون الذهبي).
- **الصور**: تعتمد الصور حالياً على روابط خارجية من Google و Picsum كـ Fallbacks.

## ملاحظات هامة للذكاء الاصطناعي

- عند إضافة أي حقل جديد في الصفحة، يجب تحديث `lib/firebase/queries.ts` لتعريف الواجهة (Interface) وتحديث `scripts/bootstrap.mjs` ليشمل البيانات الجديدة.
- دائماً تأكد من هروب علامات الاقتباس في النصوص العربية داخل JSX (استخدم `&quot;`) لتفادي أخطاء ESLint.
- التزم باستخدام اللاحقة `-simple` لأي مجموعة Firestore جديدة يتم إنشاؤها.
