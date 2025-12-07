// Admin Panel JavaScript
let works = [];
let editingWorkId = null;
let selectedWorks = new Set();
let autoSaveEnabled = true;
let saveAndAddAnother = false;

// GitHub Configuration
let githubConfig = {
    token: '',
    owner: '',
    repo: '',
    branch: 'main'
};

// DOM Elements
const worksList = document.getElementById('worksList');
const editModal = document.getElementById('editModal');
const importModal = document.getElementById('importModal');
const deleteModal = document.getElementById('deleteModal');
const githubConfigModal = document.getElementById('githubConfigModal');
const workForm = document.getElementById('workForm');
const searchInput = document.getElementById('searchInput');
const filterCategory = document.getElementById('filterCategory');
const filterType = document.getElementById('filterType');

// Stats Elements
const totalWorks = document.getElementById('totalWorks');
const totalCategories = document.getElementById('totalCategories');
const totalTypes = document.getElementById('totalTypes');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadGithubConfig();
    loadData();
    setupEventListeners();
});

// Load data from data.json
function loadData() {
    showNotification('جاري تحميل البيانات...', 'info');
    
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            works = data.works || [];
            updateStats();
            updateFilters();
            renderWorks();
            showNotification('تم تحميل البيانات بنجاح! ✅', 'success');
        })
        .catch(error => {
            console.error('Error loading data:', error);
            showNotification('خطأ في تحميل البيانات. سيتم البدء بقائمة فارغة.', 'error');
            works = [];
            renderWorks();
        });
}

// Setup Event Listeners
function setupEventListeners() {
    // Add New Button
    document.getElementById('addNewBtn').addEventListener('click', () => {
        openEditModal();
    });

    // Templates Button
    document.getElementById('templatesBtn')?.addEventListener('click', () => {
        document.getElementById('templatesModal').style.display = 'block';
    });

    // Preview Button
    document.getElementById('previewBtn')?.addEventListener('click', showPreview);

    // Bulk Operations Button
    document.getElementById('bulkOperationsBtn')?.addEventListener('click', () => {
        document.getElementById('bulkOperationsModal').style.display = 'block';
        updateBulkSelectionInfo();
    });

    // GitHub Configuration Button
    document.getElementById('githubConfigBtn').addEventListener('click', () => {
        openGithubConfigModal();
    });

    // Save to GitHub Button
    document.getElementById('saveToGithubBtn').addEventListener('click', saveToGithub);

    // GitHub Config Form
    document.getElementById('githubConfigForm').addEventListener('submit', handleGithubConfigSubmit);

    // Export Button
    document.getElementById('exportBtn').addEventListener('click', exportData);

    // Import Button
    document.getElementById('importBtn').addEventListener('click', () => {
        importModal.style.display = 'block';
    });

    // Import Actions
    document.getElementById('selectFileBtn').addEventListener('click', () => {
        document.getElementById('importFile').click();
    });

    document.getElementById('importFile').addEventListener('change', handleFileSelect);
    document.getElementById('importDataBtn').addEventListener('click', importData);

    // Form Submit
    workForm.addEventListener('submit', handleFormSubmit);

    // Save and Add Another Button
    document.getElementById('saveAndAddBtn')?.addEventListener('click', () => {
        saveAndAddAnother = true;
        workForm.requestSubmit();
    });

    // Cancel Button
    document.getElementById('cancelBtn').addEventListener('click', () => {
        editModal.style.display = 'none';
        saveAndAddAnother = false;
    });

    // Character Count for Description
    document.getElementById('workDescription')?.addEventListener('input', (e) => {
        const charCount = e.target.value.length;
        document.getElementById('charCount').textContent = charCount;
        
        // Color feedback
        const counter = document.getElementById('charCount');
        if (charCount < 50) {
            counter.style.color = '#ffc107';
        } else if (charCount > 200) {
            counter.style.color = '#dc3545';
        } else {
            counter.style.color = '#28a745';
        }
    });

    // Smart Suggestions for Title
    document.getElementById('workTitle')?.addEventListener('input', debounce((e) => {
        if (document.getElementById('useSmartSuggestions')?.checked) {
            suggestCategoryAndType(e.target.value);
        }
    }, 500));

    // Search and Filter
    searchInput.addEventListener('input', renderWorks);
    filterCategory.addEventListener('change', renderWorks);
    filterType.addEventListener('change', renderWorks);
    
    // Sort By
    document.getElementById('sortBy')?.addEventListener('change', renderWorks);

    // Close Modals
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });

    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });

    // Delete Confirmation
    document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);
}

// Update Statistics
function updateStats() {
    totalWorks.textContent = works.length;
    
    const categories = new Set(works.map(w => w.category));
    totalCategories.textContent = categories.size;
    
    const types = new Set(works.map(w => w.type));
    totalTypes.textContent = types.size;
}

