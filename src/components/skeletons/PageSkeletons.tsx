import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function NetworkSkeleton() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>

      {/* Search Bar */}
      <Skeleton className="h-10 w-full rounded-md" />

      {/* Filters */}
      <div className="flex gap-2">
        <Skeleton className="h-8 w-28 rounded-full" />
        <Skeleton className="h-8 w-32 rounded-full" />
      </div>

      {/* Stats */}
      <Skeleton className="h-4 w-24" />

      {/* Connections List */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="bg-card border-border p-4">
            <div className="flex items-center gap-4">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Back Button */}
      <Skeleton className="h-10 w-32" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-28" />
      </div>

      {/* Profile Card */}
      <Card className="bg-card border-border p-6">
        <div className="flex items-start gap-4">
          <Skeleton className="w-20 h-20 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-border space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </Card>

      {/* Contact Information */}
      <Card className="bg-card border-border p-6 space-y-4">
        <Skeleton className="h-6 w-40 mb-4" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <div className="space-y-1">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        ))}
      </Card>

      {/* Share Button */}
      <Skeleton className="h-12 w-full rounded-md" />
    </div>
  );
}

export function AnalyticsSkeleton() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Back Button */}
      <Skeleton className="h-10 w-32" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-4 w-48 mt-1" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="bg-card border-border p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div>
                <Skeleton className="h-7 w-12 mb-1" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card className="bg-card border-border p-6">
        <Skeleton className="h-6 w-36 mb-4" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </Card>

      {/* Location & Device */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-card border-border p-6">
          <Skeleton className="h-6 w-28 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-8" />
              </div>
            ))}
          </div>
        </Card>
        <Card className="bg-card border-border p-6">
          <Skeleton className="h-6 w-20 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-8" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

export function ConnectionDetailSkeleton() {
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Back Button */}
      <Skeleton className="h-10 w-36" />

      {/* Profile Header */}
      <div className="text-center space-y-4">
        <Skeleton className="w-24 h-24 rounded-full mx-auto" />
        <div className="space-y-2">
          <Skeleton className="h-9 w-48 mx-auto" />
          <Skeleton className="h-5 w-32 mx-auto" />
          <Skeleton className="h-4 w-28 mx-auto" />
        </div>
      </div>

      {/* Contact Information */}
      <Card className="bg-card border-border p-6 space-y-4">
        <Skeleton className="h-7 w-40 mb-4" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-4 w-40" />
          </div>
        ))}
      </Card>

      {/* Notes */}
      <Card className="bg-card border-border p-6">
        <Skeleton className="h-7 w-16 mb-4" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4" />
      </Card>

      {/* Action Button */}
      <Skeleton className="h-14 w-full rounded-md" />
    </div>
  );
}

export function MeetingDetailSkeleton() {
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Back Button */}
      <Skeleton className="h-10 w-20 mb-4" />

      {/* Meeting Header */}
      <Card className="bg-card border-border p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-8 w-8" />
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>

        <Skeleton className="h-4 w-full mt-4" />
        <Skeleton className="h-4 w-3/4 mt-2" />

        <Skeleton className="h-10 w-full mt-4 rounded-md" />
      </Card>

      {/* Participants */}
      <Card className="bg-card border-border p-6">
        <Skeleton className="h-6 w-28 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </Card>

      {/* Actions */}
      <div className="space-y-3">
        <Skeleton className="h-12 w-full rounded-md" />
        <Skeleton className="h-12 w-full rounded-md" />
      </div>
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <Skeleton className="h-8 w-24 mb-2" />
        <Skeleton className="h-4 w-48" />
      </div>

      {/* Settings Cards */}
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="bg-card border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div>
                <Skeleton className="h-5 w-32 mb-1" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
            <Skeleton className="h-5 w-5" />
          </div>
        </Card>
      ))}

      {/* Logout Button */}
      <Skeleton className="h-12 w-full rounded-md mt-8" />
    </div>
  );
}

export function ScheduleSkeleton() {
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <Skeleton className="h-8 w-40 mb-2" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* Meeting Title */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>

      {/* Calendar */}
      <Card className="bg-card border-border p-6">
        <Skeleton className="h-5 w-24 mb-4" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </Card>

      {/* Time Slots */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded-md" />
          ))}
        </div>
      </div>

      {/* Participants */}
      <Card className="bg-card border-border p-4">
        <Skeleton className="h-5 w-24 mb-4" />
        <Skeleton className="h-10 w-full rounded-md" />
      </Card>

      {/* Submit Button */}
      <Skeleton className="h-14 w-full rounded-md" />
    </div>
  );
}
