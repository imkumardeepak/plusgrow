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
  Building,
  Download,
  Edit2,
  Handshake,
  Globe,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Phone,
  Mail,
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
  partiesApi,
  Party,
  CreatePartyDto,
} from "../services/masterApi";

export const Parties = memo(function Parties() {
  const [parties, setParties] = useState<Party[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState<Party | null>(null);
  const [search, setSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Party | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState<CreatePartyDto>({
    name: "",
    country: "",
    address: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    loadParties();
  }, []);

  const loadParties = async () => {
    try {
      setIsLoading(true);
      const data = await partiesApi.getAll();
      setParties(data);
    } catch {
      toast.error("Failed to load parties");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Party name is required");
      return;
    }

    if (!formData.email.trim()) {
      toast.error("Email is required");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing) {
        await partiesApi.update(isEditing.id, formData);
        toast.success("Party updated successfully");
      } else {
        await partiesApi.create(formData);
        toast.success("Party and user login created successfully");
      }
      await loadParties();
      closeModal();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to save party",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreateModal = () => {
    setFormData({ name: "", country: "", address: "", phone: "", email: "" });
    setIsEditing(null);
    setIsModalOpen(true);
  };

  const openEditModal = (party: Party) => {
    setFormData({
      name: party.name,
      country: party.country || "",
      address: party.address || "",
      phone: party.phone || "",
      email: party.email,
    });
    setIsEditing(party);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditing(null);
    setFormData({ name: "", country: "", address: "", phone: "", email: "" });
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setIsDeleting(true);
    try {
      await partiesApi.delete(deleteTarget.id);
      toast.success("Party and user login deleted successfully");
      await loadParties();
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete party");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredParties = useMemo(() => {
    if (!search.trim()) return parties;
    const searchLower = search.toLowerCase();
    return parties.filter(
      (p) =>
        p.name.toLowerCase().includes(searchLower) ||
        p.email.toLowerCase().includes(searchLower) ||
        (p.country && p.country.toLowerCase().includes(searchLower)) ||
        (p.phone && p.phone.includes(searchLower)) ||
        (p.address && p.address.toLowerCase().includes(searchLower)),
    );
  }, [parties, search]);

  const columns: DataTableColumn<Party>[] = [
    {
      key: "name",
      header: "Party",
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
            <Handshake size={16} />
          </ThemeIcon>
          <Text fw={700} size="sm">
            {row.name}
          </Text>
        </Group>
      ),
    },
    {
      key: "email",
      header: "Email",
      sortable: true,
      sortAccessor: (row) => row.email,
      render: (row) => (
        <Text size="xs" c="dimmed">
          {row.email}
        </Text>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      sortable: true,
      sortAccessor: (row) => row.phone || "",
      render: (row) => (
        <Text size="xs">
          {row.phone || "N/A"}
        </Text>
      ),
      width: 140,
    },
    {
      key: "country",
      header: "Country",
      sortable: true,
      sortAccessor: (row) => row.country || "",
      render: (row) => (
        <Text size="xs" c="cyan.3">
          {row.country || "N/A"}
        </Text>
      ),
      width: 120,
    },
    {
      key: "address",
      header: "Address",
      sortable: true,
      sortAccessor: (row) => row.address || "",
      render: (row) => (
        <Text size="xs" lineClamp={1} maw={240}>
          {row.address || "N/A"}
        </Text>
      ),
    },

    {
      key: "actions",
      header: "Action",
      align: "right",
      render: (row) => (
        <Group gap="xs" justify="flex-end" wrap="nowrap">
          <Tooltip label="Edit party">
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
          <Tooltip label="Delete party">
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

  return (
    <>
      <OperationsPage
        title="Parties"
        description="Maintain parties directory and automatically provision login credentials."
        icon={Handshake}
        hideHeader
      >
        <Stack gap="sm">
          <OperationsPanel
            title="Party Directory"
            description="Manage your business partners and view registered login details."
            icon={Handshake}
            action={
              <Group gap="xs" wrap="nowrap">
                <Badge size="sm" radius="md" variant="light" color="gray">
                  {parties.length} partners
                </Badge>
                <Input
                  size="xs"
                  radius="md"
                  w={240}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search parties, emails..."
                  leftElement={<Search size={14} />}
                />
                <ActionIcon
                  size="sm"
                  radius="md"
                  variant="light"
                  color="gray"
                  onClick={() => void loadParties()}
                  loading={isLoading}
                  aria-label="Refresh party data"
                >
                  <RefreshCw size={14} />
                </ActionIcon>
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Download size={14} />}
                  onClick={() => {
                    exportToExcel({
                      fileName: "Parties_Export",
                      sheets: [{
                        sheetName: "Parties",
                        data: filteredParties,
                        columns: [
                          { header: "Name", accessor: (row) => row.name },
                          { header: "Email", accessor: (row) => row.email },
                          { header: "Phone", accessor: (row) => row.phone || "" },
                          { header: "Country", accessor: (row) => row.country || "" },
                          { header: "Address", accessor: (row) => row.address || "" },
                          { header: "Created At", accessor: (row) => formatExcelDate(row.created_at) },
                        ],
                      }],
                    });
                    toast.success("Parties exported successfully");
                  }}
                >
                  Export Excel
                </Button>
                <Button
                  size="sm"
                  onClick={openCreateModal}
                  leftIcon={<Plus size={14} />}
                >
                  New Party
                </Button>
              </Group>
            }
            contentClassName="p-0"
          >
            <MantineDataTable<Party>
              data={filteredParties}
              columns={columns}
              rowKey={(row) => row.id}
              isLoading={isLoading}
              emptyIcon={Handshake}
              emptyTitle="No parties found"
              emptyDescription="No party records match current search."
              itemLabel="partners"
              resetPageKey={search}
            />
          </OperationsPanel>
        </Stack>
      </OperationsPage>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={isEditing ? "Edit Party" : "New Party"}
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <Input
              label="Party Name"
              placeholder="Partner or customer legal name"
              value={formData.name}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, name: event.target.value }))
              }
              leftElement={<Building size={16} />}
              required
            />
            <Input
              label="Email (Login Username)"
              placeholder="email@example.com"
              value={formData.email}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, email: event.target.value }))
              }
              leftElement={<Mail size={16} />}
              required
              disabled={!!isEditing}
            />
            <Input
              label="Phone Number"
              placeholder="Phone number"
              value={formData.phone}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, phone: event.target.value }))
              }
              leftElement={<Phone size={16} />}
            />
            <Group grow align="flex-start">
              <Input
                label="Country"
                placeholder="Country of origin"
                value={formData.country}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    country: event.target.value,
                  }))
                }
                leftElement={<Globe size={16} />}
              />
              <Input
                label="Address"
                placeholder="Address summary"
                value={formData.address}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    address: event.target.value,
                  }))
                }
                leftElement={<MapPin size={16} />}
              />
            </Group>
            {!isEditing && (
              <Badge color="blue" variant="light" size="sm">
                Creating this party automatically creates a user login with password "1234".
              </Badge>
            )}
            <Group justify="flex-end" pt="sm">
              <Button variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit" loading={isSubmitting}>
                {isEditing ? "Update Party" : "Create Party"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Party"
        message={`Delete "${deleteTarget?.name}"? This will also remove their user login account. This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
      />
    </>
  );
});

export default Parties;
