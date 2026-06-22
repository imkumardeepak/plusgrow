-- Migration: Add tracking_number to sales_orders, picked_at and packed_at to sales_order_items
-- Date: 2026-06-22

-- Add tracking_number column to sales_orders table
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(255);

-- Add picked_at and packed_at columns to sales_order_items table
ALTER TABLE sales_order_items ADD COLUMN IF NOT EXISTS picked_at TIMESTAMP;
ALTER TABLE sales_order_items ADD COLUMN IF NOT EXISTS packed_at TIMESTAMP;

-- Backfill picked_at for items that are already Picked/Packed/Dispatched
UPDATE sales_order_items
SET picked_at = updated_at
WHERE status IN ('Picked', 'Packed', 'Dispatched') AND picked_at IS NULL;

-- Backfill packed_at for items that are already Packed/Dispatched
UPDATE sales_order_items
SET packed_at = updated_at
WHERE status IN ('Packed', 'Dispatched') AND packed_at IS NULL;
