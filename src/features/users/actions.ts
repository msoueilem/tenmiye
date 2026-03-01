'use server';

import { adminAuth, adminDb } from '@/lib/firebase/admin';

/**
 * Temp Auth Flow (To be replaced with Firebase Phone Auth / Google SMS)
 * Required Env Var: VOTER_BYPASS_CODE (e.g. 1234)
 */
export async function getVoterTokenAction(idToken: string) {
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const phoneNumber = decodedToken.phone_number;
    
    if (!phoneNumber) {
      return { success: false, error: 'لم يتم العثور على رقم هاتف صالح في الجلسة.' };
    }

    // Usually phone numbers are stored locally without the country code, e.g. "36463831"
    // Let's strip the +222 prefix if it exists to match the database format
    let localPhone = phoneNumber;
    if (localPhone.startsWith('+222')) {
      localPhone = localPhone.slice(4);
    }

    const usersRef = adminDb.collection('users-simple');
    // Try both formats just in case
    const query = await usersRef.where('phoneNumber', 'in', [localPhone, phoneNumber]).limit(1).get();
    
    if (query.empty) {
      return { success: false, error: 'رقم الهاتف غير مسجل في النظام.' };
    }
    
    const userDoc = query.docs[0];
    const userData = userDoc.data();
    
    if (userData.status !== 'active') {
      return { success: false, error: 'الحساب غير مفعل.' };
    }
    
    // Create custom token using Firestore doc ID as UID
    const customToken = await adminAuth.createCustomToken(userDoc.id);
    
    return { success: true, token: customToken, userId: userDoc.id };
  } catch (error: any) {
    console.error('Error in getVoterTokenAction:', error);
    return { success: false, error: 'حدث خطأ في الخادم أثناء التحقق.' };
  }
}
