"""
Hybrid Deep Learning Scorer
Uses the hybrid deep model (Transformer + LSTM + Features) for essay scoring
Includes: Hybrid Scoring, Off-topic Detection, Quality Filter
"""

import torch
import torch.nn as nn
from transformers import AutoTokenizer, AutoModel
import numpy as np
from pathlib import Path
from typing import Dict, Optional, Tuple
import re
from collections import Counter
import sys

# Force Python to flush stdout immediately for real-time logging
sys.stdout.reconfigure(line_buffering=True) if hasattr(sys.stdout, 'reconfigure') else None

# Try to import NLTK (optional but recommended)
try:
    import nltk
    from nltk.tokenize import sent_tokenize, word_tokenize
    from nltk.tag import pos_tag
    from nltk.corpus import stopwords
    
    # Download required NLTK data
    def download_nltk_data(resource_name, quiet=True):
        """Download NLTK resource if not found"""
        try:
            nltk.data.find(f'tokenizers/{resource_name}')
        except LookupError:
            try:
                print(f"[NLTK] Downloading {resource_name}...", flush=True)
                nltk.download(resource_name, quiet=quiet)
                print(f"[NLTK] {resource_name} downloaded successfully", flush=True)
            except Exception as e:
                print(f"[NLTK] Failed to download {resource_name}: {e}", flush=True)
                return False
        return True
    
    # Download punkt_tab (newer version) or punkt (fallback)
    try:
        nltk.data.find('tokenizers/punkt_tab')
    except LookupError:
        try:
            print("[NLTK] Downloading punkt_tab...", flush=True)
            nltk.download('punkt_tab', quiet=False)
            print("[NLTK] punkt_tab downloaded successfully", flush=True)
        except:
            # Fallback to punkt if punkt_tab fails
            try:
                nltk.data.find('tokenizers/punkt')
            except LookupError:
                try:
                    print("[NLTK] Downloading punkt (fallback)...", flush=True)
                    nltk.download('punkt', quiet=False)
                    print("[NLTK] punkt downloaded successfully", flush=True)
                except:
                    pass
    
    try:
        nltk.data.find('taggers/averaged_perceptron_tagger')
    except LookupError:
        try:
            print("[NLTK] Downloading averaged_perceptron_tagger...", flush=True)
            nltk.download('averaged_perceptron_tagger', quiet=False)
            print("[NLTK] averaged_perceptron_tagger downloaded successfully", flush=True)
        except:
            pass
    
    try:
        nltk.data.find('corpora/stopwords')
    except LookupError:
        try:
            print("[NLTK] Downloading stopwords...", flush=True)
            nltk.download('stopwords', quiet=False)
            print("[NLTK] stopwords downloaded successfully", flush=True)
        except:
            pass
    
    NLTK_AVAILABLE = True
    print("[NLTK] NLTK initialized successfully", flush=True)
except ImportError:
    NLTK_AVAILABLE = False
    print("[WARNING] NLTK not available. Some features may be limited. Install with: pip install nltk", flush=True)
    
    # Fallback functions
    def sent_tokenize(text):
        return re.split(r'[.!?]+', text)
    
    def word_tokenize(text):
        return text.split()
    
    def pos_tag(tokens):
        return [(token, 'NN') for token in tokens]  # Default to noun
    
    stopwords = set()  # Empty set as fallback
except Exception as e:
    NLTK_AVAILABLE = False
    print(f"[WARNING] NLTK initialization failed: {e}", flush=True)
    print("[WARNING] Using fallback tokenization", flush=True)
    
    # Fallback functions
    def sent_tokenize(text):
        return re.split(r'[.!?]+', text)
    
    def word_tokenize(text):
        return text.split()
    
    def pos_tag(tokens):
        return [(token, 'NN') for token in tokens]  # Default to noun
    
    stopwords = set()  # Empty set as fallback

# Model configuration
MODEL_NAME = 'sentence-transformers/all-MiniLM-L6-v2'
MAX_LEN = 512
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Feature columns expected by the model
FEATURE_COLS = [
    'word_count', 'sent_count', 'avg_word_len', 'spell_err_count',
    'noun_count', 'adj_count', 'verb_count', 'adv_count',
    'readability_score', 'punctuation_score', 'vocabulary_richness',
    'complex_sentence_ratio', 'clause_density', 'semantic_coherence',
    'sentiment_subjectivity', 'transitional_phrase_use',
    'figurative_language_use', 'question_usage'
]


