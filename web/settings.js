// Settings management
class Settings {
    constructor() {
        this.defaults = {
            baseUrl: 'http://localhost:8000',
            apiKey: ''
        };
        this.load();
        this.initModal();
    }

    load() {
        const stored = localStorage.getItem('tts-settings');
        if (stored) {
            this.settings = { ...this.defaults, ...JSON.parse(stored) };
        } else {
            this.settings = { ...this.defaults };
        }
    }

    save() {
        localStorage.setItem('tts-settings', JSON.stringify(this.settings));
    }

    get(key) {
        return this.settings[key];
    }

    set(key, value) {
        this.settings[key] = value;
        this.save();
    }

    initModal() {
        // Add event listeners when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.bindEvents());
        } else {
            this.bindEvents();
        }
    }

    bindEvents() {
        const settingsBtn = document.getElementById('settingsBtn');
        const settingsModal = document.getElementById('settingsModal');
        const closeModal = document.getElementById('closeSettings');
        const saveSettings = document.getElementById('saveSettings');
        const cancelSettings = document.getElementById('cancelSettings');
        const baseUrlInput = document.getElementById('baseUrlInput');
        const apiKeyInput = document.getElementById('apiKeyInput');

        // Open modal
        settingsBtn.addEventListener('click', () => {
            baseUrlInput.value = this.get('baseUrl');
            apiKeyInput.value = this.get('apiKey');
            settingsModal.style.display = 'block';
        });

        // Close modal
        const closeModalFunc = () => {
            settingsModal.style.display = 'none';
        };
        
        closeModal.addEventListener('click', closeModalFunc);
        cancelSettings.addEventListener('click', closeModalFunc);

        // Close modal when clicking outside
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                closeModalFunc();
            }
        });

        // Save settings
        saveSettings.addEventListener('click', () => {
            const newBaseUrl = baseUrlInput.value.trim();
            const newApiKey = apiKeyInput.value.trim();

            // Validate base URL
            if (!newBaseUrl) {
                alert('Base URL cannot be empty');
                return;
            }

            // Remove trailing slash from base URL
            const cleanBaseUrl = newBaseUrl.replace(/\/$/, '');

            this.set('baseUrl', cleanBaseUrl);
            this.set('apiKey', newApiKey);

            // Update the BASE_URL in script.js if it exists
            if (window.updateBaseUrl) {
                window.updateBaseUrl(cleanBaseUrl);
            }

            closeModalFunc();
            
            // Show success message
            const status = document.getElementById('status');
            if (status) {
                status.innerHTML = '<div style="color: #28a745;">Settings saved successfully!</div>';
                setTimeout(() => {
                    status.innerHTML = '';
                }, 3000);
            }
        });

        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && settingsModal.style.display === 'block') {
                closeModalFunc();
            }
        });
    }
}

// Initialize settings
const appSettings = new Settings();
