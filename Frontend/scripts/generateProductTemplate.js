/**
 * Script to generate Product Template Excel file
 * Run: node scripts/generateProductTemplate.js
 */
import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create workbook
const wb = XLSX.utils.book_new();

// Template data with headers
const templateData = [
  {
    "Product Name": "",
    SKU: "",
    "HSN Code": "",
    "Manufacturer Name": "",
    "Commodity Name": "",
    "Country of Origin": "India",
    "MRP Quantity": "",
    "Unit Type": "UNIT",
    MRP: "",
    "Best Before (Months)": "12",
    Factor: "1",
    "Stock Qnty": "",
  },
];

// Create worksheet from template data
const ws = XLSX.utils.json_to_sheet(templateData);

// Set column widths for better readability
ws["!cols"] = [
  { wch: 35 }, // Product Name
  { wch: 20 }, // SKU
  { wch: 15 }, // HSN Code
  { wch: 25 }, // Manufacturer Name
  { wch: 20 }, // Commodity Name
  { wch: 18 }, // Country of Origin
  { wch: 15 }, // MRP Quantity
  { wch: 12 }, // Unit Type
  { wch: 12 }, // MRP
  { wch: 20 }, // Best Before (Months)
  { wch: 10 }, // Factor
  { wch: 12 }, // Stock Qnty
];

// Add instructions as a second sheet
const instructionsData = [
  {
    Field: "Product Name",
    Description: "Full product name (Required)",
    Example: "Mechanical Keyboard Pro V2",
  },
  {
    Field: "SKU",
    Description: "Unique Stock Keeping Unit code",
    Example: "KB-001-2024",
  },
  {
    Field: "HSN Code",
    Description: "Harmonized System of Nomenclature code",
    Example: "84716060",
  },
  {
    Field: "Manufacturer Name",
    Description: "Manufacturer name (must exist in system)",
    Example: "KeyChron",
  },
  {
    Field: "Commodity Name",
    Description: "Category/Commodity name (must exist in system)",
    Example: "Electronics",
  },
  {
    Field: "Country of Origin",
    Description: "Country where product is manufactured",
    Example: "India, China, USA",
  },
  {
    Field: "MRP Quantity",
    Description: "MRP printed quantity (e.g., 1L, 500g)",
    Example: "500ML",
  },
  {
    Field: "Unit Type",
    Description: "Unit of measurement",
    Example: "UNIT, KG, LTR, ML, PCS",
  },
  {
    Field: "MRP",
    Description: "Maximum Retail Price in INR",
    Example: "4999.00",
  },
  {
    Field: "Best Before (Months)",
    Description: "Shelf life in months",
    Example: "24",
  },
  {
    Field: "Factor",
    Description: "Conversion factor for inventory",
    Example: "1",
  },
  {
    Field: "Stock Qnty",
    Description: "Initial stock quantity to set for this product",
    Example: "100",
  },
];

const instructionsWs = XLSX.utils.json_to_sheet(instructionsData);
instructionsWs["!cols"] = [{ wch: 25 }, { wch: 45 }, { wch: 30 }];

// Add worksheets to workbook
XLSX.utils.book_append_sheet(wb, ws, "Product Template");
XLSX.utils.book_append_sheet(wb, instructionsWs, "Instructions");

// Ensure public folder exists
const publicDir = path.join(__dirname, "../public");
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Write file
const outputPath = path.join(publicDir, "Product_Template.xlsx");
XLSX.writeFile(wb, outputPath);
console.log(`Template created at: ${outputPath}`);
