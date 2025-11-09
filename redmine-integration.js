// REDMINE連携クラス
class RedmineIntegration {
    constructor(baseUrl, apiKey) {
        this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        this.apiKey = apiKey;
        this.headers = {
            'X-Redmine-API-Key': apiKey,
            'Content-Type': 'application/json'
        };
    }

    // REDMINEへのAPIリクエスト
    async makeRequest(endpoint, options = {}) {
        try {
            const url = `${this.baseUrl}${endpoint}`;
            const response = await fetch(url, {
                ...options,
                headers: { ...this.headers, ...options.headers }
            });

            if (!response.ok) {
                throw new Error(`REDMINE API Error: ${response.status} ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('REDMINE API Request Failed:', error);
            throw error;
        }
    }

    // 自分に割り当てられたチケット一覧を取得
    async getAssignedIssues(status = 'open') {
        const params = new URLSearchParams({
            assigned_to_id: 'me',
            status_id: status,
            limit: 100
        });
        
        const response = await this.makeRequest(`/issues.json?${params}`);
        return response.issues || [];
    }

    // 特定プロジェクトのチケットを取得
    async getProjectIssues(projectId, status = 'open') {
        const params = new URLSearchParams({
            project_id: projectId,
            status_id: status,
            limit: 100
        });
        
        const response = await this.makeRequest(`/issues.json?${params}`);
        return response.issues || [];
    }

    // チケット詳細を取得
    async getIssue(issueId) {
        const response = await this.makeRequest(`/issues/${issueId}.json`);
        return response.issue;
    }

    // 作業時間を記録
    async createTimeEntry(issueId, hours, activityId = 9, comments = '') {
        const timeEntry = {
            time_entry: {
                issue_id: issueId,
                hours: hours,
                activity_id: activityId,
                comments: comments,
                spent_on: new Date().toISOString().split('T')[0] // YYYY-MM-DD
            }
        };

        return await this.makeRequest('/time_entries.json', {
            method: 'POST',
            body: JSON.stringify(timeEntry)
        });
    }

    // チケットの進捗を更新
    async updateIssue(issueId, updates) {
        const issueData = {
            issue: updates
        };

        return await this.makeRequest(`/issues/${issueId}.json`, {
            method: 'PUT',
            body: JSON.stringify(issueData)
        });
    }

    // プロジェクト一覧を取得
    async getProjects() {
        const response = await this.makeRequest('/projects.json?limit=100');
        return response.projects || [];
    }

    // チケットにコメントを追加
    async addIssueComment(issueId, notes) {
        return await this.updateIssue(issueId, { notes });
    }

    // 接続テスト
    async testConnection() {
        try {
            await this.makeRequest('/users/current.json');
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// ポモドーロタイマーにREDMINE連携機能を追加
class RedminePomodoro extends PomodoroTimer {
    constructor() {
        super();
        this.redmine = null;
        this.redmineSettings = this.loadRedmineSettings();
        this.syncInterval = null;
        
        this.setupRedmineUI();
        
        if (this.redmineSettings.baseUrl && this.redmineSettings.apiKey) {
            this.initializeRedmine();
        }
    }

    setupRedmineUI() {
        // REDMINE設定UI要素を追加
        const redmineSection = document.createElement('section');
        redmineSection.className = 'redmine-section';
        redmineSection.innerHTML = `
            <h2><i class="fas fa-link"></i> REDMINE連携</h2>
            
            <div class="redmine-config">
                <div class="config-form">
                    <input type="text" id="redmine-url" placeholder="REDMINE URL (例: https://your-redmine.com)" 
                           value="${this.redmineSettings.baseUrl || ''}">
                    <input type="password" id="redmine-api-key" placeholder="API Key" 
                           value="${this.redmineSettings.apiKey || ''}">
                    <button id="test-connection-btn" class="control-btn">
                        <i class="fas fa-plug"></i> 接続テスト
                    </button>
                    <button id="save-redmine-config-btn" class="control-btn">
                        <i class="fas fa-save"></i> 設定保存
                    </button>
                </div>
                
                <div id="connection-status" class="connection-status"></div>
            </div>

            <div class="redmine-sync" id="redmine-sync" style="display: none;">
                <div class="sync-controls">
                    <button id="sync-issues-btn" class="control-btn">
                        <i class="fas fa-sync"></i> チケット同期
                    </button>
                    <button id="auto-sync-btn" class="control-btn">
                        <i class="fas fa-clock"></i> 自動同期ON/OFF
                    </button>
                </div>
                
                <div class="project-filter">
                    <select id="project-filter">
                        <option value="">全プロジェクト</option>
                    </select>
                </div>

                <div class="sync-stats">
                    <div class="stat-item">
                        <span class="stat-label">同期済みチケット:</span>
                        <span id="synced-tickets">0</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">最終同期:</span>
                        <span id="last-sync">未実行</span>
                    </div>
                </div>
            </div>
        `;

        // メイン要素の後に追加
        document.querySelector('main').appendChild(redmineSection);

        // イベントリスナーを設定
        this.bindRedmineEvents();
    }

    bindRedmineEvents() {
        document.getElementById('test-connection-btn').addEventListener('click', () => this.testRedmineConnection());
        document.getElementById('save-redmine-config-btn').addEventListener('click', () => this.saveRedmineConfig());
        document.getElementById('sync-issues-btn').addEventListener('click', () => this.syncRedmineIssues());
        document.getElementById('auto-sync-btn').addEventListener('click', () => this.toggleAutoSync());
    }

    async testRedmineConnection() {
        const url = document.getElementById('redmine-url').value.trim();
        const apiKey = document.getElementById('redmine-api-key').value.trim();
        
        if (!url || !apiKey) {
            this.showConnectionStatus('URLとAPI Keyを入力してください', 'error');
            return;
        }

        this.showConnectionStatus('接続テスト中...', 'info');

        try {
            const testRedmine = new RedmineIntegration(url, apiKey);
            const result = await testRedmine.testConnection();
            
            if (result.success) {
                this.showConnectionStatus('接続成功！', 'success');
                return true;
            } else {
                this.showConnectionStatus(`接続失敗: ${result.error}`, 'error');
                return false;
            }
        } catch (error) {
            this.showConnectionStatus(`接続エラー: ${error.message}`, 'error');
            return false;
        }
    }

    showConnectionStatus(message, type) {
        const statusEl = document.getElementById('connection-status');
        statusEl.textContent = message;
        statusEl.className = `connection-status ${type}`;
        
        if (type === 'success') {
            setTimeout(() => {
                statusEl.textContent = '';
                statusEl.className = 'connection-status';
            }, 3000);
        }
    }

    async saveRedmineConfig() {
        const url = document.getElementById('redmine-url').value.trim();
        const apiKey = document.getElementById('redmine-api-key').value.trim();
        
        if (!url || !apiKey) {
            this.showConnectionStatus('URLとAPI Keyを入力してください', 'error');
            return;
        }

        // 接続テストを実行
        if (await this.testRedmineConnection()) {
            this.redmineSettings = { baseUrl: url, apiKey: apiKey };
            this.saveRedmineSettings();
            this.initializeRedmine();
            
            document.getElementById('redmine-sync').style.display = 'block';
            this.showConnectionStatus('設定を保存しました', 'success');
        }
    }

    initializeRedmine() {
        if (this.redmineSettings.baseUrl && this.redmineSettings.apiKey) {
            this.redmine = new RedmineIntegration(this.redmineSettings.baseUrl, this.redmineSettings.apiKey);
            document.getElementById('redmine-sync').style.display = 'block';
            this.loadProjects();
        }
    }

    async loadProjects() {
        if (!this.redmine) return;
        
        try {
            const projects = await this.redmine.getProjects();
            const projectFilter = document.getElementById('project-filter');
            
            // 既存のオプションをクリア（全プロジェクト以外）
            projectFilter.innerHTML = '<option value="">全プロジェクト</option>';
            
            projects.forEach(project => {
                const option = document.createElement('option');
                option.value = project.id;
                option.textContent = project.name;
                projectFilter.appendChild(option);
            });
        } catch (error) {
            console.error('プロジェクト取得エラー:', error);
        }
    }

    async syncRedmineIssues() {
        if (!this.redmine) {
            this.showConnectionStatus('REDMINE連携が設定されていません', 'error');
            return;
        }

        this.showConnectionStatus('チケット同期中...', 'info');

        try {
            const projectFilter = document.getElementById('project-filter');
            const projectId = projectFilter.value;
            
            let issues;
            if (projectId) {
                issues = await this.redmine.getProjectIssues(projectId);
            } else {
                issues = await this.redmine.getAssignedIssues();
            }

            // 既存のREDMINEタスクを削除
            this.tasks = this.tasks.filter(task => !task.redmineId);
            
            // REDMINEチケットをタスクとして追加
            issues.forEach(issue => {
                const task = {
                    id: `redmine_${issue.id}`,
                    text: `#${issue.id} ${issue.subject}`,
                    completed: false,
                    createdAt: new Date().toISOString(),
                    redmineId: issue.id,
                    priority: issue.priority?.name || '通常',
                    project: issue.project?.name || '',
                    estimatedTime: issue.estimated_hours || 0,
                    spentTime: 0,
                    editable: false
                };
                
                this.tasks.push(task);
            });

            this.renderTasks();
            this.updateSyncStats(issues.length);
            this.showConnectionStatus(`${issues.length}件のチケットを同期しました`, 'success');
            
            this.logActivity(`REDMINEから${issues.length}件のチケットを同期`);
            this.saveData();
            
        } catch (error) {
            this.showConnectionStatus(`同期エラー: ${error.message}`, 'error');
            console.error('REDMINE同期エラー:', error);
        }
    }

    updateSyncStats(ticketCount) {
        document.getElementById('synced-tickets').textContent = ticketCount;
        document.getElementById('last-sync').textContent = new Date().toLocaleString('ja-JP');
    }

    toggleAutoSync() {
        const btn = document.getElementById('auto-sync-btn');
        
        if (this.syncInterval) {
            // 自動同期を停止
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            btn.innerHTML = '<i class="fas fa-clock"></i> 自動同期ON';
            btn.classList.remove('active');
            this.showConnectionStatus('自動同期を停止しました', 'info');
        } else {
            // 自動同期を開始（5分間隔）
            this.syncInterval = setInterval(() => {
                this.syncRedmineIssues();
            }, 5 * 60 * 1000);
            
            btn.innerHTML = '<i class="fas fa-pause"></i> 自動同期OFF';
            btn.classList.add('active');
            this.showConnectionStatus('自動同期を開始しました（5分間隔）', 'success');
        }
    }

    // ポモドーロ完了時にREDMINEに時間を記録
    async completeSession() {
        super.completeSession();
        
        if (this.redmine && this.currentSession === 'work') {
            await this.logPomodoroToRedmine();
        }
    }

    async logPomodoroToRedmine() {
        // 現在選択中のタスクを取得（簡単な実装）
        const redmineTasks = this.tasks.filter(task => task.redmineId);
        
        if (redmineTasks.length > 0) {
            // 最初のREDMINEタスクに時間を記録（実際はUIで選択可能にする）
            const task = redmineTasks[0];
            const hours = 25 / 60; // 25分 = 0.42時間
            
            try {
                await this.redmine.createTimeEntry(
                    task.redmineId,
                    hours,
                    9, // 開発作業のアクティビティID
                    `ポモドーロ実績: 25分間の集中作業`
                );
                
                task.spentTime += 25;
                this.logActivity(`チケット#${task.redmineId}に25分の作業時間を記録`);
                
            } catch (error) {
                console.error('REDMINE時間記録エラー:', error);
                this.logActivity(`チケット#${task.redmineId}への時間記録に失敗`);
            }
        }
    }

    saveRedmineSettings() {
        localStorage.setItem('redmineSettings', JSON.stringify(this.redmineSettings));
    }

    loadRedmineSettings() {
        const saved = localStorage.getItem('redmineSettings');
        return saved ? JSON.parse(saved) : {};
    }

    // オーバーライドしてREDMINEタスクの表示を改善
    renderTasks() {
        this.taskList.innerHTML = '';
        
        this.tasks.forEach(task => {
            const li = document.createElement('li');
            li.className = `task-item ${task.completed ? 'completed' : ''} ${task.editable ? 'editing' : ''}`;
            
            // REDMINEタスクの場合は追加情報を表示
            if (task.redmineId) {
                li.classList.add('redmine-task');
                li.setAttribute('data-priority', task.priority || '通常');
            }

            if (task.editable) {
                // 編集モード（REDMINEタスクは編集不可）
                if (task.redmineId) {
                    li.innerHTML = `
                        <span class="task-text redmine-task-text">
                            <i class="fas fa-external-link-alt"></i>
                            ${this.escapeHtml(task.text)}
                            <div class="task-meta">
                                プロジェクト: ${task.project} | 優先度: ${task.priority}
                            </div>
                        </span>
                        <div class="task-actions">
                            <span class="redmine-readonly">REDMINE連携</span>
                        </div>
                    `;
                } else {
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
                }
            } else {
                // 表示モード
                if (task.redmineId) {
                    li.innerHTML = `
                        <span class="task-text redmine-task-text">
                            <i class="fas fa-external-link-alt"></i>
                            ${this.escapeHtml(task.text)}
                            <div class="task-meta">
                                プロジェクト: ${task.project} | 優先度: ${task.priority}
                                ${task.estimatedTime ? ` | 見積: ${task.estimatedTime}h` : ''}
                                ${task.spentTime ? ` | 実績: ${task.spentTime}分` : ''}
                            </div>
                        </span>
                        <div class="task-actions">
                            ${!task.completed ? `<button class="task-btn complete-btn" onclick="pomodoroTimer.completeTask('${task.id}')">完了</button>` : ''}
                        </div>
                    `;
                } else {
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
            }
            
            this.taskList.appendChild(li);
        });
    }
}

// グローバル変数を更新
let pomodoroTimer;

document.addEventListener('DOMContentLoaded', () => {
    pomodoroTimer = new RedminePomodoro();
    
    // 通知許可をリクエスト
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
});