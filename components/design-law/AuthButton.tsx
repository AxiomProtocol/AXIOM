import { useUser } from '@auth0/nextjs-auth0/client';
import Link from 'next/link';

export function AuthButton() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return null;
  }

  if (!user) {
    return (
      <a
        href="/api/auth/login"
        className="inline-block px-3 py-1.5 text-sm border border-dl-border text-dl-navy bg-dl-bg hover:bg-gray-50"
      >
        Sign In
      </a>
    );
  }

  const firstName = user.name?.split(' ')[0] || user.nickname || 'User';

  return (
    <span className="inline-flex items-center gap-2 text-sm text-dl-navy">
      <Link href="/profile" className="hover:underline">
        {firstName}
      </Link>
      <a
        href="/api/auth/logout"
        className="px-2 py-1 border border-dl-border text-dl-gray hover:bg-gray-50 text-xs"
      >
        Sign Out
      </a>
    </span>
  );
}