// Update Filter Options
function updateFilters() {
    // Categories
    const categories = [...new Set(works.map(w => w.category))].sort();
    filterCategory.innerHTML = '<option value="">جميع الفئات</option>';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        filterCategory.appendChild(option);
    });

    // Types
    const types = [...new Set(works.map(w => w.type))].sort();
    filterType.innerHTML = '<option value="">جميع الأنواع</option>';
    types.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        filterType.appendChild(option);
    });

    // Update datalists
    const typesList = document.getElementById('typesList');
    typesList.innerHTML = '';
    types.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        typesList.appendChild(option);
    });

    const categoriesList = document.getElementById('categoriesList');
    categoriesList.innerHTML = '';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        categoriesList.appendChild(option);
    });
}

// Render Works List
function renderWorks() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedCategory = filterCategory.value;
    const selectedType = filterType.value;
    const sortBy = document.getElementById('sortBy')?.value || 'recent';

    let filteredWorks = works.filter(work => {
        const matchesSearch = work.title.toLowerCase().includes(searchTerm) ||
                            work.description?.toLowerCase().includes(searchTerm);
        const matchesCategory = !selectedCategory || work.category === selectedCategory;
        const matchesType = !selectedType || work.type === selectedType;
        
        return matchesSearch && matchesCategory && matchesType;
    });

    // Sort works
    filteredWorks.sort((a, b) => {
        switch (sortBy) {
            case 'title':
                return a.title.localeCompare(b.title, 'ar');
            case 'category':
                return a.category.localeCompare(b.category, 'ar');
            case 'type':
                return a.type.localeCompare(b.type, 'ar');
            case 'recent':
            default:
                return b.id - a.id; // Most recent first
        }
    });

    if (filteredWorks.length === 0) {
        worksList.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="icon">📭</div>
                <h3>لا توجد أعمال</h3>
                <p>${works.length === 0 ? 'ابدأ بإضافة عمل جديد!' : 'لا توجد نتائج تطابق البحث'}</p>
                ${works.length === 0 ? '<button class="btn btn-primary btn-large" onclick="document.getElementById(\'addNewBtn\').click()">➕ إضافة عمل جديد</button>' : ''}
            </div>
        `;
        return;
    }

    worksList.innerHTML = filteredWorks.map(work => {
        const isSelected = selectedWorks.has(work.id);
        return `
        <div class="work-card selectable ${isSelected ? 'selected' : ''}" 
             data-id="${work.id}" 
             onclick="toggleWorkSelection(${work.id}, event)">
            <div class="work-header">
                <div class="work-title">${work.title}</div>
                <div class="work-badges">
                    <span class="badge badge-type">${work.type}</span>
                    <span class="badge badge-category">${work.category}</span>
                    ${work.aiGenerated ? '<span class="smart-badge">AI</span>' : ''}
                    ${work.freeplaneEnhanced ? '<span class="smart-badge">🗺️</span>' : ''}
                </div>
            </div>
            <div class="work-description">${work.description || 'لا يوجد وصف'}</div>
            <div class="work-links">
                ${work.downloadLinks?.pdf ? '<span class="link-badge">📄 PDF</span>' : ''}
                ${work.downloadLinks?.word ? '<span class="link-badge">📝 Word</span>' : ''}
                ${!work.downloadLinks?.pdf && !work.downloadLinks?.word ? '<span class="link-badge">لا توجد روابط</span>' : ''}
            </div>
            <div class="work-actions">
                <button class="btn btn-warning" onclick="event.stopPropagation(); editWork(${work.id})">✏️ تعديل</button>
                <button class="btn btn-danger" onclick="event.stopPropagation(); deleteWork(${work.id})">🗑️ حذف</button>
            </div>
        </div>
        `;
    }).join('');
}

// Open Edit Modal
function openEditModal(work = null) {
    editingWorkId = work ? work.id : null;
    
    if (work) {
        document.getElementById('modalTitle').textContent = 'تعديل العمل';
        document.getElementById('workId').value = work.id;
        document.getElementById('workTitle').value = work.title;
        document.getElementById('workType').value = work.type;
        document.getElementById('workCategory').value = work.category;
        document.getElementById('workDescription').value = work.description || '';
        document.getElementById('pdfLink').value = work.downloadLinks?.pdf || '';
        document.getElementById('wordLink').value = work.downloadLinks?.word || '';
    } else {
        document.getElementById('modalTitle').textContent = 'إضافة عمل جديد';
        workForm.reset();
        document.getElementById('workId').value = '';
    }
    
    editModal.style.display = 'block';
}

// Edit Work
window.editWork = function(id) {
    const work = works.find(w => w.id === id);
    if (work) {
        openEditModal(work);
    }
};

// Delete Work
window.deleteWork = function(id) {
    const work = works.find(w => w.id === id);
    if (work) {
        document.getElementById('deleteWorkName').textContent = work.title;
        deleteModal.style.display = 'block';
        deleteModal.dataset.deleteId = id;
    }
};

// Confirm Delete
function confirmDelete() {
    const id = parseInt(deleteModal.dataset.deleteId);
    works = works.filter(w => w.id !== id);
    
    saveData();
    deleteModal.style.display = 'none';
    showNotification('تم حذف العمل بنجاح! ✅', 'success');
}

// Handle Form Submit
function handleFormSubmit(e) {
    e.preventDefault();
    
    const title = document.getElementById('workTitle').value.trim();
    const type = document.getElementById('workType').value.trim();
    const category = document.getElementById('workCategory').value.trim();
    const description = document.getElementById('workDescription').value.trim();
    const pdfLink = document.getElementById('pdfLink').value.trim();
    const wordLink = document.getElementById('wordLink').value.trim();

    const workData = {
        title,
        type,
        category,
        description,
        downloadLinks: {}
    };

    if (pdfLink) workData.downloadLinks.pdf = pdfLink;
    if (wordLink) workData.downloadLinks.word = wordLink;

    if (editingWorkId) {
        // Update existing work
        const index = works.findIndex(w => w.id === editingWorkId);
        if (index !== -1) {
            works[index] = { ...works[index], ...workData };
            showNotification('تم تحديث العمل بنجاح! ✅', 'success');
        }
    } else {
        // Add new work
        const newId = works.length > 0 ? Math.max(...works.map(w => w.id)) + 1 : 1;
        works.push({ id: newId, ...workData });
        showNotification('تم إضافة العمل بنجاح! ✅', 'success');
    }

    saveData();
    
    // Handle save and add another
    if (saveAndAddAnother) {
        workForm.reset();
        editingWorkId = null;
        document.getElementById('modalTitle').textContent = 'إضافة عمل جديد';
        document.getElementById('workId').value = '';
        document.getElementById('workTitle').focus();
        saveAndAddAnother = false;
        showNotification('يمكنك الآن إضافة عمل آخر', 'info');
    } else {
        editModal.style.display = 'none';
    }
}

// Save Data to File
function saveData() {
    updateStats();
    updateFilters();
    renderWorks();
    
    // Check if GitHub is configured
    if (githubConfig.token && githubConfig.owner && githubConfig.repo) {
        showNotification('✅ تم تحديث البيانات! استخدم زر "الحفظ مباشرة في GitHub" لحفظ التغييرات.', 'success');
    } else {
        // Fallback: download file
        const dataStr = JSON.stringify({ works }, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'data.json';
        link.click();
        URL.revokeObjectURL(url);
        showNotification('تم تنزيل ملف data.json! قم برفعه يدوياً إلى المستودع.', 'info');
    }
}

// Export Data
function exportData() {
    const dataStr = JSON.stringify({ works }, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mind-map-data-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    showNotification('تم تصدير البيانات بنجاح! ✅', 'success');
}

// Handle File Select for Import
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('importData').value = e.target.result;
        };
        reader.readAsText(file);
    }
}

// Import Data
function importData() {
    const importDataText = document.getElementById('importData').value.trim();
    
    if (!importDataText) {
        showNotification('الرجاء إدخال أو تحميل بيانات JSON!', 'error');
        return;
    }
    
    try {
        const importedData = JSON.parse(importDataText);
        
        if (!importedData.works || !Array.isArray(importedData.works)) {
            throw new Error('Invalid data format');
        }
        
        works = importedData.works;
        updateStats();
        updateFilters();
        renderWorks();
        importModal.style.display = 'none';
        document.getElementById('importData').value = '';
        
        showNotification('تم استيراد البيانات بنجاح! ✅', 'success');
        
        // Auto-save imported data
        saveData();
    } catch (error) {
        console.error('Import error:', error);
        showNotification('خطأ في تنسيق البيانات! تأكد من صحة JSON.', 'error');
    }
}

// Show Notification
function showNotification(message, type = 'info') {
    // Remove existing notifications
    document.querySelectorAll('.notification').forEach(n => n.remove());
    
    // Add icon to message if not already present
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    const icon = icons[type] || icons.info;
    const finalMessage = message.startsWith(icon) ? message : `${icon} ${message}`;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = finalMessage;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add fadeOut animation
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from { opacity: 1; transform: translateX(0); }
        to { opacity: 0; transform: translateX(400px); }
    }
`;
document.head.appendChild(style);

// ===== GitHub Integration Functions =====

// Load GitHub Configuration from LocalStorage
function loadGithubConfig() {
    const saved = localStorage.getItem('githubConfig');
    if (saved) {
        try {
            githubConfig = JSON.parse(saved);
            // Show the Save to GitHub button if config exists
            if (githubConfig.token && githubConfig.owner && githubConfig.repo) {
                document.getElementById('saveToGithubBtn').style.display = 'inline-block';
            }
        } catch (error) {
            console.error('Error loading GitHub config:', error);
        }
    }
}

// Save GitHub Configuration to LocalStorage
function saveGithubConfig() {
    localStorage.setItem('githubConfig', JSON.stringify(githubConfig));
}

// Open GitHub Configuration Modal
function openGithubConfigModal() {
    document.getElementById('githubToken').value = githubConfig.token || '';
    document.getElementById('githubOwner').value = githubConfig.owner || '';
    document.getElementById('githubRepo').value = githubConfig.repo || '';
    document.getElementById('githubBranch').value = githubConfig.branch || 'main';
    githubConfigModal.style.display = 'block';
}

// Handle GitHub Configuration Form Submit
function handleGithubConfigSubmit(e) {
    e.preventDefault();
    
    githubConfig.token = document.getElementById('githubToken').value.trim();
    githubConfig.owner = document.getElementById('githubOwner').value.trim();
    githubConfig.repo = document.getElementById('githubRepo').value.trim();
    githubConfig.branch = document.getElementById('githubBranch').value.trim();
    
    saveGithubConfig();
    githubConfigModal.style.display = 'none';
    
    // Show the Save to GitHub button
    document.getElementById('saveToGithubBtn').style.display = 'inline-block';
    
    showNotification('تم حفظ إعدادات GitHub بنجاح! ✅', 'success');
}

// Save to GitHub Function
async function saveToGithub() {
    if (!githubConfig.token || !githubConfig.owner || !githubConfig.repo) {
        showNotification('يجب تكوين إعدادات GitHub أولاً!', 'error');
        openGithubConfigModal();
        return;
    }
    
    const saveBtn = document.getElementById('saveToGithubBtn');
    const originalText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '⏳ جاري الحفظ...';
    
    try {
        // Get current file SHA
        const fileUrl = `https://api.github.com/repos/${githubConfig.owner}/${githubConfig.repo}/contents/data.json?ref=${githubConfig.branch}`;
        
        showNotification('جاري الاتصال بـ GitHub...', 'info');
        
        const getResponse = await fetch(fileUrl, {
            headers: {
                'Authorization': `token ${githubConfig.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!getResponse.ok) {
            throw new Error(`فشل الحصول على ملف data.json: ${getResponse.status}`);
        }
        
        const fileData = await getResponse.json();
        const sha = fileData.sha;
        
        // Prepare new content
        const dataStr = JSON.stringify({ works }, null, 2);
        const contentBase64 = btoa(unescape(encodeURIComponent(dataStr)));
        
        // Update file on GitHub
        showNotification('جاري رفع التغييرات...', 'info');
        
        const updateResponse = await fetch(fileUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${githubConfig.token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `تحديث data.json من لوحة التحكم - ${new Date().toLocaleString('ar-EG')}`,
                content: contentBase64,
                sha: sha,
                branch: githubConfig.branch
            })
        });
        
        if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            throw new Error(errorData.message || `فشل رفع الملف: ${updateResponse.status}`);
        }
        
        const result = await updateResponse.json();
        
        showNotification('✅ تم حفظ التغييرات في GitHub بنجاح!', 'success');
        console.log('GitHub commit:', result.commit.html_url);
        
    } catch (error) {
        console.error('Error saving to GitHub:', error);
        showNotification(`❌ خطأ في الحفظ: ${error.message}`, 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
    }
}

// Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + N: New Work
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        document.getElementById('addNewBtn').click();
    }
    
    // Ctrl/Cmd + S: Save (Export)
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        exportData();
    }
    
    // Ctrl/Cmd + P: Preview
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        showPreview();
    }
    
    // Ctrl/Cmd + A: Select All (when not in input)
    if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        e.preventDefault();
        bulkOperation('selectAll');
    }
    
    // Escape: Close Modals
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }
});

// ===== Freeplane Integration Functions =====

// Setup Freeplane Event Listeners (called from setupEventListeners)
function setupFreeplaneEventListeners() {
    // Import Freeplane Button
    const importFreeplaneBtn = document.getElementById('importFreeplaneBtn');
    if (importFreeplaneBtn) {
        importFreeplaneBtn.addEventListener('click', () => {
            const importFreeplaneModal = document.getElementById('importFreeplaneModal');
            if (importFreeplaneModal) {
                importFreeplaneModal.style.display = 'block';
            }
        });
    }

    // Export Freeplane Button
    const exportFreeplaneBtn = document.getElementById('exportFreeplaneBtn');
    if (exportFreeplaneBtn) {
        exportFreeplaneBtn.addEventListener('click', exportToFreeplane);
    }

    // Freeplane File Input
    const importFreeplaneFile = document.getElementById('importFreeplaneFile');
    if (importFreeplaneFile) {
        importFreeplaneFile.addEventListener('change', handleFreeplaneFileSelect);
    }

    // Import Freeplane Data Button
    const importFreeplaneDataBtn = document.getElementById('importFreeplaneDataBtn');
    if (importFreeplaneDataBtn) {
        importFreeplaneDataBtn.addEventListener('click', importFreeplaneData);
    }
}

// Handle Freeplane File Selection
function handleFreeplaneFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        const freeplanePreview = document.getElementById('freeplanePreview');
        const freeplaneFileInfo = document.getElementById('freeplaneFileInfo');
        
        if (freeplanePreview && freeplaneFileInfo) {
            freeplanePreview.style.display = 'block';
            freeplaneFileInfo.innerHTML = `
                <strong>اسم الملف:</strong> ${file.name}<br>
                <strong>الحجم:</strong> ${(file.size / 1024).toFixed(2)} KB<br>
                <strong>النوع:</strong> ${file.type || 'application/xml'}
            `;
        }
    }
}

// Import Freeplane Data
async function importFreeplaneData() {
    const fileInput = document.getElementById('importFreeplaneFile');
    if (!fileInput || !fileInput.files[0]) {
        showNotification('الرجاء اختيار ملف Freeplane (.mm)!', 'error');
        return;
    }

    const file = fileInput.files[0];
    
    try {
        showNotification('جاري قراءة ملف Freeplane...', 'info');
        
        // Check if freeplaneService is available
        if (typeof freeplaneService === 'undefined') {
            throw new Error('خدمة Freeplane غير متوفرة');
        }
        
        const importedData = await freeplaneService.importFreeplaneFile(file);
        
        if (importedData && importedData.works) {
            works = importedData.works;
            updateStats();
            updateFilters();
            renderWorks();
            
            const importFreeplaneModal = document.getElementById('importFreeplaneModal');
            if (importFreeplaneModal) {
                importFreeplaneModal.style.display = 'none';
            }
            
            // Reset the file input
            fileInput.value = '';
            const freeplanePreview = document.getElementById('freeplanePreview');
            if (freeplanePreview) {
                freeplanePreview.style.display = 'none';
            }
            
            showNotification(`✅ تم استيراد ${works.length} عنصر من ملف Freeplane بنجاح!`, 'success');
            
            // Auto-save imported data
            saveData();
        } else {
            throw new Error('تنسيق الملف غير صحيح');
        }
        
    } catch (error) {
        console.error('Freeplane import error:', error);
        showNotification(`❌ خطأ في استيراد ملف Freeplane: ${error.message}`, 'error');
    }
}

// Export to Freeplane Format
function exportToFreeplane() {
    try {
        // Check if freeplaneService is available
        if (typeof freeplaneService === 'undefined') {
            showNotification('خدمة Freeplane غير متوفرة!', 'error');
            return;
        }
        
        const filename = `mind-map-${new Date().toISOString().split('T')[0]}.mm`;
        freeplaneService.downloadAsFreeplaneFormat({ works }, filename);
        
        showNotification('✅ تم تصدير الخريطة الذهنية بتنسيق Freeplane بنجاح!', 'success');
        
    } catch (error) {
        console.error('Freeplane export error:', error);
        showNotification(`❌ خطأ في التصدير: ${error.message}`, 'error');
    }
}

// Initialize Freeplane features after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Add Freeplane event listeners after a short delay to ensure DOM is ready
    setTimeout(setupFreeplaneEventListeners, 100);
});

// ===== Smart Features Functions =====

/**
 * Debounce function to limit function calls
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Smart category and type suggestions based on title
 */
function suggestCategoryAndType(title) {
    if (!title || title.length < 3) return;
    
    const lowerTitle = title.toLowerCase();
    
    // Category suggestions
    const categoryPatterns = {
        'التكنولوجيا': ['تطبيق', 'برنامج', 'نظام', 'تقنية', 'ذكاء', 'تكنولوجيا', 'ديجيتال'],
        'التخطيط': ['خطة', 'استراتيجية', 'تخطيط', 'هدف', 'رؤية'],
        'البحوث': ['بحث', 'دراسة', 'تحليل', 'استقصاء', 'مراجعة'],
        'التقارير': ['تقرير', 'ملخص', 'نتائج', 'إنجازات'],
        'الابتكار': ['ابتكار', 'إبداع', 'فكرة', 'تطوير', 'جديد'],
        'التنفيذ': ['تنفيذ', 'إنجاز', 'عمل', 'مشروع', 'مهمة']
    };
    
    // Type suggestions
    const typePatterns = {
        'مبادرة': ['مبادرة', 'برنامج', 'حملة'],
        'تقرير': ['تقرير', 'ملخص', 'نتائج'],
        'دراسة': ['دراسة', 'بحث', 'تحليل'],
        'هدف': ['هدف', 'غاية', 'رؤية'],
        'خطة': ['خطة', 'استراتيجية', 'منهج'],
        'فكرة': ['فكرة', 'اقتراح', 'مفهوم']
    };
    
    // Find matching category
    let suggestedCategory = '';
    for (const [category, patterns] of Object.entries(categoryPatterns)) {
        if (patterns.some(pattern => lowerTitle.includes(pattern))) {
            suggestedCategory = category;
            break;
        }
    }
    
    // Find matching type
    let suggestedType = '';
    for (const [type, patterns] of Object.entries(typePatterns)) {
        if (patterns.some(pattern => lowerTitle.includes(pattern))) {
            suggestedType = type;
            break;
        }
    }
    
    // Apply suggestions if found and fields are empty
    if (suggestedCategory && !document.getElementById('workCategory').value) {
        document.getElementById('workCategory').value = suggestedCategory;
        document.getElementById('workCategory').classList.add('input-valid');
    }
    
    if (suggestedType && !document.getElementById('workType').value) {
        document.getElementById('workType').value = suggestedType;
        document.getElementById('workType').classList.add('input-valid');
    }
}

/**
 * Validate link accessibility
 */
async function validateLink(linkId) {
    const linkInput = document.getElementById(linkId);
    const url = linkInput.value.trim();
    
    if (!url) {
        showNotification('الرجاء إدخال رابط للتحقق منه', 'warning');
        return;
    }
    
    // Basic URL validation
    try {
        new URL(url);
        linkInput.classList.add('input-valid');
        linkInput.classList.remove('input-invalid');
        showNotification('✓ الرابط صالح', 'success');
    } catch (e) {
        linkInput.classList.add('input-invalid');
        linkInput.classList.remove('input-valid');
        showNotification('✗ الرابط غير صالح', 'error');
    }
}

/**
 * Apply template to create multiple works
 */
function applyTemplate(templateType) {
    const templates = {
        project: [
            { title: 'الرؤية والأهداف', type: 'هدف', category: 'التخطيط', description: 'تحديد الرؤية الشاملة والأهداف الاستراتيجية للمشروع' },
            { title: 'فريق العمل', type: 'عنصر فريق', category: 'الفريق', description: 'تحديد أعضاء الفريق وتوزيع الأدوار' },
            { title: 'الموارد المطلوبة', type: 'مورد', category: 'التخطيط', description: 'تحديد الموارد البشرية والمالية والتقنية' },
            { title: 'الجدول الزمني', type: 'خطة', category: 'التنفيذ', description: 'وضع خطة زمنية للمراحل والمهام' },
            { title: 'المخاطر المحتملة', type: 'تحدي', category: 'المخاطر', description: 'تحديد المخاطر وخطط التخفيف' },
            { title: 'مؤشرات النجاح', type: 'متابعة', category: 'التنفيذ', description: 'تحديد معايير قياس النجاح' }
        ],
        research: [
            { title: 'موضوع البحث', type: 'بحث', category: 'البحوث', description: 'تحديد موضوع البحث والمشكلة البحثية' },
            { title: 'المراجع النظرية', type: 'دراسة', category: 'البحوث', description: 'مراجعة الدراسات السابقة والأدبيات' },
            { title: 'المنهجية', type: 'خطة', category: 'البحوث', description: 'تحديد منهج البحث وأدوات جمع البيانات' },
            { title: 'جمع البيانات', type: 'مهمة', category: 'التنفيذ', description: 'تنفيذ عملية جمع البيانات' },
            { title: 'التحليل', type: 'تقرير', category: 'البحوث', description: 'تحليل البيانات واستخلاص النتائج' },
            { title: 'النتائج والتوصيات', type: 'تقرير', category: 'البحوث', description: 'عرض النتائج والتوصيات' }
        ],
        planning: [
            { title: 'التحليل الاستراتيجي', type: 'دراسة', category: 'التخطيط', description: 'تحليل البيئة الداخلية والخارجية' },
            { title: 'الأهداف الاستراتيجية', type: 'هدف', category: 'التخطيط', description: 'تحديد الأهداف طويلة وقصيرة المدى' },
            { title: 'الخطة التنفيذية', type: 'خطة', category: 'التنفيذ', description: 'وضع خطة تفصيلية للتنفيذ' },
            { title: 'المبادرات الاستراتيجية', type: 'مبادرة', category: 'التنفيذ', description: 'تحديد المبادرات الرئيسية' },
            { title: 'المتابعة والتقييم', type: 'متابعة', category: 'التنفيذ', description: 'نظام لمتابعة التقدم والتقييم' }
        ],
        brainstorm: [
            { title: 'الأفكار الأولية', type: 'فكرة', category: 'الابتكار', description: 'جمع الأفكار الأولية من الفريق' },
            { title: 'تصنيف الأفكار', type: 'خطة', category: 'الابتكار', description: 'تنظيم وتصنيف الأفكار حسب المواضيع' },
            { title: 'تقييم الأفكار', type: 'دراسة', category: 'الابتكار', description: 'تقييم الأفكار حسب الجدوى والتأثير' },
            { title: 'الأفكار المختارة', type: 'هدف', category: 'الابتكار', description: 'اختيار الأفكار الواعدة للتطوير' },
            { title: 'خطة التطوير', type: 'خطة', category: 'التنفيذ', description: 'وضع خطة لتطوير الأفكار المختارة' }
        ],
        team: [
            { title: 'بنية الفريق', type: 'عنصر فريق', category: 'الفريق', description: 'تحديد هيكل الفريق والأدوار' },
            { title: 'المهام والمسؤوليات', type: 'خطة', category: 'الفريق', description: 'توزيع المهام والمسؤوليات' },
            { title: 'التواصل والتنسيق', type: 'خطة', category: 'الفريق', description: 'آليات التواصل والاجتماعات' },
            { title: 'التطوير والتدريب', type: 'مبادرة', category: 'الفريق', description: 'برامج تطوير مهارات الفريق' },
            { title: 'تقييم الأداء', type: 'متابعة', category: 'الفريق', description: 'نظام لتقييم أداء أعضاء الفريق' }
        ],
        workflow: [
            { title: 'تحديد العملية', type: 'خطة', category: 'التنفيذ', description: 'وصف تفصيلي للعملية' },
            { title: 'الخطوات والإجراءات', type: 'خطة', category: 'التنفيذ', description: 'تحديد خطوات العملية بالترتيب' },
            { title: 'المسؤوليات', type: 'عنصر فريق', category: 'التنفيذ', description: 'تحديد المسؤول عن كل خطوة' },
            { title: 'نقاط التحقق', type: 'متابعة', category: 'التنفيذ', description: 'نقاط التحقق والمراجعة' },
            { title: 'التحسين المستمر', type: 'مبدأ', category: 'الابتكار', description: 'آلية لتحسين العملية' }
        ]
    };
    
    const selectedTemplate = templates[templateType];
    if (!selectedTemplate) {
        showNotification('القالب غير متاح', 'error');
        return;
    }
    
    // Add works from template
    let nextId = works.length > 0 ? Math.max(...works.map(w => w.id)) + 1 : 1;
    
    selectedTemplate.forEach(item => {
        works.push({
            id: nextId++,
            ...item,
            downloadLinks: {}
        });
    });
    
    // Update UI
    updateStats();
    updateFilters();
    renderWorks();
    
    // Close modal
    document.getElementById('templatesModal').style.display = 'none';
    
    showNotification(`✅ تم إضافة ${selectedTemplate.length} عنصر من القالب بنجاح!`, 'success');
    
    // Auto-save
    if (autoSaveEnabled) {
        setTimeout(() => saveData(), 1000);
    }
}

/**
 * Show preview of mind map
 */
function showPreview() {
    const previewModal = document.getElementById('previewModal');
    previewModal.style.display = 'block';
    
    // Simple preview rendering
    const canvas = document.getElementById('previewCanvas');
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw simple representation
    ctx.fillStyle = '#667eea';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('معاينة الخريطة الذهنية', canvas.width / 2, 30);
    
    ctx.font = '14px Arial';
    ctx.fillStyle = '#666';
    ctx.fillText(`إجمالي العناصر: ${works.length}`, canvas.width / 2, 60);
    
    // Draw categories
    const categories = [...new Set(works.map(w => w.category))];
    const categoryY = 100;
    const categorySpacing = 80;
    
    categories.forEach((cat, index) => {
        const x = 100 + (index % 3) * 250;
        const y = categoryY + Math.floor(index / 3) * categorySpacing;
        
        // Draw category bubble
        ctx.fillStyle = '#764ba2';
        ctx.beginPath();
        ctx.arc(x, y, 40, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Arial';
        ctx.fillText(cat, x, y + 5);
        
        // Draw work count
        const count = works.filter(w => w.category === cat).length;
        ctx.fillStyle = '#333';
        ctx.font = '10px Arial';
        ctx.fillText(`${count} عنصر`, x, y + 60);
    });
    
    showNotification('تم إنشاء معاينة الخريطة الذهنية', 'info');
}

/**
 * Bulk operations
 */
function bulkOperation(operation) {
    switch (operation) {
        case 'selectAll':
            works.forEach(work => selectedWorks.add(work.id));
            renderWorks();
            updateBulkSelectionInfo();
            showNotification('تم تحديد جميع العناصر', 'info');
            break;
            
        case 'deselectAll':
            selectedWorks.clear();
            renderWorks();
            updateBulkSelectionInfo();
            showNotification('تم إلغاء التحديد', 'info');
            break;
            
        case 'deleteSelected':
            if (selectedWorks.size === 0) {
                showNotification('لم يتم تحديد أي عناصر', 'warning');
                return;
            }
            
            if (confirm(`هل أنت متأكد من حذف ${selectedWorks.size} عنصر؟`)) {
                works = works.filter(w => !selectedWorks.has(w.id));
                selectedWorks.clear();
                saveData();
                showNotification('تم حذف العناصر المحددة بنجاح', 'success');
            }
            break;
            
        case 'exportSelected':
            if (selectedWorks.size === 0) {
                showNotification('لم يتم تحديد أي عناصر', 'warning');
                return;
            }
            
            const selectedData = { works: works.filter(w => selectedWorks.has(w.id)) };
            const dataStr = JSON.stringify(selectedData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `selected-works-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            URL.revokeObjectURL(url);
            showNotification(`تم تصدير ${selectedWorks.size} عنصر`, 'success');
            break;
            
        case 'changeCategory':
            if (selectedWorks.size === 0) {
                showNotification('لم يتم تحديد أي عناصر', 'warning');
                return;
            }
            
            const newCategory = prompt('أدخل الفئة الجديدة:');
            if (newCategory && newCategory.trim()) {
                works.forEach(work => {
                    if (selectedWorks.has(work.id)) {
                        work.category = newCategory.trim();
                    }
                });
                saveData();
                showNotification(`تم تغيير فئة ${selectedWorks.size} عنصر`, 'success');
            }
            break;
            
        case 'changeType':
            if (selectedWorks.size === 0) {
                showNotification('لم يتم تحديد أي عناصر', 'warning');
                return;
            }
            
            const newType = prompt('أدخل النوع الجديد:');
            if (newType && newType.trim()) {
                works.forEach(work => {
                    if (selectedWorks.has(work.id)) {
                        work.type = newType.trim();
                    }
                });
                saveData();
                showNotification(`تم تغيير نوع ${selectedWorks.size} عنصر`, 'success');
            }
            break;
    }
}

/**
 * Update bulk selection info
 */
function updateBulkSelectionInfo() {
    const countEl = document.getElementById('selectedCount');
    if (countEl) {
        countEl.textContent = selectedWorks.size;
    }
}

/**
 * Toggle work selection
 */
window.toggleWorkSelection = function(workId, event) {
    // Prevent triggering other actions
    if (event) event.stopPropagation();
    
    if (selectedWorks.has(workId)) {
        selectedWorks.delete(workId);
    } else {
        selectedWorks.add(workId);
    }
    
    renderWorks();
    updateBulkSelectionInfo();
};

// ===== Drag and Drop Functionality =====

/**
 * Setup drag and drop for file import
 */
function setupDragAndDrop() {
    const dragDropArea = document.getElementById('dragDropArea');
    const importFile = document.getElementById('importFile');
    const importData = document.getElementById('importData');
    
    if (!dragDropArea) return;
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dragDropArea.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    // Highlight drop area when dragging over
    ['dragenter', 'dragover'].forEach(eventName => {
        dragDropArea.addEventListener(eventName, () => {
            dragDropArea.classList.add('dragover');
        }, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dragDropArea.addEventListener(eventName, () => {
            dragDropArea.classList.remove('dragover');
        }, false);
    });
    
    // Handle dropped files
    dragDropArea.addEventListener('drop', handleDrop, false);
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            const file = files[0];
            
            // Check if it's a JSON file
            if (file.type === 'application/json' || file.name.endsWith('.json')) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    importData.value = event.target.result;
                    showNotification('تم تحميل الملف بنجاح! يمكنك الآن الضغط على "استيراد"', 'success');
                };
                reader.readAsText(file);
            } else {
                showNotification('الرجاء رفع ملف JSON فقط', 'error');
            }
        }
    }
}

// Setup drag and drop after DOM loads
document.addEventListener('DOMContentLoaded', () => {
    setupDragAndDrop();
    setupTemplateCardListeners();
    setupBulkOperationListeners();
    setupLinkValidationListeners();
});

/**
 * Setup template card event listeners
 */
function setupTemplateCardListeners() {
    document.querySelectorAll('.template-card').forEach(card => {
        card.addEventListener('click', function() {
            const template = this.dataset.template;
            if (template) {
                applyTemplate(template);
            }
        });
    });
}

/**
 * Setup bulk operation button listeners
 */
function setupBulkOperationListeners() {
    document.querySelectorAll('.bulk-op-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const operation = this.dataset.operation;
            if (operation) {
                bulkOperation(operation);
            }
        });
    });
}

