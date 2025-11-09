# 🍅 ぽもろーどタイマー

**Redmine連携機能付きポモドーロタイマー**

25分の集中作業と休憩を繰り返すポモドーロ・テクニックを実践するためのWebアプリケーションです。Redmineとの連携により、作業時間の自動記録が可能です。

![タイマー画面](https://via.placeholder.com/800x400?text=Pomodoro+Timer+Screenshot)

## ✨ 主要機能

### 🎯 コア機能
- **25分タイマー** - 円形プログレスバーで視覚的に残り時間を表示
- **自動休憩** - 5分の短い休憩、4セット後は15分の長い休憩
- **音声通知** - セッション完了時にブラウザ通知

### 📝 タスク管理
- **改行で複数追加** - Ctrl+Enterで素早く追加
- **実行中でも編集可能** - ダブルクリックまたは編集ボタンで即座に編集
- **仕掛けストック** - 思いついたタスクをストックして後で移動

### 📊 作業モード
- **計画的遂行モード** - 予定されたタスクに集中
- **無計画遂行モード（だらだら）** - 柔軟な作業スタイル
- **モード別統計** - 計画性の可視化

### 📈 統計・可視化
- **今日の実績** - 完了ポモドーロ数、総集中時間、完了タスク数
- **アナログ時計風ダッシュボード** - 24時間の作業分布を視覚化
- **アクティビティログ** - すべての操作履歴を記録

### 🔗 Redmine連携
- **チケット同期** - 自分のチケットを自動取得
- **自動時間記録** - ポモドーロ完了時にRedmineへ作業時間を記録
- **プロジェクトフィルタ** - 特定プロジェクトのチケットのみ表示
- **優先度別カラーリング** - チケットの優先度を色で識別

## 🎥 デモ

[GitHub Pagesでデモを見る](#) *(準備中)*

## 🛠️ セットアップ

### 必要環境
- モダンブラウザ（Chrome, Firefox, Edge, Safari）
- Redmine連携を使う場合：RedmineサーバーへのアクセスとAPIキー

### インストール

1. リポジトリをクローン
```bash
git clone https://github.com/YOUR_USERNAME/ptimer.git
cd ptimer
```

2. ブラウザでindex.htmlを開く
```bash
# Windowsの場合
start index.html

# macOS/Linuxの場合
open index.html
# または
xdg-open index.html
```

### Redmine連携の設定

1. Redmineの **個人設定 > APIアクセスキー** からAPIキーを取得
2. アプリ内の **REDMINE連携** セクションで設定
   - **REDMINE URL**: `https://your-redmine.com`
   - **API Key**: 取得したAPIキー
3. **接続テスト** で動作確認
4. **設定保存** で保存

## 📖 使い方

### 基本的な使い方

1. **タスクを追加**
   - テキストエリアにタスクを入力（改行で複数追加可能）
   - 「タスク追加」ボタンをクリック

2. **タイマーをスタート**
   - 「スタート」ボタンをクリック
   - 25分間集中して作業

3. **休憩**
   - タイマー終了後、自動的に休憩時間に切り替わり
   - 休憩後、再び作業時間に

### 高度な使い方

#### 仕掛けストック
- 作業中に思いついたタスクを「仕掛けストック」タブに追加
- 適切なタイミングで「今日のタスク」に移動

#### タスク編集
- タスクをダブルクリックまたは編集ボタンで編集
- Enter: 保存 / Esc: キャンセル

#### Redmine自動同期
- 「自動同期ON/OFF」で5分間隔の自動同期を設定
- プロジェクトフィルタで表示するチケットを絞り込み

## 🗂️ データ保存

すべてのデータはブラウザのLocalStorageに保存されます。

- タスク
- 仕掛けストック
- 統計情報
- アクティビティログ
- Redmine設定

**注意**: ブラウザのキャッシュをクリアするとデータが消失します。

## 🏗️ 技術スタック

- **HTML5** - セマンティックマークアップ
- **CSS3** - Flexbox/Grid、アニメーション
- **Vanilla JavaScript** - フレームワークなし
- **LocalStorage API** - クライアントサイドデータ保存
- **Notification API** - ブラウザ通知
- **Fetch API** - Redmine REST API連携

## 📂 ファイル構成

```
ptimer/
├── index.html              # メインHTML
├── styles.css              # スタイルシート
├── script.js               # タイマー・タスク管理ロジック
├── redmine-integration.js  # Redmine連携機能
├── blog/                   # 開発ブログ（9記事）
│   ├── 第1回_ポモドーロタイマーアプリ企画編.md
│   ├── 第2回_HTML骨格とCSSデザイン基本構造編.md
│   └── ...
└── README.md               # このファイル
```

## 🎨 カスタマイズ

### タイマー時間の変更

`script.js`の以下の部分を編集：

```javascript
this.workDuration = 25 * 60;      // 作業時間（秒）
this.shortBreakDuration = 5 * 60; // 短い休憩（秒）
this.longBreakDuration = 15 * 60; // 長い休憩（秒）
```

### カラーテーマの変更

`styles.css`のグラデーション部分を編集：

```css
body {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```

## 🤝 コントリビューション

プルリクエスト大歓迎です！

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📝 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) ファイルを参照

## 🙏 謝辞

- [Font Awesome](https://fontawesome.com/) - アイコン
- [Redmine](https://www.redmine.org/) - プロジェクト管理ツール
- ポモドーロ・テクニック by Francesco Cirillo

## 📬 コンタクト

質問や提案は [Issues](https://github.com/YOUR_USERNAME/ptimer/issues) でお願いします。

---

**Enjoy your productive Pomodoro sessions! 🍅✨**
