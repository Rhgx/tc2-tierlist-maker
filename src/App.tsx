import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import Sortable from "sortablejs";
import { CLASS_ORDER, COLOR_SWATCHES } from "./constants";
import { FolderView, MenuView, TierlistView } from "./components/AppViews";
import { LoadingOverlay } from "./components/LoadingOverlay";
import { ProfileOutput } from "./components/ProfileOutput";
import { TierItem } from "./components/TierItem";
import { TierlistModals } from "./components/TierlistModals";
import { tierlists } from "./data/generated/tierlists.generated";
import { GridShader } from "./lib/shader";
import { profileLog, isProfileEnabled } from "./lib/profile";
import { parseRouteFromLocation, routePath } from "./lib/routing";
import { restoreSortableDom } from "./lib/sortableDom";
import { buildInitialRankings, cloneDefaultTiers, findFolderById, findParentFolderForTierlist, findTierlistById, nextPaint } from "./lib/tierlistHelpers";
import { loadTierlistState, saveTierlistState } from "./lib/tierlistStorage";
import type { AppRoute, ModalName, ViewName } from "./appTypes";
import type { Rankings, TierConfig, TierlistDefinition, TierlistFolder, TierlistImage } from "./types";

const INITIAL_POOL_RENDER_COUNT = 160;
const POOL_RENDER_CHUNK_SIZE = 180;
const POOL_RENDER_CHUNK_DELAY_MS = 16;
const STORAGE_SAVE_DELAY_MS = 250;

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
  const [weaponClassFilter, setWeaponClassFilter] = useState("all");

  const shaderRef = useRef<GridShader | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sortableRef = useRef<Sortable[]>([]);
  const editTierSortableRef = useRef<Sortable | null>(null);
  const rankingsRef = useRef<Rankings>(rankings);
  const screenshotFontCssRef = useRef<string | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);
  const routeStartRef = useRef<{ id: string; startedAt: number } | null>(null);
  const pendingSaveRef = useRef<{
    tierlist: TierlistDefinition;
    tierConfig: TierConfig[];
    rankings: Rankings;
    tierIdCounter: number;
  } | null>(null);

  const currentImagesById = useMemo(() => {
    return new Map((currentTierlist?.images || []).map((image) => [image.id, image]));
  }, [currentTierlist]);

  const weaponClassOptions = useMemo(() => CLASS_ORDER.filter((className) => className !== "All Class"), []);

  const hasWeaponClassFilter = useMemo(() => {
    return Boolean(currentTierlist?.images.some((image) => image.sourceKind === "weapon" && image.classNames?.length));
  }, [currentTierlist]);

  const filteredPoolIds = useMemo(() => {
    const poolIds = rankings.pool || [];
    if (!hasWeaponClassFilter || weaponClassFilter === "all") return poolIds;
    return poolIds.filter((id) => imageMatchesWeaponClass(currentImagesById.get(id), weaponClassFilter));
  }, [rankings.pool, currentImagesById, hasWeaponClassFilter, weaponClassFilter]);

  const poolItems = useMemo(() => {
    const startedAt = performance.now();
    const items = filteredPoolIds.slice(0, visiblePoolCount).map((id) => <TierItem key={id} image={currentImagesById.get(id)} />);
    profileLog("pool render", {
      totalPoolItems: filteredPoolIds.length,
      visiblePoolItems: Math.min(visiblePoolCount, filteredPoolIds.length),
      durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
    });
    return items;
  }, [filteredPoolIds, visiblePoolCount, currentImagesById]);

  useEffect(() => {
    rankingsRef.current = rankings;
  }, [rankings]);

  useEffect(() => {
    if (!isProfileEnabled() || !("PerformanceObserver" in window)) return;
    let observer: PerformanceObserver | null = null;
    try {
      observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          profileLog("long task", {
            durationMs: Math.round(entry.duration * 100) / 100,
            startTimeMs: Math.round(entry.startTime * 100) / 100,
          });
        });
      });
      observer.observe({ entryTypes: ["longtask"] });
    } catch {
      profileLog("long task observer unavailable");
    }
    return () => observer?.disconnect();
  }, []);

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
  }, [view, currentTierlist?.id, weaponClassFilter]);

  useEffect(() => {
    setWeaponClassFilter("all");
  }, [currentTierlist?.id]);

  useEffect(() => {
    if (view !== "tierlist") return;
    const poolSize = filteredPoolIds.length;
    if (visiblePoolCount >= poolSize) return;

    const timeoutId = window.setTimeout(() => {
      setVisiblePoolCount((count) => Math.min(poolSize, count + POOL_RENDER_CHUNK_SIZE));
    }, POOL_RENDER_CHUNK_DELAY_MS);
    return () => window.clearTimeout(timeoutId);
  }, [view, filteredPoolIds.length, visiblePoolCount]);

  useEffect(() => {
    if (!isProfileEnabled() || view !== "tierlist" || !currentTierlist || !routeStartRef.current) return;
    const route = routeStartRef.current;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (routeStartRef.current !== route) return;
        profileLog("tierlist route painted", {
          id: currentTierlist.id,
          totalItems: currentTierlist.images.length,
          visiblePoolItems: Math.min(visiblePoolCount, rankings.pool?.length || 0),
          durationMs: Math.round((performance.now() - route.startedAt) * 100) / 100,
        });
        routeStartRef.current = null;
      });
    });
  }, [view, currentTierlist, visiblePoolCount, rankings.pool]);

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
    const targetVisibleIds = [...event.to.querySelectorAll<HTMLElement>(".tier-item")]
      .map((node) => node.dataset.id)
      .filter((id): id is string => Boolean(id));

    event.item.classList.remove("tier-item--active");
    event.item.classList.add("tier-item--dropped");
    window.setTimeout(() => event.item.classList.remove("tier-item--dropped"), 200);

    if (!itemId) return;

    restoreSortableDom(rankingsRef.current, fromTier, toTier);

    setRankings((previous) => {
      const next: Rankings = { ...previous, pool: [...(previous.pool || [])] };
      tierConfig.forEach((tier) => {
        next[tier.id] = [...(previous[tier.id] || [])];
      });

      const sourceItems = next[fromTier] || [];
      const sourceIndex = sourceItems.indexOf(itemId);
      if (sourceIndex < 0) return previous;
      const [movedItem] = sourceItems.splice(sourceIndex, 1);

      const targetItems = fromTier === toTier ? sourceItems : [...(next[toTier] || [])];
      insertItemByVisibleNeighbors(targetItems, movedItem, targetVisibleIds);
      next[fromTier] = sourceItems;
      next[toTier] = targetItems;
      return next;
    });
  }, [tierConfig]);

  useEffect(() => {
    sortableRef.current.forEach((sortable) => sortable.destroy());
    sortableRef.current = [];
    if (view !== "tierlist") return;

    const startedAt = performance.now();
    let zoneCount = 0;
    document.querySelectorAll<HTMLElement>(".tier-items, .pool-items").forEach((zone) => {
      zoneCount += 1;
      const prefersTouchDrag = window.matchMedia("(pointer: coarse)").matches;
      const sortable = new Sortable(zone, {
        group: "tierlist-items",
        animation: prefersTouchDrag ? 0 : 150,
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
        scrollSpeed: prefersTouchDrag ? 6 : 10,
        bubbleScroll: !prefersTouchDrag,
        draggable: ".tier-item",
        forceFallback: prefersTouchDrag,
        fallbackOnBody: true,
        fallbackTolerance: prefersTouchDrag ? 8 : 3,
        onStart: (event) => {
          event.item.classList.add("tier-item--active");
        },
        onEnd: (event) => {
          handleSortableEnd(event);
        },
      });
      sortableRef.current.push(sortable);
    });
    profileLog("sortable setup", {
      zones: zoneCount,
      durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
    });

    return () => {
      sortableRef.current.forEach((sortable) => sortable.destroy());
      sortableRef.current = [];
    };
  }, [view, tierConfig, handleSortableEnd]);

  useEffect(() => {
    if (modal !== "edit") return;
    const handleColorPick = (event: Event) => {
      const { color, currentEl } = (event as CustomEvent<{ color?: string; currentEl?: Element | null }>).detail || {};
      if (!color || !(currentEl instanceof HTMLElement)) return;

      const tierId = currentEl.closest<HTMLElement>("[data-tier-id]")?.dataset.tierId;
      if (!tierId) return;

      setTierConfig((tiers) => tiers.map((tier) => tier.id === tierId ? { ...tier, color } : tier));
    };

    document.addEventListener("coloris:pick", handleColorPick);
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
      document.removeEventListener("coloris:pick", handleColorPick);
    };
  }, [modal, tierConfig.length]);

  useEffect(() => {
    editTierSortableRef.current?.destroy();
    editTierSortableRef.current = null;
    if (modal !== "edit") return;

    const list = document.querySelector<HTMLElement>(".edit-tiers-list");
    if (!list) return;

    editTierSortableRef.current = new Sortable(list, {
      animation: 150,
      draggable: ".edit-tier-row",
      handle: ".edit-tier-drag",
      ghostClass: "edit-tier-row--ghost",
      chosenClass: "edit-tier-row--chosen",
      dragClass: "edit-tier-row--dragging",
      onEnd: (event) => {
        const oldIndex = event.oldIndex;
        const newIndex = event.newIndex;
        if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) return;

        setTierConfig((tiers) => {
          const next = [...tiers];
          const [movedTier] = next.splice(oldIndex, 1);
          if (!movedTier) return tiers;
          next.splice(newIndex, 0, movedTier);
          return next;
        });
      },
    });

    return () => {
      editTierSortableRef.current?.destroy();
      editTierSortableRef.current = null;
    };
  }, [modal, tierConfig.length]);

  const loadTierlistView = useCallback((tierlist: TierlistDefinition) => {
    const startedAt = performance.now();
    routeStartRef.current = { id: tierlist.id, startedAt };
    setLoading(true);
    const stateStartedAt = performance.now();
    const savedState = loadTierlistState(tierlist);
    profileLog("load saved state", {
      id: tierlist.id,
      items: tierlist.images.length,
      restored: Boolean(savedState),
      durationMs: Math.round((performance.now() - stateStartedAt) * 100) / 100,
    });
    const tiers = savedState?.tierConfig || cloneDefaultTiers();
    setTierConfig(tiers);
    setTierIdCounter(savedState?.tierIdCounter || 0);
    setCurrentTierlist(tierlist);
    setCurrentFolder(findParentFolderForTierlist(tierlist.id, tierlists));
    setRankings(savedState?.rankings || buildInitialRankings(tiers, tierlist.images));
    setLoading(false);
    setView("tierlist");
    profileLog("load tierlist state scheduled", {
      id: tierlist.id,
      items: tierlist.images.length,
      durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
    });
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
        const defaultTiers = cloneDefaultTiers();
        setTierConfig(defaultTiers);
        setTierIdCounter(0);
        setRankings(buildInitialRankings(defaultTiers, currentTierlist.images));
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
    const screenshotStartedAt = performance.now();

    try {
      await nextPaint();
      profileLog("screenshot overlay painted", {
        durationMs: Math.round((performance.now() - screenshotStartedAt) * 100) / 100,
      });

      exportContainer = document.createElement("div");
      exportContainer.className = "screenshot-container";
      const clonedTiers = sourceElement.cloneNode(true) as HTMLElement;
      clonedTiers.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
      clonedTiers.removeAttribute("id");
      exportContainer.appendChild(clonedTiers);
      document.body.appendChild(exportContainer);

      const { getFontEmbedCSS, toPng } = await import("html-to-image");
      const fontStartedAt = performance.now();
      screenshotFontCssRef.current ||= await getFontEmbedCSS(exportContainer);
      profileLog("screenshot font css", {
        cached: Boolean(screenshotFontCssRef.current),
        durationMs: Math.round((performance.now() - fontStartedAt) * 100) / 100,
      });

      const exportStartedAt = performance.now();
      const dataUrl = await toPng(exportContainer, {
        backgroundColor: "#414254",
        fontEmbedCSS: screenshotFontCssRef.current,
        pixelRatio: 3,
        style: { transform: "none" },
      });
      profileLog("screenshot export", {
        width: exportContainer.scrollWidth * 3,
        height: exportContainer.scrollHeight * 3,
        dataUrlLength: dataUrl.length,
        durationMs: Math.round((performance.now() - exportStartedAt) * 100) / 100,
      });
      setScreenshotUrl(dataUrl);
      setCopyState("idle");
      setModal("screenshot");
    } finally {
      if (exportContainer) document.body.removeChild(exportContainer);
      document.body.style.cursor = "default";
      shaderRef.current?.setPaused(false);
      setScreenshotGenerating(false);
      profileLog("screenshot total", {
        durationMs: Math.round((performance.now() - screenshotStartedAt) * 100) / 100,
      });
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
      {loading && <LoadingOverlay label="Loading..." />}
      {screenshotGenerating && <LoadingOverlay label="Generating Screenshot..." />}
      <ProfileOutput />

      <MenuView view={view} onFolder={openFolder} onTierlist={openTierlist} />
      <FolderView view={view} folder={currentFolder} onBack={navigateTo} onFolder={openFolder} onTierlist={openTierlist} />
      <TierlistView
        view={view}
        tierlist={currentTierlist}
        tierConfig={tierConfig}
        rankings={rankings}
        imagesById={currentImagesById}
        poolItems={poolItems}
        weaponClassFilter={weaponClassFilter}
        weaponClassOptions={weaponClassOptions}
        showWeaponClassFilter={hasWeaponClassFilter}
        screenshotGenerating={screenshotGenerating}
        onBack={goBackFromTierlist}
        onReset={() => setModal("reset")}
        onEdit={() => setModal("edit")}
        onScreenshot={takeScreenshot}
        onWeaponClassFilterChange={setWeaponClassFilter}
      />

      <TierlistModals
        modal={modal}
        tierConfig={tierConfig}
        screenshotUrl={screenshotUrl}
        copyState={copyState}
        onClose={() => setModal("none")}
        onReset={resetTierlist}
        onAddTier={addTier}
        onDeleteTier={deleteTier}
        onTierColorChange={(tierId, color) => setTierConfig((tiers) => tiers.map((item) => item.id === tierId ? { ...item, color } : item))}
        onTierLabelChange={(tierId, label) => setTierConfig((tiers) => tiers.map((item) => item.id === tierId ? { ...item, label } : item))}
        onCopyScreenshot={copyScreenshot}
        onDownloadScreenshot={downloadScreenshot}
      />
    </div>
  );
}

function imageMatchesWeaponClass(image: TierlistImage | undefined, className: string) {
  const classNames = image?.classNames || [];
  return classNames.includes(className) || classNames.includes("All Class") || classNames.includes("All Classes");
}

function insertItemByVisibleNeighbors(items: string[], itemId: string, visibleIds: string[]) {
  const visibleIndex = visibleIds.indexOf(itemId);
  const previousVisibleId = visibleIndex > 0 ? visibleIds[visibleIndex - 1] : undefined;
  const nextVisibleId = visibleIndex >= 0 ? visibleIds[visibleIndex + 1] : undefined;

  if (previousVisibleId) {
    const previousIndex = items.indexOf(previousVisibleId);
    if (previousIndex >= 0) {
      items.splice(previousIndex + 1, 0, itemId);
      return;
    }
  }

  if (nextVisibleId) {
    const nextIndex = items.indexOf(nextVisibleId);
    if (nextIndex >= 0) {
      items.splice(nextIndex, 0, itemId);
      return;
    }
  }

  items.push(itemId);
}
