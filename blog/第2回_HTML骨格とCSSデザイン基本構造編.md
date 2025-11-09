# 【連載第2回】HTML骨格とCSSデザインで見た目を整えよう！～基本構造編～

## 前回のおさらい

前回は「ぽもろーどタイマー」の企画をお話ししました。
今回は、実際にコーディングスタート！まずは見た目から作っていきます。

## プロジェクト構成

```
ptimer/
├── index.html
├── styles.css
├── script.js
└── blog/（連載記事）
```

## HTMLの骨格を作成

### 基本構造

```html
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ポモドーロタイマー</title>
    <link rel="stylesheet" href="styles.css">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
</head>
```

### メイン画面の構成

3つの主要セクションで構成：

1. **タイマー表示部**（左側）
   - 円形タイマー
   - スタート/ストップボタン
   - モード選択

2. **タスク管理部**（右側）
   - タスク入力欄
   - タスク一覧

3. **統計・ログ部**（下部）
   - 今日の統計
   - ログ表示
   - ダッシュボード

## CSSで美しく

### デザインコンセプト
- **グラデーション背景**で現代的な印象
- **ガラスモーフィズム**でおしゃれ感
- **レスポンシブ対応**でスマホでも使える

### 重要なスタイリングポイント

```css
/* グラデーション背景 */
body {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* ガラスモーフィズム効果 */
section {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border-radius: 15px;
}
```

## レイアウトはGridで

```css
main {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto auto;
    gap: 20px;
}
```

## 今日のポイント

✅ **FontAwesome**を使ってアイコンをリッチに
✅ **CSS Grid**でモダンなレイアウト
✅ **backdrop-filter**でトレンドを取り入れ

## 次回予告

次回は「タイマー機能編」！
円形プログレスバーと25分カウントダウン機能を実装します。

**読了時間: 約4分**

---

**#CSS #HTML #レスポンシブデザイン #ガラスモーフィズム #Grid**

> 実際に手を動かしてコーディングしてみよう！
> 次回もお楽しみに 🎨✨