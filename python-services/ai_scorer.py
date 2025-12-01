"""
AI Scorer Service (Unified)
- Writing: Hybrid AI (Deep Learning + Gemini)
- Speaking: Whisper ASR + Pronunciation Scoring
"""

import os
import sys
import logging
import uuid
import subprocess
from pathlib import Path
from typing import Tuple, Optional, List, Dict
import re
import requests

from flask import Flask, request, jsonify
from flask_cors import CORS
from langdetect import detect, LangDetectException

# --- 1. SETUP & CONFIG ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("AIScorer")

# Load env
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent.parent / '.env')
except ImportError:
    pass

# Thêm path hiện tại để import module con
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# --- 2. LOAD MODULES (LAZY LOADING / SAFE IMPORT) ---
# WRITING
try:
    from hybrid_intelligent_scorer import score_essay_hybrid
    WRITING_AVAILABLE = True
    logger.info("✅ Writing Scorer loaded")
except ImportError as e:
    logger.error(f"❌ Writing Scorer load failed: {e}")
    WRITING_AVAILABLE = False
    score_essay_hybrid = None

# SPEAKING
try:
    # Giả sử file speaking_engine.py nằm cùng thư mục
    from speaking_engine import speaking_engine
    SPEAKING_AVAILABLE = True
    logger.info("✅ Speaking Engine loaded")
except ImportError as e:
    logger.error(f"❌ Speaking Engine load failed: {e}")
    SPEAKING_AVAILABLE = False
    speaking_engine = None

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = os.path.join(os.getcwd(), 'temp_audio')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# --- 3. UTILS ---

def score_to_cefr(score_10: float) -> Tuple[str, str]:
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

# Validation Guards (Writing)
def check_is_english(text: str) -> Tuple[bool, str]:
    if len(text) < 20: return True, ""
    try:
        lang = detect(text)
        return (True, "") if lang == 'en' else (False, f"Detected language: {lang}")
    except:
        return False, "Language detection failed"

def detect_gibberish(text: str) -> Tuple[bool, str]:
    if not text or len(text.strip()) < 10: return True, "Text too short"
    words = text.lower().split()
    common = {'the','be','to','of','and','a','in','that','have','i'}
    if len(words) > 5 and not any(w in common for w in words):
        return True, "No common English words found"
    return False, ""

def validate_writing_input(text: str) -> Tuple[bool, str]:
    is_gib, reason = detect_gibberish(text)
    if is_gib: return False, f"Gibberish detected: {reason}"
    
    is_eng, reason = check_is_english(text)
    if not is_eng: return False, reason
    
    return True, ""

# Audio Utils (Speaking)
def check_ffmpeg_available() -> bool:
    """Check if ffmpeg is available in the system"""
    try:
        result = subprocess.run(
            ['ffmpeg', '-version'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=5
        )
        return result.returncode == 0
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False

def convert_webm_to_wav(input_path: str, output_path: str) -> bool:
    """Convert audio to WAV 16kHz Mono using ffmpeg"""
    # Check if ffmpeg is available
    if not check_ffmpeg_available():
        logger.error("FFmpeg is not installed or not in PATH. Please install ffmpeg first.")
        return False
    
    try:
        # Use more robust ffmpeg options to handle Opus/WebM files
        # -err_detect ignore_err: Ignore minor errors like Opus packet header warnings
        # -f webm: Explicitly specify input format
        # -c:a pcm_s16le: Explicitly specify output audio codec
        cmd = [
            'ffmpeg', '-y',
            '-loglevel', 'error',  # Only show errors, suppress warnings
            '-err_detect', 'ignore_err',  # Ignore minor parsing errors
            '-f', 'webm',  # Explicitly specify input format
            '-i', input_path,
            '-ac', '1',  # Mono
            '-ar', '16000',  # 16kHz sample rate
            '-c:a', 'pcm_s16le',  # PCM 16-bit little-endian
            output_path
        ]
        
        # Run ffmpeg and suppress stderr to hide Opus warnings
        # Opus packet header warnings are non-fatal and can be safely ignored
        with open(os.devnull, 'w') as devnull:
            result = subprocess.run(
                cmd, 
                check=True, 
                timeout=30,
                stdout=subprocess.PIPE,
                stderr=devnull,  # Completely suppress stderr to hide Opus warnings
            )
        
        # Check if output file was created successfully
        if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
            return True
        else:
            logger.error(f"FFmpeg conversion failed: output file not created or empty")
            return False
            
    except subprocess.CalledProcessError as e:
        # Check if file was created despite the error (Opus warnings are non-fatal)
        if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
            # File was created successfully, Opus warnings can be ignored
            return True
        # If file wasn't created, log the error
        logger.error(f"FFmpeg conversion failed with exit code {e.returncode}")
        return False
    except Exception as e:
        logger.error(f"FFmpeg Error: {e}")
        return False

def cleanup_files(*paths):
    for p in paths:
        try:
            if os.path.exists(p): os.remove(p)
        except: pass

# --- 4. ENDPOINTS ---

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'modules': {
            'writing': WRITING_AVAILABLE,
            'speaking': SPEAKING_AVAILABLE
        }
    })

