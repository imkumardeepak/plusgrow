import React from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  ActionIcon,
  Menu,
  Text,
} from "@mantine/core";
import {
  Copy,
  Edit3,
  Eye,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";

export interface TableAction {
  label: string;
  icon?: React.ReactNode;
  onClick: (row: any) => void;
  variant?: "default" | "destructive" | "info";
}

export interface TableColumnDef<T> {
  accessorKey: keyof T;
  header: string;
  cell?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

function getActionColor(variant?: TableAction["variant"]) {
  switch (variant) {
    case "destructive":
      return "red";
    case "info":
      return "cyan";
    default:
      return "gray";
  }
}

export function createTableColumns<T>(
  columns: TableColumnDef<T>[],
  actions?: TableAction[],
): ColumnDef<T, any>[] {
  const cols: ColumnDef<T, any>[] = columns.map((col) => ({
    accessorKey: col.accessorKey,
    header: col.header,
    cell: ({ row }) => {
      const value = row.getValue(col.accessorKey as string);

      if (col.cell) {
        return col.cell(row.original);
      }

      return value as string;
    },
    enableSorting: col.sortable ?? true,
  }));

  if (actions && actions.length > 0) {
    cols.push({
      id: "actions",
      cell: ({ row }) => (
        <Menu
          shadow="xl"
          width={200}
          radius="xl"
          position="bottom-end"
          withinPortal
        >
          <Menu.Target>
            <ActionIcon
              variant="subtle"
              color="gray"
              radius="xl"
              size="sm"
              className="opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              aria-label="Open row actions"
            >
              <MoreVertical className="h-4 w-4" />
            </ActionIcon>
          </Menu.Target>

          <Menu.Dropdown
            style={{
              background:
                "linear-gradient(180deg, rgba(16,25,41,0.98) 0%, rgba(8,14,26,0.98) 100%)",
              border: "1px solid rgba(148, 163, 184, 0.16)",
            }}
          >
            <Menu.Label>
              <Text size="10px" tt="uppercase" fw={700} c="dimmed">
                Actions
              </Text>
            </Menu.Label>
            {actions.map((action) => (
              <Menu.Item
                key={action.label}
                color={getActionColor(action.variant)}
                leftSection={
                  action.icon ?? <Pencil className="h-4 w-4" />
                }
                onClick={() => action.onClick(row.original)}
              >
                {action.label}
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
      ),
    });
  }

  return cols;
}

export const defaultActions: TableAction[] = [
  {
    label: "Edit",
    icon: <Edit3 className="h-4 w-4" />,
    onClick: (row: any) => console.log("Edit", row),
  },
  {
    label: "View Details",
    icon: <Eye className="h-4 w-4" />,
    onClick: (row: any) => console.log("View", row),
    variant: "info",
  },
  {
    label: "Duplicate",
    icon: <Copy className="h-4 w-4" />,
    onClick: (row: any) => console.log("Duplicate", row),
  },
  {
    label: "Delete",
    icon: <Trash2 className="h-4 w-4" />,
    onClick: (row: any) => console.log("Delete", row),
    variant: "destructive",
  },
];
