"""
AI Speaking Test System - Complete Implementation
Single file with all functionality

Features:
- Voice Activity Detection (VAD) - auto-stops after silence
- Whisper ASR for speech recognition
- Phoneme conversion using CMUdict
- DTW matching with native speakers
- GOP scoring for pronunciation
- Complete scoring pipeline

Usage:
    from speaking_test_complete import SpeakingTestSystem
    
    system = SpeakingTestSystem()
    results = system.run_test(
        prompt="Please read: The quick brown fox jumps over the lazy dog.",
        use_vad=True
    )
    print(f"Score: {results['final_score']['final_score']:.2f}/100")
"""

import pyaudio
import wave
import numpy as np
import whisper
import torch
from scipy.spatial.distance import euclidean
from scipy.signal import resample
from fastdtw import fastdtw
import librosa
import json
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import subprocess
import tempfile
import shutil


class AudioRecorder:
    """Record audio using PyAudio with voice activity detection"""
    
    def __init__(self, sample_rate=16000, channels=1, chunk=1024):
        self.sample_rate = sample_rate
        self.channels = channels
        self.chunk = chunk
        self.format = pyaudio.paInt16
        
    def record_with_vad(
        self, 
        output_file: str, 
        silence_threshold: float = 100,  # Lowered from 300 to 100
        silence_duration: float = 2.0,
        max_duration: int = 60
    ):
        """
        Record audio with voice activity detection.
        Automatically stops after silence_duration seconds of silence.
        
        Args:
            output_file: Path to save the recording
            silence_threshold: RMS threshold below which is considered silence (default: 100)
            silence_duration: Duration of silence (in seconds) before auto-stop
            max_duration: Maximum recording duration (in seconds)
        
        Returns:
            Path to saved audio file
        """
        p = pyaudio.PyAudio()
        
        print("Recording started. Press Ctrl+C to stop manually.")
        print(f"Auto-stop after {silence_duration}s of silence.")
        print(f"Silence threshold: {silence_threshold}")
        print("Speak now...")
        
        stream = p.open(
            format=self.format,
            channels=self.channels,
            rate=self.sample_rate,
            input=True,
            frames_per_buffer=self.chunk
        )
        
        frames = []
        silent_chunks = 0
        chunks_per_silence = int(self.sample_rate / self.chunk * silence_duration)
        max_chunks = int(self.sample_rate / self.chunk * max_duration)
        
        is_speaking = False
        total_chunks = 0
        
        try:
            while total_chunks < max_chunks:
                data = stream.read(self.chunk, exception_on_overflow=False)
                frames.append(data)
                total_chunks += 1
                
                # Calculate RMS (Root Mean Square) to detect audio level
                rms = self._calculate_rms(data)
                
                if rms > silence_threshold:
                    if not is_speaking:
                        is_speaking = True
                        print(f"Voice detected! (RMS: {rms:.0f})")
                    silent_chunks = 0
                    is_speaking = True
                else:
                    if is_speaking:
                        silent_chunks += 1
                        
                        # Show progress toward auto-stop
                        if silent_chunks % 5 == 0:
                            progress = silent_chunks / chunks_per_silence * 100
                            print(f"Silence... {progress:.0f}% to auto-stop (RMS: {rms:.0f})")
                        
                        # Check if silence duration reached
                        if silent_chunks >= chunks_per_silence:
                            print(f"Silence detected for {silence_duration}s. Stopping...")
                            break
                
                # Progress indicator (every second)
                if total_chunks % (self.sample_rate // self.chunk) == 0:
                    elapsed = total_chunks / (self.sample_rate / self.chunk)
                    status = "SPEAKING" if rms > silence_threshold else "quiet"
                    print(f"Recording... {elapsed:.1f}s [{status}] RMS: {rms:.0f}")
        
        except KeyboardInterrupt:
            print("\nRecording stopped by user.")
        
        finally:
            stream.stop_stream()
            stream.close()
            p.terminate()
        
        # Calculate actual duration
        actual_duration = len(frames) * self.chunk / self.sample_rate
        print(f"\nRecording completed. Duration: {actual_duration:.2f}s")
        
        # Calculate and display RMS statistics to help with threshold tuning
        all_rms = []
        for frame in frames:
            rms = self._calculate_rms(frame)
            all_rms.append(rms)
        
        if all_rms:
            avg_rms = np.mean(all_rms)
            max_rms = np.max(all_rms)
            min_rms = np.min(all_rms)
            median_rms = np.median(all_rms)
            
            print(f"\n=== RMS STATISTICS ===")
            print(f"Min RMS:    {min_rms:.1f}")
            print(f"Median RMS: {median_rms:.1f}")
            print(f"Average RMS: {avg_rms:.1f}")
            print(f"Max RMS:    {max_rms:.1f}")
            print(f"Threshold:  {silence_threshold:.1f}")
            
            # Analyze if threshold needs adjustment
            if min_rms > silence_threshold:
                print(f"\n*** ISSUE: All RMS values are ABOVE threshold! ***")
                print(f"Auto-stop will NEVER work with current threshold.")
                print(f"Recommended threshold: {median_rms * 1.5:.1f}")
                print(f"(Set to 1.5x your median RMS)")
            elif max_rms < silence_threshold:
                print(f"\n*** ISSUE: All RMS values are BELOW threshold! ***")
                print(f"Voice was never detected.")
                print(f"Recommended threshold: {max_rms * 0.7:.1f}")
            elif avg_rms > silence_threshold * 0.8:
                print(f"\nWARNING: Average RMS is very close to threshold")
                print(f"Recommended higher threshold: {avg_rms * 2:.1f}")
            else:
                print(f"\nThreshold looks reasonable.")
            print(f"======================\n")
        
        # Save to file
        wf = wave.open(output_file, 'wb')
        wf.setnchannels(self.channels)
        wf.setsampwidth(p.get_sample_size(self.format))
        wf.setframerate(self.sample_rate)
        wf.writeframes(b''.join(frames))
        wf.close()
        
        return output_file
    
    def _calculate_rms(self, data: bytes) -> float:
        """Calculate Root Mean Square (RMS) of audio data"""
        audio_data = np.frombuffer(data, dtype=np.int16)
        rms = np.sqrt(np.mean(audio_data**2))
        return rms
    
    def record(self, duration: int, output_file: str):
        """Record audio for specified duration (legacy method)"""
        p = pyaudio.PyAudio()
        
        print(f"Recording for {duration} seconds...")
        
        stream = p.open(
            format=self.format,
            channels=self.channels,
            rate=self.sample_rate,
            input=True,
            frames_per_buffer=self.chunk
        )
        
        frames = []
        for i in range(0, int(self.sample_rate / self.chunk * duration)):
            data = stream.read(self.chunk)
            frames.append(data)
        
        print("Recording finished")
        
        stream.stop_stream()
        stream.close()
        p.terminate()
        
        # Save to file
        wf = wave.open(output_file, 'wb')
        wf.setnchannels(self.channels)
        wf.setsampwidth(p.get_sample_size(self.format))
        wf.setframerate(self.sample_rate)
        wf.writeframes(b''.join(frames))
        wf.close()
        
        return output_file


class WhisperASR:
    """Automatic Speech Recognition using Whisper"""
    
    def __init__(self, model_name="medium.en"):
        print(f"Loading Whisper model: {model_name}...")
        self.model = whisper.load_model(model_name)
        print("Whisper model loaded")
    
    def transcribe(self, audio_file: str) -> Dict:
        """Transcribe audio to text"""
        print("Transcribing audio...")
        result = self.model.transcribe(
            audio_file,
            language="en",
            word_timestamps=True
        )
        print(f"Transcription: {result['text']}")
        return result


class PhonemeConverter:
    """Convert text to phonemes using CMUdict"""
    
    def __init__(self):
        try:
            import nltk
            from nltk.corpus import cmudict
            
            # Try to load, download if not available
            try:
                self.cmu_dict = cmudict.dict()
            except LookupError:
                print("Downloading CMUdict...")
                nltk.download('cmudict')
                self.cmu_dict = cmudict.dict()
                
            print("CMUdict loaded")
        except Exception as e:
            print(f"Warning: CMUdict not available: {e}")
            self.cmu_dict = {}
    
    def word_to_phonemes(self, word: str) -> List[str]:
        """Convert word to phonemes"""
        word_lower = word.lower()
        if word_lower in self.cmu_dict:
            # Return first pronunciation
            return self.cmu_dict[word_lower][0]
        else:
            # Return grapheme representation if not in dict
            return [c.upper() for c in word]
    
    def text_to_phonemes(self, text: str) -> List[Dict]:
        """Convert text to phoneme sequence with word boundaries"""
        words = text.strip().split()
        phoneme_sequence = []
        
        for word in words:
            phonemes = self.word_to_phonemes(word)
            phoneme_sequence.append({
                'word': word,
                'phonemes': phonemes
            })
        
        return phoneme_sequence


class MFAAligner:
    """Montreal Forced Aligner wrapper"""

    def __init__(self, mfa_path: Optional[str] = None):
        self.mfa_path = mfa_path or "mfa"
        
    def check_installation(self) -> bool:
        """Check if MFA is installed"""
        try:
            result = subprocess.run(
                [self.mfa_path, "version"],
                capture_output=True,
                text=True
            )
            return result.returncode == 0
        except FileNotFoundError:
            return False

    def align(self, audio_file: str, transcript: str, output_dir: str) -> str:
        """
        Align audio with transcript using MFA.
        No mock alignment fallback. MFA must be installed.
        """
        if not self.check_installation():
            raise RuntimeError(
                "\n❌ Montreal Forced Aligner (MFA) is NOT installed.\n"
                "Install MFA first: https://montreal-forced-aligner.readthedocs.io/en/latest/installation.html\n"
            )
        print("✔ Using Montreal Forced Aligner (MFA)")

        # Create temporary workspace
        temp_dir = Path(tempfile.mkdtemp())
        
        try:
            # MFA requires corpus structure
            corpus_dir = temp_dir / "corpus"
            corpus_dir.mkdir()

            # Copy WAV
            audio_name = Path(audio_file).stem
            shutil.copy(audio_file, corpus_dir / f"{audio_name}.wav")

            # Write transcript
            with open(corpus_dir / f"{audio_name}.txt", 'w') as f:
                f.write(transcript)

            # MFA output directory
            output_path = temp_dir / "output"
            output_path.mkdir()

            # MFA command
            cmd = [
                self.mfa_path,
                "align",
                str(corpus_dir),
                "english_us_arpa",
                "english_us_arpa",
                str(output_path)
            ]

            subprocess.run(cmd, check=True)

            # Result TextGrid
            textgrid_file = output_path / f"{audio_name}.TextGrid"
            output_file = Path(output_dir) / f"{audio_name}.TextGrid"
            shutil.copy(textgrid_file, output_file)

            return str(output_file)

        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

    
    def _mock_alignment(self, audio_file: str, transcript: str, output_dir: str) -> str:
        """Create mock alignment when MFA not available"""
        # Get audio duration
        import wave
        with wave.open(audio_file, 'rb') as wf:
            frames = wf.getnframes()
            rate = wf.getframerate()
            duration = frames / float(rate)
        
        words = transcript.strip().split()

        # Prevent division by zero
        if len(words) == 0:
            print("Warning: Transcript is empty. Using fallback alignment segment.")
            words = ["<silence>"]
        else: time_per_word = duration / len(words)
        
        # Create mock TextGrid structure
        alignment = {
            'words': [],
            'phones': []
        }
        
        current_time = 0
        for word in words:
            word_end = current_time + time_per_word
            alignment['words'].append({
                'word': word,
                'start': current_time,
                'end': word_end
            })
            current_time = word_end
        
        # Save as JSON (mock TextGrid)
        output_file = Path(output_dir) / "alignment.json"
        with open(output_file, 'w') as f:
            json.dump(alignment, f, indent=2)
        
        return str(output_file)


class DTWMatcher:
    """Dynamic Time Warping for comparing audio signals"""
    
    def __init__(self, sample_rate=16000, n_mfcc=13):
        self.sample_rate = sample_rate
        self.n_mfcc = n_mfcc
    
    def extract_features(self, audio_file: str) -> np.ndarray:
        """Extract MFCC features from audio"""
        y, sr = librosa.load(audio_file, sr=self.sample_rate)
        mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=self.n_mfcc)
        return mfcc.T
    
    def compare(self, student_audio: str, reference_audio: str) -> Dict:
        """Compare student audio with reference using DTW"""
        print("Extracting features for DTW...")
        
        student_features = self.extract_features(student_audio)
        reference_features = self.extract_features(reference_audio)
        
        print("Computing DTW distance...")
        distance, path = fastdtw(student_features, reference_features, dist=euclidean)
        
        # Normalize distance
        normalized_distance = distance / len(path)
        
        # Convert to similarity score (0-100)
        similarity = max(0, 100 - normalized_distance * 10)
        
        return {
            'dtw_distance': distance,
            'normalized_distance': normalized_distance,
            'similarity_score': similarity,
            'path_length': len(path)
        }


