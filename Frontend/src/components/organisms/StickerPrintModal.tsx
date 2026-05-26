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
} from "../../services/masterApi";
import { stickersApi, StickerTemplate } from "../../services/stickersApi";
import {
  stickerPrinterConfigsApi,
  StickerPrinterConfig,
} from "../../services/stickerPrinterConfigsApi";

export interface StickerPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  initialManufacturers?: Manufacturer[];
}

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
  const [stickerType, setStickerType] = useState<"Combined" | "Separate">("Combined");
  const [printManufacturerId, setPrintManufacturerId] = useState<string | null>(null);
  const [printImporterId, setPrintImporterId] = useState<string | null>(null);
  const [importDate, setImportDate] = useState<Date>(new Date());
  const [stickerNote, setStickerNote] = useState("");
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
      importerId: stickerType === "Separate" && printImporterId ? Number(printImporterId) : undefined,
      size: stickerSize,
      type: stickerType,
      monthYear: format(importDate, "MMM/yyyy").toUpperCase(),
      batchNumber: "N/A",
      note: stickerNote.trim(),
      quantity,
    }),
    [printManufacturerId, printImporterId, stickerSize, stickerType, importDate, stickerNote],
  );

  const refreshPreview = useCallback(async () => {
    if (!product || !isOpen) {
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
  }, [buildStickerPayload, product, printQuantity, isOpen]);

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
                      { value: "50x50", label: "50x50" },
                      { value: "60x60", label: "60x60" },
                      { value: "75x75", label: "75x75" },
                    ]}
                  />
                </Box>
                <Box>
                  <Text size="10px" fw={800} c="dimmed" mb={5}>
                    LABEL MODE
                  </Text>
                  <Radio.Group
                    value={stickerType}
                    onChange={(value) => setStickerType(value as "Combined" | "Separate")}
                  >
                    <Stack gap={6}>
                      <Radio value="Combined" label="Imported & Marketed By" size="xs" />
                      <Radio value="Separate" label="Marketed / Imported" size="xs" />
                    </Stack>
                  </Radio.Group>
                </Box>
                <Select
                  label="Manufacturer"
                  size="xs"
                  radius="md"
                  placeholder="Default"
                  value={printManufacturerId}
                  onChange={setPrintManufacturerId}
                  searchable
                  clearable
                  data={manufacturerOptions}
                />
                {stickerType === "Separate" ? (
                  <Select
                    label="Importer"
                    size="xs"
                    radius="md"
                    placeholder="Select importer"
                    value={printImporterId}
                    onChange={setPrintImporterId}
                    searchable
                    clearable
                    data={importerOptions}
                  />
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
              <TextInput
                label="Note"
                size="xs"
                radius="md"
                mt="xs"
                placeholder="Optional note for sticker"
                value={stickerNote}
                onChange={(event) => setStickerNote(event.currentTarget.value)}
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
                    {stickerType === "Combined" ? "Imported & Marketed By" : "Marketed / Imported"}
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
                  <Text fw={700} size="lg" mb="xs">
                    No preview
                  </Text>
                  <Text size="sm" c="dimmed">
                    Preview not available for this configuration.
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
