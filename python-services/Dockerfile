FROM python:3.10-slim

WORKDIR /app

# Cài system deps và dọn dẹp ngay lập tức
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ ffmpeg libsndfile1 git \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip
RUN pip install --no-cache-dir --upgrade pip

# --- CHIẾN THUẬT CHIA NHỎ ---

# 1. Cài Torch CPU trước (Nặng nhất ~200MB whl -> 800MB installed)
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# 2. Cài Transformers & Sentence-Transformers (Khá nặng)
RUN pip install --no-cache-dir transformers sentence-transformers

# 3. Cài Whisper & Librosa (Nặng trung bình)
RUN pip install --no-cache-dir openai-whisper librosa soundfile scipy fastdtw

# 4. Cài các thư viện nhẹ còn lại (Flask, Gunicorn...)
COPY requirements.txt .
# Dùng grep để loại bỏ các thư viện đã cài ở trên khỏi file requirements để tránh cài lại
RUN grep -vE "torch|transformers|sentence-transformers|openai-whisper|librosa|soundfile|scipy|fastdtw" requirements.txt > req_light.txt && \
    pip install --no-cache-dir -r req_light.txt

# ----------------------------

COPY . .
RUN mkdir -p temp_audio
ENV PYTHONUNBUFFERED=1
EXPOSE 8080

CMD sh -c "gunicorn --bind 0.0.0.0:$PORT --workers 1 --threads 8 --timeout 0 ai_scorer:app"