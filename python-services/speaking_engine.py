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
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from scipy.spatial.distance import euclidean
from fastdtw import fastdtw
from difflib import SequenceMatcher

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

class GOPCalculator:
    """Goodness of Pronunciation Calculator using Phoneme Comparison"""
    def __init__(self, phoneme_dict: dict):
        self.phoneme_dict = phoneme_dict

    def text_to_phonemes(self, text: str) -> List[Tuple[str, List[str]]]:
        """Convert text to phoneme sequences per word
        
        Returns:
            List of tuples: (word, phoneme_list)
        """
        words = re.findall(r'\b\w+\b', text.lower())
        phoneme_sequences = []
        
        for word in words:
            if word in self.phoneme_dict:
                # CMUdict returns list of pronunciations, take the first one
                phonemes = self.phoneme_dict[word][0]
                # Keep original phonemes with stress markers
                phoneme_sequences.append((word, phonemes))
            else:
                # Word not found in dictionary
                phoneme_sequences.append((word, []))
        
        return phoneme_sequences

    def normalize_phoneme(self, phoneme: str) -> str:
        """Remove stress markers from phoneme (IH1 -> IH)"""
        return re.sub(r'\d+', '', phoneme)
    
    def align_phonemes(self, seq1: List[str], seq2: List[str]) -> float:
        """Align and compare two phoneme sequences using dynamic programming
        
        Compares phonemes without stress markers for better matching.
        """
        if not seq1 and not seq2:
            return 1.0
        if not seq1 or not seq2:
            return 0.0
        
        # Normalize phonemes (remove stress markers) for comparison
        norm_seq1 = [self.normalize_phoneme(p) for p in seq1]
        norm_seq2 = [self.normalize_phoneme(p) for p in seq2]
        
        # Simple sequence alignment using Levenshtein-style comparison
        len1, len2 = len(norm_seq1), len(norm_seq2)
        dp = [[0] * (len2 + 1) for _ in range(len1 + 1)]
        
        # Initialize
        for i in range(len1 + 1):
            dp[i][0] = i
        for j in range(len2 + 1):
            dp[0][j] = j
        
        # Fill DP table
        for i in range(1, len1 + 1):
            for j in range(1, len2 + 1):
                if norm_seq1[i-1] == norm_seq2[j-1]:
                    cost = 0
                else:
                    cost = 1
                dp[i][j] = min(
                    dp[i-1][j] + 1,      # deletion
                    dp[i][j-1] + 1,      # insertion
                    dp[i-1][j-1] + cost  # substitution
                )
        
        # Calculate similarity ratio
        max_len = max(len1, len2)
        if max_len == 0:
            return 1.0
        similarity = 1.0 - (dp[len1][len2] / max_len)
        return max(0.0, similarity)

    def calculate_gop(self, reference_text: str, actual_text: str) -> Dict:
        """Calculate GOP scores based on phoneme comparison"""
        # Get phoneme sequences for both texts
        ref_phonemes = self.text_to_phonemes(reference_text)
        actual_phonemes = self.text_to_phonemes(actual_text)
        
        if not ref_phonemes:
            return {
                'gop_score': 50.0,
                'phoneme_accuracy': 0.5,
                'word_scores': []
            }
        
        word_scores = []
        total_phoneme_match = 0.0
        total_phonemes = 0
        gop_scores = []
        
        # Track which actual words have been matched to avoid duplicates
        matched_actual_indices = set()
        
        # Compare word by word with alignment tolerance
        # Match each reference word to the best available actual word
        for ref_word, ref_ph in ref_phonemes:
            if not ref_ph:
                continue
            
            total_phonemes += len(ref_ph)
            best_match_score = 0.0
            best_match_word = None
            best_match_ph = []
            best_match_idx = -1
            
            # Find best matching word in actual text (not yet matched)
            for idx, (act_word, act_ph) in enumerate(actual_phonemes):
                if not act_ph or idx in matched_actual_indices:
                    continue
                
                # Calculate phoneme alignment score
                match_score = self.align_phonemes(ref_ph, act_ph)
                
                # Also consider word similarity
                word_sim = SequenceMatcher(None, ref_word.lower(), act_word.lower()).ratio()
                combined_score = match_score * 0.7 + word_sim * 0.3
                
                if combined_score > best_match_score:
                    best_match_score = combined_score
                    best_match_word = act_word
                    best_match_ph = act_ph
                    best_match_idx = idx
            
            # Mark as matched if we found a reasonable match (score > 0.3)
            if best_match_score > 0.3 and best_match_idx >= 0:
                matched_actual_indices.add(best_match_idx)
            
            # Calculate phoneme-level match
            if best_match_ph:
                phoneme_match = self.align_phonemes(ref_ph, best_match_ph)
            else:
                phoneme_match = 0.0
            
            # Calculate GOP score for this word (negative indicates poor pronunciation)
            # GOP typically ranges from -10 (worst) to 0 (best)
            gop_word = (phoneme_match - 1.0) * 10  # Scale to -10 to 0 range
            gop_scores.append(gop_word)
            
            # Count matching phonemes (for accuracy calculation)
            # Align sequences and count matches
            if best_match_ph:
                matching_count = 0
                min_len = min(len(ref_ph), len(best_match_ph))
                for i in range(min_len):
                    if self.normalize_phoneme(ref_ph[i]) == self.normalize_phoneme(best_match_ph[i]):
                        matching_count += 1
                total_phoneme_match += matching_count
            
            # Determine quality
            if phoneme_match >= 0.9:
                quality = "Excellent"
            elif phoneme_match >= 0.7:
                quality = "Good"
            elif phoneme_match >= 0.5:
                quality = "Fair"
            else:
                quality = "Poor"
            
            word_scores.append({
                'word': best_match_word or '?',
                'expected_word': ref_word,
                'phonemes': best_match_ph,
                'expected_phonemes': ref_ph,
                'phoneme_match': round(phoneme_match, 3),
                'gop': round(gop_word, 2),
                'quality': quality
            })
        
        # Calculate overall metrics
        phoneme_accuracy = total_phoneme_match / total_phonemes if total_phonemes > 0 else 0.0
        overall_gop = np.mean(gop_scores) if gop_scores else -5.0
        
        # Convert GOP to pronunciation score (0-100 scale)
        # GOP ranges from -10 (worst) to 0 (best)
        # Map to 0-100: -10 -> 0, 0 -> 100
        pronun_score = max(0, min(100, 100 + (overall_gop * 10)))
        
        return {
            'gop_score': round(pronun_score, 1),
            'overall_gop': round(overall_gop, 2),
            'phoneme_accuracy': round(phoneme_accuracy, 3),
            'word_scores': word_scores,
            'total_phonemes': total_phonemes,
            'matching_phonemes': int(total_phoneme_match)
        }

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
            print("CMUdict loaded for GOP calculation")
        except:
            print("NLTK CMUdict not available. Phoneme analysis disabled.")
            self.phoneme_dict = {}
        
        # 3. Initialize GOP Calculator
        self.gop_calculator = GOPCalculator(self.phoneme_dict)

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
            target_text = prompt_text.split(":")[-1].strip() if ":" in prompt_text else prompt_text
            
            # Chuẩn hóa text trước khi so sánh (lowercase, bỏ dấu câu)
            clean_user = re.sub(r'[^\w\s]', '', user_text.lower())
            clean_target = re.sub(r'[^\w\s]', '', target_text.lower())
            
            similarity = SequenceMatcher(None, clean_user, clean_target).ratio()
            content_score = similarity * 100

            # 4. Pronunciation Score using GOP (Goodness of Pronunciation)
            if self.phoneme_dict:
                try:
                    gop_results = self.gop_calculator.calculate_gop(target_text, user_text)
                    pronun_score = gop_results['gop_score']
                    
                    # Store detailed GOP results for debugging/feedback
                    gop_details = {
                        'phoneme_accuracy': gop_results.get('phoneme_accuracy', 0),
                        'overall_gop': gop_results.get('overall_gop', 0),
                        'word_scores': gop_results.get('word_scores', [])
                    }
                except Exception as e:
                    print(f"GOP calculation error: {e}")
                    # Fallback to content-based score
                    pronun_score = content_score * 0.9  # Slightly penalize if GOP fails
                    gop_details = None
            else:
                # Fallback if CMUdict not available
                pronun_score = content_score * 0.9
                gop_details = None 
            
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

            result = {
                "overall_score": round(final_score, 1),
                "grade": grade,
                "transcription": user_text,
                "expected_text": target_text,
                "content_accuracy": round(content_score, 1),
                "pronunciation_score": round(pronun_score, 1)
            }
            
            # Add GOP details if available
            if gop_details:
                result["gop_details"] = gop_details
            
            return result
            
        finally:
            # Dọn dẹp file wav tạm (quan trọng để không đầy ổ cứng)
            if wav_path and os.path.exists(wav_path) and wav_path != file_path:
                try:
                    os.remove(wav_path)
                except:
                    pass

# Global Instance
speaking_engine = SpeakingScorerEngine()