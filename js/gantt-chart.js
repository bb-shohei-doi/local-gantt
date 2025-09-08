/**
 * ガントチャート描画クラス
 */
class GanttChart {
    constructor() {
        this.chartHeader = document.getElementById('chart-header');
        this.chartBody = document.getElementById('chart-body');
        this.dateRange = null;
        this.cellWidth = 30;
        this.today = DateUtils.getToday();
    }

    /**
     * ガントチャートを描画
     */
    render(tasks) {
        this.dateRange = DateUtils.calculateDisplayRange(tasks);
        this.renderHeader();
        this.renderBody(tasks);
        
        // 描画後にスクロール同期を再設定
        setTimeout(() => {
            this.syncScroll();
        }, 0);
    }

    /**
     * ヘッダー（日付）を描画
     */
    renderHeader() {
        this.chartHeader.innerHTML = '';
        
        const dates = DateUtils.generateDateRange(this.dateRange.start, this.dateRange.end);
        
        // 月行を作成
        const monthRow = this.createDateRow('month-row');
        let currentMonth = null;
        let monthSpan = 0;
        
        dates.forEach((date, index) => {
            const month = date.getMonth();
            if (currentMonth !== month) {
                if (currentMonth !== null) {
                    // 前の月のセルを完成させる
                    const monthCell = monthRow.children[monthRow.children.length - 1];
                    monthCell.style.width = `${monthSpan * this.cellWidth}px`;
                }
                
                // 新しい月のセルを作成
                const monthCell = document.createElement('div');
                monthCell.className = 'date-cell';
                monthCell.textContent = DateUtils.getMonthName(date);
                monthRow.appendChild(monthCell);
                
                currentMonth = month;
                monthSpan = 1;
            } else {
                monthSpan++;
            }
            
            // 最後の月の処理
            if (index === dates.length - 1) {
                const monthCell = monthRow.children[monthRow.children.length - 1];
                monthCell.style.width = `${monthSpan * this.cellWidth}px`;
            }
        });
        
        // 日行を作成
        const dayRow = this.createDateRow('day-row');
        dates.forEach(date => {
            const dayCell = document.createElement('div');
            dayCell.className = 'date-cell';
            dayCell.textContent = date.getDate();
            dayCell.style.width = `${this.cellWidth}px`;
            dayRow.appendChild(dayCell);
        });
        
        // 曜日行を作成
        const weekdayRow = this.createDateRow('weekday-row');
        dates.forEach(date => {
            const weekdayCell = document.createElement('div');
            weekdayCell.className = 'date-cell';
            weekdayCell.textContent = DateUtils.getWeekdayName(date);
            weekdayCell.style.width = `${this.cellWidth}px`;
            weekdayRow.appendChild(weekdayCell);
        });
        
        this.chartHeader.appendChild(monthRow);
        this.chartHeader.appendChild(dayRow);
        this.chartHeader.appendChild(weekdayRow);
    }

    /**
     * 日付行を作成
     */
    createDateRow(className) {
        const row = document.createElement('div');
        row.className = `date-row ${className}`;
        return row;
    }

    /**
     * チャートボディを描画
     */
    renderBody(tasks) {
        this.chartBody.innerHTML = '';
        
        const dates = DateUtils.generateDateRange(this.dateRange.start, this.dateRange.end);
        
        tasks.forEach(task => {
            const chartRow = this.createChartRow(task, dates);
            this.chartBody.appendChild(chartRow);
        });
    }

    /**
     * チャート行を作成
     */
    createChartRow(task, dates) {
        const row = document.createElement('div');
        row.className = task.type === 'theme' ? 'chart-row theme-chart-row' : 'chart-row';
        row.dataset.taskId = task.id;
        
        // 日付セルを作成
        dates.forEach(date => {
            const cell = document.createElement('div');
            cell.className = 'chart-cell';
            cell.style.width = `${this.cellWidth}px`;
            
            // 日付タイプに応じた背景色を設定
            const dateType = holidayManager.getDateType(date);
            if (dateType === 'weekend') {
                cell.classList.add('weekend');
            } else if (dateType === 'holiday') {
                cell.classList.add('holiday');
                cell.title = holidayManager.getHolidayName(date);
            }
            
            // 今日の背景色
            if (DateUtils.isSameDate(date, this.today)) {
                cell.classList.add('today');
            }
            
            row.appendChild(cell);
        });
        
        // タスクの場合はガントバーを追加
        if (task.type === 'task') {
            this.addGanttBars(row, task, dates);
        }
        
        return row;
    }

