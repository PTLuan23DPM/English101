FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip first and configure for better download
# Use faster PyPI mirror and enable cache
RUN pip install --upgrade pip setuptools wheel && \
    pip config set global.timeout 2000 && \
    pip config set global.retries 10 && \
    pip config set global.index-url https://pypi.org/simple && \
    pip config set install.cache-dir /tmp/pip-cache

# Copy requirements
COPY requirements.txt .

# Install Python dependencies with increased timeout and retries
# Strategy: Install large packages separately to handle timeouts better
# Step 1: Install small/medium packages first (use cache for speed)
RUN pip install --default-timeout=1000 --retries 10 \
    flask>=2.3.0 \
    flask-cors>=4.0.0 \
    flasgger>=0.9.7 \
    python-dotenv>=1.0.0 \
    numpy>=1.24.0 \
    pandas>=2.0.0 \
    scikit-learn>=1.3.0 \
    requests>=2.31.0 \
    nltk>=3.8.1 \
    langdetect>=1.0.9

# Step 2: Install TensorFlow (large package ~620MB) with extended timeout
# Use cache to speed up if rebuilding
RUN pip install --default-timeout=2000 --retries 10 \
    tensorflow>=2.13.0 \
    tf-keras>=2.13.0 || \
    (echo "Retrying TensorFlow installation..." && \
     pip install --default-timeout=3000 --retries 10 \
     tensorflow>=2.13.0 tf-keras>=2.13.0)

# Step 3: Install PyTorch and transformers (large packages)
# Install PyTorch CPU version first (smaller, faster) then transformers
RUN pip install --default-timeout=2000 --retries 10 \
    torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu || \
    pip install --default-timeout=2000 --retries 10 torch>=2.0.0

# Install transformers separately (depends on torch)
RUN pip install --default-timeout=2000 --retries 10 \
    transformers>=4.30.0 \
    sentence-transformers>=2.2.0 || \
    (echo "Retrying transformers installation..." && \
     pip install --default-timeout=3000 --retries 10 \
     transformers>=4.30.0 sentence-transformers>=2.2.0)

# Copy application code
COPY writing_scorer.py .

# Create ai-models directory (models will be mounted as volume, so no need to copy)
RUN mkdir -p ./ai-models
# Note: ai-models is mounted as volume in docker-compose.yml, so we skip COPY here

# Expose port
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:5001/health')" || exit 1

# Run the application
CMD ["python", "writing_scorer.py"]

