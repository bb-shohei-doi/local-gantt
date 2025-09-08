/**
 * メインアプリケーションクラス
 */
class GanttApp {
    constructor() {
        this.isInitialized = false;
        this.updateTimeout = null;
        this.isInputting = false;
        this.currentFocusField = null;
        this.pendingUpdate = false;
        this.init();
    }

    /**
     * アプリケーション初期化
     */
    async init() {
        // 祝日データの読み込み完了を待つ
        await this.waitForHolidayData();
        
        this.setupEventListeners();
        this.initializeDefaultData();
        this.render();
        this.setupScrollSync();
        this.setupTouchEvents();
        
        this.isInitialized = true;
        console.log('ガントチャートアプリケーションが初期化されました');
    }

    /**
     * 祝日データの読み込み完了を待つ
     */
    async waitForHolidayData() {
        let attempts = 0;
        const maxAttempts = 50; // 5秒間待機
        
        while (attempts < maxAttempts) {
            if (holidayManager.holidays.size > 0) {
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
    }

    /**
     * イベントリスナーを設定
     */
    setupEventListeners() {
        // ボタンイベント
        document.getElementById('add-theme-btn').addEventListener('click', () => {
            this.addTheme();
        });

        document.getElementById('add-task-btn').addEventListener('click', () => {
            this.addTask();
        });

        document.getElementById('delete-row-btn').addEventListener('click', () => {
            this.deleteSelectedRows();
        });

        // テーブル内の変更イベント（イベント委譲）
        document.getElementById('task-tbody').addEventListener('input', (e) => {
            this.handleInputChange(e);
        });

        document.getElementById('task-tbody').addEventListener('change', (e) => {
            this.handleInputChange(e);
        });

        // キーダウンイベント（Enterキーでフォーカス移動）
        document.getElementById('task-tbody').addEventListener('keydown', (e) => {
            this.handleTableKeyDown(e);
        });

        // フォーカスイベント（入力中の状態管理）
        document.getElementById('task-tbody').addEventListener('focusin', (e) => {
            if (e.target.classList.contains('task-input')) {
                this.currentFocusField = e.target;
                this.isInputting = true;
            }
        });

        document.getElementById('task-tbody').addEventListener('focusout', (e) => {
            if (e.target.classList.contains('task-input')) {
                this.currentFocusField = null;
                this.isInputting = false;
                // フォーカスアウト時に即座に更新
                this.forceUpdateChart();
            }
        });

        // チェックボックスイベント
        document.getElementById('task-tbody').addEventListener('click', (e) => {
            if (e.target.type === 'checkbox' && e.target.classList.contains('row-checkbox')) {
                this.handleRowSelection(e);
            } else {
                // タスク行のクリック処理
                this.handleTaskRowClick(e);
            }
        });

        // キーボードショートカット
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // ウィンドウリサイズ
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    /**
     * 初期データを設定
     */
    initializeDefaultData() {
        // ローカルストレージにデータがある場合はサンプルデータを読み込まない
        const saved = localStorage.getItem('ganttTasks');
        if (saved) {
            return; // ローカルストレージのデータがある場合は何もしない
        }
        
        // サンプルデータを追加
        taskManager.addTheme('プロジェクト A');
        taskManager.addTask({
            taskName: '要件定義',
            assignee: '田中',
            startDate: '2025/08/20',
            endDate: '2025/08/25',
            progress: '50'
        });
        taskManager.addTask({
            taskName: '基本設計',
            assignee: '佐藤',
            startDate: '2025/08/26',
            endDate: '2025/09/05',
            progress: '0'
        });

        taskManager.addTheme('プロジェクト B');
        taskManager.addTask({
            taskName: '調査・分析',
            assignee: '鈴木',
            startDate: '2025/08/22',
            endDate: '2025/08/28',
            actualStartDate: '2025/08/22',
            actualEndDate: '2025/08/27',
            progress: '100'
        });
    }

    /**
     * 画面を描画
     */
    render() {
        this.renderTaskTable();
        this.renderGanttChart();
    }

    /**
     * タスクテーブルを描画
     */
    renderTaskTable() {
        const tbody = document.getElementById('task-tbody');
        tbody.innerHTML = '';

        const tasks = taskManager.getAllTasks();
        const selectedRows = taskManager.getSelectedRows();

        tasks.forEach(task => {
            const row = this.createTaskRow(task, selectedRows.includes(task.id));
            tbody.appendChild(row);
        });
    }

    /**
     * タスク行を作成
     */
    createTaskRow(task, isSelected) {
        const row = document.createElement('tr');
        row.className = task.type === 'theme' ? 'theme-row' : 'task-row';
        if (isSelected) {
            row.classList.add('selected');
        }
        row.dataset.taskId = task.id;

        // チェックボックス
        const checkCell = document.createElement('td');
        checkCell.innerHTML = `<input type="checkbox" class="row-checkbox" ${isSelected ? 'checked' : ''}>`;
        row.appendChild(checkCell);

        // ドラッグハンドル
        dragDropManager.addDragHandle(row);

        if (task.type === 'theme') {
            // テーマ行
            const themeCell = document.createElement('td');
            themeCell.setAttribute('colspan', '8');
            themeCell.innerHTML = `<input type="text" class="theme-input task-input" value="${task.themeName}" data-field="themeName">`;
            row.appendChild(themeCell);

        } else {
            // タスク行
            const fields = [
                { field: 'taskName', type: 'text' },
                { field: 'assignee', type: 'text' },
                { field: 'startDate', type: 'date' },
                { field: 'endDate', type: 'date' },
                { field: 'duration', type: 'number' },
                { field: 'actualStartDate', type: 'date' },
                { field: 'actualEndDate', type: 'date' },
                { field: 'progress', type: 'number', min: 0, max: 100 }
            ];

            fields.forEach(fieldInfo => {
                const cell = document.createElement('td');
                const input = document.createElement('input');
                input.type = fieldInfo.type === 'date' ? 'text' : fieldInfo.type;
                input.className = 'task-input';
                
                // 日付フィールドに特別なクラスを追加
                if (fieldInfo.type === 'date') {
                    input.classList.add('date-input');
                }
                
                input.value = this.formatFieldValue(task[fieldInfo.field], fieldInfo.type);
                input.dataset.field = fieldInfo.field;
                
                if (fieldInfo.min !== undefined) input.min = fieldInfo.min;
                if (fieldInfo.max !== undefined) input.max = fieldInfo.max;
                
                // 日付フィールドにプレースホルダーを追加
                if (fieldInfo.type === 'date') {
                    input.placeholder = 'YYYY/MM/DD';
                }

                cell.appendChild(input);
                row.appendChild(cell);
            });
        }

        return row;
    }

    /**
     * フィールド値をフォーマット
     */
    formatFieldValue(value, type) {
        if (type === 'date' && value) {
            const date = DateUtils.parseDate(value);
            return date ? DateUtils.formatDate(date) : value;
        }
        return value || '';
    }

    /**
     * ガントチャートを描画
     */
    renderGanttChart() {
        const tasks = taskManager.getAllTasks();
        ganttChart.render(tasks);
        
        // 描画後にスクロール同期を確実に設定
        setTimeout(() => {
            ganttChart.syncScroll();
        }, 10);
    }

    /**
     * テーマを追加
     */
    addTheme() {
        const insertIndex = taskManager.getInsertIndex();
        taskManager.addTheme('新しいテーマ', insertIndex);
        this.render();
    }

    /**
     * タスクを追加
     */
    addTask() {
        const insertIndex = taskManager.getInsertIndex();
        taskManager.addTask({
            taskName: '新しいタスク',
            startDate: DateUtils.getTodayString()
        }, insertIndex);
        this.render();
    }

    /**
     * 選択された行を削除
     */
    deleteSelectedRows() {
        const selectedRows = taskManager.getSelectedRows();
        
        if (selectedRows.length === 0) {
            // 選択された行がない場合は、現在フォーカスされている要素の行を削除
            const activeElement = document.activeElement;
            if (activeElement && activeElement.closest('tr')) {
                const activeRow = activeElement.closest('tr');
                if (activeRow && activeRow.classList.contains('task-row')) {
                    const taskId = parseInt(activeRow.dataset.taskId);
                    if (!isNaN(taskId)) {
                        if (confirm('現在フォーカスされている行を削除しますか？')) {
                            taskManager.removeTask(taskId);
                            this.render();
                        }
                        return;
                    }
                }
            }
            alert('削除する行を選択してください。');
            return;
        }

        if (confirm(`${selectedRows.length}行を削除しますか？`)) {
            taskManager.removeSelectedTasks();
            this.render();
        }
    }

    /**
     * テーブル内のキーダウンイベント処理
     */
    handleTableKeyDown(e) {
        if ((e.key === 'Enter' || e.key === 'Tab') && e.target.classList.contains('task-input')) {
            e.preventDefault();
            if (e.shiftKey && e.key === 'Tab') {
                // Shift+Tabで前のフィールドに移動
                this.moveToPreviousInput(e.target);
            } else {
                // EnterまたはTabで次のフィールドに移動
                this.moveToNextInput(e.target);
            }
        }
    }

    /**
     * 次の入力フィールドにフォーカスを移動
     */
    moveToNextInput(currentInput) {
        const currentRow = currentInput.closest('tr');
        const currentRowInputs = Array.from(currentRow.querySelectorAll('.task-input'));
        const currentIndex = currentRowInputs.indexOf(currentInput);
        
        if (currentIndex >= 0 && currentIndex < currentRowInputs.length - 1) {
            // 同じ行の次の入力フィールドにフォーカス
            const nextInput = currentRowInputs[currentIndex + 1];
            nextInput.focus();
            nextInput.select();
        } else {
            // 行の最後のフィールドの場合は、次の行の最初のフィールドに移動
            const allRows = Array.from(document.querySelectorAll('#task-tbody tr'));
            const currentRowIndex = allRows.indexOf(currentRow);
            
            if (currentRowIndex >= 0 && currentRowIndex < allRows.length - 1) {
                // 次の行の最初の入力フィールドを探す
                const nextRow = allRows[currentRowIndex + 1];
                const nextRowFirstInput = nextRow.querySelector('.task-input');
                
                if (nextRowFirstInput) {
                    nextRowFirstInput.focus();
                    nextRowFirstInput.select();
                }
            } else {
                // 最後の行の場合は、最初の行の最初のフィールドに戻る
                const firstRow = allRows[0];
                if (firstRow) {
                    const firstInput = firstRow.querySelector('.task-input');
                    if (firstInput) {
                        firstInput.focus();
                        firstInput.select();
                    }
                }
            }
        }
    }

    /**
     * 前の入力フィールドにフォーカスを移動
     */
    moveToPreviousInput(currentInput) {
        const currentRow = currentInput.closest('tr');
        const currentRowInputs = Array.from(currentRow.querySelectorAll('.task-input'));
        const currentIndex = currentRowInputs.indexOf(currentInput);
        
        if (currentIndex > 0) {
            // 同じ行の前の入力フィールドにフォーカス
            const prevInput = currentRowInputs[currentIndex - 1];
            prevInput.focus();
            prevInput.select();
        } else {
            // 行の最初のフィールドの場合は、前の行の最後のフィールドに移動
            const allRows = Array.from(document.querySelectorAll('#task-tbody tr'));
            const currentRowIndex = allRows.indexOf(currentRow);
            
            if (currentRowIndex > 0) {
                // 前の行の最後の入力フィールドを探す
                const prevRow = allRows[currentRowIndex - 1];
                const prevRowInputs = Array.from(prevRow.querySelectorAll('.task-input'));
                
                if (prevRowInputs.length > 0) {
                    const lastInput = prevRowInputs[prevRowInputs.length - 1];
                    lastInput.focus();
                    lastInput.select();
                }
            } else {
                // 最初の行の場合は、最後の行の最後のフィールドに移動
                const lastRowIndex = allRows.length - 1;
                if (lastRowIndex >= 0) {
                    const lastRow = allRows[lastRowIndex];
                    const lastRowInputs = Array.from(lastRow.querySelectorAll('.task-input'));
                    
                    if (lastRowInputs.length > 0) {
                        const lastInput = lastRowInputs[lastRowInputs.length - 1];
                        lastInput.focus();
                        lastInput.select();
                    }
                }
            }
        }
    }

    /**
     * 入力変更を処理
     */
    handleInputChange(e) {
        const input = e.target;
        if (!input.classList.contains('task-input')) return;

        const row = input.closest('tr');
        const taskId = parseInt(row.dataset.taskId);
        const field = input.dataset.field;
        let value = input.value;

        // 日付フィールドの妥当性チェック
        if (field.includes('Date') && value && !DateUtils.isValidDateString(value)) {
            input.classList.add('error');
            // 日付が不完全な場合は更新をスキップ
            return;
        } else {
            input.classList.remove('error');
        }

        // 進捗率の妥当性チェック
        if (field === 'progress' && value && !taskManager.validateProgress(value)) {
            input.classList.add('error');
            return;
        } else if (field === 'progress') {
            input.classList.remove('error');
        }

        // 所要日数の妥当性チェック
        if (field === 'duration' && value && !this.validateDuration(value)) {
            input.classList.add('error');
            return;
        } else if (field === 'duration') {
            input.classList.remove('error');
        }

        // タスクを更新
        taskManager.updateTask(taskId, field, value);
        
        // 計算フィールドの更新（即座に反映）
        if (field === 'startDate' || field === 'endDate') {
            this.updateDurationField(taskId);
        } else if (field === 'duration') {
            this.updateEndDateField(taskId);
            this.updateStartDateField(taskId);
        }
        
        // 入力中の場合は更新を遅延、そうでない場合は即座に更新
        if (this.isInputting && field.includes('Date')) {
            // 日付入力中は更新を大幅に遅延
            this.scheduleDelayedUpdate(1000);
        } else if (this.isInputting) {
            // その他の入力中は短い遅延
            this.scheduleDelayedUpdate(500);
        } else {
            // フォーカスアウト後などは即座に更新
            this.forceUpdateChart();
        }
    }

    /**
     * 遅延更新をスケジュール
     */
    scheduleDelayedUpdate(delay = 500) {
        clearTimeout(this.updateTimeout);
        this.pendingUpdate = true;
        
        this.updateTimeout = setTimeout(() => {
            if (this.pendingUpdate) {
                this.renderGanttChart();
                this.pendingUpdate = false;
            }
        }, delay);
    }

    /**
     * ガントチャートを強制的に更新
     */
    forceUpdateChart() {
        clearTimeout(this.updateTimeout);
        this.renderGanttChart();
        this.pendingUpdate = false;
    }

    /**
     * 所要日数フィールドを更新
     */
    updateDurationField(taskId) {
        const task = taskManager.getTask(taskId);
        if (task) {
            const row = document.querySelector(`tr[data-task-id="${taskId}"]`);
            const durationInput = row.querySelector('input[data-field="duration"]');
            if (durationInput) {
                durationInput.value = task.duration;
                this.highlightCalculatedField(durationInput);
            }
        }
    }

    /**
     * 終了日フィールドを更新
     */
    updateEndDateField(taskId) {
        const task = taskManager.getTask(taskId);
        if (task) {
            const row = document.querySelector(`tr[data-task-id="${taskId}"]`);
            const endDateInput = row.querySelector('input[data-field="endDate"]');
            if (endDateInput) {
                endDateInput.value = task.endDate;
                this.highlightCalculatedField(endDateInput);
            }
        }
    }

    /**
     * 開始日フィールドを更新
     */
    updateStartDateField(taskId) {
        const task = taskManager.getTask(taskId);
        if (task) {
            const row = document.querySelector(`tr[data-task-id="${taskId}"]`);
            const startDateInput = row.querySelector('input[data-field="startDate"]');
            if (startDateInput) {
                startDateInput.value = task.startDate;
                this.highlightCalculatedField(startDateInput);
            }
        }
    }

    /**
     * 計算されたフィールドをハイライト
     */
    highlightCalculatedField(input) {
        if (input) {
            input.classList.add('calculated-field');
            setTimeout(() => {
                input.classList.remove('calculated-field');
            }, 1000);
        }
    }

    /**
     * 所要日数の妥当性をチェック
     */
    validateDuration(duration) {
        const num = parseInt(duration);
        return !isNaN(num) && num > 0 && num <= 9999; // 1日以上、9999日以下
    }

    /**
     * 行選択を処理
     */
    handleRowSelection(e) {
        const row = e.target.closest('tr');
        const taskId = parseInt(row.dataset.taskId);
        
        taskManager.toggleRowSelection(taskId);
        
        if (e.target.checked) {
            row.classList.add('selected');
        } else {
            row.classList.remove('selected');
        }
    }

    /**
     * タスク行クリックを処理
     */
    handleTaskRowClick(e) {
        // 入力フィールドやドラッグハンドル、チェックボックスのクリックは除外
        if (e.target.matches('input, .drag-handle, .drag-handle *')) {
            return;
        }

        const row = e.target.closest('tr');
        if (!row) return;

        const taskId = parseInt(row.dataset.taskId);
        if (isNaN(taskId)) return;

        const task = taskManager.getTask(taskId);
        if (!task) return;

        // テーマ行の場合は処理しない
        if (task.type === 'theme') return;

        // タスク行とガントチャートをハイライト
        this.highlightTaskRow(taskId);
        
        // ガントチャートの該当位置にスクロール
        ganttChart.scrollToTask(taskId);
        ganttChart.highlightTaskRow(taskId);
    }

    /**
     * タスク行をハイライト
     */
    highlightTaskRow(taskId) {
        // 既存のハイライトを削除
        this.clearTaskRowHighlight();

        const row = document.querySelector(`tr[data-task-id="${taskId}"]`);
        if (row) {
            row.classList.add('highlighted');
            
            // 2秒後にハイライトを削除
            this.taskHighlightTimeout = setTimeout(() => {
                this.clearTaskRowHighlight();
            }, 2000);
        }
    }

    /**
     * タスク行のハイライトをクリア
     */
    clearTaskRowHighlight() {
        const highlightedRows = document.querySelectorAll('tr.highlighted');
        highlightedRows.forEach(row => {
            row.classList.remove('highlighted');
        });
        
        if (this.taskHighlightTimeout) {
            clearTimeout(this.taskHighlightTimeout);
            this.taskHighlightTimeout = null;
        }
    }

    /**
     * キーボードショートカットを処理
     */
    handleKeyboardShortcuts(e) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'n':
                    e.preventDefault();
                    this.addTask();
                    break;
                case 't':
                    e.preventDefault();
                    this.addTheme();
                    break;
                case 'Delete':
                case 'Backspace':
                    if (e.shiftKey) {
                        e.preventDefault();
                        this.deleteSelectedRows();
                    }
                    break;
                case 'f':
                    e.preventDefault();
                    this.focusOnFirstSelectedTask();
                    break;
            }
        } else {
            // 矢印キーでタスク間を移動
            switch (e.key) {
                case 'ArrowUp':
                    if (!this.isInputting) {
                        e.preventDefault();
                        this.navigateToAdjacentTask(-1);
                    }
                    break;
                case 'ArrowDown':
                    if (!this.isInputting) {
                        e.preventDefault();
                        this.navigateToAdjacentTask(1);
                    }
                    break;
                case 'Delete':
                    // 入力中でない場合のみDeleteキーで行削除
                    if (!this.isInputting) {
                        e.preventDefault();
                        this.deleteSelectedRows();
                    }
                    break;
            }
        }
    }

