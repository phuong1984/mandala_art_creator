/**
 * Module Shapes quản lý việc vẽ và thao tác với các hình khối (hình chữ nhật, hình tròn, tam giác, v.v.).
 * Hỗ trợ tạo hình khối đối xứng dựa trên chế độ đối xứng hiện tại.
 */
const Shapes = (function () {
    /** @type {fabric.Canvas} Đối tượng canvas */
    let canvas = null;
    // Shapes that do not have live preview while dragging
    const NO_PREVIEW_SHAPES = [];//['parallelogram', 'arc'];
    /** @type {string} Loại hình khối hiện tại đang chọn để vẽ */
    let currentShape = 'rectangle';
    /** @type {boolean} Cờ đánh dấu đang trong quá trình kéo chuột để vẽ */
    let isDrawing = false;
    /** @type {Object} Điểm bắt đầu khi nhấn chuột {x, y} */
    let startPoint = null;
    /** @type {fabric.Object} Đối tượng hình khối đang được vẽ */
    let activeShape = null;
    /** @type {Array<fabric.Object>} Danh sách các hình khối ảo dùng để xem trước đối xứng */
    let mirrorShapes = [];
    /** @type {boolean} Cờ đánh dấu đã khởi tạo */
    let isInitialized = false;
    /** @type {number} Biến đếm để gán ID nhóm cho các hình khối đối xứng */
    let symmetryGroupCounter = 0;
    /** @type {Object} Tâm canvas cố định trong suốt quá trình vẽ */
    let fixedCenter = null;
    /** @type {number} Số lượng đối xứng cố định trong suốt quá trình vẽ */
    let fixedSymmetryCount = 0;
    /** @type {boolean} Trạng thái selection trước khi vẽ */
    let wasCanvasSelection = true;

    /**
     * Khởi tạo module Shapes và đăng ký các sự kiện chuột trên canvas.
     */
    function init() {
        canvas = Canvas.getCanvas();
        if (!canvas) {
            setTimeout(init, 100);
            return;
        }

        if (isInitialized) {
            removeListeners();
        }

        canvas.on('mouse:down', onMouseDown);
        canvas.on('mouse:move', onMouseMove);
        canvas.on('mouse:up', onMouseUp);
        canvas.on('object:modified', onShapeModified);
        canvas.on('object:moving', onShapeMoving);
        canvas.on('object:scaling', onShapeScaling);
        canvas.on('object:rotating', onShapeRotating);

        isInitialized = true;
    }

    /**
     * Gỡ bỏ các trình lắng nghe sự kiện chuột khỏi canvas.
     */
    function removeListeners() {
        if (canvas) {
            canvas.off('mouse:down', onMouseDown);
            canvas.off('mouse:move', onMouseMove);
            canvas.off('mouse:up', onMouseUp);
            canvas.off('object:modified', onShapeModified);
            canvas.off('object:moving', onShapeMoving);
            canvas.off('object:scaling', onShapeScaling);
            canvas.off('object:rotating', onShapeRotating);
        }
    }

    /**
     * Xóa bỏ các hình khối ảo dùng để xem trước đối xứng.
     */
    function clearMirrorShapes() {
        mirrorShapes.forEach(s => {
            if (s && canvas) {
                canvas.remove(s);
            }
        });
        mirrorShapes = [];
    }

    /**
     * Tạo các hình khối ảo để người dùng xem trước kết quả đối xứng khi đang vẽ.
     * @param {fabric.Object} baseShape - Hình khối gốc đang vẽ.
     */
    function createMirrorShapes(baseShape) {
        // 1. Xóa bỏ các hình xem trước cũ trước khi tạo mới
        clearMirrorShapes();

        if (!baseShape || !canvas || !SymmetryMode.isEnabled()) return;

        // 2. Sử dụng tâm canvas cố định đã lưu từ mouse down
        const center = fixedCenter || Canvas.getCenter();
        const symmetryCount = fixedSymmetryCount || SymmetryMode.getSymmetryCount();
        const cx = center.x;
        const cy = center.y;

        // 3. Vòng lặp tạo ra các bản sao xoay quanh tâm
        for (let i = 1; i < symmetryCount; i++) {
            const angle = (i / symmetryCount) * Math.PI * 2; // Tính góc xoay (radian)

            // 4. Tạo bản sao của hình gốc tùy theo loại đối tượng
            let clonedShape = cloneShapeSync(baseShape);
            if (!clonedShape) continue;

            // 5. Thuật toán xoay tâm: Tính toán vị trí mới của tâm bản sao
            const dx = baseShape.getCenterPoint().x - cx;
            const dy = baseShape.getCenterPoint().y - cy;

            const newCenter = {
                x: cx + dx * Math.cos(angle) - dy * Math.sin(angle),
                y: cy + dx * Math.sin(angle) + dy * Math.cos(angle)
            };

            // 6. Cập nhật góc xoay và các thuộc tính hiển thị (không cho phép tương tác với hình ảo)
            clonedShape.set({
                angle: (baseShape.angle || 0) + (angle * 180 / Math.PI),
                selectable: false,
                evented: false,
                opacity: 0.7 // Làm mờ hình xem trước
            });

            // 7. Đặt hình vào vị trí đã tính toán và thêm vào canvas
            clonedShape.setPositionByOrigin(new fabric.Point(newCenter.x, newCenter.y), 'center', 'center');
            clonedShape.setCoords();

            mirrorShapes.push(clonedShape);
            canvas.add(clonedShape);
        }
    }



    /**
     * Xử lý sự kiện nhấn chuột xuống để bắt đầu vẽ hình.
     */
    function onMouseDown(options) {
        // 1. Kiểm tra xem có đang chọn công cụ vẽ hình hay không
        if (typeof Tools === 'undefined' || Tools.getCurrentTool() !== 'shape') return;

        // 2. Nếu đang chọn một đối tượng khác, không bắt đầu vẽ hình mới
        if (canvas.getActiveObject()) return;

        isDrawing = true;
        // Tắt selection để tránh Fabric.js tự động chọn objects trong quá trình vẽ
        wasCanvasSelection = canvas.selection;
        canvas.selection = false;
        // 3. Lấy tọa độ điểm bắt đầu nhấn chuột
        startPoint = canvas.getPointer(options.e);

        // 4. Lưu tâm canvas và số lượng đối xứng cố định cho toàn bộ quá trình vẽ
        fixedCenter = Canvas.getCenter();
        fixedSymmetryCount = SymmetryMode.getSymmetryCount();

        const drawColor = document.getElementById('draw-color')?.value || '#000000';
        const noPreviewShapes = [];//['parallelogram', 'arc'];

        // 5. Bỏ qua nếu là loại hình không hỗ trợ xem trước khi kéo
        if (NO_PREVIEW_SHAPES.includes(currentShape)) {
            // Do not start drawing for shapes without preview
            return;
        }

        // 6. Khởi tạo đối tượng hình khối tương ứng
        switch (currentShape) {
            case 'line':
                activeShape = new fabric.Line([startPoint.x, startPoint.y, startPoint.x, startPoint.y], {
                    stroke: drawColor,
                    strokeWidth: 2,
                    selectable: false
                });
                break;
            default:
                activeShape = createShape(currentShape, startPoint, startPoint, drawColor);
        }

        // 7. Thêm hình vừa khởi tạo vào canvas
        if (activeShape) {
            canvas.add(activeShape);
        }
    }

    /**
     * Xử lý sự kiện di chuyển chuột để cập nhật kích thước hình đang vẽ.
     */
    function onMouseMove(options) {
        if (!isDrawing || !activeShape) return;

        // 1. Lấy tọa độ chuột hiện tại
        const currentPoint = canvas.getPointer(options.e);
        // 2. Cập nhật kích thước hình đang vẽ dựa trên điểm bắt đầu và điểm hiện tại
        switch (currentShape) {
            case 'line':
                activeShape.set({
                    x2: currentPoint.x,
                    y2: currentPoint.y
                });
                break;
            case 'rectangle':
            case 'square':
            case 'circle':
            case 'ellipse':
            case 'triangle':
            case 'diamond':
            default:
                updateShape(activeShape, startPoint, currentPoint);
                break;
        }

        // 3. Nếu chế độ đối xứng đang bật, cập nhật các hình ảo xem trước
        if (SymmetryMode.isEnabled()) {
            createMirrorShapes(activeShape);
        }

        // 4. Vẽ lại canvas
        canvas.renderAll();
    }

    /**
     * Xử lý sự kiện nhả chuột để hoàn tất việc vẽ hình và tạo các bản sao đối xứng vĩnh viễn.
     */
    function onMouseUp(options) {
        if (!isDrawing) return;

        isDrawing = false;
        const endPoint = canvas.getPointer(options.e);
        const drawColor = document.getElementById('draw-color')?.value || '#000000';
        const noPreviewShapes = [];//['triangle', 'diamond', 'parallelogram', 'arc'];

        // 1. Nếu hình chưa được tạo (cho các loại hình không xem trước), tạo nó ngay bây giờ
        if (!activeShape) {
            const width = Math.abs(endPoint.x - startPoint.x);
            const height = Math.abs(endPoint.y - startPoint.y);

            // Nếu kích thước quá nhỏ, coi như là click nhầm và bỏ qua
            if (width < 5 && height < 5) {
                startPoint = null;
                return;
            }

            activeShape = createShape(currentShape, startPoint, endPoint, drawColor);

            if (activeShape) {
                canvas.add(activeShape);
            }
        }

        // 2. Hoàn tất hình vẽ
        if (activeShape) {
            if (!noPreviewShapes.includes(currentShape)) {
                updateShape(activeShape, startPoint, endPoint);
            }

            // 3. Xóa bỏ các hình ảo dùng để xem trước
            clearMirrorShapes();

            // 5. Áp dụng đối xứng vĩnh viễn nếu chế độ đang bật
            if (SymmetryMode.isEnabled()) {
                // Pass the original fixedCenter to avoid fallback to a moved centre
                applySymmetryToShape(activeShape, fixedCenter);
            }

            // 6. Cập nhật canvas
            canvas.renderAll();

            // 7. Sau đó set selectable (nhưng không set active để tránh Fabric.js reposition bug)
            activeShape.set({ selectable: true });

            // Không gọi canvas.setActiveObject() - nó trigger reposition trong Fabric.js
            // Thay vào đó, để user click để select shape

            // 8. Lưu vào lịch sử
            setTimeout(() => History.add('add shape'), 50);
        }

        activeShape = null;
        startPoint = null;
        fixedCenter = null;
        fixedSymmetryCount = 0;
        // Xóa active object hiện tại trước khi khôi phục selection
        canvas.discardActiveObject();
        // Khôi phục trạng thái selection của canvas
        canvas.selection = wasCanvasSelection;
    }

    /**
     * Xử lý khi một hình khối bị thay đổi (resize, rotate, v.v.).
     */
    function onShapeModified(e) {
        const shape = e.target;
        if (!shape || shape.symmetryGroup === undefined) return;
        syncSymmetryGroup(shape);
    }

    /**
     * Xử lý khi một hình khối đang được di chuyển.
     */
    function onShapeMoving(e) {
        const shape = e.target;
        if (!shape || shape.symmetryGroup === undefined) return;
        syncSymmetryGroup(shape);
    }

    /**
     * Xử lý khi một hình khối đang được co giãn.
     */
    function onShapeScaling(e) {
        const shape = e.target;
        if (!shape || shape.symmetryGroup === undefined) return;
        syncSymmetryGroup(shape);
    }

    /**
     * Xử lý khi một hình khối đang được xoay.
     */
    function onShapeRotating(e) {
        const shape = e.target;
        if (!shape || shape.symmetryGroup === undefined) return;
        syncSymmetryGroup(shape);
    }

    /**
     * Tạo các bản sao đối xứng vĩnh viễn cho một hình khối.
     * @param {fabric.Object} shape - Hình khối gốc.
     */
    function applySymmetryToShape(shape, centerOverride = null) {
        if (!shape || !canvas) return;

        // Force coords update before cloning to ensure center is 100% accurate
        shape.setCoords();

        const center = centerOverride || fixedCenter || Canvas.getCenter();
        const symmetryCount = fixedSymmetryCount || SymmetryMode.getSymmetryCount();
        const cx = center.x;
        const cy = center.y;
        const originalAngle = shape.angle || 0;

        symmetryGroupCounter++;
        const groupId = symmetryGroupCounter;
        shape.symmetryGroup = groupId;
        shape.symmetryBaseShape = true;
        shape.savedSymmetryCount = symmetryCount;
        shape.savedSymmetryAngle = 0;

        // Bắt buộc lấy chính xác tâm của original shape
        const originalCenter = shape.getCenterPoint();
        const dx = originalCenter.x - cx;
        const dy = originalCenter.y - cy;

        for (let i = 1; i < symmetryCount; i++) {
            const angle = (i / symmetryCount) * Math.PI * 2;
            
            let clonedShape = cloneShapeSync(shape);
            if (!clonedShape) continue;

            clonedShape.symmetryGroup = groupId;
            clonedShape.symmetryIndex = i;
            clonedShape.symmetryBaseShape = false;
            clonedShape.savedSymmetryCount = symmetryCount;
            clonedShape.savedSymmetryAngle = angle * (180 / Math.PI);

            const newCenter = {
                x: cx + dx * Math.cos(angle) - dy * Math.sin(angle),
                y: cy + dx * Math.sin(angle) + dy * Math.cos(angle)
            };

            clonedShape.set({
                angle: originalAngle + (angle * 180 / Math.PI),
                selectable: true,
                evented: true,
                left: newCenter.x, // Fallback set left/top
                top: newCenter.y
            });

            clonedShape.setPositionByOrigin(new fabric.Point(newCenter.x, newCenter.y), 'center', 'center');
            clonedShape.setCoords();

            canvas.add(clonedShape);
        }

        // CHỐNG NHẢY: Ép buộc hình gốc ở lại đúng tọa độ trung tâm ban đầu của nó
        shape.setPositionByOrigin(new fabric.Point(originalCenter.x, originalCenter.y), 'center', 'center');
        shape.setCoords();
    }

    /**
     * Đồng bộ hóa tất cả các hình trong cùng một nhóm đối xứng khi hình gốc thay đổi.
     * @param {fabric.Object} baseShape - Hình khối vừa bị tác động.
     */
    function syncSymmetryGroup(baseShape) {
        if (!baseShape || !baseShape.symmetryGroup || !SymmetryMode.isEnabled()) return;

        const groupId = baseShape.symmetryGroup;
        const baseShapeAngle = baseShape.savedSymmetryAngle || 0;
        
        const center = fixedCenter || Canvas.getCenter();
        const cx = center.x;
        const cy = center.y;

        baseShape.setCoords(); 
        const baseCenter = baseShape.getCenterPoint();
        
        const unrotateAngle = -(baseShapeAngle * Math.PI / 180);
        let dx = baseCenter.x - cx;
        let dy = baseCenter.y - cy;
        
        const trueDx = dx * Math.cos(unrotateAngle) - dy * Math.sin(unrotateAngle);
        const trueDy = dx * Math.sin(unrotateAngle) + dy * Math.cos(unrotateAngle);
        
        const baseAngle = (baseShape.angle || 0) - baseShapeAngle;

        canvas.forEachObject(function (linkedShape) {
            if (linkedShape.symmetryGroup !== groupId || linkedShape === baseShape) return;

            const savedAngle = linkedShape.savedSymmetryAngle || 0;
            const targetSymmetryAngle = savedAngle * Math.PI / 180;

            const newCenter = {
                x: cx + trueDx * Math.cos(targetSymmetryAngle) - trueDy * Math.sin(targetSymmetryAngle),
                y: cy + trueDx * Math.sin(targetSymmetryAngle) + trueDy * Math.cos(targetSymmetryAngle)
            };

            linkedShape.set({
                angle: baseAngle + savedAngle,
                scaleX: baseShape.scaleX,
                scaleY: baseShape.scaleY,
                fill: baseShape.fill,
                stroke: baseShape.stroke,
                strokeWidth: baseShape.strokeWidth,
                opacity: baseShape.opacity
            });

            // 6. Đặt lại vị trí tâm và sao chép các thông số hình học (chiều dài, rộng, bán kính...)
            linkedShape.setPositionByOrigin(new fabric.Point(newCenter.x, newCenter.y), 'center', 'center');
            copyShapeGeometry(linkedShape, baseShape);
            linkedShape.setCoords();
        });

        // 7. Vẽ lại canvas để cập nhật thay đổi
        canvas.renderAll();
    }

    /**
     * Sao chép các thông số hình học (kích thước, điểm, bán kính) từ hình nguồn sang hình đích.
     * @param {fabric.Object} target - Hình đích.
     * @param {fabric.Object} source - Hình nguồn.
     */
    function copyShapeGeometry(target, source) {
        const type = source.type;
        if (type === 'rect' || type === 'triangle') {
            target.set({ width: source.width, height: source.height });
        } else if (type === 'circle') {
            target.set({ radius: source.radius });
        } else if (type === 'ellipse') {
            target.set({ rx: source.rx, ry: source.ry });
        } else if (type === 'polygon') {
            target.set({ points: source.points.slice() });
        } else if (type === 'path') {
            if (JSON.stringify(target.path) !== JSON.stringify(source.path)) {
                target.set({ path: source.path });
            }
        } else if (type === 'line') {
            target.set({ x1: source.x1, y1: source.y1, x2: source.x2, y2: source.y2 });
        }
    }

    /**
     * Tạo bản sao hình học chuẩn xác và đồng bộ (an toàn cho preview liên tục).
     */
    function cloneShapeSync(source) {
        if (!source) return null;
        const obj = source.toObject();
        delete obj.symmetryGroup;
        delete obj.symmetryIndex;
        delete obj.symmetryBaseShape;
        delete obj.savedSymmetryCount;
        delete obj.savedSymmetryAngle;
        
        let clone;
        if (source.type === 'rect') clone = new fabric.Rect(obj);
        else if (source.type === 'circle') clone = new fabric.Circle(obj);
        else if (source.type === 'ellipse') clone = new fabric.Ellipse(obj);
        else if (source.type === 'triangle') clone = new fabric.Triangle(obj);
        else if (source.type === 'line') clone = new fabric.Line([source.x1, source.y1, source.x2, source.y2], obj);
        else if (source.type === 'polygon') clone = new fabric.Polygon(source.points.slice(), obj);
        else if (source.type === 'path') clone = new fabric.Path(source.path, obj);
        return clone;
    }

    const ShapeFactory = {
        rectangle: (start, end, commonProps) => {
            return new fabric.Rect({
                ...commonProps,
                left: Math.min(start.x, end.x),
                top: Math.min(start.y, end.y),
                width: Math.abs(end.x - start.x),
                height: Math.abs(end.y - start.y)
            });
        },
        square: (start, end, commonProps) => {
            const size = Math.max(Math.abs(end.x - start.x), Math.abs(end.y - start.y));
            return new fabric.Rect({
                ...commonProps,
                left: Math.min(start.x, end.x),
                top: Math.min(start.y, end.y),
                width: size,
                height: size
            });
        },
        circle: (start, end, commonProps) => {
            const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
            return new fabric.Circle({
                ...commonProps,
                left: start.x - radius,
                top: start.y - radius,
                radius: radius
            });
        },
        ellipse: (start, end, commonProps) => {
            const rx = Math.abs(end.x - start.x) / 2;
            const ry = Math.abs(end.y - start.y) / 2;
            return new fabric.Ellipse({
                ...commonProps,
                left: Math.min(start.x, end.x),
                top: Math.min(start.y, end.y),
                rx: rx,
                ry: ry
            });
        },
        triangle: (start, end, commonProps) => {
            const tWidth = Math.abs(end.x - start.x);
            const tHeight = Math.abs(end.y - start.y);
            return new fabric.Triangle({
                ...commonProps,
                left: Math.min(start.x, end.x),
                top: Math.min(start.y, end.y),
                width: tWidth,
                height: tHeight
            });
        },
        diamond: (start, end, commonProps) => {
            const dWidth = Math.abs(end.x - start.x);
            const dHeight = Math.abs(end.y - start.y);
            return new fabric.Polygon([
                { x: dWidth / 2, y: 0 },
                { x: dWidth, y: dHeight / 2 },
                { x: dWidth / 2, y: dHeight },
                { x: 0, y: dHeight / 2 }
            ], {
                ...commonProps,
                left: Math.min(start.x, end.x),
                top: Math.min(start.y, end.y)
            });
        },
        parallelogram: (start, end, commonProps) => {
            const pWidth = Math.abs(end.x - start.x);
            const pHeight = Math.abs(end.y - start.y);
            const skew = pWidth * 0.2;
            return new fabric.Polygon([
                { x: skew, y: 0 },
                { x: pWidth, y: 0 },
                { x: pWidth - skew, y: pHeight },
                { x: 0, y: pHeight }
            ], {
                ...commonProps,
                left: Math.min(start.x, end.x),
                top: Math.min(start.y, end.y)
            });
        },
        arc: (start, end, commonProps) => {
            const arcRadius = Math.abs(end.x - start.x);
            const arcPath = `M ${start.x - arcRadius} ${start.y} A ${arcRadius} ${arcRadius} 0 0 1 ${start.x + arcRadius} ${start.y}`;
            return new fabric.Path(arcPath, {
                ...commonProps,
                fill: null
            });
        }
    };

    /**
     * Tạo một đối tượng Fabric.js mới dựa trên loại hình và tọa độ.
     * @param {string} type - Loại hình khối.
     * @param {Object} start - Tọa độ bắt đầu.
     * @param {Object} end - Tọa độ kết thúc.
     * @param {string} color - Màu sắc.
     * @returns {fabric.Object}
     */
    function createShape(type, start, end, color) {
        const commonProps = {
            stroke: color,
            strokeWidth: 2,
            fill: 'transparent',
            selectable: false
        };

        const createFunc = ShapeFactory[type] || ShapeFactory['rectangle'];
        return createFunc(start, end, commonProps);
    }

    /**
     * Cập nhật các thuộc tính của hình khối dựa trên tọa độ chuột hiện tại.
     * @param {fabric.Object} shape - Hình khối cần cập nhật.
     * @param {Object} start - Tọa độ bắt đầu.
     * @param {Object} end - Tọa độ hiện tại.
     */
    function updateShape(shape, start, end) {
        if (!shape) return;

        const width = Math.abs(end.x - start.x);
        const height = Math.abs(end.y - start.y);

        switch (currentShape) {
            case 'rectangle':
            case 'square':
                shape.set({
                    left: Math.min(start.x, end.x),
                    top: Math.min(start.y, end.y),
                    width: currentShape === 'square' ? Math.max(width, height) : width,
                    height: currentShape === 'square' ? Math.max(width, height) : height
                });
                break;

            case 'circle':
                const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
                shape.set({
                    left: start.x - radius,
                    top: start.y - radius,
                    radius: radius
                });
                break;

            case 'ellipse':
                shape.set({
                    left: Math.min(start.x, end.x),
                    top: Math.min(start.y, end.y),
                    rx: width / 2,
                    ry: height / 2
                });
                break;

            case 'triangle':
                shape.set({
                    left: Math.min(start.x, end.x),
                    top: Math.min(start.y, end.y),
                    width: width,
                    height: height
                });
                break;

            case 'diamond':
                const points = [
                    { x: width / 2, y: 0 },
                    { x: width, y: height / 2 },
                    { x: width / 2, y: height },
                    { x: 0, y: height / 2 }
                ];
                shape.set({
                    left: Math.min(start.x, end.x),
                    top: Math.min(start.y, end.y),
                    points: points
                });
                shape._calcDimensions();
                break;
        }

        shape.setCoords();
    }

    /**
     * Thiết lập loại hình khối sẽ được vẽ tiếp theo.
     * @param {string} type - Tên loại hình.
     */
    function setShapeType(type) {
        currentShape = type;
    }

    /**
     * Bật các điểm điều khiển (nodes) để người dùng có thể kéo dãn/xoay hình.
     * @param {fabric.Object} shape 
     */
    function enableNodeEditing(shape) {
        if (!shape) return;
        shape.set({
            hasControls: true,
            hasBorders: true,
            cornerColor: '#0d6efd',
            cornerStyle: 'circle',
            transparentCorners: false,
            cornerSize: 10
        });
    }

    return {
        init,
        createShape,
        setShapeType,
        enableNodeEditing,
        getShapeType: () => currentShape,
        applySymmetryToShape
    };
})();

window.Shapes = Shapes;
