FROM python:3.11-slim

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
COPY writing_scorer.py .

# Copy other Python files that might be needed
COPY *.py ./

# Create ai-models directory (will be empty if ai-models not in build context)
RUN mkdir -p ./ai-models

# Copy ai-models directory if it exists in build context
# Note: If ai-models is empty or doesn't exist, this will create an empty directory
# which is fine - the application should handle missing models gracefully
COPY ai-models ./ai-models/

# Expose port
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:5001/health')" || exit 1

# Run the application
CMD ["python", "writing_scorer.py"]

