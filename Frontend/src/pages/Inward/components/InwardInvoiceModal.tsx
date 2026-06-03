import React from "react";
import {
  Badge,
  Box,
  Group,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
} from "@mantine/core";
import { Download, Loader2, Plus, Upload } from "lucide-react";

import { Button } from "../../../components/atoms/Button";
import { Input } from "../../../components/atoms/Input";
import { Modal } from "../../../components/atoms/Modal";
import type { CreatePoInvoiceDto, PoInvoice } from "../../../services/masterApi";

export type InwardEntryMode = "manufacturer" | "thirdParty";

export type InvoiceLineDraft = {
  id: string;
  productId: number;
  billedQty: number;
  mrp?: number | null;
};

export type SelectOption = {
  value: string;
  label: string;
};

interface InwardInvoiceModalProps {
  isOpen: boolean;
  editingInvoice: PoInvoice | null;
  invoiceForm: CreatePoInvoiceDto;
  invoiceLines: InvoiceLineDraft[];
  inwardEntryMode: InwardEntryMode;
  invoiceManufacturerOptions: SelectOption[];
  invoicePartyOptions: SelectOption[];
  invoiceManufacturerSearch: string;
  invoicePartySearch: string;
  productOptions: Array<{ value: number; label: string; mrp?: number | null }>;
  productSearch: string;
  skippedRowCount: number;
  isInvoiceLineUploading: boolean;
  isSavingInvoice: boolean;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
  onInvoiceFormChange: React.Dispatch<React.SetStateAction<CreatePoInvoiceDto>>;
  onInvoiceLinesChange: React.Dispatch<React.SetStateAction<InvoiceLineDraft[]>>;
  onEntryModeChange: (value: string | null) => void;
  onManufacturerSearchChange: (value: string) => void;
  onPartySearchChange: (value: string) => void;
  onProductSearchChange: (value: string) => void;
  onAddLine: () => void;
  onDownloadThirdPartyTemplate: () => void;
  onDownloadSkippedRows: () => void;
  onThirdPartyLineUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  getProductLabel: (productId: number) => string;
}

const selectStyles = {
  input: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderColor: "rgba(255,255,255,0.12)",
  },
  dropdown: {
    background:
      "linear-gradient(180deg, rgba(16,25,41,0.98) 0%, rgba(8,14,26,0.98) 100%)",
    borderColor: "rgba(148, 163, 184, 0.16)",
  },
};

