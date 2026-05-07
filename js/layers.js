/**
 * Module Layers quản lý hệ thống các lớp (layers) cho canvas.
 * Cho phép người dùng thêm, xóa, ẩn/hiện, khóa và thay đổi độ mờ của từng lớp.
 */
const Layers = (function() {
    /** @type {Array<Object>} Danh sách các đối tượng lớp */
    let layers = [];
    /** @type {number} Chỉ số của lớp đang được chọn */
    let activeLayerIndex = 0;
    /** @type {number} Biến đếm để tạo ID duy nhất cho mỗi lớp mới */
    let layerCounter = 0;
    
    /**
     * Khởi tạo module Layers và thiết lập các sự kiện liên quan trên canvas.
     */
    function init() {
        // 1. Tạo các lớp mặc định ban đầu
        createDefaultLayers();
        // 2. Cập nhật danh sách lớp lên UI
        renderLayerList();
        
        const canvas = Canvas.getCanvas();
        if (canvas) {
            // 3. Lắng nghe sự kiện thêm đối tượng mới để gán cho lớp hiện tại
            canvas.on('object:added', function(e) {
                const obj = e.target;
                // Nếu đối tượng chưa có layerId (vừa vẽ xong), gán nó vào lớp đang hoạt động
                if (!obj.layerId) {
                    const activeLayer = getActiveLayer();
                    if (activeLayer) {
                        obj.layerId = activeLayer.id;
                        obj.customId = true;
                    }
                }
                
                // Cập nhật các thuộc tính hiển thị dựa trên trạng thái của lớp (ẩn, khóa, độ mờ)
                const layer = layers.find(l => l.id === obj.layerId);
                if (layer) {
                    const isActive = (layer.id === getActiveLayer()?.id);
                    obj.visible = layer.visible;
                    obj.opacity = (obj.originalOpacity !== undefined ? obj.originalOpacity : 1) * (layer.opacity / 100);
                    obj.selectable = isActive && !layer.locked;
                    obj.evented = isActive && !layer.locked;
                }
            });
            
            // 4. Lắng nghe các sự kiện tải dự án hoặc thay đổi lịch sử để đồng bộ lại các lớp
            if (typeof EventBus !== 'undefined') {
                EventBus.on('project:loaded', () => syncAllLayers());
                EventBus.on('history:changed', () => syncAllLayers());
            }
        }
    }
    
    /**
     * Đồng bộ hóa tất cả đối tượng trên canvas với các thuộc tính của lớp tương ứng (ẩn/hiện, độ mờ, khóa).
     */
    function syncAllLayers() {
        const canvas = Canvas.getCanvas();
        if (!canvas) return;
        
        const activeLayerId = getActiveLayer()?.id;
        
        // 1. Duyệt qua từng đối tượng trên canvas để áp dụng trạng thái lớp
        canvas.getObjects().forEach(obj => {
            if (!obj.layerId) return;
            const layer = layers.find(l => l.id === obj.layerId);
            if (layer) {
                const isActive = (layer.id === activeLayerId);
                // Cập nhật ẩn hiện
                obj.visible = layer.visible;
                // Lưu lại độ mờ gốc nếu chưa có
                if (obj.originalOpacity === undefined) obj.originalOpacity = obj.opacity || 1;
                // Tính toán độ mờ thực tế dựa trên độ mờ của lớp
                obj.opacity = obj.originalOpacity * (layer.opacity / 100);
                // Khóa tương tác nếu lớp bị khóa hoặc không phải lớp đang hoạt động
                obj.selectable = isActive && !layer.locked;
                obj.evented = isActive && !layer.locked;
            }
        });
        
        // 2. Sắp xếp lại thứ tự vẽ các lớp (z-index)
        sortCanvasObjects();
        // 3. Vẽ lại toàn bộ canvas
        canvas.renderAll();
    }
    
    /**
     * Đồng bộ hóa trạng thái cho một lớp cụ thể.
     * @param {string} layerId - ID của lớp cần đồng bộ.
     */
    function syncLayerState(layerId) {
        const canvas = Canvas.getCanvas();
        if (!canvas) return;
        
        const layer = layers.find(l => l.id === layerId);
        if (!layer) return;
        
        const isActive = (layer.id === getActiveLayer()?.id);
        
        canvas.getObjects().forEach(obj => {
            if (obj.layerId === layerId) {
                obj.visible = layer.visible;
                if (obj.originalOpacity === undefined) obj.originalOpacity = obj.opacity || 1;
                obj.opacity = obj.originalOpacity * (layer.opacity / 100);
                obj.selectable = isActive && !layer.locked;
                obj.evented = isActive && !layer.locked;
            }
        });
        
        canvas.renderAll();
    }
    
    /**
     * Sắp xếp thứ tự hiển thị (z-index) của các đối tượng trên canvas dựa trên thứ tự các lớp.
     */
    function sortCanvasObjects() {
        const canvas = Canvas.getCanvas();
        if (!canvas) return;
        
        const objects = canvas.getObjects();
        // 1. Thuật toán sắp xếp: Dựa vào vị trí của layerId trong mảng layers (lớp bên dưới mảng sẽ được vẽ trước)
        objects.sort((a, b) => {
            const indexA = layers.findIndex(l => l.id === a.layerId);
            const indexB = layers.findIndex(l => l.id === b.layerId);
            return indexA - indexB;
        });
        
        // 2. Áp dụng thứ tự mới bằng cách di chuyển (moveTo) từng đối tượng
        objects.forEach((obj, idx) => {
            obj.moveTo(idx);
        });
    }
    
    /**
     * Tạo lớp mặc định ban đầu khi ứng dụng khởi chạy.
     */
    function createDefaultLayers() {
        layers = [
            {
                id: generateLayerId(),
                name: 'Layer 1',
                visible: true,
                locked: false,
                opacity: 100
            }
        ];
    }
    
    /**
     * Tạo một mã định danh duy nhất cho lớp mới.
     * @returns {string}
     */
    function generateLayerId() {
        return 'layer_' + (++layerCounter);
    }
    

    
    /**
     * Vẽ lại danh sách các lớp lên giao diện người dùng.
     */
    function renderLayerList() {
        const layerList = document.getElementById('layer-list');
        if (!layerList) return;
        
        layerList.innerHTML = '';
        
        [...layers].reverse().forEach((layer, reverseIndex) => {
            const actualIndex = layers.length - 1 - reverseIndex;
            const layerItem = createLayerElement(layer, actualIndex, reverseIndex);
            layerList.appendChild(layerItem);
        });
    }
    
    /**
     * Tạo phần tử HTML đại diện cho một lớp trong danh sách UI.
     * @param {Object} layer - Đối tượng lớp.
     * @param {number} actualIndex - Vị trí thực trong mảng layers.
     * @param {number} reverseIndex - Vị trí trong UI (từ trên xuống).
     * @returns {HTMLElement}
     */
    function createLayerElement(layer, actualIndex, reverseIndex) {
        const div = document.createElement('div');
        div.className = 'layer-item' + (actualIndex === activeLayerIndex ? ' active' : '');
        div.dataset.index = actualIndex;
        
        // Thêm grip handle cho drag and drop
        const grip = document.createElement('span');
        grip.className = 'layer-grip';
        grip.textContent = '☰';
        grip.title = 'Kéo để thay đổi thứ tự';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = layer.visible;
        checkbox.dataset.action = 'visibility';
        checkbox.addEventListener('change', (e) => toggleLayerVisibility(actualIndex, e.target.checked));
        
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'layer-name';
        nameInput.value = layer.name;
        nameInput.dataset.action = 'rename';
        nameInput.addEventListener('change', (e) => renameLayer(actualIndex, e.target.value));
        
        const opacitySlider = document.createElement('input');
        opacitySlider.type = 'range';
        opacitySlider.className = 'layer-opacity-slider';
        opacitySlider.min = '0';
        opacitySlider.max = '100';
        opacitySlider.value = layer.opacity;
        opacitySlider.addEventListener('input', (e) => setLayerOpacity(actualIndex, parseInt(e.target.value), false));
        opacitySlider.addEventListener('change', (e) => {
            setLayerOpacity(actualIndex, parseInt(e.target.value), true);
        });
        
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'layer-actions';
        
        const lockBtn = document.createElement('button');
        lockBtn.className = 'icon-button';
        lockBtn.dataset.action = 'lock';
        lockBtn.title = layer.locked ? 'Unlock' : 'Lock';
        lockBtn.textContent = layer.locked ? '🔒' : '📷';
        lockBtn.addEventListener('click', () => toggleLayerLock(actualIndex));
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'icon-button';
        deleteBtn.dataset.action = 'delete';
        deleteBtn.title = 'Delete';
        deleteBtn.textContent = '🗑️';
        deleteBtn.addEventListener('click', () => deleteLayer(actualIndex));
        
        actionsDiv.appendChild(lockBtn);
        actionsDiv.appendChild(deleteBtn);
        
        div.appendChild(grip);
        div.appendChild(checkbox);
        div.appendChild(nameInput);
        div.appendChild(opacitySlider);
        div.appendChild(actionsDiv);
        
        div.addEventListener('click', (e) => {
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON' && e.target !== grip) {
                setActiveLayer(actualIndex);
            }
        });
        
        // Thêm drag and drop events
        setupLayerDragAndDrop(div, actualIndex, reverseIndex);
        
        return div;
    }
    
    /**
     * Thiết lập các sự kiện kéo thả cho layer element.
     * @param {HTMLElement} element - Phần tử layer.
     * @param {number} actualIndex - Vị trí thực trong mảng layers.
     * @param {number} reverseIndex - Vị trí trong UI (từ trên xuống).
     */
    function setupLayerDragAndDrop(element, actualIndex, reverseIndex) {
        const grip = element.querySelector('.layer-grip');
        
        element.addEventListener('dragstart', (e) => {
            element.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', reverseIndex.toString());
        });
        
        element.addEventListener('dragend', () => {
            element.classList.remove('dragging');
            element.draggable = false;
            clearDropIndicators();
        });
        
        element.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            const layerList = document.getElementById('layer-list');
            if (!layerList) return;
            
            const items = Array.from(layerList.querySelectorAll('.layer-item:not(.dragging)'));
            
            clearDropIndicators();
            
            // Tìm vị trí insert dựa trên vị trí chuột
            let insertBeforeIndex = items.length;
            for (let i = 0; i < items.length; i++) {
                const rect = items[i].getBoundingClientRect();
                if (e.clientY < rect.top + rect.height / 2) {
                    insertBeforeIndex = i;
                    items[i].classList.add('drop-indicator');
                    break;
                }
            }
            
            // Nếu không tìm thấy, highlight bottom
            if (insertBeforeIndex === items.length && items.length > 0) {
                items[items.length - 1].classList.add('drop-indicator');
            }
        });
        
        element.addEventListener('dragleave', () => {
            // Không cần làm gì, dragover sẽ xử lý
        });
        
        element.addEventListener('drop', (e) => {
            e.preventDefault();
            
            const draggedReverseIndex = parseInt(e.dataTransfer.getData('text/plain'));
            const layerList = document.getElementById('layer-list');
            const items = Array.from(layerList.querySelectorAll('.layer-item:not(.dragging)'));
            
            // Tìm vị trí insert
            let insertBeforeIndex = items.length;
            for (let i = 0; i < items.length; i++) {
                const rect = items[i].getBoundingClientRect();
                if (e.clientY < rect.top + rect.height / 2) {
                    insertBeforeIndex = i;
                    break;
                }
            }
            
            const toReverseIndex = insertBeforeIndex;
            const fromReverseIndex = draggedReverseIndex;
            
            if (fromReverseIndex === toReverseIndex) {
                clearDropIndicators();
                return;
            }
            
            // Chuyển đổi sang index trong mảng layers
            const fromIndex = layers.length - 1 - fromReverseIndex;
            const toIndex = layers.length - 1 - toReverseIndex;
            
            moveLayer(fromIndex, toIndex);
            clearDropIndicators();
        });
        
        // Chỉ cho phép kéo khi nhấn vào grip handle
        grip.addEventListener('mousedown', () => {
            element.draggable = true;
        });
    }
    
    /**
     * Xóa các indicator highlight khỏi tất cả layer items.
     */
    function clearDropIndicators() {
        document.querySelectorAll('.layer-item.drop-indicator').forEach(el => {
            el.classList.remove('drop-indicator');
        });
    }
    
    /**
     * Thêm một lớp mới vào danh sách.
     */
    function addLayer() {
        const newLayer = {
            id: generateLayerId(),
            name: `Layer ${layers.length + 1}`,
            visible: true,
            locked: false,
            opacity: 100
        };
        
        layers.push(newLayer);
        setActiveLayer(layers.length - 1);
        renderLayerList();
    }
    
    /**
     * Xóa một lớp và tất cả các đối tượng thuộc lớp đó.
     * @param {number} index - Vị trí lớp cần xóa.
     */
    function deleteLayer(index) {
        // 1. Không cho phép xóa nếu chỉ còn một lớp duy nhất
        if (layers.length <= 1) return;
        
        const layerId = layers[index].id;
        // 2. Xóa lớp khỏi danh sách quản lý
        layers.splice(index, 1);
        
        // 3. Cập nhật lại chỉ số lớp hoạt động nếu cần
        if (activeLayerIndex >= layers.length) {
            activeLayerIndex = layers.length - 1;
        }
        
        const canvas = Canvas.getCanvas();
        if (canvas) {
            // 4. Tìm và xóa tất cả các hình khối thuộc lớp vừa bị xóa khỏi canvas
            const objectsToRemove = canvas.getObjects().filter(obj => obj.layerId === layerId);
            objectsToRemove.forEach(obj => canvas.remove(obj));
        }
        
        // 5. Cập nhật giao diện và đồng bộ lại các lớp còn lại
        renderLayerList();
        syncAllLayers();
        if (typeof History !== 'undefined') History.add('delete layer');
    }
    
    /**
     * Thiết lập một lớp làm lớp hoạt động (lớp đang vẽ).
     * @param {number} index - Vị trí lớp.
     */
    function setActiveLayer(index) {
        activeLayerIndex = index;
        renderLayerList();
        syncAllLayers();
    }
    
    /**
     * Lấy thông tin lớp đang hoạt động.
     * @returns {Object}
     */
    function getActiveLayer() {
        return layers[activeLayerIndex];
    }
    
    /**
     * Bật hoặc tắt khả năng hiển thị của một lớp.
     * @param {number} index - Vị trí lớp.
     * @param {boolean} visible - Trạng thái hiển thị.
     */
    function toggleLayerVisibility(index, visible) {
        layers[index].visible = visible;
        renderLayerList();
        syncLayerState(layers[index].id);
        if (typeof History !== 'undefined') History.add('layer visibility');
    }
    
    /**
     * Khóa hoặc mở khóa một lớp. Lớp bị khóa sẽ không thể tương tác với các đối tượng bên trong.
     * @param {number} index - Vị trí lớp.
     */
    function toggleLayerLock(index) {
        layers[index].locked = !layers[index].locked;
        renderLayerList();
        syncLayerState(layers[index].id);
        if (typeof History !== 'undefined') History.add('layer lock');
    }
    
    /**
     * Đổi tên cho một lớp.
     * @param {number} index - Vị trí lớp.
     * @param {string} name - Tên mới.
     */
    function renameLayer(index, name) {
        if (layers[index]) {
            layers[index].name = name;
        }
    }
    
    /**
     * Di chuyển một lớp từ vị trí này sang vị trí khác.
     * @param {number} fromIndex - Vị trí hiện tại của lớp.
     * @param {number} toIndex - Vị trí mới muốn đến.
     */
    function moveLayer(fromIndex, toIndex) {
        // 1. Kiểm tra giới hạn chỉ số
        if (fromIndex < 0 || fromIndex >= layers.length || 
            toIndex < 0 || toIndex >= layers.length) return;
        
        // 2. Không làm gì nếu cùng vị trí
        if (fromIndex === toIndex) return;
        
        // 3. Cắt và chèn lớp tới vị trí mới
        const layer = layers.splice(fromIndex, 1)[0];
        layers.splice(toIndex, 0, layer);
        
        // 4. Cập nhật activeLayerIndex nếu lớp đang hoạt động bị di chuyển
        if (activeLayerIndex === fromIndex) {
            activeLayerIndex = toIndex;
        } else if (activeLayerIndex > fromIndex && activeLayerIndex <= toIndex) {
            activeLayerIndex--;
        } else if (activeLayerIndex < fromIndex && activeLayerIndex >= toIndex) {
            activeLayerIndex++;
        }
        
        // 5. Cập nhật UI và canvas
        renderLayerList();
        syncAllLayers();
        if (typeof History !== 'undefined') History.add('reorder layers');
    }
    
    /**
     * Thiết lập độ mờ cho tất cả đối tượng trong một lớp.
     * @param {number} index - Vị trí lớp.
     * @param {number} opacity - Giá trị độ mờ (0-100).
     * @param {boolean} shouldAddHistory - Có ghi lại lịch sử hay không.
     */
    function setLayerOpacity(index, opacity, shouldAddHistory = false) {
        if (layers[index]) {
            layers[index].opacity = opacity;
            // No renderLayerList() here to avoid destroying the element during drag
            syncLayerState(layers[index].id);
            
            if (shouldAddHistory && typeof History !== 'undefined') {
                History.add('layer opacity');
            }
        }
    }
    
    return {
        init,
        addLayer,
        deleteLayer,
        setActiveLayer,
        getActiveLayer,
        getAllLayers: () => layers,
        renderLayerList
    };
})();

window.Layers = Layers;