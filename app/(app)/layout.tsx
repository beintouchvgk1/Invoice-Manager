import { Sidebar } from "@/components/Layout/Sidebar";
import { SidebarProvider } from "@/components/Layout/SidebarContext";
import { OfflineBanner } from "@/components/Offline/OfflineBanner";
import { SyncEngineMount } from "@/components/Offline/SyncEngineMount";
import { ConnectivityToast } from "@/components/Offline/ConnectivityToast";
import { RoutePrecache } from "@/components/Offline/RoutePrecache";
import { CacheWarmer } from "@/components/Offline/CacheWarmer";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <SyncEngineMount />
      <RoutePrecache />
      <CacheWarmer />
      <ConnectivityToast />
      <Sidebar />
      <div id="mn">
        <OfflineBanner />
        {children}
      </div>
    </SidebarProvider>
  );
}
