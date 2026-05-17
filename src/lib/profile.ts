export function isProfileEnabled() {
  return typeof window !== "undefined" && new URLSearchParams(window.location.search).has("profile");
}

export function profileLog(label: string, data: Record<string, unknown> = {}) {
  if (!isProfileEnabled()) return;
  const detail = `[tc2-profile] ${label} ${JSON.stringify(data)}`;
  console.log(detail);
  window.dispatchEvent(new CustomEvent("tc2-profile", { detail }));
}
