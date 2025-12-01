"""
IELTS/CEFR Writing Scorer Service (Fixed Import)
Core Logic: Hybrid AI (Deep Learning + Gemini)
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import re
import os
import logging
import sys
import requests
from langdetect import detect, LangDetectException
from pathlib import Path
from typing import Dict, List, Tuple, Optional

# --- 1. SETUP & IMPORTS ---

# Load environment variables
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent.parent / '.env'
    if env_path.exists():
        load_dotenv(env_path)
    else:
        load_dotenv()
except ImportError:
    pass

# Import hệ thống chấm điểm mới
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    # --- SỬA LỖI Ở ĐÂY ---
    # Chỉ import từ hybrid_intelligent_scorer theo yêu cầu của bạn
    from hybrid_intelligent_scorer import score_essay_hybrid
    
    # Cố gắng import biến kiểm tra trạng thái model (nếu có) từ file đó
    # Nếu không có thì mặc định là True để server vẫn chạy
    try:
        from hybrid_intelligent_scorer import MODULES_AVAILABLE
        HYBRID_SCORER_AVAILABLE = MODULES_AVAILABLE
    except ImportError:
        HYBRID_SCORER_AVAILABLE = True
        
    print("✅ Successfully imported hybrid_intelligent_scorer")
    
except ImportError as e:
    print(f"Critical Error importing scorers: {e}")
    print("Hãy chắc chắn file 'hybrid_intelligent_scorer.py' tồn tại và không có lỗi cú pháp.")
    HYBRID_SCORER_AVAILABLE = False

app = Flask(__name__)
CORS(app)

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("WritingScorer")

# --- 2. GUARDRAILS (BỘ LỌC RÁC) ---

_word_cache = {}

def check_word_in_dictionary(word: str, timeout: float = 0.5) -> Optional[bool]:
    """Kiểm tra từ có thực không (Dùng cache để nhanh)"""
    global _word_cache
    clean_word = re.sub(r'[^\w]', '', word.lower())
    if len(clean_word) < 2 or re.search(r'\d', clean_word): return False
    if clean_word in _word_cache: return _word_cache[clean_word]
    
    try:
        # Demo check nhanh: Nếu từ nằm trong top 3000 từ phổ biến thì OK luôn
        # (Ở đây ta giả lập bằng cách return True cho nhanh, thực tế nên dùng file từ điển local)
        return True 
    except:
        return None

def check_is_english(text: str) -> Tuple[bool, str]:
    """
    Chặn ngôn ngữ không phải tiếng Anh (Dùng thư viện langdetect cho chuẩn)
    """
    try:
        # Langdetect cần đoạn văn đủ dài, nếu ngắn quá nó hay sai
        # Nên ta chỉ check nếu text > 20 ký tự
        if len(text) < 20:
            return True, "" # Bỏ qua check nếu quá ngắn
            
        lang = detect(text)
        if lang != 'en':
            return False, f"Ngôn ngữ phát hiện là '{lang}'. Vui lòng viết bằng tiếng Anh."
            
        return True, ""
    except LangDetectException:
        # Nếu không detect được (do toàn ký tự lạ), coi như là rác
        return False, "Không xác định được ngôn ngữ (Văn bản chứa ký tự lạ)."

def detect_gibberish(text: str) -> Tuple[bool, str]:
    """
    Phát hiện văn bản vô nghĩa (Spam phím, Random characters)
    """
    if not text or len(text.strip()) < 10:
        return True, "Văn bản quá ngắn."
        
    # 1. Check tỷ lệ từ có nghĩa (Tránh kiểu: "adklfj lakjdfkl")
    words = text.lower().split()
    common_english = {'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with', 'he', 'she', 'at', 'by'}
    
    # Nếu bài viết dài (>5 từ) mà không có lấy 1 từ nối tiếng Anh nào -> Rác
    english_count = sum(1 for w in words if w in common_english)
    if len(words) > 5 and english_count == 0:
        return True, "Văn bản không giống cấu trúc câu tiếng Anh tự nhiên."

    # 2. Check tỷ lệ nguyên âm (Chặn kiểu 'gdkljhdfg', 'bcdfgh')
    # Tiếng Anh chuẩn thường có khoảng 30-40% nguyên âm
    vowels = len(re.findall(r'[aeiouAEIOU]', text))
    total_chars = len(re.sub(r'[^a-zA-Z]', '', text))
    
    if total_chars > 0:
        ratio = vowels / total_chars
        if ratio < 0.15: 
            return True, "Văn bản chứa quá ít nguyên âm (nghi vấn Spam phím)."
        if ratio > 0.80: 
            return True, "Văn bản chứa quá nhiều nguyên âm (nghi vấn Spam)."
        
    # 3. Check độ dài từ trung bình (Chặn kiểu "aaaaaaaaaaaaa bbbbbbbbbbb")
    avg_len = sum(len(w) for w in words) / len(words) if words else 0
    if avg_len > 15: 
        return True, "Từ vựng dài bất thường (nghi vấn Spam)."
        
    return False, ""

def validate_text_gate(text: str) -> Tuple[bool, str]:
    """
    CỔNG KIỂM SOÁT CHÍNH (GỌI TẤT CẢ CÁC HÀM TRÊN)
    """
    # 1. Check độ dài
    if not text or len(text.strip()) < 10:
        return False, "Bài viết quá ngắn (tối thiểu 10 ký tự)."

    # 2. Check Rác/Spam (Gibberish) - Check cái này trước cho nhẹ
    is_gibberish, reason = detect_gibberish(text)
    if is_gibberish:
        return False, f"Phát hiện Spam: {reason}"

    # 3. Check Ngôn ngữ (Language)
    is_english, lang_msg = check_is_english(text)
    if not is_english:
        return False, lang_msg
        
    return True, ""

def check_word_in_dictionary(word: str, timeout: float = 0.5) -> Optional[bool]:
    """Kiểm tra từ có thực không"""
    global _word_cache
    clean_word = re.sub(r'[^\w]', '', word.lower())
    if len(clean_word) < 2 or re.search(r'\d', clean_word): return False
    if clean_word in _word_cache: return _word_cache[clean_word]
    
    try:
        # Demo API check
        return True 
    except:
        return None

def detect_gibberish(text: str) -> Tuple[bool, str]:
    """Phát hiện văn bản rác"""
    if not text or len(text.strip()) < 10:
        return True, "Văn bản quá ngắn."
        
    words = text.lower().split()
    common_english = {'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with'}
    english_count = sum(1 for w in words if w in common_english)
    
    if len(words) > 5 and english_count == 0:
        return True, "Không phát hiện từ tiếng Anh phổ biến. Vui lòng viết tiếng Anh."

    vowels = len(re.findall(r'[aeiouAEIOU]', text))
    total_chars = len(re.sub(r'[^a-zA-Z]', '', text))
    if total_chars > 0:
        ratio = vowels / total_chars
        if ratio < 0.15: return True, "Văn bản chứa quá ít nguyên âm (Gibberish)."
        if ratio > 0.80: return True, "Văn bản chứa quá nhiều nguyên âm."
        
    return False, ""

def validate_input(text: str) -> Tuple[bool, str]:
    """Cổng kiểm soát đầu vào"""
    is_bad, reason = detect_gibberish(text)
    if is_bad: return False, reason
    return True, ""

# --- 3. UTILS (TIỆN ÍCH) ---

def score_to_cefr(score_10: float) -> Tuple[str, str]:
    """Dịch điểm số (0-10) sang CEFR"""
    s = float(score_10)
    if s >= 8.5: return "C2", "Proficient"
    if s >= 7.0: return "C1", "Advanced"
    if s >= 5.5: return "B2", "Upper Intermediate"
    if s >= 4.0: return "B1", "Intermediate"
    if s >= 2.5: return "A2", "Elementary"
    return "A1", "Beginner"

def get_band_description(score: float) -> str:
    if score >= 8.0: return "Expert User"
    if score >= 7.0: return "Good User"
    if score >= 6.0: return "Competent User"
    if score >= 5.0: return "Modest User"
    return "Limited User"

# --- 4. API ENDPOINTS ---

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'service': 'writing-scorer-final',
        'hybrid_scorer_available': HYBRID_SCORER_AVAILABLE
    })

@app.route('/score', methods=['POST'])
def score_writing():
    """
    API CHẤM ĐIỂM CHÍNH
    """
    try:
        data = request.json
        text = data.get('text', '').strip()
        prompt = data.get('prompt', '').strip()
        task_level = data.get('level', 'B2')
        task_type = data.get('task_type', 'essay')

        # 1. Validate Input
        is_valid, err_msg = validate_input(text)
        if not is_valid:
            return jsonify({
                'score_10': 0,
                'overall_score': 0,
                'cefr_level': 'N/A',
                'band': 'Invalid',
                'feedback': [f"⚠️ {err_msg}"],
                'is_off_topic': True,
                'status': 'REJECTED'
            })

        # 2. Gọi Hybrid Scorer (Từ hybrid_intelligent_scorer.py)
        if not HYBRID_SCORER_AVAILABLE:
            return jsonify({'error': 'Scoring engine not loaded'}), 503

        # Hàm này sẽ tự lo mọi thứ (Model Deep Learning + Gemini)
        result = score_essay_hybrid(
            essay=text,
            prompt=prompt,
            task_level=task_level,
            task_type=task_type
        )

        if 'error' in result:
            return jsonify(result), 500

        # 3. Bổ sung thông tin hiển thị
        final_score = result.get('overall_score', 0)
        cefr_level, cefr_desc = score_to_cefr(final_score)
        
        result.update({
            'cefr_level': cefr_level,
            'cefr_description': cefr_desc,
            'band': get_band_description(final_score)
        })

        return jsonify(result)

    except Exception as e:
        logger.error(f"API Error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/grammar-check', methods=['POST'])
def grammar_check():
    try:
        data = request.json
        text = data.get('text', '')
        if not text: return jsonify({'error': 'No text'}), 400
        
        resp = requests.post(
            'https://api.languagetool.org/v2/check',
            data={'text': text, 'language': 'en-US'}
        )
        return jsonify(resp.json())
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    print(f"🚀 Server running on port {port}")
    app.run(host='0.0.0.0', port=port, debug=True)