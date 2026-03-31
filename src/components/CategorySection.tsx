import type { ReactNode } from 'react';

type CategorySectionProps = {
  category: string;
  count: number;
  children: ReactNode;
};

export function CategorySection({ category, count, children }: CategorySectionProps) {
  return (
    <section className="category-section">
      <header className="category-header">
        <div>
          <p className="category-kicker">Category</p>
          <h2>{category}</h2>
        </div>
        <strong>{count}권</strong>
      </header>
      <div className="books-grid">{children}</div>
    </section>
  );
}

