# مجموعة الإرادة لتنمية الغدية - الصفحة التعريفية

هذا المشروع هو الصفحة التعريفية (Landing Page) لمجموعة الإرادة، مبني باستخدام Next.js (App Router)، TypeScript، و Tailwind CSS. يتم جلب البيانات ديناميكياً من Firebase Firestore.

## متطلبات التشغيل

- Node.js (الإصدار 18 أو أحدث)
- حساب Firebase مع تفعيل Firestore

## إعداد بيئة العمل

1. قم بتثبيت المكتبات المطلوبة:

   ```bash
   npm install
   ```

2. قم بإنشاء ملف `.env` في المجلد الرئيسي وأضف مفاتيح Firebase الخاصة بك (تم إعداد الملف مسبقاً بالقيم التي قدمتها):

   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tenmiye-gdy.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=tenmiye-gdy
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tenmiye-gdy.firebasestorage.app
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=414092387059
   NEXT_PUBLIC_FIREBASE_APP_ID=1:414092387059:web:...
   ```

3. تشغيل المشروع في بيئة التطوير:
   ```bash
   npm run dev
   ```

## إعداد قاعدة البيانات (Firestore)

يجب إنشاء مستند واحد في Firestore لجعل الصفحة تعمل:

- **المجموعة (Collection):** `settings-simple`
- **المستند (Document):** `public`

### الحقول المطلوبة (Fields):

- `aboutText` (string): نص "من نحن".
- `membersCount` (number): عدد الأعضاء.
- `contact` (map):
  - `whatsapp` (string)
  - `phone` (string)
  - `email` (string)
  - `address` (string)
- `initiatives` (array of maps):
  - `title` (string)
  - `description` (string)
- `teamHierarchy` (map): هيكل الفريق (انظر المثال أدناه).

### مثال لـ JSON الهيكل التنظيمي (teamHierarchy):

```json
{
  "teams": [
    {
      "team_name": "الإدارة العليا",
      "head": {
        "name": "أ. محمد بن عبدالله",
        "title": "رئيس المجموعة",
        "photo": "رابط_الصورة"
      },
      "members": [
        {
          "name": "د. خالد الرحمن",
          "title": "نائب الرئيس",
          "photo": "رابط_الصورة"
        },
        {
          "name": "أ. سعيد العمري",
          "title": "المشرف المالي",
          "photo": "رابط_الصورة"
        },
        {
          "name": "م. فهد الزهراني",
          "title": "العلاقات العامة",
          "photo": "رابط_الصورة"
        }
      ]
    }
  ]
}
```

## ملاحظات هامة

- تأكد من أن قواعد الحماية في Firestore تسمح بالقراءة العامة (Public Read) للمستند `settings-simple/public`.
- الصفحة تدعم الوضع الليلي (Dark Mode) وتستخدم خطوط Noto Sans Arabic.
