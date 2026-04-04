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
        "min-h-[60vh] flex flex-col items-center justify-center",
        className
      )}
    >
      {/* Spinner */}
      <div className="relative">
        {/* Outer ring */}
        <div className="w-16 h-16 rounded-full border-4 border-neutral-200" />
        {/* Inner spinning ring */}
        <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-brand-600 border-t-transparent animate-spin" />
      </div>

      {/* Message */}
      <p className="mt-6 text-neutral-500 font-medium animate-pulse">
        {message}
      </p>
    </div>
  );
}

PageLoader.displayName = "PageLoader";