    /**
     * ガントバーを追加
     */
    addGanttBars(row, task, dates) {
        // 予定のガントバー
        if (task.startDate && task.endDate) {
            const startDate = DateUtils.parseDate(task.startDate);
            const endDate = DateUtils.parseDate(task.endDate);
            
            if (startDate && endDate) {
                this.createGanttBar(row, startDate, endDate, dates, 'planned', task.taskName);
            }
        }
        
        // 実績のガントバー
        if (task.actualStartDate) {
            const actualStartDate = DateUtils.parseDate(task.actualStartDate);
            const actualEndDate = DateUtils.parseDate(task.actualEndDate || (this.today).toLocaleDateString('ja'));
            
            if (actualStartDate && actualEndDate) {
                this.createGanttBar(row, actualStartDate, actualEndDate, dates, 'actual', `${task.taskName} (実績)`);
            }
        }
        
        // 進捗バー
        if (task.startDate && task.endDate && task.progress && parseInt(task.progress) > 0) {
            const startDate = DateUtils.parseDate(task.startDate);
            const endDate = DateUtils.parseDate(task.endDate);
            const progress = parseInt(task.progress);
            
            if (startDate && endDate && progress > 0) {
                const totalDays = DateUtils.getDaysDifference(startDate, endDate) + 1;
                const progressDays = Math.ceil(totalDays * progress / 100);
                const progressendDate = DateUtils.addDays(startDate, progressDays - 1);
                
                this.createGanttBar(row, startDate, progressendDate, dates, 'progress', `${progress}%`);
            }
        }
    }

    /**
     * ガントバーを作成
     */
    createGanttBar(row, startDate, endDate, dates, type, text) {
        const startIndex = this.findDateIndex(dates, startDate);
        const endIndex = this.findDateIndex(dates, endDate);
        
        // デバッグ情報を出力
        console.log(`Creating ${type} bar for ${text}:`, {
            startDate: DateUtils.formatDate(startDate),
            endDate: DateUtils.formatDate(endDate),
            startIndex,
            endIndex,
            totalDates: dates.length,
            dateRangeStart: DateUtils.formatDate(dates[0]),
            dateRangeEnd: DateUtils.formatDate(dates[dates.length - 1])
        });
        
        if (startIndex >= 0 && endIndex >= 0) {
            const bar = document.createElement('div');
            bar.className = `gantt-bar ${type}`;
            
            const left = startIndex * this.cellWidth;
            const width = (endIndex - startIndex + 1) * this.cellWidth;
            
            bar.style.left = `${left}px`;
            bar.style.width = `${width}px`;
            bar.title = `${text}: ${DateUtils.formatDate(startDate)} - ${DateUtils.formatDate(endDate)}`;
            
            // テキストの表示を決定
            const minWidthForText = 60; // テキストを表示するための最小幅
            
            if (type === 'progress') {
                // 進捗バーは常にバー内にテキストを表示（従来通り）
                bar.textContent = text;
            } else if (width >= minWidthForText) {
                // その他のバーは幅が十分な場合のみバー内にテキストを表示
                bar.textContent = text;
            } else {
                // バーの右側にテキストラベルを作成
                const label = document.createElement('div');
                label.className = `gantt-bar-label ${type}-label`;
                label.textContent = text;
                label.style.left = `${left + width + 5}px`; // バーの右端から5px離す
                label.title = bar.title;
                
                row.appendChild(label);
            }
            
            row.appendChild(bar);
        } else {
            console.warn(`Invalid date indices for ${type} bar:`, {
                startDate: DateUtils.formatDate(startDate),
                endDate: DateUtils.formatDate(endDate),
                startIndex,
                endIndex
            });
        }
    }

    /**
     * 日付配列内での指定日のインデックスを取得
     */
    findDateIndex(dates, targetDate) {
        if (!targetDate || !dates) {
            console.warn('findDateIndex: invalid parameters', { targetDate, datesLength: dates?.length });
            return -1;
        }
        
        const index = dates.findIndex(date => DateUtils.isSameDate(date, targetDate));
        console.log('findDateIndex:', {
            targetDate: DateUtils.formatDate(targetDate),
            foundIndex: index,
            foundDate: index >= 0 ? DateUtils.formatDate(dates[index]) : 'not found'
        });
        
        return index;
    }

    /**
     * チャートを再描画
     */
    refresh() {
        const tasks = taskManager.getAllTasks();
        this.render(tasks);
    }

    /**
     * 横スクロールを同期
     */
    syncScroll() {
        const chartBody = this.chartBody;
        const chartHeader = this.chartHeader;
        
        // 既存のイベントリスナーを削除（重複を避けるため）
        this.removeScrollListeners();
        
        // スクロール同期関数
        this.bodyScrollHandler = () => {
            chartHeader.scrollLeft = chartBody.scrollLeft;
        };
        
        // イベントリスナーを追加
        chartBody.addEventListener('scroll', this.bodyScrollHandler);
        
        // 初期同期
        chartHeader.scrollLeft = chartBody.scrollLeft;
    }

    /**
     * スクロールイベントリスナーを削除
     */
    removeScrollListeners() {
        if (this.bodyScrollHandler) {
            this.chartBody.removeEventListener('scroll', this.bodyScrollHandler);
        }
        if (this.headerScrollHandler) {
            this.chartHeader.removeEventListener('scroll', this.headerScrollHandler);
        }
    }

