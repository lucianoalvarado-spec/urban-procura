import { ProveedorProvider } from "@/lib/state/proveedor-context";
import { CrmProvider } from "@/lib/state/crm-context";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { DemoBanner } from "@/components/layout/demo-banner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProveedorProvider>
      <CrmProvider>
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar />
            <MobileNav />
            <DemoBanner />
            <main className="flex-1 bg-[var(--background)] p-4 md:p-6">{children}</main>
          </div>
        </div>
      </CrmProvider>
    </ProveedorProvider>
  );
}
