/**
 * ドラッグ&ドロップ機能クラス
 */
class DragDropManager {
    constructor() {
        this.isDragging = false;
        this.draggedElements = [];
        this.dropIndicator = null;
        this.dragStartY = 0;
        this.currentDropTarget = null;
        
        this.init();
    }

    /**
     * 初期化
     */
    init() {
        this.createDropIndicator();
        this.setupEventListeners();
    }

    /**
     * ドロップインジケーターを作成
     */
    createDropIndicator() {
        this.dropIndicator = document.createElement('div');
        this.dropIndicator.className = 'drop-indicator';
        this.dropIndicator.style.cssText = `
            position: absolute;
            height: 3px;
            background-color: #007bff;
            border-radius: 1px;
            z-index: 1000;
            display: none;
            width: 100%;
            left: 0;
            box-shadow: 0 0 4px rgba(0, 123, 255, 0.5);
            pointer-events: none;
        `;
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
        const dragHandle = e.target.closest('.drag-handle');
        if (!dragHandle) return;

        e.preventDefault();
        
        const row = dragHandle.closest('tr');
        if (!row) return;

        const taskId = parseInt(row.dataset.taskId);
        if (isNaN(taskId)) return;

        // 選択された行を含めてドラッグ対象を決定
        const selectedIds = taskManager.getSelectedRows();
        let draggedIds;
        
        if (selectedIds.includes(taskId)) {
            // 選択された行の中にドラッグ開始行が含まれている場合、選択された行全体をドラッグ
            draggedIds = selectedIds;
        } else {
            // ドラッグ開始行のみをドラッグ
            draggedIds = [taskId];
        }

        this.startDrag(draggedIds, e.clientY);
    }

    /**
     * ドラッグ開始
     */
    startDrag(draggedIds, startY) {
        this.isDragging = true;
        this.dragStartY = startY;
        this.draggedElements = [];

        // ドラッグ対象の要素を取得してスタイルを変更
        draggedIds.forEach(id => {
            const row = document.querySelector(`tr[data-task-id="${id}"]`);
            if (row) {
                row.classList.add('dragging');
                this.draggedElements.push({
                    id: id,
                    element: row
                });
            }
        });

        // ドロップインジケーターをテーブルコンテナに追加
        const tableContainer = document.querySelector('.table-container');
        if (tableContainer && !tableContainer.contains(this.dropIndicator)) {
            tableContainer.appendChild(this.dropIndicator);
        }

        // カーソルを変更
        document.body.style.cursor = 'grabbing';
    }

    /**
     * マウス移動イベント処理
     */
    handleMouseMove(e) {
        if (!this.isDragging) return;

        e.preventDefault();

        // ドロップ可能な位置を計算
        const dropTarget = this.findDropTarget(e.clientY);
        this.updateDropIndicator(dropTarget);
    }

    /**
     * ドロップターゲットを検索
     */
    findDropTarget(mouseY) {
        const tbody = document.getElementById('task-tbody');
        if (!tbody) return null;

        const rows = Array.from(tbody.querySelectorAll('tr:not(.dragging)'));
        let closestRow = null;
        let closestDistance = Infinity;
        let insertBefore = false;

        rows.forEach(row => {
            const rect = row.getBoundingClientRect();
            const rowCenter = rect.top + rect.height / 2;
            const distance = Math.abs(mouseY - rowCenter);

            if (distance < closestDistance) {
                closestDistance = distance;
                closestRow = row;
                insertBefore = mouseY < rowCenter;
            }
        });

        return {
            row: closestRow,
            insertBefore: insertBefore
        };
    }

