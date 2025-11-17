// Quick Create JavaScript - Handles AI-powered mind map creation

let recordingInterval = null;
let recordingStartTime = 0;
let currentAudioFile = null;
let uploadedAudioFile = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupFileUpload();
});

// Show Audio Recorder Section
function showAudioRecorder() {
    hideAllSections();
    document.getElementById('audioRecorder').classList.add('active');
}

// Show File Upload Section
function showFileUpload() {
    hideAllSections();
    document.getElementById('fileUploadSection').classList.add('active');
}

// Show Text Input Section
function showTextInput() {
    hideAllSections();
    document.getElementById('textInputSection').classList.add('active');
}

// Hide All Sections
function hideAllSections() {
    document.querySelectorAll('.audio-recorder').forEach(section => {
        section.classList.remove('active');
    });
}

// Toggle Recording
async function toggleRecording() {
    const recordBtn = document.getElementById('recordBtn');
    const recordingStatus = document.getElementById('recordingStatus');
    const recordingTimer = document.getElementById('recordingTimer');
    const audioPreview = document.getElementById('audioPreview');

    if (!audioInputHandler.getRecordingState()) {
        // Start recording
        try {
            await audioInputHandler.startRecording();
            recordBtn.classList.remove('start');
            recordBtn.classList.add('stop');
            recordBtn.textContent = '⏹️';
            recordingStatus.textContent = '🔴 جاري التسجيل...';
            recordingTimer.style.display = 'block';
            
            // Start timer
            recordingStartTime = Date.now();
            recordingInterval = setInterval(updateRecordingTimer, 100);
            
            showNotification('بدأ التسجيل! اشرح فكرتك بوضوح', 'info');
        } catch (error) {
            showNotification(error.message, 'error');
        }
    } else {
        // Stop recording
        try {
            currentAudioFile = await audioInputHandler.stopRecording();
            recordBtn.classList.remove('stop');
            recordBtn.classList.add('start');
            recordBtn.textContent = '🎤';
            recordingStatus.textContent = 'تم إيقاف التسجيل ✅';
            recordingTimer.style.display = 'none';
            
            // Clear timer
            clearInterval(recordingInterval);
            
            // Show preview
            displayAudioPreview(currentAudioFile);
            audioPreview.classList.add('show');
            
            showNotification('تم التسجيل بنجاح!', 'success');
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }
}

// Update Recording Timer
function updateRecordingTimer() {
    const elapsed = Date.now() - recordingStartTime;
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    
    document.getElementById('recordingTimer').textContent = 
        `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Display Audio Preview
function displayAudioPreview(audioFile) {
    const container = document.getElementById('audioPlayerContainer');
    container.innerHTML = '';
    
    const audio = audioInputHandler.createAudioPlayer(audioFile);
    container.appendChild(audio);
    
    // Add file info
    const info = document.createElement('div');
    info.style.marginTop = '1rem';
    info.style.color = '#6c757d';
    info.innerHTML = `
        <p><strong>اسم الملف:</strong> ${audioFile.name}</p>
        <p><strong>الحجم:</strong> ${audioInputHandler.formatFileSize(audioFile.size)}</p>
    `;
    container.appendChild(info);
}

// Cancel Audio
function cancelAudio() {
    currentAudioFile = null;
    document.getElementById('audioPreview').classList.remove('show');
    document.getElementById('recordingStatus').textContent = 'جاهز للتسجيل';
    document.getElementById('recordingTimer').textContent = '00:00';
    document.getElementById('recordBtn').classList.remove('stop');
    document.getElementById('recordBtn').classList.add('start');
    document.getElementById('recordBtn').textContent = '🎤';
}

// Setup File Upload
function setupFileUpload() {
    const uploadArea = document.getElementById('fileUploadArea');
    const fileInput = document.getElementById('audioFileInput');

    // Click to upload
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });

    // File selection
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleAudioFileUpload(e.target.files[0]);
        }
    });

    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        if (e.dataTransfer.files.length > 0) {
            handleAudioFileUpload(e.dataTransfer.files[0]);
        }
    });
}

// Handle Audio File Upload
async function handleAudioFileUpload(file) {
    const validation = audioInputHandler.validateAudioFile(file);
    
    if (!validation.valid) {
        showNotification(validation.error, 'error');
        return;
    }

    uploadedAudioFile = file;
    
    // Display preview
    const previewContainer = document.getElementById('uploadedAudioPreview');
    const infoContainer = document.getElementById('uploadedAudioInfo');
    const playerContainer = document.getElementById('uploadedAudioPlayer');
    
    // Get metadata
    const metadata = await audioInputHandler.getAudioMetadata(file);
    
    // Show info
    infoContainer.innerHTML = `
        <div style="background: #f8f9fa; padding: 1rem; border-radius: 10px;">
            <p><strong>📄 اسم الملف:</strong> ${file.name}</p>
            <p><strong>📊 الحجم:</strong> ${metadata.formattedSize}</p>
            <p><strong>⏱️ المدة:</strong> ${metadata.formattedDuration || 'غير متاح'}</p>
            <p><strong>🎵 النوع:</strong> ${file.type}</p>
        </div>
    `;
    
    // Show player
    playerContainer.innerHTML = '';
    const audio = audioInputHandler.createAudioPlayer(file);
    playerContainer.appendChild(audio);
    
    previewContainer.classList.add('show');
    showNotification('تم رفع الملف بنجاح!', 'success');
}

// Clear Uploaded Audio
function clearUploadedAudio() {
    uploadedAudioFile = null;
    document.getElementById('uploadedAudioPreview').classList.remove('show');
    document.getElementById('audioFileInput').value = '';
}

// Process Audio (from recording)
async function processAudio() {
    if (!currentAudioFile) {
        showNotification('لا يوجد تسجيل صوتي!', 'error');
        return;
    }

    showProcessingOverlay('تحليل التسجيل الصوتي...');
    
    try {
        // Process with AI
        const result = await aiService.generateFromAudio(currentAudioFile);
        
        // Save the generated mind map
        await saveMindMap(result);
        
        showNotification('تم إنشاء الخريطة الذهنية بنجاح!', 'success');
        
        // Redirect to admin or mindmap view
        setTimeout(() => {
            window.location.href = 'admin.html';
        }, 2000);
    } catch (error) {
        hideProcessingOverlay();
        showNotification(error.message, 'error');
    }
}

// Process Uploaded Audio
async function processUploadedAudio() {
    if (!uploadedAudioFile) {
        showNotification('لا يوجد ملف صوتي!', 'error');
        return;
    }

    showProcessingOverlay('تحليل الملف الصوتي...');
    
    try {
        // Process with AI
        const result = await aiService.generateFromAudio(uploadedAudioFile);
        
        // Save the generated mind map
        await saveMindMap(result);
        
        showNotification('تم إنشاء الخريطة الذهنية بنجاح!', 'success');
        
        // Redirect to admin or mindmap view
        setTimeout(() => {
            window.location.href = 'admin.html';
        }, 2000);
    } catch (error) {
        hideProcessingOverlay();
        showNotification(error.message, 'error');
    }
}

// Process Text
async function processText() {
    const textArea = document.getElementById('quickTextArea');
    const text = textArea.value.trim();
    
    if (!text) {
        showNotification('الرجاء إدخال نص أولاً!', 'error');
        return;
    }

    if (text.length < 20) {
        showNotification('الرجاء إدخال وصف أطول (على الأقل 20 حرفاً)', 'error');
        return;
    }

    showProcessingOverlay('تحليل النص وإنشاء الخريطة الذهنية...');
    
    try {
        // Generate mind map from text
        const result = await aiService.generateMindMapFromText(text);
        
        // Analyze each node
        updateProcessingMessage('إضافة التحليل التفصيلي...');
        const nodesWithAnalysis = await Promise.all(
            result.nodes.map(async (node) => {
                const analysis = await aiService.analyzeNode(node);
                return { ...node, analysis };
            })
        );
        
        result.nodes = nodesWithAnalysis;
        result.source = 'text';
        result.originalText = text;
        
        // Save the generated mind map
        await saveMindMap(result);
        
        showNotification('تم إنشاء الخريطة الذهنية بنجاح!', 'success');
        
        // Redirect to admin or mindmap view
        setTimeout(() => {
            window.location.href = 'admin.html';
        }, 2000);
    } catch (error) {
        hideProcessingOverlay();
        showNotification(error.message, 'error');
    }
}

// Save Mind Map
async function saveMindMap(mindMapData) {
    try {
        // Load existing data
        const response = await fetch('data.json');
        const data = await response.json();
        
        // Add new works from mind map
        const existingIds = data.works.map(w => w.id);
        const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
        
        mindMapData.nodes.forEach((node, index) => {
            node.id = maxId + index + 1;
        });
        
        data.works = [...data.works, ...mindMapData.nodes];
        
        // Save to localStorage for demonstration
        localStorage.setItem('mindMapData', JSON.stringify(data));
        localStorage.setItem('lastGeneratedMindMap', JSON.stringify(mindMapData));
        
        // Download updated data.json
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'data.json';
        link.click();
        URL.revokeObjectURL(url);
        
        updateProcessingMessage('تم الحفظ بنجاح! ✅');
    } catch (error) {
        console.error('Error saving mind map:', error);
        // Even if loading fails, save the new data
        const data = { works: mindMapData.nodes };
        localStorage.setItem('mindMapData', JSON.stringify(data));
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'data.json';
        link.click();
        URL.revokeObjectURL(url);
    }
}

// Show Processing Overlay
function showProcessingOverlay(message) {
    const overlay = document.getElementById('processingOverlay');
    const stepsContainer = document.getElementById('processingSteps');
    
    document.getElementById('processingMessage').textContent = message;
    
    // Add processing steps
    stepsContainer.innerHTML = `
        <div class="step">✅ تحليل المحتوى</div>
        <div class="step">⏳ إنشاء العقد الرئيسية</div>
        <div class="step">⏳ إضافة التحليل التفصيلي</div>
        <div class="step">⏳ تنظيم البيانات</div>
    `;
    
    overlay.classList.add('active');
    
    // Simulate progress
    setTimeout(() => updateProcessingStep(1), 1000);
    setTimeout(() => updateProcessingStep(2), 2000);
    setTimeout(() => updateProcessingStep(3), 3000);
}

// Update Processing Step
function updateProcessingStep(stepIndex) {
    const steps = document.querySelectorAll('#processingSteps .step');
    if (steps[stepIndex]) {
        steps[stepIndex].textContent = steps[stepIndex].textContent.replace('⏳', '✅');
    }
}

// Update Processing Message
function updateProcessingMessage(message) {
    document.getElementById('processingMessage').textContent = message;
}

// Hide Processing Overlay
function hideProcessingOverlay() {
    document.getElementById('processingOverlay').classList.remove('active');
}

// Show Notification
function showNotification(message, type = 'info') {
    // Remove existing notifications
    document.querySelectorAll('.notification').forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
        color: white;
        padding: 1rem 2rem;
        border-radius: 10px;
        box-shadow: 0 5px 20px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideIn 0.3s;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
    #processingSteps .step {
        padding: 0.5rem;
        margin: 0.5rem 0;
        background: #f8f9fa;
        border-radius: 5px;
        font-size: 0.95rem;
    }
`;
document.head.appendChild(style);
