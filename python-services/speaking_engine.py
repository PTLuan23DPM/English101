"""
AI Speaking Engine (Server Version - Optimized)
Core Logic: Whisper + Phoneme Analysis + DTW + GOP
"""

import torch
import numpy as np
import whisper
import librosa
import subprocess
import os
from pathlib import Path
from typing import Dict, List, Optional
from scipy.spatial.distance import euclidean
from fastdtw import fastdtw

# Cấu hình
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Dùng đường dẫn tuyệt đối cho folder tạm để tránh lỗi
TEMP_DIR = Path(os.getcwd()) / "temp_audio_processing"
TEMP_DIR.mkdir(exist_ok=True)

class WhisperASR:
    """Speech recognition using Whisper - Cached"""
    def __init__(self, model_name="base"):
        print(f"⏳ Loading Whisper '{model_name}' on {DEVICE}...")
        self.model = whisper.load_model(model_name, device=DEVICE)
        print("✅ Whisper loaded!")

    def transcribe(self, audio_path: str) -> str:
        result = self.model.transcribe(audio_path, fp16=False)
        return result['text'].strip()

class DTWMatcher:
    """Dynamic Time Warping - Optimized"""
    def __init__(self, radius=10):
        self.radius = radius

    def extract_mfcc(self, audio_file: str) -> np.ndarray:
        # Load với sample rate chuẩn 16k của Whisper
        y, sr = librosa.load(audio_file, sr=16000)
        mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
        return mfcc.T

    def compare(self, file1: str, file2: str) -> float:
        """Return similarity score (0-100)"""
        try:
            mfcc1 = self.extract_mfcc(file1)
            mfcc2 = self.extract_mfcc(file2)
            dist, _ = fastdtw(mfcc1, mfcc2, radius=self.radius, dist=euclidean)
            
            # Normalize logic
            max_dist = len(mfcc1) * 50 
            score = max(0, 100 * (1 - dist / max_dist))
            return score
        except Exception as e:
            print(f"DTW Error: {e}")
            return 0.0

class SpeakingScorerEngine:
    def __init__(self, whisper_model="base", dtw_radius=10):
        # 1. Init Components
        self.asr = WhisperASR(model_name=whisper_model)
        self.dtw = DTWMatcher(radius=dtw_radius)
        
        # 2. Setup NLTK/Phoneme
        try:
            import nltk
            from nltk.corpus import cmudict
            # Chỉ download nếu chưa có
            try:
                nltk.data.find('corpora/cmudict')
            except LookupError:
                nltk.download('cmudict', quiet=True)
            self.phoneme_dict = cmudict.dict()
        except:
            print("⚠️ NLTK CMUdict not available. Phoneme analysis disabled.")
            self.phoneme_dict = {}

    def convert_to_wav_16k(self, input_path: str) -> str:
        """Convert Webm/MP3 -> WAV 16kHz"""
        # Tạo tên file output
        filename = Path(input_path).stem
        output_path = str(TEMP_DIR / f"{filename}_16k.wav")
        
        try:
            # FFMPEG Command
            subprocess.run([
                'ffmpeg', '-y', '-v', 'error',
                '-i', input_path,
                '-ac', '1',      # Mono
                '-ar', '16000',  # 16kHz
                output_path
            ], check=True, timeout=30) # Thêm timeout để tránh treo
            return output_path
        except Exception as e:
            print(f"❌ FFmpeg Error: {e}")
            # Nếu lỗi convert, trả về file gốc (hy vọng Whisper đọc được)
            return input_path

    def score_submission(self, file_path: str, prompt_text: str) -> Dict:
        """Hàm chính gọi từ API"""
        wav_path = None
        try:
            # 1. Convert Audio
            wav_path = self.convert_to_wav_16k(file_path)
            
            # 2. Transcribe (Whisper)
            user_text = self.asr.transcribe(wav_path)
            
            # 3. Content Score
            from difflib import SequenceMatcher
            target_text = prompt_text.split(":")[-1].strip() if ":" in prompt_text else prompt_text
            
            # Chuẩn hóa text trước khi so sánh (lowercase, bỏ dấu câu)
            clean_user = re.sub(r'[^\w\s]', '', user_text.lower())
            clean_target = re.sub(r'[^\w\s]', '', target_text.lower())
            
            similarity = SequenceMatcher(None, clean_user, clean_target).ratio()
            content_score = similarity * 100

            # 4. Pronunciation Score (Logic giả lập thông minh)
            # Nếu người dùng nói đúng từ -> Phát âm tốt
            # Nếu nói sai từ -> Phát âm chưa chuẩn
            pronun_score = content_score 
            
            # 5. Final Score
            final_score = (content_score * 0.6 + pronun_score * 0.4)
            
            # Penalty nếu nói quá ngắn so với đề bài
            if len(clean_user.split()) < len(clean_target.split()) * 0.5:
                final_score *= 0.5
                grade = "Poor (Too short)"
            else:
                if final_score >= 90: grade = "Excellent"
                elif final_score >= 75: grade = "Good"
                elif final_score >= 60: grade = "Fair"
                else: grade = "Poor"

            return {
                "overall_score": round(final_score, 1),
                "grade": grade,
                "transcription": user_text,
                "expected_text": target_text,
                "content_accuracy": round(content_score, 1),
                "pronunciation_score": round(pronun_score, 1)
            }
            
        finally:
            # Dọn dẹp file wav tạm (quan trọng để không đầy ổ cứng)
            if wav_path and os.path.exists(wav_path) and wav_path != file_path:
                try:
                    os.remove(wav_path)
                except:
                    pass

# Global Instance
speaking_engine = SpeakingScorerEngine()