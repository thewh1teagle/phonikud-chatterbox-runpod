"""
RunPod Serverless TTS Handler

wget -O phonikud-1.0.int8.onnx https://huggingface.co/thewh1teagle/phonikud-onnx/resolve/main/phonikud-1.0.int8.onnx
wget -O ref3.wav https://github.com/thewh1teagle/phonikud-chatterbox/releases/download/asset-files-v1/ref3.wav
"""
import runpod
from tts import TTS
import pydub
import io
import base64
import tempfile
import os
from phonikud_onnx import Phonikud
from phonikud import lexicon
import re

# Initialize models (loaded once when container starts, outside the handler)
print("Loading TTS models...")
tts_model = TTS(phonikud_model_path="phonikud-1.0.int8.onnx", chatterbox_model_path="ref3.wav")
phonikud_model = Phonikud("phonikud-1.0.int8.onnx")
print("Models loaded successfully!")

def handler(job):
    """
    RunPod serverless handler function.
    
    Expected input format:
    {
        "text": "שלום עולם",
        "language_id": "he",
        "audio_prompt_path": "ref3.wav",
        "add_diacritics": true,
        "reference_audio_base64": null  // optional
    }
    
    Returns:
    {
        "audio_base64": "base64_encoded_audio",
        "processed_text": "processed_text_with_diacritics"
    }
    """
    try:
        # Get input parameters
        input_data = job["input"]
        text = input_data.get("text", "שלום עולם")
        language_id = input_data.get("language_id", "he")
        audio_prompt_path = input_data.get("audio_prompt_path", "ref3.wav")
        add_diacritics = input_data.get("add_diacritics", True)
        reference_audio_base64 = input_data.get("reference_audio_base64")
        
        print(f"Received text: '{text}', add_diacritics: {add_diacritics}")
        
        # Handle reference audio if provided
        temp_audio_file = None
        
        if reference_audio_base64:
            try:
                # Decode base64 audio data
                audio_data = base64.b64decode(reference_audio_base64)
                
                # Create temporary file
                temp_audio_file = tempfile.NamedTemporaryFile(delete=False, suffix='.wav')
                temp_audio_file.write(audio_data)
                temp_audio_file.close()
                
                audio_prompt_path = temp_audio_file.name
                print(f"Using uploaded reference audio: {audio_prompt_path}")
            except Exception as e:
                print(f"Error processing reference audio: {e}")
                # Fall back to default reference audio
                audio_prompt_path = input_data.get("audio_prompt_path", "ref3.wav")
        
        # Generate audio and get processed text
        wav, _sample_rate = tts_model.create(text, language_id, audio_prompt_path, add_diacritics)
        wav.seek(0)
        
        # Convert to m4a format
        audio = pydub.AudioSegment.from_wav(wav)
        buf = io.BytesIO()
        audio.export(buf, format="ipod")  # ipod format = m4a
        buf.seek(0)
        
        # Encode to base64
        audio_base64 = base64.b64encode(buf.read()).decode('utf-8')
        
        # Get the processed text (with diacritics if enabled)
        if add_diacritics:
            processed_text = phonikud_model.add_diacritics(text)
            processed_text = re.sub(fr"[{lexicon.NON_STANDARD_DIAC}]", "", processed_text)
        else:
            processed_text = text
        
        # Clean up temporary file if it was created
        if temp_audio_file and os.path.exists(temp_audio_file.name):
            try:
                os.unlink(temp_audio_file.name)
                print(f"Cleaned up temporary file: {temp_audio_file.name}")
            except Exception as e:
                print(f"Error cleaning up temporary file: {e}")
        
        return {
            "audio_base64": audio_base64,
            "processed_text": processed_text
        }
        
    except Exception as e:
        print(f"Error in handler: {e}")
        return {"error": str(e)}

# Start RunPod serverless worker
if __name__ == "__main__":
    runpod.serverless.start({"handler": handler})