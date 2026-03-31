import { useMemo, useState } from 'react';
import booksDataRaw from '../data/books.json';
import type { BooksData, NormalizedBook } from './types/book';

const booksData = booksDataRaw as BooksData;

type MinorGroup = {
  minorName: string;
  books: NormalizedBook[];
};

type MajorGroup = {
  majorName: string;
  minorGroups: MinorGroup[];
  totalBooks: number;
};

type FranchiseRule = {
  majorName: string;
  keywords: string[];
};

const franchiseRules: FranchiseRule[] = [
  { majorName: '설민석', keywords: ['설민석'] },
  { majorName: '흔한남매', keywords: ['흔한남매'] },
  { majorName: '빨간내복야코', keywords: ['빨간내복야코', '야코'] },
  { majorName: '슈뻘맨', keywords: ['슈뻘맨'] },
  { majorName: '백앤아', keywords: ['백앤아'] },
  { majorName: '춘식이 with 라이언', keywords: ['춘식이 with 라이언', '춘식이'] },
  { majorName: '비밀요원 레너드', keywords: ['비밀요원 레너드', '레너드'] },
  { majorName: '쿠키런', keywords: ['쿠키런'] },
  { majorName: '무적 이순신', keywords: ['무적 이순신'] },
  { majorName: '제철용사 한딸기', keywords: ['제철용사 한딸기'] },
];

function parseVolume(title: string): number | null {
  const volumePatterns = [
    /\.\s*(\d+)(?:\s|,|$)/,
    /\s(\d+)\s*-\s*/,
    /\s(\d+)(?:\s|:|$)/,
  ];

  for (const pattern of volumePatterns) {
    const match = title.match(pattern);
    if (match) {
      return Number.parseInt(match[1], 10);
    }
  }

  return null;
}

