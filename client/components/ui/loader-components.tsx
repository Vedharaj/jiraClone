"use client";

import React from "react";
import { Loader2 } from "lucide-react";

// Shimmer effect tailwind classes
const SHIMMER = "animate-pulse bg-slate-200 rounded";

export const PageSkeleton = () => {
  return (
    <div className="flex h-full flex-col p-6 space-y-6">
      <div className="space-y-2">
        <div className={`h-8 w-48 ${SHIMMER}`} />
        <div className={`h-4 w-96 ${SHIMMER}`} />
      </div>
      <div className="flex gap-4">
        <div className={`h-10 w-32 ${SHIMMER}`} />
        <div className={`h-10 w-32 ${SHIMMER}`} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
        <div className="border border-slate-200 rounded-lg p-4 space-y-4">
          <div className={`h-6 w-24 ${SHIMMER}`} />
          <div className="space-y-2">
            <div className={`h-24 w-full ${SHIMMER}`} />
            <div className={`h-24 w-full ${SHIMMER}`} />
          </div>
        </div>
        <div className="border border-slate-200 rounded-lg p-4 space-y-4">
          <div className={`h-6 w-24 ${SHIMMER}`} />
          <div className="space-y-2">
            <div className={`h-24 w-full ${SHIMMER}`} />
          </div>
        </div>
        <div className="border border-slate-200 rounded-lg p-4 space-y-4">
          <div className={`h-6 w-24 ${SHIMMER}`} />
          <div className="space-y-2">
            <div className={`h-24 w-full ${SHIMMER}`} />
            <div className={`h-24 w-full ${SHIMMER}`} />
            <div className={`h-24 w-full ${SHIMMER}`} />
          </div>
        </div>
      </div>
    </div>
  );
};

export const CardSkeleton = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map((n) => (
        <div key={n} className="border border-slate-100 rounded-lg p-5 bg-white space-y-4 shadow-sm">
          <div className="flex justify-between">
            <div className="space-y-2 flex-1 mr-4">
              <div className={`h-5 w-3/4 ${SHIMMER}`} />
              <div className={`h-4 w-1/2 ${SHIMMER}`} />
            </div>
            <div className={`h-6 w-12 ${SHIMMER}`} />
          </div>
          <div className={`h-12 w-full ${SHIMMER}`} />
          <div className="flex gap-3">
            <div className={`h-5 w-20 ${SHIMMER}`} />
            <div className={`h-5 w-20 ${SHIMMER}`} />
          </div>
        </div>
      ))}
    </div>
  );
};

export const TableSkeleton = ({ rows = 4, cols = 4 }: { rows?: number; cols?: number }) => {
  return (
    <div className="w-full border border-slate-200 rounded-lg overflow-hidden bg-white">
      <div className="bg-[#F4F5F7] border-b border-slate-200 px-6 py-4 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className={`h-4 flex-1 ${SHIMMER}`} />
        ))}
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-6 py-5 flex gap-4">
            {Array.from({ length: cols }).map((_, j) => (
              <div key={j} className={`h-5 flex-1 ${SHIMMER}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

import { Button } from "./button";

export const ButtonLoader = ({ 
  loading, 
  children, 
  variant, 
  size, 
  ...props 
}: { 
  loading: boolean; 
  children: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
} & React.ComponentPropsWithoutRef<typeof Button>) => {
  return (
    <Button
      variant={variant}
      size={size}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
      {children}
    </Button>
  );
};

export const UploadLoader = ({ progress }: { progress: number }) => {
  return (
    <div className="w-full space-y-1">
      <div className="flex justify-between text-xs text-[#626F86] font-medium">
        <span>Uploading...</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="h-1.5 w-full bg-[#DFE1E6] rounded-full overflow-hidden">
        <div 
          className="h-full bg-[#0C66E4] transition-all duration-150 ease-out" 
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};
