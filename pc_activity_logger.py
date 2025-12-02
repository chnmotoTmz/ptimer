# -*- coding: utf-8 -*-

import time
import csv
import os
import psutil
import win32gui
import win32process
from datetime import datetime
import threading
from pystray import MenuItem as item
import pystray
from PIL import Image

# --- 設定 ---
CHECK_INTERVAL = 5  # アクティブウィンドウのチェック間隔（秒）
LOG_FILE_PREFIX = "log_"  # ログファイル名の接頭辞
ICON_FILE = "icon.png"  # トレイアイコンのファイル名
# --- 設定ここまで ---

class ActivityLogger:
    """
    ユーザーのPC操作（アクティブウィンドウ）を記録するクラス。
    日次でログファイルを自動的に切り替え、バックグラウンドスレッドで実行される。
    """

    def __init__(self):
        self.current_log_file = self._get_log_file_path()
        self.last_window_title = None
        self._initialize_log_file()
        self.is_running = threading.Event()
        self.is_paused = threading.Event()

    def _get_log_file_path(self):
        today = datetime.now().strftime("%Y%m%d")
        return f"{LOG_FILE_PREFIX}{today}.csv"

    def _initialize_log_file(self):
        if not os.path.exists(self.current_log_file):
            print(f"新しいログファイルを作成します: {self.current_log_file}")
            with open(self.current_log_file, mode='w', newline='', encoding='utf-8-sig') as f:
                writer = csv.writer(f)
                writer.writerow(["タイムスタンプ", "アプリ名", "ウィンドウタイトル", "プロセスID"])

    def _ensure_correct_log_file(self):
        new_log_file = self._get_log_file_path()
        if new_log_file != self.current_log_file:
            print(f"日付が変更されました。ログファイルを切り替えます: {new_log_file}")
            self.current_log_file = new_log_file
            self._initialize_log_file()

    def get_active_window_info(self):
        try:
            hwnd = win32gui.GetForegroundWindow()
            pid = win32process.GetWindowThreadProcessId(hwnd)[-1]
            window_title = win32gui.GetWindowText(hwnd)
            process_name = psutil.Process(pid).name()
            return pid, window_title, process_name
        except (psutil.NoSuchProcess, Exception):
            return None, "Unknown", "Unknown"

    def log_activity(self, pid, window_title, process_name):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with open(self.current_log_file, mode='a', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            writer.writerow([timestamp, process_name, window_title, pid])
        print(f"記録: [{timestamp}] {process_name} - {window_title}")

    def run(self):
        self.is_running.set()
        while self.is_running.is_set():
            if self.is_paused.is_set():
                time.sleep(CHECK_INTERVAL)
                continue

            self._ensure_correct_log_file()
            pid, window_title, process_name = self.get_active_window_info()
            if window_title and window_title != self.last_window_title:
                self.log_activity(pid, window_title, process_name)
                self.last_window_title = window_title

            time.sleep(CHECK_INTERVAL)

    def stop(self):
        self.is_running.clear()

    def toggle_pause(self):
        if self.is_paused.is_set():
            print("記録を再開します。")
            self.is_paused.clear()
        else:
            print("記録を一時停止します。")
            self.is_paused.set()

def setup_tray(logger):
    """
    システムトレイのアイコンとメニューを設定・実行する。
    """
    # アイコン画像の読み込み
    try:
        image = Image.open(ICON_FILE)
    except FileNotFoundError:
        print(f"エラー: アイコンファイル '{ICON_FILE}' が見つかりません。")
        # アイコンがない場合でも実行できるよう、ダミーの画像を生成
        image = Image.new('RGB', (64, 64), 'black')

    # メニューの定義
    def on_exit(icon, item):
        logger.stop()
        icon.stop()
        print("アプリケーションを終了します。")

    def on_toggle_pause(icon, item):
        logger.toggle_pause()
        # メニューテキストの更新はpystrayでは直接サポートされていない
        # 代わりにツールチップを更新するなどの方法がある
        if logger.is_paused.is_set():
            icon.title = "PC Logger (Paused)"
        else:
            icon.title = "PC Logger (Running)"


    menu = (
        item('Pause/Resume', on_toggle_pause),
        item('Exit', on_exit)
    )

    # アイコンの作成と実行
    icon = pystray.Icon("pc_activity_logger", image, "PC Activity Logger", menu)
    icon.run()


if __name__ == "__main__":
    # ロガーインスタンスの作成
    logger = ActivityLogger()

    # ロギングスレッドの開始
    logging_thread = threading.Thread(target=logger.run, daemon=True)
    logging_thread.start()

    print("PC操作の記録をバックグラウンドで開始しました。")
    print("システムトレイのアイコンから操作してください。")

    # システムトレイのUIを開始（メインスレッド）
    setup_tray(logger)
