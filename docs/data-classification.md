# Data Classification Strategy

## Confirmed Constraint

- The source Google Sheet currently does not include a `종류`, `category`, or equivalent classification column.
- The dashboard still needs category-based grouping, so classification must be added outside the current source schema or derived from book titles.

## Option A: Add Category in Google Sheet

- Add a dedicated `category` column to the source sheet.
- Use that value as the highest-priority category during data generation.
- Keep repository mapping rules only as a fallback for rows without a category value.

### Pros

- Most accurate and easiest to maintain over time.
- New books can be classified at the same moment they are recorded.
- Category changes remain attached to the original source of truth.

### Cons

- Requires manual data entry in the spreadsheet.
- Depends on editors keeping the new column consistent.

## Option B: Maintain Repository Mapping Rules

- Keep `data/category-mapping.json` as the classification source.
- Match books by title keywords or series names.
- Mark unmatched rows as `uncategorized`.

### Pros

- No need to change the original spreadsheet structure immediately.
- Classification logic is version-controlled with the dashboard code.

### Cons

- New books can remain uncategorized until mapping rules are updated.
- Keyword-based matching can misclassify ambiguous titles.

## Selected Implementation

- Treat Option A as the preferred long-term operating model.
- Implement Option B immediately so the dashboard can be built with the current spreadsheet.
- Keep the categorizer ready to honor an explicit `category` value if the normalized data starts carrying one later.

## Current Category Groups

- `역사`
- `과학`
- `국어/한자`
- `추리/미스터리`
- `판타지/모험`
- `생활/성장`
- `동화/문학`
- `uncategorized`

## Maintenance Rules

- Update `data/category-mapping.json` whenever newly added books fall into `uncategorized`.
- If the spreadsheet gains a `category` column, update the fetch pipeline to carry that value through normalization before mapping fallback runs.
- Do not silently hide uncategorized books. Surface them in generated data and in the dashboard UI.
