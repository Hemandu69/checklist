import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "glass h-11 w-full rounded-xl px-4 text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-tertiary)]",
          "outline-none transition-colors focus:border-[color:var(--accent)]",
          className
        )}
        {...props}
      />
    );
  }
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "glass w-full resize-none rounded-xl px-4 py-3 text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-tertiary)]",
        "outline-none transition-colors focus:border-[color:var(--accent)]",
        className
      )}
      {...props}
    />
  );
});