    /**
     * ドロップインジケーターを更新
     */
    updateDropIndicator(dropTarget) {
        if (!dropTarget || !dropTarget.row) {
            this.dropIndicator.style.display = 'none';
            this.currentDropTarget = null;
            return;
        }

        this.currentDropTarget = dropTarget;
        const row = dropTarget.row;
        const tableContainer = document.querySelector('.table-container');
        
        if (!tableContainer) return;

        const containerRect = tableContainer.getBoundingClientRect();
        const rowRect = row.getBoundingClientRect();

        this.dropIndicator.style.display = 'block';
        this.dropIndicator.style.left = '0px';
        this.dropIndicator.style.width = `${containerRect.width - 20}px`; // スクロールバー分を考慮

        if (dropTarget.insertBefore) {
            this.dropIndicator.style.top = `${rowRect.top - containerRect.top + tableContainer.scrollTop - 1}px`;
        } else {
            this.dropIndicator.style.top = `${rowRect.bottom - containerRect.top + tableContainer.scrollTop - 1}px`;
        }
    }

    /**
     * マウスアップイベント処理
     */
    handleMouseUp(e) {
        if (!this.isDragging) return;

        e.preventDefault();

        // ドロップを実行
        this.executeDrop();

        // クリーンアップ
        this.endDrag();
    }

    /**
     * ドロップを実行
     */
    executeDrop() {
        if (!this.currentDropTarget || !this.currentDropTarget.row) return;

        const targetTaskId = parseInt(this.currentDropTarget.row.dataset.taskId);
        if (isNaN(targetTaskId)) return;

        // 移動するタスクのID
        const draggedIds = this.draggedElements.map(el => el.id);

        // ターゲット位置を計算
        const targetIndex = taskManager.getAllTasks().findIndex(task => task.id === targetTaskId);
        if (targetIndex < 0) return;

        const insertIndex = this.currentDropTarget.insertBefore ? targetIndex : targetIndex + 1;

        // タスクを移動
        taskManager.moveTasks(draggedIds, insertIndex);

        // 画面を更新
        app.renderTaskTable();
        app.renderGanttChart();
    }

    /**
     * ドラッグ終了
     */
    endDrag() {
        this.isDragging = false;

        // ドラッグ中のスタイルを削除
        this.draggedElements.forEach(el => {
            el.element.classList.remove('dragging');
        });

        // ドロップインジケーターを非表示
        this.dropIndicator.style.display = 'none';

        // カーソルを戻す
        document.body.style.cursor = '';

        // 状態をリセット
        this.draggedElements = [];
        this.currentDropTarget = null;
    }

    /**
     * テーブル行にドラッグハンドルを追加
     */
    addDragHandle(row) {
        const dragCell = document.createElement('td');
        dragCell.className = 'drag-handle';
        dragCell.innerHTML = '⋮⋮';
        dragCell.title = 'ドラッグして移動';
        
        // 最初のセル（チェックボックス）の後に挿入
        if (row.children.length > 0) {
            row.insertBefore(dragCell, row.children[1]);
        } else {
            row.appendChild(dragCell);
        }
    }

    /**
     * タッチイベント用の処理（モバイル対応）
     */
    setupTouchEvents() {
        let touchStartY = 0;
        let touchDraggedIds = [];

        document.addEventListener('touchstart', (e) => {
            const dragHandle = e.target.closest('.drag-handle');
            if (!dragHandle) return;

            e.preventDefault();
            
            const row = dragHandle.closest('tr');
            if (!row) return;

            const taskId = parseInt(row.dataset.taskId);
            if (isNaN(taskId)) return;

            touchStartY = e.touches[0].clientY;
            const selectedIds = taskManager.getSelectedRows();
            
            if (selectedIds.includes(taskId)) {
                touchDraggedIds = selectedIds;
            } else {
                touchDraggedIds = [taskId];
            }

            this.startDrag(touchDraggedIds, touchStartY);
        });

        document.addEventListener('touchmove', (e) => {
            if (!this.isDragging) return;
            
            e.preventDefault();
            const touch = e.touches[0];
            this.handleMouseMove({ clientY: touch.clientY, preventDefault: () => {} });
        });

        document.addEventListener('touchend', (e) => {
            if (!this.isDragging) return;
            
            e.preventDefault();
            this.handleMouseUp({ preventDefault: () => {} });
        });
    }
}

// グローバルインスタンス
const dragDropManager = new DragDropManager();
