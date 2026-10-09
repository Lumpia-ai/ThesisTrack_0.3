import { ProtectedRoute } from '@/components/auth/protected-route';
import { FocalPersonScopeProvider } from '@/components/focal-person/focal-person-store';

export function FocalPersonLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ProtectedRoute allowedRole="focal_person">
      <FocalPersonScopeProvider>{children}</FocalPersonScopeProvider>
    </ProtectedRoute>
  );
}