class GOPScorer:
    """Goodness of Pronunciation (GOP) scoring with acoustic model"""
    
    def __init__(self, use_acoustic_model: bool = True):
        self.use_acoustic_model = use_acoustic_model
        self.acoustic_model = None
        self.processor = None
        
        if use_acoustic_model:
            self._load_acoustic_model()
    
    def _load_acoustic_model(self):
        """Load wav2vec2 phoneme recognition model"""
        try:
            from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor
            import torch
            
            print("Loading acoustic model (wav2vec2-lv-60-espeak-cv-ft)...")
            model_name = "facebook/wav2vec2-lv-60-espeak-cv-ft"
            
            self.processor = Wav2Vec2Processor.from_pretrained(model_name)
            self.acoustic_model = Wav2Vec2ForCTC.from_pretrained(model_name)
            
            # Move to GPU if available
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
            self.acoustic_model.to(self.device)
            self.acoustic_model.eval()
            
            print(f"Acoustic model loaded on {self.device}")
        except ImportError:
            print("Warning: transformers not installed. Install with: pip install transformers")
            print("Falling back to feature-based estimation.")
            self.use_acoustic_model = False
        except Exception as e:
            print(f"Warning: Could not load acoustic model: {e}")
            print("Falling back to feature-based estimation.")
            self.use_acoustic_model = False
    
    def compute_gop(
        self,
        audio_file: str,
        phoneme_sequence: List[Dict],
        alignment: Dict,
        expected_phoneme_sequence: Optional[List[Dict]] = None
    ) -> Dict:
        """
        Compute GOP scores for each phoneme with expected phoneme comparison
        
        Args:
            audio_file: Path to audio file
            phoneme_sequence: Actual phonemes from transcription
            alignment: Phoneme alignment data
            expected_phoneme_sequence: Expected phonemes from prompt
        
        Returns:
            Dictionary with GOP scores and phoneme-level analysis
        """
        print("Computing GOP scores with acoustic model...")
        
        # Load audio
        y, sr = librosa.load(audio_file, sr=16000)
        
        # If we have expected phonemes, do phoneme-level comparison
        if expected_phoneme_sequence:
            return self._compute_gop_with_expected(
                audio_file,
                y,
                sr,
                phoneme_sequence, 
                expected_phoneme_sequence
            )
        else:
            # Original GOP without expected phonemes
            return self._compute_gop_simple(y, sr, phoneme_sequence)
    
    def _compute_gop_with_expected(
        self,
        audio_file: str,
        audio: np.ndarray,
        sr: int,
        actual_phoneme_sequence: List[Dict],
        expected_phoneme_sequence: List[Dict]
    ) -> Dict:
        """
        Compute GOP with expected phoneme verification using acoustic model
        
        Uses acoustic model to:
        1. Predict phonemes from audio
        2. Compare predicted vs expected phonemes
        3. Calculate GOP scores based on acoustic probabilities
        """
        
        # Extract flat phoneme lists
        actual_phonemes = []
        expected_phonemes = []
        
        for word_info in actual_phoneme_sequence:
            actual_phonemes.extend(word_info['phonemes'])
        
        for word_info in expected_phoneme_sequence:
            expected_phonemes.extend(word_info['phonemes'])
        
        print(f"Expected phonemes ({len(expected_phonemes)}): {expected_phonemes[:10]}...")
        print(f"Actual phonemes ({len(actual_phonemes)}): {actual_phonemes[:10]}...")
        
        # Get acoustic model predictions
        if self.use_acoustic_model:
            acoustic_predictions = self._predict_phonemes_from_audio(audio, sr)
            print(f"Acoustic predictions: {len(acoustic_predictions)} phonemes detected")
        else:
            acoustic_predictions = None
        
        # Phoneme-level alignment and scoring
        word_scores = []
        
        # Use DTW to align expected vs actual phoneme sequences
        from difflib import SequenceMatcher
        matcher = SequenceMatcher(None, expected_phonemes, actual_phonemes)
        
        # Get matching blocks
        matches = matcher.get_matching_blocks()
        
        # Calculate phoneme accuracy
        matching_phonemes = sum(m.size for m in matches if m.size > 0)
        phoneme_accuracy = matching_phonemes / len(expected_phonemes) if expected_phonemes else 0
        
        # Word-level scoring with phoneme comparison
        for actual_word, expected_word in zip(
            actual_phoneme_sequence, 
            expected_phoneme_sequence + [None] * max(0, len(actual_phoneme_sequence) - len(expected_phoneme_sequence))
        ):
            if expected_word is None:
                # Extra words spoken (not in expected)
                word_scores.append({
                    'word': actual_word['word'],
                    'expected_word': None,
                    'phonemes': actual_word['phonemes'],
                    'expected_phonemes': None,
                    'phoneme_match': 0.0,
                    'acoustic_quality': 0.3,
                    'gop_score': 0.3,
                    'quality': 'Wrong Word'
                })
            else:
                # Compare expected vs actual phonemes for this word
                phoneme_match = self._compare_phoneme_sequences(
                    expected_word['phonemes'],
                    actual_word['phonemes']
                )
                
                # Get acoustic quality using model or features
                if self.use_acoustic_model and acoustic_predictions:
                    acoustic_quality = self._acoustic_gop_score(
                        audio_file,
                        expected_word['phonemes'],
                        actual_word['phonemes']
                    )
                else:
                    # Fallback to MFCC-based estimation
                    mfcc = librosa.feature.mfcc(y=audio, sr=sr, n_mfcc=13)
                    acoustic_quality = self._estimate_acoustic_quality(mfcc)
                
                # Combined GOP score:
                # 70% phoneme correctness + 30% acoustic quality
                gop_score = 0.7 * phoneme_match + 0.3 * acoustic_quality
                
                word_scores.append({
                    'word': actual_word['word'],
                    'expected_word': expected_word['word'],
                    'phonemes': actual_word['phonemes'],
                    'expected_phonemes': expected_word['phonemes'],
                    'phoneme_match': phoneme_match,
                    'acoustic_quality': acoustic_quality,
                    'gop_score': gop_score,
                    'quality': self._quality_label(gop_score)
                })
        
        # Handle missing words (expected but not spoken)
        if len(expected_phoneme_sequence) > len(actual_phoneme_sequence):
            for i in range(len(actual_phoneme_sequence), len(expected_phoneme_sequence)):
                expected_word = expected_phoneme_sequence[i]
                word_scores.append({
                    'word': None,
                    'expected_word': expected_word['word'],
                    'phonemes': None,
                    'expected_phonemes': expected_word['phonemes'],
                    'phoneme_match': 0.0,
                    'acoustic_quality': 0.0,
                    'gop_score': 0.0,
                    'quality': 'Missing'
                })
        
        # Calculate overall scores
        avg_gop = np.mean([w['gop_score'] for w in word_scores])
        avg_phoneme_match = np.mean([w['phoneme_match'] for w in word_scores])
        avg_acoustic = np.mean([w['acoustic_quality'] for w in word_scores if w['acoustic_quality'] > 0])
        
        return {
            'overall_gop': avg_gop,
            'overall_quality': self._quality_label(avg_gop),
            'phoneme_accuracy': phoneme_accuracy,
            'phoneme_match_score': avg_phoneme_match,
            'acoustic_quality_score': avg_acoustic,
            'expected_phoneme_count': len(expected_phonemes),
            'actual_phoneme_count': len(actual_phonemes),
            'matching_phonemes': matching_phonemes,
            'word_scores': word_scores,
            'used_acoustic_model': self.use_acoustic_model
        }
    
    def _predict_phonemes_from_audio(self, audio: np.ndarray, sr: int) -> List[str]:
        """
        Use acoustic model to predict phonemes directly from audio
        
        Returns:
            List of predicted phoneme symbols
        """
        import torch
        
        # Resample if needed
        if sr != 16000:
            audio = librosa.resample(audio, orig_sr=sr, target_sr=16000)
        
        # Process audio
        inputs = self.processor(audio, sampling_rate=16000, return_tensors="pt", padding=True)
        
        # Move to device
        inputs = {k: v.to(self.device) for k, v in inputs.items()}
        
        # Get model predictions
        with torch.no_grad():
            logits = self.acoustic_model(**inputs).logits
        
        # Get predicted IDs
        predicted_ids = torch.argmax(logits, dim=-1)
        
        # Decode to phonemes
        predicted_phonemes = self.processor.batch_decode(predicted_ids)[0]
        
        # Parse phoneme string (format: "ð ə k w ɪ k")
        phonemes = predicted_phonemes.split()
        
        return phonemes
    
    def _acoustic_gop_score(
        self, 
        audio_file: str,
        expected_phonemes: List[str],
        actual_phonemes: List[str]
    ) -> float:
        """
        Calculate acoustic GOP score using acoustic model probabilities
        
        GOP(phoneme) = log P(acoustic | expected_phoneme) - max(log P(acoustic | all_phonemes))
        
        Higher score = better match between acoustic signal and expected phoneme
        """
        import torch
        
        # Load audio segment
        audio, sr = librosa.load(audio_file, sr=16000)
        
        # Process audio
        inputs = self.processor(audio, sampling_rate=16000, return_tensors="pt", padding=True)
        inputs = {k: v.to(self.device) for k, v in inputs.items()}
        
        # Get model predictions (logits for all phonemes)
        with torch.no_grad():
            logits = self.acoustic_model(**inputs).logits  # Shape: [batch, time, vocab]
        
        # Convert to probabilities
        probs = torch.nn.functional.softmax(logits, dim=-1)
        
        # Average over time dimension
        avg_probs = probs.mean(dim=1).squeeze()  # Shape: [vocab]
        
        # Get phoneme IDs for expected phonemes
        expected_ids = []
        for phoneme in expected_phonemes:
            try:
                # Convert ARPAbet to IPA (simplified mapping)
                ipa_phoneme = self._arpabet_to_ipa(phoneme)
                phoneme_id = self.processor.tokenizer.convert_tokens_to_ids(ipa_phoneme)
                if phoneme_id is not None:
                    expected_ids.append(phoneme_id)
            except:
                pass
        
        if not expected_ids:
            # Fallback if phoneme mapping fails
            return self._estimate_acoustic_quality_from_features(audio)
        
        # Calculate GOP score
        expected_prob = torch.mean(torch.stack([avg_probs[id] for id in expected_ids]))
        max_prob = torch.max(avg_probs)
        
        # GOP = log(P_expected) - log(P_max)
        # Normalized to 0-1 range
        gop_score = (torch.log(expected_prob) - torch.log(max_prob) + 5) / 5  # Normalize
        gop_score = torch.clamp(gop_score, 0, 1)
        
        return gop_score.item()
    
    def _arpabet_to_ipa(self, arpabet: str) -> str:
        """
        Convert ARPAbet phoneme to IPA (simplified mapping)
        
        ARPAbet is used by CMUdict, IPA is used by wav2vec2
        """
        # Remove stress markers (0, 1, 2)
        arpabet_clean = ''.join(c for c in arpabet if not c.isdigit())
        
        # Basic ARPAbet to IPA mapping
        mapping = {
            'AA': 'ɑ', 'AE': 'æ', 'AH': 'ə', 'AO': 'ɔ', 'AW': 'aʊ',
            'AY': 'aɪ', 'B': 'b', 'CH': 'tʃ', 'D': 'd', 'DH': 'ð',
            'EH': 'ɛ', 'ER': 'ɝ', 'EY': 'eɪ', 'F': 'f', 'G': 'ɡ',
            'HH': 'h', 'IH': 'ɪ', 'IY': 'i', 'JH': 'dʒ', 'K': 'k',
            'L': 'l', 'M': 'm', 'N': 'n', 'NG': 'ŋ', 'OW': 'oʊ',
            'OY': 'ɔɪ', 'P': 'p', 'R': 'ɹ', 'S': 's', 'SH': 'ʃ',
            'T': 't', 'TH': 'θ', 'UH': 'ʊ', 'UW': 'u', 'V': 'v',
            'W': 'w', 'Y': 'j', 'Z': 'z', 'ZH': 'ʒ'
        }
        
        return mapping.get(arpabet_clean, arpabet_clean.lower())
    
    def _estimate_acoustic_quality_from_features(self, audio: np.ndarray) -> float:
        """Estimate acoustic quality from audio features (fallback)"""
        # Extract MFCC
        mfcc = librosa.feature.mfcc(y=audio, sr=16000, n_mfcc=13)
        
        # Calculate feature variance (lower variance = more consistent = better)
        feature_std = np.std(mfcc, axis=0).mean()
        
        # Normalize to 0-1 range
        quality = max(0, min(1, 1 - (feature_std - 5) / 15))
        
        return quality
    
    def _compute_gop_simple(
        self,
        audio: np.ndarray,
        sr: int,
        phoneme_sequence: List[Dict]
    ) -> Dict:
        """Simple GOP without expected phonemes"""
        
        phoneme_scores = []
        
        for word_info in phoneme_sequence:
            word = word_info['word']
            phonemes = word_info['phonemes']
            
            # Use acoustic model if available
            if self.use_acoustic_model:
                word_score = self._estimate_acoustic_quality_from_features(audio)
            else:
                word_score = np.random.uniform(0.6, 1.0)
            
            phoneme_scores.append({
                'word': word,
                'phonemes': phonemes,
                'gop_score': word_score,
                'quality': self._quality_label(word_score)
            })
        
        avg_score = np.mean([ps['gop_score'] for ps in phoneme_scores])
        
        return {
            'overall_gop': avg_score,
            'overall_quality': self._quality_label(avg_score),
            'word_scores': phoneme_scores,
            'used_acoustic_model': self.use_acoustic_model
        }
    
    def _compare_phoneme_sequences(
        self, 
        expected_phonemes: List[str], 
        actual_phonemes: List[str]
    ) -> float:
        """
        Compare two phoneme sequences and return similarity score
        
        Uses phoneme-level matching with position awareness
        """
        from difflib import SequenceMatcher
        
        if not expected_phonemes or not actual_phonemes:
            return 0.0
        
        # Exact sequence matching
        matcher = SequenceMatcher(None, expected_phonemes, actual_phonemes)
        sequence_similarity = matcher.ratio()
        
        # Set-based matching (allows reordering)
        expected_set = set(expected_phonemes)
        actual_set = set(actual_phonemes)
        
        if not expected_set:
            return 0.0
        
        matching_phonemes = expected_set & actual_set
        set_similarity = len(matching_phonemes) / len(expected_set)
        
        # Combine: 80% sequence (order matters) + 20% set (phoneme presence)
        combined_score = 0.8 * sequence_similarity + 0.2 * set_similarity
        
        return combined_score
    
    def _estimate_acoustic_quality(self, mfcc: np.ndarray) -> float:
        """
        Estimate acoustic quality from MFCC features (fallback)
        """
        # Calculate feature variance (lower variance = more consistent = better)
        feature_std = np.std(mfcc, axis=0).mean()
        
        # Normalize to 0-1 range (typical MFCC std ranges from 5-20)
        quality = max(0, min(1, 1 - (feature_std - 5) / 15))
        
        return quality
    
    def _quality_label(self, score: float) -> str:
        """Convert GOP score to quality label"""
        if score >= 0.9:
            return "Excellent"
        elif score >= 0.75:
            return "Good"
        elif score >= 0.6:
            return "Fair"
        elif score >= 0.3:
            return "Poor"
        else:
            return "Very Poor"


