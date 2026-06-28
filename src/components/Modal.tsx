import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";

export function Modal({ title, size = "medium", showClose = true, onClose, children }: {
  title: string;
  size?: "small" | "medium" | "large";
  showClose?: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const titleId = useId();
  const contentRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusableSelector = [
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "a[href]",
      "[tabindex]:not([tabindex='-1'])",
    ].join(",");
    const focusable = contentRef.current?.querySelector<HTMLElement>(focusableSelector);
    (focusable || contentRef.current)?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab" || !contentRef.current) return;
      const focusableElements = [...contentRef.current.querySelectorAll<HTMLElement>(focusableSelector)];
      if (!focusableElements.length) {
        event.preventDefault();
        contentRef.current.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, []);

  return (
    <div className="modal active" onMouseDown={onClose}>
      <div
        ref={contentRef}
        className={`modal__content modal__content--${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal__header">
          <h2 className="modal__title" id={titleId}>{title}</h2>
          {showClose && (
            <button className="modal__close btn btn--back btn--square" type="button" aria-label="Close dialog" onClick={onClose}>
              <X aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}
