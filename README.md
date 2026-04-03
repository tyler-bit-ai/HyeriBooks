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

## Wishlist API

- `읽을책` 시트의 읽기 데이터는 `scripts/fetch-books-data.ts`가 빌드 시점에 함께 가져옵니다.
- 쓰기 작업(add/edit/delete)은 GitHub Pages 정적 사이트에서 직접 Google Sheet에 쓰지 않고, [`scripts/wishlist-api.gs`](C:\Codex\Hyeri-Books\scripts\wishlist-api.gs) 형태의 Google Apps Script Web App으로 처리합니다.
- 프런트 환경변수 계획:
  - `VITE_WISHLIST_API_URL`: 배포된 Apps Script Web App `/exec` URL
  - `VITE_WISHLIST_API_TOKEN`: 선택적 shared secret. Apps Script `Script Properties`의 `WISHLIST_SHARED_SECRET`와 맞춰 사용
- 호출 규칙:
  - `GET ?action=list&token=...` : 목록 조회
  - `POST` with `text/plain` JSON body: `{ \"action\": \"create\" | \"update\" | \"delete\", ... }`
  - 커스텀 헤더 대신 body/query 기반 토큰을 사용해 브라우저 호출 단순성을 유지합니다.

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