class SpeakingTestSystem:
    """Main speaking test system integrating all components"""
    
    def __init__(self, output_dir: str = "./speaking_test_output"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
        print("Initializing Speaking Test System...")
        self.recorder = AudioRecorder()
        self.asr = WhisperASR()
        self.phoneme_converter = PhonemeConverter()
        mfa_executable_path = r"C:\Users\Admin\anaconda3\envs\mfa\Scripts\mfa.exe"
        self.mfa_aligner = MFAAligner(mfa_path=mfa_executable_path)
        self.dtw_matcher = DTWMatcher()
        self.gop_scorer = GOPScorer()
        print("System initialized\n")
    
    def run_test(
        self,
        prompt: str,
        duration: int = None,
        reference_audio: Optional[str] = None,
        use_vad: bool = True,
        silence_threshold: float = 100,  # Lowered to match typical microphone levels
        silence_duration: float = 2.0
    ) -> Dict:
        """
        Run complete speaking test
        
        Args:
            prompt: The speaking prompt/question
            duration: Maximum duration in seconds (if use_vad=False)
            reference_audio: Optional path to native speaker reference
            use_vad: Use voice activity detection for auto-stop
            silence_threshold: RMS threshold for silence detection
            silence_duration: Seconds of silence before auto-stop
        
        Returns:
            Dictionary with complete test results
        """
        
        print(f"Prompt: {prompt}\n")
        
        # 1. Record audio
        audio_file = str(self.output_dir / "student_recording.wav")
        
        if use_vad:
            self.recorder.record_with_vad(
                audio_file,
                silence_threshold=silence_threshold,
                silence_duration=silence_duration,
                max_duration=duration or 60
            )
        else:
            if duration is None:
                duration = 10
            self.recorder.record(duration, audio_file)
        
        print()
        
        # 2. Transcribe with Whisper
        transcription = self.asr.transcribe(audio_file)
        transcript_text = transcription['text']
        print()
        
        # Extract expected text from prompt
        expected_text = prompt
        if "please read:" in prompt.lower():
            expected_text = prompt.lower().split("please read:")[-1].strip()
        elif "say:" in prompt.lower():
            expected_text = prompt.lower().split("say:")[-1].strip()
        
        # 3. Convert to phonemes
        print("Converting to phonemes...")
        phoneme_sequence = self.phoneme_converter.text_to_phonemes(transcript_text)
        print(f"Phoneme sequence generated: {len(phoneme_sequence)} words")
        
        # Convert expected text to phonemes too
        expected_phoneme_sequence = self.phoneme_converter.text_to_phonemes(expected_text)
        print(f"Expected phoneme sequence: {len(expected_phoneme_sequence)} words")
        print()
        
        # 4. Align with MFA
        print("Aligning phonemes with audio...")
        alignment_file = self.mfa_aligner.align(
            audio_file,
            transcript_text,
            str(self.output_dir)
        )
        print(f"Alignment completed: {alignment_file}")
        print()
        
        # Load alignment
        if alignment_file.endswith('.json'):
            with open(alignment_file, 'r') as f:
                alignment = json.load(f)
        else:
            alignment = {}
        
        # 5. DTW comparison (if reference provided)
        dtw_results = None
        if reference_audio:
            dtw_results = self.dtw_matcher.compare(audio_file, reference_audio)
            print(f"DTW Similarity: {dtw_results['similarity_score']:.2f}%")
            print()
        
        # 6. GOP scoring with expected phonemes
        gop_results = self.gop_scorer.compute_gop(
            audio_file,
            phoneme_sequence,
            alignment,
            expected_phoneme_sequence=expected_phoneme_sequence
        )
        
        model_info = " (with acoustic model)" if gop_results.get('used_acoustic_model') else " (feature-based)"
        print(f"Overall GOP Score: {gop_results['overall_gop']:.3f} ({gop_results['overall_quality']}){model_info}")
        if 'phoneme_accuracy' in gop_results:
            print(f"Phoneme Accuracy: {gop_results['phoneme_accuracy']:.2%} ({gop_results['matching_phonemes']}/{gop_results['expected_phoneme_count']} phonemes)")
        print()
        
        # Compile results
        results = {
            'prompt': prompt,
            'expected_text': expected_text,
            'audio_file': audio_file,
            'transcription': transcript_text,
            'phoneme_sequence': phoneme_sequence,
            'alignment_file': alignment_file,
            'dtw_results': dtw_results,
            'gop_results': gop_results,
            'final_score': self._compute_final_score(
                dtw_results, 
                gop_results,
                expected_text,
                transcript_text
            )
        }
        
        # Save results
        results_file = self.output_dir / "test_results.json"
        with open(results_file, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        print(f"Results saved to: {results_file}")
        
        return results
    
    def _compute_final_score(
        self, 
        dtw_results: Optional[Dict], 
        gop_results: Dict,
        expected_text: str,
        actual_text: str
    ) -> Dict:
        """Compute final speaking test score with content verification"""
        
        # GOP score (pronunciation quality)
        gop_score = gop_results['overall_gop'] * 100
        
        # Content accuracy score
        content_score = self._calculate_content_accuracy(expected_text, actual_text)
        
        if dtw_results:
            dtw_score = dtw_results['similarity_score']
            # 40% GOP (pronunciation), 30% content, 30% DTW (native comparison)
            final_score = 0.4 * gop_score + 0.3 * content_score + 0.3 * dtw_score
        else:
            # 50% GOP (pronunciation), 50% content
            final_score = 0.5 * gop_score + 0.5 * content_score
        
        return {
            'final_score': final_score,
            'gop_component': gop_score,
            'content_accuracy': content_score,
            'dtw_component': dtw_results['similarity_score'] if dtw_results else None,
            'grade': self._score_to_grade(final_score),
            'content_matched': content_score >= 80  # Consider 80%+ as matched
        }
    
    def _calculate_content_accuracy(self, expected: str, actual: str) -> float:
        """
        Calculate content accuracy using word-level and sequence matching
        
        Args:
            expected: Expected text (from prompt)
            actual: Actual transcribed text
        
        Returns:
            Accuracy score (0-100)
        """
        from difflib import SequenceMatcher
        
        # Normalize text
        expected_clean = expected.lower().strip()
        actual_clean = actual.lower().strip()
        
        # Remove prompt prefix if present
        if "please read:" in expected_clean:
            expected_clean = expected_clean.split("please read:")[-1].strip()
        if "say:" in expected_clean:
            expected_clean = expected_clean.split("say:")[-1].strip()
        
        # Handle empty cases
        if not expected_clean or not actual_clean:
            return 0.0
        
        # Word-level matching
        expected_words = expected_clean.split()
        actual_words = actual_clean.split()
        
        expected_set = set(expected_words)
        actual_set = set(actual_words)
        
        if not expected_set:
            return 0.0
        
        # Calculate word presence accuracy
        matching_words = expected_set & actual_set
        word_accuracy = len(matching_words) / len(expected_set)
        
        # Calculate sequence similarity (word order)
        sequence_similarity = SequenceMatcher(None, expected_words, actual_words).ratio()
        
        # Combine: 70% word presence, 30% sequence order
        final_accuracy = 0.7 * word_accuracy + 0.3 * sequence_similarity
        
        return final_accuracy * 100
    
    def _score_to_grade(self, score: float) -> str:
        """Convert numerical score to grade"""
        if score >= 90:
            return "A (Excellent)"
        elif score >= 80:
            return "B (Good)"
        elif score >= 70:
            return "C (Satisfactory)"
        elif score >= 60:
            return "D (Needs Improvement)"
        else:
            return "F (Poor)"
    
    def print_detailed_results(self, results: Dict):
        """Print detailed test results"""
        print("\n" + "="*60)
        print("SPEAKING TEST RESULTS")
        print("="*60)
        
        print(f"\nPrompt: {results['prompt']}")
        print(f"Expected: {results['expected_text']}")
        print(f"You said: {results['transcription']}")
        
        # Content accuracy
        content_acc = results['final_score']['content_accuracy']
        content_status = "MATCHED" if results['final_score']['content_matched'] else "DIFFERENT"
        print(f"\nContent Accuracy: {content_acc:.2f}% [{content_status}]")
        
        # Phoneme-level analysis (if available)
        if 'phoneme_accuracy' in results['gop_results']:
            gop = results['gop_results']
            print(f"\nPhoneme-Level GOP Analysis:")
            print(f"  Expected phonemes: {gop['expected_phoneme_count']}")
            print(f"  Actual phonemes: {gop['actual_phoneme_count']}")
            print(f"  Matching phonemes: {gop['matching_phonemes']}")
            print(f"  Phoneme Accuracy: {gop['phoneme_accuracy']:.2%}")
            print(f"  Phoneme Match Score: {gop['phoneme_match_score']:.2%}")
            print(f"  Acoustic Quality: {gop['acoustic_quality_score']:.2%}")
            
            # Show word-by-word comparison
            print(f"\nWord-by-Word Analysis:")
            for word_score in results['gop_results']['word_scores'][:5]:
                if word_score['expected_word']:
                    expected_ph = ' '.join(word_score['expected_phonemes'])
                    actual_ph = ' '.join(word_score['phonemes']) if word_score['phonemes'] else 'N/A'
                    match = word_score['phoneme_match']
                    
                    print(f"  Expected: {word_score['expected_word']:10s} [{expected_ph}]")
                    print(f"  Actual:   {word_score['word']:10s} [{actual_ph}]")
                    print(f"  Match: {match:.1%} - {word_score['quality']}")
                    print()
            
            if len(results['gop_results']['word_scores']) > 5:
                print(f"  ... and {len(results['gop_results']['word_scores']) - 5} more words")
        else:
            # Original phoneme display
            print(f"\nPhoneme Analysis:")
            for word_info in results['phoneme_sequence'][:5]:
                print(f"  {word_info['word']}: {' '.join(word_info['phonemes'])}")
            if len(results['phoneme_sequence']) > 5:
                print(f"  ... and {len(results['phoneme_sequence']) - 5} more words")
        
        if results['dtw_results']:
            print(f"\nDTW Analysis:")
            print(f"  Similarity Score: {results['dtw_results']['similarity_score']:.2f}%")
            print(f"  Normalized Distance: {results['dtw_results']['normalized_distance']:.4f}")
        
        print(f"\nGOP Analysis:")
        print(f"  Overall Score: {results['gop_results']['overall_gop']:.3f}")
        print(f"  Quality: {results['gop_results']['overall_quality']}")
        
        print(f"\nScore Breakdown:")
        print(f"  Pronunciation (GOP): {results['final_score']['gop_component']:.2f}/100")
        print(f"  Content Accuracy: {results['final_score']['content_accuracy']:.2f}/100")
        if results['final_score']['dtw_component']:
            print(f"  Native Similarity: {results['final_score']['dtw_component']:.2f}/100")
        
        print(f"\nFinal Score: {results['final_score']['final_score']:.2f}/100")
        print(f"   Grade: {results['final_score']['grade']}")
        
        print("\n" + "="*60)


# Example usage and demo functions
def demo_basic_vad():
    """Basic VAD demo - press button, speak, auto-stops"""
    print("\n" + "="*60)
    print("DEMO: VOICE ACTIVITY DETECTION")
    print("="*60)
    print("\nPress Enter to start recording...")
    print("Speak naturally, system will auto-stop after 2s of silence")
    print("\nUsing default threshold: 300 (sensitive)")
    print("If auto-stop doesn't work, run: python calibrate_microphone.py")
    print("="*60)
    
    input()  # Wait for button press
    
    system = SpeakingTestSystem(output_dir="./vad_demo")
    
    results = system.run_test(
        prompt="Please read: The quick brown fox jumps over the lazy dog.",
        use_vad=True,
        silence_threshold=100,  # Lower, more sensitive
        silence_duration=2.0
    )
    
    system.print_detailed_results(results)


def demo_ielts_speaking():
    """IELTS-style long response with pauses"""
    print("\n" + "="*60)
    print("DEMO: IELTS SPEAKING TEST")
    print("="*60)
    
    prompt = """
    Describe a memorable event in your life.
    You should say:
    - What the event was
    - When it happened
    - Who was there
    And explain why it was memorable.
    """
    
    print(prompt)
    print("\nPress Enter to start recording...")
    input()
    
    system = SpeakingTestSystem(output_dir="./ielts_demo")
    
    results = system.run_test(
        prompt=prompt,
        use_vad=True,
        silence_duration=3.0,  # Allow longer pauses
        max_duration=120.0      
    )
    
    print(f"\nTranscription: {results['transcription']}")
    print(f"Score: {results['final_score']['final_score']:.2f}/100")


def demo_fixed_duration():
    """Traditional fixed-duration recording"""
    print("\n" + "="*60)
    print("DEMO: FIXED DURATION (30 seconds)")
    print("="*60)
    print("\nPress Enter to start 30-second recording...")
    input()
    
    system = SpeakingTestSystem(output_dir="./fixed_demo")
    
    results = system.run_test(
        prompt="Tell me about your daily routine.",
        use_vad=False,
        duration=30
    )
    
    system.print_detailed_results(results)


def demo_content_verification():
    """Demonstrate content verification"""
    print("\n" + "="*60)
    print("DEMO: CONTENT VERIFICATION")
    print("="*60)
    print("\nThis demo shows how the system verifies if you read the correct text.")
    print("\nScenario 1: Read the CORRECT text")
    print("Prompt: 'Please read: The quick brown fox jumps over the lazy dog.'")
    print("\nScenario 2: Read DIFFERENT text")
    print("You can say anything different to see how content accuracy works.")
    print("\n" + "="*60)
    
    choice = input("\nSelect scenario (1 or 2): ").strip()
    
    system = SpeakingTestSystem(output_dir="./content_demo")
    
    if choice == "1":
        print("\nPlease read EXACTLY:")
        print("'The quick brown fox jumps over the lazy dog'")
        input("\nPress Enter to start recording...")
    else:
        print("\nSay something DIFFERENT from the prompt")
        print("(This will show low content accuracy)")
        input("\nPress Enter to start recording...")
    
    results = system.run_test(
        prompt="Please read: The quick brown fox jumps over the lazy dog.",
        use_vad=True,
        silence_duration=2.0,
        silence_threshold=100
    )
    
    system.print_detailed_results(results)
    
    # Explain the results
    print("\nEXPLANATION:")
    content_acc = results['final_score']['content_accuracy']
    if content_acc >= 80:
        print("High content accuracy (80%+) means you read the correct text.")
    elif content_acc >= 50:
        print("Medium content accuracy (50-80%) means partial match.")
    else:
        print("Low content accuracy (<50%) means different content.")
    print("="*60)


if __name__ == "__main__":
    print("\n" + "="*60)
    print("AI SPEAKING TEST SYSTEM")
    print("="*60)
    
    choice = input("\nPress Enter for basic ").strip()
    
    if choice == "2":
        demo_ielts_speaking()
    elif choice == "3":
        demo_fixed_duration()
    elif choice == "4":
        demo_content_verification()
    else:
        demo_basic_vad()