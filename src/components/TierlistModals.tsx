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
          <p style={{ textAlign: "center", margin: 0 }}>Are you sure you want to reset?<br />All items will return to the pool.</p>
          <div className="modal__actions">
            <button className="btn" onClick={onClose}>Cancel</button>
            <button className="btn btn--back" onClick={onReset}>Reset</button>
          </div>
        </Modal>
      )}

      {modal === "edit" && (
        <Modal title="Edit Tiers" size="small" onClose={onClose}>
          <div className="edit-tiers-list">
            {tierConfig.map((tier) => (
              <div className="edit-tier-row" data-tier-id={tier.id} key={tier.id}>
                <button className="edit-tier-drag" type="button" title="Drag tier" aria-label={`Drag ${tier.label} tier`}>
                  <GripVertical />
                </button>
                <input
                  type="text"
                  className="edit-tier-color"
                  value={tier.color}
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
                  onChange={(event) => onTierLabelChange(tier.id, event.target.value || tier.id)}
                />
                <button className="edit-tier-delete" title="Delete tier" aria-label={`Delete ${tier.label} tier`} onClick={() => onDeleteTier(tier.id)}>
                  <X />
                </button>
              </div>
            ))}
          </div>
          <button className="btn btn--add-tier" onClick={onAddTier}>+ Add Tier</button>
        </Modal>
      )}

      {modal === "screenshot" && (
        <Modal title="Screenshot Preview" onClose={onClose}>
          <div className="screenshot-preview-container">
            <img src={screenshotUrl} alt="Screenshot Preview" />
          </div>
          <div className="modal__actions">
            <button className="btn" onClick={onCopyScreenshot}>
              {copyState === "copied" ? <Check /> : <ClipboardCopy />}
              {copyState === "copied" ? "Copied!" : "Copy to Clipboard"}
            </button>
            <button className="btn" onClick={onDownloadScreenshot}>
              <Download />
              Download Image
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
