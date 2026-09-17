import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';
import { holdingsFileSchema, type Holding } from '@portfolio/shared';

const COLUMNS = {
  serial: 'No',
  name: 'Particulars',
  purchasePrice: 'Purchase Price',
  quantity: 'Qty',
  investment: 'Investment',
  exchangeCode: 'NSE/BSE',
} as const;

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workbookPath = path.join(rootDir, 'data', 'portfolio.xlsx');
const outputPath = path.join(rootDir, 'apps', 'api', 'data', 'holdings.json');

type Cell = string | number | boolean | null | undefined;
type Row = Cell[];

function fail(message: string): never {
  console.error(`import:excel failed — ${message}`);
  process.exit(1);
}

function text(cell: Cell): string {
  return cell === null || cell === undefined ? '' : String(cell).replace(/\s+/g, ' ').trim();
}

function numeric(cell: Cell, rowNumber: number, label: string): number {
  const value = typeof cell === 'number' ? cell : Number(text(cell).replace(/,/g, ''));
  if (!Number.isFinite(value)) fail(`row ${rowNumber}: ${label} is not a number ("${text(cell)}")`);
  return value;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function findHeaderRow(rows: Row[]): number {
  const index = rows.findIndex((row) => row.some((cell) => text(cell) === COLUMNS.name));
  if (index === -1) fail(`no header row containing "${COLUMNS.name}" was found`);
  return index;
}

function columnIndexes(header: Row): Record<keyof typeof COLUMNS, number> {
  const lookup = new Map(header.map((cell, index) => [text(cell), index]));
  const entries = Object.entries(COLUMNS) as [keyof typeof COLUMNS, string][];

  return Object.fromEntries(
    entries.map(([key, label]) => {
      const index = lookup.get(label);
      if (index === undefined) fail(`column "${label}" is missing from the header row`);
      return [key, index];
    }),
  ) as Record<keyof typeof COLUMNS, number>;
}

function isSectorTitle(row: Row, columns: Record<keyof typeof COLUMNS, number>): boolean {
  return (
    text(row[columns.serial]) === '' &&
    text(row[columns.name]) !== '' &&
    text(row[columns.purchasePrice]) === ''
  );
}

function isGrandTotal(row: Row, columns: Record<keyof typeof COLUMNS, number>): boolean {
  return text(row[columns.name]) === '' && text(row[columns.investment]) !== '';
}

function normaliseSector(label: string): string {
  return label.replace(/\s*sector\s*$/i, '').trim();
}

function readHoldings(rows: Row[]): Holding[] {
  const headerIndex = findHeaderRow(rows);
  const columns = columnIndexes(rows[headerIndex] ?? []);
  const holdings: Holding[] = [];
  const seen = new Set<string>();

  let sector: string | null = null;

  for (let index = headerIndex + 1; index < rows.length; index += 1) {
    const row = rows[index] ?? [];
    const rowNumber = index + 1;

    if (isGrandTotal(row, columns)) break;
    if (row.every((cell) => text(cell) === '')) continue;

    if (isSectorTitle(row, columns)) {
      sector = normaliseSector(text(row[columns.name]));
      continue;
    }

    const name = text(row[columns.name]);
    if (name === '') continue;
    if (sector === null) fail(`row ${rowNumber}: "${name}" appears before any sector heading`);

    const code = text(row[columns.exchangeCode]);
    if (code === '') fail(`row ${rowNumber}: "${name}" has no NSE/BSE code`);

    let id = slugify(name);
    if (seen.has(id)) id = `${id}-${code.toLowerCase()}`;
    seen.add(id);

    holdings.push({
      id,
      name,
      sector,
      purchasePrice: numeric(row[columns.purchasePrice], rowNumber, 'Purchase Price'),
      quantity: numeric(row[columns.quantity], rowNumber, 'Qty'),
      exchange: /^\d+$/.test(code) ? 'BSE' : 'NSE',
      exchangeCode: code.toUpperCase(),
    });
  }

  return holdings;
}

function main(): void {
  let buffer: Buffer;
  try {
    buffer = readFileSync(workbookPath);
  } catch {
    fail(`no workbook at ${workbookPath}. Place the case-study sheet there and run this again.`);
  }

  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) fail('the workbook has no sheets');

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) fail(`sheet "${sheetName}" could not be read`);

  const rows = XLSX.utils.sheet_to_json<Row>(sheet, { header: 1, raw: true, defval: null });
  const holdings = readHoldings(rows);

  const validated = holdingsFileSchema.safeParse(holdings);
  if (!validated.success) {
    const issue = validated.error.issues[0];
    fail(`holding ${issue?.path.join('.')}: ${issue?.message}`);
  }

  writeFileSync(outputPath, `${JSON.stringify(validated.data, null, 2)}\n`);

  const sectors = new Set(validated.data.map((holding) => holding.sector));
  console.log(
    `Wrote ${validated.data.length} holdings across ${sectors.size} sectors to ${path.relative(rootDir, outputPath)}`,
  );
}

main();
