/**
 * ProductNotFound Component
 * Shared empty/not-found state shown when a SKU lookup returns no product.
 * Use this instead of an error toast so the "not found" result is presented
 * clearly in the page body.
 */

import React from "react";
import { Box, Center, Stack, Text, ThemeIcon } from "@mantine/core";
import { PackageX } from "lucide-react";

export interface ProductNotFoundProps {
  /** The SKU / code that was searched for (rendered as a badge) */
  sku?: string | null;
  /** Optional heading override */
  title?: string;
  /** Optional description override */
  description?: string;
  /** Optional action node (e.g. a "Clear" or "Add product" button) */
  action?: React.ReactNode;
}

export function ProductNotFound({
  sku,
  title = "Product Not Found",
  description,
  action,
}: ProductNotFoundProps) {
  const trimmedSku = sku?.trim();
  const resolvedDescription =
    description ??
    "No product matches this SKU code in the catalog. Check the code and scan again, or add the product to the master.";

  return (
    <Center style={{ height: "100%", minHeight: 240 }} p="lg">
      <Stack align="center" gap="sm" ta="center">
        <ThemeIcon
          size={56}
          radius="xl"
          variant="light"
          color="orange"
          style={{
            background: "rgba(245, 158, 11, 0.10)",
            border: "1px solid rgba(245, 158, 11, 0.28)",
            color: "var(--mantine-color-orange-4)",
          }}
        >
          <PackageX size={28} />
        </ThemeIcon>
        <Box>
          <Text fw={800} size="sm">
            {title}
          </Text>
          {trimmedSku ? (
            <Text
              size="12px"
              fw={800}
              ff="monospace"
              mt={6}
              style={{ color: "var(--mantine-color-orange-3)" }}
            >
              {trimmedSku}
            </Text>
          ) : null}
          <Text size="xs" c="dimmed" mt={4} maw={340} style={{ lineHeight: 1.5 }}>
            {resolvedDescription}
          </Text>
        </Box>
        {action ? <Box>{action}</Box> : null}
      </Stack>
    </Center>
  );
}

ProductNotFound.displayName = "ProductNotFound";
