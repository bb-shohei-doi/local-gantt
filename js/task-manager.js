/**
 * タスク管理クラス
 */
class TaskManager {
    constructor() {
        this.tasks = [];
        this.selectedRows = new Set();
        this.nextId = 1;
    }

    /**
     * 新しいテーマを作成
     */
    createTheme(name = '') {
        return {
            id: this.nextId++,
            type: 'theme',
            themeName: name,
            taskName: '',
            assignee: '',
            startDate: '',
            endDate: '',
            duration: '',
            actualStartDate: '',
            actualEndDate: '',
            progress: ''
        };
    }

    /**
     * 新しいタスクを作成
     */
    createTask(data = {}) {
        return {
            id: this.nextId++,
            type: 'task',
            themeName: '',
            taskName: data.taskName || '',
            assignee: data.assignee || '',
            startDate: data.startDate || '',
            endDate: data.endDate || '',
            duration: data.duration || '',
            actualStartDate: data.actualStartDate || '',
            actualEndDate: data.actualEndDate || '',
            progress: data.progress || '0'
        };
    }

    /**
     * テーマを追加
     */
    addTheme(name = '新しいテーマ', insertIndex = -1) {
        const theme = this.createTheme(name);
        
        if (insertIndex >= 0 && insertIndex < this.tasks.length) {
            this.tasks.splice(insertIndex, 0, theme);
        } else {
            this.tasks.push(theme);
        }
        
        return theme;
    }

    /**
     * タスクを追加
     */
    addTask(data = {}, insertIndex = -1) {
        const task = this.createTask(data);
        
        if (insertIndex >= 0 && insertIndex < this.tasks.length) {
            this.tasks.splice(insertIndex, 0, task);
        } else {
            this.tasks.push(task);
        }
        
        return task;
    }

    /**
     * タスクを削除
     */
    removeTask(id) {
        const index = this.tasks.findIndex(task => task.id === id);
        if (index >= 0) {
            this.tasks.splice(index, 1);
            this.selectedRows.delete(id);
            return true;
        }
        return false;
    }

    /**
     * 選択された行を削除
     */
    removeSelectedTasks() {
        const idsToRemove = Array.from(this.selectedRows);
        idsToRemove.forEach(id => this.removeTask(id));
        this.selectedRows.clear();
    }

    /**
     * タスクを更新
     */
    updateTask(id, field, value) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task[field] = value;
            
            // フィールドに応じて関連するフィールドを自動計算
            if (field === 'startDate' || field === 'endDate') {
                // 開始日または終了日が変更された場合、所要日数を再計算
                this.calculateDuration(task);
            } else if (field === 'duration') {
                // 所要日数が変更された場合の処理
                if (task.startDate) {
                    // 開始日がある場合は終了日を計算
                    this.calculateEndDate(task);
                } else if (task.endDate) {
                    // 終了日がある場合は開始日を計算
                    this.calculateStartDate(task);
                }
            }
            
