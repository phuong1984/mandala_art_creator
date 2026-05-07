// Main Application Entry Point
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

/**
 * Khởi tạo ứng dụng Mandala Art Creator.
 * Hàm này thiết lập tất cả các module cần thiết như Canvas, Symmetry, Tools, Shapes, v.v.
 * Nó cũng tải các cài đặt đã lưu và thiết lập các trình lắng nghe sự kiện toàn cục.
 */
function initApp() {
    console.log('Initializing app...');
    
    // 1. Khởi tạo Canvas đầu tiên để các module khác có thể tham chiếu
    Canvas.init();
    
    setTimeout(() => {
        console.log('Initializing modules...');
        
        // 2. Khởi tạo các module chức năng theo thứ tự
        SymmetryMode.init();
        Tools.init();
        Shapes.init();
        Fill.init();
        Layers.init();

        // 3. Khởi tạo hệ thống lưu trữ và đa ngôn ngữ
        Storage.init();
        I18n.init();
        
        // 4. Thiết lập các trình lắng nghe sự kiện UI
        setupGlobalListeners();
        
        // 5. Tải dự án cuối cùng người dùng đã làm việc
        Storage.loadLastProject();
        
        // 6. Cập nhật ngôn ngữ cho giao diện
        I18n.updateUI();
        
        // Lắng nghe sự kiện dự án đã tải để cập nhật UI tương ứng (ví dụ: màu nền)
        EventBus.on('project:loaded', (project) => {
            if (project && project.backgroundColor) {
                const bgColorInput = document.getElementById('bg-color');
                if (bgColorInput) bgColorInput.value = project.backgroundColor;
            }
        });
        
        // Lắng nghe sự kiện chọn màu từ bảng màu để cập nhật công cụ vẽ
        EventBus.on('color:selected', (color) => {
            const drawColorInput = document.getElementById('draw-color');
            if (drawColorInput) drawColorInput.value = color;
            Tools.setDrawColor(color);
        });
        
        // 7. Khởi tạo lịch sử (Undo/Redo) sau khi mọi thứ đã sẵn sàng
        setTimeout(() => {
            History.add('init');
            console.log('App initialized successfully');
        }, 100);
    }, 200);
}

/**
 * Thiết lập các trình lắng nghe sự kiện (event listeners) cho các thành phần giao diện người dùng (UI).
 * Bao gồm chuyển đổi ngôn ngữ, màu nền, màu vẽ, thêm lớp, bật/tắt đối xứng, v.v.
 */
