/**
 * Module EventBus cung cấp cơ chế lắng nghe và phát các sự kiện tùy chỉnh (Pub/Sub pattern).
 * Giúp giao tiếp giữa các module khác nhau mà không cần phụ thuộc trực tiếp vào nhau.
 */
const EventBus = (function() {
    /** @type {Object} Lưu trữ danh sách các hàm gọi lại (callback) cho mỗi sự kiện */
    const listeners = {};
    
    /**
     * Đăng ký lắng nghe một sự kiện.
     * @param {string} event - Tên sự kiện.
     * @param {Function} callback - Hàm xử lý khi sự kiện xảy ra.
     */
    function on(event, callback) {
        // 1. Nếu sự kiện này chưa từng được đăng ký, tạo một mảng rỗng để chứa các callback
        if (!listeners[event]) {
            listeners[event] = [];
        }
        // 2. Thêm hàm callback vào danh sách lắng nghe của sự kiện đó
        listeners[event].push(callback);
    }
    
    /**
     * Hủy đăng ký lắng nghe một sự kiện.
     * @param {string} event - Tên sự kiện.
     * @param {Function} callback - Hàm cần gỡ bỏ.
     */
    function off(event, callback) {
        // 1. Kiểm tra xem sự kiện có tồn tại trong danh sách không
        if (!listeners[event]) return;
        // 2. Lọc bỏ callback cụ thể ra khỏi mảng các hàm lắng nghe
        listeners[event] = listeners[event].filter(cb => cb !== callback);
    }
    
    /**
     * Phát một sự kiện cùng với dữ liệu đi kèm.
     * @param {string} event - Tên sự kiện.
     * @param {any} data - Dữ liệu truyền cho các hàm lắng nghe.
     */
    function emit(event, data) {
        // 1. Kiểm tra xem có hàm nào đang lắng nghe sự kiện này không
        if (listeners[event]) {
            // 2. Duyệt qua danh sách và thực thi từng hàm callback với dữ liệu đi kèm
            listeners[event].forEach(cb => cb(data));
        }
    }
    
    return {
        on,
        off,
        emit
    };
})();

window.EventBus = EventBus;