function normalizeText(value: string): string {
  return value
    .replace(/[()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getMajorName(title: string): string {
  const normalizedTitle = normalizeText(title);

  for (const rule of franchiseRules) {
    if (rule.keywords.some((keyword) => normalizedTitle.includes(keyword))) {
      return rule.majorName;
    }
  }

  return '기타';
}

function getMinorName(title: string): string {
  const normalizedTitle = normalizeText(title);

  const volumePatterns = [
    /^(.*?)(?:\.\s*\d+)(?:\s*[,:-].*)?$/,
    /^(.*?)(?:\s+\d+\s*-\s*.*)$/,
    /^(.*?)(?:\s+\d+)(?:\s*:\s*.*)?$/,
  ];

  for (const pattern of volumePatterns) {
    const match = normalizedTitle.match(pattern);
    if (match?.[1]) {
      return normalizeText(match[1]);
    }
  }

  return normalizedTitle.replace(/[,:-]\s.*$/, '').trim() || normalizedTitle;
}

function compareBooks(left: NormalizedBook, right: NormalizedBook): number {
  const leftVolume = parseVolume(left.title);
  const rightVolume = parseVolume(right.title);

  if (leftVolume !== null && rightVolume !== null && leftVolume !== rightVolume) {
    return leftVolume - rightVolume;
  }

  if (left.loanDate !== right.loanDate) {
    return right.loanDate.localeCompare(left.loanDate);
  }

  return left.title.localeCompare(right.title, 'ko');
}

function buildGroups(books: NormalizedBook[]): MajorGroup[] {
  const majorMap = new Map<string, Map<string, NormalizedBook[]>>();

  for (const book of books) {
    const majorName = getMajorName(book.title);
    const minorName = getMinorName(book.title);

    const minorMap = majorMap.get(majorName) ?? new Map<string, NormalizedBook[]>();
    const currentBooks = minorMap.get(minorName) ?? [];
    currentBooks.push(book);
    minorMap.set(minorName, currentBooks);
    majorMap.set(majorName, minorMap);
  }

  return [...majorMap.entries()]
    .map(([majorName, minorMap]) => {
      const minorGroups = [...minorMap.entries()]
        .map(([minorName, groupedBooks]) => ({
          minorName,
          books: [...groupedBooks].sort(compareBooks),
        }))
        .sort((left, right) => {
          const leftLatest = left.books[0]?.loanDate ?? '';
          const rightLatest = right.books[0]?.loanDate ?? '';

          if (leftLatest !== rightLatest) {
            return rightLatest.localeCompare(leftLatest);
          }

          return left.minorName.localeCompare(right.minorName, 'ko');
        });

      return {
        majorName,
        minorGroups,
        totalBooks: minorGroups.reduce((sum, group) => sum + group.books.length, 0),
      };
    })
    .sort((left, right) => {
      if (left.majorName === '기타') {
        return 1;
      }

      if (right.majorName === '기타') {
        return -1;
      }

      const leftLatest = left.minorGroups[0]?.books[0]?.loanDate ?? '';
      const rightLatest = right.minorGroups[0]?.books[0]?.loanDate ?? '';

      if (leftLatest !== rightLatest) {
        return rightLatest.localeCompare(leftLatest);
      }

      return left.majorName.localeCompare(right.majorName, 'ko');
    });
}

function App() {
  const [query, setQuery] = useState('');
  const [libraryFilter, setLibraryFilter] = useState('all');

  const libraries = useMemo(
    () => [...new Set(booksData.books.map((book) => book.library))].sort((left, right) => left.localeCompare(right, 'ko')),
    [],
  );

  const filteredBooks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return booksData.books.filter((book) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        `${book.title} ${book.library}`.toLowerCase().includes(normalizedQuery);
      const matchesLibrary = libraryFilter === 'all' || book.library === libraryFilter;

      return matchesQuery && matchesLibrary;
    });
  }, [libraryFilter, query]);

  const majorGroups = useMemo(() => buildGroups(filteredBooks), [filteredBooks]);
  const minorGroupCount = useMemo(
    () => majorGroups.reduce((sum, group) => sum + group.minorGroups.length, 0),
    [majorGroups],
  );

  return (
    <main className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Hyeri Books</p>
          <h1>혜리가 읽은 책</h1>
        </div>

        <div className="filter-bar">
          <label className="filter-field">
            <span>검색</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="제목 또는 도서관"
            />
          </label>

          <label className="filter-field">
            <span>도서관</span>
            <select value={libraryFilter} onChange={(event) => setLibraryFilter(event.target.value)}>
              <option value="all">전체</option>
              {libraries.map((library) => (
                <option key={library} value={library}>
                  {library}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <section className="list-summary" aria-label="리스트 요약">
        <strong>{filteredBooks.length}권</strong>
        <span>{majorGroups.length}개 대분류</span>
        <span>{minorGroupCount}개 중분류</span>
      </section>

      <section className="major-list" aria-label="읽은 책 리스트">
        {majorGroups.map((majorGroup) => (
          <section key={majorGroup.majorName} className="major-group">
            <header className="major-header">
              <div>
                <p className="major-kicker">대분류</p>
                <h2>{majorGroup.majorName}</h2>
              </div>
              <span>{majorGroup.totalBooks}권</span>
            </header>

            <div className="minor-list">
              {majorGroup.minorGroups.map((minorGroup) => (
                <section key={`${majorGroup.majorName}-${minorGroup.minorName}`} className="series-group">
                  <header className="series-header">
                    <div>
                      <p className="minor-kicker">중분류</p>
                      <h3>{minorGroup.minorName}</h3>
                    </div>
                    <span>{minorGroup.books.length}권</span>
                  </header>

                  <div className="list-table" role="table" aria-label={minorGroup.minorName}>
                    <div className="list-head" role="row">
                      <span role="columnheader">제목</span>
                      <span role="columnheader">대출일</span>
                      <span role="columnheader">도서관</span>
                    </div>

                    {minorGroup.books.map((book) => (
                      <div
                        key={`${majorGroup.majorName}-${minorGroup.minorName}-${book.title}-${book.loanDate}-${book.library}`}
                        className="list-row"
                        role="row"
                      >
                        <span role="cell" className="title-cell">
                          {book.title}
                        </span>
                        <span role="cell">{book.loanDate}</span>
                        <span role="cell">{book.library}</span>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </section>
        ))}
      </section>
    </main>
  );
}

export default App;
