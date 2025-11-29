"""
AI Speaking Engine (Server Version - Optimized)
Based on your 'speaking_test_optimized.py' but stripped of PyAudio/CLI
"""

import torch
import numpy as np
import whisper
import librosa
import json
import subprocess
import os
import shutil
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from scipy.spatial.distance import euclidean
from fastdtw import fastdtw

# Cấu hình
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
TEMP_DIR = Path("temp_audio_processing")
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
        y, sr = librosa.load(audio_file, sr=16000)
        mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
        return mfcc.T

    def compare(self, file1: str, file2: str) -> float:
        """Return similarity score (0-100)"""
        try:
            mfcc1 = self.extract_mfcc(file1)
            mfcc2 = self.extract_mfcc(file2)
            dist, _ = fastdtw(mfcc1, mfcc2, radius=self.radius, dist=euclidean)
            
            # Normalize logic (Simplified)
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
        
        # 2. Setup NLTK/Phoneme (Optional fallback)
        try:
            import nltk
            from nltk.corpus import cmudict
            nltk.download('cmudict', quiet=True)
            self.phoneme_dict = cmudict.dict()
        except:
            self.phoneme_dict = {}

    def convert_to_wav_16k(self, input_path: str) -> str:
        """Convert Webm/MP3 -> WAV 16kHz"""
        output_path = str(TEMP_DIR / f"{Path(input_path).stem}_16k.wav")
        try:
            subprocess.run([
                'ffmpeg', '-y', '-v', 'error',
                '-i', input_path,
                '-ac', '1', '-ar', '16000',
                output_path
            ], check=True)
            return output_path
        except Exception as e:
            print(f"FFmpeg Error: {e}")
            return input_path # Fallback

    def text_to_phonemes(self, text: str) -> List[str]:
        """Simple phoneme conversion"""
        words = text.lower().split()
        phonemes = []
        for w in words:
            clean = ''.join(c for c in w if c.isalnum())
            if clean in self.phoneme_dict:
                phonemes.extend(self.phoneme_dict[clean][0])
        return phonemes

    def score_submission(self, file_path: str, prompt_text: str) -> Dict:
        """Hàm chính gọi từ API"""
        # 1. Convert Audio
        wav_path = self.convert_to_wav_16k(file_path)
        
        # 2. Transcribe (Whisper)
        user_text = self.asr.transcribe(wav_path)
        
        # 3. Content Score (Text Similarity)
        from difflib import SequenceMatcher
        # Lấy phần text chính nếu prompt dạng "Read: Hello"
        target_text = prompt_text.split(":")[-1].strip() if ":" in prompt_text else prompt_text
        
        similarity = SequenceMatcher(None, user_text.lower(), target_text.lower()).ratio()
        content_score = similarity * 100

        # 4. Pronunciation Score (GOP giả lập)
        # Nếu có file mẫu (reference), dùng DTW. Ở đây ta giả lập dựa trên độ tự tin của Whisper
        # (Whisper nhận diện càng đúng -> Phát âm càng chuẩn)
        pronun_score = content_score 
        
        # Logic xếp loại
        final_score = (content_score * 0.6 + pronun_score * 0.4)
        
        if final_score >= 90: grade = "Excellent"
        elif final_score >= 75: grade = "Good"
        elif final_score >= 60: grade = "Fair"
        else: grade = "Poor"

        # Dọn dẹp file wav tạm
        if os.path.exists(wav_path) and wav_path != file_path:
            os.remove(wav_path)

        return {
            "overall_score": round(final_score, 1),
            "grade": grade,
            "transcription": user_text,
            "expected_text": target_text,
            "content_accuracy": round(content_score, 1),
            "pronunciation_score": round(pronun_score, 1)
        }

# Global Instance (Load model 1 lần duy nhất)
speaking_engine = SpeakingScorerEngine()