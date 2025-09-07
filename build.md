## Build

```console
docker build -t thewh1teagle/phonikud-chatterbox .
docker run -p 8000:8000 thewh1teagle/phonikud-chatterbox 
docker push thewh1teagle/phonikud-chatterbox
```

## Test

```console
curl -X POST "http://localhost:8000/tts" \
  -H "Content-Type: application/json" \
  -d '{"text": "שלום עולם", "language_id": "he", "add_diacritics": true}'
```