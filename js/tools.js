/**
 * Module Tools quản lý các công cụ vẽ (cọ vẽ, hình khối) và các thao tác liên quan.
 * Điều khiển việc thiết lập cọ vẽ, kích thước, độ mờ và xử lý các nút chức năng trên giao diện.
 */
const Tools = (function() {
    /** @type {string} Công cụ hiện đang chọn ('brush', 'shape') */
    let currentTool = 'brush';
    /** @type {string} Màu vẽ hiện tại */
    let drawColor = '#000000';
    /** @type {number} Kích thước cọ vẽ */
    let brushSize = 5;
    /** @type {number} Độ mờ của cọ vẽ (0-100) */
    let brushOpacity = 100;
    /** @type {fabric.Canvas} Đối tượng canvas */
    let canvas = null;
    
    /**
     * Khởi tạo module Tools và thiết lập các thành phần liên quan.
     */
    function init() {
        canvas = Canvas.getCanvas();
        if (!canvas) {
            setTimeout(init, 100);
            return;
        }
        setupBrushTool();
        setupToolButtons();
        setupActionButtons();
        setupSymmetryControls();
    }
    
    /**
     * Thiết lập công cụ cọ vẽ (brush) và cơ chế xem trước đối xứng khi vẽ tự do.
     */
    function setupBrushTool() {
        if (!canvas) return;
        
        // 1. Kích hoạt chế độ vẽ tự do (Free Drawing) của Fabric.js
        canvas.isDrawingMode = true;
        
        // 2. Cấu hình cọ vẽ mặc định (Pencil Brush)
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        canvas.freeDrawingBrush.color = drawColor;
        canvas.freeDrawingBrush.width = brushSize;
        canvas.freeDrawingBrush.opacity = brushOpacity / 100;
        canvas.freeDrawingBrush.decimate = 4; // Giảm bớt số lượng điểm để đường vẽ mượt hơn
        
        let mirrorPaths = [];
        let drawingPoints = [];
        
        // 3. Xử lý sự kiện nhấn chuột để bắt đầu vẽ đối xứng thời gian thực
        canvas.on('mouse:down', function(options) {
            if (currentTool !== 'brush' || !SymmetryMode.isEnabled() || !canvas.isDrawingMode) return;
            
            const symmetryCount = SymmetryMode.getSymmetryCount();
            mirrorPaths = [];
            drawingPoints = [Canvas.snapToGrid(canvas.getPointer(options.e))];
            
            // Tạo các đường vẽ ảo (Polyline) để hiển thị các bản sao đối xứng ngay khi đang vẽ
            for (let i = 1; i < symmetryCount; i++) {
                const angle = (i / symmetryCount) * Math.PI * 2;
                const center = Canvas.getCenter();
                const p0 = drawingPoints[0];
                const dx = p0.x - center.x;
                const dy = p0.y - center.y;
                
                // Thuật toán xoay tâm để tìm điểm bắt đầu của bản sao
                const mx = center.x + dx * Math.cos(angle) - dy * Math.sin(angle);
                const my = center.y + dx * Math.sin(angle) + dy * Math.cos(angle);
                
                const polyline = new fabric.Polyline([{x: mx, y: my}], {
                    fill: null,
                    stroke: drawColor,
                    strokeWidth: brushSize,
                    strokeLineCap: 'round',
                    strokeLineJoin: 'round',
                    selectable: false,
                    evented: false,
                    objectCaching: false,
                    opacity: canvas.freeDrawingBrush.opacity || 1
                });
                
                mirrorPaths.push(polyline);
                canvas.add(polyline);
            }
        });
        
        // 4. Cập nhật các đường vẽ ảo khi di chuyển chuột
        canvas.on('mouse:move', function(options) {
            if (currentTool !== 'brush' || !SymmetryMode.isEnabled() || mirrorPaths.length === 0) return;
            
            const center = Canvas.getCenter();
            const symmetryCount = SymmetryMode.getSymmetryCount();
            
            drawingPoints.push(Canvas.snapToGrid(canvas.getPointer(options.e)));
            
            for (let i = 1; i < symmetryCount; i++) {
                const angle = (i / symmetryCount) * Math.PI * 2;
                
                // Tính toán tọa độ đã xoay cho toàn bộ các điểm trong đường vẽ hiện tại
                let transformedPoints = drawingPoints.map(p => {
                    const dx = p.x - center.x;
                    const dy = p.y - center.y;
                    return {
                        x: center.x + dx * Math.cos(angle) - dy * Math.sin(angle),
                        y: center.y + dx * Math.sin(angle) + dy * Math.cos(angle)
                    };
                });
                
                // Cập nhật lại danh sách điểm cho Polyline và yêu cầu vẽ lại
                mirrorPaths[i-1].set({ points: transformedPoints });
                mirrorPaths[i-1]._calcDimensions();
                mirrorPaths[i-1].setCoords();
            }
            canvas.renderAll();
        });
        
        // 5. Xóa bỏ các đường vẽ ảo sau khi kết thúc thao tác chuột (đường vẽ thật sẽ được tạo sau đó)
        canvas.on('mouse:up', function() {
            if (mirrorPaths.length > 0) {
                mirrorPaths.forEach(p => { if (p && canvas) canvas.remove(p); });
                mirrorPaths = [];
                drawingPoints = [];
                canvas.renderAll();
            }
        });
        
        // 6. Sau khi Fabric.js tạo xong đường vẽ thật, áp dụng đối xứng vĩnh viễn
        canvas.on('path:created', function(e) {
            const path = e.path;
            if (!path) return;
            
            // Snap path start and end points if snap is enabled
            if (Canvas.getSnapEnabled() && Canvas.getGridSize() > 0) {
                const gridSize = Canvas.getGridSize();
                if (path.path && path.path.length > 0) {
                    // Snap start point (first command, usually 'M')
                    const startCmd = path.path[0];
                    if (startCmd.length >= 3) {
                        startCmd[1] = Math.round(startCmd[1] / gridSize) * gridSize;
                        startCmd[2] = Math.round(startCmd[2] / gridSize) * gridSize;
                    }
                    // Snap end point (last command)
                    const endCmd = path.path[path.path.length - 1];
                    if (endCmd.length >= 3) {
                        const lastX = endCmd[endCmd.length - 2];
                        const lastY = endCmd[endCmd.length - 1];
                        endCmd[endCmd.length - 2] = Math.round(lastX / gridSize) * gridSize;
                        endCmd[endCmd.length - 1] = Math.round(lastY / gridSize) * gridSize;
                    }
                }
                path.setCoords();
            }
            
            // Đánh dấu đây là nét vẽ từ cọ để tránh hiển thị tùy chọn Fill
            path.isBrushStroke = true;
            
            if (SymmetryMode.isEnabled()) {
                Shapes.applySymmetryToShape(path);
            }
            
            History.add('brush');
        });
    }
    
    /**
     * Thiết lập trình lắng nghe sự kiện cho các nút chọn công cụ trên UI.
     */
    function setupToolButtons() {
        const brushBtn = document.getElementById('brush-tool-button');
        
        if (brushBtn) {
            brushBtn.addEventListener('click', () => setActiveTool('brush'));
        }

        // Setup individual shape buttons
        document.querySelectorAll('.shape-button').forEach(btn => {
            btn.addEventListener('click', () => {
                const shape = btn.dataset.shape;
                Shapes.setShapeType(shape);
                setActiveTool('shape', btn);
            });
        });
    }
    
    /**
     * Thiết lập các nút hành động (Undo, Redo, Xóa, Xuất ảnh, v.v.).
     */
    function setupActionButtons() {
        const undoBtn = document.getElementById('undo-button');
        const redoBtn = document.getElementById('redo-button');
        const deleteBtn = document.getElementById('delete-button');
        const exportBtn = document.getElementById('export-button');
        const shareBtn = document.getElementById('share-button');
        const clearBtn = document.getElementById('clear-button');
        
        if (undoBtn) {
            undoBtn.addEventListener('click', () => History.undo());
        }
        
        if (redoBtn) {
            redoBtn.addEventListener('click', () => History.redo());
        }
        
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                Canvas.deleteSelected();
                History.add('delete');
            });
        }
        
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                Storage.exportPNG();
                showNotification('Exported PNG', 'success');
            });
        }
        
        if (shareBtn) {
            shareBtn.addEventListener('click', () => {
                Storage.shareToClipboard();
                showNotification('Copied to clipboard', 'success');
            });
        }
        
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (confirm('Clear canvas?')) {
                    Canvas.clear();
                    History.add('clear');
                    showNotification('Canvas cleared', 'success');
                }
            });
        }
    }
    
    /**
     * Thiết lập các trình điều khiển cho chế độ đối xứng trên UI.
     */
    function setupSymmetryControls() {
        const symmetryToggle = document.getElementById('symmetry-toggle');
        const symmetryCount = document.getElementById('symmetry-count');
        
        if (symmetryToggle) {
            symmetryToggle.addEventListener('change', (e) => {
                SymmetryMode.setEnabled(e.target.checked);
            });
        }
        
        if (symmetryCount) {
            symmetryCount.addEventListener('change', (e) => {
                SymmetryMode.setSymmetry(parseInt(e.target.value));
            });
        }
    }
    
    /**
     * Kích hoạt một công cụ cụ thể và cập nhật trạng thái UI.
     * @param {string} tool - Tên công cụ cần kích hoạt.
     * @param {HTMLElement} clickedBtn - Nút bấm vừa được click (nếu có).
     */
    function setActiveTool(tool, clickedBtn = null) {
        if (!canvas) return;
        
        currentTool = tool;
        
        document.querySelectorAll('.tool-button, .shape-button').forEach(btn => {
            btn.classList.remove('active');
        });
        
        if (clickedBtn) {
            clickedBtn.classList.add('active');
        } else {
            const toolBtn = document.getElementById(`${tool}-tool-button`);
            if (toolBtn) {
                toolBtn.classList.add('active');
            }
        }
        
        switch (tool) {
            case 'brush':
                canvas.isDrawingMode = true;
                break;
            case 'shape':
                canvas.isDrawingMode = false;
                Shapes.init();
                break;
            default:
                canvas.isDrawingMode = false;
        }

        if (window.Properties) {
            window.Properties.updatePanel();
        }
    }
    
    /**
     * Thiết lập màu vẽ hiện tại.
     * @param {string} color - Mã màu.
     */
    function setDrawColor(color) {
        drawColor = color;
        if (canvas && canvas.freeDrawingBrush) {
            canvas.freeDrawingBrush.color = color;
        }
    }
    
    /**
     * Thiết lập kích thước cọ vẽ.
     * @param {number} size - Kích thước điểm ảnh.
     */
    function setBrushSize(size) {
        brushSize = size;
        if (canvas && canvas.freeDrawingBrush) {
            canvas.freeDrawingBrush.width = size;
        }
    }
    
    /**
     * Thiết lập độ mờ của cọ vẽ.
     * @param {number} opacity - Giá trị (0-100).
     */
    function setBrushOpacity(opacity) {
        brushOpacity = opacity;
        if (canvas && canvas.freeDrawingBrush) {
            canvas.freeDrawingBrush.opacity = opacity / 100;
        }
    }

    /**
     * Lấy kích thước cọ vẽ hiện tại.
     * @returns {number}
     */
    function getBrushSize() {
        return brushSize;
    }
    
    /**
     * Lấy độ mờ cọ vẽ hiện tại.
     * @returns {number}
     */
    function getBrushOpacity() {
        return brushOpacity;
    }
    
    return {
        init,
        setActiveTool,
        setDrawColor,
        setBrushSize,
        setBrushOpacity,
        getDrawColor: () => drawColor,
        getBrushSize,
        getBrushOpacity,
        getCurrentTool: () => currentTool
    };
})();

window.Tools = Tools;
