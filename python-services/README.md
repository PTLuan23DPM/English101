# IELTS Writing Scorer Service

Python Flask service for scoring IELTS writing essays using multiple AI models.

## Quick Start

### Windows
```bash
# Double-click hoặc chạy trong terminal
start-service.bat
```

### Linux/Mac
```bash
chmod +x start-service.sh
./start-service.sh
```

### Manual Start
```bash
cd python-services
pip install -r requirements.txt
python writing_scorer.py
```

## Features

- ✅ Multiple AI Models Support (BERT PRO, BERT Multi-task, BERT, Traditional)
- ✅ Automatic Model Selection (uses best available model)
- ✅ No Prompt Required (AI models score without prompt)
- ✅ Detailed Feedback (4 criteria: Task Response, Coherence, Lexical Resource, Grammar)
- ✅ Grammar Checking (LanguageTool API integration)
- ✅ CEFR Level Conversion
- ✅ IELTS Band Score (0-9)
- ✅ **Swagger API Documentation** - Interactive API docs at `/api-docs`

## API Documentation

### Swagger UI (Interactive)
Once the service is running, open in browser:
```
http://localhost:5001/api-docs
```

This provides interactive API documentation where you can:
- View all endpoints
- See request/response schemas
- Test APIs directly from the browser
- Download OpenAPI specification

### API Endpoints

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for detailed API documentation.

### Quick Examples

**Health Check:**
```bash
curl http://localhost:5001/health
```

**Score Essay:**
```bash
curl -X POST http://localhost:5001/score-ai \
  -H "Content-Type: application/json" \
  -d '{"text": "Your essay text here..."}'
```

**Grammar Check:**
```bash
curl -X POST http://localhost:5001/grammar-check \
  -H "Content-Type: application/json" \
  -d '{"text": "I recieve the letter."}'
```

## Models

The service automatically loads and selects the best available model:

1. **BERT PRO** (Best accuracy)
2. **BERT Multi-task** (Very high accuracy)
3. **BERT** (High accuracy)
4. **Traditional** (Fast, moderate accuracy)

Models should be located in: `ai-models/writing-scorer/models/`

## Requirements

- Python 3.8+
- TensorFlow 2.13+
- Flask 2.3+
- See `requirements.txt` for full list

## Installation

```bash
pip install -r requirements.txt
```

## Configuration

Service runs on `http://localhost:5001` by default.

Swagger documentation available at: `http://localhost:5001/api-docs`

To change port, edit `writing_scorer.py`:
```python
app.run(host='0.0.0.0', port=5001, debug=True)
```

## Troubleshooting

### Models Not Loading
- Ensure models are in `ai-models/writing-scorer/models/`
- Check file permissions
- Verify model files are complete

### Dependencies Issues
- Use Python 3.8+
- Install dependencies: `pip install -r requirements.txt`
- For tf-keras: `pip install tf-keras`
- For sentence-transformers: `pip install sentence-transformers`

### Service Won't Start
- Check if port 5001 is available
- Verify Python installation
- Check error logs in console

## License

Internal use only.
