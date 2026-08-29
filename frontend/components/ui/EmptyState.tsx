import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="animate-fade-in flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-[color:var(--border-glass-strong)] px-6 py-16 text-center">
      {Icon && (
        <div className="glass mb-1 flex h-12 w-12 items-center justify-center rounded-2xl text-[color:var(--accent)]">
          <Icon className="h-5 w-5" strokeWidth={1.5} />
        </div>
      )}
      <p className="text-base font-medium text-[color:var(--text-primary)]">{title}</p>
      {description && (
        <p className="max-w-xs text-sm text-[color:var(--text-secondary)]">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
