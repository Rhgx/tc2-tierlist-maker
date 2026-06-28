import { ChevronRight } from "lucide-react";
import { isFolder } from "../lib/tierlistHelpers";
import type { TierlistEntry, TierlistFolder } from "../types";

export function Menu({ title, entries, onFolder, onTierlist }: {
  title: string;
  entries: TierlistEntry[];
  onFolder: (folder: TierlistFolder) => void;
  onTierlist: (id: string) => void;
}) {
  return (
    <div className="menu">
      <h1 className="menu__title">{title}</h1>
      <p className="menu__subtitle">Select a tierlist</p>
      <div className="menu__buttons">
        {entries.map((entry) => <MenuButton key={entry.id} entry={entry} onFolder={onFolder} onTierlist={onTierlist} />)}
      </div>
    </div>
  );
}

export function MenuButton({ entry, onFolder, onTierlist }: {
  entry: TierlistEntry;
  onFolder: (folder: TierlistFolder) => void;
  onTierlist: (id: string) => void;
}) {
  if (isFolder(entry)) {
    return (
      <button className="menu__btn menu__btn--folder" type="button" onClick={() => onFolder(entry)}>
        {entry.name}
        <ChevronRight aria-hidden="true" />
      </button>
    );
  }
  return <button className="menu__btn" type="button" onClick={() => onTierlist(entry.id)}>{entry.name}</button>;
}
