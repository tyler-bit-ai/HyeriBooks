import { useState } from 'react';
import categorizedBooksData from '../data/categorized-books.json';
import { BookCard } from './components/BookCard';
import { CategorySection } from './components/CategorySection';
import { SummaryCard } from './components/SummaryCard';
import type { CategorizedBook, CategorizedBooksData } from './types/book';

const data = categorizedBooksData as CategorizedBooksData;

const numberFormatter = new Intl.NumberFormat('ko-KR');

function filterBooks(books: CategorizedBook[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return books;
  }

  return books.filter((book) => {
    const haystack = `${book.title} ${book.library} ${book.category}`.toLowerCase();
    return haystack.includes(normalizedQuery);
  });
}

function App() {
  const [query, setQuery] = useState('');
  const visibleBooks = filterBooks(data.books, query);
  const libraries = new Set(visibleBooks.map((book) => book.library));
  const latestLoanDate = visibleBooks[0]?.loanDate ?? '-';
  const groupedBooks = data.categories.map((category) => ({
    category,
    books: visibleBooks.filter((book) => book.category === category),
  })).filter(({ books }) => books.length > 0);
  const uncategorizedBooks = visibleBooks.filter((book) => book.category === 'uncategorized');

  return (
    <main className="page-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Hyeri Books Dashboard</p>
          <h1>혜리가 읽은 책을 종류별로 한 번에 보는 대시보드</h1>
          <p className="hero-summary">
            원본 Google Spreadsheet에서 읽은 책 목록을 가져와 정규화하고,
            분류 규칙을 적용해 카테고리별로 묶었습니다. 카드에는 도서명,
            도서관, 대출일자만 남겨 스캔 속도를 높였습니다.
          </p>
        </div>

        <div className="hero-search">
          <label className="search-label" htmlFor="dashboard-search">
            제목, 도서관, 카테고리 검색
          </label>
          <input
            id="dashboard-search"
            className="search-input"
            type="search"
            placeholder="예: 삼국지, 성동구립도서관, 과학"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <p className="search-note">
            입력한 키워드에 맞는 책만 남도록 제목, 도서관, 카테고리를 함께
            필터링합니다.
          </p>
        </div>
      </section>

      <section className="summary-grid" aria-label="대시보드 요약">
        <SummaryCard label="총 읽은 책" value={`${numberFormatter.format(visibleBooks.length)}권`} />
        <SummaryCard label="분류 수" value={`${numberFormatter.format(data.categories.length)}개`} />
        <SummaryCard label="최근 대출일" value={latestLoanDate} />
        <SummaryCard label="이용 도서관" value={`${numberFormatter.format(libraries.size)}곳`} />
      </section>

      <section className="content-layout">
        <div className="category-column">
          {groupedBooks.map(({ category, books }) => (
            <CategorySection key={category} category={category} count={books.length}>
              {books.map((book) => (
                <BookCard key={`${book.title}-${book.library}-${book.loanDate}`} book={book} />
              ))}
            </CategorySection>
          ))}
        </div>

        <aside className="side-panel">
          <section className="status-card">
            <p className="side-eyebrow">분류 상태</p>
            <h2>미분류 {numberFormatter.format(uncategorizedBooks.length)}권</h2>
            <p>
              아직 규칙에 걸리지 않은 책은 숨기지 않고 별도 목록으로 남깁니다.
              이후 `category-mapping.json` 또는 원본 시트의 `category` 컬럼으로
              보강할 수 있습니다.
            </p>
          </section>

          <section className="uncategorized-list">
            {uncategorizedBooks.length === 0 ? (
              <p className="empty-state">모든 책이 현재 카테고리 안에 포함되어 있습니다.</p>
            ) : (
              uncategorizedBooks.map((book) => (
                <BookCard
                  key={`uncategorized-${book.title}-${book.loanDate}`}
                  book={book}
                  compact
                />
              ))
            )}
          </section>
        </aside>
      </section>
    </main>
  );
}

export default App;
