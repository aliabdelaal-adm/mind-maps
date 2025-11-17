// Admin Panel JavaScript
let works = [];
let editingWorkId = null;

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

    // Cancel Button
    document.getElementById('cancelBtn').addEventListener('click', () => {
        editModal.style.display = 'none';
    });

    // Search and Filter
    searchInput.addEventListener('input', renderWorks);
    filterCategory.addEventListener('change', renderWorks);
    filterType.addEventListener('change', renderWorks);

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

    let filteredWorks = works.filter(work => {
        const matchesSearch = work.title.toLowerCase().includes(searchTerm) ||
                            work.description?.toLowerCase().includes(searchTerm);
        const matchesCategory = !selectedCategory || work.category === selectedCategory;
        const matchesType = !selectedType || work.type === selectedType;
        
        return matchesSearch && matchesCategory && matchesType;
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

    worksList.innerHTML = filteredWorks.map(work => `
        <div class="work-card" data-id="${work.id}">
            <div class="work-header">
                <div class="work-title">${work.title}</div>
                <div class="work-badges">
                    <span class="badge badge-type">${work.type}</span>
                    <span class="badge badge-category">${work.category}</span>
                </div>
            </div>
            <div class="work-description">${work.description || 'لا يوجد وصف'}</div>
            <div class="work-links">
                ${work.downloadLinks?.pdf ? '<span class="link-badge">📄 PDF</span>' : ''}
                ${work.downloadLinks?.word ? '<span class="link-badge">📝 Word</span>' : ''}
                ${!work.downloadLinks?.pdf && !work.downloadLinks?.word ? '<span class="link-badge">لا توجد روابط</span>' : ''}
            </div>
            <div class="work-actions">
                <button class="btn btn-warning" onclick="editWork(${work.id})">✏️ تعديل</button>
                <button class="btn btn-danger" onclick="deleteWork(${work.id})">🗑️ حذف</button>
            </div>
        </div>
    `).join('');
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
    editModal.style.display = 'none';
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
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
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
    
    // Escape: Close Modals
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }
});
