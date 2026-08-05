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

## ECG image analysis（local-only）

通常動作は`local`モードです。画像の選択、切り抜き、回転、軽量化、プレビュー、医師入力はブラウザ内で行い、画像をVercel Functionや外部AIサービスへ送信しません。

```dotenv
ECG_IMAGE_ANALYSIS_MODE=local
```

検証済みローカルECGモデルは未搭載です。固定値、疑似所見、ランダム値へフォールバックせず、`LOCAL_MODEL_NOT_AVAILABLE`として医師手入力へ案内します。`/api/ecg/analyze`は移行安全策としてHTTP 410 Goneを返し、リクエスト本文や画像を読み込みません。

ONNX Runtime Webを将来のブラウザ内推論基盤として組み込み、WebGPUを優先し、非対応端末ではWASM候補を表示します。モデル本体、モデル固有の前処理、出力マッピングが検証されるまでは推論結果を生成しません。

Vercelに`OPENAI_API_KEY`、`OPENAI_ECG_MODEL`、`ECG_IMAGE_ANALYSIS_PROVIDER`が残っていても、ローカルモードでは使用されません。動作確認後、管理者がVercelから削除できます。コードから環境変数やAPIキーを自動削除しません。

## Explainable Rule Engine

本アプリはExplainable AIではなく、医師が作成・確認した条件を用いる**Explainable Rule Engine**です。将来のローカル画像解析モデルも、心拍数、P波、PR、QRS、軸、ST、T波、QT/QTcなどの所見抽出だけを担当します。診断候補、鑑別、追加確認項目、追加検査、初期対応、Red Flagは、現在のルールエンジンだけで再計算します。

各診断候補には`ECG-ST-001`のような使用Rule IDを表示します。Version 2の責務境界と完成条件は[`docs/version2-rule-engine-design.md`](docs/version2-rule-engine-design.md)、棚卸し結果は[`docs/ecg-rule-registry.md`](docs/ecg-rule-registry.md)、IF–THEN条件、必要入力、入力不足時の追加確認は[`docs/ecg-rule-catalog.md`](docs/ecg-rule-catalog.md)を参照してください。画像解析モデルへ診断、鑑別、検査、対応を生成させてはいけません。

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

ローカルモデル開発と臨床検証の要件は[`docs/local-ecg-model-roadmap.md`](docs/local-ecg-model-roadmap.md)を参照してください。

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
