import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ProfileCardSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header with gradient */}
      <div className="bg-gradient-to-b from-primary/20 to-background pt-12 pb-20 px-4">
        <div className="max-w-lg mx-auto text-center">
          {/* Avatar skeleton */}
          <Skeleton className="w-28 h-28 rounded-full mx-auto mb-4" />
          
          {/* Name skeleton */}
          <Skeleton className="h-8 w-48 mx-auto mb-2" />
          
          {/* Title skeleton */}
          <Skeleton className="h-5 w-32 mx-auto mb-1" />
          
          {/* Company skeleton */}
          <Skeleton className="h-4 w-24 mx-auto" />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-8 space-y-6 pb-12">
        {/* Bio skeleton */}
        <Card className="bg-card border-border p-6">
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </Card>

        {/* Contact Info skeleton */}
        <Card className="bg-card border-border p-6 space-y-4">
          <Skeleton className="h-4 w-24 mb-4" />
          
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-4 w-40" />
            </div>
          ))}
        </Card>

        {/* Action Buttons skeleton */}
        <Card className="bg-card border-border p-6 space-y-3">
          <Skeleton className="h-14 w-full rounded-md" />
          <Skeleton className="h-14 w-full rounded-md" />
        </Card>
      </div>
    </div>
  );
}

export function ProfileListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="bg-card border-border p-4">
          <div className="flex items-center gap-4">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export function ConnectionCardSkeleton() {
  return (
    <Card className="bg-card border-border p-4">
      <div className="flex items-center gap-4">
        <Skeleton className="w-14 h-14 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </Card>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <Card key={i} className="bg-card border-border p-4">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-16" />
          </Card>
        ))}
      </div>

      {/* QR Code card */}
      <Card className="bg-card border-border p-6">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="w-48 h-48 rounded-lg" />
          <Skeleton className="h-4 w-32" />
        </div>
      </Card>

      {/* Recent connections */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-36" />
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-card border-border p-3">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-28 mb-1" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
