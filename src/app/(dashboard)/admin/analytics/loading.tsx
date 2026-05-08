import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-48 w-full" />
      </CardContent>
    </Card>
  );
}

export default function AdminAnalyticsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-8 w-28" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} size="sm">
            <CardHeader className="flex flex-row items-center justify-between pb-0">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="size-8 rounded-md" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-3 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ChartSkeleton />
        </div>
        <ChartSkeleton />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    </div>
  );
}