export function InwardInvoiceModal({
  isOpen,
  editingInvoice,
  invoiceForm,
  invoiceLines,
  inwardEntryMode,
  invoiceManufacturerOptions,
  invoicePartyOptions,
  invoiceManufacturerSearch,
  invoicePartySearch,
  productOptions,
  productSearch,
  skippedRowCount,
  isInvoiceLineUploading,
  isSavingInvoice,
  onClose,
  onSubmit,
  onInvoiceFormChange,
  onInvoiceLinesChange,
  onEntryModeChange,
  onManufacturerSearchChange,
  onPartySearchChange,
  onProductSearchChange,
  onAddLine,
  onDownloadThirdPartyTemplate,
  onDownloadSkippedRows,
  onThirdPartyLineUpload,
  getProductLabel,
}: InwardInvoiceModalProps) {
  const isThirdParty = inwardEntryMode === "thirdParty";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingInvoice ? "Edit PO Invoice" : "New PO Invoice"}
      size="xxl"
    >
      <form onSubmit={onSubmit}>
        <Stack gap="md">
          <Paper radius="lg" p="md" withBorder bg="transparent">
            <Stack gap="md">
              <Text size="11px" fw={800} c="dimmed" tt="uppercase">
                Invoice Details
              </Text>
              {!editingInvoice ? (
                <Tabs
                  value={inwardEntryMode}
                  onChange={onEntryModeChange}
                  variant="pills"
                  radius="md"
                  styles={{
                    list: {
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: 10,
                    },
                    tab: {
                      minHeight: 46,
                      justifyContent: "center",
                      fontSize: 15,
                      fontWeight: 800,
                    },
                  }}
                >
                  <Tabs.List>
                    <Tabs.Tab value="manufacturer">Plus Grow</Tabs.Tab>
                    <Tabs.Tab value="thirdParty">Third Party</Tabs.Tab>
                  </Tabs.List>
                </Tabs>
              ) : null}

              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                <Input
                  label={isThirdParty ? "Reference Number" : "Invoice Number"}
                  value={invoiceForm.invoiceNumber}
                  onChange={(event) =>
                    onInvoiceFormChange((prev) => ({
                      ...prev,
                      invoiceNumber: event.target.value,
                    }))
                  }
                  placeholder={
                    isThirdParty
                      ? "Enter reference number"
                      : "Enter invoice number"
                  }
                />
                <Input
                  label={isThirdParty ? "Reference Date" : "Invoice Date"}
                  type="date"
                  value={invoiceForm.invoiceDate}
                  onChange={(event) =>
                    onInvoiceFormChange((prev) => ({
                      ...prev,
                      invoiceDate: event.target.value,
                    }))
                  }
                />
                <Select
                  label={isThirdParty ? "Party" : "Manufacturer"}
                  placeholder={isThirdParty ? "Select party" : "Select manufacturer"}
                  data={isThirdParty ? invoicePartyOptions : invoiceManufacturerOptions}
                  searchValue={
                    isThirdParty ? invoicePartySearch : invoiceManufacturerSearch
                  }
                  onSearchChange={
                    isThirdParty
                      ? onPartySearchChange
                      : onManufacturerSearchChange
                  }
                  value={invoiceForm.partyName || null}
                  onChange={(value) =>
                    onInvoiceFormChange((prev) => ({
                      ...prev,
                      partyName: value || "",
                    }))
                  }
                  searchable
                  clearable
                  styles={selectStyles}
                />
              </SimpleGrid>

              <Paper radius="md" p="sm" withBorder bg="transparent">
                <Stack gap="sm">
                  <Text size="11px" fw={800} c="dimmed" tt="uppercase">
                    {editingInvoice ? "Product Row" : "Product Lines"}
                  </Text>
                  <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
                    <Select
                      label="Product"
                      placeholder="Select product"
                      data={productOptions.map((option) => ({
                        value: String(option.value),
                        label: option.label,
                      }))}
                      searchValue={productSearch}
                      onSearchChange={onProductSearchChange}
                      value={
                        invoiceForm.productId ? String(invoiceForm.productId) : null
                      }
                      onChange={(value) => {
                        const product = productOptions.find(
                          (option) => String(option.value) === value,
                        );
                        onInvoiceFormChange((prev) => ({
                          ...prev,
                          productId: value ? Number(value) : 0,
                          mrp: product?.mrp ?? null,
                        }));
                      }}
                      searchable
                      styles={selectStyles}
                    />
                    <Input
                      label="Billed Qty."
                      type="number"
                      min="0"
                      value={invoiceForm.billedQty}
                      onChange={(event) =>
                        onInvoiceFormChange((prev) => ({
                          ...prev,
                          billedQty: Number(event.target.value),
                        }))
                      }
                    />
                    <Input
                      label="MRP"
                      type="number"
                      min="0"
                      step="0.01"
                      value={invoiceForm.mrp ?? ""}
                      onChange={(event) =>
                        onInvoiceFormChange((prev) => ({
                          ...prev,
                          mrp: event.target.value
                            ? Number(event.target.value)
                            : null,
                        }))
                      }
                    />
                  </SimpleGrid>

                  {!editingInvoice ? (
                    <>
                      {isThirdParty ? (
                        <Paper
                          radius="md"
                          p="sm"
                          withBorder
                          bg="rgba(255,255,255,0.02)"
                        >
                          <Group justify="space-between" align="center" gap="sm">
                            <Stack gap={2}>
                              <Text size="xs" fw={800}>
                                Upload Product Lines
                              </Text>
                              <Text size="11px" c="dimmed">
                                Use SKU Code and Qnty columns. Rows with SKU not
                                in Product Master are skipped.
                              </Text>
                            </Stack>
                            <Group gap="xs">
                              <Button
                                type="button"
                                size="xs"
                                variant="outline"
                                leftIcon={<Download size={13} />}
                                onClick={onDownloadThirdPartyTemplate}
                              >
                                Template
                              </Button>
                              <Button
                                type="button"
                                size="xs"
                                variant="outline"
                                leftIcon={
                                  isInvoiceLineUploading ? (
                                    <Loader2
                                      size={13}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <Upload size={13} />
                                  )
                                }
                                loading={isInvoiceLineUploading}
                                disabled={
                                  !invoiceForm.invoiceNumber.trim() ||
                                  !invoiceForm.partyName.trim()
                                }
                                component="label"
                              >
                                Upload
                                <input
                                  type="file"
                                  hidden
                                  accept=".xlsx,.xls"
                                  onChange={onThirdPartyLineUpload}
                                />
                              </Button>
                            </Group>
                          </Group>
                          {skippedRowCount > 0 ? (
                            <Group justify="space-between" mt="sm">
                              <Badge color="orange" variant="light">
                                {skippedRowCount} skipped
                              </Badge>
                              <Button
                                type="button"
                                size="xs"
                                variant="ghost"
                                leftIcon={<Download size={13} />}
                                onClick={onDownloadSkippedRows}
                              >
                                Download skipped rows
                              </Button>
                            </Group>
                          ) : null}
                        </Paper>
                      ) : null}

                      <Group justify="flex-end">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          leftIcon={<Plus size={14} />}
                          onClick={onAddLine}
                        >
                          Add Product
                        </Button>
                      </Group>

                      {invoiceLines.length > 0 ? (
                        <Stack gap="xs">
                          {invoiceLines.map((line, index) => (
                            <Paper
                              key={line.id}
                              radius="md"
                              p="xs"
                              withBorder
                              bg="rgba(255,255,255,0.02)"
                            >
                              <Group justify="space-between" wrap="nowrap">
                                <Box style={{ minWidth: 0 }}>
                                  <Text size="xs" fw={800} lineClamp={1}>
                                    {index + 1}. {getProductLabel(line.productId)}
                                  </Text>
                                  <Text size="11px" c="dimmed">
                                    Billed Qty: {line.billedQty} · MRP:{" "}
                                    {line.mrp ? `Rs ${Number(line.mrp).toFixed(2)}` : "-"}
                                  </Text>
                                </Box>
                                <Button
                                  type="button"
                                  size="xs"
                                  variant="ghost"
                                  className="text-red-400 hover:text-red-300"
                                  onClick={() =>
                                    onInvoiceLinesChange((current) =>
                                      current.filter((item) => item.id !== line.id),
                                    )
                                  }
                                >
                                  Remove
                                </Button>
                              </Group>
                            </Paper>
                          ))}
                        </Stack>
                      ) : (
                        <Text size="sm" c="dimmed" ta="center" py="sm">
                          Add one or more products for this invoice.
                        </Text>
                      )}
                    </>
                  ) : null}
                </Stack>
              </Paper>
            </Stack>
          </Paper>

          <Group justify="flex-end" pt="sm">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={isSavingInvoice}>
              {editingInvoice ? "Update Invoice" : "Create Invoice"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

export default InwardInvoiceModal;
