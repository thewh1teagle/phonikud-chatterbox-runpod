// Configuration - Default to localhost for local testing
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
    const audioPlayerContainer = document.getElementById('audioPlayerContainer');
    const processedText = document.getElementById('processedText');
    const processedTextContent = document.getElementById('processedTextContent');
    
    const text = textInput.value.trim();
    if (!text) {
        status.innerHTML = '<div class="error">Please enter some text</div>';
        return;
    }
    
    // Show loading state
    generateBtn.disabled = true;
    generateBtn.textContent = 'Submitting job...';
    status.innerHTML = '<div class="loading">Submitting job to RunPod...</div>';
    audioPlayerContainer.style.display = 'none';
    processedText.style.display = 'none';
    
    try {
        const headers = {
            'Content-Type': 'application/json',
        };
        
        // Use current settings for base URL to ensure we have the latest value
        const currentBaseUrl = window.appSettings ? window.appSettings.get('baseUrl') : BASE_URL;
        
        // Check if we're in local testing mode
        const isLocalMode = currentBaseUrl.includes('localhost') || currentBaseUrl.includes('127.0.0.1');
        
        let result;
        
        if (isLocalMode) {
            // Local testing mode - direct API call without job queue
            console.log('Running in local testing mode');
            status.innerHTML = '<div class="loading">🧪 Local testing mode - Processing directly...</div>';
            
            // Prepare request body for local testing
            const requestBody = {
                input: {
                    text: text,
                    language_id: 'he',
                    audio_prompt_path: 'ref3.wav',
                    add_diacritics: diacriticsCheckbox.checked
                }
            };

            // Add reference audio if available and enabled
            const referenceAudioData = getReferenceAudioData();
            const referenceAudioEnabled = document.getElementById('referenceAudioEnabled').checked;
            if (referenceAudioData && referenceAudioEnabled) {
                requestBody.input.reference_audio_base64 = referenceAudioData;
            }

            // Call local server directly with /runsync
            const response = await fetch(`${currentBaseUrl}/runsync`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
            }
            
            const responseData = await response.json();
            
            if (responseData.status === 'COMPLETED' && responseData.output) {
                result = responseData.output;
            } else if (responseData.error) {
                throw new Error(responseData.error);
            } else {
                throw new Error('Unexpected response format from local server');
            }
            
        } else {
            // RunPod production mode - requires API key and job queue
            let apiKey = null;
            if (window.appSettings) {
                apiKey = window.appSettings.get('apiKey');
            }
            
            if (!apiKey) {
                throw new Error('RunPod API key is required. Please set it in the settings.');
            }
            
            headers['Authorization'] = `Bearer ${apiKey}`;
            
            // Prepare request body for RunPod
            const requestBody = {
                input: {
                    text: text,
                    language_id: 'he',
                    audio_prompt_path: 'ref3.wav',
                    add_diacritics: diacriticsCheckbox.checked
                }
            };

            // Add reference audio if available and enabled
            const referenceAudioData = getReferenceAudioData();
            const referenceAudioEnabled = document.getElementById('referenceAudioEnabled').checked;
            if (referenceAudioData && referenceAudioEnabled) {
                requestBody.input.reference_audio_base64 = referenceAudioData;
            }
            
            // Submit job to RunPod
            const response = await fetch(`${currentBaseUrl}/run`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
            }
            
            const jobData = await response.json();
            const jobId = jobData.id;
            
            if (!jobId) {
                throw new Error('No job ID returned from RunPod');
            }
            
            console.log('Job submitted:', jobId);
            
            // Start polling for job completion
            generateBtn.textContent = 'Processing...';
            status.innerHTML = '<div class="loading">Processing job... This may take a while.</div>';
            
            result = await pollJobStatus(jobId, currentBaseUrl, apiKey);
            
            if (result.error) {
                throw new Error(result.error);
            }
        }
        
        // Convert base64 to blob for audio playback
        const audioBytes = atob(result.audio_base64);
        const audioArray = new Uint8Array(audioBytes.length);
        for (let i = 0; i < audioBytes.length; i++) {
            audioArray[i] = audioBytes.charCodeAt(i);
        }
        const audioBlob = new Blob([audioArray], { type: 'audio/m4a' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Show the processed text
        processedTextContent.textContent = result.processed_text;
        processedText.style.display = 'block';
        
        // Generate a proper filename with timestamp
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
        const filename = `chatterbox_${timestamp}.m4a`;
        
        // Play the audio
        audioPlayer.src = audioUrl;
        audioPlayerContainer.style.display = 'block';
        audioPlayer.play().catch(e => console.log('Autoplay prevented by browser:', e));
        
        // Set up download functionality
        setupAudioDownload(audioBlob, filename);
        
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

// Poll job status until completion
async function pollJobStatus(jobId, baseUrl, apiKey, maxAttempts = 60, pollInterval = 2000) {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
        try {
            const response = await fetch(`${baseUrl}/status/${jobId}`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const statusData = await response.json();
            console.log(`Job ${jobId} status:`, statusData.status);
            
            // Update status message based on job status
            const status = document.getElementById('status');
            switch (statusData.status) {
                case 'IN_QUEUE':
                    status.innerHTML = '<div class="loading">Job is in queue...</div>';
                    break;
                case 'IN_PROGRESS':
                    status.innerHTML = '<div class="loading">Job is processing...</div>';
                    break;
                case 'COMPLETED':
                    if (statusData.output) {
                        return statusData.output;
                    } else {
                        throw new Error('Job completed but no output received');
                    }
                case 'FAILED':
                    const errorMsg = statusData.error || 'Job failed with unknown error';
                    throw new Error(`Job failed: ${errorMsg}`);
                default:
                    console.log('Unknown job status:', statusData.status);
            }
            
            attempts++;
            
            // Wait before next poll
            await new Promise(resolve => setTimeout(resolve, pollInterval));
            
        } catch (error) {
            console.error('Error polling job status:', error);
            if (attempts >= maxAttempts - 1) {
                throw error;
            }
            attempts++;
            await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
    }
    
    throw new Error(`Job polling timeout after ${maxAttempts} attempts`);
}

// Allow Enter key to trigger generation
document.getElementById('textInput').addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 'Enter') {
        generateAudio();
    }
});

// Audio download functionality
function setupAudioDownload(audioBlob, filename) {
    const downloadBtn = document.getElementById('downloadAudioBtn');
    const filenameDisplay = document.getElementById('downloadFilename');
    
    // Update filename display
    filenameDisplay.textContent = filename;
    
    // Remove previous event listener if any
    const newDownloadBtn = downloadBtn.cloneNode(true);
    downloadBtn.parentNode.replaceChild(newDownloadBtn, downloadBtn);
    
    // Add new event listener
    newDownloadBtn.addEventListener('click', () => {
        const url = URL.createObjectURL(audioBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Show feedback
        const status = document.getElementById('status');
        if (status) {
            status.innerHTML = '<div style="color: #28a745;">Audio downloaded successfully!</div>';
            setTimeout(() => {
                status.innerHTML = '';
            }, 2000);
        }
    });
}

// Reference Audio Management Functions
let referenceAudioData = null;
let referenceAudioFileName = null;

// Recording Variables
let mediaRecorder = null;
let recordedChunks = [];
let recordingTimer = null;
let recordingTimeLeft = 10;

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
    const recordBtn = document.getElementById('recordBtn');
    const stopRecordBtn = document.getElementById('stopRecordBtn');
    const removeReferenceBtn = document.getElementById('removeReferenceBtn');
    const referenceAudioInput = document.getElementById('referenceAudioInput');
    const toggleBtn = document.getElementById('referenceAudioToggle');
    const enableCheckbox = document.getElementById('referenceAudioEnabled');

    selectReferenceBtn.addEventListener('click', () => {
        referenceAudioInput.click();
    });

    recordBtn.addEventListener('click', startRecording);
    stopRecordBtn.addEventListener('click', stopRecording);
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
    
    // Reset recording UI if recording was in progress
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        stopRecording();
    }
    
    // Hide remove button
    document.getElementById('removeReferenceBtn').style.display = 'none';
    
    // Update UI
    updateReferenceAudioStatus(null);
}

