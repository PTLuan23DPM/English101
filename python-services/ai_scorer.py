"""
AI Scorer Service (Combined Writing & Speaking)
- Writing: Hybrid AI (Deep Learning + Gemini)
- Speaking: Whisper ASR + DTW Rhythm Comparison
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import re
import os
import logging
import sys
import requests
import uuid
import subprocess
from langdetect import detect, LangDetectException
from pathlib import Path
from typing import Dict, List, Tuple, Optional

# ============================================================================
# 1. SETUP & IMPORTS
# ============================================================================

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

# Import hệ thống chấm điểm
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import Writing Scorer
try:
    from hybrid_intelligent_scorer import score_essay_hybrid
    try:
        from hybrid_intelligent_scorer import MODULES_AVAILABLE
        WRITING_SCORER_AVAILABLE = MODULES_AVAILABLE
    except ImportError:
        WRITING_SCORER_AVAILABLE = True
    print("✅ Successfully imported hybrid_intelligent_scorer (Writing)")
except ImportError as e:
    print(f"❌ Critical Error importing writing scorer: {e}")
    print("⚠️ Hãy chắc chắn file 'hybrid_intelligent_scorer.py' tồn tại và không có lỗi cú pháp.")
    WRITING_SCORER_AVAILABLE = False
    score_essay_hybrid = None

# Import Speaking Engine
try:
    from speaking_engine import speaking_engine
    SPEAKING_ENGINE_AVAILABLE = True
    print("✅ Successfully imported speaking_engine (Speaking)")
except ImportError as e:
    print(f"⚠️ Warning: Could not import speaking_engine: {e}")
    SPEAKING_ENGINE_AVAILABLE = False
    speaking_engine = None

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("AIScorer")

# Setup upload folder for speaking
UPLOAD_FOLDER = 'temp_audio'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ============================================================================
# 2. WRITING: INPUT VALIDATION & GUARDRAILS
# ============================================================================

_word_cache = {}

def check_word_in_dictionary(word: str, timeout: float = 0.5) -> Optional[bool]:
    """Kiểm tra từ có thực không (Dùng cache để nhanh)"""
    global _word_cache
    clean_word = re.sub(r'[^\w]', '', word.lower())
    if len(clean_word) < 2 or re.search(r'\d', clean_word): 
        return False
    if clean_word in _word_cache: 
        return _word_cache[clean_word]
    
    try:
        # Demo check nhanh: Nếu từ nằm trong top 3000 từ phổ biến thì OK luôn
        return True
    except:
        return None

def check_is_english(text: str) -> Tuple[bool, str]:
    """Chặn ngôn ngữ không phải tiếng Anh (Dùng thư viện langdetect)"""
    try:
        # Langdetect cần đoạn văn đủ dài, nếu ngắn quá nó hay sai
        if len(text) < 20:
            return True, "" # Bỏ qua check nếu quá ngắn
            
        lang = detect(text)
        if lang != 'en':
            return False, f"Ngôn ngữ phát hiện là '{lang}'. Vui lòng viết bằng tiếng Anh."
            
        return True, ""
    except LangDetectException:
        return False, "Không xác định được ngôn ngữ (Văn bản chứa ký tự lạ)."

def detect_gibberish(text: str) -> Tuple[bool, str]:
    """Phát hiện văn bản vô nghĩa (Spam phím, Random characters)"""
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

def validate_writing_input(text: str) -> Tuple[bool, str]:
    """CỔNG KIỂM SOÁT ĐẦU VÀO CHO WRITING"""
    # 1. Check độ dài
    if not text or len(text.strip()) < 10:
        return False, "Bài viết quá ngắn (tối thiểu 10 ký tự)."

    # 2. Check Rác/Spam (Gibberish)
    is_gibberish, reason = detect_gibberish(text)
    if is_gibberish:
        return False, f"Phát hiện Spam: {reason}"

    # 3. Check Ngôn ngữ (Language)
    is_english, lang_msg = check_is_english(text)
    if not is_english:
        return False, lang_msg
        
    return True, ""

# ============================================================================
# 3. WRITING: SCORING UTILITIES
# ============================================================================

def score_to_cefr(score_10: float) -> Tuple[str, str]:
    """Dịch điểm số (0-10) sang CEFR"""
    s = float(score_10)
    if s >= 8.5: 
        return "C2", "Proficient"
    if s >= 7.0: 
        return "C1", "Advanced"
    if s >= 5.5: 
        return "B2", "Upper Intermediate"
    if s >= 4.0: 
        return "B1", "Intermediate"
    if s >= 2.5: 
        return "A2", "Elementary"
    return "A1", "Beginner"

def get_band_description(score: float) -> str:
    """Mô tả band score"""
    if score >= 8.0: 
        return "Expert User"
    if score >= 7.0: 
        return "Good User"
    if score >= 6.0: 
        return "Competent User"
    if score >= 5.0: 
        return "Modest User"
    return "Limited User"

# ============================================================================
# 4. SPEAKING: AUDIO PROCESSING UTILITIES
# ============================================================================

def check_ffmpeg():
    """Check if ffmpeg is available"""
    try:
        subprocess.run(['ffmpeg', '-version'], 
                      stdout=subprocess.PIPE, 
                      stderr=subprocess.PIPE, 
                      check=True,
                      timeout=5)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
        return False

def convert_webm_to_wav(input_path: str, output_path: str) -> Tuple[bool, Optional[str]]:
    """Chuẩn hóa audio từ web (webm) sang wav 16kHz"""
    # WebM format requires FFmpeg
    if not check_ffmpeg():
        error_msg = "FFmpeg is required to convert WebM audio files. Please install FFmpeg from https://ffmpeg.org/download.html"
        print(f"ERROR: {error_msg}")
        return False, error_msg
    
    try:
        command = [
            'ffmpeg', '-y', '-v', 'error',
            '-i', input_path,
            '-ac', '1', '-ar', '16000',
            output_path
        ]
        subprocess.run(command, check=True, capture_output=True, text=True, timeout=30)
        return True, None
    except subprocess.CalledProcessError as e:
        error_msg = e.stderr if e.stderr else "FFmpeg conversion failed"
        print(f"FFmpeg conversion error: {error_msg}")
        return False, f"Audio conversion failed: {error_msg}"
    except FileNotFoundError:
        error_msg = "FFmpeg executable not found. Please install FFmpeg from https://ffmpeg.org/download.html"
        print(f"ERROR: {error_msg}")
        return False, error_msg
    except subprocess.TimeoutExpired:
        error_msg = "Audio conversion timeout. The file may be too large."
        print(f"ERROR: {error_msg}")
        return False, error_msg
    except Exception as e:
        error_msg = f"Audio conversion error: {str(e)}"
        print(f"FFmpeg Error: {e}")
        return False, error_msg

def cleanup_audio_files(*file_paths: str):
    """Cleanup temporary audio files"""
    for file_path in file_paths:
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception as e:
            logger.warning(f"Failed to cleanup {file_path}: {e}")

# ============================================================================
# 5. API ENDPOINTS: HEALTH CHECK
# ============================================================================

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'ai-scorer',
        'writing_scorer_available': WRITING_SCORER_AVAILABLE,
        'speaking_engine_available': SPEAKING_ENGINE_AVAILABLE
    })

# ============================================================================
# 6. API ENDPOINTS: WRITING
# ============================================================================

@app.route('/score', methods=['POST'])
def score_writing():
    """
    API CHẤM ĐIỂM WRITING
    POST /score
    Body: {
        "text": "essay text...",
        "prompt": "task prompt...",
        "level": "B2",
        "task_type": "essay"
    }
    """
    try:
        data = request.json
        text = data.get('text', '').strip()
        prompt = data.get('prompt', '').strip()
        task_level = data.get('level', 'B2')
        task_type = data.get('task_type', 'essay')

        # 1. Validate Input
        is_valid, err_msg = validate_writing_input(text)
        if not is_valid:
            return jsonify({
                'score_10': 0,
                'overall_score': 0,
                'cefr_level': 'N/A',
                'band': 'Invalid',
                'feedback': [f"⚠️ {err_msg}"],
                'is_off_topic': True,
                'status': 'REJECTED'
            }), 400

        # 2. Check if writing scorer is available
        if not WRITING_SCORER_AVAILABLE or score_essay_hybrid is None:
            return jsonify({'error': 'Writing scoring engine not loaded'}), 503

        # 3. Score essay using hybrid scorer
        result = score_essay_hybrid(
            essay=text,
            prompt=prompt,
            task_level=task_level,
            task_type=task_type
        )
        
        if 'error' in result:
            return jsonify(result), 500
        
        # 4. Add CEFR level and band description
        final_score = result.get('overall_score', 0)
        cefr_level, cefr_desc = score_to_cefr(final_score)
        
        result.update({
            'cefr_level': cefr_level,
            'cefr_description': cefr_desc,
            'band': get_band_description(final_score)
        })

        # 5. Log final score
        logger.info(f"[Writing] Final Score: {final_score}/10 | CEFR: {cefr_level} | Text length: {len(text)}")

        return jsonify(result)

    except Exception as e:
        logger.error(f"Writing API Error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/grammar-check', methods=['POST'])
def grammar_check():
    """
    API KIỂM TRA NGỮ PHÁP (Writing)
    POST /grammar-check
    Body: {
        "text": "text to check..."
    }
    """
    try:
        data = request.json
        text = data.get('text', '')
        if not text: 
            return jsonify({'error': 'No text provided'}), 400
        
        resp = requests.post(
            'https://api.languagetool.org/v2/check',
            data={'text': text, 'language': 'en-US'}
        )
        return jsonify(resp.json())
    except Exception as e:
        logger.error(f"Grammar check error: {e}")
        return jsonify({'error': str(e)}), 500

# ============================================================================
# 7. API ENDPOINTS: SPEAKING
# ============================================================================

@app.route('/score-speech', methods=['POST'])
def score_speech():
    """
    API CHẤM ĐIỂM SPEAKING
    POST /score-speech
    Form Data:
        - audio: audio file (webm)
        - prompt or referenceText: reference text
        - mode: roleplay | shadowing | dubbing
    """
    try:
        # 1. Validate request
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
            
        file = request.files['audio']
        if file.filename == '':
            return jsonify({'error': 'Empty audio file'}), 400
        
        # 2. Get parameters
        prompt = request.form.get('prompt', '') or request.form.get('referenceText', '')
        mode = request.form.get('mode', 'roleplay')  # roleplay, shadowing, dubbing
        
        # 3. Check if speaking engine is available
        if not SPEAKING_ENGINE_AVAILABLE or speaking_engine is None:
            return jsonify({'error': 'Speaking engine not loaded'}), 503
        
        # 4. Save uploaded file
        filename = str(uuid.uuid4())
        webm_path = os.path.join(UPLOAD_FOLDER, f"{filename}.webm")
        wav_path = os.path.join(UPLOAD_FOLDER, f"{filename}.wav")
        
        try:
            file.save(webm_path)
        except Exception as e:
            return jsonify({'error': f'Failed to save audio file: {str(e)}'}), 500
        
        # 5. Convert webm to wav
        conversion_success, conversion_error = convert_webm_to_wav(webm_path, wav_path)
        if not conversion_success:
            cleanup_audio_files(webm_path)
            return jsonify({
                'error': 'Audio conversion failed', 
                'details': conversion_error or 'FFmpeg is required to convert audio files.'
            }), 500
        
        # 6. Score using speaking engine
        try:
            result = speaking_engine.score_submission(wav_path, prompt)
        except Exception as engine_error:
            import traceback
            logger.error(f"Speaking engine error: {engine_error}")
            logger.error(traceback.format_exc())
            cleanup_audio_files(webm_path, wav_path)
            return jsonify({
                'error': 'Scoring engine error',
                'details': str(engine_error)
            }), 500
        
        # 7. Apply mode-specific score adjustments
        content_accuracy = result.get('content_accuracy', 0)
        pronunciation_score = result.get('pronunciation_score', 0)
        
        if mode == 'shadowing':
            # Shadowing: 40% content, 60% pronunciation (focus on rhythm/pronunciation)
            result['overall_score'] = round(
                content_accuracy * 0.4 + pronunciation_score * 0.6, 
                1
            )
        elif mode == 'dubbing':
            # Dubbing: 50% content, 50% pronunciation (balance timing and accuracy)
            result['overall_score'] = round(
                content_accuracy * 0.5 + pronunciation_score * 0.5, 
                1
            )
        else:  # roleplay (default)
            # Roleplay: 60% content, 40% pronunciation (focus on communication)
            result['overall_score'] = round(
                content_accuracy * 0.6 + pronunciation_score * 0.4, 
                1
            )
        
        # 8. Normalize score to 0-10 scale
        if result.get('overall_score', 0) > 10:
            result['overall_score'] = round(result['overall_score'] / 10, 1)
        result['score_10'] = result.get('overall_score', 0)
        
        # 9. Log result
        logger.info(f"[Speaking] Mode: {mode} | Score: {result['overall_score']}/10 | Content: {content_accuracy} | Pronunciation: {pronunciation_score}")
        
        # 10. Cleanup temporary files
        cleanup_audio_files(webm_path, wav_path)
        
        return jsonify(result)
            
    except Exception as e:
        import traceback
        logger.error(f"Speaking API Error: {e}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

# ============================================================================
# 8. MAIN ENTRY POINT
# ============================================================================

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    print(f"🚀 AI Scorer Service (Writing & Speaking) running on port {port}")
    print(f"   - Writing Scorer: {'✅ Available' if WRITING_SCORER_AVAILABLE else '❌ Not Available'}")
    print(f"   - Speaking Engine: {'✅ Available' if SPEAKING_ENGINE_AVAILABLE else '❌ Not Available'}")
    app.run(host='0.0.0.0', port=port, debug=True)