            return true;
        }
        return false;
    }

    /**
     * 所要日数を計算
     */
    calculateDuration(task) {
        if (task.startDate && task.endDate) {
            const startDate = DateUtils.parseDate(task.startDate);
            const endDate = DateUtils.parseDate(task.endDate);
            
            if (startDate && endDate) {
                if (startDate <= endDate) {
                    const duration = holidayManager.calculateBusinessDays(startDate, endDate);
                    task.duration = duration.toString();
                } else {
                    // 開始日が終了日より後の場合はクリア
                    task.duration = '';
                }
            }
        }
    }

    /**
     * 終了日を計算
     */
    calculateEndDate(task) {
        if (task.startDate && task.duration) {
            const startDate = DateUtils.parseDate(task.startDate);
            const duration = parseInt(task.duration);
            
            if (startDate && !isNaN(duration) && duration > 0) {
                const endDate = holidayManager.addBusinessDays(startDate, duration - 1);
                task.endDate = DateUtils.formatDate(endDate);
            } else if (duration <= 0) {
                // 所要日数が0以下の場合は終了日をクリア
                task.endDate = '';
            }
        } else if (!task.startDate && task.duration) {
            // 開始日がない場合は終了日をクリア
            task.endDate = '';
        }
    }

    /**
     * 開始日を計算（終了日と所要日数から）
     */
    calculateStartDate(task) {
        if (task.endDate && task.duration) {
            const endDate = DateUtils.parseDate(task.endDate);
            const duration = parseInt(task.duration);
            
            if (endDate && !isNaN(duration) && duration > 0) {
                // 終了日から逆算して開始日を計算
                const startDate = this.calculateStartDateFromEnd(endDate, duration);
                task.startDate = DateUtils.formatDate(startDate);
            }
        }
    }

    /**
     * 終了日から開始日を逆算
     */
    calculateStartDateFromEnd(endDate, duration) {
        let currentDate = new Date(endDate);
        let remainingDays = duration - 1; // 終了日を含むため-1
        
        while (remainingDays > 0) {
            currentDate.setDate(currentDate.getDate() - 1);
            if (holidayManager.isBusinessDay(currentDate)) {
                remainingDays--;
            }
        }
        
        return currentDate;
    }

    /**
     * タスクを取得
     */
    getTask(id) {
        return this.tasks.find(task => task.id === id);
    }

    /**
     * 全タスクを取得
     */
    getAllTasks() {
        return [...this.tasks];
    }

    /**
     * 行選択を切り替え
     */
    toggleRowSelection(id) {
        if (this.selectedRows.has(id)) {
            this.selectedRows.delete(id);
        } else {
            this.selectedRows.add(id);
        }
    }

    /**
     * 選択された行のIDを取得
     */
    getSelectedRows() {
        return Array.from(this.selectedRows);
    }

    /**
     * 全選択をクリア
     */
    clearSelection() {
        this.selectedRows.clear();
    }

    /**
     * 挿入位置を計算
     */
    getInsertIndex() {
        const selectedIds = this.getSelectedRows();
        if (selectedIds.length === 0) {
            return -1; // 最後に追加
        }
        
        // 選択された行の最後の位置の次に挿入
        let maxIndex = -1;
        selectedIds.forEach(id => {
            const index = this.tasks.findIndex(task => task.id === id);
            if (index > maxIndex) {
                maxIndex = index;
            }
        });
        
        return maxIndex + 1;
    }

    /**
     * タスクを移動
     */
    moveTasks(draggedIds, targetIndex) {
        // 移動するタスクを取得
        const tasksToMove = [];
        draggedIds.forEach(id => {
            const task = this.tasks.find(t => t.id === id);
            if (task) {
                tasksToMove.push(task);
            }
        });

        // 元の位置から削除
        draggedIds.forEach(id => {
            const index = this.tasks.findIndex(t => t.id === id);
            if (index >= 0) {
                this.tasks.splice(index, 1);
            }
        });

        // 新しい位置に挿入
        tasksToMove.forEach((task, i) => {
            this.tasks.splice(targetIndex + i, 0, task);
        });
    }

    /**
     * 進捗率の妥当性をチェック
     */
    validateProgress(progress) {
        const num = parseInt(progress);
        return !isNaN(num) && num >= 0 && num <= 100;
    }

    /**
     * タスクデータをJSON形式でエクスポート
     */
    exportToJSON() {
        return JSON.stringify(this.tasks, null, 2);
    }

    /**
     * JSONデータからタスクをインポート
     */
    importFromJSON(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (Array.isArray(data)) {
                this.tasks = data;
                // IDの重複を避けるため、最大IDを更新
                let maxId = 0;
                this.tasks.forEach(task => {
                    if (task.id > maxId) {
                        maxId = task.id;
                    }
                });
                this.nextId = maxId + 1;
                this.clearSelection();
                return true;
            }
        } catch (error) {
            console.error('JSON import error:', error);
        }
        return false;
    }
}

// グローバルインスタンス
const taskManager = new TaskManager();
