# RunPod Deployment Guide

## Overview

This app has been converted from FastAPI to RunPod Serverless architecture for scalable TTS (Text-to-Speech) processing.

## Deployment Options

### Option 1: Deploy from GitHub (Recommended)

1. Push your code to a GitHub repository
2. Go to [RunPod Console](https://www.runpod.io/console/serverless)
3. Click "New Endpoint" → "Import Git Repository"
4. Connect your GitHub repo
5. RunPod will automatically build using the Dockerfile
6. Configure your endpoint settings:
   - **Name**: Your endpoint name
   - **Timeout**: 300 seconds (or higher for longer audio)
   - **Workers**: Start with 1-2, scale as needed
   - **GPU**: Choose based on your needs (CPU works fine for this TTS model)

### Option 2: Deploy from Docker Registry

1. Build and push your image:
   ```bash
   docker build -t your-registry/tts-app:latest .
   docker push your-registry/tts-app:latest
   ```

2. In RunPod Console: "New Endpoint" → "Import from Docker Registry"
3. Enter your image URL: `your-registry/tts-app:latest`

## Configuration

### Required Environment Variables

- No special environment variables needed for the TTS models (they download automatically)

### API Key Setup

Users need to configure their RunPod API key in the web interface:

1. Get your API key from RunPod Console → Settings → API Keys
2. In the web UI, click the settings gear and enter:
   - **Base URL**: `https://api.runpod.ai/v2/YOUR_ENDPOINT_ID`
   - **API Key**: Your RunPod API key

## Usage

### Input Format

```json
{
  "input": {
    "text": "שלום עולם",
    "language_id": "he",
    "audio_prompt_path": "female1.wav",
    "add_diacritics": true,
    "reference_audio_base64": "optional_base64_audio"
  }
}
```

### API Endpoints

- **Submit Job**: `POST https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/run`
- **Check Status**: `GET https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/status/JOB_ID`
- **Synchronous**: `POST https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/runsync` (for faster processing)

### Example cURL

```bash
# Submit job
curl -H "Authorization: Bearer $RUNPOD_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"input":{"text":"שלום עולם","add_diacritics":true}}' \
     https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/run

# Check status
curl -H "Authorization: Bearer $RUNPOD_API_KEY" \
     https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/status/JOB_ID
```

## Output Format

```json
{
  "audio_base64": "base64_encoded_m4a_audio",
  "processed_text": "שָׁלוֹם עוֹלָם"
}
```

## Cost Optimization

- **Cold starts**: Models load when container starts (~30-60 seconds)
- **Warm instances**: Keep at least 1 worker active for faster response
- **Scaling**: RunPod auto-scales based on queue length
- **GPU vs CPU**: This model works well on CPU, GPU mainly helps with faster inference

## Troubleshooting

### Common Issues

1. **"RunPod API key is required"**: Set API key in web UI settings
2. **Job timeouts**: Increase timeout setting in endpoint configuration  
3. **Model loading errors**: Check container logs for download issues
4. **Audio processing fails**: Ensure reference audio is valid format

### Logs

Check RunPod Console → Your Endpoint → Logs for detailed error messages.

## Web Interface Changes

The web interface now:
- Submits jobs via `/run` endpoint
- Polls job status every 2 seconds
- Shows real-time status updates (IN_QUEUE, IN_PROGRESS, COMPLETED)
- Requires RunPod API key configuration
- Handles longer processing times with proper user feedback
