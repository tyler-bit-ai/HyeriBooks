import { useEffect, useMemo, useState } from 'react';
import booksDataRaw from '../data/books.json';
import type { BooksData, NormalizedBook, WishlistItem, WishlistStatus } from './types/book';

const booksData = booksDataRaw as BooksData;
const initialWishlistItems = booksData.wishlist?.items ?? [];
const wishlistApiUrl = (import.meta.env.VITE_WISHLIST_API_URL ?? '').trim();
const wishlistApiToken = (import.meta.env.VITE_WISHLIST_API_TOKEN ?? '').trim();

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

type WishlistMutationPayload =
  | {
      action: 'create';
      item: {
        title: string;
        note: string;
        status: WishlistStatus;
      };
    }
  | {
      action: 'update';
      id: string;
      updates: {
        title?: string;
        note?: string;
        status?: WishlistStatus;
      };
    }
  | {
      action: 'delete';
      id: string;
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

function compareWishlistItems(left: WishlistItem, right: WishlistItem): number {
  if (left.updatedAt !== right.updatedAt) {
    return right.updatedAt.localeCompare(left.updatedAt);
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

function buildWishlistListUrl(apiUrl: string, token: string): string {
  const url = new URL(apiUrl);
  url.searchParams.set('action', 'list');

  if (token) {
    url.searchParams.set('token', token);
  }

  return url.toString();
}

function normalizeWishlistItem(item: WishlistItem): WishlistItem {
  return {
    id: String(item.id ?? '').trim(),
    title: String(item.title ?? '').trim(),
    note: String(item.note ?? '').trim(),
    status: (String(item.status ?? 'wishlist').trim().toLowerCase() as WishlistStatus) || 'wishlist',
    createdAt: String(item.createdAt ?? ''),
    updatedAt: String(item.updatedAt ?? ''),
  };
}

async function fetchWishlistItemsFromApi(apiUrl: string, token: string): Promise<WishlistItem[]> {
  const response = await fetch(buildWishlistListUrl(apiUrl, token));

  if (!response.ok) {
    throw new Error(`읽을책 목록을 불러오지 못했습니다. (${response.status})`);
  }

  const payload = (await response.json()) as { ok?: boolean; error?: string; items?: WishlistItem[] };

  if (!payload.ok) {
    throw new Error(payload.error || '읽을책 목록 응답이 올바르지 않습니다.');
  }

  return (payload.items ?? []).map(normalizeWishlistItem).sort(compareWishlistItems);
}

async function mutateWishlist(apiUrl: string, token: string, payload: WishlistMutationPayload): Promise<WishlistItem[]> {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=UTF-8',
    },
    body: JSON.stringify({
      ...payload,
      token,
    }),
  });

  if (!response.ok) {
    throw new Error(`읽을책 변경 요청이 실패했습니다. (${response.status})`);
  }

  const result = (await response.json()) as { ok?: boolean; error?: string };

  if (!result.ok) {
    throw new Error(result.error || '읽을책 변경 응답이 올바르지 않습니다.');
  }

  return fetchWishlistItemsFromApi(apiUrl, token);
}

function formatWishlistDate(value: string): string {
  const parsed = Date.parse(value);

  if (Number.isNaN(parsed)) {
    return value;
  }

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(parsed));
}

