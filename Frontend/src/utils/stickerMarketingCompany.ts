import type { Importer, Product } from "../services/masterApi";

export const normalizeCompanyName = (value?: string | null) =>
  (value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

export const findMarketingCompanyForProduct = (
  product: Product | null | undefined,
  importers: Importer[],
) => {
  const ownership = product?.ownership?.trim();
  if (!ownership) return importers[0] ?? null;

  const normalizedOwnership = normalizeCompanyName(ownership);
  const targetName = normalizedOwnership === "self" ? "plusgrow" : normalizedOwnership;

  return (
    importers.find((item) => normalizeCompanyName(item.name) === targetName) ??
    importers.find((item) => {
      const importerName = normalizeCompanyName(item.name);
      return importerName.includes(targetName) || targetName.includes(importerName);
    }) ??
    importers[0] ??
    null
  );
};
