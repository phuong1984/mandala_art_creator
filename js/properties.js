/**
 * Module Properties quản lý bảng thuộc tính của đối tượng đang được chọn hoặc công cụ hiện tại.
 * Tích hợp các cài đặt của công cụ (Brush, Shapes) và thuộc tính đối tượng vào một nơi duy nhất.
 */
const Properties = (function() {
    let canvas = null;
    let panel = null;
    let panelTitle = null;
    let strokeColorInput = null;
    let strokeRow = null;
    let strokeNoneBtn = null;
    let fillColorInput = null;
    let fillRow = null;
    let fillNoneBtn = null;
    let strokeWidthInput = null;
    let strokeWidthLabel = null;
    let strokeWidthValue = null;
    let opacityInput = null;
    let opacityRow = null;
    let opacityValue = null;
    let applySymmetryCheckbox = null;
    let symmetryRow = null;
    let isUpdatingUI = false;

    /**
     * Khởi tạo module Properties.
     */
    function init() {
        canvas = Canvas.getCanvas();
        if (!canvas) {
            setTimeout(init, 100);
            return;
        }

        panel = document.getElementById('properties-panel');
        panelTitle = document.getElementById('prop-panel-title');
        strokeColorInput = document.getElementById('prop-stroke-color');
        strokeRow = document.getElementById('prop-stroke-row');
        strokeNoneBtn = document.getElementById('prop-stroke-none');
        fillColorInput = document.getElementById('prop-fill-color');
        fillRow = document.getElementById('prop-fill-row');
        fillNoneBtn = document.getElementById('prop-fill-none');
        strokeWidthInput = document.getElementById('prop-stroke-width');
        strokeWidthLabel = document.getElementById('prop-width-label');
        strokeWidthValue = strokeWidthInput.parentElement.querySelector('.value');
        opacityInput = document.getElementById('prop-opacity');
        opacityRow = document.getElementById('prop-opacity-row');
        opacityValue = opacityInput.parentElement.querySelector('.value');
        applySymmetryCheckbox = document.getElementById('prop-apply-symmetry');
        symmetryRow = document.getElementById('prop-symmetry-row');

        setupEventListeners();
        updatePanel(); // Khởi tạo hiển thị ban đầu
    }

    /**
     * Thiết lập các trình lắng nghe sự kiện.
     */
    function setupEventListeners() {
        // Lắng nghe sự kiện chọn đối tượng trên canvas
        canvas.on('selection:created', (e) => updatePanel(e.selected[0]));
        canvas.on('selection:updated', (e) => updatePanel(e.selected[0]));
        canvas.on('selection:cleared', () => updatePanel());

        // Lắng nghe sự kiện thay đổi trên UI
        strokeColorInput.addEventListener('input', (e) => {
            if (isUpdatingUI) return;
            strokeNoneBtn.classList.remove('active');
            handlePropertyChange('stroke', e.target.value);
        });

        fillColorInput.addEventListener('input', (e) => {
            if (isUpdatingUI) return;
            fillNoneBtn.classList.remove('active');
            handlePropertyChange('fill', e.target.value);
        });

        strokeNoneBtn.addEventListener('click', () => {
            if (isUpdatingUI) return;
            const isActive = strokeNoneBtn.classList.toggle('active');
            handlePropertyChange('stroke', isActive ? 'transparent' : strokeColorInput.value);
        });

        fillNoneBtn.addEventListener('click', () => {
            if (isUpdatingUI) return;
            const isActive = fillNoneBtn.classList.toggle('active');
            handlePropertyChange('fill', isActive ? 'transparent' : fillColorInput.value);
        });

        strokeWidthInput.addEventListener('input', (e) => {
            if (isUpdatingUI) return;
            const value = parseInt(e.target.value);
            strokeWidthValue.textContent = value;
            handlePropertyChange('strokeWidth', value);
        });

        opacityInput.addEventListener('input', (e) => {
            if (isUpdatingUI) return;
            const value = parseInt(e.target.value);
            opacityValue.textContent = value + '%';
            handlePropertyChange('opacity', value / 100);
        });

        // Lưu lịch sử khi người dùng kết thúc thao tác (thả chuột)
        [strokeColorInput, fillColorInput, strokeWidthInput, opacityInput].forEach(input => {
            input.addEventListener('change', (e) => {
                if (isUpdatingUI) return;
                const property = input.id.replace('prop-', '').replace('-color', '');
                History.add(`change ${property}`);
            });
        });
    }

    /**
     * Cập nhật hiển thị của bảng thuộc tính.
     * Nếu có đối tượng được chọn, hiển thị thuộc tính của đối tượng.
     * Nếu không, hiển thị cài đặt của công cụ hiện tại.
     * @param {fabric.Object} obj - Đối tượng đang được chọn (tùy chọn).
     */
    function updatePanel(obj = null) {
        const activeObj = obj || canvas.getActiveObject();
        isUpdatingUI = true;

        if (activeObj) {
            // HIỂN THỊ THUỘC TÍNH ĐỐI TƯỢNG
            panelTitle.setAttribute('data-i18n', 'properties.title');
            I18n.updateElement(panelTitle);
            
            strokeRow.style.display = 'flex';
            symmetryRow.style.display = 'flex';
            opacityRow.style.display = 'flex';
            
            // Stroke Width label
            strokeWidthLabel.setAttribute('data-i18n', 'properties.strokeWidth');
            I18n.updateElement(strokeWidthLabel);

            // Cập nhật giá trị
            var isStrokeTransparent = !activeObj.stroke || activeObj.stroke === 'transparent';
            strokeColorInput.value = isStrokeTransparent ? '#000000' : formatColorToHex(activeObj.stroke);
            strokeNoneBtn.classList.toggle('active', isStrokeTransparent);
            
            if (isFillable(activeObj)) {
                fillRow.style.display = 'flex';
                var isFillTransparent = !activeObj.fill || activeObj.fill === 'transparent';
                fillColorInput.value = isFillTransparent ? '#ffffff' : formatColorToHex(activeObj.fill);
                fillNoneBtn.classList.toggle('active', isFillTransparent);
            } else {
                fillRow.style.display = 'none';
            }

            const sw = activeObj.strokeWidth !== undefined ? activeObj.strokeWidth : 0;
            strokeWidthInput.value = sw;
            strokeWidthValue.textContent = sw;

            const op = Math.round((activeObj.opacity !== undefined ? activeObj.opacity : 1) * 100);
            opacityInput.value = op;
            opacityValue.textContent = op + '%';

        } else {
            // HIỂN THỊ CÀI ĐẶT CÔNG CỤ
            const currentTool = Tools.getCurrentTool();
            panelTitle.textContent = currentTool === 'brush' ? 'Brush Settings' : 'Shape Settings';
            
            symmetryRow.style.display = 'none';
            strokeRow.style.display = 'flex';
            opacityRow.style.display = 'flex';
            
            // Đổi label Width thành Size nếu là Brush
            strokeWidthLabel.setAttribute('data-i18n', currentTool === 'brush' ? 'tools.size' : 'properties.strokeWidth');
            I18n.updateElement(strokeWidthLabel);

            if (currentTool === 'brush') {
                fillRow.style.display = 'none';
                strokeColorInput.value = Tools.getDrawColor();
                strokeWidthInput.value = Tools.getBrushSize();
                strokeWidthValue.textContent = Tools.getBrushSize();
                opacityInput.value = Tools.getBrushOpacity();
                opacityValue.textContent = Tools.getBrushOpacity() + '%';
            } else {
                fillRow.style.display = 'flex';
                strokeColorInput.value = Tools.getDrawColor();
                strokeNoneBtn.classList.remove('active');
                fillColorInput.value = '#ffffff';
                fillNoneBtn.classList.add('active');
                strokeWidthInput.value = 2;
                strokeWidthValue.textContent = 2;
                opacityInput.value = 100;
                opacityValue.textContent = '100%';
            }
        }

        isUpdatingUI = false;
    }

    /**
     * Xử lý khi có thay đổi thuộc tính trên UI.
     */
    function handlePropertyChange(property, value) {
        const activeObject = canvas.getActiveObject();

        if (activeObject) {
            // Áp dụng cho đối tượng được chọn
            updateObjectProperty(activeObject, property, value);
        } else {
            // Áp dụng cho công cụ hiện tại
            updateToolProperty(property, value);
        }
    }

    /**
     * Cập nhật thuộc tính cho công cụ.
     */
    function updateToolProperty(property, value) {
        const currentTool = Tools.getCurrentTool();
        
        if (property === 'stroke') {
            Tools.setDrawColor(value);
            // Sync with toolbar FG color input if exists
            const fgInput = document.getElementById('draw-color');
            if (fgInput) fgInput.value = value;
        } else if (property === 'strokeWidth') {
            if (currentTool === 'brush') Tools.setBrushSize(value);
            // else update default shape width
        } else if (property === 'opacity') {
            if (currentTool === 'brush') Tools.setBrushOpacity(value * 100);
        } else if (property === 'fill') {
            if (currentTool === 'brush') {
                // brush doesn't use fill
            } else {
                Tools.setDrawColor(value);
                const fgInput = document.getElementById('draw-color');
                if (fgInput && value !== 'transparent') fgInput.value = value;
            }
        }
    }

    /**
     * Cập nhật thuộc tính cho đối tượng.
     */
    function updateObjectProperty(obj, property, value) {
        const applyToSymmetry = applySymmetryCheckbox.checked;
        const symmetryGroup = obj.symmetryGroup;

        if (applyToSymmetry && symmetryGroup !== undefined) {
            canvas.forEachObject((o) => {
                if (o.symmetryGroup === symmetryGroup) {
                    o.set(property, value);
                    if (property === 'opacity') o.originalOpacity = value;
                    o.setCoords();
                }
            });
        } else {
            obj.set(property, value);
            if (property === 'opacity') obj.originalOpacity = value;
            obj.setCoords();
        }

        canvas.renderAll();
        History.add(`change ${property}`);
    }

    /**
     * Kiểm tra xem đối tượng có thể tô màu được không.
     */
    function isFillable(obj) {
        if (!obj) return false;
        const type = obj.type;
        if (type === 'line') return false;
        if (obj.isBrushStroke) return false;
        if (type === 'path' && obj.fill === null) return false;
        return ['rect', 'circle', 'ellipse', 'triangle', 'polygon', 'path'].includes(type);
    }

    /**
     * Chuyển đổi màu sang định dạng Hex.
     */
    function formatColorToHex(color) {
        if (typeof color !== 'string') return '#000000';
        if (color === 'transparent') return '#000000';
        if (color.startsWith('#')) return color;
        if (color.startsWith('rgb')) {
            var parts = color.match(/\d+/g);
            if (parts) {
                var r = parseInt(parts[0]).toString(16).padStart(2, '0');
                var g = parseInt(parts[1]).toString(16).padStart(2, '0');
                var b = parseInt(parts[2]).toString(16).padStart(2, '0');
                return '#' + r + g + b;
            }
        }
        return '#000000';
    }

    return {
        init,
        updatePanel
    };
})();

// Khởi tạo
document.addEventListener('DOMContentLoaded', () => {
    Properties.init();
});

window.Properties = Properties;
