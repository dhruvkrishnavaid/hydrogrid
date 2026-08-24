import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border-2 border-kyuri-green bg-white-chalk px-4 py-2.5 text-sm text-blind-forest shadow-sm transition-all duration-200 placeholder:text-blind-forest/50 focus-visible:outline-none focus-visible:border-tobiko-orange focus-visible:ring-2 focus-visible:ring-tobiko-orange/30 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
