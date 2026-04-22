import React from 'react';
import Link from 'next/link';

interface CaseCardProps {
  id: number;
  caseTitle: string;
  ancestorPrimaryName: string;
  status: string;
  jurisdictionCode?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export default function CaseCard({
  id,
  caseTitle,
  ancestorPrimaryName,
  status,
  jurisdictionCode,
  createdAt,
  updatedAt,
}: CaseCardProps) {
  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    paused: 'bg-yellow-100 text-yellow-800',
    archived: 'bg-gray-100 text-gray-600',
    complete: 'bg-blue-100 text-blue-800',
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Link href={`/workbook/case/${id}`}>
      <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md hover:border-amber-300 transition cursor-pointer">
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-semibold text-gray-900 text-lg">{caseTitle}</h3>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-100 text-gray-600'}`}>
            {status}
          </span>
        </div>

        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Ancestor:</span>
            <span>{ancestorPrimaryName}</span>
          </div>

          {jurisdictionCode && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Jurisdiction:</span>
              <span>{jurisdictionCode}</span>
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-500">
          <span>Created {formatDate(createdAt)}</span>
          <span>Updated {formatDate(updatedAt)}</span>
        </div>
      </div>
    </Link>
  );
}
