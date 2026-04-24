import { useEffect, useState } from "react";

interface ContractStatusBadgeProps {
  propertyId: string;
}

interface ContractStatus {
  status: string;
  substatus?: string;
  updatedAt?: string;
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-200 text-gray-800",
  intake: "bg-blue-100 text-blue-800",
  under_review: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  in_execution: "bg-purple-100 text-purple-800",
  completed: "bg-green-200 text-green-900",
  blocked: "bg-red-100 text-red-800",
  rejected: "bg-red-200 text-red-900",
  archived: "bg-gray-300 text-gray-900",
  "Not Linked": "bg-gray-100 text-gray-500",
};

export default function ContractStatusBadge({ propertyId }: ContractStatusBadgeProps) {
  const [status, setStatus] = useState<ContractStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/contracts/v1/entities/${propertyId}/status`)
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(data => setStatus(data))
      .catch(() => setError("Failed to load contract status."))
      .finally(() => setLoading(false));
  }, [propertyId]);

  if (loading) return <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-500">Loading...</span>;
  if (error || !status)
    return <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-500" title="Not Linked">Not Linked</span>;

  const color = statusColors[status.status] || statusColors["Not Linked"];
  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${color}`} title={status.status}>
      {status.status}
    </span>
  );
}
