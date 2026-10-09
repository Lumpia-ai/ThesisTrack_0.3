import LandingPage from '../page';
import { AuthRouteModal } from '@/components/auth/auth-route-modal';

export const metadata = {
  title: 'Reset Password - ThesisTrack'
};

// The landing page with the auth modal open on the matching view (see AuthRouteModal).
export default function Page() {
  return (
    <>
      <LandingPage />
      <AuthRouteModal initialView="reset" />
    </>
  );
}
