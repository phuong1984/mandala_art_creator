/**
 * Module History quản lý hệ thống Hoàn tác (Undo) và Làm lại (Redo).
 * Lưu trữ các trạng thái của canvas để cho phép người dùng quay lại các bước trước đó.
 */
const History = (function() {
    /** @type {Array} Danh sách các trạng thái đã lưu */
    let history = [];
    /** @type {number} Chỉ số của trạng thái hiện tại trong danh sách history */
    let historyIndex = -1;
    /** @type {number} Số lượng trạng thái tối đa có thể lưu trữ */
    let maxHistory = 50;
    /** @type {boolean} Cờ kiểm soát việc có ghi lại lịch sử hay không (tránh ghi đè khi đang undo/redo) */
    let isRecording = true;
    /** @type {boolean} Cờ đánh dấu đã khởi tạo */
    let initialized = false;
    
    /**
     * Thêm một trạng thái mới vào lịch sử.
     * @param {string} action - Tên hành động vừa thực hiện (để debug).
     */
    function add(action) {
        // 1. Chỉ ghi lại nếu cờ isRecording đang bật (tránh ghi đè khi đang thực hiện undo/redo)
        if (!isRecording) return;
        
        const canvas = Canvas.getCanvas();
        if (!canvas) {
            console.log('History: Canvas not ready');
            return;
        }
        
        try {
            // 2. Chuyển đổi trạng thái hiện tại của canvas sang định dạng JSON
            const json = canvas.toJSON(['selectable', 'evented', 'customId', 'layerId', 'originalOpacity']);
            const bgColor = canvas.backgroundColor;
            
            // 3. Tạo đối tượng trạng thái (state) bao gồm dữ liệu vẽ, màu nền và thông tin hành động
            const state = {
                json: json,
                backgroundColor: typeof bgColor === 'string' ? bgColor : '#ffffff',
                action: action,
                timestamp: Date.now()
            };
            
            // 4. Nếu người dùng đang ở giữa các bước (sau khi undo), xóa bỏ các bước "tương lai"
            if (historyIndex < history.length - 1) {
                history = history.slice(0, historyIndex + 1);
            }
            
            // 5. Thêm trạng thái mới vào mảng lịch sử
            history.push(state);
            
            // 6. Đảm bảo số lượng bước lưu trữ không vượt quá giới hạn maxHistory
            if (history.length > maxHistory) {
                history.shift(); // Xóa bước cũ nhất
            } else {
                historyIndex++; // Tăng chỉ số hiện tại
            }
            
            console.log(`History added: ${action}, index: ${historyIndex}/${history.length}`);
            EventBus.emit('history:changed', getStatus());
        } catch (e) {
            console.error('History add error:', e);
        }
    }
    
    /**
     * Quay lại trạng thái trước đó (Undo).
     */
    function undo() {
        if (historyIndex > 0) {
            historyIndex--;
            restoreState(history[historyIndex]);
            console.log(`Undo to index: ${historyIndex}`);
        } else {
            console.log('Nothing to undo');
        }
    }
    
    /**
     * Tiến tới trạng thái kế tiếp (Redo).
     */
    function redo() {
        if (historyIndex < history.length - 1) {
            historyIndex++;
            restoreState(history[historyIndex]);
            console.log(`Redo to index: ${historyIndex}`);
        } else {
            console.log('Nothing to redo');
        }
    }
    
    /**
     * Khôi phục canvas về một trạng thái cụ thể.
     * @param {Object} state - Đối tượng trạng thái cần khôi phục.
     */
    function restoreState(state) {
        const canvas = Canvas.getCanvas();
        if (!canvas || !state) return;
        
        // 1. Tạm thời tắt ghi lịch sử để tránh tạo ra vòng lặp vô tận khi đang khôi phục
        isRecording = false;
        
        try {
            // 2. Tải dữ liệu JSON vào canvas
            canvas.loadFromJSON(state.json, function() {
                // 3. Khôi phục màu nền
                canvas.backgroundColor = state.backgroundColor || '#ffffff';
                canvas.renderAll();
                
                // 4. Bật lại quyền ghi lịch sử sau khi khôi phục xong
                isRecording = true;
                EventBus.emit('history:changed', getStatus());
                console.log('State restored');
            });
        } catch (e) {
            console.error('Restore error:', e);
            isRecording = true;
        }
    }
    
    /**
     * Xóa sạch lịch sử.
     */
    function clear() {
        history = [];
        historyIndex = -1;
        initialized = false;
        EventBus.emit('history:changed', getStatus());
    }
    
    /**
     * Lấy thông tin trạng thái hiện tại của hệ thống lịch sử.
     * @returns {Object} Bao gồm chỉ số hiện tại và tổng số trạng thái.
     */
    function getStatus() {
        return {
            index: historyIndex,
            total: history.length,
            initialized: initialized
        };
    }
    
    return {
        add,
        undo,
        redo,
        clear,
        getStatus
    };
})();

window.History = History;
