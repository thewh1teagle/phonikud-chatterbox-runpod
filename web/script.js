// Configuration
let BASE_URL = 'http://localhost:8000';

// Update BASE_URL from settings when available
function updateBaseUrl(newUrl) {
    BASE_URL = newUrl;
}

// Make the function available immediately for settings.js
window.updateBaseUrl = updateBaseUrl;

// Load settings on startup
document.addEventListener('DOMContentLoaded', () => {
    if (window.appSettings) {
        const settingsBaseUrl = window.appSettings.get('baseUrl');
        if (settingsBaseUrl) {
            BASE_URL = settingsBaseUrl;
        }
    }
    initializeReferenceAudio();
});

async function generateAudio() {
    const textInput = document.getElementById('textInput');
    const diacriticsCheckbox = document.getElementById('diacriticsCheckbox');
    const generateBtn = document.getElementById('generateBtn');
    const status = document.getElementById('status');
    const audioPlayer = document.getElementById('audioPlayer');
    const processedText = document.getElementById('processedText');
    const processedTextContent = document.getElementById('processedTextContent');
    
    const text = textInput.value.trim();
    if (!text) {
        status.innerHTML = '<div class="error">Please enter some text</div>';
        return;
    }
    
    // Show loading state
    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating...';
    status.innerHTML = '<div class="loading">Generating audio...</div>';
    audioPlayer.style.display = 'none';
    processedText.style.display = 'none';
    
    try {
        const headers = {
            'Content-Type': 'application/json',
        };
        
        // Add API key if configured
        if (window.appSettings) {
            const apiKey = window.appSettings.get('apiKey');
            if (apiKey) {
                headers['Authorization'] = `Bearer ${apiKey}`;
            }
        }
        
        // Prepare request body
        const requestBody = {
            text: text,
            language_id: 'he',
            audio_prompt_path: 'ref3.wav',
            add_diacritics: diacriticsCheckbox.checked
        };

        // Add reference audio if available and enabled
        const referenceAudioData = getReferenceAudioData();
        const referenceAudioEnabled = document.getElementById('referenceAudioEnabled').checked;
        if (referenceAudioData && referenceAudioEnabled) {
            requestBody.reference_audio_base64 = referenceAudioData;
        }

        // Use current settings for base URL to ensure we have the latest value
        const currentBaseUrl = window.appSettings ? window.appSettings.get('baseUrl') : BASE_URL;
        
        const response = await fetch(`${currentBaseUrl}/tts`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Convert base64 to blob for audio playback
        const audioBytes = atob(data.audio_base64);
        const audioArray = new Uint8Array(audioBytes.length);
        for (let i = 0; i < audioBytes.length; i++) {
            audioArray[i] = audioBytes.charCodeAt(i);
        }
        const audioBlob = new Blob([audioArray], { type: 'audio/m4a' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Show the processed text
        processedTextContent.textContent = data.processed_text;
        processedText.style.display = 'block';
        
        // Play the audio
        audioPlayer.src = audioUrl;
        audioPlayer.style.display = 'block';
        audioPlayer.play().catch(e => console.log('Autoplay prevented by browser:', e));
        status.innerHTML = '<div style="color: #28a745;">Audio generated successfully!</div>';
        
    } catch (error) {
        console.error('Error generating audio:', error);
        status.innerHTML = `<div class="error">Error generating audio: ${error.message}</div>`;
    } finally {
        // Reset button state
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate Audio';
    }
}

// Allow Enter key to trigger generation
document.getElementById('textInput').addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 'Enter') {
        generateAudio();
    }
});

// Reference Audio Management Functions
let referenceAudioData = null;
let referenceAudioFileName = null;

