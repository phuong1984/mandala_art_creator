/**
 * Module Palette quản lý các bảng màu có sẵn và màu sắc gần đây.
 * Cung cấp giao diện để người dùng chọn nhanh các bộ màu theo chủ đề.
 */
const Palette = (function() {
    /** @type {Object} Định nghĩa các bộ màu có sẵn theo chủ đề */
    const presetPalettes = {
        rainbow: ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3'],
        pastel: ['#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF', '#E0BBE4', '#FEC8D8'],
        earth: ['#8B4513', '#A0522D', '#CD853F', '#DEB887', '#D2691E', '#556B2F', '#6B8E23'],
        ocean: ['#000080', '#0000FF', '#00CED1', '#20B2AA', '#48D1CC', '#40E0D0', '#7FFFD4'],
        sunset: ['#FF4500', '#FF6347', '#FF7F50', '#FFA07A', '#FFB6C1', '#FF69B4', '#FF1493'],
        forest: ['#228B22', '#006400', '#32CD32', '#90EE90', '#8FBC8F', '#2E8B57', '#3CB371'],
        neon: ['#FF00FF', '#00FF00', '#00FFFF', '#FFFF00', '#FF0080', '#00FF80', '#8000FF'],
        grayscale: ['#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#E0E0E0', '#FFFFFF']
    };
    
    /** @type {string} Tên bảng màu đang được sử dụng */
    let currentPalette = 'rainbow';
    /** @type {Array<string>} Danh sách các màu đã sử dụng gần đây */
    let recentColors = [];
    /** @type {number} Số lượng màu gần đây tối đa được lưu trữ */
    const maxRecentColors = 10;
    
    /**
     * Khởi tạo module Palette.
     */
    function init() {
        loadRecentColors();
        setupPaletteButton();
    }
    
    /**
     * Thiết lập trình lắng nghe cho nút mở bảng màu.
     */
    function setupPaletteButton() {
        const paletteBtn = document.getElementById('palette-button');
        if (paletteBtn) {
            paletteBtn.addEventListener('click', togglePaletteDropdown);
        }
    }
    
    /**
     * Bật/tắt hiển thị danh sách bảng màu.
     */
    function togglePaletteDropdown() {
        console.log('Toggle palette dropdown clicked');
        let dropdown = document.querySelector('.color-palette-dropdown');
        
        // 1. Nếu dropdown chưa được tạo, tiến hành tạo và gắn vào DOM
        if (!dropdown) {
            dropdown = createPaletteDropdown();
            const colorsGroup = document.querySelector('.tool-group.colors');
            if (colorsGroup) {
                colorsGroup.appendChild(dropdown);
            } else {
                document.body.appendChild(dropdown);
            }
        }
        
        // 2. Sử dụng class 'show' để bật/tắt hiển thị dropdown (thông qua CSS)
        dropdown.classList.toggle('show');
    }
    
    /**
     * Tạo phần tử HTML cho dropdown bảng màu.
     * @returns {HTMLElement}
     */
    function createPaletteDropdown() {
        const container = document.createElement('div');
        container.className = 'color-palette-dropdown';
        
        const selector = document.createElement('div');
        selector.className = 'palette-selector';
        selector.innerHTML = `
            <label>Palette:</label>
            <select id="palette-select">
                ${Object.keys(presetPalettes).map(key => `<option value="${key}">${key.charAt(0).toUpperCase() + key.slice(1)}</option>`).join('')}
            </select>
        `;
        
        const colorGrid = document.createElement('div');
        colorGrid.className = 'palette-colors';
        colorGrid.id = 'palette-colors';
        
        container.appendChild(selector);
        container.appendChild(colorGrid);
        
        selector.querySelector('select').addEventListener('change', (e) => {
            setActivePalette(e.target.value);
        });
        
        renderPaletteColors();
        
        return container;
    }
    
    /**
     * Thiết lập bảng màu hiện tại.
     * @param {string} paletteName - Tên bảng màu (ví dụ: 'ocean', 'forest').
     */
    function setActivePalette(paletteName) {
        // 1. Cập nhật tên bảng màu hiện tại
        currentPalette = paletteName;
        // 2. Vẽ lại các ô màu trên giao diện ứng với bảng màu mới
        renderPaletteColors();
        
        // 3. Tự động chọn màu đầu tiên trong bảng màu mới làm màu vẽ mặc định
        const firstColor = presetPalettes[paletteName]?.[0] || '#000000';
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('color:selected', firstColor);
        }
    }
    
    /**
     * Hiển thị các ô màu của bảng màu hiện tại lên UI.
     */
    function renderPaletteColors() {
        const colorGrid = document.getElementById('palette-colors');
        if (!colorGrid) return;
        
        const colors = presetPalettes[currentPalette] || [];
        
        colorGrid.innerHTML = colors.map(color => `
            <div class="color-option" style="background-color: ${color}" data-color="${color}" title="${color}"></div>
        `).join('');
        
        colorGrid.querySelectorAll('.color-option').forEach(option => {
            option.addEventListener('click', () => selectColor(option.dataset.color));
        });
    }
    
    /**
     * Chọn một màu sắc cụ thể.
     * @param {string} color - Mã màu đã chọn.
     */
    function selectColor(color) {
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('color:selected', color);
        }
        addToRecentColors(color);
        
        const dropdown = document.querySelector('.color-palette-dropdown');
        if (dropdown) {
            dropdown.classList.remove('show');
        }
    }
    
    /**
     * Thêm một màu vào danh sách các màu vừa sử dụng.
     * @param {string} color - Mã màu.
     */
    function addToRecentColors(color) {
        // 1. Loại bỏ màu này nếu nó đã tồn tại trong danh sách để tránh trùng lặp
        recentColors = recentColors.filter(c => c !== color);
        // 2. Thêm màu mới vào đầu danh sách (màu mới nhất)
        recentColors.unshift(color);
        // 3. Giới hạn số lượng màu lưu trữ tối đa (mặc định là 10)
        if (recentColors.length > maxRecentColors) {
            recentColors = recentColors.slice(0, maxRecentColors);
        }
        // 4. Lưu lại vào bộ nhớ trình duyệt
        saveRecentColors();
    }
    
    /**
     * Lưu danh sách màu gần đây vào Local Storage.
     */
    function saveRecentColors() {
        try {
            localStorage.setItem('mandala_recent_colors', JSON.stringify(recentColors));
        } catch (e) {
            console.error('Save recent colors error:', e);
        }
    }
    
    /**
     * Tải danh sách màu gần đây từ Local Storage.
     */
    function loadRecentColors() {
        try {
            const saved = localStorage.getItem('mandala_recent_colors');
            if (saved) {
                recentColors = JSON.parse(saved);
            }
        } catch (e) {
            console.error('Load recent colors error:', e);
        }
    }
    
    return { init, selectColor, setActivePalette, getRecentColors: () => recentColors };
})();

window.Palette = Palette;