/**
 * ガントバードラッグ機能クラス
 */
class GanttBarDragManager {
    constructor() {
        this.isDragging = false;
        this.isResizing = false;
        this.currentBar = null;
        this.dragType = null; // 'move', 'resize-start', 'resize-end'
        this.startX = 0;
        this.startLeft = 0;
        this.startWidth = 0;
        this.cellWidth = 30;
        
        this.init();
    }

    /**
     * 初期化
     */
    init() {
        this.setupEventListeners();
    }

    /**
     * イベントリスナーを設定
     */
    setupEventListeners() {
        document.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    }

    /**
     * マウスダウンイベント処理
     */
    handleMouseDown(e) {
        const ganttBar = e.target.closest('.gantt-bar');
        if (!ganttBar || ganttBar.classList.contains('progress')) {
            return; // 進捗バーはドラッグ不可
        }

        e.preventDefault();
        e.stopPropagation();

        this.currentBar = ganttBar;
        this.startX = e.clientX;
        
        const rect = ganttBar.getBoundingClientRect();
        this.startLeft = parseInt(ganttBar.style.left) || 0;
        this.startWidth = parseInt(ganttBar.style.width) || 0;

        // クリック位置によってドラッグタイプを決定
        const relativeX = e.clientX - rect.left;
        const resizeEdgeWidth = 6;

        if (relativeX <= resizeEdgeWidth) {
            this.dragType = 'resize-start';
            this.isResizing = true;
            ganttBar.classList.add('resizing');
            document.body.style.cursor = 'ew-resize';
        } else if (relativeX >= rect.width - resizeEdgeWidth) {
            this.dragType = 'resize-end';
            this.isResizing = true;
            ganttBar.classList.add('resizing');
            document.body.style.cursor = 'ew-resize';
        } else {
            this.dragType = 'move';
            this.isDragging = true;
            ganttBar.classList.add('dragging');
            document.body.style.cursor = 'move';
        }
    }

    /**
     * マウス移動イベント処理
     */
    handleMouseMove(e) {
        if (!this.currentBar || (!this.isDragging && !this.isResizing)) {
            return;
        }

        e.preventDefault();

        const deltaX = e.clientX - this.startX;
        const deltaCells = Math.round(deltaX / this.cellWidth);

        if (this.dragType === 'move') {
            this.handleMove(deltaCells);
        } else if (this.dragType === 'resize-start') {
            this.handleResizeStart(deltaCells);
        } else if (this.dragType === 'resize-end') {
            this.handleResizeEnd(deltaCells);
        }
    }

    /**
     * バー移動処理
     */
    handleMove(deltaCells) {
        const newLeft = this.startLeft + (deltaCells * this.cellWidth);
        if (newLeft >= 0) {
            this.currentBar.style.left = `${newLeft}px`;
        }
    }

    /**
     * 開始日リサイズ処理
     */
    handleResizeStart(deltaCells) {
        const newLeft = this.startLeft + (deltaCells * this.cellWidth);
        const newWidth = this.startWidth - (deltaCells * this.cellWidth);
        
        if (newLeft >= 0 && newWidth >= this.cellWidth) {
            this.currentBar.style.left = `${newLeft}px`;
            this.currentBar.style.width = `${newWidth}px`;
        }
    }

    /**
     * 終了日リサイズ処理
     */
    handleResizeEnd(deltaCells) {
        const newWidth = this.startWidth + (deltaCells * this.cellWidth);
        
        if (newWidth >= this.cellWidth) {
            this.currentBar.style.width = `${newWidth}px`;
        }
    }

    /**
     * マウスアップイベント処理
     */
    handleMouseUp(e) {
        if (!this.currentBar || (!this.isDragging && !this.isResizing)) {
            return;
        }

        e.preventDefault();

        // 変更を確定
        this.applyChanges();

        // クリーンアップ
        this.cleanup();
    }

    /**
     * 変更をタスクデータに適用
     */
    applyChanges() {
        const taskRow = this.currentBar.closest('.chart-row');
        const taskId = parseInt(taskRow.dataset.taskId);
        
        if (!taskId) return;

        const task = taskManager.getTask(taskId);
        if (!task) return;

        const barType = this.getBarType(this.currentBar);
        const { newStartDate, newEndDate } = this.calculateNewDates();

        if (barType === 'planned') {
            taskManager.updateTask(taskId, 'startDate', DateUtils.formatDate(newStartDate));
            taskManager.updateTask(taskId, 'endDate', DateUtils.formatDate(newEndDate));
        } else if (barType === 'actual') {
            taskManager.updateTask(taskId, 'actualStartDate', DateUtils.formatDate(newStartDate));
            taskManager.updateTask(taskId, 'actualEndDate', DateUtils.formatDate(newEndDate));
        }

        // 画面を更新
        if (window.app) {
            window.app.render();
        }
    }

    /**
     * バータイプを取得
     */
    getBarType(bar) {
        if (bar.classList.contains('planned')) return 'planned';
        if (bar.classList.contains('actual')) return 'actual';
        if (bar.classList.contains('progress')) return 'progress';
        return 'planned';
    }

    /**
     * 新しい日付を計算
     */
    calculateNewDates() {
        const chartBody = document.getElementById('chart-body');
        const dates = this.getCurrentDateRange();
        
        const left = parseInt(this.currentBar.style.left) || 0;
        const width = parseInt(this.currentBar.style.width) || this.cellWidth;
        
        const startIndex = Math.floor(left / this.cellWidth);
        const endIndex = Math.floor((left + width - 1) / this.cellWidth);
        
        const newStartDate = dates[startIndex] || dates[0];
        const newEndDate = dates[endIndex] || dates[dates.length - 1];
        
        return { newStartDate, newEndDate };
    }

    /**
     * 現在の日付範囲を取得
     */
    getCurrentDateRange() {
        const tasks = taskManager.getAllTasks();
        const dateRange = DateUtils.calculateDisplayRange(tasks);
        return DateUtils.generateDateRange(dateRange.start, dateRange.end);
    }

    /**
     * クリーンアップ
     */
    cleanup() {
        if (this.currentBar) {
            this.currentBar.classList.remove('dragging', 'resizing');
        }
        
        this.isDragging = false;
        this.isResizing = false;
        this.currentBar = null;
        this.dragType = null;
        
        document.body.style.cursor = '';
    }

    /**
     * セル幅を更新
     */
    setCellWidth(width) {
        this.cellWidth = width;
    }
}

// グローバルインスタンス
const ganttBarDragManager = new GanttBarDragManager();
