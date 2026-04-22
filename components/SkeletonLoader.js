export function SkeletonCard({ className = '' }) {
  return (
    <div className={`animate-pulse bg-gray-800 rounded-xl p-6 ${className}`}>
      <div className="h-4 bg-gray-700 rounded w-3/4 mb-4"></div>
      <div className="space-y-3">
        <div className="h-3 bg-gray-700 rounded"></div>
        <div className="h-3 bg-gray-700 rounded w-5/6"></div>
      </div>
    </div>
  );
}

export function SkeletonStats({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array(count).fill(0).map((_, i) => (
        <div key={i} className="animate-pulse bg-gray-800 rounded-xl p-4">
          <div className="h-8 bg-gray-700 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-700 rounded w-3/4"></div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonWeeklySummary() {
  return (
    <div className="animate-pulse bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-xl p-6 border border-purple-500/20">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gray-700 rounded-full"></div>
        <div>
          <div className="h-5 bg-gray-700 rounded w-40 mb-2"></div>
          <div className="h-3 bg-gray-700 rounded w-24"></div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {Array(4).fill(0).map((_, i) => (
          <div key={i} className="bg-gray-800/50 rounded-lg p-3">
            <div className="h-6 bg-gray-700 rounded w-1/2 mb-1"></div>
            <div className="h-3 bg-gray-700 rounded w-3/4"></div>
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <div className="h-4 bg-gray-700 rounded w-1/4 mb-2"></div>
        <div className="h-3 bg-gray-700 rounded"></div>
        <div className="h-3 bg-gray-700 rounded w-5/6"></div>
        <div className="h-3 bg-gray-700 rounded w-4/5"></div>
      </div>
    </div>
  );
}

export function SkeletonQuickActions() {
  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <div className="h-5 bg-gray-700 rounded w-32 mb-4"></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array(4).fill(0).map((_, i) => (
          <div key={i} className="animate-pulse bg-gray-700 rounded-lg p-4 text-center">
            <div className="w-8 h-8 bg-gray-600 rounded mx-auto mb-2"></div>
            <div className="h-3 bg-gray-600 rounded w-3/4 mx-auto"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div className="animate-pulse space-y-3">
      {Array(rows).fill(0).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg">
          <div className="w-10 h-10 bg-gray-700 rounded-full"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-700 rounded w-1/3 mb-2"></div>
            <div className="h-3 bg-gray-700 rounded w-1/4"></div>
          </div>
          <div className="h-6 bg-gray-700 rounded w-16"></div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      <SkeletonWeeklySummary />
      <SkeletonQuickActions />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}

export default function SkeletonLoader({ type = 'card', ...props }) {
  switch (type) {
    case 'card': return <SkeletonCard {...props} />;
    case 'stats': return <SkeletonStats {...props} />;
    case 'weekly': return <SkeletonWeeklySummary {...props} />;
    case 'actions': return <SkeletonQuickActions {...props} />;
    case 'table': return <SkeletonTable {...props} />;
    case 'dashboard': return <SkeletonDashboard {...props} />;
    default: return <SkeletonCard {...props} />;
  }
}
