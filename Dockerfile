FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    wget \
    ffmpeg \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy project files
COPY pyproject.toml uv.lock ./
COPY src/ ./src/

# Install UV package manager
RUN pip install uv

# Install dependencies
RUN uv sync --frozen

# Download model files if not included
RUN wget -O phonikud-1.0.int8.onnx https://huggingface.co/thewh1teagle/phonikud-onnx/resolve/main/phonikud-1.0.int8.onnx
RUN wget -O female1.wav https://github.com/thewh1teagle/phonikud-chatterbox/releases/download/asset-files-v1/female1.wav

# Cache Chatterbox models to avoid download at runtime
RUN uv run python -c "from chatterbox.tts import ChatterboxTTS; from chatterbox.mtl_tts import ChatterboxMultilingualTTS; ChatterboxTTS.from_pretrained('cpu'); ChatterboxMultilingualTTS.from_pretrained('cpu'); print('Models cached successfully')"

# RunPod serverless doesn't need exposed ports

# Run the RunPod serverless handler
CMD ["uv", "run", "python", "src/main.py"]