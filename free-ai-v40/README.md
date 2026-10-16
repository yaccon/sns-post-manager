# Ver.4.0・無料AI投稿生成構想（接続前の技術試作）

## 目的・ビジネス方針
- 初心者向けの無料アプリ。ユーザーは外部APIキー・クレジットカード・PC不要。
- 運営者にも **自動課金が発生しない** ことを最優先。最初は少人数の日本国内・18歳以上向け試運転。多人数の無制限無料利用を保証しない。
- 収益化が見えたら、有料版を別仕様として計画。現在の無料版を勝手に有料化しない。
- 既存Ver.3.8は変更しない。失敗しても「今日の投稿」「投稿済み・履歴・参考投稿・形式設定」が使えること。

## 変更内容（ソースコード段階）
- `free-ai-v40/worker.mjs`：Cloudflare Workers Free上で、Gemini APIの無料枠モデル `gemini-3.5-flash-lite` へサーバーから接続。
- `free-ai-v40/client.js`：アプリ内の「AIで14本を生成→安全な確認画面へ」。従来の `importPosts()` を流用。**AI回答が完成しても無確認で保存しない。**
- `qa-free-ai-v40.html`：独立テスト画面（本番の4つのlocalStorageキーと別）。**Worker接続前はAI生成不可・ダミー生成不可。**
- 生成規格：カイ／後輩くん／漫画・恋愛のいずれか1アカウント、7日×昼夜＝14本。X通常・2〜5本スレッド・Premium短め長文、Threads通常500文字。
- 無料AI側では当面Premium300/800文字のみ。1500/3000文字は無料モデルの応答予算を超えやすいのでサポート外として明示。
- 42本一括生成は**未完成**。3アカウント×14本の生成を完全自動で順次行う処理は、実接続テスト後の追加予定。

## 必須の無料サービス（運営者のみ）
1. Cloudflare Workers Free（APIキーの安全な中継先）。現行無料枠の目安：1日100,000リクエスト、CPU実行制限あり。超過時はリクエスト停止。
2. Google AI StudioでGemini APIの**無料枠**プロジェクトを確認し、APIキーを発行。**必ず料金が発生しない無料枠にとどめ、有料枠・請求先アカウントを有効化しないこと。**料金制度や無料対象モデルは予告なく変わり得る。
3. Cloudflare Turnstile（無料のBot対策）。公表可能なsitekeyをアプリへ、秘密のsecretをWorkerへ登録。
4. Cloudflare Rate Limiting Binding：1接続元3回/60秒、アプリ全体12回/60秒。Bot対策と無料API枠の消耗防止。携帯回線では接続元IPが共有される場合があるので、一部の正規ユーザーにも待機をお願いする可能性がある。

### 秘密キーの保護
- GitHub Pagesの `index.html`、ブラウザの `localStorage`、GitHubコミット、ChatGPT会話にAPIキーを入れない。
- `GEMINI_API_KEY` と `TURNSTILE_SECRET` はCloudflare **Secret** にのみ設定。
- `wrangler.json` にrate-limit bindingsと公開情報のみ書く。
- Workerの `/generate` は、Origin・日本国内・18歳以上の同意・Turnstileのサーバー側検証・1分間のアクセス制限・必須Secretsがそろわない限り**Geminiに1回もアクセスしない**。
- 無料枠の429エラーで**即停止**。課金や他モデルへの自動切替、AIリトライは行わない。
- Origin制限は認証の代わりにならない。Turnstileとレート制限を必須にする。公開前に無料API枠・濫用耐性の実負荷検査を行う。

### 無料AIの利用と個人情報
- **Gemini無料枠では入力と生成文章がGoogle製品の改善、人のレビューに使用される場合がある**。個人情報・機密情報の送信を禁止し、ユーザーは明示的に同意する。
- 過去の投稿履歴・参考投稿は**AIサーバーへ送らない**。これらは端末内に置き、登録前に既存の重複検査に使う。したがって「過去投稿と題材が完全に違うこと」はAI自身には保証できず、レビューで確認する。
- 利用規約上、初期版は日本国内・18歳以上向けのみ。海外・未成年向け無料公開や広告展開は別途規約を確認する。
- 実際の投稿に使う際は文章を必ず人が確認する（実績・作品設定の捏造を防ぐ）。

## 実接続まで残っている作業
1. ユーザー自身でCloudflare Free／Google AI Studio Free／Turnstileを準備する。**秘密鍵はこのチャットに貼らない。**
2. WorkerをCloudflareへデプロイしてSecrets・Rate Limiting設定を有効化。
3. iPhone QA画面でWorkerの公開URLとTurnstile sitekeyのみ設定。
4. X通常14本→Threads14本→Xスレッド14本の順で実際に生成し、JSON取り込み・履歴重複防止・投稿保存を実機確認。
5. フリー版の使用回数表示、42本を順番に生成する仕組み、公開範囲・同意導線を仕上げ、バックアップ後にユーザーの明示許可を得て初めて通常版へ統合する。

## 今後の有料版の方向性（売上ができてから）
無料版は既存の投稿管理・1アカウント14本生成・コピーを維持し、公開後の利用規模を見て回数制限を設定。有料版は高品質モデル選択、42本の一括生成、予約投稿連携、クラウド同期などを候補とする。**現段階では有料機能を実装・課金しない。**

## 参考（2026-10-16確認）
- Gemini APIモデル： https://ai.google.dev/gemini-api/docs/models
- Geminiの無料料金： https://ai.google.dev/gemini-api/docs/pricing
- Gemini API規約： https://ai.google.dev/gemini-api/terms
- Gemini APIキーの保護： https://ai.google.dev/gemini-api/docs/api-key
- 利用可能地域： https://ai.google.dev/gemini-api/docs/available-regions
- Cloudflare Workers Free： https://developers.cloudflare.com/workers/platform/pricing/
- Workers Rate Limiting： https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
- Turnstileサーバー検証： https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
- Workers Secret： https://developers.cloudflare.com/workers/configuration/secrets/