    /**
     * 選択された最初のタスクにフォーカス
     */
    focusOnFirstSelectedTask() {
        const selectedIds = taskManager.getSelectedRows();
        if (selectedIds.length > 0) {
            this.highlightTaskRow(selectedIds[0]);
            ganttChart.scrollToTask(selectedIds[0]);
            ganttChart.highlightTaskRow(selectedIds[0]);
        }
    }

    /**
     * 隣接するタスクに移動
     */
    navigateToAdjacentTask(direction) {
        const tasks = taskManager.getAllTasks().filter(task => task.type === 'task');
        if (tasks.length === 0) return;

        // 現在選択されているタスクを取得
        const selectedIds = taskManager.getSelectedRows();
        let currentIndex = 0;

        if (selectedIds.length > 0) {
            const currentTaskId = selectedIds[0];
            currentIndex = tasks.findIndex(task => task.id === currentTaskId);
            if (currentIndex < 0) currentIndex = 0;
        }

        // 次のタスクのインデックスを計算
        const nextIndex = currentIndex + direction;
        if (nextIndex >= 0 && nextIndex < tasks.length) {
            const nextTask = tasks[nextIndex];
            
            // 選択をクリアして新しいタスクを選択
            taskManager.clearSelection();
            taskManager.toggleRowSelection(nextTask.id);
            
            // UIを更新
            this.updateRowSelection();
            this.highlightTaskRow(nextTask.id);
            ganttChart.scrollToTask(nextTask.id);
            ganttChart.highlightTaskRow(nextTask.id);
        }
    }