function initializeReferenceAudio() {
    // Load reference audio from localStorage if available
    const savedAudioData = localStorage.getItem('referenceAudioData');
    const savedFileName = localStorage.getItem('referenceAudioFileName');
    const savedEnabled = localStorage.getItem('referenceAudioEnabled') === 'true';
    
    if (savedAudioData && savedFileName) {
        referenceAudioData = savedAudioData;
        referenceAudioFileName = savedFileName;
        
        // Set up audio player with saved data
        const audioPlayer = document.getElementById('referenceAudioPlayer');
        const dataUrl = `data:audio/wav;base64,${savedAudioData}`;
        audioPlayer.src = dataUrl;
        audioPlayer.style.display = 'block';
        
        updateReferenceAudioStatus(savedFileName);
    }

    // Set checkbox state
    document.getElementById('referenceAudioEnabled').checked = savedEnabled;

    // Set up event listeners
    const selectReferenceBtn = document.getElementById('selectReferenceBtn');
    const removeReferenceBtn = document.getElementById('removeReferenceBtn');
    const referenceAudioInput = document.getElementById('referenceAudioInput');
    const toggleBtn = document.getElementById('referenceAudioToggle');
    const enableCheckbox = document.getElementById('referenceAudioEnabled');

    selectReferenceBtn.addEventListener('click', () => {
        referenceAudioInput.click();
    });

    removeReferenceBtn.addEventListener('click', removeReferenceAudio);

    referenceAudioInput.addEventListener('change', handleReferenceAudioSelection);

    // Collapsible toggle functionality
    toggleBtn.addEventListener('click', () => {
        const collapseDiv = document.getElementById('referenceAudioCollapse');
        const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
        
        if (isExpanded) {
            collapseDiv.classList.remove('expanded');
            toggleBtn.setAttribute('aria-expanded', 'false');
        } else {
            collapseDiv.classList.add('expanded');
            toggleBtn.setAttribute('aria-expanded', 'true');
        }
    });

    // Save enabled state when checkbox changes
    enableCheckbox.addEventListener('change', () => {
        localStorage.setItem('referenceAudioEnabled', enableCheckbox.checked.toString());
    });
}

function handleReferenceAudioSelection(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['.wav', '.m4a', '.mp3', '.aac'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!validTypes.includes(fileExtension)) {
        alert('Please select a valid audio file (WAV, M4A, MP3, or AAC format).');
        event.target.value = '';
        return;
    }

    // Validate file size (max 5MB)
    const maxSizeBytes = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSizeBytes) {
        alert('File size exceeds 5MB limit. Please select a smaller file.');
        event.target.value = '';
        return;
    }

    // Convert file to base64
    const reader = new FileReader();
    reader.onload = function(e) {
        const base64Data = e.target.result.split(',')[1]; // Remove data:audio/... prefix
        const dataUrl = e.target.result; // Keep full data URL for audio player
        
        referenceAudioData = base64Data;
        referenceAudioFileName = file.name;
        
        // Save to localStorage
        localStorage.setItem('referenceAudioData', base64Data);
        localStorage.setItem('referenceAudioFileName', file.name);
        
        // Set up audio player
        const audioPlayer = document.getElementById('referenceAudioPlayer');
        audioPlayer.src = dataUrl;
        audioPlayer.style.display = 'block';
        
        // Update UI
        updateReferenceAudioStatus(file.name);
    };
    
    reader.onerror = function() {
        alert('Error reading file. Please try again.');
        event.target.value = '';
    };
    
    reader.readAsDataURL(file);
}

function updateReferenceAudioStatus(fileName) {
    const statusDiv = document.getElementById('referenceAudioStatus');
    
    if (fileName) {
        statusDiv.innerHTML = `<span class="has-reference">${fileName}</span>`;
    } else {
        statusDiv.innerHTML = '<span class="no-reference">No reference audio selected</span>';
    }
}

function removeReferenceAudio() {
    referenceAudioData = null;
    referenceAudioFileName = null;
    
    // Clear localStorage
    localStorage.removeItem('referenceAudioData');
    localStorage.removeItem('referenceAudioFileName');
    
    // Reset file input
    document.getElementById('referenceAudioInput').value = '';
    
    // Hide and reset audio player
    const audioPlayer = document.getElementById('referenceAudioPlayer');
    audioPlayer.src = '';
    audioPlayer.style.display = 'none';
    
    // Update UI
    updateReferenceAudioStatus(null);
}

function getReferenceAudioData() {
    return referenceAudioData;
}
