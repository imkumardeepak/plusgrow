import React, { memo, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  ActionIcon,
  Badge,
  Group,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import {
  Building2,
  Download,
  Edit2,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Truck,
} from "lucide-react";
import { exportToExcel, formatExcelDate } from "../hooks/useExcelExport";
import { Button } from "../components/atoms/Button";
import { Input } from "../components/atoms/Input";
import { Modal, ConfirmDialog } from "../components/atoms/Modal";
import {
  OperationsPage,
  OperationsPanel,
} from "../components/organisms/Operations/OperationsShell";
import {
  MantineDataTable,
  DataTableColumn,
} from "../components/molecules/MantineDataTable";
import { toast } from "../lib/toast";
import {
  importersApi,
  Importer,
  CreateImporterDto,
} from "../services/masterApi";

export const Importers = memo(function Importers() {
  const [importers, setImporters] = useState<Importer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState<Importer | null>(null);
  const [search, setSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Importer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState<CreateImporterDto>({
    name: "",
    address: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    loadImporters();
  }, []);

  const loadImporters = async () => {
    try {
      setIsLoading(true);
      const data = await importersApi.getAll();
      setImporters(data);
    } catch {
      toast.error("Failed to load importers");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Importer name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing) {
        await importersApi.update(isEditing.id, formData);
        toast.success("Importer updated successfully");
      } else {
        await importersApi.create(formData);
        toast.success("Importer created successfully");
      }
      await loadImporters();
      closeModal();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to save importer");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreateModal = () => {
    setFormData({ name: "", address: "", phone: "", email: "" });
    setIsEditing(null);
    setIsModalOpen(true);
  };

  const openEditModal = (importer: Importer) => {
    setFormData({
      name: importer.name,
      address: importer.address || "",
      phone: importer.phone || "",
      email: importer.email || "",
    });
    setIsEditing(importer);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditing(null);
    setFormData({ name: "", address: "", phone: "", email: "" });
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setIsDeleting(true);
    try {
      await importersApi.delete(deleteTarget.id);
      toast.success("Importer deleted successfully");
      await loadImporters();
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete importer");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredImporters = useMemo(() => {
    if (!search.trim()) return importers;
    const searchLower = search.toLowerCase();
    return importers.filter(
      (importer) =>
        importer.name.toLowerCase().includes(searchLower) ||
        (importer.email &&
          importer.email.toLowerCase().includes(searchLower)) ||
        (importer.phone &&
          importer.phone.toLowerCase().includes(searchLower)) ||
        (importer.address &&
          importer.address.toLowerCase().includes(searchLower)),
    );
  }, [importers, search]);

  const columns: DataTableColumn<Importer>[] = [
    {
      key: "name",
      header: "Importer",
      sortable: true,
      sortAccessor: (row) => row.name,
      render: (row) => (
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon
            size={36}
            radius="lg"
            variant="light"
            color="cyan"
            style={{
              background: "rgba(30, 192, 243, 0.12)",
              border: "1px solid rgba(30, 192, 243, 0.18)",
            }}
          >
            <Truck size={16} />
          </ThemeIcon>
          <Text fw={700} size="sm">
            {row.name}
          </Text>
        </Group>
      ),
    },
    {
      key: "address",
      header: "Address",
      sortable: true,
      sortAccessor: (row) => row.address,
      render: (row) => (
        <Text size="xs" lineClamp={1} maw={200}>
          {row.address || "N/A"}
        </Text>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      sortable: true,
      sortAccessor: (row) => row.phone,
      render: (row) => (
        <Text size="xs" ff="monospace">
          {row.phone || "N/A"}
        </Text>
      ),
      width: 140,
    },
    {
      key: "email",
      header: "Email",
      sortable: true,
      sortAccessor: (row) => row.email,
      render: (row) => (
        <Text size="xs" c="cyan.3" lineClamp={1} maw={180}>
          {row.email || "N/A"}
        </Text>
      ),
    },

    {
      key: "actions",
      header: "Action",
      align: "right",
      render: (row) => (
        <Group gap="xs" justify="flex-end" wrap="nowrap">
          <Tooltip label="Edit importer">
            <ActionIcon
              size="sm"
              radius="md"
              variant="light"
              color="blue"
              onClick={() => openEditModal(row)}
            >
              <Edit2 size={15} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Delete importer">
            <ActionIcon
              size="sm"
              radius="md"
              variant="light"
              color="red"
              onClick={() => setDeleteTarget(row)}
            >
              <Trash2 size={15} />
            </ActionIcon>
          </Tooltip>
        </Group>
      ),
      width: 120,
    },
  ];

  const importerStats = useMemo(() => {
    const withEmail = importers.filter((item) => item.email).length;
    const withPhone = importers.filter((item) => item.phone).length;
    const withAddress = importers.filter((item) => item.address).length;
    return { withEmail, withPhone, withAddress };
  }, [importers]);

  return (
    <>
      <OperationsPage
        title="Importers"
        description="Manage supplier and partner companies with one common master-data workflow."
        icon={Building2}
        hideHeader
      >
        <Stack gap="sm">
          <OperationsPanel
            title="Importer Directory"
            description="Unified table styling, search, and row actions."
            icon={Truck}
            action={
              <Group gap="xs" wrap="nowrap">
                <Badge size="sm" radius="md" variant="light" color="gray">
                  {importers.length} partners
                </Badge>
                <Badge size="sm" radius="md" variant="light" color="blue">
                  {importerStats.withEmail} with email
                </Badge>
                <Badge size="sm" radius="md" variant="light" color="green">
                  {importerStats.withPhone} with phone
                </Badge>
                <Input
                  size="xs"
                  radius="md"
                  w={240}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search importers, email, phone..."
                  leftElement={<Search size={14} />}
                />
                <ActionIcon
                  size="sm"
                  radius="md"
                  variant="light"
                  color="gray"
                  onClick={() => void loadImporters()}
                  loading={isLoading}
                  aria-label="Refresh importer data"
                >
                  <RefreshCw size={14} />
                </ActionIcon>
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Download size={14} />}
                  onClick={() => {
                    exportToExcel({
                      fileName: "Importers_Export",
                      sheets: [{
                        sheetName: "Importers",
                        data: filteredImporters,
                        columns: [
                          { header: "Name", accessor: (row) => row.name },
                          { header: "Address", accessor: (row) => row.address || "" },
                          { header: "Phone", accessor: (row) => row.phone || "" },
                          { header: "Email", accessor: (row) => row.email || "" },
                          { header: "Created At", accessor: (row) => formatExcelDate(row.created_at) },
                        ],
                      }],
                    });
                    toast.success("Importers exported successfully");
                  }}
                >
                  Export Excel
                </Button>
                <Button
                  size="sm"
                  onClick={openCreateModal}
                  leftIcon={<Plus size={14} />}
                >
                  New Importer
                </Button>
              </Group>
            }
            contentClassName="p-0"
          >
            <MantineDataTable<Importer>
              data={filteredImporters}
              columns={columns}
              rowKey={(row) => row.id}
              isLoading={isLoading}
              emptyIcon={Truck}
              emptyTitle="No importers found"
              emptyDescription="No importer records match current search."
              itemLabel="partners"
              resetPageKey={search}
            />
          </OperationsPanel>
        </Stack>
      </OperationsPage>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={isEditing ? "Edit Importer" : "New Importer"}
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <Input
              label="Company Name"
              placeholder="Enter company name"
              value={formData.name}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, name: event.target.value }))
              }
              leftElement={<Building2 size={16} />}
              required
            />
            <Input
              label="Address"
              placeholder="Registered office or warehouse address"
              value={formData.address}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  address: event.target.value,
                }))
              }
              leftElement={<MapPin size={16} />}
            />
            <Input
              label="Phone"
              placeholder="Phone number"
              value={formData.phone}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, phone: event.target.value }))
              }
              leftElement={<Phone size={16} />}
            />
            <Input
              label="Email"
              type="email"
              placeholder="Email address"
              value={formData.email}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, email: event.target.value }))
              }
              leftElement={<Mail size={16} />}
            />
            <Group justify="flex-end" pt="sm">
              <Button variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit" loading={isSubmitting}>
                {isEditing ? "Update Importer" : "Create Importer"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Importer"
        message={`Delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
      />
    </>
  );
});

export default Importers;
