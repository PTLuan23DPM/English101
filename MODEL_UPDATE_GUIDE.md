# 🔄 Model Update Guide - Question-Aware BERT Model

## ✅ Đã hoàn thành

1. **Backup**: File `ml_assess.py` cũ đã được backup thành `ml_assess.py.backup`
2. **Copy model mới**: File `ml_assess.py` mới đã được copy từ Downloads
3. **Update service**: `writing_scorer.py` đã được cập nhật để sử dụng `QuestionAssessor`

## 📋 Thay đổi chính

### Model mới: `QuestionAssessor`
- **Question Awareness**: Model mới có thể sử dụng question/prompt để đánh giá chính xác hơn
- **Attention Layer**: Sử dụng self-attention mechanism
- **BiLSTM**: Bidirectional LSTM layer
- **Feature Dimension**: 
  - Without question: 768 (essay only)
  - With question: 1536 (essay 768 + question 768)

### API Changes
- `predict_with_active_model()` bây giờ nhận thêm parameter `prompt`
- Model tự động sử dụng prompt làm question nếu có
- Backward compatible với model cũ

## 🚀 Cách sử dụng

### Option 1: Sử dụng model đã train sẵn
Nếu bạn đã có model được train sẵn trong `bert_question_model/`:
```bash
# Model sẽ tự động load khi start service
cd python-services
python writing_scorer.py
```

### Option 2: Train model mới
Nếu chưa có model, bạn cần train:
```python
from ml_assess import QuestionAssessor

# Initialize với question awareness
assessor = QuestionAssessor(
    max_length=512,
    use_question=True
)

# Load data
df = assessor.load_data('path/to/ielts_dataset.csv')

# Prepare training data
X_train, X_test, y_train, y_test, y_train_orig, y_test_orig = \
    assessor.prepare_training_data(df)

# Train
history = assessor.train(X_train, y_train, X_test, y_test, epochs=50)

# Save model
assessor.save_model('./bert_question_model')
```

## 📁 Cấu trúc file

```
ai-models/writing-scorer/
├── ml_assess.py                    # ✅ Model mới (QuestionAssessor)
├── ml_assess.py.backup            # ✅ Backup của model cũ
├── bert_question_model/           # ⚠️ Cần có để sử dụng (chứa model đã train)
│   ├── model.keras
│   └── metadata.pkl
└── bert_ielts_model/              # Fallback (model cũ)
    ├── model.keras
    └── metadata.pkl
```

## 🔍 Model Loading Priority

Service sẽ load model theo thứ tự:
1. **BERT Question-Aware** (`bert_question_model/`) - Ưu tiên cao nhất
2. **BERT Legacy** (`bert_ielts_model/`) - Fallback
3. **Traditional Model** - Fallback cuối cùng
4. **Fallback Algorithm** - Nếu không có model nào

## 🧪 Test Model

### Test với Python:
```python
from ml_assess import QuestionAssessor

assessor = QuestionAssessor()
assessor.load_model('./bert_question_model')

# Test với question
result = assessor.predict(
    essay="Your essay text here...",
    task_type=2,
    question="Your question/prompt here..."
)

print(f"Score: {result['score']}")
print(f"Band: {result['band']}")
```

### Test với API:
```bash
curl -X POST http://localhost:5001/score-ai \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Your essay text...",
    "prompt": "Your question/prompt..."
  }'
```

## ⚠️ Lưu ý

1. **Model chưa train**: Nếu chưa có `bert_question_model/`, service sẽ fallback về model cũ hoặc traditional model
2. **Question là optional**: Model vẫn hoạt động nếu không có question (sẽ chỉ dùng essay features)
3. **Metadata**: Model mới lưu `use_question` flag trong metadata.pkl
4. **Backward compatibility**: Code vẫn hỗ trợ model cũ (`PMCStyleIELTSAssessor` nếu cần)

## 📝 Next Steps

1. **Train model mới** (nếu chưa có):
   - Chuẩn bị dataset với cột `Question` và `Essay`
   - Chạy training script
   - Save model vào `bert_question_model/`

2. **Test model**:
   - Start Python service
   - Test với writing page
   - Verify question awareness hoạt động

3. **Monitor performance**:
   - So sánh accuracy với model cũ
   - Kiểm tra response time
   - Verify question awareness cải thiện scoring

## 🔗 Files Changed

- ✅ `ai-models/writing-scorer/ml_assess.py` - Model mới
- ✅ `python-services/writing_scorer.py` - Service updated
- ✅ `ai-models/writing-scorer/ml_assess.py.backup` - Backup

## 📞 Support

Nếu có vấn đề:
1. Kiểm tra log khi start service
2. Verify model files tồn tại
3. Check metadata.pkl có đúng format
4. Test với model cũ trước (fallback)

