# Hyeri Books Dashboard

혜리가 읽은 책 목록을 Google Spreadsheet에서 가져와 정적 대시보드로 보여주는 GitHub Pages 프로젝트입니다.

## Local Development

```bash
npm install
npm run dev
```

## Data Pipeline

```bash
npm run fetch-data
npm run categorize-data
npm run sync-data
```

- `fetch-data`: 공개 Google Sheet CSV를 읽어 `data/books.json`을 생성합니다.
- `categorize-data`: `data/category-mapping.json` 규칙으로 `data/categorized-books.json`을 생성합니다.
- `build`: 최신 시트 데이터를 다시 가져온 뒤 정적 사이트를 빌드합니다.

## Deployment

- GitHub Pages 배포 workflow: `.github/workflows/update-and-deploy.yml`
- 트리거:
  - `push` on `main`
  - `workflow_dispatch`
  - scheduled run at `03:17 UTC`
- 배포는 GitHub Actions가 시트 데이터를 다시 읽고 `dist/`를 Pages artifact로 업로드하는 방식입니다.

## Operational Notes

- GitHub Actions scheduled workflows run on the latest commit on the default branch.
- GitHub Actions scheduled workflows in public repositories can be disabled after 60 days without repository activity.
- Scheduled workflows should be re-enabled manually in GitHub if they stop running after inactivity.
- 브라우저가 Google Sheet를 직접 읽지 않도록 설계했습니다. 데이터 갱신은 CI 빌드 단계에서만 수행합니다.
- 새 책이 `uncategorized`로 남으면 `data/category-mapping.json`을 업데이트하거나 원본 시트에 `category` 컬럼을 추가해 보강합니다.

## Verification Snapshot

- Verified locally on March 31, 2026.
- `npm run build` succeeded after `fetch-data` and `categorize-data`.
- Latest generated dataset count: `185` books.
- Current `uncategorized` count: `20`.
- Actual GitHub Pages publication still requires pushing this repository to the remote `main` branch and enabling Pages in the repository settings.
