import { Sidebar } from "@/components/Layout/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Sidebar />
      <div id="mn">{children}</div>
    </>
  );
}
