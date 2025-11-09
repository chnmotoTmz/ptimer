# 🚀 GitHub リポジトリへのプッシュ手順

## ✅ 完了した作業
- [x] README.md作成
- [x] .gitignore作成
- [LICENSE作成
- [x] GitHubにリポジトリ作成: https://github.com/chnmotoTmz/ptimer

## 📋 次に実行するコマンド

PowerShellで以下のコマンドを実行してください：

```powershell
# ディレクトリに移動
cd C:\Users\motoc\ptimer

# Gitリポジトリを初期化
git init

# リモートリポジトリを追加
git remote add origin https://github.com/chnmotoTmz/ptimer.git

# すべてのファイルをステージング
git add .

# コミット
git commit -m "🎉 Initial commit: ぽもろーどタイマー完全版

- ポモドーロタイマー機能（25分作業、5分休憩）
- タスク管理機能（改行で複数追加、編集可能）
- 仕掛けストック機能
- 作業モード切替（計画的/無計画）
- 統計・ダッシュボード
- Redmine連携機能
- 開発ブログ記事9本を含む"

# GitHubにプッシュ
git branch -M main
git push -u origin main
```

## 🎯 完了後の確認

以下のURLで確認できます：
- リポジトリ: https://github.com/chnmotoTmz/ptimer
- GitHub Pages（自動デプロイ設定後）: https://chnmotoTmz.github.io/ptimer/

## 📌 GitHub Pages設定（オプション）

1. GitHubリポジトリページで「Settings」タブを開く
2. 左サイドバーの「Pages」をクリック
3. Source: `main` ブランチ / `/ (root)` を選択
4. 「Save」をクリック
5. 数分後にデモサイトが公開されます

---

**注意**: 初回プッシュ時にGitHubの認証が求められた場合は、
個人アクセストークン（PAT）を使用してください。
