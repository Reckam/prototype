import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <DashboardLayout role="admin">
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-6">
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
      <div className="grid gap-6 md:grid-cols-1">
        <Skeleton className="h-96 rounded-lg" />
      </div>
    </DashboardLayout>
  );
}