    /**
     * 行選択UIを更新
     */
    updateRowSelection() {
        const selectedIds = taskManager.getSelectedRows();
        
        // 全チェックボックスをクリア
        const checkboxes = document.querySelectorAll('.row-checkbox');
        checkboxes.forEach(cb => {
            cb.checked = false;
            const row = cb.closest('tr');
            if (row) row.classList.remove('selected');
        });
        
        // 選択されたタスクのチェックボックスをチェック
        selectedIds.forEach(id => {
            const row = document.querySelector(`tr[data-task-id="${id}"]`);
            if (row) {
                const checkbox = row.querySelector('.row-checkbox');
                if (checkbox) checkbox.checked = true;
                row.classList.add('selected');
            }
        });
    }

    /**
     * ウィンドウリサイズを処理
     */
    handleResize() {
        // ガントチャートのスクロール同期を再設定
        ganttChart.syncScroll();
    }

    /**
     * スクロール同期を設定
     */
    setupScrollSync() {
        // 少し遅延させてDOM要素が完全に準備されてから実行
        setTimeout(() => {
            ganttChart.syncScroll();
            
            // 初期表示時に今日の位置にスクロール
            setTimeout(() => {
                ganttChart.scrollToToday();
            }, 200);
        }, 100);
    }

    /**
     * タッチイベントを設定（モバイル対応）
     */
    setupTouchEvents() {
        dragDropManager.setupTouchEvents();
    }

    /**
     * データをエクスポート
     */
    exportData() {
        const data = taskManager.exportToJSON();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gantt-data-${DateUtils.formatDate(new Date()).replace(/\//g, '')}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * データをインポート
     */
    importData(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const success = taskManager.importFromJSON(e.target.result);
                if (success) {
                    this.render();
                    alert('データを正常にインポートしました。');
                } else {
                    alert('データの形式が正しくありません。');
                }
            } catch (error) {
                alert('ファイルの読み込みに失敗しました。');
            }
        };
        reader.readAsText(file);
    }
}

// アプリケーション開始
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new GanttApp();
    // グローバルスコープからアクセスできるようにする
    window.app = app;
});