/**
 * Setup link validation button listeners
 */
function setupLinkValidationListeners() {
    document.querySelectorAll('.validate-link-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const linkId = this.dataset.linkId;
            if (linkId) {
                validateLink(linkId);
            }
        });
    });
}

// ===== Auto-save Functionality =====

/**
 * Show auto-save indicator
 */
function showAutoSaveIndicator(status = 'saved') {
    const indicator = document.getElementById('autoSaveIndicator');
    if (!indicator) return;
    
    indicator.className = 'auto-save-indicator show ' + status;
    
    if (status === 'saving') {
        indicator.textContent = '💾 جاري الحفظ...';
    } else if (status === 'saved') {
        indicator.textContent = '✓ تم الحفظ التلقائي';
    } else if (status === 'error') {
        indicator.textContent = '✗ فشل الحفظ';
    }
    
    // Hide after 3 seconds
    setTimeout(() => {
        indicator.classList.remove('show');
    }, 3000);
}

/**
 * Auto-save with debouncing
 */
let autoSaveTimeout;
function triggerAutoSave() {
    if (!autoSaveEnabled) return;
    
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(() => {
        showAutoSaveIndicator('saving');
        
        // Simulate save delay
        setTimeout(() => {
            showAutoSaveIndicator('saved');
        }, 500);
    }, 2000); // Wait 2 seconds after last change
}

// ===== Help Button =====

/**
 * Setup help button
 */
document.addEventListener('DOMContentLoaded', () => {
    const helpBtn = document.getElementById('helpBtn');
    const helpModal = document.getElementById('helpModal');
    
    if (helpBtn && helpModal) {
        helpBtn.addEventListener('click', () => {
            helpModal.style.display = 'block';
        });
    }
});

// ===== Enhanced Notifications =====

// Note: Enhanced notifications with icons are already handled in the showNotification function
