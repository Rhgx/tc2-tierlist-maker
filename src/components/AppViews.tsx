import type { ReactNode } from "react";
import { ArrowLeft, Camera, Pencil, RotateCcw } from "lucide-react";
import { Menu, MenuButton } from "./Menu";
import { TierRow } from "./TierRow";
import { tierlists } from "../data/generated/tierlists.generated";
import type { AppRoute, ViewName } from "../appTypes";
import type { Rankings, TierConfig, TierlistDefinition, TierlistFolder, TierlistImage } from "../types";

export function MenuView({ view, onFolder, onTierlist }: {
  view: ViewName;
  onFolder: (folder: TierlistFolder) => void;
  onTierlist: (id: string) => void;
}) {
  return (
    <div id="menu-view" className={`view ${view === "menu" ? "view--active" : ""}`}>
      <Menu title="TC2 Tierlist Maker" entries={tierlists} onFolder={onFolder} onTierlist={onTierlist} />
    </div>
  );
}

export function FolderView({ view, folder, onBack, onFolder, onTierlist }: {
  view: ViewName;
  folder: TierlistFolder | null;
  onBack: (route: AppRoute) => void;
  onFolder: (folder: TierlistFolder) => void;
  onTierlist: (id: string) => void;
}) {
  return (
    <div id="folder-view" className={`view ${view === "folder" ? "view--active" : ""}`}>
      <div className="menu">
        <button className="menu__btn menu__btn--back" onClick={() => onBack({ view: "menu" })}>
          <ArrowLeft />
          <span>Back</span>
        </button>
        <h1 className="menu__title">{folder?.name || "Folder Name"}</h1>
        <div className="menu__subtitle">Select a tierlist</div>
        <div className="menu__buttons">
          {(folder?.children || []).map((entry) => (
            <MenuButton key={entry.id} entry={entry} onFolder={onFolder} onTierlist={onTierlist} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function TierlistView({ view, tierlist, tierConfig, rankings, imagesById, poolItems, screenshotGenerating, onBack, onReset, onEdit, onScreenshot }: {
  view: ViewName;
  tierlist: TierlistDefinition | null;
  tierConfig: TierConfig[];
  rankings: Rankings;
  imagesById: Map<string, TierlistImage>;
  poolItems: ReactNode;
  screenshotGenerating: boolean;
  onBack: () => void;
  onReset: () => void;
  onEdit: () => void;
  onScreenshot: () => void;
}) {
  return (
    <div id="tierlist-view" className={`view ${view === "tierlist" ? "view--active" : ""}`}>
      <header className="header">
        <button className="btn btn--back" onClick={onBack}>
          <ArrowLeft />
          <span>Back</span>
        </button>
        <h1 className="header__title">{tierlist?.name || "Tierlist"}</h1>
        <div className="header__actions">
          <button className="btn" onClick={onReset}>
            <RotateCcw />
            <span>Reset</span>
          </button>
          <button className="btn btn--edit" onClick={onEdit}>
            <Pencil />
            <span>Edit Tiers</span>
          </button>
          <button className="btn" onClick={onScreenshot} disabled={screenshotGenerating}>
            <Camera />
            <span>Screenshot</span>
          </button>
        </div>
      </header>
      <main className="main-content">
        <div id="tier-container" className="tier-container">
          {tierConfig.map((tier) => (
            <TierRow key={tier.id} tier={tier} itemIds={rankings[tier.id] || []} imagesById={imagesById} />
          ))}
        </div>
        <div className="pool-container">
          <div className="pool-header">Available Items</div>
          <div className="pool-items">{poolItems}</div>
        </div>
      </main>
    </div>
  );
}
