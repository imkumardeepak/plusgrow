import React from "react";
import { Badge, Group, Paper, Stack, Text, ThemeIcon } from "@mantine/core";
import { CheckCircle2, Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";

import { Button } from "../../../components/atoms/Button";
import { Modal } from "../../../components/atoms/Modal";

interface InwardUploadModalProps {
  isOpen: boolean;
  uploadFile: File | null;
  uploadSkippedErrors: string[];
  isUploading: boolean;
  onClose: () => void;
  onDownloadTemplate: () => void;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenSkippedRows: () => void;
  onDownloadSkippedRows: () => void;
  onUpload: () => void | Promise<void>;
}

export function InwardUploadModal({
  isOpen,
  uploadFile,
  uploadSkippedErrors,
  isUploading,
  onClose,
  onDownloadTemplate,
  onFileSelect,
  onOpenSkippedRows,
  onDownloadSkippedRows,
  onUpload,
}: InwardUploadModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import PO Invoices from Excel" size="lg">
      <Stack gap="lg">
        <Paper radius="lg" p="md" withBorder bg="transparent">
          <Group justify="space-between" align="flex-start">
            <Group gap="sm" wrap="nowrap">
              <ThemeIcon
                size={42}
                radius="lg"
                variant="light"
                color="cyan"
                style={{
                  background: "rgba(30, 192, 243, 0.12)",
                  border: "1px solid rgba(30, 192, 243, 0.18)",
                }}
              >
                <FileSpreadsheet size={20} />
              </ThemeIcon>
              <Stack gap={2}>
                <Text fw={700}>PO Invoice Import Template</Text>
                <Text size="sm" c="dimmed">
                  Download template first. SKU or product name must match an existing product.
                </Text>
              </Stack>
            </Group>
            <Button variant="outline" leftIcon={<Download size={16} />} onClick={onDownloadTemplate}>
              Download Template
            </Button>
          </Group>
        </Paper>

        <Paper radius="lg" p="md" withBorder bg="transparent">
          <Stack gap="sm">
            <Text size="11px" fw={800} c="dimmed" tt="uppercase">
              Excel File
            </Text>
            <input type="file" accept=".xlsx,.xls" onChange={onFileSelect} />

            {uploadFile ? (
              <Group gap="sm" wrap="nowrap">
                <CheckCircle2 size={18} color="var(--mantine-color-green-4)" />
                <Stack gap={2}>
                  <Text fw={600}>{uploadFile.name}</Text>
                  <Text size="sm" c="dimmed">
                    {(uploadFile.size / 1024).toFixed(1)} KB ready
                  </Text>
                </Stack>
              </Group>
            ) : (
              <Text size="sm" c="dimmed">Select Excel file to import PO invoice data.</Text>
            )}

            {uploadSkippedErrors.length > 0 ? (
              <Paper radius="md" p="sm" withBorder bg="rgba(251, 146, 60, 0.08)">
                <Group justify="space-between" align="center">
                  <Stack gap={2}>
                    <Text size="xs" fw={800} c="orange.3">
                      {uploadSkippedErrors.length} rows skipped in last upload
                    </Text>
                    <Text size="11px" c="dimmed">
                      Open skipped rows to see exact row numbers and reasons.
                    </Text>
                  </Stack>
                  <Group gap="xs">
                    <Button type="button" size="xs" variant="outline" onClick={onOpenSkippedRows}>
                      View
                    </Button>
                    <Button type="button" size="xs" variant="ghost" leftIcon={<Download size={13} />} onClick={onDownloadSkippedRows}>
                      Download
                    </Button>
                  </Group>
                </Group>
              </Paper>
            ) : null}
          </Stack>
        </Paper>

        <Group justify="flex-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={onUpload}
            disabled={!uploadFile}
            loading={isUploading}
            leftIcon={isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          >
            Import Invoices
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

interface InwardSkippedRowsModalProps {
  isOpen: boolean;
  uploadSkippedErrors: string[];
  onClose: () => void;
  onDownloadSkippedRows: () => void;
  onReupload: () => void;
}

export function InwardSkippedRowsModal({
  isOpen,
  uploadSkippedErrors,
  onClose,
  onDownloadSkippedRows,
  onReupload,
}: InwardSkippedRowsModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Skipped Upload Rows"
      size="xl"
      footer={
        <Group justify="flex-end">
          <Button variant="outline" leftIcon={<Download size={14} />} onClick={onDownloadSkippedRows} disabled={uploadSkippedErrors.length === 0}>
            Download
          </Button>
          <Button variant="outline" onClick={onReupload}>Cancel & Re-upload</Button>
          <Button onClick={onClose}>Close</Button>
        </Group>
      }
    >
      <Stack gap="sm">
        <Text size="sm" c="dimmed">
          These rows were not imported. Fix them in Excel and upload again.
        </Text>
        <Stack gap="xs" mah={420} style={{ overflowY: "auto" }}>
          {uploadSkippedErrors.map((error, index) => {
            const rowMatch = error.match(/^Row\s+(\d+):\s*(.*)$/i);
            return (
              <Paper key={`${error}-${index}`} radius="md" p="sm" withBorder bg="rgba(239, 68, 68, 0.08)">
                <Group align="flex-start" wrap="nowrap">
                  <Badge color="red" variant="light">Row {rowMatch?.[1] || index + 1}</Badge>
                  <Text size="sm" fw={600}>{rowMatch?.[2] || error}</Text>
                </Group>
              </Paper>
            );
          })}
        </Stack>
      </Stack>
    </Modal>
  );
}
