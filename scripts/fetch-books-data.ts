import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { BooksData, NormalizedBook } from '../src/types/book';

const SPREADSHEET_ID = '1neklDf3wD5Cncy8F_k0-zdH6CHCHgkat6N4EscLb--A';
const SHEET_GID = '0';
const SOURCE_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${SHEET_GID}`;

const REQUIRED_HEADERS = ['도서관', '도서명', '대출일자'] as const;

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
  const trimmed = value.trim();
  const dashMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dashMatch) {
    return trimmed;
  }

  const dotMatch = trimmed.match(/^(\d{4})\.(\d{2})\.(\d{2})$/);
  if (dotMatch) {
    return `${dotMatch[1]}-${dotMatch[2]}-${dotMatch[3]}`;
  }

  throw new Error(`Unsupported loan date format: ${value}`);
}

function normalizeBook(row: string[], headerMap: Map<string, number>): NormalizedBook {
  const library = row[headerMap.get('도서관') ?? -1]?.trim() ?? '';
  const title = row[headerMap.get('도서명') ?? -1]?.trim() ?? '';
  const loanDate = row[headerMap.get('대출일자') ?? -1]?.trim() ?? '';

  if (!library || !title || !loanDate) {
    throw new Error(`Missing required book fields in row: ${JSON.stringify(row)}`);
  }

  return {
    title,
    library,
    loanDate: normalizeDate(loanDate),
  };
}

async function main() {
  const response = await fetch(SOURCE_URL);

  if (!response.ok) {
    throw new Error(`Failed to fetch sheet CSV: ${response.status} ${response.statusText}`);
  }

  const csv = await response.text();
  const rows = parseCsv(csv);

  if (rows.length < 2) {
    throw new Error('Sheet CSV does not contain enough rows to normalize.');
  }

  const headers = rows[0].map((header) => header.trim());
  const headerMap = new Map(headers.map((header, index) => [header, index]));

  for (const requiredHeader of REQUIRED_HEADERS) {
    if (!headerMap.has(requiredHeader)) {
      throw new Error(`Required header is missing: ${requiredHeader}`);
    }
  }

  const books = rows.slice(1).map((row) => normalizeBook(row, headerMap));
  books.sort((left, right) => right.loanDate.localeCompare(left.loanDate));

  const output: BooksData = {
    sourceUrl: SOURCE_URL,
    generatedAt: new Date().toISOString(),
    totalBooks: books.length,
    books,
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
