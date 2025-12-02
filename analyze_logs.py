# -*- coding: utf-8 -*-

import pandas as pd
import numpy as np
import glob
from datetime import datetime, timedelta
import argparse

def format_timedelta(td):
    """
    Timedeltaオブジェクトを「H時間M分S秒」の形式にフォーマットする。
    """
    if pd.isna(td):
        return "N/A"

    total_seconds = int(td.total_seconds())
    hours, remainder = divmod(total_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)

    parts = []
    if hours > 0:
        parts.append(f"{hours}時間")
    if minutes > 0:
        parts.append(f"{minutes}分")
    if seconds > 0 or not parts:
        parts.append(f"{seconds}秒")

    return "".join(parts)

def analyze_log_file(file_path):
    """
    単一のログファイルを読み込み、滞在時間を計算して集計する。
    """
    try:
        df = pd.read_csv(file_path)
    except FileNotFoundError:
        print(f"エラー: ログファイル '{file_path}' が見つかりません。")
        return None
    except pd.errors.EmptyDataError:
        print(f"情報: ログファイル '{file_path}' は空です。")
        return None

    # タイムスタンプをdatetimeオブジェクトに変換
    df['タイムスタンプ'] = pd.to_datetime(df['タイムスタンプ'])

    # タイムスタンプでソート
    df = df.sort_values(by='タイムスタンプ').reset_index(drop=True)

    # 各行の滞在時間を計算（次の行との差分）
    df['滞在時間'] = df['タイムスタンプ'].shift(-1) - df['タイムスタンプ']

    # 最後のログの滞在時間は不明なため、ここでは0秒としておく
    # （または、平均値や固定値（例: 5秒）を設定することも可能）
    df.loc[df.index[-1], '滞在時間'] = timedelta(seconds=0)

    # アプリ名とウィンドウタイトルでグループ化し、滞在時間を合計する
    usage_summary = df.groupby(['アプリ名', 'ウィンドウタイトル'])['滞在時間'].sum().reset_index()

    # アプリごとの合計時間を計算
    app_total_usage = usage_summary.groupby('アプリ名')['滞在時間'].sum().sort_values(ascending=False)

    return usage_summary, app_total_usage

def generate_llm_prompt(df_summary):
    """
    LLMへの入力プロンプトを生成する。
    """
    if df_summary is None or df_summary.empty:
        return "分析するログデータがありません。"

    prompt = """あなたは優秀な業務アシスタントです。
以下のPC操作ログから、本日の作業内容を要約してください。

【ログデータ】
タイムスタンプ,アプリ名,ウィンドウタイトル
"""
    # 元のログデータをプロンプトに含める（ここではサマリーデータで代用）
    # 実際の活用では、元のCSVデータを貼り付けても良い
    for index, row in df_summary.iterrows():
        app = row['アプリ名']
        title = row['ウィンドウタイトル']
        duration = format_timedelta(row['滞在時間'])
        prompt += f"（滞在時間: {duration}）, {app}, {title}\n"

    prompt += """
【要約フォーマット案】
- **主な活動**: （例: 資料作成、プログラミング、情報収集など）
- **使用した主要アプリケーション**: （例: WINWORD.EXE, Code.exe, chrome.exe）
- **タスクごとの時間配分（推定）**:
  - 「○○」に関する資料作成: 約XX時間XX分
  - 「△△」機能の実装: 約XX時間XX分
  - Webでの調査: 約XX時間XX分
- **気付き・提案**: （例: 特定のアプリの使用時間が長いようです。集中して作業できています。）

上記のフォーマットを参考に、ログの内容を解釈して一日の作業サマリーを作成してください。
"""
    return prompt


def main():
    parser = argparse.ArgumentParser(description="PC操作ログを分析し、アプリケーションの使用時間を集計します。")
    parser.add_argument(
        "date",
        nargs='?',
        default=datetime.now().strftime("%Y%m%d"),
        help="分析したいログの日付をYYYYMMDD形式で指定します。（例: 20251202）"
    )
    args = parser.parse_args()

    log_file_pattern = f"log_{args.date}.csv"

    print(f"--- {args.date} のログ分析結果 ---")

    result = analyze_log_file(log_file_pattern)

    if result is None:
        return

    usage_summary, app_total_usage = result

    print("\n[アプリケーション別 合計使用時間]")
    if app_total_usage.empty:
        print("データがありません。")
    else:
        for app, total_time in app_total_usage.items():
            print(f"- {app}: {format_timedelta(total_time)}")

    print("\n[ウィンドウタイトル別 詳細]")
    if usage_summary.empty:
        print("データがありません。")
    else:
        # アプリ名でソートしてから表示
        usage_summary_sorted = usage_summary.sort_values(by=['アプリ名', '滞在時間'], ascending=[True, False])
        for index, row in usage_summary_sorted.iterrows():
            print(f"- {row['アプリ名']} - \"{row['ウィンドウタイトル']}\": {format_timedelta(row['滞在時間'])}")

    print("\n" + "="*50)
    print("【LLM要約用プロンプト】")
    print("="*50)
    llm_prompt = generate_llm_prompt(usage_summary)
    print(llm_prompt)


if __name__ == "__main__":
    main()
