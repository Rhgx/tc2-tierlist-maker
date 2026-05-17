import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Camera, Check, ChevronRight, ClipboardCopy, Download, Pencil, RotateCcw, X } from "lucide-react";
import gsap from "gsap";
import Sortable from "sortablejs";
import { COLOR_SWATCHES, DEFAULT_TIERS } from "./constants";
import { tierlists } from "./data/generated/tierlists.generated";
import { GridShader } from "./lib/shader";
import type { Rankings, TierConfig, TierlistDefinition, TierlistEntry, TierlistFolder, TierlistImage } from "./types";

type ViewName = "menu" | "folder" | "tierlist";
type ModalName = "none" | "edit" | "reset" | "screenshot";
type AppRoute =
  | { view: "menu" }
  | { view: "folder"; id: string }
  | { view: "tierlist"; id: string };
type SavedTierlistState = {
  tierConfig: TierConfig[];
  rankings: Rankings;
  tierIdCounter: number;
  sourceSignature?: string;
};

const STORAGE_PREFIX = "tc2-tierlist-state:";
const STORAGE_VERSION = 1;
const INITIAL_POOL_RENDER_COUNT = 160;
const POOL_RENDER_CHUNK_SIZE = 180;
const POOL_RENDER_CHUNK_DELAY_MS = 16;
const STORAGE_SAVE_DELAY_MS = 250;

function isFolder(entry: TierlistEntry): entry is TierlistFolder {
  return "type" in entry && entry.type === "folder";
}

function cloneDefaultTiers() {
  return DEFAULT_TIERS.map((tier) => ({ ...tier }));
}

function calculateLabelFontSize(label: string) {
  const len = label.length;
  if (len <= 2) return "2rem";
  if (len <= 4) return "1.5rem";
  if (len <= 8) return "1rem";
  if (len <= 12) return "0.8rem";
  if (len <= 18) return "0.65rem";
  return "0.55rem";
}

function publicAssetUrl(path: string) {
  return `${import.meta.env.BASE_URL}${path}`.replace(/\/{2,}/g, "/");
}

function findTierlistById(id: string, entries: TierlistEntry[]): TierlistDefinition | null {
  for (const entry of entries) {
    if (isFolder(entry)) {
      const found = findTierlistById(id, entry.children);
      if (found) return found;
    } else if (entry.id === id) {
      return entry;
    }
  }
  return null;
}

function findFolderById(id: string, entries: TierlistEntry[]): TierlistFolder | null {
  for (const entry of entries) {
    if (!isFolder(entry)) continue;
    if (entry.id === id) return entry;
    const found = findFolderById(id, entry.children);
    if (found) return found;
  }
  return null;
}

function findParentFolderForTierlist(id: string, entries: TierlistEntry[], parent: TierlistFolder | null = null): TierlistFolder | null {
  for (const entry of entries) {
    if (isFolder(entry)) {
      const found = findParentFolderForTierlist(id, entry.children, entry);
      if (found) return found;
    } else if (entry.id === id) {
      return parent;
    }
  }
  return null;
}

function appBasePath() {
  const path = new URL(import.meta.env.BASE_URL, window.location.origin).pathname;
  return path.endsWith("/") ? path.slice(0, -1) : path;
}

function routePath(route: AppRoute) {
  const base = appBasePath();
  const suffix = route.view === "menu"
    ? "/"
    : `/${route.view}/${encodeURIComponent(route.id)}`;
  return `${base}${suffix}`.replace(/\/{2,}/g, "/") || "/";
}

function parseRouteFromLocation(): AppRoute {
  const base = appBasePath();
  let pathname = window.location.pathname;
  if (base && pathname.startsWith(base)) pathname = pathname.slice(base.length) || "/";

  const [, routeType, encodedId] = pathname.match(/^\/(folder|tierlist)\/(.+)$/) || [];
  if (routeType && encodedId) {
    try {
      return { view: routeType as "folder" | "tierlist", id: decodeURIComponent(encodedId) };
    } catch {
      return { view: "menu" };
    }
  }

  return { view: "menu" };
}

