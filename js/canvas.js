/**
 * Module quản lý Canvas sử dụng thư viện Fabric.js.
 * Cung cấp các tính năng như vẽ, phóng to/thu nhỏ, di chuyển (pan), và xuất hình ảnh.
 */
const Canvas = (function() {
    /** @type {fabric.Canvas} Đối tượng canvas của Fabric.js */
    let canvas = null;
    /** @type {boolean} Cờ đánh dấu đã khởi tạo hay chưa */
    let isInitialized = false;
    /** @type {string} Chế độ vẽ hiện tại (ví dụ: 'free', 'shape') */
    let mode = 'free';
    /** @type {string} Màu nền hiện tại của canvas */
    let backgroundColor = '#ffffff';
    /** @type {boolean} Cờ đánh dấu đang trong trạng thái di chuyển canvas (pan) */
    let isPanning = false;
    /** @type {Object} Điểm di chuyển cuối cùng {x, y} */
    let lastPanPoint = { x: 0, y: 0 };
    /** @type {boolean} Cờ đánh dấu có bật snap to grid hay không */
    let snapEnabled = false;
    
    /**
     * Khởi tạo đối tượng Canvas và thiết lập các sự kiện mặc định.
     */
    function init() {
        if (isInitialized) return;
        
        // 1. Kiểm tra sự tồn tại của phần tử canvas trong DOM
        const canvasElement = document.getElementById('main-canvas');
        if (!canvasElement) {
            console.error('Canvas element not found');
            return;
        }
        
        // 2. Khởi tạo Fabric Canvas với các cấu hình mặc định
        canvas = new fabric.Canvas('main-canvas', {
            backgroundColor: backgroundColor,
            selection: true,
            preserveObjectStacking: true,
            width: CANVAS_SIZE,
            height: CANVAS_SIZE
        });
        
        // 3. Thiết lập các sự kiện liên quan đến kích thước, zoom và pan
        handleResize();
        setupZoomEvents();
        setupPanEvents();
        
        // 4. Lắng nghe sự kiện chọn đối tượng để bật chế độ chỉnh sửa node
        /* canvas.on('selection:created', (e) => {
            if (e.selected && e.selected.length === 1) {
                Shapes.enableNodeEditing(e.selected[0]);
            }
        }); */
        
        // 5. Tự động lưu khi có bất kỳ thay đổi nào trên canvas
        canvas.on('object:modified', () => {
            Storage.autoSave();
        });
        
        // 6. Xử lý sự kiện cuộn chuột để thu phóng (zoom)
        canvas.on('mouse:wheel', function(opt) {
            const delta = opt.e.deltaY;
            let zoom = canvas.getZoom();
            
            // Tính toán tỷ lệ zoom mới (giới hạn từ 0.1 đến 5)
            zoom *= 1 - delta * 0.001;
            zoom = Math.min(Math.max(zoom, 0.1), 5);
            
            // Thực hiện phóng to/thu nhỏ tập trung vào tâm của khung nhìn
            canvas.zoomToPoint({ x: canvas.getWidth() / 2, y: canvas.getHeight() / 2 }, zoom);
            
            opt.e.preventDefault();
            opt.e.stopPropagation();
            updateZoomDisplay();
        });
        
        isInitialized = true;
        console.log('Canvas initialized');
    }
    
    /**
     * Thiết lập các sự kiện cho nút bấm phóng to/thu nhỏ.
     */
    function setupZoomEvents() {
        const zoomInBtn = document.getElementById('zoom-in-button');
        const zoomOutBtn = document.getElementById('zoom-out-button');
        const resetZoomBtn = document.getElementById('reset-zoom-button');
        
        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => {
                zoomIn();
                updateZoomDisplay();
            });
        }
        
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => {
                zoomOut();
                updateZoomDisplay();
            });
        }
        
        if (resetZoomBtn) {
            resetZoomBtn.addEventListener('click', () => {
                resetZoom();
                updateZoomDisplay();
            });
        }
    }
    
    /**
     * Thiết lập các sự kiện để di chuyển canvas (pan) khi nhấn giữ phím Space.
     */
    function setupPanEvents() {
        let spacePressed = false;
        
        // 1. Lắng nghe phím Space để kích hoạt chế độ di chuyển (pan)
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !spacePressed) {
                spacePressed = true;
                document.body.style.cursor = 'grab'; // Thay đổi con trỏ chuột thành hình bàn tay
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (e.code === 'Space') {
                spacePressed = false;
                document.body.style.cursor = 'default';
            }
        });
        
        // 2. Bắt đầu di chuyển khi nhấn chuột trong khi giữ Space hoặc phím Alt
        canvas?.on('mouse:down', function(opt) {
            if (spacePressed || opt.e.altKey) {
                isPanning = true;
                lastPanPoint = { x: opt.e.clientX, y: opt.e.clientY };
                canvas.selection = false; // Tắt chế độ chọn đối tượng khi đang di chuyển canvas
                document.body.style.cursor = 'grabbing';
            }
        });
        
        // 3. Cập nhật vị trí khung nhìn (viewport) khi di chuyển chuột
        canvas?.on('mouse:move', function(opt) {
            if (isPanning) {
                const vpt = canvas.viewportTransform;
                // Tính toán khoảng cách di chuyển dựa trên vị trí chuột cũ và mới
                vpt[4] += opt.e.clientX - lastPanPoint.x;
                vpt[5] += opt.e.clientY - lastPanPoint.y;
                canvas.requestRenderAll();
                lastPanPoint = { x: opt.e.clientX, y: opt.e.clientY };
            }
        });
        
        // 4. Kết thúc chế độ di chuyển
        canvas?.on('mouse:up', function() {
            if (isPanning) {
                isPanning = false;
                canvas.selection = true; // Bật lại chế độ chọn đối tượng
                document.body.style.cursor = spacePressed ? 'grab' : 'default';
            }
        });
    }
    
    /**
     * Cập nhật hiển thị tỷ lệ phần trăm phóng to hiện tại lên giao diện.
     */
    function updateZoomDisplay() {
        const zoomLevel = document.getElementById('zoom-level');
        if (zoomLevel && canvas) {
            const zoom = Math.round(canvas.getZoom() * 100);
            zoomLevel.textContent = zoom + '%';
        }
    }
    
    /** @type {number} Kích thước cố định của canvas */
    const CANVAS_SIZE = 800;
    /** @type {number} Kích thước ô lưới hiện tại (0 = không hiển thị) */
    let gridSize = 0;
    
    /**
     * Xử lý thay đổi kích thước canvas - sử dụng kích thước cố định 800x800.
     */
    function handleResize() {
        if (!canvas) return;
        
        canvas.setWidth(CANVAS_SIZE);
        canvas.setHeight(CANVAS_SIZE);
        canvas.calcOffset();
        canvas.renderAll();
        updateZoomDisplay();
        
        updateGrid();
        
        const crosshair = document.getElementById('center-crosshair');
        if (crosshair) {
            crosshair.style.left = '50%';
            crosshair.style.top = '50%';
        }
    }
    
    /**
     * Cập nhật hiển thị lưới dựa trên gridSize.
     */
    function updateGrid() {
        const gridOverlay = document.getElementById('grid-overlay');
        if (!gridOverlay) return;
        
        gridOverlay.innerHTML = '';
        
        if (gridSize <= 0) return;
        
        const gridCanvas = document.createElement('canvas');
        gridCanvas.width = CANVAS_SIZE;
        gridCanvas.height = CANVAS_SIZE;
        gridCanvas.style.position = 'absolute';
        gridCanvas.style.top = '0';
        gridCanvas.style.left = '0';
        gridCanvas.style.pointerEvents = 'none';
        
        const ctx = gridCanvas.getContext('2d');
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.lineWidth = 1;
        
        for (let x = gridSize; x < CANVAS_SIZE; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, CANVAS_SIZE);
            ctx.stroke();
        }
        
        for (let y = gridSize; y < CANVAS_SIZE; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(CANVAS_SIZE, y);
            ctx.stroke();
        }
        
        gridOverlay.appendChild(gridCanvas);
    }
    
    /**
     * Thiết lập kích thước lưới mới và cập nhật slider.
     * @param {number} newGridSize - Kích thước ô lưới mới.
     */
    function setGridSize(newGridSize) {
        gridSize = Math.max(0, Math.min(80, newGridSize));
        updateGrid();
        
        const gridSlider = document.getElementById('grid-slider');
        if (gridSlider && parseInt(gridSlider.value) !== gridSize) {
            gridSlider.value = gridSize;
        }
        
        const gridValue = document.getElementById('grid-value');
        if (gridValue) {
            gridValue.textContent = gridSize === 0 ? 'Off' : gridSize + 'px';
        }
    }
    
    /**
     * Lấy kích thước ô lưới hiện tại.
     * @returns {number}
     */
    function getGridSize() {
        return gridSize;
    }
    
    /**
     * Thiết lập trạng thái snap to grid.
     * @param {boolean} enabled - Bật hoặc tắt snap.
     */
    function setSnapEnabled(enabled) {
        snapEnabled = enabled;
    }
    
    /**
     * Lấy trạng thái snap to grid hiện tại.
     * @returns {boolean}
     */
    function getSnapEnabled() {
        return snapEnabled;
    }
    
    /**
     * Snap một điểm đến lưới gần nhất.
     * @param {Object} point - Điểm {x, y}.
     * @returns {Object} Điểm đã snap.
     */
    function snapToGrid(point) {
        if (!snapEnabled || gridSize <= 0) return point;
        return {
            x: Math.round(point.x / gridSize) * gridSize,
            y: Math.round(point.y / gridSize) * gridSize
        };
    }
    
    /**
     * Thiết lập chế độ vẽ cho canvas.
     * @param {string} newMode - Chế độ mới ('free' để vẽ tự do, các chế độ khác cho hình khối).
     */
    function setMode(newMode) {
        mode = newMode;
        if (canvas) {
            if (mode === 'free') {
                canvas.isDrawingMode = true;
            } else {
                canvas.isDrawingMode = false;
            }
        }
    }
    
    /**
     * Lấy chế độ vẽ hiện tại.
     * @returns {string} Chế độ vẽ.
     */
    function getMode() {
        return mode;
    }
    
    /**
     * Thiết lập màu nền cho canvas.
     * @param {string} color - Mã màu (hex, rgb, v.v.).
     */
    function setBackgroundColor(color) {
        backgroundColor = color;
        if (canvas) {
            canvas.backgroundColor = color;
            canvas.renderAll();
        }
    }
    
    /**
     * Phóng to canvas thêm 20%.
     */
    function zoomIn() {
        if (!canvas) return;
        const zoom = canvas.getZoom();
        canvas.zoomToPoint(
            new fabric.Point(canvas.getWidth() / 2, canvas.getHeight() / 2),
            Math.min(zoom * 1.2, 5)
        );
    }
    
    /**
     * Thu nhỏ canvas đi 20%.
     */
    function zoomOut() {
        if (!canvas) return;
        const zoom = canvas.getZoom();
        canvas.zoomToPoint(
            new fabric.Point(canvas.getWidth() / 2, canvas.getHeight() / 2),
            Math.max(zoom / 1.2, 0.1)
        );
    }
    
    /**
     * Đặt lại tỷ lệ phóng to về 100% và vị trí gốc.
     */
    function resetZoom() {
        if (!canvas) return;
        canvas.setZoom(1);
        canvas.viewportTransform = [1, 0, 0, 1, 0, 0];
        canvas.renderAll();
    }
    
    /**
     * Lấy đối tượng canvas của Fabric.js.
     * @returns {fabric.Canvas}
     */
    function getCanvas() {
        return canvas;
    }
    
    /**
     * Xóa sạch mọi đối tượng trên canvas.
     */
    function clear() {
        if (canvas) {
            canvas.clear();
            canvas.backgroundColor = backgroundColor;
            canvas.renderAll();
        }
    }
    
    /**
     * Chuyển đổi dữ liệu canvas sang định dạng JSON.
     * @returns {Object|null}
     */
    function toJSON() {
        return canvas ? canvas.toJSON(['selectable', 'evented', 'customId', 'layerId', 'originalOpacity']) : null;
    }
    
    /**
     * Tải dữ liệu canvas từ định dạng JSON.
     * @param {Object} json - Dữ liệu JSON.
     * @param {Function} callback - Hàm gọi lại sau khi tải xong.
     */
    function loadFromJSON(json, callback) {
        if (canvas && json) {
            canvas.loadFromJSON(json, () => {
                canvas.backgroundColor = backgroundColor;
                canvas.renderAll();
                if (callback) callback();
            });
        }
    }
    
    /**
     * Xuất nội dung canvas thành chuỗi dữ liệu hình ảnh PNG (DataURL).
     * @param {number} multiplier - Hệ số nhân kích thước ảnh xuất ra.
     * @returns {string|null}
     */
    function toPNG(multiplier = 1) {
        if (!canvas) return null;
        
        // 1. Lưu lại trạng thái zoom và vị trí khung nhìn hiện tại
        const zoom = canvas.getZoom();
        const vpt = canvas.viewportTransform.slice();
        
        // 2. Tạm thời ẩn tâm canvas để không xuất hiện trong ảnh
        const crosshair = document.getElementById('center-crosshair');
        const wasHidden = crosshair?.classList.contains('hidden');
        if (crosshair) crosshair.classList.add('hidden');
        
        // 3. Đặt lại zoom về 100% để đảm bảo ảnh xuất ra đúng kích thước thực tế
        canvas.setZoom(1);
        canvas.viewportTransform = [1, 0, 0, 1, 0, 0];
        
        // 4. Lấy dữ liệu ảnh dưới dạng DataURL
        const dataUrl = canvas.toDataURL({
            format: 'png',
            multiplier: multiplier
        });
        
        // 5. Khôi phục lại trạng thái zoom và vị trí khung nhìn ban đầu
        canvas.setZoom(zoom);
        canvas.viewportTransform = vpt;
        
        // 6. Hiển thị lại tâm canvas nếu trước đó nó không bị ẩn
        if (crosshair && !wasHidden) crosshair.classList.remove('hidden');
        
        return dataUrl;
    }
    
    /**
     * Xóa các đối tượng đang được chọn trên canvas.
     */
    function deleteSelected() {
        if (!canvas) return;
        const active = canvas.getActiveObjects();
        if (active.length) {
            active.forEach(obj => canvas.remove(obj));
            canvas.discardActiveObject();
            canvas.renderAll();
        }
    }
    
    /**
     * Thêm một đối tượng vào canvas.
     * @param {fabric.Object} obj - Đối tượng cần thêm.
     */
    function addObject(obj) {
        if (canvas) {
            canvas.add(obj);
            canvas.renderAll();
        }
    }
    
    /**
     * Thêm nhiều đối tượng vào canvas.
     * @param {Array<fabric.Object>} objects - Danh sách các đối tượng.
     */
    function addObjects(objects) {
        if (canvas) {
            objects.forEach(obj => canvas.add(obj));
            canvas.renderAll();
        }
    }
    
    /**
     * Lấy tọa độ trung tâm thực tế của khung nhìn canvas (sau khi zoom/pan).
     * @returns {Object} Tọa độ {x, y}.
     */
    function getCenter() {
        if (!canvas) return { x: 0, y: 0 };
        const vpt = canvas.viewportTransform;
        return fabric.util.transformPoint({
            x: canvas.getWidth() / 2,
            y: canvas.getHeight() / 2
        }, fabric.util.invertTransform(vpt));
    }
    
    /**
     * Lấy tỷ lệ zoom hiện tại.
     * @returns {number}
     */
    function getZoom() {
        return canvas ? canvas.getZoom() : 1;
    }
    
    /**
     * Thiết lập tỷ lệ zoom.
     * @param {number} zoom
     */
    function setZoom(zoom) {
        if (canvas) {
            canvas.setZoom(zoom);
            updateZoomDisplay();
        }
    }
    
    /**
     * Lấy vị trí pan hiện tại.
     * @returns {Object} {x, y}
     */
    function getPan() {
        if (!canvas) return { x: 0, y: 0 };
        const vpt = canvas.viewportTransform;
        return { x: vpt[4], y: vpt[5] };
    }
    
    /**
     * Thiết lập vị trí pan.
     * @param {Object} pan {x, y}
     */
    function setPan(pan) {
        if (canvas) {
            canvas.viewportTransform[4] = pan.x;
            canvas.viewportTransform[5] = pan.y;
            canvas.requestRenderAll();
        }
    }
    
    return {
        init,
        handleResize,
        setMode,
        getMode,
        setBackgroundColor,
        zoomIn,
        zoomOut,
        resetZoom,
        getZoom,
        setZoom,
        getPan,
        setPan,
        getCanvas,
        clear,
        toJSON,
        loadFromJSON,
        toPNG,
        deleteSelected,
        addObject,
        addObjects,
        getCenter,
        updateZoomDisplay,
        setGridSize,
        getGridSize,
        setSnapEnabled,
        getSnapEnabled,
        snapToGrid
    };
})();

window.Canvas = Canvas;