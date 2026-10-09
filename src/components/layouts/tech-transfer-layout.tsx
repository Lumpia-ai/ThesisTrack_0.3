import { ProtectedRoute } from '@/components/auth/protected-route';

export function TechTransferLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <ProtectedRoute allowedRole="tech_transfer">{children}</ProtectedRoute>;
}
