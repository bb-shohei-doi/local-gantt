/**
 * 祝日管理クラス
 */
class HolidayManager {
    constructor() {
        this.holidays = new Map();
        this.loadHolidays();
    }

    /**
     * 祝日データを読み込む
     */
    async loadHolidays() {
        try {
            const response = await fetch('data/holidays.json');
            const data = await response.json();
            
            data.holidays.forEach(holiday => {
                const date = new Date(holiday.date);
                const key = this.getDateKey(date);
                this.holidays.set(key, holiday.name);
            });
        } catch (error) {
            console.error('祝日データの読み込みに失敗しました:', error);
        }
    }

    /**
     * 日付キーを生成
     */
    getDateKey(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    /**
     * 指定日が祝日かどうかを判定
     */
    isHoliday(date) {
        const key = this.getDateKey(date);
        return this.holidays.has(key);
    }

    /**
     * 指定日の祝日名を取得
     */
    getHolidayName(date) {
        const key = this.getDateKey(date);
        return this.holidays.get(key) || null;
    }

    /**
     * 指定日が土日かどうかを判定
     */
    isWeekend(date) {
        const dayOfWeek = date.getDay();
        return dayOfWeek === 0 || dayOfWeek === 6; // 0:日曜日, 6:土曜日
    }

    /**
     * 指定日が営業日かどうかを判定
     */
    isBusinessDay(date) {
        return !this.isWeekend(date) && !this.isHoliday(date);
    }

    /**
     * 日付の種別を取得（営業日、土日、祝日）
     */
    getDateType(date) {
        if (this.isHoliday(date)) {
            return 'holiday';
        } else if (this.isWeekend(date)) {
            return 'weekend';
        } else {
            return 'business';
        }
    }

    /**
     * 営業日数を計算（開始日と終了日を含む）
     */
    calculateBusinessDays(startDate, endDate) {
        if (startDate > endDate) {
            return 0;
        }

        let businessDays = 0;
        const currentDate = new Date(startDate);

        while (currentDate <= endDate) {
            if (this.isBusinessDay(currentDate)) {
                businessDays++;
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return businessDays;
    }

    /**
     * 指定された営業日数後の日付を取得
     */
    addBusinessDays(startDate, businessDays) {
        const result = new Date(startDate);
        let remainingDays = businessDays;

        while (remainingDays > 0) {
            result.setDate(result.getDate() + 1);
            if (this.isBusinessDay(result)) {
                remainingDays--;
            }
        }

        return result;
    }
}

// グローバルインスタンス
const holidayManager = new HolidayManager();