class HybridModel(nn.Module):
    """Hybrid model architecture: Transformer + LSTM + Features"""
    def __init__(self, model_name, num_features, hidden_dim=256):
        super(HybridModel, self).__init__()
        self.transformer = AutoModel.from_pretrained(model_name)
        
        # Freeze most transformer layers, only fine-tune last 2
        for param in self.transformer.parameters():
            param.requires_grad = False 
        for param in self.transformer.encoder.layer[-2:].parameters():
            param.requires_grad = True
            
        self.lstm = nn.LSTM(
            self.transformer.config.hidden_size, 
            hidden_dim, 
            2, 
            batch_first=True, 
            bidirectional=True, 
            dropout=0.3
        )
        self.attention = nn.Linear(hidden_dim * 2, 1)
        
        self.feature_net = nn.Sequential(
            nn.Linear(num_features, 128),
            nn.BatchNorm1d(128),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(128, 64),
            nn.ReLU()
        )
        
        self.regressor = nn.Sequential(
            nn.Linear(hidden_dim * 2 + 64, 128),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(128, 1),
            nn.Sigmoid()
        )

    def forward(self, input_ids, attention_mask, features):
        trans_out = self.transformer(input_ids, attention_mask)
        lstm_out, _ = self.lstm(trans_out.last_hidden_state)
        attn_weights = torch.softmax(torch.tanh(self.attention(lstm_out)), dim=1)
        text_emb = torch.sum(attn_weights * lstm_out, dim=1)
        feat_emb = self.feature_net(features)
        combined = torch.cat((text_emb, feat_emb), dim=1)
        return self.regressor(combined)


