# -*- coding: utf-8 -*-
import time
import threading

class PomodoroTimer:
    STATE_IDLE = "idle"
    STATE_WORK = "work"
    STATE_BREAK = "break"

    # Durations in seconds
    WORK_DURATION = 25 * 60
    BREAK_DURATION = 5 * 60

    def __init__(self):
        self.state = self.STATE_IDLE
        self.remaining_time = 0
        self.current_task = None
        self.lock = threading.Lock()
        self.last_tick_time = None

    def start_work(self, task_name):
        with self.lock:
            self.state = self.STATE_WORK
            self.remaining_time = self.WORK_DURATION
            self.current_task = task_name
            self.last_tick_time = time.time()
            print(f"[Pomodoro] Started work on: {task_name}")

    def start_break(self):
        with self.lock:
            self.state = self.STATE_BREAK
            self.remaining_time = self.BREAK_DURATION
            self.current_task = None
            self.last_tick_time = time.time()
            print("[Pomodoro] Started break.")

    def stop(self):
        with self.lock:
            self.state = self.STATE_IDLE
            self.remaining_time = 0
            self.current_task = None
            print("[Pomodoro] Timer stopped.")

    def tick(self):
        """Called periodically to update the timer."""
        with self.lock:
            if self.state == self.STATE_IDLE:
                return

            now = time.time()
            if self.last_tick_time is None:
                self.last_tick_time = now
                return

            elapsed = now - self.last_tick_time
            self.last_tick_time = now

            if self.remaining_time > 0:
                self.remaining_time -= elapsed
                if self.remaining_time <= 0:
                    self.remaining_time = 0
                    self._on_timer_complete()

    def _on_timer_complete(self):
        # This method is called inside the lock from tick()
        if self.state == self.STATE_WORK:
            print("[Pomodoro] Work finished! Starting break.")
            self.state = self.STATE_BREAK
            self.remaining_time = self.BREAK_DURATION
            # Note: We continue in the same tick cycle for the next state?
            # Or just wait for next tick?
            # It's fine to wait for next tick for accuracy, though technically we "start" now.
        elif self.state == self.STATE_BREAK:
             print("[Pomodoro] Break finished!")
             self.state = self.STATE_IDLE
             self.current_task = None

    def get_state(self):
        with self.lock:
            return {
                "state": self.state,
                "remaining_time": int(self.remaining_time),
                "task": self.current_task
            }
