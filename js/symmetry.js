/**
 * Module SymmetryMode quản lý trạng thái đối xứng cho việc vẽ tự do và hình khối.
 * Điều khiển số lượng các bản sao đối xứng và trạng thái bật/tắt.
 */
const SymmetryMode = (function() {
    /** @type {boolean} Cờ đánh dấu chế độ đối xứng đang bật hay tắt */
    let enabled = true;
    /** @type {number} Số lượng bản sao đối xứng (ví dụ: 8 cho đối xứng 8 trục) */
    let symmetryCount = 8;
    
    /**
     * Khởi tạo module SymmetryMode.
     */
    function init() {
        updateUI();
    }
    
    /**
     * Bật hoặc tắt chế độ đối xứng.
     * @param {boolean} value - Trạng thái mới.
     */
    function setEnabled(value) {
        enabled = value;
        updateUI();
    }
    
    /**
     * Thiết lập số lượng trục đối xứng.
     * @param {number} count - Số lượng trục.
     */
    function setSymmetry(count) {
        symmetryCount = count;
        updateUI();
    }
    
    /**
     * Kiểm tra xem chế độ đối xứng có đang bật hay không.
     * @returns {boolean}
     */
    function isEnabled() {
        return enabled;
    }
    
    /**
     * Lấy số lượng trục đối xứng hiện tại.
     * @returns {number}
     */
    function getSymmetryCount() {
        return symmetryCount;
    }
    
    /**
     * Cập nhật các thành phần UI liên quan đến đối xứng (nút gạt, bộ chọn số, nhãn hiển thị).
     */
    function updateUI() {
        const optionsEl = document.getElementById('symmetry-options');
        const toggle = document.getElementById('symmetry-toggle');
        const countSelect = document.getElementById('symmetry-count');
        
        // 1. Ẩn/hiện các tùy chọn nâng cao về đối xứng trong bảng công cụ
        if (optionsEl) {
            optionsEl.style.display = enabled ? 'flex' : 'none';
        }
        // 2. Đồng bộ hóa trạng thái nút gạt (toggle) trên giao diện
        if (toggle && toggle.checked !== enabled) {
            toggle.checked = enabled;
        }
        // 3. Đồng bộ hóa giá trị trong ô chọn số lượng trục
        if (countSelect && countSelect.value != symmetryCount) {
            countSelect.value = symmetryCount;
        }
    }
    
    return {
        init,
        setEnabled,
        setSymmetry,
        isEnabled,
        getSymmetryCount,
        updateUI
    };
})();

window.SymmetryMode = SymmetryMode;