# --- WRITING ---
@app.route('/score', methods=['POST'])
def score_writing():
    if not WRITING_AVAILABLE:
        return jsonify({'error': 'Writing module not loaded'}), 503
        
    try:
        # Try to get JSON data, force=True allows parsing even without correct Content-Type
        data = request.get_json(force=True, silent=True)
        if data is None:
            # If JSON parsing failed, try to get from form data
            data = {
                'text': request.form.get('text', ''),
                'prompt': request.form.get('prompt', ''),
                'level': request.form.get('level', 'B2'),
                'task_type': request.form.get('task_type', 'essay')
            }
        
        text = data.get('text', '').strip()
        prompt = data.get('prompt', '').strip()
        level = data.get('level', 'B2')
        task_type = data.get('task_type', 'essay')

        # Guardrails
        is_valid, err = validate_writing_input(text)
        if not is_valid:
            return jsonify({
                'score_10': 0,
                'overall_score': 0,
                'cefr_level': 'N/A',
                'feedback': [f"⚠️ {err}"],
                'status': 'REJECTED'
            })

        # Scoring
        result = score_essay_hybrid(text, prompt, level, task_type)
        
        if 'error' in result:
            return jsonify(result), 500
            
        # Formatting
        final_score = result.get('overall_score', 0)
        cefr, desc = score_to_cefr(final_score)
        result.update({
            'cefr_level': cefr,
            'cefr_description': desc,
            'band': get_band_description(final_score)
        })
        
        return jsonify(result)

    except Exception as e:
        logger.error(f"Writing Error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

# --- SPEAKING ---
@app.route('/score-speech', methods=['POST'])
def score_speech():
    if not SPEAKING_AVAILABLE:
        return jsonify({'error': 'Speaking module not loaded'}), 503

    webm_path = None
    wav_path = None

    try:
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file'}), 400
            
        file = request.files['audio']
        prompt = request.form.get('prompt', '')
        mode = request.form.get('mode', 'roleplay')
        
        # Save temp file
        filename = str(uuid.uuid4())
        webm_path = os.path.join(UPLOAD_FOLDER, f"{filename}.webm")
        wav_path = os.path.join(UPLOAD_FOLDER, f"{filename}.wav")
        
        file.save(webm_path)
        
        # Convert
        if not convert_webm_to_wav(webm_path, wav_path):
            cleanup_files(webm_path)
            return jsonify({'error': 'Audio conversion failed'}), 500
            
        # Score
        result = speaking_engine.score_submission(wav_path, prompt)
        
        # Adjust score by mode
        content_score = result.get('content_accuracy', 0)
        pronun_score = result.get('pronunciation_score', 0)
        
        if mode == 'shadowing':
            # Shadowing: Focus on Pronunciation (60%)
            final = content_score * 0.4 + pronun_score * 0.6
        elif mode == 'dubbing':
            # Dubbing: Balanced (50/50)
            final = content_score * 0.5 + pronun_score * 0.5
        else:
            # Roleplay: Content Focus (60%)
            final = content_score * 0.6 + pronun_score * 0.4
            
        # Normalize 0-10
        score_10 = round(min(10, final / 10), 1)
        cefr, desc = score_to_cefr(score_10)
        
        # Extract values from result for easy access
        transcription = result.get('transcription', '')
        content_accuracy = result.get('content_accuracy', 0)
        pronunciation_score = result.get('pronunciation_score', 0)
        
        response = {
            'score_10': score_10,
            'overall_score': score_10,
            'cefr_level': cefr,
            'transcription': transcription,  # Add transcription at top level
            'content_accuracy': content_accuracy,  # Add content_accuracy at top level
            'pronunciation_score': pronunciation_score,  # Add pronunciation_score at top level
            'details': result,
            'mode': mode
        }
        
        cleanup_files(webm_path, wav_path)
        return jsonify(response)

    except Exception as e:
        cleanup_files(webm_path, wav_path) if webm_path else None
        logger.error(f"Speaking Error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Check for required system dependencies
    if not check_ffmpeg_available():
        logger.warning("FFmpeg is not available. Audio conversion features will not work.")
        logger.warning("   Please install ffmpeg:")
        logger.warning("   - Windows: Download from https://ffmpeg.org/download.html or use: choco install ffmpeg")
        logger.warning("   - Linux: sudo apt-get install ffmpeg")
        logger.warning("   - Mac: brew install ffmpeg")
    else:
        logger.info("FFmpeg is available")
    
    port = int(os.environ.get('PORT', 8080))
    logger.info(f"🚀 AI Scorer running on port {port}")
    app.run(host='0.0.0.0', port=port)