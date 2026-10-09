import { ProtectedRoute } from '@/components/auth/protected-route';

export function ResearchHeadLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  // focal_person: Research Focal Persons use this portal until they have their own. The data APIs
  // behind it still only serve research_head/admin, so their data access isn't widened by this.
  return <ProtectedRoute allowedRole={['research_head', 'admin', 'focal_person']}>{children}</ProtectedRoute>;
}
