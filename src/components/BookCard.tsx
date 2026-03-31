import type { CategorizedBook } from '../types/book';

type BookCardProps = {
  book: CategorizedBook;
  compact?: boolean;
};

export function BookCard({ book, compact = false }: BookCardProps) {
  return (
    <article className={compact ? 'book-card compact' : 'book-card'}>
      <h3>{book.title}</h3>
      <dl>
        <div>
          <dt>도서관</dt>
          <dd>{book.library}</dd>
        </div>
        <div>
          <dt>대출일</dt>
          <dd>{book.loanDate}</dd>
        </div>
      </dl>
    </article>
  );
}

