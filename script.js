// ポモドーロタイマーアプリケーション
class PomodoroTimer {
    constructor() {
        this.workDuration = 25 * 60; // 25分（秒）
        this.shortBreakDuration = 5 * 60; // 5分（秒）
        this.longBreakDuration = 15 * 60; // 15分（秒）
        
        this.currentTime = this.workDuration;
        this.isRunning = false;
        this.isBreak = false;
        this.completedPomodoros = 0;
        this.currentSession = 'work'; // 'work', 'shortBreak', 'longBreak'
        this.currentMode = 'planned'; // 'planned', 'unplanned'
        
        this.timer = null;
        this.tasks = [];
        this.stockTasks = [];
        this.activityLog = [];
        this.dailyStats = {
            completedPomodoros: 0,
            totalFocusTime: 0,
            completedTasks: 0,
            startTime: null,
            plannedPomodoros: 0,
            unplannedPomodoros: 0,
            plannedTime: 0,
            unplannedTime: 0
        };
        
        this.initializeElements();
        this.bindEvents();
        this.loadData();
        this.updateDisplay();
        this.updateStats();
    }

    initializeElements() {
        // タイマー要素
        this.timeDisplay = document.getElementById('time-display');
        this.timerLabel = document.getElementById('timer-label');
        this.timerCircle = document.getElementById('timer-circle');
        this.startBtn = document.getElementById('start-btn');
        this.resetBtn = document.getElementById('reset-btn');
        
        // タスク要素
        this.taskInput = document.getElementById('task-input');
        this.addTasksBtn = document.getElementById('add-tasks-btn');
        this.taskList = document.getElementById('task-list');
        
        // 仕掛けストック要素
        this.stockInput = document.getElementById('stock-input');
        this.addStockBtn = document.getElementById('add-stock-btn');
        this.stockList = document.getElementById('stock-list');
        this.moveToTodayBtn = document.getElementById('move-to-today-btn');
        
        // タスクタブ要素
        this.taskTabBtns = document.querySelectorAll('.task-tab-btn');
        this.taskTabContents = document.querySelectorAll('.task-tab-content');
        
        // 統計要素
        this.completedPomodorosDisplay = document.getElementById('completed-pomodoros');
        this.totalFocusTimeDisplay = document.getElementById('total-focus-time');
        this.completedTasksDisplay = document.getElementById('completed-tasks');
        this.activityLogDisplay = document.getElementById('activity-log');
        
        // タブ要素
        this.tabBtns = document.querySelectorAll('.tab-btn');
        this.tabContents = document.querySelectorAll('.tab-content');
    }

