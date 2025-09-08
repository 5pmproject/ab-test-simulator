This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

### GitHub Actions → Vercel 자동 배포 설정

1) Vercel에서 프로젝트 생성 후 다음 3개 값을 확인합니다 (Settings → General):
- VERCEL_ORG_ID
- VERCEL_PROJECT_ID
- VERCEL_TOKEN (Account → Tokens에서 생성)

2) GitHub 저장소 Settings → Secrets and variables → Actions에 아래 Secrets를 등록합니다:
- VERCEL_ORG_ID
- VERCEL_PROJECT_ID
- VERCEL_TOKEN

3) 브랜치 전략:
- Pull Request 또는 `main` 이외 브랜치에 push → Preview 배포
- `main` 브랜치에 push → Production 배포

본 리포지토리에는 `.github/workflows/vercel-deploy.yml` 워크플로우가 포함되어 있으며, 위 Secrets가 설정되면 자동으로 동작합니다.
