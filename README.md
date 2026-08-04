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

## ECG image analysis

実画像解析を有効にする場合は、リポジトリ直下の `.env.local` にサーバー専用の環境変数を設定します。APIキーに `NEXT_PUBLIC_` を付けないでください。

```dotenv
ECG_IMAGE_ANALYSIS_PROVIDER=openai
OPENAI_API_KEY=your-server-side-api-key
OPENAI_ECG_MODEL=gpt-5.6
```

## 限定公開PIN認証

PINと署名秘密鍵はサーバー側環境変数だけで管理します。`.env.local`またはVercelのEnvironment Variablesへ設定し、Gitには保存しないでください。

```dotenv
ECG_APP_PIN=
ECG_AUTH_SECRET=
```

- `ECG_APP_PIN`は本番では8〜12桁のランダムな数字を使用します。
- `ECG_AUTH_SECRET`は32文字以上のランダムな秘密値を使用します。
- PIN変更時はProductionを再デプロイしてください。
- PIN、署名秘密鍵、認証Cookieをログへ出力しないでください。
- 認証は30分で失効し、PINそのものはCookieへ保存されません。
- このPIN認証は管理者本人による限定公開向けです。一般公開する場合は、利用者単位の正式な認証・認可・監査を導入してください。
- 失敗回数と同時解析のメモリ制御はVercelの各サーバーレスインスタンス内に限定されます。署名Cookieでも補完しますが、Cookie削除、別ブラウザ、複数リージョンを横断する完全な分散レート制限ではありません。一般公開時はRedis等の共有ストアを使用してください。

未設定時、`POST /api/ecg/analyze` は固定結果へフォールバックせず、`ANALYSIS_NOT_CONFIGURED` を返します。実解析は公式OpenAI SDKのResponses APIとStructured Outputsを使用します。`store: false`を指定し、アップロード画像はファイルへ保存せず、解析リクエスト中だけメモリ上で扱います。

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
