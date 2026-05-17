import { X } from "lucide-react";
import type { ReactNode } from "react";

export function Modal({ title, size = "medium", showClose = true, onClose, children }: {
  title: string;
  size?: "small" | "medium" | "large";
  showClose?: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="modal active">
      <div className={`modal__content modal__content--${size}`}>
        <div className="modal__header">
          <h2 className="modal__title">{title}</h2>
          {showClose && <button className="modal__close btn btn--back btn--square" onClick={onClose}><X /></button>}
        </div>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}
