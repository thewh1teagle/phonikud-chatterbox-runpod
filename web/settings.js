/*
 * Settings Management System
 * 
 * This system supports multiple ways to configure the TTS application:
 * 
 * 1. Default settings (hardcoded fallbacks)
 * 2. LocalStorage persistence (user preferences)
 * 3. URL Query Parameters (for easy sharing and automation)
 * 
 * URL Query Parameters:
 * - baseUrl: The base URL for the TTS API server
 * - apiKey: API key for authentication (optional)
 * 
 * Example URLs:
 * - Basic usage: https://example.com/?baseUrl=http://localhost:8000
 * - With API key: https://example.com/?baseUrl=http://my-server:8000&apiKey=my-secret-key
 * - RunPod example: https://example.com/?baseUrl=https://abc123-8000.proxy.runpod.net&apiKey=your-runpod-key
 * 
 * Priority order: URL parameters > LocalStorage > Defaults
 * URL parameters will override stored settings when present.
 */
class Settings {
    constructor() {
        this.defaults = {
            baseUrl: 'http://localhost:8000',
            apiKey: ''
        };
        this.load();
        this.loadFromUrlParams();
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

    /**
     * Load settings from URL query parameters
     * This allows for easy sharing of configurations and automation
     * URL parameters will override localStorage settings
     */
    loadFromUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        let hasUrlOverrides = false;

        // Check for baseUrl parameter
        const urlBaseUrl = urlParams.get('baseUrl');
        if (urlBaseUrl) {
            // Remove trailing slash and validate basic format
            const cleanBaseUrl = urlBaseUrl.trim().replace(/\/$/, '');
            if (cleanBaseUrl) {
                this.settings.baseUrl = cleanBaseUrl;
                hasUrlOverrides = true;
            }
        }

        // Check for apiKey parameter
        const urlApiKey = urlParams.get('apiKey');
        if (urlApiKey !== null) { // Allow empty string as a valid value
            this.settings.apiKey = urlApiKey.trim();
            hasUrlOverrides = true;
        }

        // If URL parameters were found, save them to localStorage for persistence
        if (hasUrlOverrides) {
            this.save();
            
            // Provide visual feedback that settings were loaded from URL
            setTimeout(() => {
                const status = document.getElementById('status');
                if (status) {
                    status.innerHTML = '<div style="color: #17a2b8;">Settings loaded from URL parameters</div>';
                    setTimeout(() => {
                        status.innerHTML = '';
                    }, 3000);
                }
            }, 100);
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
