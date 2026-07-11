"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { HelpCircle, ArrowLeft, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  const handleDashboard = () => {
    router.push("/");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center">
      <div className="max-w-md space-y-6">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-blue-50 text-[#0052CC]">
          <HelpCircle className="h-12 w-12 stroke-[1.5] animate-bounce" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-6xl font-extrabold text-[#172B4D] tracking-tight">404</h1>
          <h2 className="text-2xl font-bold text-[#172B4D]">Page Not Found</h2>
          <p className="text-[#626F86] text-sm leading-relaxed">
            We couldn't find the page you're looking for. It might have been moved, deleted, or never existed in the first place.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Button
            variant="outline"
            onClick={handleBack}
            className="flex items-center justify-center gap-2 border-[#DFE1E6] hover:bg-slate-100 text-[#172B4D] h-10 px-5"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
          <Button
            onClick={handleDashboard}
            className="flex items-center justify-center gap-2 bg-[#0052CC] hover:bg-[#0747A6] text-white h-10 px-5"
          >
            <LayoutDashboard className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
