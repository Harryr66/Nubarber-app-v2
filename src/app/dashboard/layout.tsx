"use client";

import { useState, useEffect, Suspense } from 'react';
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AuthProvider } from "@/hooks/use-auth";
import { Loader2 } from 'lucide-react';

function DashboardLoading() {
    return (
        <div className="flex h-full w-full items-center justify-center p-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <DashboardLoading />;
  }

  return (
      <div>
        <SidebarProvider>
          <AuthProvider>
            <DashboardSidebar />
            <SidebarInset>
               <Suspense fallback={<DashboardLoading />}>
                  <div className="p-4 sm:p-6 lg:p-8">
                    {children}
                  </div>
               </Suspense>
            </SidebarInset>
          </AuthProvider>
        </SidebarProvider>
      </div>
  );
}