function getReferenceAudioData() {
    return referenceAudioData;
}

// Recording Functions
async function startRecording() {
    try {
        // Request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Reset recording state
        recordedChunks = [];
        recordingTimeLeft = 10;
        
        // Create MediaRecorder
        mediaRecorder = new MediaRecorder(stream);
        
        mediaRecorder.ondataavailable = function(event) {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };
        
        mediaRecorder.onstop = function() {
            // Stop all tracks to release the microphone
            stream.getTracks().forEach(track => track.stop());
            processRecordedAudio();
        };
        
        // Start recording
        mediaRecorder.start();
        
        // Update UI
        updateRecordingUI(true);
        
        // Start countdown timer
        startRecordingTimer();
        
    } catch (error) {
        console.error('Error accessing microphone:', error);
        alert('Could not access microphone. Please ensure you have granted microphone permissions and try again.');
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
    }
    
    // Clear timer
    if (recordingTimer) {
        clearInterval(recordingTimer);
        recordingTimer = null;
    }
    
    // Update UI
    updateRecordingUI(false);
}

function startRecordingTimer() {
    const timerElement = document.getElementById('recordingTimer');
    
    recordingTimer = setInterval(() => {
        recordingTimeLeft--;
        timerElement.textContent = `Recording... ${recordingTimeLeft}s`;
        
        if (recordingTimeLeft <= 0) {
            stopRecording();
        }
    }, 1000);
}

