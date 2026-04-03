import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { BooksData, NormalizedBook, WishlistData, WishlistItem, WishlistStatus } from '../src/types/book';

const SPREADSHEET_ID = '1neklDf3wD5Cncy8F_k0-zdH6CHCHgkat6N4EscLb--A';
const SHEETS = [
  {
    gid: '0',
    aliases: {
      title: ['도서명'],
      library: ['도서관'],
      loanDate: ['대출일자'],
    },
  },
  {
    gid: '474010460',
    aliases: {
      title: ['도서정보'],
      library: ['소장도서관'],
      loanDate: ['대출일'],
    },
  },
] as const;

const SOURCE_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`;
const WISHLIST_SHEET = {
  gid: '738709611',
  aliases: {
    id: ['id'],
    title: ['title'],
    note: ['note'],
    status: ['status'],
    createdAt: ['createdAt'],
    updatedAt: ['updatedAt'],
  },
} as const;

function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const nextChar = input[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(field);
      field = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i += 1;
      }

      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((currentRow) => currentRow.some((value) => value.trim() !== ''));
}

function normalizeDate(value: string): string {
  const trimmed = value.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
  const dashMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dashMatch) {
    return trimmed;
  }

  const slashMatch = trimmed.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (slashMatch) {
    return `${slashMatch[1]}-${slashMatch[2]}-${slashMatch[3]}`;
  }

  const dotMatch = trimmed.match(/^(\d{4})\.(\d{2})\.(\d{2})$/);
  if (dotMatch) {
    return `${dotMatch[1]}-${dotMatch[2]}-${dotMatch[3]}`;
  }

  throw new Error(`Unsupported loan date format: ${value}`);
}

function normalizeTimestamp(value: string): string {
  const trimmed = value.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
  const parsed = Date.parse(trimmed);

  if (Number.isNaN(parsed)) {
    throw new Error(`Unsupported timestamp format: ${value}`);
  }

  return new Date(parsed).toISOString();
}

function findHeaderIndex(headerMap: Map<string, number>, aliases: readonly string[]): number {
  for (const alias of aliases) {
    const index = headerMap.get(alias);
    if (index !== undefined) {
      return index;
    }
  }

  return -1;
}

function normalizeBook(
  row: string[],
  headerMap: Map<string, number>,
  aliases: {
    title: readonly string[];
    library: readonly string[];
    loanDate: readonly string[];
  },
): NormalizedBook {
  const library = row[findHeaderIndex(headerMap, aliases.library)]?.trim() ?? '';
  const title = row[findHeaderIndex(headerMap, aliases.title)]?.trim() ?? '';
  const loanDate = row[findHeaderIndex(headerMap, aliases.loanDate)]?.trim() ?? '';

  if (!library || !title || !loanDate) {
    throw new Error(`Missing required book fields in row: ${JSON.stringify(row)}`);
  }

  return {
    title,
    library,
    loanDate: normalizeDate(loanDate),
  };
}

function normalizeWishlistStatus(value: string): WishlistStatus {
  const normalized = value.trim().toLowerCase();

  if (normalized === 'wishlist' || normalized === 'done' || normalized === 'archived') {
    return normalized;
  }

  throw new Error(`Unsupported wishlist status: ${value}`);
}

function normalizeWishlistItem(
  row: string[],
  headerMap: Map<string, number>,
  aliases: {
    id: readonly string[];
    title: readonly string[];
    note: readonly string[];
    status: readonly string[];
    createdAt: readonly string[];
    updatedAt: readonly string[];
  },
): WishlistItem {
  const id = row[findHeaderIndex(headerMap, aliases.id)]?.trim() ?? '';
  const title = row[findHeaderIndex(headerMap, aliases.title)]?.trim() ?? '';
  const note = row[findHeaderIndex(headerMap, aliases.note)]?.trim() ?? '';
  const status = row[findHeaderIndex(headerMap, aliases.status)]?.trim() ?? '';
  const createdAt = row[findHeaderIndex(headerMap, aliases.createdAt)]?.trim() ?? '';
  const updatedAt = row[findHeaderIndex(headerMap, aliases.updatedAt)]?.trim() ?? '';

  if (!id || !title || !status || !createdAt || !updatedAt) {
    throw new Error(`Missing required wishlist fields in row: ${JSON.stringify(row)}`);
  }

  return {
    id,
    title,
    note,
    status: normalizeWishlistStatus(status),
    createdAt: normalizeTimestamp(createdAt),
    updatedAt: normalizeTimestamp(updatedAt),
  };
}

async function main() {
  const books = (
    await Promise.all(
      SHEETS.map(async (sheet) => {
        const exportUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${sheet.gid}`;
        const response = await fetch(exportUrl);

        if (!response.ok) {
          throw new Error(`Failed to fetch sheet CSV: ${response.status} ${response.statusText}`);
        }

        const csv = await response.text();
        const rows = parseCsv(csv);

        if (rows.length < 2) {
          return [];
        }

        const headers = rows[0].map((header) => header.replace(/[\u200B-\u200D\uFEFF]/g, '').trim());
        const headerMap = new Map(headers.map((header, index) => [header, index]));

        for (const [fieldName, fieldAliases] of Object.entries(sheet.aliases)) {
          if (findHeaderIndex(headerMap, fieldAliases) < 0) {
            throw new Error(`Required header is missing for ${fieldName}: ${fieldAliases.join(', ')}`);
          }
        }

        return rows.slice(1).map((row) => normalizeBook(row, headerMap, sheet.aliases));
      }),
    )
  ).flat();

  books.sort((left, right) => right.loanDate.localeCompare(left.loanDate));

  const wishlistResponse = await fetch(
    `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${WISHLIST_SHEET.gid}`,
  );

  if (!wishlistResponse.ok) {
    throw new Error(`Failed to fetch wishlist sheet CSV: ${wishlistResponse.status} ${wishlistResponse.statusText}`);
  }

  const wishlistCsv = await wishlistResponse.text();
  const wishlistRows = parseCsv(wishlistCsv);
  let wishlist: WishlistData = {
    sheetName: '읽을책',
    columns: ['id', 'title', 'note', 'status', 'createdAt', 'updatedAt'],
    items: [],
  };

  if (wishlistRows.length > 0) {
    const headers = wishlistRows[0].map((header) => header.replace(/[\u200B-\u200D\uFEFF]/g, '').trim());
    const headerMap = new Map(headers.map((header, index) => [header, index]));

    for (const [fieldName, fieldAliases] of Object.entries(WISHLIST_SHEET.aliases)) {
      if (findHeaderIndex(headerMap, fieldAliases) < 0) {
        throw new Error(`Required wishlist header is missing for ${fieldName}: ${fieldAliases.join(', ')}`);
      }
    }

    const items = wishlistRows
      .slice(1)
      .filter((row) => row.some((value) => value.trim() !== ''))
      .map((row) => normalizeWishlistItem(row, headerMap, WISHLIST_SHEET.aliases))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

    wishlist = {
      sheetName: '읽을책',
      columns: ['id', 'title', 'note', 'status', 'createdAt', 'updatedAt'],
      items,
    };
  }

  const output: BooksData = {
    sourceUrl: SOURCE_URL,
    generatedAt: new Date().toISOString(),
    totalBooks: books.length,
    books,
    wishlist,
  };

  const currentFilePath = fileURLToPath(import.meta.url);
  const projectRoot = path.resolve(path.dirname(currentFilePath), '..');
  const outputPath = path.join(projectRoot, 'data', 'books.json');

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

  console.log(`Generated ${books.length} books into ${outputPath}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