function App() {
  const [query, setQuery] = useState('');
  const [libraryFilter, setLibraryFilter] = useState('all');
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([...initialWishlistItems].sort(compareWishlistItems));
  const [wishlistTitle, setWishlistTitle] = useState('');
  const [wishlistNote, setWishlistNote] = useState('');
  const [wishlistError, setWishlistError] = useState('');
  const [wishlistNotice, setWishlistNotice] = useState(
    wishlistApiUrl ? '' : '읽을책 API URL이 설정되지 않아 현재는 읽기 전용입니다.',
  );
  const [wishlistSubmitting, setWishlistSubmitting] = useState(false);
  const [wishlistRefreshing, setWishlistRefreshing] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [editingTitle, setEditingTitle] = useState('');
  const [editingNote, setEditingNote] = useState('');

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
  const wishlistEditable = wishlistApiUrl.length > 0;

  useEffect(() => {
    if (!wishlistEditable) {
      return;
    }

    let cancelled = false;

    const loadWishlist = async () => {
      setWishlistRefreshing(true);
      setWishlistError('');

      try {
        const items = await fetchWishlistItemsFromApi(wishlistApiUrl, wishlistApiToken);

        if (!cancelled) {
          setWishlistItems(items);
          setWishlistNotice('');
        }
      } catch (error) {
        if (!cancelled) {
          setWishlistError(error instanceof Error ? error.message : '읽을책 목록을 동기화하지 못했습니다.');
        }
      } finally {
        if (!cancelled) {
          setWishlistRefreshing(false);
        }
      }
    };

    void loadWishlist();

    return () => {
      cancelled = true;
    };
  }, [wishlistEditable]);

  async function handleWishlistCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextTitle = wishlistTitle.trim();
    const nextNote = wishlistNote.trim();

    if (!nextTitle) {
      setWishlistError('책 제목을 입력해 주세요.');
      return;
    }

    if (!wishlistEditable) {
      setWishlistError('읽을책 API URL이 설정되지 않아 저장할 수 없습니다.');
      return;
    }

    setWishlistSubmitting(true);
    setWishlistError('');
    setWishlistNotice('');

    try {
      const items = await mutateWishlist(wishlistApiUrl, wishlistApiToken, {
        action: 'create',
        item: {
          title: nextTitle,
          note: nextNote,
          status: 'wishlist',
        },
      });

      setWishlistItems(items);
      setWishlistTitle('');
      setWishlistNote('');
      setWishlistNotice('읽을책에 새 항목을 저장했습니다.');
    } catch (error) {
      setWishlistError(error instanceof Error ? error.message : '읽을책 저장에 실패했습니다.');
    } finally {
      setWishlistSubmitting(false);
    }
  }

  function startWishlistEdit(item: WishlistItem) {
    setEditingId(item.id);
    setEditingTitle(item.title);
    setEditingNote(item.note);
    setWishlistError('');
    setWishlistNotice('');
  }

  function cancelWishlistEdit() {
    setEditingId('');
    setEditingTitle('');
    setEditingNote('');
  }

  async function saveWishlistEdit(id: string) {
    const nextTitle = editingTitle.trim();
    const nextNote = editingNote.trim();

    if (!nextTitle) {
      setWishlistError('수정할 책 제목을 입력해 주세요.');
      return;
    }

    if (!wishlistEditable) {
      setWishlistError('읽을책 API URL이 설정되지 않아 수정할 수 없습니다.');
      return;
    }

    setWishlistSubmitting(true);
    setWishlistError('');
    setWishlistNotice('');

    try {
      const items = await mutateWishlist(wishlistApiUrl, wishlistApiToken, {
        action: 'update',
        id,
        updates: {
          title: nextTitle,
          note: nextNote,
        },
      });

      setWishlistItems(items);
      cancelWishlistEdit();
      setWishlistNotice('읽을책 항목을 수정했습니다.');
    } catch (error) {
      setWishlistError(error instanceof Error ? error.message : '읽을책 수정에 실패했습니다.');
    } finally {
      setWishlistSubmitting(false);
    }
  }

  async function deleteWishlistItem(id: string) {
    if (!wishlistEditable) {
      setWishlistError('읽을책 API URL이 설정되지 않아 삭제할 수 없습니다.');
      return;
    }

    setWishlistSubmitting(true);
    setWishlistError('');
    setWishlistNotice('');

    try {
      const items = await mutateWishlist(wishlistApiUrl, wishlistApiToken, {
        action: 'delete',
        id,
      });

      setWishlistItems(items);

      if (editingId === id) {
        cancelWishlistEdit();
      }

      setWishlistNotice('읽을책 항목을 삭제했습니다.');
    } catch (error) {
      setWishlistError(error instanceof Error ? error.message : '읽을책 삭제에 실패했습니다.');
    } finally {
      setWishlistSubmitting(false);
    }
  }

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

      <section className="wishlist-panel" aria-label="읽을책">
        <header className="wishlist-header">
          <div>
            <p className="major-kicker">Wishlist</p>
            <h2>앞으로 읽고 싶은 책</h2>
            <p className="wishlist-meta">
              {wishlistItems.length}권
              <span>{wishlistEditable ? 'API 연결 가능' : '읽기 전용'}</span>
              {wishlistRefreshing ? <span>동기화 중</span> : null}
            </p>
          </div>
        </header>

        <form className="wishlist-form" onSubmit={handleWishlistCreate}>
          <label className="filter-field">
            <span>책 제목</span>
            <input
              type="text"
              value={wishlistTitle}
              onChange={(event) => setWishlistTitle(event.target.value)}
              placeholder="읽고 싶은 책 제목"
              disabled={!wishlistEditable || wishlistSubmitting}
            />
          </label>

          <label className="filter-field wishlist-note-field">
            <span>메모</span>
            <input
              type="text"
              value={wishlistNote}
              onChange={(event) => setWishlistNote(event.target.value)}
              placeholder="권수, 이유, 찾을 도서관 등"
              disabled={!wishlistEditable || wishlistSubmitting}
            />
          </label>

          <button type="submit" className="wishlist-submit" disabled={!wishlistEditable || wishlistSubmitting}>
            {wishlistSubmitting ? '저장 중...' : '추가'}
          </button>
        </form>

        {wishlistError ? <p className="wishlist-feedback wishlist-feedback-error">{wishlistError}</p> : null}
        {wishlistNotice ? <p className="wishlist-feedback wishlist-feedback-notice">{wishlistNotice}</p> : null}

        <div className="wishlist-list">
          {wishlistItems.length === 0 ? (
            <div className="wishlist-empty">아직 등록된 읽을책이 없습니다.</div>
          ) : (
            wishlistItems.map((item) => {
              const isEditing = editingId === item.id;

              return (
                <article key={item.id} className="wishlist-item">
                  {isEditing ? (
                    <div className="wishlist-edit-grid">
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(event) => setEditingTitle(event.target.value)}
                        aria-label="읽을책 제목 수정"
                        disabled={wishlistSubmitting}
                      />
                      <input
                        type="text"
                        value={editingNote}
                        onChange={(event) => setEditingNote(event.target.value)}
                        aria-label="읽을책 메모 수정"
                        disabled={wishlistSubmitting}
                      />
                    </div>
                  ) : (
                    <div className="wishlist-copy">
                      <strong>{item.title}</strong>
                      {item.note ? <p>{item.note}</p> : null}
                      <span>업데이트 {formatWishlistDate(item.updatedAt)}</span>
                    </div>
                  )}

                  <div className="wishlist-actions">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          className="wishlist-action"
                          onClick={() => void saveWishlistEdit(item.id)}
                          disabled={wishlistSubmitting}
                        >
                          저장
                        </button>
                        <button
                          type="button"
                          className="wishlist-action wishlist-action-muted"
                          onClick={cancelWishlistEdit}
                          disabled={wishlistSubmitting}
                        >
                          취소
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="wishlist-action"
                        onClick={() => startWishlistEdit(item)}
                        disabled={wishlistSubmitting}
                      >
                        수정
                      </button>
                    )}

                    <button
                      type="button"
                      className="wishlist-action wishlist-action-danger"
                      onClick={() => void deleteWishlistItem(item.id)}
                      aria-label={`${item.title} 삭제`}
                      disabled={wishlistSubmitting}
                    >
                      X
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
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