function updateRecordingUI(isRecording) {
    const recordBtn = document.getElementById('recordBtn');
    const stopRecordBtn = document.getElementById('stopRecordBtn');
    const selectReferenceBtn = document.getElementById('selectReferenceBtn');
    const recordingStatus = document.getElementById('recordingStatus');
    const removeBtn = document.getElementById('removeReferenceBtn');
    
    if (isRecording) {
        recordBtn.style.display = 'none';
        stopRecordBtn.style.display = 'inline-block';
        selectReferenceBtn.disabled = true;
        removeBtn.style.display = 'none';
        recordingStatus.style.display = 'block';
    } else {
        recordBtn.style.display = 'inline-block';
        stopRecordBtn.style.display = 'none';
        selectReferenceBtn.disabled = false;
        recordingStatus.style.display = 'none';
    }
}

function processRecordedAudio() {
    if (recordedChunks.length === 0) {
        alert('No audio was recorded. Please try again.');
        return;
    }
    
    // Create blob from recorded chunks
    const blob = new Blob(recordedChunks, { type: 'audio/webm' });
    
    // Convert to base64
    const reader = new FileReader();
    reader.onload = function(e) {
        const arrayBuffer = e.target.result;
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        const base64Data = btoa(binary);
        
        // Store the recorded audio
        referenceAudioData = base64Data;
        referenceAudioFileName = `recorded_audio_${new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')}.webm`;
        
        // Save to localStorage
        localStorage.setItem('referenceAudioData', base64Data);
        localStorage.setItem('referenceAudioFileName', referenceAudioFileName);
        
        // Set up audio player
        const audioPlayer = document.getElementById('referenceAudioPlayer');
        const dataUrl = URL.createObjectURL(blob);
        audioPlayer.src = dataUrl;
        audioPlayer.style.display = 'block';
        
        // Update UI
        updateReferenceAudioStatus(referenceAudioFileName + ' (recorded)');
        document.getElementById('removeReferenceBtn').style.display = 'inline-block';
        
        // Show success message
        const status = document.getElementById('status');
        if (status) {
            status.innerHTML = '<div style="color: #28a745;">Voice recorded successfully!</div>';
            setTimeout(() => {
                status.innerHTML = '';
            }, 3000);
        }
    };
    
    reader.readAsArrayBuffer(blob);
}
