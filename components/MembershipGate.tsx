import React from 'react';
import Link from 'next/link';

interface MembershipGateProps {
  children: React.ReactNode;
  membershipStatus?: 'applicant' | 'member' | 'suspended' | 'removed' | null;
  requireMember?: boolean;
  fallback?: React.ReactNode;
  showJoinPrompt?: boolean;
}

export default function MembershipGate({
  children,
  membershipStatus,
  requireMember = true,
  fallback,
  showJoinPrompt = true
}: MembershipGateProps) {
  const isMember = membershipStatus === 'member';
  const isApplicant = membershipStatus === 'applicant';
  const isSuspended = membershipStatus === 'suspended';
  const isRemoved = membershipStatus === 'removed';

  if (requireMember && !isMember) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showJoinPrompt) {
      return (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          {isApplicant && (
            <>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Application Pending
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Your membership application is being reviewed. Once approved, you will have access to participate in pools, vote on proposals, and engage with the community.
              </p>
              <Link
                href="/pma"
                className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                View Membership Status
              </Link>
            </>
          )}

          {isSuspended && (
            <>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Membership Suspended
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Your membership has been temporarily suspended. Please contact support for more information about reinstating your membership.
              </p>
            </>
          )}

          {isRemoved && (
            <>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Membership Ended
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Your membership is no longer active. If you believe this is an error, please contact support.
              </p>
            </>
          )}

          {!membershipStatus && (
            <>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Membership Required
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                This action requires PMA membership. Join Axiom Protocol to participate in pools, vote on proposals, and engage with the community coordination system.
              </p>
              <Link
                href="/join"
                className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Become a Member
              </Link>
              <p className="mt-4 text-sm text-gray-500">
                Already a member?{' '}
                <Link href="/login" className="text-amber-600 hover:underline">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      );
    }

    return null;
  }

  return <>{children}</>;
}

export function MemberBadge({ status }: { status: string }) {
  const badges: Record<string, { bg: string; text: string; label: string }> = {
    member: { bg: 'bg-green-100', text: 'text-green-800', label: 'Active Member' },
    applicant: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
    suspended: { bg: 'bg-red-100', text: 'text-red-800', label: 'Suspended' },
    removed: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Inactive' },
  };

  const badge = badges[status] || badges.removed;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
      {badge.label}
    </span>
  );
}
