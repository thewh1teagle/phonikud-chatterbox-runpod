// Configuration
let BASE_URL = 'http://localhost:8000';

// Update BASE_URL from settings when available
function updateBaseUrl(newUrl) {
    BASE_URL = newUrl;
}

// Load settings on startup
document.addEventListener('DOMContentLoaded', () => {
    if (window.appSettings) {
        BASE_URL = window.appSettings.get('baseUrl');
    }
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
        
        const response = await fetch(`${BASE_URL}/tts`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                text: text,
                language_id: 'he',
                audio_prompt_path: 'ref3.wav',
                add_diacritics: diacriticsCheckbox.checked
            })
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
