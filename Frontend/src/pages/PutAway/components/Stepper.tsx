/**
 * Stepper Component
 * Compact workflow step indicator
 */

import React, { memo } from "react";
import { cn } from "../../../lib/utils";
import { CheckCircle2, ScanLine, MapPin, Check } from "lucide-react";

interface Step {
  id: number;
  label: string;
  icon: React.ElementType;
}

const steps: Step[] = [
  { id: 1, label: "Select", icon: CheckCircle2 },
  { id: 2, label: "Scan", icon: ScanLine },
  { id: 3, label: "Location", icon: MapPin },
  { id: 4, label: "Confirm", icon: Check },
];

interface StepperProps {
  currentStep: number;
  className?: string;
}

export const Stepper = memo(function Stepper({
  currentStep,
  className,
}: StepperProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between relative">
        {/* Progress Line Background */}
        <div className="absolute left-0 right-0 top-5 h-1 bg-neutral-100 rounded-full" />

        {/* Progress Line Fill */}
        <div
          className="absolute left-0 top-5 h-1 bg-brand-500 rounded-full transition-all duration-500"
          style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
        />

        {/* Steps */}
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const isPending = currentStep < step.id;
          const Icon = step.icon;

          return (
            <div
              key={step.id}
              className="relative flex flex-col items-center z-10"
            >
              {/* Step Circle */}
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2",
                  isCompleted &&
                    "bg-brand-500 border-brand-500 text-white shadow-md",
                  isCurrent &&
                    "bg-white border-brand-500 text-brand-600 shadow-lg shadow-brand-500/25 scale-110",
                  isPending &&
                    "bg-white border-neutral-200 text-neutral-400"
                )}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>

              {/* Step Label */}
              <span
                className={cn(
                  "mt-2 text-xs font-medium transition-colors duration-200",
                  isCompleted && "text-brand-600",
                  isCurrent && "text-brand-700 font-semibold",
                  isPending && "text-neutral-400"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});
