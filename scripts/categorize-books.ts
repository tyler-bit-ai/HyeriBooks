import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  BooksData,
  CategorizedBook,
  CategorizedBooksData,
  CategoryMapping,
  NormalizedBook,
} from '../src/types/book';

function normalizeCategory(value: string): string {
  return value.trim();
}

function matchCategory(book: NormalizedBook, mapping: CategoryMapping): string {
  const explicitCategory = typeof book.category === 'string' ? normalizeCategory(book.category) : '';
  if (explicitCategory) {
    return explicitCategory;
  }

  for (const categoryName of mapping.priorityOrder) {
    const rule = mapping.rules.find((currentRule) => currentRule.category === categoryName);
    if (!rule) {
      continue;
    }

    const matched = rule.includes.some((keyword) => book.title.includes(keyword));
    if (matched) {
      return categoryName;
    }
  }

  return 'uncategorized';
}

async function main() {
  const currentFilePath = fileURLToPath(import.meta.url);
  const projectRoot = path.resolve(path.dirname(currentFilePath), '..');
  const booksPath = path.join(projectRoot, 'data', 'books.json');
  const mappingPath = path.join(projectRoot, 'data', 'category-mapping.json');
  const outputPath = path.join(projectRoot, 'data', 'categorized-books.json');

  const [booksRaw, mappingRaw] = await Promise.all([
    readFile(booksPath, 'utf8'),
    readFile(mappingPath, 'utf8'),
  ]);

  const booksData = JSON.parse(booksRaw) as BooksData;
  const mapping = JSON.parse(mappingRaw) as CategoryMapping;

  const categorizedBooks: CategorizedBook[] = booksData.books.map((book) => ({
    title: book.title,
    library: book.library,
    loanDate: book.loanDate,
    category: matchCategory(book, mapping),
  }));

  categorizedBooks.sort((left, right) => {
    const categoryComparison = mapping.priorityOrder.indexOf(left.category) - mapping.priorityOrder.indexOf(right.category);
    if (left.category === 'uncategorized' || right.category === 'uncategorized') {
      if (left.category === right.category) {
        return right.loanDate.localeCompare(left.loanDate);
      }
      return left.category === 'uncategorized' ? 1 : -1;
    }

    if (categoryComparison !== 0) {
      return categoryComparison;
    }

    return right.loanDate.localeCompare(left.loanDate);
  });

  const uncategorizedTitles = categorizedBooks
    .filter((book) => book.category === 'uncategorized')
    .map((book) => book.title);

  const categorySet = new Set(
    categorizedBooks
      .map((book) => book.category)
      .filter((category) => category !== 'uncategorized'),
  );

  const output: CategorizedBooksData = {
    generatedAt: new Date().toISOString(),
    totalBooks: categorizedBooks.length,
    categories: [...mapping.priorityOrder.filter((category) => categorySet.has(category))],
    uncategorizedCount: uncategorizedTitles.length,
    uncategorizedTitles,
    books: categorizedBooks,
  };

  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(`Categorized ${categorizedBooks.length} books. Uncategorized: ${uncategorizedTitles.length}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});

