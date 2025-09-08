# RunPod TTS (Text-to-Speech) Service

Hebrew TTS service using RunPod Serverless for scalable audio generation with diacritics support.

[![Runpod](https://api.runpod.io/badge/thewh1teagle/phonikud-chatterbox-runpod)](https://console.runpod.io/hub/thewh1teagle/phonikud-chatterbox-runpod)

## ✅ Tested & Working

This service has been successfully converted to RunPod serverless format and tested locally.

## Quick Start

### 1. Local Testing
```bash
# Run locally with RunPod test server
uv run src/main.py --rp_serve_api

# Test with curl (synchronous)
curl -X POST http://localhost:8000/runsync \
  -H "Content-Type: application/json" \
  -d '{"input": {"text": "שלום עולם", "add_diacritics": true}}'

# Test with curl (job queue)  
curl -X POST http://localhost:8000/run \
  -H "Content-Type: application/json" \
  -d '{"input": {"text": "שלום עולם", "add_diacritics": true}}'
```

### 2. Deploy to RunPod
See [runpod_deployment.md](./runpod_deployment.md) for complete deployment instructions.

### 3. Web Interface

**Local Testing:**
1. Start the local server: `uv run src/main.py --rp_serve_api`
2. Open `web/index.html` in VS Code Live Server
3. The interface automatically detects localhost and works without API key! 🎉

**Production:**
Use the hosted interface: **https://thewh1teagle.github.io/phonikud-chatterbox-runpod/**

*Configure your RunPod endpoint URL and API key in the settings for production use.*

## API Usage

### Input Format
```json
{
  "input": {
    "text": "שלום עולם",
    "language_id": "he", 
    "add_diacritics": true,
    "audio_prompt_path": "ref3.wav",
    "reference_audio_base64": "optional_base64_audio"
  }
}
```

### Output Format
```json
{
  "audio_base64": "base64_encoded_m4a_audio",
  "processed_text": "שָׁלוֹם עוֹלָם"  
}
```

### RunPod Endpoints
- **Async**: `POST https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/run`
- **Sync**: `POST https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/runsync`
- **Status**: `GET https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/status/JOB_ID`
