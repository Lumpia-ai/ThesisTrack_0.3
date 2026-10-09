import { ProtectedRoute } from '@/components/auth/protected-route';

export function StudentLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <ProtectedRoute allowedRole="student">{children}</ProtectedRoute>;
}
