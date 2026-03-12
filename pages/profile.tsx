import { useUser } from '@auth0/nextjs-auth0/client';
import { DesignLawLayout } from '../components/design-law/DesignLawLayout';

export default function ProfilePage() {
  const { user, isLoading, error } = useUser();

  return (
    <DesignLawLayout>
      <div className="max-w-xl mx-auto">
        <h1 className="font-dl-serif text-2xl text-dl-navy mb-6">Profile</h1>

        {isLoading && (
          <p className="text-sm text-dl-gray">Loading…</p>
        )}

        {error && (
          <div className="border border-red-400 bg-red-50 p-4 text-sm text-red-700">
            {error.message}
          </div>
        )}

        {!isLoading && !user && (
          <div className="border border-dl-border p-6 text-center">
            <p className="text-sm text-dl-gray mb-4">You are not signed in.</p>
            <a
              href="/api/auth/login"
              className="inline-block px-4 py-2 text-sm bg-dl-navy text-white hover:opacity-90"
            >
              Sign In
            </a>
          </div>
        )}

        {user && (
          <div className="border border-dl-border">
            <div className="p-6 flex items-center gap-4 border-b border-dl-border">
              {user.picture && (
                <img
                  src={user.picture}
                  alt={user.name || 'Avatar'}
                  width={64}
                  height={64}
                  className="border border-dl-border"
                />
              )}
              <div>
                <p className="font-dl-serif text-lg text-dl-navy">{user.name}</p>
                <p className="text-sm text-dl-gray">{user.email}</p>
              </div>
            </div>
            <div className="p-6 space-y-3 text-sm">
              <div className="flex justify-between border-b border-dl-border pb-2">
                <span className="text-dl-gray font-dl-mono">sub</span>
                <span className="text-dl-navy">{user.sub}</span>
              </div>
              {user.email_verified !== undefined && (
                <div className="flex justify-between border-b border-dl-border pb-2">
                  <span className="text-dl-gray font-dl-mono">email_verified</span>
                  <span className="text-dl-navy">{String(user.email_verified)}</span>
                </div>
              )}
              {user.nickname && (
                <div className="flex justify-between border-b border-dl-border pb-2">
                  <span className="text-dl-gray font-dl-mono">nickname</span>
                  <span className="text-dl-navy">{user.nickname}</span>
                </div>
              )}
              {user.updated_at && (
                <div className="flex justify-between">
                  <span className="text-dl-gray font-dl-mono">updated_at</span>
                  <span className="text-dl-navy">{user.updated_at}</span>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-dl-border">
              <a
                href="/api/auth/logout"
                className="inline-block px-4 py-2 text-sm border border-dl-border text-dl-navy hover:bg-gray-50"
              >
                Sign Out
              </a>
            </div>
          </div>
        )}
      </div>
    </DesignLawLayout>
  );
}
