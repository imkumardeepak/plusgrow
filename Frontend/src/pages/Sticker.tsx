import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  IconCheck,
  IconLayersIntersect,
  IconPrinter,
  IconTag,
  IconAlertCircle,
  IconInfoCircle,
} from "@tabler/icons-react";
import {
  Select,
  TextInput,
  Button,
  Badge,
  Group,
  Stack,
  Text,
  Box,
  SimpleGrid,
  ScrollArea,
  Image,
  Center,
  Loader,
  Paper,
  UnstyledButton,
  Grid,
  Modal,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Printer } from "lucide-react";

import {
  OperationsPage,
  OperationsPanel,
  OperationsEmptyState,
} from "../components/organisms/Operations/OperationsShell";
import {
  Importer,
  PoInvoice,
  importersApi,
  poInvoicesApi,
} from "../services/masterApi";
import { stickersApi } from "../services/stickersApi";

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
  const [importers, setImporters] = useState<Importer[]>([]);
  const [selectedBatchKey, setSelectedBatchKey] = useState("");
  const [stickerSize, setStickerSize] = useState("50x50");
  const [stickerType, setStickerType] = useState<"Combined" | "Separate">(
    "Combined",
  );
  const [importerId, setImporterId] = useState<string | null>(null);
  const [printerIp, setPrinterIp] = useState("192.168.10.151");
  const [isLoading, setIsLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [invoiceData, importerData] = await Promise.all([
        poInvoicesApi.getAll(),
        importersApi.getAll(),
      ]);

      setPoInvoices(invoiceData);
      setImporters(importerData);
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

  const selectedBatch = useMemo(
    () => batches.find((batch) => batch.key === selectedBatchKey) ?? null,
    [batches, selectedBatchKey],
  );

  const previewRow =
    selectedBatch?.pendingRows[0] ?? selectedBatch?.rows[0] ?? null;

  const monthYear = useMemo(
    () =>
      selectedBatch
        ? format(new Date(selectedBatch.invoiceDate), "MMM/yyyy").toUpperCase()
        : "",
    [selectedBatch],
  );

  const invoiceNumber = useMemo(
    () => (selectedBatch ? selectedBatch.invoiceNumber : ""),
    [selectedBatch],
  );

  useEffect(() => {
    if (!batches.length) {
      setSelectedBatchKey("");
      return;
    }

    if (
      !selectedBatchKey ||
      !batches.some((batch) => batch.key === selectedBatchKey)
    ) {
      setSelectedBatchKey(batches[0].key);
    }
  }, [batches, selectedBatchKey]);

  const handlePreview = useCallback(async () => {
    if (!previewRow || !selectedBatch) {
      setPreviewUrl(null);
      return;
    }

    setIsPreviewLoading(true);
    try {
      const nextPreview = await stickersApi.getPreview({
        productId: previewRow.productId,
        importerId: importerId ? Number(importerId) : undefined,
        size: stickerSize,
        type: stickerType,
        monthYear,
        batchNumber: invoiceNumber,
        note: "",
      });
      setPreviewUrl((previousPreview) => {
        if (previousPreview) {
          URL.revokeObjectURL(previousPreview);
        }
        return nextPreview;
      });
    } catch (error) {
      // Quietly fail for preview to avoid spamming toast
    } finally {
      setIsPreviewLoading(false);
    }
  }, [
    invoiceNumber,
    importerId,
    monthYear,
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
        message: "Select an invoice batch first",
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
        message: "All stickers for this invoice batch are already printed",
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
        printerIp: printerIp.trim(),
        items: printableRows.map((row) => ({
          config: {
            productId: row.productId,
            importerId: importerId ? Number(importerId) : undefined,
            size: stickerSize,
            type: stickerType,
            monthYear,
            batchNumber: invoiceNumber,
            note: "",
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

  return (
    <OperationsPage
      title="Sticker Printing"
      description="Pick invoice batch, confirm format, preview first sticker, then print all pending labels together."
      icon={Printer}
      metrics={[
        { label: "Batches", value: totalBatches },
        { label: "Pending Batches", value: pendingBatches, tone: "warning" },
        { label: "Pending Labels", value: totalPendingLabels, tone: "brand" },
        { label: "Printed Lines", value: totalPrintedLines, tone: "success" },
      ]}
    >
      <Grid gutter="md">
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <OperationsPanel
            title="Invoice Batches"
            icon={IconLayersIntersect}
            description="Batches grouped by invoice date and party."
          >
            <ScrollArea.Autosize mah={600}>
              <Stack gap="xs">
                {isLoading ? (
                  <Center h={200}>
                    <Loader size="sm" />
                  </Center>
                ) : batches.length === 0 ? (
                  <OperationsEmptyState
                    icon={IconLayersIntersect}
                    title="No invoice batches"
                    description="Upload invoice rows in inward first."
                  />
                ) : (
                  batches.map((batch) => {
                    const isActive = batch.key === selectedBatchKey;
                    const isComplete = batch.pendingRows.length === 0;

                    return (
                      <UnstyledButton
                        key={batch.key}
                        onClick={() => setSelectedBatchKey(batch.key)}
                        style={{
                          width: "100%",
                          borderRadius: "12px",
                          border: `1px solid ${isActive ? "var(--mantine-color-blue-4)" : "rgba(255, 255, 255, 0.05)"}`,
                          background: isActive
                            ? "rgba(34, 139, 230, 0.1)"
                            : "rgba(255, 255, 255, 0.02)",
                          padding: "12px",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <Group justify="space-between" mb={8} wrap="nowrap">
                          <Box style={{ flex: 1 }}>
                            <Text fw={700} size="sm" c="white" lineClamp={1}>
                              {batch.partyName}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {format(new Date(batch.invoiceDate), "dd-MMM-yy")}
                            </Text>
                          </Box>
                          <Badge
                            variant={isComplete ? "light" : "outline"}
                            color={isComplete ? "green" : "orange"}
                            size="xs"
                          >
                            {isComplete ? "Printed" : "Pending"}
                          </Badge>
                        </Group>

                        <SimpleGrid cols={3} gap="xs">
                          <Box>
                            <Text
                              size="10px"
                              fw={800}
                              c="dimmed"
                              style={{ letterSpacing: "0.5px" }}
                            >
                              LINES
                            </Text>
                            <Text size="sm" fw={700}>
                              {batch.totalLines}
                            </Text>
                          </Box>
                          <Box>
                            <Text
                              size="10px"
                              fw={800}
                              c="dimmed"
                              style={{ letterSpacing: "0.5px" }}
                            >
                              LABELS
                            </Text>
                            <Text size="sm" fw={700} c="blue.4">
                              {batch.totalLabels}
                            </Text>
                          </Box>
                          <Box>
                            <Text
                              size="10px"
                              fw={800}
                              c="dimmed"
                              style={{ letterSpacing: "0.5px" }}
                            >
                              OPEN
                            </Text>
                            <Text size="sm" fw={700} c="orange.4">
                              {batch.pendingLabels}
                            </Text>
                          </Box>
                        </SimpleGrid>
                      </UnstyledButton>
                    );
                  })
                )}
              </Stack>
            </ScrollArea.Autosize>
          </OperationsPanel>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 4 }}>
          <OperationsPanel
            title="Sticker Setup"
            icon={IconTag}
            description="Printer and label format configuration."
          >
            {selectedBatch ? (
              <Stack gap="md">
                <Paper
                  p="sm"
                  withBorder
                  style={{ background: "rgba(255, 255, 255, 0.02)" }}
                >
                  <Stack gap="xs">
                    <Group justify="space-between">
                      <Text size="xs" fw={700} c="white">
                        {selectedBatch.partyName}
                      </Text>
                      <Badge variant="light" color="blue" size="sm">
                        {invoiceNumber}
                      </Badge>
                    </Group>
                    <Text size="xs" c="dimmed">
                      Invoice Date:{" "}
                      {format(new Date(selectedBatch.invoiceDate), "dd-MMM-yy")}{" "}
                      | Month: {monthYear}
                    </Text>
                  </Stack>
                </Paper>

                <SimpleGrid cols={2} gap="sm">
                  <Select
                    label="Sticker Size"
                    value={stickerSize}
                    onChange={(val) => setStickerSize(val || "50x50")}
                    data={[
                      { value: "50x50", label: "50 x 50 MM" },
                      { value: "60x60", label: "60 x 60 MM" },
                      { value: "75x75", label: "75 x 75 MM" },
                    ]}
                  />
                  <Select
                    label="Sticker Type"
                    value={stickerType}
                    onChange={(val) =>
                      setStickerType(val as "Combined" | "Separate")
                    }
                    data={[
                      { value: "Combined", label: "Combined" },
                      { value: "Separate", label: "Separate" },
                    ]}
                  />
                  <Select
                    label="Importer"
                    value={importerId}
                    onChange={setImporterId}
                    placeholder="No importer"
                    clearable
                    data={importers.map((i) => ({
                      value: String(i.id),
                      label: i.name,
                    }))}
                  />
                  <TextInput
                    label="Printer IP"
                    value={printerIp}
                    onChange={(e) => setPrinterIp(e.target.value)}
                  />
                </SimpleGrid>

                <Paper
                  p="sm"
                  withBorder
                  style={{ background: "rgba(255, 255, 255, 0.02)" }}
                >
                  <Group justify="space-between" mb="sm">
                    <Group gap="xs">
                      <IconInfoCircle
                        size={14}
                        color="var(--mantine-color-blue-4)"
                      />
                      <Text size="xs" fw={700}>
                        Preview
                      </Text>
                    </Group>
                    {previewUrl && (
                      <Button
                        size="xs"
                        variant="light"
                        onClick={() => setIsPreviewModalOpen(true)}
                      >
                        View Large
                      </Button>
                    )}
                  </Group>

                  {isPreviewLoading ? (
                    <Center h={180}>
                      <Loader size="sm" variant="dots" />
                    </Center>
                  ) : previewUrl ? (
                    <Center>
                      <Image
                        src={previewUrl}
                        alt="Sticker preview"
                        fit="contain"
                        mah={180}
                        radius="md"
                        style={{
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          background: "white",
                          padding: "10px",
                          cursor: "pointer",
                        }}
                        onClick={() => setIsPreviewModalOpen(true)}
                      />
                    </Center>
                  ) : (
                    <Center h={180}>
                      <Text size="xs" c="dimmed">
                        No preview available
                      </Text>
                    </Center>
                  )}
                </Paper>
              </Stack>
            ) : (
              <OperationsEmptyState
                icon={IconTag}
                title="No batch selected"
                description="Choose invoice batch from left panel to configure printing."
              />
            )}
          </OperationsPanel>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 4 }}>
          <OperationsPanel
            title="Batch Items"
            icon={IconPrinter}
            description="Print all pending labels for batch."
            action={
              <Button
                size="xs"
                onClick={handlePrintBatch}
                disabled={
                  !selectedBatch ||
                  isPrinting ||
                  selectedBatch.pendingRows.length === 0
                }
                loading={isPrinting}
                leftSection={<IconPrinter size={14} />}
                variant="gradient"
                gradient={{ from: "blue", to: "cyan" }}
              >
                Print All Pending
              </Button>
            }
          >
            {selectedBatch ? (
              <Stack gap="md" style={{ height: "100%" }}>
                <Paper
                  p="sm"
                  withBorder
                  style={{ background: "rgba(255, 255, 255, 0.02)" }}
                >
                  <SimpleGrid cols={3} gap="xs" ta="center">
                    <Box>
                      <Text size="10px" fw={800} c="dimmed">
                        ROWS
                      </Text>
                      <Text fw={700}>{selectedBatch.totalLines}</Text>
                    </Box>
                    <Box>
                      <Text size="10px" fw={800} c="dimmed">
                        PENDING
                      </Text>
                      <Text fw={700} c="orange.4">
                        {selectedBatch.pendingLabels}
                      </Text>
                    </Box>
                    <Box>
                      <Text size="10px" fw={800} c="dimmed">
                        DONE
                      </Text>
                      <Text fw={700} c="green.4">
                        {selectedBatch.rows.length -
                          selectedBatch.pendingRows.length}
                      </Text>
                    </Box>
                  </SimpleGrid>
                </Paper>

                <ScrollArea.Autosize mah={480}>
                  <Stack gap="xs">
                    {selectedBatch.rows.map((row) => (
                      <Paper
                        key={row.id}
                        p="xs"
                        withBorder
                        style={{
                          background: "rgba(255, 255, 255, 0.01)",
                          borderColor: "rgba(255, 255, 255, 0.05)",
                        }}
                      >
                        <Group
                          justify="space-between"
                          wrap="nowrap"
                          align="flex-start"
                        >
                          <Box style={{ flex: 1 }}>
                            <Group gap={5} mb={2}>
                              <Text
                                size="xs"
                                fw={800}
                                c="blue.4"
                                fontFamily="monospace"
                              >
                                {row.skuCode}
                              </Text>
                              <Badge
                                size="xs"
                                variant="dot"
                                color={row.printed ? "green" : "orange"}
                              >
                                {row.printed ? "Printed" : "Pending"}
                              </Badge>
                            </Group>
                            <Text size="xs" fw={600} lineClamp={1}>
                              {row.productName}
                            </Text>
                          </Box>
                          <Box ta="right">
                            <Text size="xs" fw={800}>
                              {row.billedQty}
                            </Text>
                            <Text size="10px" c="dimmed">
                              Labels
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
                title="No items to show"
                description="Select invoice batch to review rows and print status."
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
          {previewUrl && (
            <Image
              src={previewUrl}
              alt="Sticker preview large"
              fit="contain"
              mah="70vh"
              radius="md"
              style={{
                background: "white",
                padding: "20px",
              }}
            />
          )}
        </Center>
      </Modal>
    </OperationsPage>
  );
});

export default Sticker;
