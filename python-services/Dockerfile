FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY ai_scorer.py .

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Copy other Python files that might be needed
COPY *.py ./

# Create ai-models directory (will be empty if ai-models not in build context)
RUN mkdir -p ./ai-models

# Copy ai-models directory if it exists in build context
# Note: If ai-models is empty or doesn't exist, this will create an empty directory
# which is fine - the application should handle missing models gracefully
COPY ai-models ./ai-models/

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8080/health')" || exit 1

# Run the application
# Sử dụng exec và :$PORT để nhận cổng từ Google Cloud Run
# --timeout 0 để gunicorn không tự kill khi AI load lâu
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 ai_scorer:app