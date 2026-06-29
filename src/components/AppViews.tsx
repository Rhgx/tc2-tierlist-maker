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
    <div id="menu-view" className={`view ${view === "menu" ? "view--active" : ""}`} aria-hidden={view !== "menu"}>
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
    <div id="folder-view" className={`view ${view === "folder" ? "view--active" : ""}`} aria-hidden={view !== "folder"}>
      <div className="menu">
        <button className="menu__btn menu__btn--back" type="button" onClick={() => onBack({ view: "menu" })}>
          <ArrowLeft aria-hidden="true" />
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

export function TierlistView({ view, tierlist, tierConfig, rankings, imagesById, poolItems, poolItemCount, totalPoolItemCount, weaponClassFilter, weaponClassOptions, showWeaponClassFilter, screenshotGenerating, onBack, onReset, onEdit, onScreenshot, onWeaponClassFilterChange }: {
  view: ViewName;
  tierlist: TierlistDefinition | null;
  tierConfig: TierConfig[];
  rankings: Rankings;
  imagesById: Map<string, TierlistImage>;
  poolItems: ReactNode;
  poolItemCount: number;
  totalPoolItemCount: number;
  weaponClassFilter: string;
  weaponClassOptions: string[];
  showWeaponClassFilter: boolean;
  screenshotGenerating: boolean;
  onBack: () => void;
  onReset: () => void;
  onEdit: () => void;
  onScreenshot: () => void;
  onWeaponClassFilterChange: (className: string) => void;
}) {
  const poolCountLabel = weaponClassFilter === "all" ? `${totalPoolItemCount} items` : `${poolItemCount} of ${totalPoolItemCount} items`;

  return (
    <div id="tierlist-view" className={`view ${view === "tierlist" ? "view--active" : ""}`} aria-hidden={view !== "tierlist"}>
      <header className="header">
        <button className="btn btn--back" type="button" onClick={onBack}>
          <ArrowLeft aria-hidden="true" />
          <span>Back</span>
        </button>
        <h1 className="header__title">{tierlist?.name || "Tierlist"}</h1>
        <div className="header__actions">
          <button className="btn" type="button" onClick={onReset}>
            <RotateCcw aria-hidden="true" />
            <span>Reset</span>
          </button>
          <button className="btn btn--edit" type="button" onClick={onEdit}>
            <Pencil aria-hidden="true" />
            <span>Edit Tiers</span>
          </button>
          <button className="btn" type="button" onClick={onScreenshot} disabled={screenshotGenerating} aria-busy={screenshotGenerating}>
            <Camera aria-hidden="true" />
            <span>Screenshot</span>
          </button>
        </div>
      </header>
      <main className="main-content">
        <div id="tier-container" className="tier-container" aria-label="Tier rankings">
          {tierConfig.map((tier) => (
            <TierRow key={tier.id} tier={tier} itemIds={rankings[tier.id] || []} imagesById={imagesById} />
          ))}
        </div>
        <section className="pool-container" aria-labelledby="pool-heading">
          <div className="pool-header">
            <div>
              <div id="pool-heading">Available Items</div>
              <div className="pool-header__meta">{poolCountLabel}</div>
            </div>
          </div>
          {showWeaponClassFilter && (
            <div className="class-filter" aria-label="Filter available weapons by class">
              <div className="class-filter__label">Class</div>
              <div className="class-filter__chips" role="group" aria-label="Weapon class">
                <button className={`class-filter__chip ${weaponClassFilter === "all" ? "class-filter__chip--active" : ""}`} type="button" onClick={() => onWeaponClassFilterChange("all")}>
                  All
                </button>
                {weaponClassOptions.map((className) => (
                  <button key={className} className={`class-filter__chip ${weaponClassFilter === className ? "class-filter__chip--active" : ""}`} type="button" onClick={() => onWeaponClassFilterChange(className)}>
                    {className}
                  </button>
                ))}
              </div>
              <div className="class-filter__select select-wrapper">
                <select className="select" value={weaponClassFilter} aria-label="Weapon class" onChange={(event) => onWeaponClassFilterChange(event.target.value)}>
                  <option value="all">All</option>
                  {weaponClassOptions.map((className) => (
                    <option key={className} value={className}>{className}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <div className="pool-items">{poolItems}</div>
        </section>
      </main>
    </div>
  );
}
