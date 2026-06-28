import { useId } from "react";
import type { HTMLAttributes, ReactNode } from "react";

type TooltipProps = HTMLAttributes<HTMLDivElement> & {
  label: string;
  children: ReactNode;
};

export function Tooltip({ label, children, className = "", ...props }: TooltipProps) {
  const tooltipId = useId();

  return (
    <div {...props} className={`tooltip ${className}`.trim()} aria-describedby={tooltipId}>
      {children}
      <span className="tooltip__content" id={tooltipId} role="tooltip">
        {label}
      </span>
    </div>
  );
}
