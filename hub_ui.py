# -*- coding: utf-8 -*-
import tkinter as tk
from tkinter import ttk, messagebox, simpledialog
import threading
import time
import json
import os
import webbrowser
from jira import JIRA, JIRAError
from unified_logger import UnifiedLogger
import pandas as pd
from datetime import datetime

SETTINGS_FILE = "settings.json"

class HubUI(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Hub UI - 業務コックピット")
        self.geometry("1100x700")

        self.load_settings()
        self.logger = UnifiedLogger()
        self.logger_thread = threading.Thread(target=self.logger.run, daemon=True)
        self.logger_thread.start()

        # Initialize Jira Client
        self.jira = None

        self.create_widgets()
        self.start_log_updater()

    def load_settings(self):
        if os.path.exists(SETTINGS_FILE):
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                self.settings = json.load(f)
        else:
            self.settings = {
                "jira_url": "https://your-domain.atlassian.net",
                "jira_email": "user@example.com",
                "jira_token": "",
                "jql_queries": {
                    "My Tasks": "assignee = currentUser() AND status not in (Done, Closed)",
                },
                "mock_mode": True
            }
            self.save_settings()

    def save_settings(self):
        with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
            json.dump(self.settings, f, indent=4)

    def create_widgets(self):
        # Configure Grid
        self.grid_columnconfigure(0, weight=1) # Left: Jira
        self.grid_columnconfigure(1, weight=1) # Right: Activity
        self.grid_rowconfigure(1, weight=1) # Content

        # --- Top Bar (Controls) ---
        top_frame = ttk.Frame(self, padding=5)
        top_frame.grid(row=0, column=0, columnspan=2, sticky="ew")

        # Filters
        filter_frame = ttk.LabelFrame(top_frame, text="Filters", padding=2)
        filter_frame.pack(side="left", padx=5)

        ttk.Label(filter_frame, text="Project:").pack(side="left")
        self.project_var = tk.StringVar()
        self.project_entry = ttk.Entry(filter_frame, textvariable=self.project_var, width=10)
        self.project_entry.pack(side="left", padx=2)

        ttk.Label(filter_frame, text="Status:").pack(side="left")
        self.status_var = tk.StringVar()
        self.status_combo = ttk.Combobox(filter_frame, textvariable=self.status_var, values=["To Do", "In Progress", "Done"], width=10)
        self.status_combo.pack(side="left", padx=2)

        ttk.Button(filter_frame, text="Fetch", command=self.fetch_tickets).pack(side="left", padx=5)

        ttk.Button(top_frame, text="Settings", command=self.open_settings).pack(side="right", padx=5)

        # --- Left Column: Jira Tickets ---
        left_frame = ttk.LabelFrame(self, text="Jira Tasks", padding=5)
        left_frame.grid(row=1, column=0, sticky="nsew", padx=5, pady=5)

        # Toolbar
        toolbar = ttk.Frame(left_frame)
        toolbar.pack(fill="x", pady=2)
        ttk.Button(toolbar, text="Start Work", command=self.start_work_on_ticket).pack(side="left", padx=2)
        ttk.Button(toolbar, text="🔗 Open Jira", command=self.open_in_browser).pack(side="left", padx=2)

        # Treeview
        columns = ("key", "summary", "status", "progress_bar", "time_text")
        self.tree_jira = ttk.Treeview(left_frame, columns=columns, show="headings", selectmode="browse")
        self.tree_jira.heading("key", text="Key")
        self.tree_jira.heading("summary", text="Summary")
        self.tree_jira.heading("status", text="Status")
        self.tree_jira.heading("progress_bar", text="Progress")
        self.tree_jira.heading("time_text", text="Time")

        self.tree_jira.column("key", width=80)
        self.tree_jira.column("summary", width=200)
        self.tree_jira.column("status", width=80)
        self.tree_jira.column("progress_bar", width=100)
        self.tree_jira.column("time_text", width=60)

        self.tree_jira.pack(fill="both", expand=True)
        self.tree_jira.bind("<Double-1>", self.on_ticket_double_click)

        # Context Menu
        self.context_menu = tk.Menu(self, tearoff=0)
        self.context_menu.add_command(label="Open in Browser", command=self.open_in_browser)
        self.context_menu.add_command(label="Start Work", command=self.start_work_on_ticket)
        self.tree_jira.bind("<Button-3>", self.show_context_menu)

        # --- Right Column: Activity / Logs ---
        right_frame = ttk.LabelFrame(self, text="Activity Log & Today's Plan", padding=5)
        right_frame.grid(row=1, column=1, sticky="nsew", padx=5, pady=5)

        # Status Monitor
        self.status_label = ttk.Label(right_frame, text="Current: Idle", font=("Helvetica", 12, "bold"))
        self.status_label.pack(anchor="w", pady=5)

        # Log View
        self.log_text = tk.Text(right_frame, height=20, state="disabled", wrap="none")
        self.log_text.pack(fill="both", expand=True, pady=5)

        # Add scrollbar
        scrollbar = ttk.Scrollbar(right_frame, command=self.log_text.yview)
        scrollbar.pack(side="right", fill="y")
        self.log_text.config(yscrollcommand=scrollbar.set)

    def connect_jira(self):
        if self.settings.get("mock_mode"):
            return True

        try:
            self.jira = JIRA(
                server=self.settings["jira_url"],
                basic_auth=(self.settings["jira_email"], self.settings["jira_token"])
            )
            return True
        except Exception as e:
            messagebox.showerror("Jira Error", f"Failed to connect: {e}")
            return False

    def fetch_tickets(self):
        # Build JQL
        jql_parts = []
        project = self.project_var.get()
        status = self.status_var.get()

        if project:
            jql_parts.append(f"project = {project}")
        if status:
            jql_parts.append(f"status = \"{status}\"")

        # Default to current user if no filter
        if not jql_parts:
            jql = "assignee = currentUser() ORDER BY updated DESC"
        else:
            jql = " AND ".join(jql_parts) + " ORDER BY updated DESC"

        # Clear existing
        for item in self.tree_jira.get_children():
            self.tree_jira.delete(item)

        if self.settings.get("mock_mode"):
            # Mock Data
            mock_tickets = [
                ("PROJ-101", "Design new UI layout", "In Progress", 3600), # 1 hour est
                ("PROJ-102", "Fix login bug", "To Do", 1800), # 30 min est
                ("PROJ-103", "Write documentation", "Done", 7200), # 2 hours est
                ("PROJ-104", "Update dependency versions", "To Do", 0)
            ]
            for t in mock_tickets:
                self.tree_jira.insert("", "end", values=(t[0], t[1], t[2], "░░░░░░░░░░", "0 min"), tags=(str(t[3]),))
                # Store estimate in tags or hidden value? Tags is good for meta.
        else:
            if not self.jira and not self.connect_jira():
                return

            try:
                issues = self.jira.search_issues(jql)
                for issue in issues:
                    est = issue.fields.timeoriginalestimate or 0
                    self.tree_jira.insert("", "end", values=(issue.key, issue.fields.summary, issue.fields.status.name, "░░░░░░░░░░", "0 min"), tags=(str(est),))
            except JIRAError as e:
                messagebox.showerror("Jira Error", f"Failed to fetch tickets: {e}")

        # Update Time Spent after loading (requires parsing CSV)
        self.update_progress_from_logs()

    def update_progress_from_logs(self):
        log_file = self.logger.current_log_file
        if not os.path.exists(log_file):
            return

        try:
            df = pd.read_csv(log_file, encoding='utf-8-sig')
            if 'タスク名' in df.columns:
                df['Timestamp'] = pd.to_datetime(df['タイムスタンプ'])
                # Calculate duration per row
                df['Duration'] = df['Timestamp'].diff().shift(-1).dt.total_seconds()
                # Fill NaN with 0 or assumption (e.g. 60s)
                df['Duration'] = df['Duration'].fillna(0) # Last entry is 0 duration for now

                # Filter by Task Name
                task_durations = df.groupby('タスク名')['Duration'].sum()

                # Update Treeview
                for item in self.tree_jira.get_children():
                    vals = self.tree_jira.item(item, "values")
                    tags = self.tree_jira.item(item, "tags")
                    key = vals[0]
                    estimate = float(tags[0]) if tags and tags[0] != 'None' else 0

                    duration = 0
                    if key in task_durations:
                        duration += task_durations[key]

                    mins = int(duration // 60)
                    time_text = f"{mins} min"

                    # Qualitative Bar
                    # Assume 10 chars. 100% = 10 blocks.
                    # If estimate is 0, we can't show %. Just show duration.
                    bar = ""
                    if estimate > 0:
                        percent = min(duration / estimate, 1.0)
                        filled = int(percent * 10)
                        bar = "█" * filled + "░" * (10 - filled)
                    else:
                        # No estimate: Show activity indicator if duration > 0
                        if duration > 0:
                            bar = "▒▒▒▒▒▒▒▒▒▒" # Indicates working but unknown progress
                        else:
                            bar = "░░░░░░░░░░"

                    # Update row
                    self.tree_jira.item(item, values=(key, vals[1], vals[2], bar, time_text))

        except Exception as e:
            # print(f"Error calculating progress: {e}")
            pass

    def on_ticket_double_click(self, event):
        self.start_work_on_ticket()

    def show_context_menu(self, event):
        item = self.tree_jira.identify_row(event.y)
        if item:
            self.tree_jira.selection_set(item)
            self.context_menu.post(event.x_root, event.y_root)

    def open_in_browser(self):
        selected = self.tree_jira.selection()
        if not selected: return
        key = self.tree_jira.item(selected[0], "values")[0]
        url = f"{self.settings['jira_url']}/browse/{key}"
        webbrowser.open(url)

    def start_work_on_ticket(self):
        selected = self.tree_jira.selection()
        if not selected: return
        key = self.tree_jira.item(selected[0], "values")[0]
        summary = self.tree_jira.item(selected[0], "values")[1]

        # Start in Logger
        # We use the key as the "Task Name" for easy tracking
        self.logger.pomodoro.start_work(f"{key}")
        self.status_label.config(text=f"Current: Working on {key}")

    def start_log_updater(self):
        self.update_log_view()
        self.after(5000, self.start_log_updater) # Update every 5 seconds

    def update_log_view(self):
        log_file = self.logger.current_log_file
        if not os.path.exists(log_file):
            return

        # Read last N lines
        try:
            with open(log_file, "r", encoding="utf-8-sig") as f:
                lines = f.readlines()
                last_lines = lines[-20:] # Show last 20

            self.log_text.config(state="normal")
            self.log_text.delete("1.0", "end")
            for line in last_lines:
                self.log_text.insert("end", line)
            self.log_text.config(state="disabled")
            self.log_text.see("end")

            # Also update status label from logger state
            p_state = self.logger.pomodoro.get_state()
            task = p_state['task'] if p_state['task'] else "Idle"
            state = p_state['state']

            # Update status text
            status_text = f"Current: {state.upper()} - {task}"
            if state != "idle":
                 mins = p_state['remaining_time'] // 60
                 secs = p_state['remaining_time'] % 60
                 status_text += f" ({mins:02d}:{secs:02d})"

            self.status_label.config(text=status_text)

            # Also trigger progress update
            self.update_progress_from_logs()

        except Exception as e:
            # print(f"Log update error: {e}")
            pass

    def open_settings(self):
        # Simple settings dialog
        win = tk.Toplevel(self)
        win.title("Settings")

        ttk.Label(win, text="Jira URL:").grid(row=0, column=0)
        url_entry = ttk.Entry(win, width=40)
        url_entry.insert(0, self.settings["jira_url"])
        url_entry.grid(row=0, column=1)

        ttk.Label(win, text="Email:").grid(row=1, column=0)
        email_entry = ttk.Entry(win, width=40)
        email_entry.insert(0, self.settings["jira_email"])
        email_entry.grid(row=1, column=1)

        ttk.Label(win, text="API Token:").grid(row=2, column=0)
        token_entry = ttk.Entry(win, width=40, show="*")
        token_entry.insert(0, self.settings["jira_token"])
        token_entry.grid(row=2, column=1)

        ttk.Label(win, text="Mock Mode:").grid(row=3, column=0)
        mock_var = tk.BooleanVar(value=self.settings["mock_mode"])
        ttk.Checkbutton(win, variable=mock_var).grid(row=3, column=1, sticky="w")

        def save():
            self.settings["jira_url"] = url_entry.get()
            self.settings["jira_email"] = email_entry.get()
            self.settings["jira_token"] = token_entry.get()
            self.settings["mock_mode"] = mock_var.get()
            self.save_settings()
            win.destroy()

        ttk.Button(win, text="Save", command=save).grid(row=4, column=0, columnspan=2)

if __name__ == "__main__":
    app = HubUI()
    app.protocol("WM_DELETE_WINDOW", lambda: (app.logger.stop(), app.destroy()))
    app.mainloop()
