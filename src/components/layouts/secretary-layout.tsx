import { ProtectedRoute } from '@/components/auth/protected-route';
import { SecretaryStoreProvider } from '@/components/secretary/secretary-store';

// UI preview of the Defense Secretary module: its pages still show sample data, but only signed-in
// Secretary accounts can open it.
export function SecretaryLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ProtectedRoute allowedRole="secretary">
      <SecretaryStoreProvider>{children}</SecretaryStoreProvider>
    </ProtectedRoute>
  );
}
