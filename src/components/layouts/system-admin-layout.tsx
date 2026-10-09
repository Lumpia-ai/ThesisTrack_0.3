import { ProtectedRoute } from '@/components/auth/protected-route';

export function SystemAdminLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <ProtectedRoute allowedRole="system_admin">{children}</ProtectedRoute>;
}
