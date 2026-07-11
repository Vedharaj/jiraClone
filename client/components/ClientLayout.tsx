"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useProjectWebSocket } from "@/lib/useProjectWebSocket";
import Sidebar from "./Sidebar";
import { Menu } from "lucide-react";

const ClientLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  useProjectWebSocket();

  useEffect(() => {
    const publicPages = ["/login", "/setup-project"];
    const isPublic = publicPages.includes(pathname);

    // Only redirect if authentication state has been properly loaded
    if (!isAuthenticated && !isPublic) {
      router.push("/login");
    }

    // Close sidebar on page change
    setIsSidebarOpen(false);

    setIsReady(true);
  }, [isAuthenticated, pathname, router]);

  if (!isReady) {
    return <div className="h-screen w-screen bg-white" />;
  }

  const isAuthPage = pathname === "/login" || pathname === "/setup-project";

  return isAuthPage ? (
    children
  ) : (
    <div className="flex min-h-screen flex-col md:flex-row bg-white">
      {/* Mobile Top Header */}
      <header className="flex md:hidden items-center justify-between px-4 py-3 border-b bg-[#F4F5F7] sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-1 rounded hover:bg-gray-200 transition-colors cursor-pointer"
            aria-label="Open sidebar"
          >
            <Menu className="h-6 w-6 text-[#42526E]" />
          </button>
          <span className="text-lg font-bold tracking-tight text-[#172B4D]">
            Jira Clone
          </span>
        </div>
      </header>

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
};

export default ClientLayout;
