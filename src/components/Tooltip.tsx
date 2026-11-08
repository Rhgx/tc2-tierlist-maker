import { useId } from "react";
import type { HTMLAttributes, ReactNode } from "react";

type TooltipProps = HTMLAttributes<HTMLDivElement> & {
  label: string;
  /** Optional secondary line shown under the label. */
  detail?: string;
  children: ReactNode;
};

export function Tooltip({ label, detail, children, className = "", ...props }: TooltipProps) {
  const tooltipId = useId();

  return (
    <div {...props} className={`tooltip ${className}`.trim()} aria-describedby={tooltipId}>
      {children}
      <span className="tooltip__content" id={tooltipId} role="tooltip">
        {label}
        {detail && <span className="tooltip__detail">{detail}</span>}
      </span>
    </div>
  );
}
