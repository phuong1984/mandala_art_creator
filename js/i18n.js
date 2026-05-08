/**
 * Module I18n quản lý đa ngôn ngữ cho ứng dụng.
 * Hỗ trợ tải bản dịch từ file JSON hoặc sử dụng bản dịch nội bộ dự phòng.
 */
const I18n = (function() {
    /** @type {string} Ngôn ngữ hiện tại ('en', 'vi', v.v.) */
    let currentLanguage = 'en';
    /** @type {Object} Đối tượng chứa các bản dịch */
    let translations = {};
    /** @type {Array<string>} Danh sách các ngôn ngữ được hỗ trợ */
    const supportedLanguages = ['en', 'vi'];
    
    /**
     * Khởi tạo module i18n.
     */
    function init() {
        const savedLang = Storage.getPreference('language', 'en');
        loadLanguage(savedLang);
        setupLanguageSelector();
    }
    
    /**
     * Thiết lập trình lắng nghe cho bộ chọn ngôn ngữ trên UI.
     */
    function setupLanguageSelector() {
        const langSwitch = document.getElementById('lang-switch');
        if (langSwitch) {
            langSwitch.addEventListener('change', (e) => {
                setLanguage(e.target.value);
            });
        }
    }
    
    /**
     * Tải bản dịch cho một ngôn ngữ cụ thể.
     * @param {string} lang - Mã ngôn ngữ.
     */
    async function loadLanguage(lang) {
        currentLanguage = lang;
        
        try {
            // 1. Thử tải file ngôn ngữ JSON từ thư mục locales
            const response = await fetch(`locales/${lang}.json`);
            if (response.ok) {
                translations = await response.json();
            } else {
                // 2. Nếu không tìm thấy file (404), sử dụng bản dịch nội bộ dự phòng
                translations = getInlineTranslations(lang);
            }
        } catch (e) {
            // 3. Nếu có lỗi mạng hoặc lỗi khác, sử dụng bản dịch nội bộ dự phòng
            translations = getInlineTranslations(lang);
        }
        
        // 4. Sau khi tải xong dữ liệu, cập nhật lại giao diện người dùng
        updateUI();
    }
    
    /**
     * Thay đổi ngôn ngữ ứng dụng.
     * @param {string} lang - Mã ngôn ngữ mới.
     */
    function setLanguage(lang) {
        if (supportedLanguages.includes(lang)) {
            loadLanguage(lang);
            Storage.savePreference('language', lang);
        }
    }
    
    /**
     * Lấy chuỗi bản dịch dựa trên khóa (key).
     * @param {string} key - Khóa bản dịch (ví dụ: 'tools.brush').
     * @param {string} fallback - Chuỗi dự phòng nếu không tìm thấy khóa.
     * @returns {string} Chuỗi đã dịch hoặc khóa ban đầu.
     */
    function t(key, fallback = '') {
        // 1. Tách khóa bằng dấu chấm để truy cập vào các đối tượng lồng nhau (ví dụ: 'tools.brush')
        const keys = key.split('.');
        let value = translations;
        
        // 2. Duyệt qua từng cấp của đối tượng bản dịch
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                // 3. Nếu không tìm thấy, trả về giá trị dự phòng hoặc chính cái khóa đó
                return fallback || key;
            }
        }
        
        return value;
    }
    
    /**
     * Cập nhật bản dịch cho một phần tử UI duy nhất.
     * @param {HTMLElement} element - Phần tử cần cập nhật.
     */
    function updateElement(element) {
        if (!element) return;
        const key = element.getAttribute('data-i18n');
        if (!key) return;
        
        const translation = t(key);
        if (translation && translation !== key) {
            if (element.tagName === 'INPUT' && (element.type === 'text' || element.type === 'search')) {
                element.placeholder = translation;
            } else if (element.hasAttribute('title')) {
                if (key.startsWith('[title]')) {
                    element.title = translation;
                } else {
                    element.textContent = translation;
                }
            } else {
                element.textContent = translation;
            }
        }
    }
    
    /**
     * Cập nhật tất cả các thành phần UI có thuộc tính `data-i18n`.
     */
    function updateUI() {
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => updateElement(element));
    }
    
    /**
     * Lấy bản dịch dự phòng được định nghĩa sẵn trong code.
     * @param {string} lang - Mã ngôn ngữ.
     * @returns {Object}
     */
    function getInlineTranslations(lang) {
        if (lang === 'vi') {
            return {
                app: { title: 'Mandala Art Creator' },
                tools: { brush: 'Cọ vẽ', size: 'Kích thước', opacity: 'Độ mờ' },
                shapes: { line: 'Đường thẳng', rectangle: 'Hình chữ nhật', square: 'Hình vuông', circle: 'Hình tròn', ellipse: 'Hình elip', triangle: 'Tam giác', diamond: 'Hình thoi' },
                layers: { title: 'Lớp' },
                canvas: { background: 'Nền' }
            };
        }
        return {
            app: { title: 'Mandala Art Creator' },
            tools: { brush: 'Brush', size: 'Size', opacity: 'Opacity' },
            shapes: { line: 'Line', rectangle: 'Rectangle', square: 'Square', circle: 'Circle', ellipse: 'Ellipse', triangle: 'Triangle', diamond: 'Diamond' },
            layers: { title: 'Layers' },
            canvas: { background: 'Background' }
        };
    }
    
    return { init, setLanguage, t, updateUI, updateElement, getCurrentLanguage: () => currentLanguage };
})();

window.I18n = I18n;
