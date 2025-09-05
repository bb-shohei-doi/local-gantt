/**
 * 日付ユーティリティクラス
 */
class DateUtils {
    /**
     * 日付を YYYY/MM/DD 形式の文字列に変換
     */
    static formatDate(date) {
        if (!date) return '';
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        
        return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
    }

    /**
     * 文字列から日付オブジェクトを作成
     */
    static parseDate(dateString) {
        if (!dateString) return null;
        if (dateString.length !== 10) return null;
        
        // YYYY/MM/DD または YYYY-MM-DD 形式に対応
        const normalizedString = dateString.replace(/-/g, '/');
        const date = new Date(normalizedString);
        
        return isNaN(date.getTime()) ? null : date;
    }

    /**
     * 今日の日付を取得
     */
    static getToday() {
        return new Date();
    }

    /**
     * 今日の日付を YYYY/MM/DD 形式で取得
     */
    static getTodayString() {
        return this.formatDate(this.getToday());
    }

    /**
     * 二つの日付が同じ日かどうかを判定
     */
    static isSameDate(date1, date2) {
        if (!date1 || !date2) return false;
        
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        
        return d1.getFullYear() === d2.getFullYear() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getDate() === d2.getDate();
    }

    /**
     * 曜日名を取得
     */
    static getWeekdayName(date, short = true) {
        const weekdays = short 
            ? ['日', '月', '火', '水', '木', '金', '土']
            : ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
        
        return weekdays[date.getDay()];
    }

    /**
     * 月名を取得
     */
    static getMonthName(date) {
        return `${date.getMonth() + 1}月`;
    }

    /**
     * 日付範囲を生成
     */
    static generateDateRange(startDate, endDate) {
        const dates = [];
        const current = new Date(startDate);
        const end = new Date(endDate);

        while (current <= end) {
            dates.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }

        return dates;
    }

    /**
     * 月の最初の日を取得
     */
    static getFirstDayOfMonth(date) {
        return new Date(date.getFullYear(), date.getMonth(), 1);
    }

    /**
     * 月の最後の日を取得
     */
    static getLastDayOfMonth(date) {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0);
    }

    /**
     * 指定した日数を加算
     */
    static addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }

    /**
     * 指定した日数を減算
     */
    static subtractDays(date, days) {
        return this.addDays(date, -days);
    }

    /**
     * 日付の差分を計算（日数）
     */
    static getDaysDifference(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // 時刻の影響を排除
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        
        const diffTime = end.getTime() - start.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    /**
     * 表示用の日付範囲を計算
     */
    static calculateDisplayRange(tasks) {
        if (!tasks || tasks.length === 0) {
            // デフォルトで今月を表示
            const today = this.getToday();
            const firstDay = this.getFirstDayOfMonth(today);
            const lastDay = this.getLastDayOfMonth(today);
            return {
                start: firstDay,
                end: this.addDays(lastDay, 30) // 余裕をもって30日追加
            };
        }

        let minDate = null;
        let maxDate = null;

        tasks.forEach(task => {
            if (task.type === 'theme') return;

            const startDate = this.parseDate(task.startDate);
            const endDate = this.parseDate(task.endDate);
            const actualStartDate = this.parseDate(task.actualStartDate);
            const actualEndDate = this.parseDate(task.actualEndDate);

            [startDate, endDate, actualStartDate, actualEndDate].forEach(date => {
                if (date) {
                    if (!minDate || date < minDate) minDate = date;
                    if (!maxDate || date > maxDate) maxDate = date;
                }
            });
        });

        if (!minDate || !maxDate) {
            // タスクに有効な日付がない場合は今月を表示
            const today = this.getToday();
            const firstDay = this.getFirstDayOfMonth(today);
            const lastDay = this.getLastDayOfMonth(today);
            return {
                start: firstDay,
                end: this.addDays(lastDay, 30)
            };
        }

        // 余裕をもって前後に期間を追加
        return {
            start: this.subtractDays(minDate, 7),
            end: this.addDays(maxDate, 30)
        };
    }

    /**
     * 入力値検証
     */
    static isValidDateString(dateString) {
        if (!dateString) return false;
        const date = this.parseDate(dateString);
        return date !== null;
    }
}
