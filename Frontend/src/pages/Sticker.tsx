import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  IconAlertCircle,
  IconCheck,
  IconInfoCircle,
  IconLayersIntersect,
  IconPrinter,
  IconTag,
} from "@tabler/icons-react";
import {
  Alert,
  Badge,
  Box,
  Button,
  Center,
  Divider,
  Grid,
  Group,
  Image,
  Loader,
  Modal,
  Paper,
  ScrollArea,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  UnstyledButton,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Printer, RefreshCw, Search } from "lucide-react";

import {
  OperationsEmptyState,
  OperationsPage,
  OperationsPanel,
} from "../components/organisms/Operations/OperationsShell";
import {
  Importer,
  Manufacturer,
  PoInvoice,
  Product,
  importersApi,
  manufacturersApi,
  poInvoicesApi,
  productsApi,
} from "../services/masterApi";
import {
  StickerTemplate,
  stickersApi,
} from "../services/stickersApi";
import {
  StickerPrinterConfig,
  stickerPrinterConfigsApi,
} from "../services/stickerPrinterConfigsApi";

type StickerBatch = {
  key: string;
  invoiceDate: string;
  invoiceNumber: string;
  partyName: string;
  rows: PoInvoice[];
  pendingRows: PoInvoice[];
  totalLines: number;
  totalLabels: number;
  pendingLabels: number;
};

const buildBatchKey = (invoiceDate: string, partyName: string) =>
  `${invoiceDate.slice(0, 10)}__${partyName.trim().toLowerCase()}`;

