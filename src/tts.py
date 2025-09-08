"""
wget https://huggingface.co/thewh1teagle/phonikud-onnx/resolve/main/phonikud-1.0.int8.onnx
wget https://github.com/thewh1teagle/phonikud-chatterbox/releases/download/asset-files-v1/female1.wav
uv run main.py
"""
from chatterbox.mtl_tts import ChatterboxMultilingualTTS
from chatterbox.models.utils import get_device
from phonikud_onnx import Phonikud
from phonikud import lexicon
import re
import io
import torch
import torchaudio


class TTS:
    def __init__(self, phonikud_model_path: str, chatterbox_model_path: str):
        # Initialize the models
        device = get_device()
        self.phonikud_model = Phonikud(phonikud_model_path)
        self.chatterbox_model = ChatterboxMultilingualTTS.from_pretrained(device=device)

    def create(self, text: str, language_id: str, audio_prompt_path: str, add_diacritics: bool = True):
        if add_diacritics:
            with_diacritics = self.phonikud_model.add_diacritics(text)
            # remove non standard diacritics
            with_diacritics = re.sub(fr"[{lexicon.NON_STANDARD_DIAC}]", "", with_diacritics)
        else:
            with_diacritics = text
        print(f'Input: {with_diacritics}')
        wav = self.chatterbox_model.generate(with_diacritics, language_id=language_id, audio_prompt_path=audio_prompt_path)
        
        # keep in torch instead of numpy
        wav = wav.detach().cpu()

        # make sure it has shape (channels, frames)
        if wav.ndim == 1:
            wav = wav.unsqueeze(0)  # (1, n_samples)

        # write to buffer
        buffer = io.BytesIO()
        torchaudio.save(buffer, wav, self.chatterbox_model.sr, format="wav")
        buffer.seek(0)

        
        
        # Return the audio and the sample rate
        return buffer, self.chatterbox_model.sr
