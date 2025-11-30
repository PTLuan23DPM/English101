# Sử dụng Python 3.10 slim để nhẹ
FROM python:3.10-slim

# Thiết lập biến môi trường để pip không cache (tiết kiệm disk) và tăng timeout
ENV PIP_NO_CACHE_DIR=1 \
    PIP_DEFAULT_TIMEOUT=100 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# 1. Cài đặt System Dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    ffmpeg \
    libsndfile1 \
    git \
    && rm -rf /var/lib/apt/lists/*

# 2. Nâng cấp pip trước
RUN pip install --upgrade pip

# 3. Copy requirements
COPY requirements.txt .

# 4. Cài đặt Python Dependencies (Chia nhỏ để tránh lỗi mạng/bộ nhớ)
# Cài các gói nặng trước (Torch CPU version để nhẹ)
RUN pip install torch --index-url https://download.pytorch.org/whl/cpu

# Cài các gói còn lại với retry
RUN pip install -r requirements.txt --retries 5

# 5. Copy code
COPY . .

# Tạo thư mục temp
RUN mkdir -p temp_audio

# 6. Lệnh chạy Server
CMD sh -c "gunicorn --bind 0.0.0.0:$PORT --workers 1 --threads 8 --timeout 0 ai_scorer:app"