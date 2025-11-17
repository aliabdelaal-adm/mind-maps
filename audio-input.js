// Audio Input Handler for Mind Maps
// Handles audio recording, file upload, and integration with AI service

class AudioInputHandler {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.stream = null;
    }

    /**
     * Check if browser supports audio recording
     * @returns {boolean}
     */
    isSupported() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }

    /**
     * Start recording audio
     * @returns {Promise<void>}
     */
    async startRecording() {
        if (!this.isSupported()) {
            throw new Error('المتصفح لا يدعم تسجيل الصوت');
        }

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(this.stream);
            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.start();
            this.isRecording = true;

            return Promise.resolve();
        } catch (error) {
            console.error('Error starting recording:', error);
            throw new Error('فشل في بدء التسجيل. يرجى التحقق من أذونات الميكروفون');
        }
    }

    /**
     * Stop recording and return audio file
     * @returns {Promise<File>}
     */
    async stopRecording() {
        if (!this.isRecording || !this.mediaRecorder) {
            throw new Error('لا يوجد تسجيل نشط');
        }

        return new Promise((resolve, reject) => {
            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                const audioFile = new File(
                    [audioBlob],
                    `recording-${Date.now()}.webm`,
                    { type: 'audio/webm' }
                );

                // Stop all tracks
                if (this.stream) {
                    this.stream.getTracks().forEach(track => track.stop());
                }

                this.isRecording = false;
                this.audioChunks = [];
                
                resolve(audioFile);
            };

            this.mediaRecorder.onerror = (error) => {
                reject(new Error('خطأ في التسجيل: ' + error.message));
            };

            this.mediaRecorder.stop();
        });
    }

    /**
     * Cancel recording
     */
    cancelRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
            }
            this.isRecording = false;
            this.audioChunks = [];
        }
    }

    /**
     * Get current recording state
     * @returns {boolean}
     */
    getRecordingState() {
        return this.isRecording;
    }

    /**
     * Create audio player element
     * @param {File} audioFile - Audio file to play
     * @returns {HTMLAudioElement}
     */
    createAudioPlayer(audioFile) {
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.src = URL.createObjectURL(audioFile);
        audio.className = 'audio-player';
        return audio;
    }

    /**
     * Validate audio file
     * @param {File} file - File to validate
     * @returns {Object} - Validation result
     */
    validateAudioFile(file) {
        const maxSize = 10 * 1024 * 1024; // 10 MB
        const allowedTypes = [
            'audio/webm',
            'audio/wav',
            'audio/mp3',
            'audio/mpeg',
            'audio/ogg',
            'audio/m4a',
            'audio/mp4'
        ];

        if (!file) {
            return { valid: false, error: 'لم يتم اختيار ملف' };
        }

        if (file.size > maxSize) {
            return { valid: false, error: 'حجم الملف كبير جداً (الحد الأقصى 10 ميجابايت)' };
        }

        if (!allowedTypes.includes(file.type)) {
            return { valid: false, error: 'نوع الملف غير مدعوم. الرجاء استخدام ملفات صوتية' };
        }

        return { valid: true };
    }

    /**
     * Format recording duration
     * @param {number} seconds - Duration in seconds
     * @returns {string}
     */
    formatDuration(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Get audio file metadata
     * @param {File} audioFile - Audio file
     * @returns {Promise<Object>}
     */
    async getAudioMetadata(audioFile) {
        return new Promise((resolve) => {
            const audio = new Audio();
            audio.src = URL.createObjectURL(audioFile);
            
            audio.addEventListener('loadedmetadata', () => {
                const metadata = {
                    duration: audio.duration,
                    size: audioFile.size,
                    type: audioFile.type,
                    name: audioFile.name,
                    formattedDuration: this.formatDuration(audio.duration),
                    formattedSize: this.formatFileSize(audioFile.size)
                };
                URL.revokeObjectURL(audio.src);
                resolve(metadata);
            });

            audio.addEventListener('error', () => {
                resolve({
                    size: audioFile.size,
                    type: audioFile.type,
                    name: audioFile.name,
                    formattedSize: this.formatFileSize(audioFile.size),
                    error: 'Could not read audio metadata'
                });
            });
        });
    }

    /**
     * Format file size
     * @param {number} bytes - Size in bytes
     * @returns {string}
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Convert audio to base64 for storage
     * @param {File} audioFile - Audio file
     * @returns {Promise<string>}
     */
    async audioToBase64(audioFile) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(audioFile);
        });
    }

    /**
     * Save audio file to storage (placeholder - would need backend)
     * @param {File} audioFile - Audio file to save
     * @param {string} mindMapId - Associated mind map ID
     * @returns {Promise<Object>}
     */
    async saveAudioFile(audioFile, mindMapId) {
        try {
            // In a real implementation, this would upload to a server
            // For now, we'll store it in localStorage or return metadata
            
            const metadata = await this.getAudioMetadata(audioFile);
            const base64 = await this.audioToBase64(audioFile);
            
            const audioData = {
                id: Date.now(),
                mindMapId: mindMapId,
                fileName: audioFile.name,
                fileType: audioFile.type,
                size: audioFile.size,
                duration: metadata.duration,
                base64Data: base64.substring(0, 1000) + '...', // Store limited data in demo
                uploadedAt: new Date().toISOString()
            };

            return audioData;
        } catch (error) {
            console.error('Error saving audio:', error);
            throw new Error('فشل في حفظ الملف الصوتي');
        }
    }
}

// Create singleton instance
const audioInputHandler = new AudioInputHandler();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = audioInputHandler;
}
