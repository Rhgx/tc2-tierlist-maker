import type { AppRoute } from "../appTypes";

function appBasePath() {
  const path = new URL(import.meta.env.BASE_URL, window.location.origin).pathname;
  return path.endsWith("/") ? path.slice(0, -1) : path;
}

export function routePath(route: AppRoute) {
  const base = appBasePath();
  const suffix = route.view === "menu"
    ? "/"
    : `/${route.view}/${encodeURIComponent(route.id)}`;
  return `${base}${suffix}`.replace(/\/{2,}/g, "/") || "/";
}

export function parseRouteFromLocation(): AppRoute {
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