function buildInitialRankings(tierConfig: TierConfig[], images: TierlistImage[]): Rankings {
  const rankings: Rankings = { pool: images.map((image) => image.id) };
  tierConfig.forEach((tier) => {
    rankings[tier.id] = [];
  });
  return rankings;
}

function storageKey(tierlistId: string) {
  return `${STORAGE_PREFIX}${STORAGE_VERSION}:${tierlistId}`;
}

function tierlistSourceSignature(tierlist: TierlistDefinition) {
  return tierlist.images.map((image) => image.id).join("|");
}

function loadTierlistState(tierlist: TierlistDefinition): SavedTierlistState | null {
  try {
    const raw = window.localStorage.getItem(storageKey(tierlist.id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedTierlistState>;
    if (!Array.isArray(parsed.tierConfig) || !parsed.rankings) return null;

    const imageIds = new Set(tierlist.images.map((image) => image.id));
    const tierConfig = parsed.tierConfig
      .filter((tier): tier is TierConfig => Boolean(tier?.id && tier.label && tier.color))
      .map((tier) => ({ id: tier.id, label: tier.label, color: tier.color }));
    if (!tierConfig.length) return null;

    const rankings: Rankings = { pool: [] };
    const assignedIds = new Set<string>();
    const tierIds = new Set(["pool", ...tierConfig.map((tier) => tier.id)]);

    tierIds.forEach((tierId) => {
      if (tierId === "pool") return;
      const savedIds = Array.isArray(parsed.rankings?.[tierId]) ? parsed.rankings[tierId] : [];
      rankings[tierId] = savedIds.filter((id) => {
        if (!imageIds.has(id) || assignedIds.has(id)) return false;
        assignedIds.add(id);
        return true;
      });
    });

    tierlist.images.forEach((image) => {
      if (!assignedIds.has(image.id)) rankings.pool.push(image.id);
    });

    return {
      tierConfig,
      rankings,
      tierIdCounter: Number.isFinite(parsed.tierIdCounter) ? Number(parsed.tierIdCounter) : tierConfig.length,
      sourceSignature: tierlistSourceSignature(tierlist),
    };
  } catch {
    return null;
  }
}

function saveTierlistState(tierlist: TierlistDefinition, tierConfig: TierConfig[], rankings: Rankings, tierIdCounter: number) {
  try {
    window.localStorage.setItem(storageKey(tierlist.id), JSON.stringify({ tierConfig, rankings, tierIdCounter, sourceSignature: tierlistSourceSignature(tierlist) }));
  } catch {
    // Storage can be unavailable in private/restricted browser contexts.
  }
}

function nextPaint() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });
}

