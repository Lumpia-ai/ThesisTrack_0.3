import { redirect } from 'next/navigation';

// Account requests live inside User Management; keep the old address working.
export default function Page() {
  redirect('/program-head/users?tab=requests');
}
