import { Sidebar } from "@/components/Layout/Sidebar";
import { SidebarProvider } from "@/components/Layout/SidebarContext";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <Sidebar />
      <div id="mn">{children}</div>
    </SidebarProvider>
  );
}