export default function App() {
  const [view, setView] = useState<ViewName>("menu");
  const [currentFolder, setCurrentFolder] = useState<TierlistFolder | null>(null);
  const [currentTierlist, setCurrentTierlist] = useState<TierlistDefinition | null>(null);
  const [tierConfig, setTierConfig] = useState<TierConfig[]>(cloneDefaultTiers);
  const [rankings, setRankings] = useState<Rankings>({ pool: [] });
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<ModalName>("none");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [screenshotGenerating, setScreenshotGenerating] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [tierIdCounter, setTierIdCounter] = useState(0);
  const [visiblePoolCount, setVisiblePoolCount] = useState(INITIAL_POOL_RENDER_COUNT);

  const shaderRef = useRef<GridShader | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sortableRef = useRef<Sortable[]>([]);
  const rankingsRef = useRef<Rankings>(rankings);
  const screenshotFontCssRef = useRef<string | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);
  const pendingSaveRef = useRef<{
    tierlist: TierlistDefinition;
    tierConfig: TierConfig[];
    rankings: Rankings;
    tierIdCounter: number;
  } | null>(null);

  const currentImagesById = useMemo(() => {
    return new Map((currentTierlist?.images || []).map((image) => [image.id, image]));
  }, [currentTierlist]);

  const poolItems = useMemo(
    () => (rankings.pool || []).slice(0, visiblePoolCount).map((id) => <TierItem key={id} image={currentImagesById.get(id)} />),
    [rankings.pool, visiblePoolCount, currentImagesById],
  );

  useEffect(() => {
    rankingsRef.current = rankings;
  }, [rankings]);

  useEffect(() => {
    if (view !== "tierlist" || !currentTierlist) return;
    pendingSaveRef.current = { tierlist: currentTierlist, tierConfig, rankings, tierIdCounter };
    if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = window.setTimeout(() => {
      const pending = pendingSaveRef.current;
      if (!pending) return;
      saveTierlistState(pending.tierlist, pending.tierConfig, pending.rankings, pending.tierIdCounter);
      pendingSaveRef.current = null;
      saveTimeoutRef.current = null;
    }, STORAGE_SAVE_DELAY_MS);
  }, [view, currentTierlist, tierConfig, rankings, tierIdCounter]);

  useEffect(() => {
    const flushPendingSave = () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }

      const pending = pendingSaveRef.current;
      if (!pending) return;
      saveTierlistState(pending.tierlist, pending.tierConfig, pending.rankings, pending.tierIdCounter);
      pendingSaveRef.current = null;
    };

    window.addEventListener("pagehide", flushPendingSave);
    return () => {
      window.removeEventListener("pagehide", flushPendingSave);
      flushPendingSave();
    };
  }, []);

  useEffect(() => {
    if (view === "tierlist" || !pendingSaveRef.current) return;
    const pending = pendingSaveRef.current;
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    saveTierlistState(pending.tierlist, pending.tierConfig, pending.rankings, pending.tierIdCounter);
    pendingSaveRef.current = null;
  }, [view]);

  useEffect(() => {
    if (view !== "tierlist") return;
    setVisiblePoolCount(INITIAL_POOL_RENDER_COUNT);
  }, [view, currentTierlist?.id]);

  useEffect(() => {
    if (view !== "tierlist") return;
    const poolSize = rankings.pool?.length || 0;
    if (visiblePoolCount >= poolSize) return;

    const timeoutId = window.setTimeout(() => {
      setVisiblePoolCount((count) => Math.min(poolSize, count + POOL_RENDER_CHUNK_SIZE));
    }, POOL_RENDER_CHUNK_DELAY_MS);
    return () => window.clearTimeout(timeoutId);
  }, [view, rankings.pool, visiblePoolCount]);

  useEffect(() => {
    if (!canvasRef.current) return;
    shaderRef.current = new GridShader(canvasRef.current);
    return () => shaderRef.current?.destroy();
  }, []);

  useEffect(() => {
    const activeView = document.querySelector(".view--active");
    if (!activeView) return;
    if (view === "tierlist") {
      gsap.fromTo(activeView.querySelectorAll(".tier-row"), { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: 0.4, stagger: 0.06, ease: "power2.out" });
      gsap.fromTo(activeView.querySelector(".pool-container"), { opacity: 0 }, { opacity: 1, duration: 0.4, delay: 0.3, ease: "power2.out" });
      return;
    }
    gsap.fromTo(activeView.querySelector(".menu__title"), { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.3, ease: "power1.out" });
    gsap.fromTo(activeView.querySelector(".menu__subtitle"), { opacity: 0 }, { opacity: 1, duration: 0.3, delay: 0.1, ease: "power1.out" });
    gsap.fromTo(activeView.querySelectorAll(".menu__btn"), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3, stagger: 0.05, delay: 0.2, ease: "power1.out" });
  }, [view, currentFolder?.id, currentTierlist?.id]);

  const handleSortableEnd = useCallback((event: Sortable.SortableEvent) => {
    const itemId = event.item.dataset.id;
    const fromTier = event.from.closest<HTMLElement>("[data-tier]")?.dataset.tier || "pool";
    const toTier = event.to.closest<HTMLElement>("[data-tier]")?.dataset.tier || "pool";
    const oldIndex = event.oldIndex ?? 0;
    const newIndex = event.newIndex ?? 0;

    event.item.classList.remove("tier-item--active");
    event.item.classList.add("tier-item--dropped");
    window.setTimeout(() => event.item.classList.remove("tier-item--dropped"), 200);

    if (!itemId) return;

    // Sortable mutates the DOM immediately. React still owns these nodes, so
    // restore the old DOM order first and let React perform the actual move.
    restoreSortableDom(rankingsRef.current, fromTier, toTier);

    setRankings((previous) => {
      const next: Rankings = { ...previous, pool: [...(previous.pool || [])] };
      tierConfig.forEach((tier) => {
        next[tier.id] = [...(previous[tier.id] || [])];
      });

      const sourceItems = next[fromTier] || [];
      const [movedItem] = sourceItems.splice(oldIndex, 1);
      if (!movedItem) return previous;

      const targetItems = fromTier === toTier ? sourceItems : [...(next[toTier] || [])];
      targetItems.splice(newIndex, 0, movedItem);
      next[fromTier] = sourceItems;
      next[toTier] = targetItems;
      return next;
    });
  }, [tierConfig]);

  useEffect(() => {
    sortableRef.current.forEach((sortable) => sortable.destroy());
    sortableRef.current = [];
    if (view !== "tierlist") return;

    document.querySelectorAll<HTMLElement>(".tier-items, .pool-items").forEach((zone) => {
      const sortable = new Sortable(zone, {
        group: "tierlist-items",
        animation: 150,
        easing: "cubic-bezier(0.25, 1, 0.5, 1)",
        ghostClass: "tier-item--ghost",
        chosenClass: "tier-item--chosen",
        dragClass: "tier-item--dragging",
        sort: true,
        delay: 0,
        delayOnTouchOnly: true,
        touchStartThreshold: 3,
        scroll: true,
        scrollSensitivity: 80,
        scrollSpeed: 10,
        bubbleScroll: true,
        draggable: ".tier-item",
        onStart: (event) => {
          shaderRef.current?.setPaused(true);
          event.item.classList.add("tier-item--active");
        },
        onEnd: (event) => {
          shaderRef.current?.setPaused(false);
          handleSortableEnd(event);
        },
      });
      sortableRef.current.push(sortable);
    });

    return () => {
      sortableRef.current.forEach((sortable) => sortable.destroy());
      sortableRef.current = [];
    };
  }, [view, tierConfig, handleSortableEnd]);

  useEffect(() => {
    if (modal !== "edit") return;
    let cancelled = false;
    void import("@melloware/coloris").then(({ default: Coloris }) => {
      if (cancelled) return;
      Coloris.init();
      Coloris({
        el: ".edit-tier-color",
        swatches: COLOR_SWATCHES,
        theme: "polaroid",
        themeMode: "dark",
        alpha: false,
        formatToggle: false,
        closeButton: true,
        closeLabel: "Done",
      });
    });
    return () => {
      cancelled = true;
    };
  }, [modal, tierConfig]);

  const loadTierlistView = useCallback((tierlist: TierlistDefinition) => {
    setLoading(true);
    const savedState = loadTierlistState(tierlist);
    const tiers = savedState?.tierConfig || cloneDefaultTiers();
    setTierConfig(tiers);
    setTierIdCounter(savedState?.tierIdCounter || 0);
    setCurrentTierlist(tierlist);
    setCurrentFolder(findParentFolderForTierlist(tierlist.id, tierlists));
    setRankings(savedState?.rankings || buildInitialRankings(tiers, tierlist.images));
    setLoading(false);
    setView("tierlist");
  }, []);

  const applyRoute = useCallback((route: AppRoute) => {
    setModal("none");
    setScreenshotUrl("");

    if (route.view === "menu") {
      setCurrentFolder(null);
      setCurrentTierlist(null);
      setRankings({ pool: [] });
      setView("menu");
      return;
    }

    if (route.view === "folder") {
      const folder = findFolderById(route.id, tierlists);
      if (!folder) {
        window.history.replaceState(null, "", routePath({ view: "menu" }));
        setCurrentFolder(null);
        setCurrentTierlist(null);
        setRankings({ pool: [] });
        setView("menu");
        return;
      }
      setCurrentFolder(folder);
      setCurrentTierlist(null);
      setRankings({ pool: [] });
      setView("folder");
      return;
    }

    const tierlist = findTierlistById(route.id, tierlists);
    if (!tierlist) {
      window.history.replaceState(null, "", routePath({ view: "menu" }));
      setCurrentFolder(null);
      setCurrentTierlist(null);
      setRankings({ pool: [] });
      setView("menu");
      return;
    }
    loadTierlistView(tierlist);
  }, [loadTierlistView]);

  const navigateTo = useCallback((route: AppRoute) => {
    const nextPath = routePath(route);
    if (window.location.pathname !== nextPath) window.history.pushState(null, "", nextPath);
    applyRoute(route);
  }, [applyRoute]);

  useEffect(() => {
    applyRoute(parseRouteFromLocation());
    const handlePopState = () => applyRoute(parseRouteFromLocation());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [applyRoute]);

  const openFolder = (folder: TierlistFolder) => {
    navigateTo({ view: "folder", id: folder.id });
  };

  const openTierlist = (id: string) => {
    navigateTo({ view: "tierlist", id });
  };

  const goBackFromTierlist = () => {
    navigateTo(currentFolder ? { view: "folder", id: currentFolder.id } : { view: "menu" });
  };

  const resetTierlist = () => {
    if (!currentTierlist) return;
    gsap.to([".tier-row", ".pool-container"], {
      opacity: 0,
      duration: 0.25,
      ease: "power1.in",
      onComplete: () => {
        setRankings(buildInitialRankings(tierConfig, currentTierlist.images));
        setModal("none");
        window.setTimeout(() => {
          gsap.fromTo(".tier-row", { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: 0.4, stagger: 0.06, ease: "power2.out" });
          gsap.fromTo(".pool-container", { opacity: 0 }, { opacity: 1, duration: 0.4, delay: 0.3, ease: "power2.out" });
        }, 0);
      },
    });
  };

  const addTier = () => {
    setTierIdCounter((counter) => counter + 1);
    const newId = `tier_${tierIdCounter + 1}_${Date.now()}`;
    setTierConfig((tiers) => [...tiers, { id: newId, label: "?", color: "#858585" }]);
    setRankings((tiers) => ({ ...tiers, [newId]: [] }));
  };

  const deleteTier = (tierId: string) => {
    if (tierConfig.length <= 1) return;
    setRankings((tiers) => {
      const removedItems = tiers[tierId] || [];
      const { [tierId]: _deleted, ...rest } = tiers;
      return { ...rest, pool: [...(rest.pool || []), ...removedItems] } as Rankings;
    });
    setTierConfig((tiers) => tiers.filter((tier) => tier.id !== tierId));
  };

  const takeScreenshot = async () => {
    if (!currentTierlist || screenshotGenerating) return;
    const sourceElement = document.getElementById("tier-container");
    if (!sourceElement) return;

    setScreenshotGenerating(true);
    document.body.style.cursor = "wait";
    shaderRef.current?.setPaused(true);

    let exportContainer: HTMLDivElement | null = null;

    try {
      await nextPaint();

      exportContainer = document.createElement("div");
      exportContainer.className = "screenshot-container";
      const clonedTiers = sourceElement.cloneNode(true) as HTMLElement;
      clonedTiers.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
      clonedTiers.removeAttribute("id");
      exportContainer.appendChild(clonedTiers);
      document.body.appendChild(exportContainer);

      const { getFontEmbedCSS, toPng } = await import("html-to-image");
      screenshotFontCssRef.current ||= await getFontEmbedCSS(exportContainer);

      const dataUrl = await toPng(exportContainer, {
        backgroundColor: "#414254",
        canvasWidth: exportContainer.scrollWidth * 3,
        canvasHeight: exportContainer.scrollHeight * 3,
        fontEmbedCSS: screenshotFontCssRef.current,
        pixelRatio: 3,
        style: { transform: "none" },
      });
      setScreenshotUrl(dataUrl);
      setCopyState("idle");
      setModal("screenshot");
    } finally {
      if (exportContainer) document.body.removeChild(exportContainer);
      document.body.style.cursor = "default";
      shaderRef.current?.setPaused(false);
      setScreenshotGenerating(false);
    }
  };

  const copyScreenshot = async () => {
    if (!screenshotUrl) return;
    const response = await fetch(screenshotUrl);
    const blob = await response.blob();
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    setCopyState("copied");
    window.setTimeout(() => setCopyState("idle"), 2000);
  };

  const downloadScreenshot = () => {
    if (!currentTierlist || !screenshotUrl) return;
    const link = document.createElement("a");
    link.download = `tierlist-${currentTierlist.id}.png`;
    link.href = screenshotUrl;
    link.click();
    setModal("none");
  };

  return (
    <div className="app-container">
      <canvas id="shader-canvas" ref={canvasRef} />
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <div className="loading-text">Loading...</div>
        </div>
      )}
      {screenshotGenerating && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <div className="loading-text">Generating Screenshot...</div>
        </div>
      )}

      <div id="menu-view" className={`view ${view === "menu" ? "view--active" : ""}`}>
        <Menu title="TC2 Tierlist Maker" entries={tierlists} onFolder={openFolder} onTierlist={openTierlist} />
      </div>

      <div id="folder-view" className={`view ${view === "folder" ? "view--active" : ""}`}>
        <div className="menu">
          <button className="menu__btn menu__btn--back" onClick={() => navigateTo({ view: "menu" })}>
            <ArrowLeft />
            <span>Back</span>
          </button>
          <h1 className="menu__title">{currentFolder?.name || "Folder Name"}</h1>
          <div className="menu__subtitle">Select a tierlist</div>
          <div className="menu__buttons">
            {(currentFolder?.children || []).map((entry) => (
              <MenuButton key={entry.id} entry={entry} onFolder={openFolder} onTierlist={openTierlist} />
            ))}
          </div>
        </div>
      </div>

      <div id="tierlist-view" className={`view ${view === "tierlist" ? "view--active" : ""}`}>
        <header className="header">
          <button className="btn btn--back" onClick={goBackFromTierlist}>
            <ArrowLeft />
            <span>Back</span>
          </button>
          <h1 className="header__title">{currentTierlist?.name || "Tierlist"}</h1>
          <div className="header__actions">
            <button className="btn" onClick={() => setModal("reset")}>
              <RotateCcw />
              <span>Reset</span>
            </button>
            <button className="btn btn--edit" onClick={() => setModal("edit")}>
              <Pencil />
              <span>Edit Tiers</span>
            </button>
            <button className="btn" onClick={takeScreenshot} disabled={screenshotGenerating}>
              <Camera />
              <span>Screenshot</span>
            </button>
          </div>
        </header>
        <main className="main-content">
          <div id="tier-container" className="tier-container">
            {tierConfig.map((tier) => (
              <TierRow key={tier.id} tier={tier} itemIds={rankings[tier.id] || []} imagesById={currentImagesById} />
            ))}
          </div>
          <div className="pool-container">
            <div className="pool-header">Available Items</div>
            <div className="pool-items">
              {poolItems}
            </div>
          </div>
        </main>
      </div>

      {modal === "reset" && (
        <Modal title="Reset Tierlist" size="small" showClose={false} onClose={() => setModal("none")}>
          <p style={{ textAlign: "center", margin: 0 }}>Are you sure you want to reset?<br />All items will return to the pool.</p>
          <div className="modal__actions">
            <button className="btn" onClick={() => setModal("none")}>Cancel</button>
            <button className="btn btn--back" onClick={resetTierlist}>Reset</button>
          </div>
        </Modal>
      )}

      {modal === "edit" && (
        <Modal title="Edit Tiers" size="small" onClose={() => setModal("none")}>
          <div className="edit-tiers-list">
            {tierConfig.map((tier) => (
              <div className="edit-tier-row" data-tier-id={tier.id} key={tier.id}>
                <input
                  type="text"
                  className="edit-tier-color"
                  value={tier.color}
                  data-coloris
                  style={{ background: tier.color, color: "transparent", cursor: "pointer" }}
                  onChange={(event) => setTierConfig((tiers) => tiers.map((item) => item.id === tier.id ? { ...item, color: event.target.value } : item))}
                />
                <input
                  type="text"
                  className="edit-tier-label"
                  value={tier.label}
                  maxLength={25}
                  placeholder="Label"
                  onChange={(event) => setTierConfig((tiers) => tiers.map((item) => item.id === tier.id ? { ...item, label: event.target.value || item.id } : item))}
                />
                <button className="edit-tier-delete" title="Delete tier" onClick={() => deleteTier(tier.id)}>x</button>
              </div>
            ))}
          </div>
          <button className="btn btn--add-tier" onClick={addTier}>+ Add Tier</button>
        </Modal>
      )}

      {modal === "screenshot" && (
        <Modal title="Screenshot Preview" onClose={() => setModal("none")}>
          <div className="screenshot-preview-container">
            <img src={screenshotUrl} alt="Screenshot Preview" />
          </div>
          <div className="modal__actions">
            <button className="btn" onClick={copyScreenshot}>
              {copyState === "copied" ? <Check /> : <ClipboardCopy />}
              {copyState === "copied" ? "Copied!" : "Copy to Clipboard"}
            </button>
            <button className="btn" onClick={downloadScreenshot}>
              <Download />
              Download Image
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function restoreSortableDom(rankings: Rankings, fromTier: string, toTier: string) {
  const nodeById = new Map(
    [...document.querySelectorAll<HTMLElement>(".tier-item")]
      .map((node) => [node.dataset.id || "", node] as const)
      .filter(([id]) => Boolean(id)),
  );

  new Set([fromTier, toTier]).forEach((tierId) => {
    const container = getSortableContainer(tierId);
    if (!container) return;
    (rankings[tierId] || []).forEach((id) => {
      const node = nodeById.get(id);
      if (node) container.appendChild(node);
    });
  });
}

function getSortableContainer(tierId: string) {
  if (tierId === "pool") return document.querySelector<HTMLElement>(".pool-items");
  return document.querySelector<HTMLElement>(`[data-tier="${CSS.escape(tierId)}"] .tier-items`);
}

function Menu({ title, entries, onFolder, onTierlist }: {
  title: string;
  entries: TierlistEntry[];
  onFolder: (folder: TierlistFolder) => void;
  onTierlist: (id: string) => void;
}) {
  return (
    <div className="menu">
      <h1 className="menu__title">{title}</h1>
      <div className="menu__subtitle">Select a tierlist</div>
      <div className="menu__buttons">
        {entries.map((entry) => <MenuButton key={entry.id} entry={entry} onFolder={onFolder} onTierlist={onTierlist} />)}
      </div>
    </div>
  );
}

function MenuButton({ entry, onFolder, onTierlist }: {
  entry: TierlistEntry;
  onFolder: (folder: TierlistFolder) => void;
  onTierlist: (id: string) => void;
}) {
  if (isFolder(entry)) {
    return (
      <button className="menu__btn menu__btn--folder" onClick={() => onFolder(entry)}>
        {entry.name}
        <ChevronRight />
      </button>
    );
  }
  return <button className="menu__btn" onClick={() => onTierlist(entry.id)}>{entry.name}</button>;
}

const TierRow = memo(function TierRow({ tier, itemIds, imagesById }: {
  tier: TierConfig;
  itemIds: string[];
  imagesById: Map<string, TierlistImage>;
}) {
  return (
    <div className="tier-row" data-tier={tier.id}>
      <div className="tier-label" data-tier={tier.id} style={{ background: tier.color, color: "#1a1a1a", fontSize: calculateLabelFontSize(tier.label) }}>
        {tier.label}
      </div>
      <div className="tier-items">
        {itemIds.map((id) => <TierItem key={id} image={imagesById.get(id)} />)}
      </div>
    </div>
  );
});

const TierItem = memo(function TierItem({ image }: { image?: TierlistImage }) {
  if (!image) return null;
  return (
    <div className="tier-item" data-id={image.id} data-name={image.name}>
      <img src={publicAssetUrl(image.src)} alt={image.name} width="70" height="70" loading="lazy" decoding="async" />
    </div>
  );
});

function Modal({ title, size = "medium", showClose = true, onClose, children }: {
  title: string;
  size?: "small" | "medium" | "large";
  showClose?: boolean;
  onClose: () => void;
  children: React.ReactNode;
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
