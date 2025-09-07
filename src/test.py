from tts import TTS
import soundfile as sf
import torch

tts_model = TTS(
    phonikud_model_path="phonikud-1.0.int8.onnx",
    chatterbox_model_path="ref3.wav"
)

wav, sr = tts_model.create("שלום עולם", "he", "ref3.wav", True)

# convert torch → numpy float32
wav = wav.detach().cpu().numpy().astype("float32")

# reshape to (frames, 1) for mono
wav = wav.reshape(-1, 1)

sf.write("test.wav", wav, sr)
