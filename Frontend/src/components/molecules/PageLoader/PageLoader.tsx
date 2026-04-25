/**
 * PageLoader Component
 * Full-page loading skeleton for Suspense fallback
 */

import React from "react";
import { cn } from "../../../lib/utils";

export interface PageLoaderProps {
  /** Additional CSS classes */
  className?: string;
  /** Loading message */
  message?: string;
}

export function PageLoader({ className, message = "Loading..." }: PageLoaderProps) {
  return (
    <div
      className={cn(
        "flex min-h-[60vh] flex-col items-center justify-center",
        className
      )}
    >
      {/* Spinner */}
      <div className="relative">
        {/* Outer ring */}
        <div className="h-16 w-16 rounded-full border-4 border-white/10" />
        {/* Inner spinning ring */}
        <div className="absolute inset-0 h-16 w-16 rounded-full border-4 border-brand-400 border-t-transparent animate-spin" />
      </div>

      {/* Message */}
      <p className="mt-6 animate-pulse font-medium text-neutral-300">
        {message}
      </p>
    </div>
  );
}

PageLoader.displayName = "PageLoader";
