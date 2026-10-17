import type { ComponentChildren } from "preact";
import { cloneElement, isValidElement, toChildArray } from "preact";
import { cn } from "#/utils/cn";
import { Glass } from "../glass";

export interface StepProps {
  children: ComponentChildren;
  className?: string;
}

export interface StepsProps {
  children: ComponentChildren;
  className?: string;
}

interface NumberedStepProps extends StepProps {
  isLast?: boolean;
  stepNumber?: number;
}

export function Step({ children, className, isLast = false, stepNumber = 1 }: NumberedStepProps) {
  return (
    <li
      class={cn("relative grid grid-cols-[2rem_minmax(0,1fr)] gap-x-4 pb-10 last:pb-0", className)}
    >
      <Glass
        aria-hidden="true"
        class="bg-background text-foreground relative z-10 flex size-10 items-center justify-center rounded-full border text-sm font-semibold"
      >
        {stepNumber}
      </Glass>

      {!isLast && <span aria-hidden="true" class="absolute top-8 bottom-0 left-5 w-px bg-black" />}

      <div class="min-w-0 [&>:first-child]:mt-0 [&>:last-child]:mb-0">{children}</div>
    </li>
  );
}

export function Steps({ children, className }: StepsProps) {
  return (
    <ol class={cn("my-6 list-none p-0", className)}>
      {toChildArray(children).map((child, index, steps) =>
        isValidElement(child)
          ? cloneElement(child, { isLast: index === steps.length - 1, stepNumber: index + 1 })
          : child,
      )}
    </ol>
  );
}
