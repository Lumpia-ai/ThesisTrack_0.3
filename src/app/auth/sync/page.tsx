import { Suspense } from 'react';
import { AuthSyncPage } from '@/components/auth/auth-sync-page';

export const metadata = {
  title: 'Signing In - ThesisTrack'
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AuthSyncPage />
    </Suspense>
  );
}