function setupGlobalListeners() {

    // 1. Lắng nghe thay đổi ngôn ngữ
    const langSwitch = document.getElementById('lang-switch');
    if (langSwitch) {
        langSwitch.addEventListener('change', (e) => {
            I18n.setLanguage(e.target.value);
            I18n.updateUI();
            Storage.savePreference('language', e.target.value);
        });
    }
    
    // 2. Lắng nghe thay đổi màu nền canvas
    const bgColorInput = document.getElementById('bg-color');
    if (bgColorInput) {
        bgColorInput.addEventListener('input', (e) => {
            Canvas.setBackgroundColor(e.target.value);
        });
    }
    
    // 3. Lắng nghe thay đổi màu vẽ chính
    const drawColorInput = document.getElementById('draw-color');
    if (drawColorInput) {
        drawColorInput.addEventListener('input', (e) => {
            Tools.setDrawColor(e.target.value);
        });
    }
    
    // 4. Lắng nghe sự kiện thêm lớp (layer) mới
    const addLayerBtn = document.getElementById('add-layer-button');
    if (addLayerBtn) {
        addLayerBtn.addEventListener('click', () => Layers.addLayer());
    }
    
    // 5. Lắng nghe sự kiện bật/tắt hiển thị tâm canvas
    const toggleCenterBtn = document.getElementById('toggle-center-button');
    if (toggleCenterBtn) {
        toggleCenterBtn.addEventListener('click', () => {
            const crosshair = document.getElementById('center-crosshair');
            if (crosshair) {
                crosshair.classList.toggle('hidden');
            }
        });
    }
    
    // 6. Lắng nghe các thay đổi về chế độ đối xứng (bật/tắt và số lượng)
    const symmetryToggle = document.getElementById('symmetry-toggle');
    const symmetryCount = document.getElementById('symmetry-count');
    
    if (symmetryToggle) {
        symmetryToggle.addEventListener('change', (e) => {
            console.log('Symmetry toggle changed:', e.target.checked);
            SymmetryMode.setEnabled(e.target.checked);
            Tools.updateSymmetryUI();
            
            // Hiển thị thông báo trạng thái đối xứng
            if (e.target.checked) {
                showNotification(`Symmetry: ${symmetryCount?.value || 8}-fold`, 'success');
            }
        });
    }
    
    if (symmetryCount) {
        symmetryCount.addEventListener('change', (e) => {
            console.log('Symmetry count changed:', e.target.value);
            SymmetryMode.setSymmetry(parseInt(e.target.value));
        });
    }
    
    // 7. Thiết lập phím tắt và xử lý khi thay đổi kích thước cửa sổ
    document.addEventListener('keydown', handleKeyboardShortcuts);
    window.addEventListener('resize', () => Canvas.handleResize());
    
    // 8. Thiết lập slider điều khiển lưới
    const gridSlider = document.getElementById('grid-slider');
    const gridValue = document.getElementById('grid-value');

    // Các kích thước ô lưới hợp lệ (chia hết cho 800)
    const validGridSizes = [1, 2, 4, 5, 8, 10, 16, 20, 25, 32, 40, 50, 80];

    if (gridSlider) {
        gridSlider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            if (gridValue) {
                gridValue.textContent = val === 0 ? 'Off' : val + 'px';
            }
        });

        gridSlider.addEventListener('change', (e) => {
            const val = parseInt(e.target.value);
            if (val === 0) {
                Canvas.setGridSize(0);
                return;
            }

            // Tìm kích thước hợp lệ gần nhất
            let closest = validGridSizes[0];
            let minDiff = Math.abs(val - closest);
            for (const size of validGridSizes) {
                const diff = Math.abs(val - size);
                if (diff < minDiff) {
                    minDiff = diff;
                    closest = size;
                }
            }

            Canvas.setGridSize(closest);
        });
    }

    // Thiết lập checkbox snap
    const snapCheckbox = document.getElementById('snap-checkbox');
    if (snapCheckbox) {
        snapCheckbox.addEventListener('change', (e) => {
            Canvas.setSnapEnabled(e.target.checked);
        });
    }

    // Thiết lập nút Save
    const saveButton = document.getElementById('save-button');
    if (saveButton) {
        saveButton.addEventListener('click', () => {
            saveProject();
        });
    }

    // Thiết lập nút Load
    const loadButton = document.getElementById('load-button');
    if (loadButton) {
        loadButton.addEventListener('click', () => {
            loadProject();
        });
    }

    // Thiết lập nút Reset to Default
    const resetButton = document.getElementById('reset-button');
    if (resetButton) {
        resetButton.addEventListener('click', () => {
            resetToDefault();
        });
    }
}

/**
 * Cập nhật UI cho brush options.
 */
function updateBrushOptions() {
    const brushSize = document.getElementById('brush-size');
    const brushOpacity = document.getElementById('brush-opacity');
    if (brushSize) {
        const value = brushSize.value;
        brushSize.nextElementSibling.textContent = value;
    }
    if (brushOpacity) {
        const value = brushOpacity.value;
        brushOpacity.nextElementSibling.textContent = value + '%';
    }
}

/**
 * Cập nhật UI cho grid.
 */
function updateGridUI() {
    const gridSlider = document.getElementById('grid-slider');
    const gridValue = document.getElementById('grid-value');
    if (gridSlider && gridValue) {
        const val = parseInt(gridSlider.value);
        gridValue.textContent = val === 0 ? 'Off' : val + 'px';
    }
}

/**
 * Cập nhật UI cho symmetry.
 */
function updateSymmetryUI() {
    const symmetryToggle = document.getElementById('symmetry-toggle');
    const symmetryOptions = document.getElementById('symmetry-options');
    if (symmetryToggle && symmetryOptions) {
        symmetryOptions.style.display = symmetryToggle.checked ? 'block' : 'none';
    }
}

