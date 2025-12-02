# -*- coding: utf-8 -*-

import time
import csv
import os
import psutil
from datetime import datetime
import threading
from pystray import MenuItem as item
import pystray
from PIL import Image
import pomodoro
import keyboard

# Mock win32 libraries if not available (for Linux environment testing)
try:
    import win32gui
    import win32process
except ImportError:
    win32gui = None
    win32process = None

# --- 設定 ---
CHECK_INTERVAL = 5  # アクティブウィンドウのチェック間隔（秒）
LOG_FILE_PREFIX = "log_"  # ログファイル名の接頭辞
ICON_FILE = "icon.png"  # トレイアイコンのファイル名

# ホットキー設定
HOTKEY_START_WORK = "ctrl+shift+s"
HOTKEY_START_BREAK = "ctrl+shift+b"
HOTKEY_STOP_TIMER = "ctrl+shift+x"
HOTKEY_TOGGLE_LOG = "ctrl+shift+p"
# --- 設定ここまで ---

class UnifiedLogger:
    """
    PC操作ログとポモドーロタイマーを統合したクラス。
    """

    def __init__(self):
        self.pomodoro = pomodoro.PomodoroTimer()
        self.current_log_file = self._get_log_file_path()
        self.last_window_title = None
        self._initialize_log_file()
        self.is_running = threading.Event()
        self.is_paused = threading.Event()
        self.icon = None  # To be set by setup_tray

    def _get_log_file_path(self):
        today = datetime.now().strftime("%Y%m%d")
        return f"{LOG_FILE_PREFIX}{today}.csv"

    def _initialize_log_file(self):
        # Header updated with Pomodoro State and Task Name
        if not os.path.exists(self.current_log_file):
            print(f"新しいログファイルを作成します: {self.current_log_file}")
            with open(self.current_log_file, mode='w', newline='', encoding='utf-8-sig') as f:
                writer = csv.writer(f)
                writer.writerow(["タイムスタンプ", "アプリ名", "ウィンドウタイトル", "プロセスID", "ポモドーロ状態", "タスク名"])

    def _ensure_correct_log_file(self):
        new_log_file = self._get_log_file_path()
        if new_log_file != self.current_log_file:
            print(f"日付が変更されました。ログファイルを切り替えます: {new_log_file}")
            self.current_log_file = new_log_file
            self._initialize_log_file()

    def get_active_window_info(self):
        if win32gui is None:
            return 1000, "Mock Window Title", "MockProcess.exe"

        try:
            hwnd = win32gui.GetForegroundWindow()
            if not hwnd:
                 return None, "Unknown", "Unknown"

            _, pid = win32process.GetWindowThreadProcessId(hwnd)
            window_title = win32gui.GetWindowText(hwnd)
            try:
                process = psutil.Process(pid)
                process_name = process.name()
            except psutil.NoSuchProcess:
                process_name = "Unknown"

            return pid, window_title, process_name
        except Exception as e:
            # print(f"Error getting window info: {e}") # Reduce noise
            return None, "Unknown", "Unknown"

    def log_activity(self, pid, window_title, process_name):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Get Pomodoro state
        p_state = self.pomodoro.get_state()
        state_str = p_state['state']
        task_name = p_state['task'] if p_state['task'] else ""

        with open(self.current_log_file, mode='a', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            writer.writerow([timestamp, process_name, window_title, pid, state_str, task_name])

        # Console output matches plan
        print(f"記録: [{timestamp}] {process_name} - {window_title} ({state_str}: {task_name})")

    def run(self):
        self.is_running.set()
        while self.is_running.is_set():
            # Tick the Pomodoro Timer
            self.pomodoro.tick()

            # Update tray tooltip if possible
            if self.icon:
                 p_state = self.pomodoro.get_state()
                 status = f"State: {p_state['state']}"
                 if p_state['state'] != pomodoro.PomodoroTimer.STATE_IDLE:
                     mins = p_state['remaining_time'] // 60
                     secs = p_state['remaining_time'] % 60
                     status += f" ({mins:02d}:{secs:02d})"
                 if self.is_paused.is_set():
                     status += " [LOG PAUSED]"
                 self.icon.title = status

            if self.is_paused.is_set():
                time.sleep(1) # Sleep less when paused to keep timer ticking?
                # Actually if logger is paused, should timer continue?
                # Usually yes. Logger pause only stops logging window activity.
                continue

            self._ensure_correct_log_file()
            pid, window_title, process_name = self.get_active_window_info()

            # Log if window changed OR if pomodoro state changed (maybe?)
            # Plan says "Active Window Monitoring (5 sec interval)".
            # Original code logged only when window title changes.
            # But with pomodoro, we might want to log if state changes too?
            # For now, stick to window change logic or maybe periodic logging?
            # Original: `if window_title and window_title != self.last_window_title:`
            # If I stay in same window for 25 mins, I only get one log entry at start?
            # That might be insufficient for time tracking if we rely on "duration = next_log_time - current_log_time".
            # But the original app was like that.
            # However, if Pomodoro state changes, we definitely want a log entry to mark the boundary.

            p_state = self.pomodoro.get_state()
            current_p_state = p_state['state']

            # We might need to store last pomodoro state to detect change
            if not hasattr(self, 'last_p_state'):
                self.last_p_state = current_p_state

            if (window_title and window_title != self.last_window_title) or (current_p_state != self.last_p_state):
                self.log_activity(pid, window_title, process_name)
                self.last_window_title = window_title
                self.last_p_state = current_p_state

            # We sleep for CHECK_INTERVAL, but we should probably sleep in smaller chunks to keep timer accurate?
            # No, `pomodoro.tick()` uses `time.time()` diff, so it handles long sleeps correctly.
            # But we want to call tick() frequently enough for auto-switch to happen timely.
            # 5 seconds is okay-ish. 1 second is better for UI updates.
            # Let's sleep 1 second but only log every 5 seconds?
            # Or just check window every 5 seconds.

            # Let's change loop to run every 1 second for timer accuracy,
            # but check window every CHECK_INTERVAL.

            # Actually, let's keep it simple. Sleep 1 second.
            # But checking window every 1 second might be too much CPU?
            # psutil/win32 calls are cheap.
            # Let's try 1 second interval.
            time.sleep(1)

    def stop(self):
        self.is_running.clear()
        self.pomodoro.stop()

    def toggle_pause(self):
        if self.is_paused.is_set():
            print("ログ記録を再開します。")
            self.is_paused.clear()
        else:
            print("ログ記録を一時停止します。")
            self.is_paused.set()

    # --- Hotkey Actions ---
    def start_work_action(self):
        # We need to ask for task name.
        # Since we are in a background thread or hotkey thread, `input()` might be tricky if not in console foreground.
        # But plan says "Console or Tray Tooltip" and "Hotkey: Ctrl+Shift+S".
        # Plan Phase 1 Task 1.3: "Task name input UI (input())".
        # If running as background process, input() won't work well.
        # But this is a CLI app, so maybe it runs in a visible terminal?
        # "Web app -> CLI based desktop app".
        # Assuming there is a console window.

        # Issue: input() blocks. If triggered by hotkey, it might block the hotkey thread.
        # Ideally we pop up a simple dialog or just print "Type task name:" in console.

        print("\n[Pomodoro] Enter task name in console:")
        # We need to do this carefully.
        # For Phase 1, maybe just a default name or minimal input.
        # Or launch a separate thread to handle input so we don't block.

        def ask_task():
            try:
                # This might interface with the running console
                task_name = input("Task Name > ")
                self.pomodoro.start_work(task_name)
            except Exception as e:
                print(f"Error reading input: {e}")
                self.pomodoro.start_work("Default Task")

        # Only start input thread if not already asking?
        threading.Thread(target=ask_task).start()

    def start_break_action(self):
        self.pomodoro.start_break()

    def stop_timer_action(self):
        self.pomodoro.stop()


def setup_tray(logger):
    """
    システムトレイのアイコンとメニューを設定・実行する。
    """
    try:
        image = Image.open(ICON_FILE)
    except FileNotFoundError:
        image = Image.new('RGB', (64, 64), 'black')

    def on_exit(icon, item):
        logger.stop()
        icon.stop()
        print("アプリケーションを終了します。")

    def on_toggle_pause(icon, item):
        logger.toggle_pause()

    def on_start_work(icon, item):
        logger.start_work_action()

    def on_start_break(icon, item):
        logger.start_break_action()

    menu = (
        item('Start Work', on_start_work),
        item('Start Break', on_start_break),
        item('Pause/Resume Log', on_toggle_pause),
        item('Exit', on_exit)
    )

    icon = pystray.Icon("unified_logger", image, "Unified Logger", menu)
    logger.icon = icon
    icon.run()

def setup_hotkeys(logger):
    try:
        keyboard.add_hotkey(HOTKEY_START_WORK, logger.start_work_action)
        keyboard.add_hotkey(HOTKEY_START_BREAK, logger.start_break_action)
        keyboard.add_hotkey(HOTKEY_STOP_TIMER, logger.stop_timer_action)
        keyboard.add_hotkey(HOTKEY_TOGGLE_LOG, logger.toggle_pause)
        print(f"Hotkeys registered: Work={HOTKEY_START_WORK}, Break={HOTKEY_START_BREAK}, Stop={HOTKEY_STOP_TIMER}, Log={HOTKEY_TOGGLE_LOG}")
    except ImportError:
        print("Keyboard library not installed or not working (root required on Linux). Hotkeys disabled.")
    except Exception as e:
        print(f"Failed to register hotkeys: {e}")

if __name__ == "__main__":
    logger = UnifiedLogger()

    # ロギングスレッドの開始
    logging_thread = threading.Thread(target=logger.run, daemon=True)
    logging_thread.start()

    print("Unified Logger Started.")
    print("Press Ctrl+C to exit if running in console.")

    # Hotkeys
    setup_hotkeys(logger)

    # システムトレイのUIを開始（メインスレッド）
    # Note: pystray.run() blocks.
    setup_tray(logger)
