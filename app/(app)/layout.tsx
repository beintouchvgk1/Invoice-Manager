import { Sidebar } from "@/components/Layout/Sidebar";
import { SidebarProvider } from "@/components/Layout/SidebarContext";
import { OfflineBanner } from "@/components/Offline/OfflineBanner";
import { SyncEngineMount } from "@/components/Offline/SyncEngineMount";
import { ConnectivityToast } from "@/components/Offline/ConnectivityToast";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <SyncEngineMount />
      <ConnectivityToast />
      <Sidebar />
      <div id="mn">
        <OfflineBanner />
        {children}
      </div>
    </SidebarProvider>
  );
}
