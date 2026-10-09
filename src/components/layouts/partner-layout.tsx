import { ProtectedRoute } from '@/components/auth/protected-route';

export function PartnerLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <ProtectedRoute allowedRole="partner">{children}</ProtectedRoute>;
}