    /**
     * 表示期間を設定
     */
    setDateRange(startDate, endDate) {
        this.dateRange = {
            start: startDate,
            end: endDate
        };
        this.refresh();
    }

    /**
     * 今日にスクロール
     */
    scrollToToday() {
        if (!this.dateRange) return;
        
        const dates = DateUtils.generateDateRange(this.dateRange.start, this.dateRange.end);
        const todayIndex = this.findDateIndex(dates, this.today);
        
        if (todayIndex >= 0) {
            const scrollPosition = todayIndex * this.cellWidth - this.chartBody.clientWidth / 2;
            this.chartBody.scrollLeft = Math.max(0, scrollPosition);
        }
    }

    /**
     * 指定したタスクの位置にスクロール
     */
    scrollToTask(taskId) {
        const task = taskManager.getTask(taskId);
        if (!task || task.type === 'theme') return;

        // 縦方向のスクロール（タスク行を表示）
        this.scrollToTaskRow(taskId);

        // 横方向のスクロール（タスクの日程を表示）
        this.scrollToTaskDates(task);
    }

    /**
     * タスク行まで縦スクロール
     */
    scrollToTaskRow(taskId) {
        const chartRow = this.chartBody.querySelector(`[data-task-id="${taskId}"]`);
        if (chartRow) {
            const rowTop = chartRow.offsetTop;
            const rowHeight = chartRow.offsetHeight;
            const containerHeight = this.chartBody.clientHeight;
            
            // 行が中央に来るようにスクロール
            const scrollTop = rowTop - (containerHeight / 2) + (rowHeight / 2);
            this.chartBody.scrollTop = Math.max(0, scrollTop);
        }
    }

    /**
     * タスクの日程範囲まで横スクロール
     */
    scrollToTaskDates(task) {
        if (!this.dateRange) return;

        // タスクの開始日を優先、なければ実績開始日を使用
        let targetDate = null;
        if (task.startDate) {
            targetDate = DateUtils.parseDate(task.startDate);
        } else if (task.actualStartDate) {
            targetDate = DateUtils.parseDate(task.actualStartDate);
        }

        if (targetDate) {
            const dates = DateUtils.generateDateRange(this.dateRange.start, this.dateRange.end);
            const targetIndex = this.findDateIndex(dates, targetDate);
            
            if (targetIndex >= 0) {
                // タスクの開始位置が画面の左側1/4に来るようにスクロール
                const scrollPosition = targetIndex * this.cellWidth - this.chartBody.clientWidth / 4;
                this.chartBody.scrollLeft = Math.max(0, scrollPosition);
            }
        }
    }

    /**
     * タスク行をハイライト
     */
    highlightTaskRow(taskId, duration = 2000) {
        // 既存のハイライトを削除
        this.clearTaskHighlight();

        const chartRow = this.chartBody.querySelector(`[data-task-id="${taskId}"]`);
        if (chartRow) {
            chartRow.classList.add('highlighted');
            
            // 指定時間後にハイライトを削除
            this.highlightTimeout = setTimeout(() => {
                this.clearTaskHighlight();
            }, duration);
        }
    }

    /**
     * タスクハイライトをクリア
     */
    clearTaskHighlight() {
        const highlightedRows = this.chartBody.querySelectorAll('.highlighted');
        highlightedRows.forEach(row => {
            row.classList.remove('highlighted');
        });
        
        if (this.highlightTimeout) {
            clearTimeout(this.highlightTimeout);
            this.highlightTimeout = null;
        }
    }

    /**
     * セル幅を変更
     */
    setCellWidth(width) {
        this.cellWidth = width;
        ganttBarDragManager.setCellWidth(width);
        this.refresh();
    }
}

// グローバルインスタンス
const ganttChart = new GanttChart();

// 保存ボタンのイベント
document.addEventListener('DOMContentLoaded', () => {
    const saveBtn = document.getElementById('save-gantt');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const tasks = taskManager.getAllTasks();
            localStorage.setItem('ganttTasks', JSON.stringify(tasks));
            alert('ガントチャートのデータを保存しました');
        });
    }

    const clearBtn = document.getElementById('clear-gantt');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm('全てのタスクデータを削除しますか？この操作は取り消せません。')) {
                // タスクデータをクリア
                taskManager.tasks = [];
                taskManager.selectedRows.clear();
                taskManager.nextId = 1;
                
                // ローカルストレージからも削除
                localStorage.removeItem('ganttTasks');
                
                // 画面を再描画
                if (window.app) {
                    window.app.render();
                }
                
                alert('全てのタスクデータを削除しました');
            }
        });
    }

    // 初期表示時にローカルストレージからデータを読み込む
    const saved = localStorage.getItem('ganttTasks');
    if (saved) {
        try {
            taskManager.importFromJSON(saved);
        } catch (e) {
            console.error('ローカルストレージからの読み込み失敗:', e);
        }
    }
    ganttChart.refresh();
});
