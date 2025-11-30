# Sử dụng Python 3.10 slim để nhẹ
FROM python:3.10-slim

# Thiết lập thư mục làm việc
WORKDIR /app

# 1. Cài đặt System Dependencies (Gộp chung 1 lệnh để tối ưu layer)
# gcc, g++: Cho các thư viện Python cần biên dịch
# ffmpeg, libsndfile1: Cho xử lý Audio (Speaking)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# 2. Cài đặt Python Dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 3. Copy toàn bộ code vào (Bao gồm ai_scorer.py và các module khác)
COPY . .

# Tạo thư mục temp để xử lý audio (nếu chưa có)
RUN mkdir -p temp_audio

# 4. Cấu hình biến môi trường
# PYTHONUNBUFFERED=1: Log hiện ngay lập tức (quan trọng để debug trên Cloud Run)
ENV PYTHONUNBUFFERED=1

# EXPOSE chỉ để document, Cloud Run sẽ tự map port
EXPOSE 8080

# 5. Lệnh chạy Server (Quan trọng)
# Dùng 'sh -c' để biến $PORT được hiểu đúng
# --timeout 0: Vô hiệu hóa timeout của Gunicorn worker (để AI load lâu không bị kill)
CMD sh -c "gunicorn --bind 0.0.0.0:$PORT --workers 1 --threads 8 --timeout 0 ai_scorer:app"