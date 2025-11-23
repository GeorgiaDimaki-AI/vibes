export function LoadingSkeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
      role="status"
      aria-label="Loading..."
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 space-y-4">
      <LoadingSkeleton className="h-6 w-1/3" />
      <LoadingSkeleton className="h-4 w-full" />
      <LoadingSkeleton className="h-4 w-5/6" />
      <LoadingSkeleton className="h-4 w-4/6" />
    </div>
  );
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ButtonSkeleton({ className = '' }: { className?: string }) {
  return (
    <LoadingSkeleton className={`h-10 w-24 ${className}`} />
  );
}
