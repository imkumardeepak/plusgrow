import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Pencil, Trash2, Edit3, Eye, Copy, MoreVertical } from 'lucide-react';
import { Button } from '../../atoms/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu';
import { motion, AnimatePresence } from 'framer-motion';

export interface TableAction {
  label: string;
  icon?: React.ReactNode;
  onClick: (row: any) => void;
  variant?: 'default' | 'destructive' | 'info';
}

export interface TableColumnDef<T> {
  accessorKey: keyof T;
  header: string;
  cell?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

// Helper to create columns with actions
export function createTableColumns<T>(
  columns: TableColumnDef<T>[],
  actions?: TableAction[]
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
      id: 'actions',
      cell: ({ row }) => {
        const getIconColor = (variant?: string) => {
          switch (variant) {
            case 'destructive': return 'text-danger-500';
            case 'info': return 'text-brand-500';
            default: return 'text-neutral-600';
          }
        };

        const getHoverColor = (variant?: string) => {
          switch (variant) {
            case 'destructive': return 'hover:bg-danger-50 hover:text-danger-600';
            case 'info': return 'hover:bg-brand-50 hover:text-brand-600';
            default: return 'hover:bg-brand-50 hover:text-brand-600';
          }
        };

        return (
          <div className="relative">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="outline-none">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-neutral-400 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-brand-50 focus:outline-none focus-visible:ring-0 active:ring-0"
                  >
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </motion.div>
                    <span className="sr-only">Open menu</span>
                  </Button>
                </div>
              </DropdownMenuTrigger>
              <AnimatePresence>
                <DropdownMenuContent align="end" className="w-56 p-1.5 mr-2 bg-transparent border-none shadow-none">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="bg-white rounded-xl border border-neutral-200/60 shadow-xl shadow-brand-100/20 overflow-hidden"
                  >
                    {/* Header */}
                    <div className="px-3 py-2 border-b border-neutral-100">
                      <p className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">Actions</p>
                    </div>

                    {/* Action Items */}
                    <div className="py-1">
                      {actions.map((action, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05, duration: 0.15 }}
                        >
                          {index > 0 && (
                            <div className="mx-3 my-1 border-t border-neutral-100" />
                          )}
                          <DropdownMenuItem
                            onClick={() => action.onClick(row.original)}
                            className={`cursor-pointer rounded-lg mx-1 my-0.5 px-3 py-2 transition-all duration-150 ${getHoverColor(action.variant)} ${getIconColor(action.variant)}`}
                          >
                            <div className="flex items-center gap-3">
                              {action.icon ? (
                                <span className="flex-shrink-0">{action.icon}</span>
                              ) : (
                                <Pencil className="w-4 h-4 flex-shrink-0" />
                              )}
                              <span className="font-medium text-sm">{action.label}</span>
                            </div>
                          </DropdownMenuItem>
                        </motion.div>
                      ))}
                    </div>

                    {/* Footer with subtle gradient */}
                    <div className="h-px bg-gradient-to-r from-transparent via-brand-200/50 to-transparent" />
                  </motion.div>
                </DropdownMenuContent>
              </AnimatePresence>
            </DropdownMenu>
          </div>
        );
      },
    });
  }

  return cols;
}

// Quick action presets
export const defaultActions: TableAction[] = [
  {
    label: 'Edit',
    icon: <Edit3 className="h-4 w-4" />,
    onClick: (row: any) => console.log('Edit', row),
  },
  {
    label: 'View Details',
    icon: <Eye className="h-4 w-4" />,
    onClick: (row: any) => console.log('View', row),
    variant: 'info',
  },
  {
    label: 'Duplicate',
    icon: <Copy className="h-4 w-4" />,
    onClick: (row: any) => console.log('Duplicate', row),
  },
  {
    label: 'Delete',
    icon: <Trash2 className="h-4 w-4" />,
    onClick: (row: any) => console.log('Delete', row),
    variant: 'destructive',
  },
];
