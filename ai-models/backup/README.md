# Model Backup Directory

Thư mục này chứa các model files không còn được sử dụng trong hệ thống chấm điểm hiện tại.

## Tại sao các model này được backup?

Hệ thống hiện tại sử dụng **Intelligent Scoring System v2** (`/score-v2` endpoint) - một hệ thống prompt-aware sử dụng Gemini API, không cần model files. Các model files cũ chỉ được dùng cho các endpoint legacy (`/score`, `/score-ai`) như fallback.

## Cấu trúc thư mục

### `legacy-models/`
Các model files cũ không còn được load bởi `model_loader.py`:
- `model.keras` - Legacy model ở root directory
- `scaler.pkl` - Legacy scaler
- `vectorizer.pkl` - Legacy vectorizer
- `bert_ielts_model/` - Legacy BERT model (không còn được dùng)

### `duplicate-models/`
Các model files duplicate:
- `python-services-writing-scorer/` - Duplicate của models trong `python-services/ai-models/`

## Model files đang được sử dụng

Các model files trong `ai-models/writing-scorer/models/` vẫn được giữ lại để:
- Fallback cho `/score` và `/score-ai` endpoints
- Tương thích ngược nếu cần

Các model này bao gồm:
- `IELTS_Model/` - Traditional feature-based model
- `IELTS_Model_BERT/` - BERT sentence transformer model
- `IELTS_Model_BERT_Multi_Fine/` - BERT multi-task fine-tuned model
- `IELTS_Model_BERT_PRO/` - BERT PRO model

## Khi nào có thể xóa?

Có thể xóa các model trong backup sau khi:
1. ✅ Xác nhận hệ thống mới (`/score-v2`) hoạt động ổn định
2. ✅ Không còn cần fallback về hệ thống cũ
3. ✅ Đã test đầy đủ với production data

## Khôi phục nếu cần

Nếu cần khôi phục các model này:
```bash
# Khôi phục legacy models
Move-Item ai-models/backup/legacy-models/* ai-models/writing-scorer/

# Khôi phục duplicate models
Move-Item ai-models/backup/duplicate-models/python-services-writing-scorer python-services/ai-models/
```

---
**Ngày backup**: 2025-11-14
**Lý do**: Hệ thống mới không cần model files, chỉ dùng Gemini API

