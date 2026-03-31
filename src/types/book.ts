export type NormalizedBook = {
  title: string;
  library: string;
  loanDate: string;
  category?: string;
};

export type BooksData = {
  sourceUrl: string;
  generatedAt: string;
  totalBooks: number;
  books: NormalizedBook[];
};

export type CategoryRule = {
  category: string;
  includes: string[];
};

export type CategoryMapping = {
  priorityOrder: string[];
  rules: CategoryRule[];
};

export type CategorizedBook = {
  title: string;
  library: string;
  loanDate: string;
  category: string;
};

export type CategorizedBooksData = {
  generatedAt: string;
  totalBooks: number;
  categories: string[];
  uncategorizedCount: number;
  uncategorizedTitles: string[];
  books: CategorizedBook[];
};

