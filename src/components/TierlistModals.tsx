import { Check, ClipboardCopy, Download, GripVertical, X } from "lucide-react";
import { Modal } from "./Modal";
import type { ModalName } from "../appTypes";
import type { TierConfig } from "../types";

export function TierlistModals({ modal, tierConfig, screenshotUrl, copyState, onClose, onReset, onAddTier, onDeleteTier, onTierColorChange, onTierLabelChange, onCopyScreenshot, onDownloadScreenshot }: {
  modal: ModalName;
  tierConfig: TierConfig[];
  screenshotUrl: string;
  copyState: "idle" | "copied";
  onClose: () => void;
  onReset: () => void;
  onAddTier: () => void;
  onDeleteTier: (tierId: string) => void;
  onTierColorChange: (tierId: string, color: string) => void;
  onTierLabelChange: (tierId: string, label: string) => void;
  onCopyScreenshot: () => void;
  onDownloadScreenshot: () => void;
}) {
  return (
    <>
      {modal === "reset" && (
        <Modal title="Reset Tierlist" size="small" showClose={false} onClose={onClose}>
          <p style={{ textAlign: "center", margin: 0 }}>Are you sure you want to reset?<br />All items will return to the pool and tiers will return to default.</p>
          <div className="modal__actions">
            <button className="btn" type="button" onClick={onClose}>Cancel</button>
            <button className="btn btn--back" type="button" onClick={onReset}>Reset</button>
          </div>
        </Modal>
      )}

      {modal === "edit" && (
        <Modal title="Edit Tiers" size="small" onClose={onClose}>
          <div className="edit-tiers-list">
            {tierConfig.map((tier) => (
              <div className="edit-tier-row" data-tier-id={tier.id} key={tier.id}>
                <button className="edit-tier-drag" type="button" title="Drag tier" aria-label={`Reorder ${tier.label} tier`}>
                  <GripVertical aria-hidden="true" />
                </button>
                <input
                  type="text"
                  className="edit-tier-color"
                  value={tier.color}
                  aria-label={`${tier.label} tier color`}
                  data-coloris
                  style={{ background: tier.color, color: "transparent", cursor: "pointer" }}
                  onChange={(event) => onTierColorChange(tier.id, event.target.value)}
                />
                <input
                  type="text"
                  className="edit-tier-label"
                  value={tier.label}
                  maxLength={25}
                  placeholder="Label"
                  aria-label={`${tier.label} tier label`}
                  onChange={(event) => onTierLabelChange(tier.id, event.target.value || tier.id)}
                />
                <button className="edit-tier-delete" type="button" title="Delete tier" aria-label={`Delete ${tier.label} tier`} onClick={() => onDeleteTier(tier.id)}>
                  <X aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
          <button className="btn btn--add-tier" type="button" onClick={onAddTier}>+ Add Tier</button>
        </Modal>
      )}

      {modal === "screenshot" && (
        <Modal title="Screenshot Preview" onClose={onClose}>
          <div className="screenshot-preview-container">
            <img src={screenshotUrl} alt="Screenshot Preview" />
          </div>
          <div className="modal__actions">
            <button className="btn" type="button" onClick={onCopyScreenshot} aria-live="polite">
              {copyState === "copied" ? <Check aria-hidden="true" /> : <ClipboardCopy aria-hidden="true" />}
              <span>{copyState === "copied" ? "Copied!" : "Copy to Clipboard"}</span>
            </button>
            <button className="btn" type="button" onClick={onDownloadScreenshot}>
              <Download aria-hidden="true" />
              <span>Download Image</span>
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
