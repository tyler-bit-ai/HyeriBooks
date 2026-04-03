# Operations Guide

## Current Verification Status

- Verified on March 31, 2026 in local workspace `C:\Codex\Hyeri-Books`.
- `npm run build` completed successfully.
- Generated dataset snapshot:
  - total books: `185`
  - uncategorized books: `20`
- Live GitHub Pages deployment has not been verified yet because the current workspace has not been pushed to the remote repository.

## Regular Update Flow

1. Add or update rows in the source Google Spreadsheet.
2. Run `npm run sync-data` locally or trigger the GitHub Actions workflow manually.
3. Check `data/categorized-books.json` for `uncategorizedCount`.
4. If `uncategorizedCount` increased, update `data/category-mapping.json` or add a source `category` column.
5. Run `npm run build`.
6. Push to `main` if the build was run locally and you want GitHub Pages to publish the latest result.

## Wishlist Sheet Contract

- Target spreadsheet: `Hyeri_books`
- Target sheet: `읽을책`
- Required header row order:
  - `id`
  - `title`
  - `note`
  - `status`
  - `createdAt`
  - `updatedAt`
- Required field rules:
  - `id`: required, unique, immutable row identifier used for update/delete lookup
  - `title`: required, non-empty book title
  - `note`: optional free-text note
  - `status`: required, default `wishlist`, reserved values `wishlist`, `done`, `archived`
  - `createdAt`: required ISO 8601 timestamp
  - `updatedAt`: required ISO 8601 timestamp, refreshed on every edit
- CRUD lookup rule:
  - Never update or delete by sheet row number alone.
  - Always find the matching row by `id`, then mutate that row.
- Initialization rule:
  - If the `읽을책` sheet is empty, create the header row above before adding the first item.
- Sample first data row:
  - `wish_20260403_001,마법천자문 1,,wishlist,2026-04-03T00:00:00.000Z,2026-04-03T00:00:00.000Z`

## Wishlist Write Endpoint

- Source file: `scripts/wishlist-api.gs`
- Deployment target: Google Apps Script Web App bound to the same spreadsheet ID
- Supported actions:
  - `list`
  - `create`
  - `update`
  - `delete`
- Request contract:
  - `GET ?action=list&token=...`
  - `POST` body is JSON text with `action`, plus `item`, `id`, `updates`, `token` as needed
- Update/delete lookup:
  - Always resolve the target row by `id`
  - Never persist row numbers in the frontend
- Optional protection:
  - Set Apps Script `Script Properties > WISHLIST_SHARED_SECRET`
  - Pass the same value from the frontend as `VITE_WISHLIST_API_TOKEN`
- Initialization behavior:
  - The Apps Script will create the required header row automatically if the `읽을책` sheet is still empty or mismatched.

## Files To Maintain

- `scripts/fetch-books-data.ts`
  - Change this when the source sheet structure or export URL changes.
- `scripts/wishlist-api.gs`
  - Change this when wishlist API payloads, auth handling, or row lookup rules change.
- `scripts/categorize-books.ts`
  - Change this when category resolution logic changes.
- `data/category-mapping.json`
  - Update this when new titles or series remain uncategorized.
- `data/books.json`
  - Generated file from source sheet normalization.
- `data/categorized-books.json`
  - Generated file used by the dashboard.
- `.github/workflows/update-and-deploy.yml`
  - Change this when deployment schedule or Pages flow changes.

## Validation Checklist

- `npm run fetch-data` succeeds.
- `npm run categorize-data` succeeds.
- `npm run build` succeeds.
- `읽을책` sheet API `list/create/update/delete` responses are valid JSON.
- `data/books.json` includes only `title`, `library`, `loanDate` per book item.
- `data/books.json` includes `wishlist` with `sheetName`, `columns`, `items`.
- `data/categorized-books.json` includes `category` for each book item.
- UI does not show `등록번호`, `반납예정일`, `반납일자`, `대출상태`.
- Uncategorized books remain visible in the side panel instead of disappearing silently.

## Exception Handling

### If the Google Sheet headers change

- Update the required header mapping in `scripts/fetch-books-data.ts`.
- Update the `읽을책` sheet contract in `src/types/book.ts` if wishlist columns changed.
- Re-run `npm run fetch-data`.

### If a new series is not grouped correctly

- Add a keyword rule in `data/category-mapping.json`.
- Re-run `npm run categorize-data`.

### If scheduled deployment stops running

- Check whether the repository had no activity for 60 days.
- Re-enable the scheduled workflow in GitHub Actions.
- Trigger `workflow_dispatch` manually once to verify recovery.

## Deployment Reality Check

- GitHub Pages deployment requires the repository to exist remotely with this code pushed to the default branch.
- Until push and Pages activation happen, local verification is the only confirmed state.