export const Sticker = memo(function Sticker() {
  const [poInvoices, setPoInvoices] = useState<PoInvoice[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [importers, setImporters] = useState<Importer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [printerConfigs, setPrinterConfigs] = useState<StickerPrinterConfig[]>(
    [],
  );
  const [templates, setTemplates] = useState<StickerTemplate[]>([]);
  const [selectedBatchKey, setSelectedBatchKey] = useState("");
  const [batchSearch, setBatchSearch] = useState("");
  const [stickerSize, setStickerSize] = useState("50x50");
  const [stickerType, setStickerType] = useState<"Combined" | "Separate">(
    "Combined",
  );
  const [manufacturerId, setManufacturerId] = useState<string | null>(null);
  const [importerId, setImporterId] = useState<string | null>(null);
  const [printerIp, setPrinterIp] = useState("192.168.10.151");
  const [printerPort, setPrinterPort] = useState(9100);
  const [isLoading, setIsLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [
        invoiceData,
        manufacturerData,
        importerData,
        productData,
        configData,
        templateData,
      ] = await Promise.all([
        poInvoicesApi.getAll(),
        manufacturersApi.getAll(),
        importersApi.getAll(),
        productsApi.getAll(),
        stickerPrinterConfigsApi.getAll(),
        stickersApi.getTemplates(),
      ]);

      setPoInvoices(invoiceData);
      setManufacturers(manufacturerData);
      setImporters(importerData);
      setProducts(productData);
      setPrinterConfigs(configData);
      setTemplates(templateData);
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to load invoice batches for sticker printing",
        color: "red",
        icon: <IconAlertCircle size={18} />,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const config = printerConfigs.find(
      (item) => item.stickerSize === stickerSize && item.isActive,
    );
    if (config) {
      setPrinterIp(config.printerIp);
      setPrinterPort(config.printerPort);
    }
  }, [printerConfigs, stickerSize]);

  const batches = useMemo<StickerBatch[]>(() => {
    const grouped = new Map<string, PoInvoice[]>();

    poInvoices.forEach((row) => {
      const key = buildBatchKey(row.invoiceDate, row.partyName);
      grouped.set(key, [...(grouped.get(key) ?? []), row]);
    });

    return Array.from(grouped.entries())
      .map(([key, rows]) => {
        const pendingRows = rows.filter((row) => !row.printed);

        return {
          key,
          invoiceDate: rows[0].invoiceDate,
          invoiceNumber: rows[0].invoiceNumber,
          partyName: rows[0].partyName,
          rows: rows.sort((a, b) => a.productName.localeCompare(b.productName)),
          pendingRows,
          totalLines: rows.length,
          totalLabels: rows.reduce((sum, row) => sum + row.billedQty, 0),
          pendingLabels: pendingRows.reduce(
            (sum, row) => sum + row.billedQty,
            0,
          ),
        };
      })
      .sort((a, b) => {
        const dateDiff =
          new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime();
        if (dateDiff !== 0) return dateDiff;
        return a.partyName.localeCompare(b.partyName);
      });
  }, [poInvoices]);

  const filteredBatches = useMemo(() => {
    const query = batchSearch.trim().toLowerCase();
    if (!query) return batches;

    return batches.filter((batch) => {
      const dateLabel = format(new Date(batch.invoiceDate), "dd MMM yyyy")
        .toLowerCase();
      return (
        batch.partyName.toLowerCase().includes(query) ||
        batch.invoiceNumber.toLowerCase().includes(query) ||
        dateLabel.includes(query)
      );
    });
  }, [batchSearch, batches]);

  const selectedBatch = useMemo(
    () => batches.find((batch) => batch.key === selectedBatchKey) ?? null,
    [batches, selectedBatchKey],
  );

  const previewRow =
    selectedBatch?.pendingRows[0] ?? selectedBatch?.rows[0] ?? null;

  const previewProduct = useMemo(
    () =>
      previewRow
        ? products.find((item) => item.id === previewRow.productId) ?? null
        : null,
    [previewRow, products],
  );

  const selectedManufacturer = useMemo(
    () =>
      manufacturers.find((item) => String(item.id) === manufacturerId) ?? null,
    [manufacturerId, manufacturers],
  );

  const selectedImporter = useMemo(
    () => importers.find((item) => String(item.id) === importerId) ?? null,
    [importerId, importers],
  );

  const monthYear = useMemo(
    () =>
      selectedBatch
        ? format(new Date(selectedBatch.invoiceDate), "MMM/yyyy").toUpperCase()
        : "",
    [selectedBatch],
  );

  const invoiceNumber = selectedBatch?.invoiceNumber ?? "";
  const previewQuantity = previewRow?.billedQty ?? 1;

  const activeTemplate = useMemo(
    () =>
      templates.find(
        (template) =>
          template.size === stickerSize && template.type === stickerType,
      ) ?? null,
    [stickerSize, stickerType, templates],
  );

  const manufacturerOptions = useMemo(
    () =>
      manufacturers.map((item) => ({
        value: String(item.id),
        label: item.name,
      })),
    [manufacturers],
  );

  const importerOptions = useMemo(
    () =>
      importers.map((item) => ({
        value: String(item.id),
        label: item.name,
      })),
    [importers],
  );

  useEffect(() => {
    if (stickerType === "Combined") {
      setImporterId(null);
    }
  }, [stickerType]);

  useEffect(() => {
    if (!filteredBatches.length) {
      setSelectedBatchKey("");
      return;
    }

    if (
      !selectedBatchKey ||
      !filteredBatches.some((batch) => batch.key === selectedBatchKey)
    ) {
      setSelectedBatchKey(filteredBatches[0].key);
    }
  }, [filteredBatches, selectedBatchKey]);

  const handlePreview = useCallback(async () => {
    if (!previewRow || !selectedBatch) {
      setPreviewUrl(null);
      return;
    }

    setIsPreviewLoading(true);
    try {
      const nextPreview = await stickersApi.getPreview({
        productId: previewRow.productId,
        manufacturerId: manufacturerId ? Number(manufacturerId) : undefined,
        importerId:
          stickerType === "Separate" && importerId
            ? Number(importerId)
            : undefined,
        size: stickerSize,
        type: stickerType,
        monthYear,
        batchNumber: invoiceNumber,
        note: "",
        quantity: previewQuantity,
      });

      setPreviewUrl((previousPreview) => {
        if (previousPreview) {
          URL.revokeObjectURL(previousPreview);
        }
        return nextPreview;
      });
    } catch (error) {
      setPreviewUrl(null);
    } finally {
      setIsPreviewLoading(false);
    }
  }, [
    importerId,
    invoiceNumber,
    manufacturerId,
    monthYear,
    previewQuantity,
    previewRow,
    selectedBatch,
    stickerSize,
    stickerType,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void handlePreview();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [handlePreview]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handlePrintBatch = async () => {
    if (!selectedBatch) {
      notifications.show({
        title: "Selection Required",
        message: "Select invoice batch first",
        color: "orange",
      });
      return;
    }

    const printableRows = selectedBatch.pendingRows.filter(
      (row) => row.billedQty > 0,
    );

    if (!printableRows.length) {
      notifications.show({
        title: "Complete",
        message: "All stickers for this batch already printed",
        color: "blue",
      });
      return;
    }

    if (!printerIp.trim()) {
      notifications.show({
        title: "Setup Error",
        message: "Printer IP is required",
        color: "red",
      });
      return;
    }

    setIsPrinting(true);
    try {
      await stickersApi.print({
        printerIp: `${printerIp.trim()}:${printerPort}`,
        items: printableRows.map((row) => ({
          config: {
            productId: row.productId,
            manufacturerId: manufacturerId ? Number(manufacturerId) : undefined,
            importerId:
              stickerType === "Separate" && importerId
                ? Number(importerId)
                : undefined,
            size: stickerSize,
            type: stickerType,
            monthYear,
            batchNumber: invoiceNumber,
            note: "",
            quantity: row.billedQty,
          },
          quantity: row.billedQty,
        })),
      });

      await poInvoicesApi.markPrinted(printableRows.map((row) => row.id));

      notifications.show({
        title: "Success",
        message: `Printed ${selectedBatch.pendingLabels} stickers for ${selectedBatch.partyName}`,
        color: "green",
        icon: <IconCheck size={18} />,
      });

      await loadData();
    } catch (error: any) {
      notifications.show({
        title: "Print Error",
        message: error.message || "Failed to print sticker batch",
        color: "red",
        icon: <IconAlertCircle size={18} />,
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const totalBatches = batches.length;
  const pendingBatches = batches.filter(
    (batch) => batch.pendingRows.length > 0,
  ).length;
  const totalPendingLabels = batches.reduce(
    (sum, batch) => sum + batch.pendingLabels,
    0,
  );
  const totalPrintedLines = poInvoices.filter((row) => row.printed).length;
  const readyToPrint = Boolean(
    selectedBatch && selectedBatch.pendingRows.length > 0 && printerIp.trim(),
  );

  return (
    <OperationsPage
      title="Sticker Studio"
      description="Work batch by batch. Pick queue item, verify label setup, inspect live preview, then print pending stickers in one controlled run."
      icon={Printer}
      metrics={[
        { label: "Batches", value: totalBatches },
        { label: "Pending Batches", value: pendingBatches, tone: "warning" },
        { label: "Pending Labels", value: totalPendingLabels, tone: "brand" },
        { label: "Printed Lines", value: totalPrintedLines, tone: "success" },
      ]}
      actions={
        <Button
          variant="light"
          color="gray"
          leftSection={<RefreshCw size={14} />}
          onClick={() => void loadData()}
          loading={isLoading}
        >
          Refresh Queue
        </Button>
      }
    >
      <Grid gutter="md">
        <Grid.Col span={{ base: 12, xl: 3 }}>
          <OperationsPanel
            title="Batch Queue"
            icon={IconLayersIntersect}
            description="Recent invoice batches with pending status."
          >
            <Stack gap="md" h="100%">
              <TextInput
                value={batchSearch}
                onChange={(event) => setBatchSearch(event.currentTarget.value)}
                placeholder="Search party, invoice, date..."
                leftSection={<Search size={14} />}
                radius="xl"
              />

              <ScrollArea.Autosize mah={620}>
                <Stack gap="xs">
                  {isLoading ? (
                    <Center h={220}>
                      <Loader size="sm" />
                    </Center>
                  ) : filteredBatches.length === 0 ? (
                    <OperationsEmptyState
                      icon={IconLayersIntersect}
                      title="No invoice batches"
                      description="Upload inward rows first or clear search filter."
                    />
                  ) : (
                    filteredBatches.map((batch) => {
                      const isActive = batch.key === selectedBatchKey;
                      const isComplete = batch.pendingRows.length === 0;

                      return (
                        <UnstyledButton
                          key={batch.key}
                          onClick={() => setSelectedBatchKey(batch.key)}
                          style={{
                            width: "100%",
                            borderRadius: 18,
                            border: isActive
                              ? "1px solid rgba(67, 212, 255, 0.45)"
                              : "1px solid rgba(255,255,255,0.07)",
                            background: isActive
                              ? "linear-gradient(180deg, rgba(30,192,243,0.14) 0%, rgba(255,255,255,0.04) 100%)"
                              : "rgba(255,255,255,0.02)",
                            padding: 14,
                            boxShadow: isActive
                              ? "0 12px 28px rgba(30,192,243,0.12)"
                              : "none",
                            transition: "all 180ms ease",
                          }}
                        >
                          <Stack gap={10}>
                            <Group justify="space-between" align="flex-start" wrap="nowrap">
                              <Box style={{ minWidth: 0 }}>
                                <Text fw={700} size="sm" c="white" lineClamp={1}>
                                  {batch.partyName}
                                </Text>
                                <Text size="xs" c="dimmed" mt={2}>
                                  {batch.invoiceNumber}
                                </Text>
                              </Box>
                              <Badge
                                color={isComplete ? "green" : "orange"}
                                variant={isComplete ? "light" : "filled"}
                                radius="xl"
                              >
                                {isComplete ? "Printed" : "Open"}
                              </Badge>
                            </Group>

                            <Group justify="space-between" gap="sm" wrap="nowrap">
                              <Text size="11px" c="dimmed">
                                {format(new Date(batch.invoiceDate), "dd MMM yyyy")}
                              </Text>
                              <Text size="11px" fw={700} c="cyan.3">
                                {batch.pendingLabels}/{batch.totalLabels} labels
                              </Text>
                            </Group>

                            <SimpleGrid cols={3} spacing="xs">
                              <Paper
                                radius="lg"
                                p="xs"
                                withBorder
                                style={{ background: "rgba(255,255,255,0.02)" }}
                              >
                                <Text size="10px" c="dimmed" fw={800}>
                                  LINES
                                </Text>
                                <Text fw={800} mt={4}>
                                  {batch.totalLines}
                                </Text>
                              </Paper>
                              <Paper
                                radius="lg"
                                p="xs"
                                withBorder
                                style={{ background: "rgba(255,255,255,0.02)" }}
                              >
                                <Text size="10px" c="dimmed" fw={800}>
                                  PENDING
                                </Text>
                                <Text fw={800} mt={4} c="orange.3">
                                  {batch.pendingRows.length}
                                </Text>
                              </Paper>
                              <Paper
                                radius="lg"
                                p="xs"
                                withBorder
                                style={{ background: "rgba(255,255,255,0.02)" }}
                              >
                                <Text size="10px" c="dimmed" fw={800}>
                                  LABELS
                                </Text>
                                <Text fw={800} mt={4} c="cyan.3">
                                  {batch.totalLabels}
                                </Text>
                              </Paper>
                            </SimpleGrid>
                          </Stack>
                        </UnstyledButton>
                      );
                    })
                  )}
                </Stack>
              </ScrollArea.Autosize>
            </Stack>
          </OperationsPanel>
        </Grid.Col>

        <Grid.Col span={{ base: 12, xl: 6 }}>
          <OperationsPanel
            title="Print Studio"
            icon={IconTag}
            description="Configure label, validate entity mapping, inspect first output."
          >
            {selectedBatch ? (
              <Stack gap="md">
                <Paper
                  radius="xl"
                  p="md"
                  withBorder
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(30,192,243,0.12) 0%, rgba(255,255,255,0.03) 100%)",
                  }}
                >
                  <Group justify="space-between" align="flex-start" gap="md">
                    <Box style={{ minWidth: 0 }}>
                      <Text size="10px" fw={900} c="cyan.3" style={{ letterSpacing: "0.16em" }}>
                        ACTIVE BATCH
                      </Text>
                      <Text fw={800} size="lg" c="white" mt={6} lineClamp={1}>
                        {selectedBatch.partyName}
                      </Text>
                      <Text size="sm" c="dimmed" mt={4}>
                        {selectedBatch.invoiceNumber} ·{" "}
                        {format(new Date(selectedBatch.invoiceDate), "dd MMM yyyy")} · {monthYear}
                      </Text>
                    </Box>
                    <Group gap="xs">
                      <Badge radius="xl" variant="light" color="cyan">
                        {selectedBatch.totalLines} rows
                      </Badge>
                      <Badge
                        radius="xl"
                        variant="filled"
                        color={
                          selectedBatch.pendingRows.length > 0 ? "orange" : "green"
                        }
                      >
                        {selectedBatch.pendingLabels} pending
                      </Badge>
                    </Group>
                  </Group>
                </Paper>

                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                  <Paper radius="xl" p="md" withBorder style={{ background: "rgba(255,255,255,0.02)" }}>
                    <Stack gap="sm">
                      <Text size="xs" fw={800} c="dimmed">
                        LABEL SIZE
                      </Text>
                      <SegmentedControl
                        fullWidth
                        radius="xl"
                        value={stickerSize}
                        onChange={setStickerSize}
                        data={[
                          { value: "50x50", label: "50×50" },
                          { value: "60x60", label: "60×60" },
                          { value: "75x75", label: "75×75" },
                        ]}
                      />
                    </Stack>
                  </Paper>

                  <Paper radius="xl" p="md" withBorder style={{ background: "rgba(255,255,255,0.02)" }}>
                    <Stack gap="sm">
                      <Text size="xs" fw={800} c="dimmed">
                        LABEL MODE
                      </Text>
                      <SegmentedControl
                        fullWidth
                        radius="xl"
                        value={stickerType}
                        onChange={(value) =>
                          setStickerType(value as "Combined" | "Separate")
                        }
                        data={[
                          { value: "Combined", label: "Combined" },
                          { value: "Separate", label: "Separate" },
                        ]}
                      />
                    </Stack>
                  </Paper>
                </SimpleGrid>

                <SimpleGrid cols={{ base: 1, md: stickerType === "Separate" ? 2 : 1 }} spacing="md">
                  <Select
                    label="Manufacturer"
                    value={manufacturerId}
                    onChange={setManufacturerId}
                    placeholder="Select manufacturer"
                    searchable
                    clearable
                    radius="xl"
                    data={manufacturerOptions}
                  />

                  {stickerType === "Separate" ? (
                    <Select
                      label="Importer"
                      value={importerId}
                      onChange={setImporterId}
                      placeholder="Select importer"
                      searchable
                      clearable
                      radius="xl"
                      data={importerOptions}
                    />
                  ) : null}
                </SimpleGrid>

                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                  <Paper radius="xl" p="md" withBorder style={{ background: "rgba(255,255,255,0.02)" }}>
                    <Stack gap={6}>
                      <Text size="xs" fw={800} c="dimmed">
                        ACTIVE TEMPLATE
                      </Text>
                      <Text fw={700} c="white">
                        {activeTemplate?.name || "Template not found"}
                      </Text>
                      <Text size="sm" c="dimmed" ff="monospace">
                        {activeTemplate?.fileName || `${stickerType}-${stickerSize}`}
                      </Text>
                      <Divider my={4} opacity={0.2} />
                      <Text size="sm" c="dimmed">
                        Product: {previewProduct?.name || "No product"}
                      </Text>
                      <Text size="sm" c="dimmed">
                        Unit: {previewProduct?.unitType || "No unit"}
                      </Text>
                      <Text size="sm" c="dimmed">
                        Preview quantity: {previewQuantity}
                      </Text>
                    </Stack>
                  </Paper>

                  <Paper radius="xl" p="md" withBorder style={{ background: "rgba(255,255,255,0.02)" }}>
                    <Stack gap={6}>
                      <Text size="xs" fw={800} c="dimmed">
                        ENTITY MAPPING
                      </Text>
                      <Text fw={700} c="white">
                        {selectedManufacturer?.name || "Use product manufacturer"}
                      </Text>
                      <Text size="sm" c="dimmed" lineClamp={2}>
                        {selectedManufacturer?.address || "No manufacturer address"}
                      </Text>
                      {stickerType === "Separate" ? (
                        <>
                          <Divider my={4} opacity={0.2} />
                          <Text fw={700} c="white">
                            {selectedImporter?.name || "No importer selected"}
                          </Text>
                          <Text size="sm" c="dimmed" lineClamp={2}>
                            {selectedImporter?.address || "No importer address"}
                          </Text>
                        </>
                      ) : null}
                    </Stack>
                  </Paper>
                </SimpleGrid>

                <Paper
                  radius="xl"
                  p="md"
                  withBorder
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.015) 100%)",
                  }}
                >
                  <Group justify="space-between" align="center" mb="sm">
                    <Group gap="xs">
                      <ThemeIcon radius="xl" size="lg" variant="light" color="cyan">
                        <IconInfoCircle size={16} />
                      </ThemeIcon>
                      <Box>
                        <Text fw={700}>Live Preview</Text>
                        <Text size="xs" c="dimmed">
                          First printable row for this batch.
                        </Text>
                      </Box>
                    </Group>

                    {previewUrl ? (
                      <Button
                        size="xs"
                        radius="xl"
                        variant="light"
                        onClick={() => setIsPreviewModalOpen(true)}
                      >
                        Open Large
                      </Button>
                    ) : null}
                  </Group>

                  {isPreviewLoading ? (
                    <Center h={320}>
                      <Loader size="sm" variant="dots" />
                    </Center>
                  ) : previewUrl ? (
                    <Center>
                      <Image
                        src={previewUrl}
                        alt="Sticker preview"
                        fit="contain"
                        mah={320}
                        radius="lg"
                        style={{
                          background: "white",
                          padding: 18,
                          border: "1px solid rgba(255,255,255,0.08)",
                          cursor: "pointer",
                        }}
                        onClick={() => setIsPreviewModalOpen(true)}
                      />
                    </Center>
                  ) : (
                    <OperationsEmptyState
                      icon={IconTag}
                      title="Preview unavailable"
                      description="Pick batch and confirm setup to generate sticker preview."
                    />
                  )}
                </Paper>
              </Stack>
            ) : (
              <OperationsEmptyState
                icon={IconTag}
                title="No batch selected"
                description="Choose batch from queue to open sticker studio."
              />
            )}
          </OperationsPanel>
        </Grid.Col>

        <Grid.Col span={{ base: 12, xl: 3 }}>
          <OperationsPanel
            title="Run Summary"
            icon={IconPrinter}
            description="Readiness, printer endpoint, and row-level print status."
          >
            {selectedBatch ? (
              <Stack gap="md" h="100%">
                <Alert
                  radius="xl"
                  color={readyToPrint ? "teal" : "orange"}
                  icon={readyToPrint ? <IconCheck size={16} /> : <IconAlertCircle size={16} />}
                >
                  {readyToPrint
                    ? "Batch ready. Preview checked, endpoint loaded, pending labels found."
                    : "Check printer setup or pending rows before printing."}
                </Alert>

                <Paper radius="xl" p="md" withBorder style={{ background: "rgba(255,255,255,0.02)" }}>
                  <Stack gap="sm">
                    <Group justify="space-between">
                      <Text size="xs" fw={800} c="dimmed">
                        PRINTER ENDPOINT
                      </Text>
                      <Badge radius="xl" variant="light" color="cyan">
                        Auto
                      </Badge>
                    </Group>
                    <Text ff="monospace" fw={800} c="white">
                      {printerIp}:{printerPort}
                    </Text>
                    <Text size="sm" c="dimmed">
                      Size profile: {stickerSize} · {stickerType}
                    </Text>
                  </Stack>
                </Paper>

                <SimpleGrid cols={3} spacing="sm">
                  <Paper radius="xl" p="sm" withBorder ta="center" style={{ background: "rgba(255,255,255,0.02)" }}>
                    <Text size="10px" fw={800} c="dimmed">
                      ROWS
                    </Text>
                    <Text mt={6} fw={900} size="lg">
                      {selectedBatch.totalLines}
                    </Text>
                  </Paper>
                  <Paper radius="xl" p="sm" withBorder ta="center" style={{ background: "rgba(255,255,255,0.02)" }}>
                    <Text size="10px" fw={800} c="dimmed">
                      DONE
                    </Text>
                    <Text mt={6} fw={900} size="lg" c="green.4">
                      {selectedBatch.rows.length - selectedBatch.pendingRows.length}
                    </Text>
                  </Paper>
                  <Paper radius="xl" p="sm" withBorder ta="center" style={{ background: "rgba(255,255,255,0.02)" }}>
                    <Text size="10px" fw={800} c="dimmed">
                      OPEN
                    </Text>
                    <Text mt={6} fw={900} size="lg" c="orange.4">
                      {selectedBatch.pendingLabels}
                    </Text>
                  </Paper>
                </SimpleGrid>

                <Button
                  fullWidth
                  size="md"
                  radius="xl"
                  leftSection={<IconPrinter size={16} />}
                  onClick={handlePrintBatch}
                  disabled={!selectedBatch || isPrinting || !readyToPrint}
                  loading={isPrinting}
                >
                  Print All Pending
                </Button>

                <ScrollArea.Autosize mah={420}>
                  <Stack gap="xs">
                    {selectedBatch.rows.map((row) => (
                      <Paper
                        key={row.id}
                        radius="xl"
                        p="sm"
                        withBorder
                        style={{
                          background: row.printed
                            ? "rgba(16, 185, 129, 0.08)"
                            : "rgba(255,255,255,0.02)",
                        }}
                      >
                        <Group justify="space-between" align="flex-start" wrap="nowrap">
                          <Box style={{ minWidth: 0 }}>
                            <Group gap={6} mb={4}>
                              <Text size="xs" fw={900} c="cyan.3" ff="monospace">
                                {row.skuCode}
                              </Text>
                              <Badge
                                radius="xl"
                                size="sm"
                                variant={row.printed ? "light" : "filled"}
                                color={row.printed ? "green" : "orange"}
                              >
                                {row.printed ? "Printed" : "Pending"}
                              </Badge>
                            </Group>
                            <Text size="sm" fw={700} lineClamp={1}>
                              {row.productName}
                            </Text>
                          </Box>
                          <Box ta="right">
                            <Text fw={900}>{row.billedQty}</Text>
                            <Text size="10px" c="dimmed">
                              labels
                            </Text>
                          </Box>
                        </Group>
                      </Paper>
                    ))}
                  </Stack>
                </ScrollArea.Autosize>
              </Stack>
            ) : (
              <OperationsEmptyState
                icon={IconPrinter}
                title="No manifest"
                description="Select batch to review row status and run print."
              />
            )}
          </OperationsPanel>
        </Grid.Col>
      </Grid>

      <Modal
        opened={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        title="Sticker Preview"
        size="xl"
        centered
      >
        <Center>
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt="Sticker preview large"
              fit="contain"
              mah="70vh"
              radius="md"
              style={{ background: "white", padding: 20 }}
            />
          ) : null}
        </Center>
      </Modal>
    </OperationsPage>
  );
});

export default Sticker;
