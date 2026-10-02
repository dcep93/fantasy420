export function normalizePlayerName(name: string) {
  return name.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()
    .replace(/[.'’]/g, "").replace(/[_\s]+/g, " ").trim();
}
