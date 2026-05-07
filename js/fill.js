/**
 * Module Fill quản lý việc tô màu cho các hình khối trên canvas.
 * Hỗ trợ tô màu đơn lẻ hoặc tô màu hàng loạt cho các hình thuộc cùng một nhóm đối xứng.
 */
const Fill = (function() {
    /** @type {fabric.Canvas} Đối tượng canvas */
    let canvas = null;
    /** @type {string} Màu tô hiện tại */
    let currentFillColor = '#000000';
    
    /**
     * Khởi tạo module Fill.
     */
    function init() {
        canvas = Canvas.getCanvas();
        if (!canvas) {
            setTimeout(init, 100);
            return;
        }
        setupColorListener();
    }
    
    /**
     * Thiết lập các trình lắng nghe sự kiện để cập nhật màu tô khi người dùng chọn màu mới.
     */
    function setupColorListener() {
        if (typeof EventBus !== 'undefined') {
            EventBus.on('color:selected', (color) => {
                currentFillColor = color;
            });
        }
        
        const drawColorInput = document.getElementById('draw-color');
        if (drawColorInput) {
            currentFillColor = drawColorInput.value || '#000000';
            // Also keep standard DOM listener as fallback
            drawColorInput.addEventListener('input', function(e) {
                currentFillColor = e.target.value;
            });
        }
    }
    
    /**
     * Thực hiện tô màu cho hình khối tại vị trí sự kiện chuột.
     * @param {Object} options - Tùy chọn sự kiện từ Fabric.js.
     * @returns {boolean} True nếu đã tô màu thành công một hình khối.
     */
    function fillShapeAt(options) {
        if (!canvas) return false;
        
        // 1. Xác định vị trí con trỏ chuột trên canvas
        const pointer = canvas.getPointer(options.e);
        
        // 2. Tìm đối tượng nằm tại vị trí chuột vừa click
        const target = canvas.findTarget(pointer, false);
        
        // 3. Nếu tìm thấy đối tượng và nó là loại có thể tô màu
        if (target && isFillableShape(target)) {
            // 4. Tô màu cho đối tượng chính bị click
            fillSingleShape(target);
            
            // 5. Nếu đối tượng này thuộc một nhóm đối xứng, tô màu cho cả nhóm đó
            if (target.symmetryGroup !== undefined) {
                fillSymmetryGroup(target);
            }
            
            // 6. Vẽ lại canvas và lưu vào lịch sử
            canvas.renderAll();
            setTimeout(() => History.add('fill shape'), 50);
            return true;
        }
        
        return false;
    }
    
    /**
     * Kiểm tra xem một đối tượng có thể tô màu được hay không.
     * @param {fabric.Object} shape - Đối tượng cần kiểm tra.
     * @returns {boolean}
     */
    function isFillableShape(shape) {
        if (!shape) return false;
        const type = shape.type;
        return ['rect', 'circle', 'ellipse', 'triangle', 'polygon', 'path', 'group'].includes(type);
    }
    
    /**
     * Tô màu cho một hình khối cụ thể.
     * @param {fabric.Object} shape - Đối tượng cần tô.
     */
    function fillSingleShape(shape) {
        if (!shape) return;
        
        const fillType = determineFillType(shape);
        
        if (fillType === 'solid') {
            shape.set('fill', currentFillColor);
        } else if (fillType === 'none') {
            shape.set('fill', 'transparent');
        }
        
        shape.setCoords();
    }
    
    /**
     * Xác định kiểu tô màu (hiện tại mặc định là 'solid').
     * @param {fabric.Object} shape 
     * @returns {string}
     */
    function determineFillType(shape) {
        return 'solid';
    }
    
    /**
     * Tô màu cho tất cả các hình khối thuộc cùng nhóm đối xứng với hình cơ sở.
     * @param {fabric.Object} baseShape - Hình khối cơ sở được người dùng click vào.
     */
    function fillSymmetryGroup(baseShape) {
        if (!canvas || !baseShape) return;
        
        // 1. Lấy ID nhóm đối xứng của hình cơ sở
        const groupId = baseShape.symmetryGroup;
        if (groupId === undefined) return;
        
        // 2. Duyệt qua tất cả các đối tượng trên canvas
        canvas.forEachObject(function(linkedShape) {
            // 3. Tìm các đối tượng có cùng ID nhóm (nhưng không phải chính nó)
            if (linkedShape.symmetryGroup !== groupId || linkedShape === baseShape) return;
            
            // 4. Cập nhật màu tô cho các đối tượng trong nhóm
            linkedShape.set('fill', currentFillColor);
            linkedShape.setCoords();
        });
    }
    
    /**
     * Thiết lập màu tô hiện tại.
     * @param {string} color - Mã màu.
     */
    function setFillColor(color) {
        currentFillColor = color;
    }
    
    /**
     * Lấy màu tô hiện tại.
     * @returns {string}
     */
    function getFillColor() {
        return currentFillColor;
    }
    
    return {
        init,
        fillShapeAt,
        setFillColor,
        getFillColor
    };
})();

window.Fill = Fill;