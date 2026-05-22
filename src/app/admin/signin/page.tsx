'use client';

import React, { Suspense } from 'react';
import { DashboardSignIn } from '@/components/DashboardSignIn';

export default function SignInPage() {
  return (
    <Suspense>
      <DashboardSignIn />
    </Suspense>
  );
}
