# AI会社：週42投稿の定期準備 Ver.0.1

毎週日曜07:00（日本時間）に翌週42件の**空の投稿枠**を生成する実行基盤です。

## 完了した部分
- 3企画×7日×昼夜＝42枠のテンプレートを準備
- 重複・年越し・日付の自動テスト
- GitHub Actions実行コード（マージ後に定期起動）
- 既存の index.html / localStorage / 投稿データには変更を加えない
- 認証・AI API・SNSログイン情報不要

## 未実装
- AIによる投稿文の無人生成
- 過去履歴との意味的な重複確認
- 投稿管理アプリへの無人登録・SNS投稿
- 空枠のJSONは既存の投稿本文インポートには使用できない

## 手動実行とテスト
`node --test scripts/ai-company/prepare-weekly-slots.test.mjs`
`node scripts/ai-company/prepare-weekly-slots.mjs --start 2026-10-19 --out weekly-slots.json`

## 次の段階
自動本文生成の費用と接続方法を確認し、安全な保管と承認フローを追加する。
