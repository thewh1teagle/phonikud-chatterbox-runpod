/*
 * Settings Management System
 * 
 * This system supports multiple ways to configure the TTS application:
 * 
 * 1. Default settings (hardcoded fallbacks)
 * 2. LocalStorage persistence (user preferences)
 * 3. URL Query Parameters (for easy sharing and automation)
 * 4. Share functionality (generate URLs with current settings)
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
 * Share Functionality:
 * - "Copy Shareable URL" - Creates URL with all settings (including API key if present)
 * - "Copy URL (No API Key)" - Creates URL with only baseUrl parameter
 * 
 * SECURITY CONSIDERATIONS:
 * - API keys in URLs are visible in browser history, server logs, and referrer headers
 * - Only share URLs with API keys to trusted parties
 * - Use the "No API Key" option for public sharing or documentation
 * - Consider using environment variables or secure configuration for production deployments
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
        this.urlParamsLoaded = false;
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
            
            // Update the BASE_URL in script.js if it exists
            if (window.updateBaseUrl) {
                window.updateBaseUrl(this.settings.baseUrl);
            }
            
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
        // Load URL parameters now that both scripts are loaded
        if (!this.urlParamsLoaded) {
            this.loadFromUrlParams();
            this.urlParamsLoaded = true;
        }
        
        const settingsBtn = document.getElementById('settingsBtn');
        const settingsModal = document.getElementById('settingsModal');
        const closeModal = document.getElementById('closeSettings');
        const saveSettings = document.getElementById('saveSettings');
        const cancelSettings = document.getElementById('cancelSettings');
        const baseUrlInput = document.getElementById('baseUrlInput');
        const apiKeyInput = document.getElementById('apiKeyInput');
        const shareSettingsBtn = document.getElementById('shareSettingsBtn');
        const shareNoApiBtn = document.getElementById('shareNoApiBtn');

        // Open modal
        settingsBtn.addEventListener('click', () => {
            baseUrlInput.value = this.get('baseUrl');
            apiKeyInput.value = this.get('apiKey');
            settingsModal.style.display = 'flex';
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

        // Share settings functionality
        shareSettingsBtn.addEventListener('click', () => {
            this.copyShareableUrl(true);
        });

        shareNoApiBtn.addEventListener('click', () => {
            this.copyShareableUrl(false);
        });

        // API Key visibility toggle
        const toggleApiKey = document.getElementById('toggleApiKey');
        if (toggleApiKey) {
            toggleApiKey.addEventListener('click', () => {
                const input = apiKeyInput;
                const isPassword = input.type === 'password';
                
                // Toggle input type
                input.type = isPassword ? 'text' : 'password';
                
                // Update icon
                const svg = toggleApiKey.querySelector('svg');
                if (isPassword) {
                    // Show "eye-slash" (hide) icon when text is visible
                    svg.innerHTML = `
                        <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z"/>
                        <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z"/>
                        <path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.708zm10.296 8.884-12-12 .708-.708 12 12-.708.708z"/>
                    `;
                } else {
                    // Show "eye" (show) icon when text is hidden
                    svg.innerHTML = `
                        <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
                        <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
                    `;
                }
            });
        }

        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && settingsModal.style.display === 'flex') {
                closeModalFunc();
            }
        });
    }

    /**
     * Generate a shareable URL with current settings
     * @param {boolean} includeApiKey - Whether to include the API key in the URL
     * @returns {string} The constructed URL with query parameters
     */
    generateShareableUrl(includeApiKey = true) {
        const currentUrl = new URL(window.location.href);
        // Remove existing query parameters
        currentUrl.search = '';
        
        const params = new URLSearchParams();
        
        // Always include base URL if it's different from default
        const baseUrl = this.get('baseUrl');
        if (baseUrl && baseUrl !== this.defaults.baseUrl) {
            params.set('baseUrl', baseUrl);
        }
        
        // Include API key only if requested and present
        if (includeApiKey) {
            const apiKey = this.get('apiKey');
            if (apiKey) {
                params.set('apiKey', apiKey);
            }
        }
        
        // Only add query string if we have parameters
        if (params.toString()) {
            currentUrl.search = params.toString();
        }
        
        return currentUrl.toString();
    }

    /**
     * Copy shareable URL to clipboard and show feedback
     * @param {boolean} includeApiKey - Whether to include the API key in the URL
     */
    async copyShareableUrl(includeApiKey = true) {
        try {
            const shareableUrl = this.generateShareableUrl(includeApiKey);
            
            // Use the modern clipboard API if available
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(shareableUrl);
            } else {
                // Fallback for older browsers or non-secure contexts
                const textArea = document.createElement('textarea');
                textArea.value = shareableUrl;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                textArea.remove();
            }
            
            // Show success feedback
            this.showShareFeedback('URL copied to clipboard!', 'success');
            
        } catch (error) {
            console.error('Failed to copy URL:', error);
            this.showShareFeedback('Failed to copy URL. Please try again.', 'error');
        }
    }

    /**
     * Show feedback message for share operations
     * @param {string} message - The message to display
     * @param {string} type - The type of message ('success' or 'error')
     */
    showShareFeedback(message, type = 'success') {
        const status = document.getElementById('status');
        if (status) {
            const color = type === 'success' ? '#28a745' : '#dc3545';
            status.innerHTML = `<div style="color: ${color};">${message}</div>`;
            setTimeout(() => {
                status.innerHTML = '';
            }, 3000);
        }
    }
}

// Initialize settings
const appSettings = new Settings();
// Make settings available globally
window.appSettings = appSettings;
