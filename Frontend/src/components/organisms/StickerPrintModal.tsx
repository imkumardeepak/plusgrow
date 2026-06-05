import React, { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  Badge,
  Box,
  Center,
  Divider,
  Group,
  Image,
  Loader,
  NumberInput,
  Paper,
  Radio,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { Printer, Tag } from "lucide-react";

import { Modal } from "../atoms/Modal";
import { Button } from "../atoms/Button";
import { toast } from "../../lib/toast";
import {
  manufacturersApi,
  importersApi,
  Product,
  Manufacturer,
  Importer,
  validateProductForSticker,
} from "../../services/masterApi";
import { stickersApi, StickerTemplate } from "../../services/stickersApi";
import {
  stickerPrinterConfigsApi,
  StickerPrinterConfig,
} from "../../services/stickerPrinterConfigsApi";
import { findMarketingCompanyForProduct } from "../../utils/stickerMarketingCompany";

export interface StickerPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  initialManufacturers?: Manufacturer[];
}

type StickerMode = "Combined" | "Separate" | "Manufacture";

const stickerModeLabel: Record<StickerMode, string> = {
  Combined: "Imported & Marketed By",
  Separate: "Marketed / Imported",
  Manufacture: "Marketed By / Manufacture By",
};

export function StickerPrintModal({
  isOpen,
  onClose,
  product,
  initialManufacturers,
}: StickerPrintModalProps) {
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>(initialManufacturers || []);
  const [printerConfigs, setPrinterConfigs] = useState<StickerPrinterConfig[]>([]);
  const [templates, setTemplates] = useState<StickerTemplate[]>([]);
  const [importers, setImporters] = useState<Importer[]>([]);

  const [stickerSize, setStickerSize] = useState("50x50");
  const [stickerType, setStickerType] = useState<StickerMode>("Combined");
  const [printManufacturerId, setPrintManufacturerId] = useState<string | null>(null);
  const [printImporterId, setPrintImporterId] = useState<string | null>(null);
  const [importDate, setImportDate] = useState<Date>(new Date());
  const [printQuantity, setPrintQuantity] = useState<number | "">(1);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (!initialManufacturers) {
        manufacturersApi.getAll().then(setManufacturers).catch(() => { });
      }
      stickersApi.getTemplates().then(setTemplates).catch(() => { });
      stickerPrinterConfigsApi.getAll().then(setPrinterConfigs).catch(() => { });
      importersApi.getAll().then(setImporters).catch(() => { });
    }
  }, [isOpen, initialManufacturers]);

  useEffect(() => {
    if (stickerSize === "25x25" && stickerType !== "Combined") {
      setStickerType("Combined");
    }
  }, [stickerSize, stickerType]);

  useEffect(() => {
    setPrintManufacturerId(product?.manufacturerId ? String(product.manufacturerId) : null);
  }, [product]);

  useEffect(() => {
    if (!product || stickerSize === "25x25") {
      setPrintImporterId(null);
      return;
    }

    const marketingCompany = findMarketingCompanyForProduct(product, importers);
    setPrintImporterId(marketingCompany ? String(marketingCompany.id) : null);
  }, [importers, product, stickerSize]);

  const manufacturerOptions = useMemo(
    () => manufacturers.map((item) => ({ value: String(item.id), label: item.name })),
    [manufacturers],
  );

  const importerOptions = useMemo(
    () => importers.map((item) => ({ value: String(item.id), label: item.name })),
    [importers],
  );

  const printerConfig = useMemo(
    () => printerConfigs.find((config) => config.stickerSize === stickerSize && config.isActive) ?? null,
    [printerConfigs, stickerSize],
  );

  const activeTemplate = useMemo(
    () => templates.find((template) => template.size === stickerSize && template.type === stickerType) ?? null,
    [stickerSize, stickerType, templates],
  );

  const getPrinterAddress = () => {
    const config = printerConfigs.find((c) => c.stickerSize === stickerSize && c.isActive);
    if (!config?.printerIp?.trim()) return null;
    return `${config.printerIp.trim()}:${config.printerPort}`;
  };

  const buildStickerPayload = useCallback(
    (prod: Product, quantity: number) => ({
      productId: prod.id,
      manufacturerId: printManufacturerId ? Number(printManufacturerId) : undefined,
      importerId: stickerSize !== "25x25" && printImporterId ? Number(printImporterId) : undefined,
      size: stickerSize,
      type: stickerType,
      monthYear: format(importDate, "MMM/yyyy").toUpperCase(),
      batchNumber: "N/A",
      note: prod.note?.trim() || "",
      quantity,
    }),
    [printManufacturerId, printImporterId, stickerSize, stickerType, importDate],
  );

  const refreshPreview = useCallback(async () => {
    if (!product || !isOpen) {
      setPreviewUrl(null);
      return;
    }

    const validationErrors = validateProductForSticker(product, stickerSize);
    if (validationErrors.length > 0) {
      setPreviewUrl(null);
      return;
    }

    if (stickerSize !== "25x25" && !printImporterId) {
      setPreviewUrl(null);
      return;
    }

    setIsPreviewLoading(true);
    try {
      const nextPreview = await stickersApi.getPreview(
        buildStickerPayload(product, Number(printQuantity) || 1),
      );
      setPreviewUrl((previousUrl) => {
        if (previousUrl) URL.revokeObjectURL(previousUrl);
        return nextPreview;
      });
    } catch {
      setPreviewUrl(null);
    } finally {
      setIsPreviewLoading(false);
    }
  }, [buildStickerPayload, product, printQuantity, isOpen, stickerSize]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshPreview();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [refreshPreview]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handlePrint = async () => {
    if (!product) return;

    const validationErrors = validateProductForSticker(product, stickerSize);
    if (validationErrors.length > 0) {
      toast.error("Cannot print sticker. Missing product data: " + validationErrors.join(", "));
      return;
    }

    if (stickerSize !== "25x25" && !printImporterId) {
      toast.error("Please select Marketing Company");
      return;
    }

    const printerAddress = getPrinterAddress();
    if (!printerAddress) {
      toast.error("Active printer profile not found for selected sticker size");
      return;
    }

    const quantity = Number(printQuantity) || 1;
    setIsPrinting(true);
    try {
      await stickersApi.print({
        printerIp: printerAddress,
        items: [
          {
            config: buildStickerPayload(product, quantity),
            quantity,
          },
        ],
      });
      toast.success(`${quantity} stickers sent to printer`);
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Sticker print job failed");
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Print Product Stickers"
      size="xxl"
    >
      {product ? (
        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
          <Stack gap="md">
            <Paper radius="md" p="md" withBorder>
              <SimpleGrid cols={2} spacing="md">
                <Box>
                  <Text size="10px" fw={800} c="dimmed" mb={5}>
                    LABEL SIZE
                  </Text>
                  <SegmentedControl
                    fullWidth
                    size="xs"
                    radius="md"
                    value={stickerSize}
                    onChange={setStickerSize}
                    data={[
                      { value: "25x25", label: "25x25" },
                      { value: "38x38", label: "38x38" },
                      { value: "50x50", label: "50x50" },
                      { value: "60x60", label: "60x60" },
                      { value: "75x75", label: "75x75" },
                    ]}
                  />
                </Box>
                {stickerSize !== "25x25" ? (
                  <Box>
                    <Text size="10px" fw={800} c="dimmed" mb={5}>
                      LABEL MODE
                    </Text>
                    <Radio.Group
                      value={stickerType}
                      onChange={(value) => setStickerType(value as StickerMode)}
                    >
                      <Stack gap={6}>
                        <Radio value="Combined" label={stickerModeLabel.Combined} size="xs" />
                        <Radio value="Separate" label={stickerModeLabel.Separate} size="xs" />
                        <Radio value="Manufacture" label={stickerModeLabel.Manufacture} size="xs" />
                      </Stack>
                    </Radio.Group>
                  </Box>
                ) : (
                  <Box>
                    <Text size="10px" fw={800} c="dimmed">
                      TEMPLATE
                    </Text>
                    <Text size="xs" fw={700} lineClamp={1} mt={4}>
                      {activeTemplate?.name || "Template missing"}
                    </Text>
                  </Box>
                )}
                {stickerSize !== "25x25" ? (
                  <Select
                    label="Marketing Company"
                    size="xs"
                    radius="md"
                    placeholder="Select Marketing Company from importer master"
                    value={printImporterId}
                    onChange={setPrintImporterId}
                    data={importerOptions}
                  />
                ) : stickerSize !== "25x25" ? (
                  <Box>
                    <Text size="10px" fw={800} c="dimmed">
                      TEMPLATE
                    </Text>
                    <Text size="xs" fw={700} lineClamp={1} mt={4}>
                      {activeTemplate?.name || "Template missing"}
                    </Text>
                  </Box>
                ) : null}
              </SimpleGrid>
              <TextInput
                label="Import Date"
                size="xs"
                radius="md"
                mt="sm"
                type="date"
                value={format(importDate, "yyyy-MM-dd")}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setImportDate(value ? new Date(value) : new Date());
                }}
              />
            </Paper>

            <Paper radius="md" p="sm" withBorder>
              <Text size="xs" fw={800} mb="xs">
                Product Info
              </Text>
              <Group justify="space-between" align="flex-start">
                <Box>
                  <Text size="xs" c="dimmed">
                    SKU
                  </Text>
                  <Text size="sm" fw={800} ff="monospace" c="cyan.3">
                    {product.sku || "N/A"}
                  </Text>
                  <Text size="xs" c="dimmed" mt="xs">
                    Product
                  </Text>
                  <Text size="sm" fw={700}>
                    {product.name}
                  </Text>
                  <Text size="xs" c="dimmed" mt="xs">
                    Origin
                  </Text>
                  <Text size="xs">
                    {product.countryOfOrigin || "N/A"} • {product.unitType || "UNIT"}
                  </Text>
                </Box>
              </Group>
              <Divider my="sm" />
              <Text size="xs" c="dimmed">
                Import Date
              </Text>
              <Text size="xs" fw={700}>
                {format(importDate, "MMM/yyyy").toUpperCase()}
              </Text>
            </Paper>

            <Paper radius="md" p="sm" withBorder>
              <SimpleGrid cols={3} spacing="xs">
                <Box>
                  <Text size="10px" fw={800} c="dimmed">
                    SIZE
                  </Text>
                  <Text size="xs" fw={800}>
                    {stickerSize}
                  </Text>
                </Box>
                <Box>
                  <Text size="10px" fw={800} c="dimmed">
                    MODE
                  </Text>
                  <Text size="xs" fw={800}>
                    {stickerModeLabel[stickerType]}
                  </Text>
                </Box>
                <Box>
                  <Text size="10px" fw={800} c="dimmed">
                    PRINTER
                  </Text>
                  <Text size="xs" fw={800}>
                    {printerConfig ? `${printerConfig.printerIp}:${printerConfig.printerPort}` : "Not configured"}
                  </Text>
                </Box>
              </SimpleGrid>
            </Paper>
          </Stack>

          <Stack gap="sm">
            <Paper radius="md" p="sm" withBorder>
              <Group justify="space-between" mb="xs">
                <Text size="xs" fw={800}>
                  Preview
                </Text>
                <Badge size="xs" variant="light" color="cyan">
                  {activeTemplate?.fileName || "Template missing"}
                </Badge>
              </Group>
              {isPreviewLoading ? (
                <Center h={300}>
                  <Loader size="sm" />
                </Center>
              ) : previewUrl ? (
                <Center h={300}>
                  <Image
                    src={previewUrl}
                    alt="Sticker preview"
                    fit="contain"
                    mah={280}
                    radius="sm"
                    style={{ background: "white", padding: 12 }}
                  />
                </Center>
              ) : (
                  <Paper withBorder radius="md" p="xl" style={{ textAlign: "center" }}>
                    <Tag size={48} style={{ marginBottom: 12 }} />
                    <Text fw={700} size="lg" mb="xs" c={product && validateProductForSticker(product, stickerSize).length > 0 ? "red.4" : undefined}>
                      {product && validateProductForSticker(product, stickerSize).length > 0
                        ? "Missing Product Data" 
                        : "No preview"}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {product && validateProductForSticker(product, stickerSize).length > 0
                        ? `Please fill missing product fields: ${validateProductForSticker(product, stickerSize).join(", ")}`
                        : "Preview not available for this configuration."}
                    </Text>
                  </Paper>
              )}
            </Paper>

            <Paper radius="md" p="sm" withBorder>
              <Text size="xs" fw={800} mb="xs">
                Print Quantity
              </Text>
              <NumberInput
                size="xs"
                label="Quantity"
                min={1}
                max={999}
                value={printQuantity}
                onChange={(value) => setPrintQuantity(typeof value === "number" ? value : "")}
              />
              <Group mt="sm" grow>
                <Button size="xs" leftIcon={<Printer size={14} />} onClick={() => void handlePrint()} loading={isPrinting}>
                  Print
                </Button>
              </Group>
            </Paper>
          </Stack>
        </SimpleGrid>
      ) : null}
    </Modal>
  );
}
