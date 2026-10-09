import { ProtectedRoute } from '@/components/auth/protected-route';

export function ProgramHeadLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <ProtectedRoute allowedRole="program_head">{children}</ProtectedRoute>;
}