    bindEvents() {
        this.startBtn.addEventListener('click', () => this.toggleTimer());
        this.resetBtn.addEventListener('click', () => this.resetTimer());
        this.addTasksBtn.addEventListener('click', () => this.addTasks());
        this.taskInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                this.addTasks();
            }
        });
        
        // 仕掛けストック関連
        this.addStockBtn.addEventListener('click', () => this.addStockTasks());
        this.stockInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                this.addStockTasks();
            }
        });
        this.moveToTodayBtn.addEventListener('click', () => this.moveSelectedToToday());
        
        // タスクタブ切り替え
        this.taskTabBtns.forEach(btn => {
            btn.addEventListener('click', () => this.switchTaskTab(btn.dataset.tab));
        });
        
        // タブ切り替え
        this.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });
        
        // ページ離脱時の警告（タイマー実行中のみ）
        window.addEventListener('beforeunload', (e) => {
            if (this.isRunning) {
                e.preventDefault();
                e.returnValue = 'タイマーが実行中です。本当にページを離れますか？';
            }
        });
        
        // モード選択ボタン
        const modeBtns = document.querySelectorAll('.mode-btn');
        modeBtns.forEach(btn => {
            btn.addEventListener('click', () => this.switchMode(btn.dataset.mode));
        });
        
        // 定期的なデータ保存
        setInterval(() => this.saveData(), 30000); // 30秒ごと
        
        // リアルタイム保存（タスク追加・編集時）
        this.setupRealTimeSaving();
        
        // ミニモード・常に最前面機能を初期化
        this.setupViewModes();
    }

    toggleTimer() {
        if (this.isRunning) {
            this.pauseTimer();
        } else {
            this.startTimer();
        }
    }

    startTimer() {
        this.isRunning = true;
        this.startBtn.innerHTML = '<i class="fas fa-pause"></i> 一時停止';
        this.startBtn.classList.add('running');
        this.timerCircle.classList.add('running');
        
        if (!this.dailyStats.startTime) {
            this.dailyStats.startTime = new Date().toISOString();
        }
        
        this.timer = setInterval(() => {
            this.currentTime--;
            this.updateDisplay();
            
            if (this.currentTime <= 0) {
                this.completeSession();
            }
        }, 1000);
        
        this.logActivity(`${this.getSessionLabel()}を開始`);
    }

    pauseTimer() {
        this.isRunning = false;
        this.startBtn.innerHTML = '<i class="fas fa-play"></i> スタート';
        this.startBtn.classList.remove('running');
        this.timerCircle.classList.remove('running');
        
        clearInterval(this.timer);
        this.logActivity(`${this.getSessionLabel()}を一時停止`);
    }

    resetTimer() {
        this.pauseTimer();
        this.currentSession = 'work';
        this.currentTime = this.workDuration;
        this.updateDisplay();
        this.logActivity('タイマーをリセット');
    }

    completeSession() {
        this.pauseTimer();
        
        if (this.currentSession === 'work') {
            this.completedPomodoros++;
            this.dailyStats.completedPomodoros++;
            this.dailyStats.totalFocusTime += 25;
            
            // 4回目のポモドーロ後は長い休憩
            if (this.completedPomodoros % 4 === 0) {
                this.currentSession = 'longBreak';
                this.currentTime = this.longBreakDuration;
            } else {
                this.currentSession = 'shortBreak';
                this.currentTime = this.shortBreakDuration;
            }
            
            this.logActivity('ポモドーロ完了！お疲れ様でした');
            this.showNotification('ポモドーロ完了！', '25分間お疲れ様でした。休憩しましょう。');
        } else {
            this.currentSession = 'work';
            this.currentTime = this.workDuration;
            this.logActivity('休憩終了');
            this.showNotification('休憩終了', '次のポモドーロを始めましょう！');
        }
        
        this.updateDisplay();
        this.updateStats();
        this.saveData();
    }

    updateDisplay() {
        const minutes = Math.floor(this.currentTime / 60);
        const seconds = this.currentTime % 60;
        this.timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // セッションラベルの更新
        this.timerLabel.textContent = this.getSessionLabel();
        
        // プログレスサークルの更新
        this.updateProgressCircle();
        
        // ドキュメントタイトルの更新
        document.title = `${this.timeDisplay.textContent} - ${this.getSessionLabel()}`;
    }

    updateProgressCircle() {
        const totalDuration = this.getTotalDuration();
        const progress = ((totalDuration - this.currentTime) / totalDuration) * 360;
        
        let color = '#ff6b6b'; // 作業時間の色
        if (this.currentSession === 'shortBreak') color = '#4CAF50';
        if (this.currentSession === 'longBreak') color = '#2196F3';
        
        this.timerCircle.style.background = `conic-gradient(
            from 0deg,
            ${color} 0deg,
            ${color} ${progress}deg,
            #e0e0e0 ${progress}deg,
            #e0e0e0 360deg
        )`;
    }

    getTotalDuration() {
        switch (this.currentSession) {
            case 'work': return this.workDuration;
            case 'shortBreak': return this.shortBreakDuration;
            case 'longBreak': return this.longBreakDuration;
            default: return this.workDuration;
        }
    }

    getSessionLabel() {
        switch (this.currentSession) {
            case 'work': return '作業時間';
            case 'shortBreak': return '短い休憩';
            case 'longBreak': return '長い休憩';
            default: return '作業時間';
        }
    }

    addTasks() {
        const input = this.taskInput.value.trim();
        if (!input) return;
        
        const taskTexts = input.split('\n').filter(text => text.trim());
        
        taskTexts.forEach(taskText => {
            const task = {
                id: Date.now() + Math.random(),
                text: taskText.trim(),
                completed: false,
                createdAt: new Date().toISOString(),
                completedAt: null,
                pomodorosSpent: 0,
                editable: false
            };
            
            this.tasks.push(task);
        });
        
        this.taskInput.value = '';
        localStorage.removeItem('pomodoroTimer_draft'); // ドラフトをクリア
        this.renderTasks();
        
        // タイマー実行中かどうかで異なるメッセージ
        const statusMsg = this.isRunning ? 
            `${taskTexts.length}個のタスクを実行中に追加` : 
            `${taskTexts.length}個のタスクを追加`;
        this.logActivity(statusMsg);
        
        this.saveData();
    }

    renderTasks() {
        this.taskList.innerHTML = '';
        
        this.tasks.forEach(task => {
            const li = document.createElement('li');
            li.className = `task-item ${task.completed ? 'completed' : ''} ${task.editable ? 'editing' : ''}`;
            
            if (task.editable) {
                // 編集モード
                li.innerHTML = `
                    <input type="text" class="task-edit-input" value="${this.escapeHtml(task.text)}" 
                           onkeydown="pomodoroTimer.handleTaskEditKeydown(event, '${task.id}')"
                           onblur="pomodoroTimer.saveTaskEdit('${task.id}')"
                           autofocus>
                    <div class="task-actions">
                        <button class="task-btn save-btn" onclick="pomodoroTimer.saveTaskEdit('${task.id}')">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="task-btn cancel-btn" onclick="pomodoroTimer.cancelTaskEdit('${task.id}')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
            } else {
                // 表示モード
                li.innerHTML = `
                    <span class="task-text" ondblclick="pomodoroTimer.startTaskEdit('${task.id}')">${this.escapeHtml(task.text)}</span>
                    <div class="task-actions">
                        <button class="task-btn edit-btn" onclick="pomodoroTimer.startTaskEdit('${task.id}')" title="編集">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${!task.completed ? `<button class="task-btn complete-btn" onclick="pomodoroTimer.completeTask('${task.id}')">完了</button>` : ''}
                        <button class="task-btn delete-btn" onclick="pomodoroTimer.deleteTask('${task.id}')">削除</button>
                    </div>
                `;
            }
            
            this.taskList.appendChild(li);
        });
    }

    completeTask(taskId) {
        const task = this.tasks.find(t => t.id == taskId);
        if (task) {
            task.completed = true;
            task.completedAt = new Date().toISOString();
            this.dailyStats.completedTasks++;
            this.renderTasks();
            this.updateStats();
            this.logActivity(`タスク「${task.text}」を完了`);
            this.saveData();
        }
    }

    deleteTask(taskId) {
        this.tasks = this.tasks.filter(t => t.id != taskId);
        this.renderTasks();
        this.logActivity('タスクを削除');
        this.saveData();
    }

    // 仕掛けストック機能
    addStockTasks() {
        const input = this.stockInput.value.trim();
        if (!input) return;
        
        const taskTexts = input.split('\n').filter(text => text.trim());
        
        taskTexts.forEach(taskText => {
            const stockTask = {
                id: Date.now() + Math.random(),
                text: taskText.trim(),
                createdAt: new Date().toISOString(),
                selected: false
            };
            
            this.stockTasks.push(stockTask);
        });
        
        this.stockInput.value = '';
        localStorage.removeItem('pomodoroTimer_stockDraft'); // ストックドラフトをクリア
        this.renderStockTasks();
        
        // タイマー実行中かどうかで異なるメッセージ  
        const statusMsg = this.isRunning ? 
            `${taskTexts.length}個の仕掛けタスクを実行中にストック` : 
            `${taskTexts.length}個の仕掛けタスクをストック`;
        this.logActivity(statusMsg);
        
        this.saveData();
    }

    renderStockTasks() {
        this.stockList.innerHTML = '';
        
        this.stockTasks.forEach(task => {
            const li = document.createElement('li');
            li.className = `task-item stock-item ${task.selected ? 'selected' : ''}`;
            li.innerHTML = `
                <span class="task-text">${this.escapeHtml(task.text)}</span>
                <div class="task-actions">
                    <button class="task-btn delete-btn" onclick="pomodoroTimer.deleteStockTask('${task.id}')">削除</button>
                </div>
            `;
            
            // クリックで選択/非選択を切り替え
            li.addEventListener('click', (e) => {
                if (!e.target.classList.contains('task-btn')) {
                    this.toggleStockSelection(task.id);
                }
            });
            
            this.stockList.appendChild(li);
        });
    }

    toggleStockSelection(taskId) {
        const task = this.stockTasks.find(t => t.id == taskId);
        if (task) {
            task.selected = !task.selected;
            this.renderStockTasks();
        }
    }

    moveSelectedToToday() {
        const selectedTasks = this.stockTasks.filter(t => t.selected);
        
        if (selectedTasks.length === 0) {
            alert('移動するタスクを選択してください');
            return;
        }
        
        selectedTasks.forEach(stockTask => {
            const newTask = {
                id: Date.now() + Math.random(),
                text: stockTask.text,
                completed: false,
                createdAt: new Date().toISOString(),
                completedAt: null,
                pomodorosSpent: 0
            };
            
            this.tasks.push(newTask);
        });
        
        // 選択されたタスクをストックから削除
        this.stockTasks = this.stockTasks.filter(t => !t.selected);
        
        this.renderTasks();
        this.renderStockTasks();
        this.logActivity(`${selectedTasks.length}個のタスクを今日に移動`);
        
        // 今日のタスクタブに自動切り替え
        this.switchTaskTab('today');
        
        this.saveData();
    }

    deleteStockTask(taskId) {
        this.stockTasks = this.stockTasks.filter(t => t.id != taskId);
        this.renderStockTasks();
        this.logActivity('仕掛けタスクを削除');
        this.saveData();
    }

    switchTaskTab(tabName) {
        // タブボタンのアクティブ状態を更新
        this.taskTabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        // タブコンテンツの表示を更新
        this.taskTabContents.forEach(content => {
            const contentId = content.id.replace('-tasks', '');
            content.classList.toggle('active', contentId === tabName);
        });
    }

    // タスク編集関連メソッド
    startTaskEdit(taskId) {
        // 既存の編集中タスクがあれば保存
        this.tasks.forEach(t => {
            if (t.editable) {
                this.saveTaskEdit(t.id);
            }
        });
        
        const task = this.tasks.find(t => t.id == taskId);
        if (task && !task.completed) {
            task.editable = true;
            task.originalText = task.text; // 編集前のテキストを保存
            this.renderTasks();
            
            // フォーカスを当てる
            setTimeout(() => {
                const input = document.querySelector('.task-edit-input');
                if (input) {
                    input.focus();
                    input.select();
                }
            }, 100);
        }
    }

    handleTaskEditKeydown(event, taskId) {
        if (event.key === 'Enter') {
            this.saveTaskEdit(taskId);
        } else if (event.key === 'Escape') {
            this.cancelTaskEdit(taskId);
        }
    }

    saveTaskEdit(taskId) {
        const task = this.tasks.find(t => t.id == taskId);
        if (!task || !task.editable) return;

        const input = document.querySelector('.task-edit-input');
        if (input) {
            const newText = input.value.trim();
            if (newText && newText !== task.originalText) {
                task.text = newText;
                const statusMsg = this.isRunning ? 
                    `タスク「${newText}」を実行中に編集` : 
                    `タスク「${newText}」を編集`;
                this.logActivity(statusMsg);
            }
        }
        
        task.editable = false;
        delete task.originalText;
        this.renderTasks();
        this.saveData();
    }

    cancelTaskEdit(taskId) {
        const task = this.tasks.find(t => t.id == taskId);
        if (!task || !task.editable) return;
        
        // 元のテキストに戻す
        if (task.originalText !== undefined) {
            task.text = task.originalText;
        }
        
        task.editable = false;
        delete task.originalText;
        this.renderTasks();
    }

    // モード切替
    switchMode(mode) {
        this.currentMode = mode;
        
        // ボタンのアクティブ状態を更新
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        
        // モードインジケーターを更新
        const indicator = document.getElementById('mode-indicator');
        if (indicator) {
            indicator.textContent = mode === 'planned' ? '計画的' : 'だらだら';
        }
        
        // タイマー円の色を変更
        this.updateProgressCircle();
        
        const modeLabel = mode === 'planned' ? '計画的遂行' : '無計画遂行（だらだら）';
        const statusMsg = this.isRunning ? 
            `実行中に${modeLabel}に切替` : 
            `${modeLabel}に切替`;
        this.logActivity(statusMsg);
    }

    // リアルタイム保存設定
    setupRealTimeSaving() {
        // タスク入力欄でのリアルタイム保存準備
        let saveTimeout;
        
        const debouncedSave = () => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                this.saveData();
            }, 1000); // 1秒後に保存
        };
        
        // タスク入力欄の変更を監視（下書き保存的な機能）
        this.taskInput.addEventListener('input', () => {
            localStorage.setItem('pomodoroTimer_draft', this.taskInput.value);
        });
        
        this.stockInput.addEventListener('input', () => {
            localStorage.setItem('pomodoroTimer_stockDraft', this.stockInput.value);
        });
        
        // ドラフトの復元
        const draft = localStorage.getItem('pomodoroTimer_draft');
        if (draft) {
            this.taskInput.value = draft;
        }
        
        const stockDraft = localStorage.getItem('pomodoroTimer_stockDraft');
        if (stockDraft) {
            this.stockInput.value = stockDraft;
        }
    }

    // ビューモード設定
    setupViewModes() {
        this.isMiniMode = false;
        this.isAlwaysOnTop = false;
        this.isFullscreen = false;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };

        // ミニモード要素
        this.miniTimer = document.getElementById('mini-timer');
        this.miniTime = document.getElementById('mini-time');
        this.miniMode = document.getElementById('mini-mode');
        this.miniProgressBar = document.getElementById('mini-progress-bar');
        this.miniStartBtn = document.getElementById('mini-start-btn');
        this.miniResetBtn = document.getElementById('mini-reset-btn');
        this.miniCurrentTask = document.getElementById('mini-current-task');

        // イベントリスナー設定
        document.getElementById('mini-mode-btn').addEventListener('click', () => this.toggleMiniMode());
        document.getElementById('always-on-top-btn').addEventListener('click', () => this.toggleAlwaysOnTop());
        document.getElementById('fullscreen-btn').addEventListener('click', () => this.toggleFullscreen());
        
        document.getElementById('mini-expand-btn').addEventListener('click', () => this.toggleMiniMode());
        document.getElementById('mini-close-btn').addEventListener('click', () => this.toggleMiniMode());
        
        this.miniStartBtn.addEventListener('click', () => this.toggleTimer());
        this.miniResetBtn.addEventListener('click', () => this.resetTimer());

        // ドラッグ機能
        this.setupDragging();
        
        // キーボードショートカット
        this.setupKeyboardShortcuts();
        
        // 通知機能
        this.setupNotifications();
    }

    toggleMiniMode() {
        this.isMiniMode = !this.isMiniMode;
        const mainContainer = document.getElementById('main-container');
        const miniModeBtn = document.getElementById('mini-mode-btn');

        if (this.isMiniMode) {
            // ミニモードを有効化
            mainContainer.style.display = 'none';
            this.miniTimer.style.display = 'block';
            miniModeBtn.classList.add('active');
            
            // ミニモードの表示を同期
            this.updateMiniDisplay();
            
            // 保存された位置を復元
            const savedPosition = localStorage.getItem('miniTimerPosition');
            if (savedPosition) {
                const { top, left } = JSON.parse(savedPosition);
                this.miniTimer.style.top = top + 'px';
                this.miniTimer.style.left = left + 'px';
                this.miniTimer.style.right = 'auto';
            }
            
            this.logActivity('ミニモードを有効化');
        } else {
            // ミニモードを無効化
            mainContainer.style.display = 'block';
            this.miniTimer.style.display = 'none';
            miniModeBtn.classList.remove('active');
            
            this.logActivity('ミニモードを無効化');
        }
    }

    toggleAlwaysOnTop() {
        this.isAlwaysOnTop = !this.isAlwaysOnTop;
        const alwaysOnTopBtn = document.getElementById('always-on-top-btn');
        const body = document.body;

        if (this.isAlwaysOnTop) {
            body.classList.add('always-on-top');
            this.miniTimer.classList.add('always-on-top');
            alwaysOnTopBtn.classList.add('active');
            
            // 通知バーを表示
            this.showNotificationBar('常に最前面モードが有効になりました', 'success');
            this.logActivity('常に最前面モードを有効化');
        } else {
            body.classList.remove('always-on-top');
            this.miniTimer.classList.remove('always-on-top');
            alwaysOnTopBtn.classList.remove('active');
            
            this.showNotificationBar('常に最前面モードが無効になりました', 'info');
            this.logActivity('常に最前面モードを無効化');
        }
    }

    toggleFullscreen() {
        this.isFullscreen = !this.isFullscreen;
        const fullscreenBtn = document.getElementById('fullscreen-btn');
        const body = document.body;

        if (this.isFullscreen) {
            body.classList.add('fullscreen-mode');
            fullscreenBtn.classList.add('active');
            
            // ブラウザのフルスクリーンAPIも使用
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen();
            }
            
            this.logActivity('フルスクリーンモードを有効化');
        } else {
            body.classList.remove('fullscreen-mode');
            fullscreenBtn.classList.remove('active');
            
            // フルスクリーンを解除
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
            
            this.logActivity('フルスクリーンモードを無効化');
        }
    }

    updateMiniDisplay() {
        if (!this.isMiniMode) return;

        // 時間表示を同期
        this.miniTime.textContent = this.timeDisplay.textContent;
        
        // モード表示を同期
        const modeIndicator = document.getElementById('mode-indicator');
        if (modeIndicator) {
            this.miniMode.textContent = modeIndicator.textContent;
        }
        
        // プログレスバーを同期
        const totalDuration = this.getTotalDuration();
        const progress = ((totalDuration - this.currentTime) / totalDuration) * 100;
        this.miniProgressBar.style.width = progress + '%';
        
        // ボタン状態を同期
        if (this.isRunning) {
            this.miniStartBtn.innerHTML = '<i class="fas fa-pause"></i>';
            this.miniStartBtn.classList.add('running');
        } else {
            this.miniStartBtn.innerHTML = '<i class="fas fa-play"></i>';
            this.miniStartBtn.classList.remove('running');
        }
        
        // 現在のタスクを表示
        const currentTask = this.getCurrentActiveTask();
        this.miniCurrentTask.textContent = currentTask || 'タスクが選択されていません';
    }

    getCurrentActiveTask() {
        // 完了していない最初のタスクを取得
        const activeTask = this.tasks.find(task => !task.completed);
        return activeTask ? activeTask.text : null;
    }

    setupDragging() {
        const miniHeader = this.miniTimer.querySelector('.mini-header');
        
        miniHeader.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.miniTimer.classList.add('dragging');
            
            const rect = this.miniTimer.getBoundingClientRect();
            this.dragOffset.x = e.clientX - rect.left;
            this.dragOffset.y = e.clientY - rect.top;
            
            document.addEventListener('mousemove', this.handleDrag.bind(this));
            document.addEventListener('mouseup', this.handleDragEnd.bind(this));
            
            e.preventDefault();
        });
    }

    handleDrag(e) {
        if (!this.isDragging) return;
        
        const x = e.clientX - this.dragOffset.x;
        const y = e.clientY - this.dragOffset.y;
        
        // 画面外に出ないように制限
        const maxX = window.innerWidth - this.miniTimer.offsetWidth;
        const maxY = window.innerHeight - this.miniTimer.offsetHeight;
        
        const clampedX = Math.max(0, Math.min(x, maxX));
        const clampedY = Math.max(0, Math.min(y, maxY));
        
        this.miniTimer.style.left = clampedX + 'px';
        this.miniTimer.style.top = clampedY + 'px';
        this.miniTimer.style.right = 'auto';
    }

    handleDragEnd() {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        this.miniTimer.classList.remove('dragging');
        
        // 位置を保存
        const rect = this.miniTimer.getBoundingClientRect();
        localStorage.setItem('miniTimerPosition', JSON.stringify({
            top: rect.top,
            left: rect.left
        }));
        
        document.removeEventListener('mousemove', this.handleDrag);
        document.removeEventListener('mouseup', this.handleDragEnd);
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+M: ミニモード切り替え
            if (e.ctrlKey && e.key === 'm') {
                e.preventDefault();
                this.toggleMiniMode();
            }
            
            // Ctrl+T: 常に最前面切り替え
            if (e.ctrlKey && e.key === 't') {
                e.preventDefault();
                this.toggleAlwaysOnTop();
            }
            
            // F11: フルスクリーン切り替え
            if (e.key === 'F11') {
                e.preventDefault();
                this.toggleFullscreen();
            }
            
            // スペース: タイマー開始/停止
            if (e.code === 'Space' && !e.target.matches('input, textarea')) {
                e.preventDefault();
                this.toggleTimer();
            }
        });
    }

    setupNotifications() {
        // 通知バー要素を作成
        this.notificationBar = document.createElement('div');
        this.notificationBar.className = 'notification-bar';
        document.body.appendChild(this.notificationBar);
    }

    showNotificationBar(message, type = 'info', duration = 3000) {
        this.notificationBar.textContent = message;
        this.notificationBar.className = `notification-bar ${type} show`;
        
        setTimeout(() => {
            this.notificationBar.classList.remove('show');
        }, duration);
    }

    // 既存のupdateDisplay関数を拡張
    updateDisplay() {
        const minutes = Math.floor(this.currentTime / 60);
        const seconds = this.currentTime % 60;
        this.timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // セッションラベルの更新
        this.timerLabel.textContent = this.getSessionLabel();
        
        // プログレスサークルの更新
        this.updateProgressCircle();
        
        // ドキュメントタイトルの更新
        document.title = `${this.timeDisplay.textContent} - ${this.getSessionLabel()}`;
        
        // ミニモード表示も更新
        this.updateMiniDisplay();
    }

    logActivity(action) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            action: action
        };
        
        this.activityLog.unshift(logEntry);
        
        // ログは最新100件まで保持
        if (this.activityLog.length > 100) {
            this.activityLog = this.activityLog.slice(0, 100);
        }
        
        this.renderActivityLog();
    }

    renderActivityLog() {
        if (!this.activityLogDisplay) return;
        
        this.activityLogDisplay.innerHTML = '';
        
        this.activityLog.forEach(entry => {
            const div = document.createElement('div');
            div.className = 'log-entry';
            
            const date = new Date(entry.timestamp);
            const timeStr = date.toLocaleTimeString('ja-JP', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
            div.innerHTML = `
                <span class="log-time">${timeStr}</span>
                <span class="log-action">${this.escapeHtml(entry.action)}</span>
            `;
            
            this.activityLogDisplay.appendChild(div);
        });
    }

    updateStats() {
        if (this.completedPomodorosDisplay) {
            this.completedPomodorosDisplay.textContent = this.dailyStats.completedPomodoros;
        }
        if (this.totalFocusTimeDisplay) {
            this.totalFocusTimeDisplay.textContent = `${this.dailyStats.totalFocusTime}分`;
        }
        if (this.completedTasksDisplay) {
            this.completedTasksDisplay.textContent = this.dailyStats.completedTasks;
        }
    }

    switchTab(tabName) {
        // タブボタンのアクティブ状態を更新
        this.tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        // タブコンテンツの表示を更新
        this.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });
        
        // ダッシュボードタブの場合、チャートを描画
        if (tabName === 'dashboard') {
            setTimeout(() => this.renderDashboard(), 100);
        }
    }

    renderDashboard() {
        const canvas = document.getElementById('productivity-chart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = 150;
        
        // キャンバスをクリア
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 24時間の時計風円グラフを描画
        const totalMinutes = 24 * 60;
        const focusTime = this.dailyStats.totalFocusTime;
        const breakTime = Math.floor(focusTime * 0.2); // 休憩時間は作業時間の20%と仮定
        const otherTime = totalMinutes - focusTime - breakTime;
        
        const data = [
            { label: '集中時間', value: focusTime, color: '#ff6b6b' },
            { label: '休憩時間', value: breakTime, color: '#4CAF50' },
            { label: 'その他', value: otherTime, color: '#e0e0e0' }
        ];
        
        let currentAngle = -Math.PI / 2; // 12時方向から開始
        
        data.forEach(item => {
            const sliceAngle = (item.value / totalMinutes) * 2 * Math.PI;
            
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
            ctx.closePath();
            ctx.fillStyle = item.color;
            ctx.fill();
            
            currentAngle += sliceAngle;
        });
        
        // 時計の文字盤を描画
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.stroke();
        
        // 時間マーカーを描画
        for (let i = 0; i < 12; i++) {
            const angle = (i * Math.PI) / 6 - Math.PI / 2;
            const x1 = centerX + Math.cos(angle) * (radius - 10);
            const y1 = centerY + Math.sin(angle) * (radius - 10);
            const x2 = centerX + Math.cos(angle) * (radius - 20);
            const y2 = centerY + Math.sin(angle) * (radius - 20);
            
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            
            // 時間ラベル
            ctx.fillStyle = '#333';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const hour = i === 0 ? 12 : i;
            const labelX = centerX + Math.cos(angle) * (radius - 35);
            const labelY = centerY + Math.sin(angle) * (radius - 35);
            ctx.fillText(hour.toString(), labelX, labelY);
        }
        
        // 中央に統計情報を表示
        ctx.fillStyle = '#333';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${this.dailyStats.completedPomodoros} ポモドーロ`, centerX, centerY - 10);
        ctx.font = '12px Arial';
        ctx.fillText(`${focusTime}分集中`, centerX, centerY + 10);
    }

    showNotification(title, message) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body: message });
        } else if ('Notification' in window && Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification(title, { body: message });
                }
            });
        }
        
        // フォールバック: ブラウザアラート
        console.log(`${title}: ${message}`);
    }

    saveData() {
        const data = {
            tasks: this.tasks,
            stockTasks: this.stockTasks,
            activityLog: this.activityLog,
            dailyStats: this.dailyStats,
            currentSession: this.currentSession,
            currentTime: this.currentTime,
            completedPomodoros: this.completedPomodoros,
            lastSaved: new Date().toISOString()
        };
        
        localStorage.setItem('pomodoroTimer', JSON.stringify(data));
    }

    loadData() {
        const savedData = localStorage.getItem('pomodoroTimer');
        if (!savedData) return;
        
        try {
            const data = JSON.parse(savedData);
            
            // 日付が変わっていたら統計をリセット
            const today = new Date().toDateString();
            const savedDate = data.dailyStats.startTime ? 
                new Date(data.dailyStats.startTime).toDateString() : null;
            
            if (savedDate !== today) {
                this.dailyStats = {
                    completedPomodoros: 0,
                    totalFocusTime: 0,
                    completedTasks: 0,
                    startTime: null
                };
            } else {
                this.dailyStats = { ...this.dailyStats, ...data.dailyStats };
            }
            
            this.tasks = data.tasks || [];
            this.stockTasks = data.stockTasks || [];
            this.activityLog = data.activityLog || [];
            this.completedPomodoros = data.completedPomodoros || 0;
            
            this.renderTasks();
            this.renderStockTasks();
            this.renderActivityLog();
        } catch (error) {
            console.error('データの読み込みに失敗しました:', error);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// アプリケーションの初期化
let pomodoroTimer;

document.addEventListener('DOMContentLoaded', () => {
    pomodoroTimer = new PomodoroTimer();
    
    // 通知許可をリクエスト
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
});