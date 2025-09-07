"""
Development:
    uv run fastapi dev src/main.py
Production:
    uv run fastapi run src/main.py

See https://localhost:8000/docs for the API documentation.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from tts import TTS
import pydub
import io
import base64
import tempfile
import os
from phonikud_onnx import Phonikud
from phonikud import lexicon
import re

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Pydantic models for request and response
class TTSRequest(BaseModel):
    text: str = "שלום עולם"
    language_id: str = "he"
    audio_prompt_path: str = "ref3.wav"
    add_diacritics: bool = True
    reference_audio_base64: str = None

class TTSResponse(BaseModel):
    audio_base64: str
    processed_text: str

tts_model = TTS(phonikud_model_path="phonikud-1.0.int8.onnx", chatterbox_model_path="ref3.wav")
phonikud_model = Phonikud("phonikud-1.0.int8.onnx")

@app.post("/tts", response_model=TTSResponse)
async def tts(request: TTSRequest):
    print(f"Received text: '{request.text}', add_diacritics: {request.add_diacritics}")
    
    # Handle reference audio if provided
    audio_prompt_path = request.audio_prompt_path
    temp_audio_file = None
    
    if request.reference_audio_base64:
        try:
            # Decode base64 audio data
            audio_data = base64.b64decode(request.reference_audio_base64)
            
            # Create temporary file
            import tempfile
            import os
            temp_audio_file = tempfile.NamedTemporaryFile(delete=False, suffix='.wav')
            temp_audio_file.write(audio_data)
            temp_audio_file.close()
            
            audio_prompt_path = temp_audio_file.name
            print(f"Using uploaded reference audio: {audio_prompt_path}")
        except Exception as e:
            print(f"Error processing reference audio: {e}")
            # Fall back to default reference audio
            audio_prompt_path = request.audio_prompt_path
    
    try:
        # Generate audio and get processed text
        wav, _sample_rate = tts_model.create(request.text, request.language_id, audio_prompt_path, request.add_diacritics)
        wav.seek(0)
        
        # Convert to m4a format
        audio = pydub.AudioSegment.from_wav(wav)
        buf = io.BytesIO()
        audio.export(buf, format="ipod")  # ipod format = m4a
        buf.seek(0)
        
        # Encode to base64
        audio_base64 = base64.b64encode(buf.read()).decode('utf-8')
        
        # Get the processed text (with diacritics if enabled)
        if request.add_diacritics:
            # The TTS model already processes the text with diacritics internally
            # We need to get that processed text
            
            processed_text = phonikud_model.add_diacritics(request.text)
            processed_text = re.sub(fr"[{lexicon.NON_STANDARD_DIAC}]", "", processed_text)
        else:
            processed_text = request.text
        
        return TTSResponse(
            audio_base64=audio_base64,
            processed_text=processed_text
        )
    finally:
        # Clean up temporary file if it was created
        if temp_audio_file and os.path.exists(temp_audio_file.name):
            try:
                os.unlink(temp_audio_file.name)
                print(f"Cleaned up temporary file: {temp_audio_file.name}")
            except Exception as e:
                print(f"Error cleaning up temporary file: {e}")

@app.get("/")
async def root():
    return FileResponse("web/index.html")