/**
 * Lưu toàn bộ trạng thái dự án thành file JSON.
 */
function saveProject() {
    try {
        const state = {
            canvas: Canvas.toJSON(),
            backgroundColor: document.getElementById('bg-color')?.value || '#ffffff',
            drawColor: document.getElementById('draw-color')?.value || '#000000',
            brushSize: document.getElementById('brush-size')?.value || 5,
            brushOpacity: document.getElementById('brush-opacity')?.value || 100,
            gridSize: Canvas.getGridSize(),
            snapEnabled: Canvas.getSnapEnabled(),
            symmetryEnabled: document.getElementById('symmetry-toggle')?.checked || false,
            symmetryCount: document.getElementById('symmetry-count')?.value || 8,
            layers: Layers.getLayers(),
            history: History.getHistory(),
            zoom: Canvas.getZoom(),
            pan: Canvas.getPan()
        };

        const dataStr = JSON.stringify(state, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'mandala-project.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        alert('Error saving project: ' + error.message);
        console.error('Save project error:', error);
    }
}

/**
 * Tải dự án từ file JSON.
 */
function loadProject() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const state = JSON.parse(event.target.result);
                applyState(state);
            } catch (error) {
                alert('Invalid file format: ' + error.message);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

/**
 * Áp dụng trạng thái từ JSON.
 */
function applyState(state) {
    try {
        // Validate state
        if (!state || typeof state !== 'object') {
            throw new Error('Invalid state object');
        }
        if (!state.canvas) {
            throw new Error('Missing canvas data');
        }

        // Canvas
        Canvas.loadFromJSON(state.canvas, () => {
            try {
                Canvas.setBackgroundColor(state.backgroundColor || '#ffffff');
                Canvas.renderAll();
            } catch (e) {
                console.error('Error setting background:', e);
            }
        });

        // Settings
        const bgColor = document.getElementById('bg-color');
        if (bgColor) bgColor.value = state.backgroundColor || '#ffffff';

        const drawColor = document.getElementById('draw-color');
        if (drawColor) drawColor.value = state.drawColor || '#000000';

        const brushSize = document.getElementById('brush-size');
        if (brushSize) brushSize.value = state.brushSize || 5;

        const brushOpacity = document.getElementById('brush-opacity');
        if (brushOpacity) brushOpacity.value = state.brushOpacity || 100;

        Canvas.setGridSize(state.gridSize || 0);
        Canvas.setSnapEnabled(state.snapEnabled || false);

        const symmetryToggle = document.getElementById('symmetry-toggle');
        if (symmetryToggle) symmetryToggle.checked = state.symmetryEnabled || false;

        const symmetryCount = document.getElementById('symmetry-count');
        if (symmetryCount) symmetryCount.value = state.symmetryCount || 8;

        if (state.layers) Layers.setLayers(state.layers);
        if (state.history) History.setHistory(state.history);

        Canvas.setZoom(state.zoom || 1);
        Canvas.setPan(state.pan || { x: 0, y: 0 });

        // Update UI
        updateBrushOptions();
        updateGridUI();
        updateSymmetryUI();
    } catch (error) {
        alert('Error applying state: ' + error.message);
        console.error('Apply state error:', error);
    }
}

/**
 * Reset tất cả về default.
 */
function resetToDefault() {
    // Reset canvas
    Canvas.clear();

    // Reset settings
    const bgColor = document.getElementById('bg-color');
    if (bgColor) bgColor.value = '#ffffff';

    const drawColor = document.getElementById('draw-color');
    if (drawColor) drawColor.value = '#000000';

    const brushSize = document.getElementById('brush-size');
    if (brushSize) brushSize.value = 5;

    const brushOpacity = document.getElementById('brush-opacity');
    if (brushOpacity) brushOpacity.value = 100;

    Canvas.setGridSize(0);
    Canvas.setSnapEnabled(false);

    const symmetryToggle = document.getElementById('symmetry-toggle');
    if (symmetryToggle) {
        symmetryToggle.checked = true;
        SymmetryMode.setEnabled(true);
    }

    const symmetryCount = document.getElementById('symmetry-count');
    if (symmetryCount) {
        symmetryCount.value = 8;
        SymmetryMode.setSymmetry(8);
    }
    
    // Update symmetry UI to reflect the new state
    SymmetryMode.updateUI();

    Layers.clearLayers();
    History.clear();

    Canvas.resetZoom();
    Canvas.setPan({ x: 0, y: 0 });

    // Update UI
    updateBrushOptions();
    updateGridUI();
    updateSymmetryUI();
}

/**
 * Xử lý các phím tắt bàn phím cho ứng dụng.
 * @param {KeyboardEvent} e - Đối tượng sự kiện bàn phím.
 * Các phím tắt bao gồm: Ctrl+Z (Hoàn tác), Ctrl+Y (Làm lại), phím tắt cho công cụ (B, S, F), v.v.
 */
function handleKeyboardShortcuts(e) {
    // 1. Không xử lý phím tắt nếu người dùng đang nhập liệu trong các ô input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || 
        e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return;
    }
    
    const isCtrl = e.ctrlKey || e.metaKey;
    
    // 2. Xử lý logic cho từng phím
    switch (e.key) {
        case 'z': // Ctrl + Z: Hoàn tác
            if (isCtrl) { e.preventDefault(); History.undo(); }
            break;
        case 'y': // Ctrl + Y: Làm lại
            if (isCtrl) { e.preventDefault(); History.redo(); }
            break;
        case 'Delete': // Ctrl + Delete/Backspace: Xóa đối tượng đang chọn
        case 'Backspace':
            if (isCtrl) { e.preventDefault(); Canvas.deleteSelected(); }
            break;
        case '=': // Ctrl + '+': Phóng to
        case '+':
            if (isCtrl) { e.preventDefault(); Canvas.zoomIn(); Canvas.updateZoomDisplay(); }
            break;
        case '-': // Ctrl + '-': Thu nhỏ
            if (isCtrl) { e.preventDefault(); Canvas.zoomOut(); Canvas.updateZoomDisplay(); }
            break;
        case '0': // Ctrl + 0: Đặt lại zoom 100%
            if (isCtrl) { e.preventDefault(); Canvas.resetZoom(); Canvas.updateZoomDisplay(); }
            break;
        case 'Escape': // Escape: Hủy chọn đối tượng
            const canvas = Canvas.getCanvas();
            if (canvas) {
                canvas.discardActiveObject();
                canvas.renderAll();
            }
            break;
        case 'b': // B: Chọn công cụ cọ vẽ (Brush)
            if (!isCtrl) Tools.setActiveTool('brush');
            break;
        case 's': // S: Chọn công cụ hình khối (Shape)
            if (!isCtrl) Tools.setActiveTool('shape');
            break;
        case 'f': // F: Chọn công cụ tô màu (Fill)
            if (!isCtrl) Tools.setActiveTool('fill');
            break;
        case 'm': // M: Bật/tắt đối xứng (Symmetry)
            if (!isCtrl) {
                SymmetryMode.setEnabled(!SymmetryMode.isEnabled());
                const toggle = document.getElementById('symmetry-toggle');
                if (toggle) toggle.checked = SymmetryMode.isEnabled();
                Tools.updateSymmetryUI();
            }
            break;
    }
}

/**
 * Hiển thị thông báo tạm thời trên giao diện người dùng.
 * @param {string} message - Nội dung thông báo cần hiển thị.
 * @param {string} type - Loại thông báo (ví dụ: 'success', 'error') để áp dụng kiểu CSS tương ứng.
 */
function showNotification(message, type = '') {
    let notification = document.querySelector('.notification');
    
    // 1. Tạo phần tử thông báo nếu chưa tồn tại
    if (!notification) {
        notification = document.createElement('div');
        notification.className = 'notification';
        document.body.appendChild(notification);
    }
    
    // 2. Thiết lập nội dung và kiểu dáng (success, error, v.v.)
    notification.textContent = message;
    notification.className = 'notification ' + type;
    
    // 3. Hiệu ứng hiển thị bằng cách thêm class 'show' sau một khoảng thời gian cực ngắn
    setTimeout(() => notification.classList.add('show'), 10);
    
    // 4. Tự động ẩn thông báo sau 2 giây
    setTimeout(() => notification.classList.remove('show'), 2000);
}