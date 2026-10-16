# iPhoneだけで無料AI生成を接続する手順（Ver.4.0 試作）

**現在：開発コードとテストは用意済み。Cloudflare/Geminiのアカウント接続は未実施。通常版はVer.3.8のまま。**

この作業は **アプリの運営者が最初に1回だけ** 行います。アプリの一般利用者にAPIキーやCloudflareアカウントは要求しません。

## 料金に関する重要な確認
- Cloudflare Workersの**Free**プランから開始し、Workers Paidへのアップグレードをしない。
- Google AI Studioの **Gemini APIの無料枠** を使う。必ず**課金アカウントに紐づいていない無料プロジェクト**を選ぶ。「お支払いを設定」「有料版にアップグレード」は選ばない。
- 無料利用枠とモデル提供状況は変更されることがある。APIキーのプロジェクトに**課金設定が付くと有料利用が発生する可能性**があるため、デプロイ前に無料表示を再確認する。
- Workerは認証・Turnstile・APIキー欠如時にリクエストを拒否。無料モデルだけ許可し、429では停止する。
- IP/拠点別レート制限は濫用対策の近似値であり、厳密な全利用者合計上限ではない。**無料APIキーに課金を紐づけないことが予算保護の前提。**

## 準備する4つの秘密情報（このチャットには送らない）
| GitHubの登録名 | 取得先 | 用途 |
| --- | --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflareのアカウント情報 | 操作対象の識別子 |
| `CLOUDFLARE_API_TOKEN` | Cloudflareの「Account API Tokens」→Edit Cloudflare Workers 権限（対象アカウントだけ） | GitHubからデプロイ |
| `GEMINI_API_KEY` | Google AI Studio →「API keys」→無料枠プロジェクトのキー | Geminiに安全に接続 |
| `TURNSTILE_SECRET` | Cloudflare Turnstile ウィジェットの秘密キー | Bot対策のサーバー側検証 |

Turnstileにはほかに公開用 **sitekey** がある。これは秘密情報ではなく、後から試作画面に登録する。

## iPhoneの操作順

### 1．Cloudflare Freeアカウント
[Cloudflareのダッシュボード](https://dash.cloudflare.com/) を開く。登録・サインインし、Workers & Pagesを開く。**Freeのまま進める。** 有料を選択しない。

### 2．Google AI Studioの無料Gemini APIキー
[Google AI StudioのAPIキー画面](https://aistudio.google.com/api-keys) を開き、ログイン。無料枠のプロジェクトを選択し、「Create API key」で発行する。**プロジェクトの請求先が設定されていないこと**を確認する。このキーは後のGitHub Secret入力まで安全な場所で扱い、チャットへ貼らない。

### 3．Cloudflare Turnstile（無料）
[Cloudflare Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile) を開く。新しいウィジェットを作り、対象ホスト名 **`yaccon.github.io`** を登録する。サイトキーと秘密キーを取得する。**秘密キーはチャットにも公開リポジトリにも貼らない。**

### 4．CloudflareのAPIトークン
[Cloudflare Account API Tokens](https://dash.cloudflare.com/profile/api-tokens) で「Create Token」。**Workers編集に必要な権限だけ**を付け、アカウントも今回の対象に制限する。

### 5．GitHub Actionsの秘密情報に4つ登録
[リポジトリのActions Secrets画面](https://github.com/yaccon/sns-post-manager/settings/secrets/actions) へログインして、Repository secretsの「New repository secret」を押す。上記の**4つの名前を正確に**使用して値を登録する。入力画面に貼るだけで、このチャットには値を書かない。iPhoneで「Settings」が表示されなければブラウザの「デスクトップ用Webサイトを表示」を利用する。

### 6．手動で安全にWorkerを公開
[GitHub Actions](https://github.com/yaccon/sns-post-manager/actions) で「手動公開・無料AI接続ベータ（Cloudflare）」を選び、「Run workflow」を押す。確認欄には **`DEPLOY_FREE_BETA`** と入力し実行する。

このワークフローは4つのSecretが揃っていないと停止する。まずすべてのテストを実行し、閉じたWorker（API接続がまだ無い無効状態）を用意して秘密キー2つを安全に設定。その後はじめてレート制限付きのGemini API中継を公開する。**公開処理は手動のみで、通常版のGitHub Pagesには自動デプロイしない。**

### 7．本物のAI生成をテスト
Actionsのログから `https://...workers.dev` の**公開URLだけ**を確認し、末尾に `/generate` を付ける。

[独立テスト版 Ver.4.0](https://yaccon.github.io/sns-post-manager/qa-free-ai-v40.html) を開く。画面最上部の「今日の投稿」は従来通り。無料AI生成の「運営者用：公開AI接続設定」にWorkerの公開URLとTurnstileの **公開sitekeyのみ** を入力し「接続」。安全確認に同意した後、**カイ・X通常投稿14本** を最初に生成してみる。

**テストページで投稿を登録しても、通常版Ver.3.8の投稿・履歴・参考投稿・形式設定には影響しない。** 通常版はVer.3.8のまま保持し、ベータの動作確認とバックアップ承認後に公開版へ統合する。

## 失敗時の例
- 「無料AI接続は未設定」 → Worker URL/Turnstile sitekeyの入力漏れ、またはSecrets未登録。
- 「安全確認できない」 → Cloudflare Turnstileのホスト名が `yaccon.github.io` か確認。
- 「429 / 無料上限」 → 課金せず停止。その日は利用可能な無料枠が回復してから再試行。
- 「形式が不正・途中で切れた」 → 14本生成の出力不備。投稿データは保存されない。
- iPhoneで画面が切り替わらない → 一度ページを再読み込み。既存の通常版に戻しても旧データはそのまま。

## 公式情報
- [Gemini API無料料金表](https://ai.google.dev/gemini-api/docs/pricing)
- [Google AI Studioの請求設定](https://ai.google.dev/gemini-api/docs/billing)
- [Cloudflare Workers Free](https://developers.cloudflare.com/workers/platform/pricing/)
- [Cloudflare GitHub Actions公開](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)
- [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/get-started/)
- [Cloudflare Rate Limitingの限界](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/#locality)
