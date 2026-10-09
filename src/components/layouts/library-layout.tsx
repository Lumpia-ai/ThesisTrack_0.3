import { ProtectedRoute } from '@/components/auth/protected-route';

export function LibraryLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <ProtectedRoute allowedRole="library">{children}</ProtectedRoute>;
}
