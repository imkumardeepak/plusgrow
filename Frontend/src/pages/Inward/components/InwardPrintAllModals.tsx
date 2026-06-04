import { Badge, Group, Paper, Progress, SegmentedControl, Stack, Text } from "@mantine/core";
import { Printer } from "lucide-react";

import { Button } from "../../../components/atoms/Button";
import { Modal } from "../../../components/atoms/Modal";
import { PoInvoiceHeaderSummary } from "../../../services/masterApi";

type InvoiceSummary = PoInvoiceHeaderSummary & {
  invoiceKey: string;
};

interface InwardPrintAllModalsProps {
  selectedInvoiceSummary: InvoiceSummary | null;
  sizePickerOpen: boolean;
  progressOpen: boolean;
  printAllSize: string;
  printAllCurrent: number;
  printAllTotal: number;
  printAllCurrentProduct: string;
  printAllErrors: string[];
  printAllDone: boolean;
  printAllCancelled: boolean;
  onSizePickerClose: () => void;
  onPrintAllSizeChange: (value: string) => void;
  onStartPrintAll: () => void | Promise<void>;
  onProgressClose: () => void;
  onCancelPrintAll: () => void;
}

export function InwardPrintAllModals({
  selectedInvoiceSummary,
  sizePickerOpen,
  progressOpen,
  printAllSize,
  printAllCurrent,
  printAllTotal,
  printAllCurrentProduct,
  printAllErrors,
  printAllDone,
  printAllCancelled,
  onSizePickerClose,
  onPrintAllSizeChange,
  onStartPrintAll,
  onProgressClose,
  onCancelPrintAll,
}: InwardPrintAllModalsProps) {
  const unprintedCount =
    selectedInvoiceSummary?.items.filter((item) => !item.printed && item.billedQty > 0).length || 0;

  return (
    <>
      <Modal
        isOpen={sizePickerOpen}
        onClose={onSizePickerClose}
        title="Print All Stickers"
        size="md"
        footer={
          <Group justify="flex-end">
            <Button variant="outline" onClick={onSizePickerClose}>Cancel</Button>
            <Button leftIcon={<Printer size={14} />} onClick={onStartPrintAll}>Start Printing</Button>
          </Group>
        }
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            This will print stickers for all{" "}
            <Text component="span" fw={800} c="cyan.3">{unprintedCount}</Text>{" "}
            unprinted items in invoice{" "}
            <Text component="span" fw={800} ff="monospace" c="cyan.3">
              {selectedInvoiceSummary?.invoiceNumber}
            </Text>
            . Label mode will be set to Combined.
          </Text>
          <Paper radius="md" p="md" withBorder bg="transparent">
            <Text size="10px" fw={800} c="dimmed" mb={8} tt="uppercase">
              Sticker Size
            </Text>
            <SegmentedControl
              fullWidth
              size="sm"
              radius="md"
              value={printAllSize}
              onChange={onPrintAllSizeChange}
              data={[
                { value: "25x25", label: "25×25" },
                { value: "38x38", label: "38×38" },
                { value: "50x50", label: "50×50" },
                { value: "60x60", label: "60×60" },
                { value: "75x75", label: "75×75" },
              ]}
            />
          </Paper>
        </Stack>
      </Modal>

      <Modal
        isOpen={progressOpen}
        onClose={onProgressClose}
        title="Printing All Stickers"
        size="lg"
        footer={
          <Group justify="flex-end">
            {!printAllDone ? (
              <Button variant="outline" color="red" disabled={printAllCancelled} onClick={onCancelPrintAll}>
                {printAllCancelled ? "Canceling..." : "Cancel"}
              </Button>
            ) : (
              <Button onClick={onProgressClose}>Close</Button>
            )}
          </Group>
        }
      >
        <Stack gap="md">
          <Paper radius="md" p="md" withBorder bg="transparent">
            <Group justify="space-between" mb="xs">
              <Text size="xs" fw={800} c="dimmed" tt="uppercase">Progress</Text>
              <Badge size="sm" variant="light" color={printAllDone ? "green" : "cyan"}>
                {printAllCurrent} / {printAllTotal}
              </Badge>
            </Group>
            <Progress
              value={printAllTotal > 0 ? (printAllCurrent / printAllTotal) * 100 : 0}
              size="lg"
              radius="md"
              color={printAllDone ? "green" : "cyan"}
              animated={!printAllDone}
              striped={!printAllDone}
            />
            {!printAllDone ? (
              <Text size="xs" c="dimmed" mt="xs" lineClamp={1}>Printing: {printAllCurrentProduct}</Text>
            ) : (
              <Text size="xs" fw={700} mt="xs" c={printAllErrors.length > 0 ? "orange.3" : "green.3"}>
                {printAllCancelled
                  ? "Print All was canceled"
                  : printAllErrors.length > 0
                    ? `Done with ${printAllErrors.length} error(s)`
                    : "All items printed successfully!"}
              </Text>
            )}
          </Paper>

          {printAllErrors.length > 0 ? (
            <Paper radius="md" p="md" withBorder bg="rgba(239, 68, 68, 0.06)">
              <Text size="xs" fw={800} c="red.4" mb="xs" tt="uppercase">
                Errors ({printAllErrors.length})
              </Text>
              <Stack gap={4} mah={200} style={{ overflowY: "auto" }}>
                {printAllErrors.map((error, index) => (
                  <Text key={`${error}-${index}`} size="xs" c="red.3">• {error}</Text>
                ))}
              </Stack>
            </Paper>
          ) : null}
        </Stack>
      </Modal>
    </>
  );
}
