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
  wishlist?: WishlistData;
};

export const WISHLIST_STATUSES = ['wishlist', 'done', 'archived'] as const;
export const WISHLIST_COLUMNS = ['id', 'title', 'note', 'status', 'createdAt', 'updatedAt'] as const;

export type WishlistStatus = (typeof WISHLIST_STATUSES)[number];

export type WishlistItem = {
  id: string;
  title: string;
  note: string;
  status: WishlistStatus;
  createdAt: string;
  updatedAt: string;
};

export type WishlistData = {
  sheetName: '읽을책';
  columns: readonly string[];
  items: WishlistItem[];
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
