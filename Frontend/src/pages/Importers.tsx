import React, { memo, useEffect, useState } from "react";
import { Group, Stack, Text, ThemeIcon } from "@mantine/core";
import {
  Building2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Truck,
  Trash2,
  Edit2,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "../components/atoms/Button";
import { Input } from "../components/atoms/Input";
import { Modal, ConfirmDialog } from "../components/atoms/Modal";
import {
  DataTable,
  createTableColumns,
} from "../components/molecules/DataTable";
import {
  OperationsPage,
  OperationsPanel,
} from "../components/organisms/Operations/OperationsShell";
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
  const [searchTerm, setSearchTerm] = useState("");
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

  const columns = createTableColumns<Importer>(
    [
      {
        accessorKey: "name",
        header: "Importer",
        cell: (row) => (
          <Group gap="sm" wrap="nowrap">
            <ThemeIcon
              size={40}
              radius="lg"
              variant="light"
              color="cyan"
              style={{
                background: "rgba(30, 192, 243, 0.12)",
                border: "1px solid rgba(30, 192, 243, 0.18)",
              }}
            >
              <Truck size={18} />
            </ThemeIcon>
            <Stack gap={2}>
              <Text fw={700} size="sm">
                {row.name}
              </Text>
              <Group gap="xs">
                {row.address ? (
                  <Group gap={4} wrap="nowrap">
                    <MapPin size={12} color="var(--mantine-color-gray-5)" />
                    <Text size="11px" c="dimmed" lineClamp={1}>
                      {row.address}
                    </Text>
                  </Group>
                ) : null}
              </Group>
            </Stack>
          </Group>
        ),
      },
      {
        accessorKey: "phone",
        header: "Contact",
        cell: (row) => (
          <Stack gap={4}>
            <Group gap={6} wrap="nowrap">
              <Phone size={13} color="var(--mantine-color-cyan-4)" />
              <Text size="sm">{row.phone || "N/A"}</Text>
            </Group>
            <Group gap={6} wrap="nowrap">
              <Mail size={13} color="var(--mantine-color-cyan-4)" />
              <Text size="11px" c="dimmed" lineClamp={1}>
                {row.email || "No email"}
              </Text>
            </Group>
          </Stack>
        ),
      },
      {
        accessorKey: "created_at",
        header: "Created",
        cell: (row) => (
          <Text size="11px" c="dimmed">
            {row.created_at
              ? format(new Date(row.created_at), "dd MMM yyyy")
              : "N/A"}
          </Text>
        ),
      },
    ],
    [
      {
        label: "Edit",
        icon: <Edit2 className="h-4 w-4" />,
        onClick: (row) => openEditModal(row),
      },
      {
        label: "Delete",
        icon: <Trash2 className="h-4 w-4" />,
        onClick: (row) => setDeleteTarget(row),
        variant: "destructive",
      },
    ],
  );

  return (
    <>
      <OperationsPage
        title="Importers"
        description="Manage supplier and partner companies with one common master-data workflow."
        icon={Building2}
        actions={
          <Button onClick={openCreateModal} leftIcon={<Plus size={16} />}>
            New Importer
          </Button>
        }
        metrics={[
          { label: "Partners", value: importers.length, tone: "brand" },
          {
            label: "With Email",
            value: importers.filter((item) => item.email).length,
          },
          {
            label: "With Phone",
            value: importers.filter((item) => item.phone).length,
          },
        ]}
      >
        <OperationsPanel
          title="Importer Directory"
          description="Unified table styling, search, and row actions."
          icon={Truck}
        >
          <DataTable
            columns={columns}
            data={importers}
            loading={isLoading}
            searchPlaceholder="Search importers..."
            onSearch={setSearchTerm}
            searchValue={searchTerm}
          />
        </OperationsPanel>
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