class HybridDeepScorer:
    """Main scorer class for hybrid deep learning model"""
    
    def __init__(self, model_path: Optional[str] = None):
        self.model = None
        self.tokenizer = None
        self.scaler = None
        self.min_score = None
        self.max_score = None
        self.features_list = None
        self.model_name = MODEL_NAME
        self.loaded = False
        
        if model_path is None:
            # Try to find model in python-services directory
            script_dir = Path(__file__).parent
            model_path = script_dir / 'hybrid_deep_model.pth'
        
        if isinstance(model_path, str):
            model_path = Path(model_path)
        
        if model_path.exists():
            self.load_model(model_path)
        else:
            print(f"[WARNING] Model file not found at {model_path}")
    
    def load_model(self, model_path: Path):
        """Load the hybrid deep model from file"""
        try:
            print(f"[Hybrid Scorer] Loading model from {model_path}...")
            # PyTorch 2.6+ requires weights_only=False for models with sklearn objects
            checkpoint = torch.load(model_path, map_location=DEVICE, weights_only=False)
            
            # Extract model metadata
            self.scaler = checkpoint.get('scaler')
            self.min_score = checkpoint.get('min_score', 0.0)
            self.max_score = checkpoint.get('max_score', 10.0)
            self.features_list = checkpoint.get('features_list', FEATURE_COLS)
            self.model_name = checkpoint.get('model_name', MODEL_NAME)
            
            # Initialize tokenizer
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            
            # Initialize and load model
            num_features = len(self.features_list)
            self.model = HybridModel(self.model_name, num_features).to(DEVICE)
            self.model.load_state_dict(checkpoint['model_state'])
            self.model.eval()
            
            # FORCE score range to 0-10 (ignore checkpoint range)
            original_min = self.min_score
            original_max = self.max_score
            self.min_score = 0.0
            self.max_score = 10.0
            
            self.loaded = True
            print(f"[Hybrid Scorer] Model loaded successfully!")
            print(f"[Hybrid Scorer] Features: {len(self.features_list)}")
            print(f"[Hybrid Scorer] Score range from checkpoint: min={original_min}, max={original_max}")
            if original_max > 10.0 or original_min < 0.0:
                print(f"[WARNING] Checkpoint has unusual range, FORCING to: min=0.0, max=10.0")
            print(f"[Hybrid Scorer] Using score range: min={self.min_score}, max={self.max_score}")
        except Exception as e:
            print(f"[ERROR] Failed to load hybrid model: {e}")
            import traceback
            traceback.print_exc()
            self.loaded = False
    
    def extract_features(self, text: str) -> np.ndarray:
        """Extract 24 features from essay text"""
        if not text:
            return np.zeros(len(FEATURE_COLS))
        
        words = word_tokenize(text.lower())
        sentences = sent_tokenize(text)
        
        # Remove punctuation from words
        words_clean = [w for w in words if w.isalnum()]
        
        # Feature 1: word_count
        word_count = len(words_clean)
        
        # Feature 2: sent_count
        sent_count = len(sentences) if sentences else 1
        
        # Feature 3: avg_word_len
        avg_word_len = np.mean([len(w) for w in words_clean]) if words_clean else 0
        
        # Feature 4: spell_err_count (simplified - count words with unusual patterns)
        spell_err_count = 0
        for word in words_clean:
            if len(word) > 2:
                # Check for unusual patterns
                if re.search(r'[bcdfghjklmnpqrstvwxyz]{4,}', word) or \
                   re.search(r'[aeiou]{4,}', word) or \
                   not re.search(r'[aeiou]', word):
                    spell_err_count += 1
        
        # Features 5-8: POS tag counts
        try:
            pos_tags = pos_tag(words_clean)
            noun_count = sum(1 for _, tag in pos_tags if tag.startswith('NN'))
            adj_count = sum(1 for _, tag in pos_tags if tag.startswith('JJ'))
            verb_count = sum(1 for _, tag in pos_tags if tag.startswith('VB'))
            adv_count = sum(1 for _, tag in pos_tags if tag.startswith('RB'))
        except:
            noun_count = adj_count = verb_count = adv_count = 0
        
        # Feature 9: readability_score (simplified Flesch-like)
        if sent_count > 0 and word_count > 0:
            avg_sent_len = word_count / sent_count
            readability_score = max(0, min(100, 206.835 - 1.015 * avg_sent_len - 84.6 * (avg_word_len / 4.7)))
        else:
            readability_score = 0
        
        # Feature 10: punctuation_score
        punct_chars = len(re.findall(r'[.,!?;:]', text))
        punctuation_score = (punct_chars / word_count * 100) if word_count > 0 else 0
        
        # Feature 11: vocabulary_richness (unique words / total words)
        unique_words = len(set(words_clean))
        vocabulary_richness = (unique_words / word_count * 100) if word_count > 0 else 0
        
        # Feature 12: complex_sentence_ratio
        complex_sent_count = sum(1 for s in sentences if len(s.split()) > 15)
        complex_sentence_ratio = (complex_sent_count / sent_count * 100) if sent_count > 0 else 0
        
        # Feature 13: clause_density (simplified - count commas and conjunctions)
        clause_indicators = len(re.findall(r'\b(and|or|but|because|although|while|if|when|where)\b', text.lower()))
        clause_density = (clause_indicators / sent_count) if sent_count > 0 else 0
        
        # Feature 14: semantic_coherence (simplified - word repetition)
        word_freq = Counter(words_clean)
        repeated_words = sum(1 for count in word_freq.values() if count > 2)
        semantic_coherence = (repeated_words / unique_words * 100) if unique_words > 0 else 0
        
        # Feature 15: sentiment_subjectivity (simplified)
        subjective_words = len(re.findall(r'\b(i|my|me|we|our|think|believe|feel|opinion|seem|appear)\b', text.lower()))
        sentiment_subjectivity = (subjective_words / word_count * 100) if word_count > 0 else 0
        
        # Feature 16: transitional_phrase_use
        transitions = len(re.findall(r'\b(however|therefore|furthermore|moreover|additionally|consequently|thus|hence|nevertheless|nonetheless)\b', text.lower()))
        transitional_phrase_use = (transitions / sent_count) if sent_count > 0 else 0
        
        # Feature 17: figurative_language_use
        figurative = len(re.findall(r'\b(like|as|metaphor|simile|symbol|represent)\b', text.lower()))
        figurative_language_use = (figurative / word_count * 100) if word_count > 0 else 0
        
        # Feature 18: question_usage
        questions = len(re.findall(r'\?', text))
        question_usage = (questions / sent_count) if sent_count > 0 else 0
        
        # Build feature vector
        features = np.array([
            word_count, sent_count, avg_word_len, spell_err_count,
            noun_count, adj_count, verb_count, adv_count,
            readability_score, punctuation_score, vocabulary_richness,
            complex_sentence_ratio, clause_density, semantic_coherence,
            sentiment_subjectivity, transitional_phrase_use,
            figurative_language_use, question_usage
        ])
        
        return features
    
    def predict(self, text: str) -> Tuple[float, Dict]:
        """
        Predict score for essay text
        Returns: (normalized_score_0_1, metadata_dict)
        """
        if not self.loaded:
            raise RuntimeError("Model not loaded. Call load_model() first.")
        
        # Extract features
        features = self.extract_features(text)
        
        # Normalize features using scaler
        if self.scaler is not None:
            features_scaled = self.scaler.transform(features.reshape(1, -1))
        else:
            features_scaled = features.reshape(1, -1)
        
        # Tokenize text
        encoding = self.tokenizer.encode_plus(
            text,
            add_special_tokens=True,
            max_length=MAX_LEN,
            return_token_type_ids=False,
            padding='max_length',
            truncation=True,
            return_attention_mask=True,
            return_tensors='pt',
        )
        
        input_ids = encoding['input_ids'].to(DEVICE)
        attention_mask = encoding['attention_mask'].to(DEVICE)
        features_tensor = torch.tensor(features_scaled, dtype=torch.float).to(DEVICE)
        
        # Predict
        with torch.no_grad():
            output = self.model(input_ids, attention_mask, features_tensor)
            raw_score = output.item()  # Raw output from model (Sigmoid should be [0, 1])
        
        # Debug: Log raw model output
        print(f"[Hybrid Model] Raw model output: {raw_score}")
        
        # CRITICAL: Model has Sigmoid output, so it should be in [0, 1]
        # But if model was trained differently, it might output different range
        # FORCE: Always normalize to [0, 1] first, then scale to [0, 10]
        
        # CRITICAL: Model has Sigmoid output, so it SHOULD be in [0, 1]
        # But if model was trained/loaded incorrectly, it might output different range
        # Strategy: If raw_score > 1.0, it's likely already in 0-10 scale, so use it directly
        # If raw_score <= 1.0, it's normalized, so multiply by 10
        
        if raw_score > 10.0:
            # Likely 0-100 scale, divide by 10 to get 0-10
            print(f"[Hybrid Model] Raw score > 10.0 ({raw_score}), treating as 0-100, dividing by 10")
            denormalized_score = raw_score / 10.0
        elif raw_score > 1.0:
            # Likely already in 0-10 scale (model output was already denormalized)
            # Use it directly, don't multiply by 10
            print(f"[Hybrid Model] Raw score > 1.0 ({raw_score}), treating as already 0-10 scale, using directly")
            denormalized_score = raw_score
        else:
            # In [0, 1] range (expected for Sigmoid), multiply by 10 to get 0-10
            print(f"[Hybrid Model] Raw score <= 1.0 ({raw_score}), treating as normalized [0,1], multiplying by 10")
            denormalized_score = raw_score * 10.0
        
        # ALWAYS cap at 10.0 (final safety check)
        denormalized_score = max(0.0, min(10.0, float(denormalized_score)))
        print(f"[Hybrid Model] Final score (capped at 10.0): {denormalized_score}")
        
        # For metadata, calculate normalized score
        normalized_score = denormalized_score / 10.0
        
        metadata = {
            'normalized_score': normalized_score,
            'denormalized_score': denormalized_score,
            'raw_model_output': raw_score,
            'features': features.tolist(),
            'model_type': 'hybrid_deep'
        }
        
        return normalized_score, metadata
    
    def score_essay(self, text: str, prompt: Optional[str] = None) -> Dict:
        """
        Score essay with hybrid model
        Includes: Hybrid Scoring, Off-topic Detection, Quality Filter
        
        Returns:
        {
            'score': float (0-10 scale),
            'normalized_score': float (0-1),
            'is_off_topic': bool,
            'off_topic_confidence': float,
            'quality_passed': bool,
            'quality_score': float,
            'metadata': dict
        }
        """
        if not self.loaded:
            return {
                'score': 0.0,
                'error': 'Model not loaded',
                'is_off_topic': False,
                'quality_passed': False
            }
        
        # Step 1: Quality Filter (basic validation)
        quality_passed, quality_score = self._quality_filter(text)
        
        if not quality_passed:
            return {
                'score': 0.0,
                'normalized_score': 0.0,
                'is_off_topic': False,
                'off_topic_confidence': 0.0,
                'quality_passed': False,
                'quality_score': quality_score,
                'metadata': {'quality_rejected': True}
            }
        
        # Step 2: Off-topic Detection (if prompt provided)
        is_off_topic = False
        off_topic_confidence = 0.0
        if prompt:
            is_off_topic, off_topic_confidence = self._detect_off_topic(text, prompt)
        
        # Step 3: Hybrid Scoring
        normalized_score, metadata = self.predict(text)
        
        # Get denormalized score from metadata (already calculated in predict())
        score = metadata.get('denormalized_score', 0.0)
        
        # Debug logging (flush immediately)
        print(f"[Hybrid Scorer] After predict: normalized={normalized_score}, denormalized={score}", flush=True)
        
        # CRITICAL FIX: Double check - if score > 10, force divide by 10
        # This handles any edge cases where denormalization went wrong
        if score > 10.0:
            print(f"[Hybrid Scorer] CRITICAL: Score > 10.0 ({score}), forcing division by 10", flush=True)
            score = score / 10.0
        
        # Apply off-topic penalty
        if is_off_topic and off_topic_confidence > 0.8:
            score = score * 0.3  # Severe penalty for off-topic
            print(f"[Hybrid Scorer] Applied severe off-topic penalty: {score}", flush=True)
        elif is_off_topic and off_topic_confidence > 0.5:
            score = score * 0.6  # Moderate penalty
            print(f"[Hybrid Scorer] Applied moderate off-topic penalty: {score}", flush=True)
        
        # Final safety check: ensure score is in [0, 10] range
        score = max(0.0, min(10.0, float(score)))
        print(f"[Hybrid Scorer] Final score (capped at 10.0): {score}", flush=True)
        
        return {
            'score': score,
            'normalized_score': normalized_score,
            'is_off_topic': is_off_topic,
            'off_topic_confidence': off_topic_confidence,
            'quality_passed': quality_passed,
            'quality_score': quality_score,
            'metadata': metadata
        }
    
    def _quality_filter(self, text: str) -> Tuple[bool, float]:
        """
        Quality Filter: Check if text is valid English and meaningful
        Returns: (passed, quality_score)
        """
        if not text or len(text.strip()) < 10:
            return False, 0.0
        
        words = word_tokenize(text.lower())
        words_clean = [w for w in words if w.isalnum() and len(w) > 1]
        
        if len(words_clean) < 3:
            return False, 0.0
        
        # Check for too many numbers (likely random typing)
        number_count = len(re.findall(r'\d', text))
        total_chars = len(re.sub(r'\s', '', text))
        number_ratio = number_count / total_chars if total_chars > 0 else 0
        
        if number_ratio > 0.05:
            return False, 0.0
        
        # Check for valid English patterns
        vowels = len(re.findall(r'[aeiou]', text.lower()))
        consonants = len(re.findall(r'[bcdfghjklmnpqrstvwxyz]', text.lower()))
        vowel_ratio = vowels / (vowels + consonants) if (vowels + consonants) > 0 else 0
        
        # English typically has 30-40% vowels
        if not (0.25 <= vowel_ratio <= 0.50):
            return False, 0.0
        
        # Quality score based on various factors
        unique_words = len(set(words_clean))
        vocabulary_richness = unique_words / len(words_clean) if words_clean else 0
        
        quality_score = (
            min(1.0, len(words_clean) / 50.0) * 0.3 +  # Length factor
            vocabulary_richness * 0.3 +  # Vocabulary diversity
            (1.0 if 0.25 <= vowel_ratio <= 0.50 else 0.0) * 0.4  # Language pattern
        )
        
        return quality_score > 0.4, quality_score
    
    def _detect_off_topic(self, text: str, prompt: str) -> Tuple[bool, float]:
        """
        Off-topic Detection: Check if text addresses the prompt
        Returns: (is_off_topic, confidence)
        """
        # Simple keyword-based detection
        prompt_words = set(word_tokenize(prompt.lower()))
        text_words = set(word_tokenize(text.lower()))
        
        # Remove stopwords
        if NLTK_AVAILABLE:
            try:
                stop_words = set(stopwords.words('english'))
                prompt_words = {w for w in prompt_words if w not in stop_words and len(w) > 3}
                text_words = {w for w in text_words if w not in stop_words and len(w) > 3}
            except:
                pass
        else:
            # Basic stopwords list if NLTK not available
            basic_stopwords = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their', 'what', 'which', 'who', 'whom', 'whose', 'where', 'when', 'why', 'how', 'all', 'each', 'every', 'some', 'any', 'no', 'not', 'if', 'then', 'else', 'while', 'because', 'although', 'however', 'therefore'}
            prompt_words = {w for w in prompt_words if w not in basic_stopwords and len(w) > 3}
            text_words = {w for w in text_words if w not in basic_stopwords and len(w) > 3}
        
        # Calculate overlap
        if len(prompt_words) == 0:
            return False, 0.0
        
        overlap = len(prompt_words & text_words)
        overlap_ratio = overlap / len(prompt_words)
        
        # If less than 20% overlap, likely off-topic
        is_off_topic = overlap_ratio < 0.2
        confidence = 1.0 - overlap_ratio
        
        return is_off_topic, confidence


# Global instance
_hybrid_scorer = None

def get_hybrid_scorer() -> Optional[HybridDeepScorer]:
    """Get or create global hybrid scorer instance"""
    global _hybrid_scorer
    if _hybrid_scorer is None:
        _hybrid_scorer = HybridDeepScorer()
    return _hybrid_scorer if _hybrid_scorer.loaded else None

