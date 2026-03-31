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

## Files To Maintain

- `scripts/fetch-books-data.ts`
  - Change this when the source sheet structure or export URL changes.
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
- `data/books.json` includes only `title`, `library`, `loanDate` per book item.
- `data/categorized-books.json` includes `category` for each book item.
- UI does not show `등록번호`, `반납예정일`, `반납일자`, `대출상태`.
- Uncategorized books remain visible in the side panel instead of disappearing silently.

## Exception Handling

### If the Google Sheet headers change

- Update the required header mapping in `scripts/fetch-books-data.ts`.
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
