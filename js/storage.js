/**
 * Module Storage quản lý việc lưu trữ dữ liệu ứng dụng.
 * Sử dụng IndexedDB để lưu các dự án (projects) và LocalStorage để lưu các cài đặt người dùng (preferences).
 */
const Storage = (function() {
    /** @type {string} Tên cơ sở dữ liệu IndexedDB */
    const DB_NAME = 'MandalaArtDB';
    /** @type {number} Phiên bản cơ sở dữ liệu */
    const DB_VERSION = 1;
    /** @type {string} Tên bảng (object store) lưu trữ dự án */
    const STORE_NAME = 'projects';
    /** @type {IDBDatabase} Đối tượng cơ sở dữ liệu */
    let db = null;
    /** @type {Promise} Promise xử lý việc mở cơ sở dữ liệu */
    let dbPromise = null;
    
    /**
     * Khởi tạo module Storage.
     */
    function init() {
        dbPromise = openDatabase();
        setupAutoSave();
        loadPreferences();
    }
    
    /**
     * Mở hoặc tạo mới cơ sở dữ liệu IndexedDB.
     * @returns {Promise}
     */
    function openDatabase() {
        return new Promise((resolve, reject) => {
            // 1. Gửi yêu cầu mở cơ sở dữ liệu IndexedDB
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            
            request.onerror = () => reject(request.error);
            
            // 2. Xử lý khi mở thành công
            request.onsuccess = () => {
                db = request.result;
                resolve(db);
            };
            
            // 3. Xử lý khi cần nâng cấp hoặc khởi tạo cơ cấu bảng (object store)
            request.onupgradeneeded = (e) => {
                const database = e.target.result;
                
                // Nếu chưa có bảng 'projects', tiến hành tạo mới
                if (!database.objectStoreNames.contains(STORE_NAME)) {
                    // Tạo bảng với keyPath là 'id'
                    const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    // Tạo các chỉ mục (index) để tìm kiếm nhanh theo tên hoặc ngày sửa đổi
                    store.createIndex('name', 'name');
                    store.createIndex('modified', 'modified');
                }
            };
        });
    }
    
    /**
     * Thiết lập chế độ tự động lưu dự án định kỳ hoặc khi người dùng đóng trình duyệt.
     */
    function setupAutoSave() {
        setInterval(() => {
            autoSave();
        }, 30000);
        
        window.addEventListener('beforeunload', () => {
            saveCurrentProject();
        });
    }
    
    /**
     * Tải các cài đặt người dùng (ngôn ngữ, v.v.) và áp dụng lên giao diện.
     */
    function loadPreferences() {
        const lang = getPreference('language', 'en');
        const langSwitch = document.getElementById('lang-switch');
        if (langSwitch) {
            langSwitch.value = lang;
        }
    }
    
    /**
     * Lưu một cài đặt vào LocalStorage.
     * @param {string} key - Khóa cài đặt.
     * @param {string} value - Giá trị cài đặt.
     */
    function savePreference(key, value) {
        try {
            localStorage.setItem(`mandala_${key}`, value);
        } catch (e) {
            console.error('Save preference error:', e);
        }
    }
    
    /**
     * Lấy giá trị cài đặt từ LocalStorage.
     * @param {string} key - Khóa cài đặt.
     * @param {any} defaultValue - Giá trị mặc định nếu không tìm thấy.
     * @returns {string|any}
     */
    function getPreference(key, defaultValue = null) {
        try {
            return localStorage.getItem(`mandala_${key}`) || defaultValue;
        } catch (e) {
            return defaultValue;
        }
    }
    
    /**
     * Lưu trạng thái hiện tại của canvas thành một dự án.
     * @param {string} name - Tên dự án.
     */
    function saveCurrentProject(name = 'Untitled') {
        if (!db) return;
        
        const project = {
            id: getPreference('current_project_id') || `proj_${Date.now()}`,
            name: name,
            data: Canvas.toJSON(),
            backgroundColor: document.getElementById('bg-color')?.value || '#ffffff',
            modified: Date.now()
        };
        
        saveProject(project);
        savePreference('current_project_id', project.id);
    }
    
    /**
     * Ghi đối tượng dự án vào cơ sở dữ liệu IndexedDB.
     * @param {Object} project - Đối tượng dự án chứa dữ liệu canvas.
     * @returns {Promise}
     */
    async function saveProject(project) {
        try {
            // 1. Đảm bảo cơ sở dữ liệu đã sẵn sàng
            await dbPromise;
            if (!db) return;
            
            return new Promise((resolve, reject) => {
                // 2. Tạo một giao dịch (transaction) với quyền đọc-ghi (readwrite)
                const transaction = db.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                
                // 3. Thực hiện ghi hoặc cập nhật dự án vào bảng
                store.put(project);
                
                transaction.oncomplete = () => resolve(project);
                transaction.onerror = () => reject(transaction.error);
            });
        } catch (e) {
            console.error('Save project error:', e);
        }
    }
    
    /**
     * Tải một dự án từ cơ sở dữ liệu và hiển thị lên canvas.
     * @param {string} id - ID của dự án.
     * @returns {Promise}
     */
    async function loadProject(id) {
        try {
            // 1. Đảm bảo cơ sở dữ liệu đã sẵn sàng
            await dbPromise;
            if (!db) return;
            
            return new Promise((resolve, reject) => {
                // 2. Tạo một giao dịch chỉ đọc (readonly)
                const transaction = db.transaction([STORE_NAME], 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                
                // 3. Gửi yêu cầu lấy dự án theo ID
                const request = store.get(id);
                
                request.onsuccess = () => {
                    const project = request.result;
                    // 4. Nếu tìm thấy dự án, nạp dữ liệu vào Canvas và cập nhật UI
                    if (project) {
                        Canvas.loadFromJSON(project.data);
                        if (project.backgroundColor) {
                            Canvas.setBackgroundColor(project.backgroundColor);
                        }
                        // Lưu ID dự án hiện tại vào preferences để nhớ cho lần sau
                        savePreference('current_project_id', id);
                        // Phát sự kiện thông báo dự án đã tải xong
                        if (typeof EventBus !== 'undefined') {
                            EventBus.emit('project:loaded', project);
                        }
                    }
                    resolve(project);
                };
                
                request.onerror = () => reject(request.error);
            });
        } catch (e) {
            console.error('Load project error:', e);
        }
    }
    
    /**
     * Xóa một dự án khỏi cơ sở dữ liệu.
     * @param {string} id - ID dự án cần xóa.
     * @returns {Promise}
     */
    async function deleteProject(id) {
        try {
            await dbPromise;
            if (!db) return;
            
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                store.delete(id);
                
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            });
        } catch (e) {
            console.error('Delete project error:', e);
        }
    }
    
    /**
     * Lấy danh sách tất cả các dự án đã lưu.
     * @returns {Promise<Array>}
     */
    async function getAllProjects() {
        try {
            await dbPromise;
            if (!db) return [];
            
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_NAME], 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.getAll();
                
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => reject(request.error);
            });
        } catch (e) {
            console.error('Get projects error:', e);
            return [];
        }
    }
    
    /**
     * Tải lại dự án cuối cùng mà người dùng đã làm việc.
     */
    function loadLastProject() {
        const lastProjectId = getPreference('current_project_id');
        if (lastProjectId) {
            loadProject(lastProjectId).catch(() => {
                console.log('No previous project found');
            });
        }
    }
    
    /**
     * Thực hiện hành động tự động lưu.
     */
    function autoSave() {
        saveCurrentProject();
    }
    
    /**
     * Xuất canvas thành file ảnh PNG và bắt đầu tải xuống.
     * @param {number} multiplier - Hệ số nhân độ phân giải.
     */
    function exportPNG(multiplier = 1) {
        const dataURL = Canvas.toPNG(multiplier);
        if (dataURL) {
            downloadFile(dataURL, 'mandala-artwork.png', 'image/png');
        }
    }
    
    /**
     * Xuất ảnh PNG độ phân giải cao (gấp 4 lần).
     */
    function exportHighResPNG() {
        exportPNG(4);
    }
    
    /**
     * Sao chép hình ảnh canvas hiện tại vào bộ nhớ tạm (clipboard).
     */
    function shareToClipboard() {
        const dataURL = Canvas.toPNG(2);
        if (dataURL) {
            fetch(dataURL)
                .then(res => res.blob())
                .then(blob => {
                    navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                    ]);
                })
                .catch(() => {
                    console.error('Failed to copy to clipboard');
                });
        }
    }
    
    /**
     * Kích hoạt trình tải xuống của trình duyệt cho một file.
     * @param {string|Blob} data - Dữ liệu file.
     * @param {string} filename - Tên file khi tải về.
     * @param {string} mimeType - Loại định dạng file.
     */
    function downloadFile(data, filename, mimeType) {
        const blob = data instanceof Blob ? data : dataURLtoBlob(data);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
    
    /**
     * Chuyển đổi chuỗi DataURL thành đối tượng Blob.
     * @param {string} dataURL
     * @returns {Blob}
     */
    function dataURLtoBlob(dataURL) {
        const parts = dataURL.split(',');
        const mime = parts[0].match(/:(.*?);/)[1];
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    }
    
    return {
        init,
        savePreference,
        getPreference,
        saveCurrentProject,
        saveProject,
        loadProject,
        deleteProject,
        getAllProjects,
        loadLastProject,
        autoSave,
        exportPNG,
        exportHighResPNG,
        shareToClipboard
    };
})();

window.Storage = Storage;