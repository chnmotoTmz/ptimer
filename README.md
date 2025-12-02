# PC Operation Log Recording Tool

## 1. Overview

This tool automatically records user PC operations (active applications, window titles) to collect log data for later summarization by an LLM.

It runs silently in the background, creating daily log files in CSV format. An accompanying analysis script helps calculate application usage time and generate a ready-to-use prompt for an AI assistant.

## 2. Features

- **Automatic Activity Logging**: Records the active window title and application name whenever it changes.
- **Background Operation**: Runs silently in the system tray without a persistent console window.
- **System Tray Control**: A tray icon allows you to pause, resume, or exit the logger.
- **Daily Log Rotation**: Automatically creates a new `log_YYYYMMDD.csv` file each day.
- **Run on Startup**: Includes simple batch scripts to configure the logger to run automatically when Windows starts.
- **Usage Analysis**: A separate script analyzes the logs to summarize time spent per application and generate a prompt for an LLM.

## 3. File Descriptions

- `pc_activity_logger.py`: The main application that performs the background logging.
- `analyze_logs.py`: A command-line tool to analyze the generated log files.
- `requirements.txt`: A list of the required Python libraries for the project.
- `install_startup.bat`: A script to create a shortcut in the Windows startup folder, enabling the logger to run automatically on login.
- `uninstall_startup.bat`: A script to remove the shortcut from the startup folder.
- `icon.png`: The icon used for the system tray.
- `.gitignore`: Standard gitignore file for Python projects.

## 4. Installation

1.  **Prerequisites**: Ensure you have Python 3.7+ installed and added to your system's PATH.

2.  **Download Files**: Download all the files from this repository to a folder on your computer.

3.  **Install Dependencies**: Open a command prompt or PowerShell in the project folder and run the following command to install the necessary libraries:
    ```bash
    pip install -r requirements.txt
    ```

## 5. Usage

### 5.1. Starting the Logger

There are two ways to start the logger:

- **Manual Start**: To run the logger in the background, execute the following command in the project directory:
  ```bash
  pythonw.exe pc_activity_logger.py
  ```
  Using `pythonw.exe` ensures no console window will appear. You will see a new icon in your system tray.

- **Automatic Start on Login (Recommended)**:
  - Run the `install_startup.bat` script by double-clicking it.
  - This will create a shortcut in your Windows startup folder. The logger will now launch automatically every time you log in.
  - To stop this behavior, run the `uninstall_startup.bat` script.

### 5.2. Controlling the Logger

Right-click the logger icon in the system tray to access the menu:
- **Pause/Resume**: Temporarily stop or restart logging.
- **Exit**: Stop the logger and remove the icon.

### 5.3. Analyzing Your Activity

1.  Open a command prompt or PowerShell in the project folder.
2.  Run the analysis script. By default, it analyzes today's log file.
    ```bash
    python analyze_logs.py
    ```
3.  To analyze a log from a specific date, provide the date in `YYYYMMDD` format:
    ```bash
    python analyze_logs.py 20251201
    ```

The script will output:
- A summary of total time spent in each application.
- A detailed breakdown of time spent on each window title.
- A pre-formatted prompt that you can copy and paste directly into an LLM (like ChatGPT, Claude, etc.) to get a summary of your day's work.
