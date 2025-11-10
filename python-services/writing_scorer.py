"""
IELTS Writing Scorer Service
Uses Keras model to score IELTS writing and converts to CEFR levels
Supports multiple model types:
- Traditional feature-based model
- BERT sentence transformer models
- BERT multi-task fine-tuned
- BERT PRO
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import pickle
import re
import os
from pathlib import Path
from tensorflow import keras
from typing import Dict, List, Tuple, Optional
import sys
import requests
import time
from functools import lru_cache

# Import task response analyzer
try:
    from task_response_analyzer import analyze_task_response_semantic
    TASK_RESPONSE_ANALYZER_AVAILABLE = True
except ImportError:
    TASK_RESPONSE_ANALYZER_AVAILABLE = False
    print("[WARNING] Task response analyzer not available, using basic keyword matching")

# Import task fulfillment checker
try:
    from task_fulfillment_checker import analyze_off_topic_detection, check_task_fulfillment_rubric, calculate_topic_score
    TASK_FULFILLMENT_CHECKER_AVAILABLE = True
except ImportError as e:
    TASK_FULFILLMENT_CHECKER_AVAILABLE = False
    print(f"[WARNING] Task fulfillment checker not available: {e}")

# Import evidence-bound scorer
try:
    from evidence_bound_scorer import analyze_coherence_evidence_bound, analyze_lexical_evidence_bound, analyze_grammar_evidence_bound
    EVIDENCE_BOUND_SCORER_AVAILABLE = True
except ImportError as e:
    EVIDENCE_BOUND_SCORER_AVAILABLE = False
    print(f"[WARNING] Evidence-bound scorer not available: {e}")

# Import CEFR rubric
try:
    from cefr_rubric import get_level_rubric, calculate_mechanics_score, get_level_score_bands, get_cefr_level_group
    CEFR_RUBRIC_AVAILABLE = True
except ImportError as e:
    CEFR_RUBRIC_AVAILABLE = False
    print(f"[WARNING] CEFR rubric not available: {e}")

# Import intelligent scorer (new system)
try:
    from intelligent_scorer import score_essay_intelligent
    INTELLIGENT_SCORER_AVAILABLE = True
    print("[OK] Intelligent scorer available")
except ImportError as e:
    INTELLIGENT_SCORER_AVAILABLE = False
    print(f"[WARNING] Intelligent scorer not available: {e}")

app = Flask(__name__)
CORS(app)

# Try to import and initialize Swagger
try:
    from flasgger import Swagger
    SWAGGER_AVAILABLE = True
except ImportError:
    SWAGGER_AVAILABLE = False
    print("Warning: flasgger not available. Install with: pip install flasgger")
    Swagger = None

# Get the directory of this script
SCRIPT_DIR = Path(__file__).parent.resolve()
PROJECT_ROOT = SCRIPT_DIR.parent

# Add ai-models directory to path for BERT model
AI_MODELS_DIR = PROJECT_ROOT / 'ai-models' / 'writing-scorer'
if str(AI_MODELS_DIR) not in sys.path:
    sys.path.insert(0, str(AI_MODELS_DIR))

# Import model loader
try:
    from model_loader import load_all_models, ModelLoader
    MODEL_LOADER_AVAILABLE = True
except ImportError:
    MODEL_LOADER_AVAILABLE = False
    print("[WARNING] Model loader not available, using legacy loading")

# ==================== MULTI-MODEL SUPPORT ====================
all_models = {}
model_loader = None
active_model = None
active_model_type = None

# Try to load all models using model_loader
if MODEL_LOADER_AVAILABLE:
    try:
        models_base_dir = PROJECT_ROOT / 'ai-models' / 'writing-scorer'
        all_models, model_loader = load_all_models(models_base_dir)
        
        # Select best available model (priority: bert_pro > bert_multi > bert > traditional)
        if all_models.get('bert_pro', {}).get('loaded'):
            active_model = all_models['bert_pro']
            active_model_type = 'bert_pro'
            print("[OK] Using BERT PRO model (best accuracy)")
        elif all_models.get('bert_multi', {}).get('loaded'):
            active_model = all_models['bert_multi']
            active_model_type = 'bert_multi'
            print("[OK] Using BERT Multi-task model")
        elif all_models.get('bert', {}).get('loaded'):
            active_model = all_models['bert']
            active_model_type = 'bert'
            print("[OK] Using BERT model")
        elif all_models.get('traditional', {}).get('loaded'):
            active_model = all_models['traditional']
            active_model_type = 'traditional'
            print("[OK] Using Traditional model")
        
        if active_model:
            print(f"[OK] Active model: {active_model_type}")
        else:
            print("[WARNING] No models loaded, will use fallback scoring")
    except Exception as e:
        print(f"[ERROR] Error loading models: {e}")
        import traceback
        traceback.print_exc()
        all_models = {}

# ==================== TRADITIONAL MODEL (Old) ====================
MODEL_PATHS = [
    PROJECT_ROOT / 'ai-models' / 'writing-scorer' / 'model.keras',
    SCRIPT_DIR / '../ai-models/writing-scorer/model.keras',
    Path('../ai-models/writing-scorer/model.keras'),
]

SCALER_PATHS = [
    PROJECT_ROOT / 'ai-models' / 'writing-scorer' / 'scaler.pkl',
    SCRIPT_DIR / '../ai-models/writing-scorer/scaler.pkl',
    Path('../ai-models/writing-scorer/scaler.pkl'),
]

VECTORIZER_PATHS = [
    PROJECT_ROOT / 'ai-models' / 'writing-scorer' / 'vectorizer.pkl',
    SCRIPT_DIR / '../ai-models/writing-scorer/vectorizer.pkl',
    Path('../ai-models/writing-scorer/vectorizer.pkl'),
]

# Find and load traditional model
model = None
scaler = None
vectorizer = None
model_loaded = False

for model_path in MODEL_PATHS:
    resolved_path = model_path.resolve()
    if resolved_path.exists():
        try:
            print(f"Loading traditional model from: {resolved_path}")
            model = keras.models.load_model(str(resolved_path))
            model_loaded = True
            break
        except Exception as e:
            print(f"Failed to load traditional model from {resolved_path}: {e}")

for scaler_path in SCALER_PATHS:
    resolved_path = scaler_path.resolve()
    if resolved_path.exists():
        try:
            print(f"Loading scaler from: {resolved_path}")
            with open(str(resolved_path), 'rb') as f:
                scaler = pickle.load(f)
            break
        except Exception as e:
            print(f"Failed to load scaler from {resolved_path}: {e}")

for vectorizer_path in VECTORIZER_PATHS:
    resolved_path = vectorizer_path.resolve()
    if resolved_path.exists():
        try:
            print(f"Loading vectorizer from: {resolved_path}")
            with open(str(resolved_path), 'rb') as f:
                vectorizer = pickle.load(f)
            print("Vectorizer loaded successfully")
            break
        except Exception as e:
            print(f"Failed to load vectorizer from {resolved_path}: {e}")

if not model_loaded:
    print("WARNING: Traditional model file not found! Using fallback scoring.")
    print("Please ensure model.keras is in ai-models/writing-scorer/")

# ==================== BERT MODEL WITH QUESTION AWARENESS (from ml_assess.py) ====================
bert_assessor = None
bert_model_loaded = False

# Only try BERT model if no active model loaded
if not active_model:
    try:
        # Import BERT model assessor with question awareness
        from ml_assess import QuestionAssessor, AttentionLayer
        
        # Try to load BERT model with question awareness (new model)
        bert_model_dir = PROJECT_ROOT / 'ai-models' / 'writing-scorer' / 'bert_question_model'
        if bert_model_dir.exists() and (bert_model_dir / 'model.keras').exists():
            try:
                print(f"\nLoading BERT model with question awareness from: {bert_model_dir}")
                bert_assessor = QuestionAssessor(max_length=512, use_question=True)
                bert_assessor.load_model(str(bert_model_dir))
                bert_model_loaded = True
                if not active_model_type:
                    active_model_type = 'bert_question_aware'
                print("[OK] BERT model with question awareness loaded successfully!")
            except Exception as e:
                print(f"[WARNING] Failed to load BERT question-aware model: {e}")
        
        # Fallback to legacy model directory if new model not found
        if not bert_model_loaded:
            bert_model_dir_legacy = PROJECT_ROOT / 'ai-models' / 'writing-scorer' / 'bert_ielts_model'
            if bert_model_dir_legacy.exists() and (bert_model_dir_legacy / 'model.keras').exists():
                try:
                    print(f"\nLoading legacy BERT model from: {bert_model_dir_legacy}")
                    # Try with question awareness disabled for legacy models
                    bert_assessor = QuestionAssessor(max_length=512, use_question=False)
                    bert_assessor.load_model(str(bert_model_dir_legacy))
                    bert_model_loaded = True
                    if not active_model_type:
                        active_model_type = 'bert_legacy'
                    print("[OK] Legacy BERT model loaded successfully!")
                except Exception as e:
                    print(f"[WARNING] Failed to load legacy BERT model: {e}")
    except ImportError as e:
        print(f"[WARNING] ml_assess module not available: {e}")
    except Exception as e:
        print(f"[ERROR] Error initializing BERT model: {e}")
        import traceback
        traceback.print_exc()


def extract_features_with_vectorizer(text: str) -> np.ndarray:
    """Extract features using vectorizer if available"""
    if vectorizer is not None:
        try:
            # Use vectorizer to transform text
            features = vectorizer.transform([text]).toarray()
            return features
        except Exception as e:
            print(f"Vectorizer failed: {e}, falling back to manual features")
            return extract_features_manual(text)
    else:
        return extract_features_manual(text)


def extract_features_manual(text: str) -> np.ndarray:
    """Extract features manually (original method)"""
    
    words = text.split()
    sentences = re.split(r'[.!?]+', text)
    sentences = [s.strip() for s in sentences if s.strip()]
    paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
    
    # Basic text statistics
    word_count = len(words)
    char_count = len(text)
    char_count_no_spaces = len(text.replace(' ', ''))
    sentence_count = len(sentences)
    paragraph_count = len(paragraphs)
    
    # Average lengths
    avg_word_length = char_count / word_count if word_count > 0 else 0
    avg_sentence_length = word_count / sentence_count if sentence_count > 0 else 0
    avg_sentence_chars = char_count / sentence_count if sentence_count > 0 else 0
    avg_paragraph_length = word_count / paragraph_count if paragraph_count > 0 else 0
    
    # Vocabulary diversity
    unique_words = len(set(text.lower().split()))
    lexical_diversity = unique_words / word_count if word_count > 0 else 0
    
    # Punctuation and capitalization
    punctuation_count = sum(1 for c in text if c in '.,!?;:')
    capital_letters = sum(1 for c in text if c.isupper())
    period_count = text.count('.')
    comma_count = text.count(',')
    question_count = text.count('?')
    exclamation_count = text.count('!')
    semicolon_count = text.count(';')
    colon_count = text.count(':')
    
    # Word characteristics
    complex_words = sum(1 for word in words if len(word) > 6)
    very_long_words = sum(1 for word in words if len(word) > 8)
    short_words = sum(1 for word in words if len(word) <= 3)
    medium_words = sum(1 for word in words if 4 <= len(word) <= 6)
    
    # Sentence complexity
    conjunctions = len(re.findall(r'\b(however|moreover|therefore|furthermore|nevertheless|although|because|while|whereas)\b', text.lower()))
    transition_words = len(re.findall(r'\b(first|second|third|finally|next|then|after|before|during|meanwhile)\b', text.lower()))
    linking_words = len(re.findall(r'\b(and|but|or|so|yet|nor|for)\b', text.lower()))
    
    # Readability features
    syllables = sum(max(1, len(re.findall(r'[aeiouAEIOU]+', word))) for word in words)
    avg_syllables_per_word = syllables / word_count if word_count > 0 else 0
    
    # Text structure
    sentence_variation = np.std([len(s.split()) for s in sentences]) if sentences else 0
    longest_sentence = max([len(s.split()) for s in sentences]) if sentences else 0
    shortest_sentence = min([len(s.split()) for s in sentences]) if sentences else 0
    
    # Character features
    digit_count = sum(1 for c in text if c.isdigit())
    space_count = text.count(' ')
    newline_count = text.count('\n')
    tab_count = text.count('\t')
    
    # Advanced features
    uppercase_ratio = capital_letters / char_count if char_count > 0 else 0
    punctuation_ratio = punctuation_count / word_count if word_count > 0 else 0
    complex_word_ratio = complex_words / word_count if word_count > 0 else 0
    
    # Start with basic 11 features
    features = [
        word_count,              # 0
        char_count,              # 1
        sentence_count,          # 2
        avg_word_length,         # 3
        avg_sentence_length,     # 4
        lexical_diversity,       # 5
        punctuation_count,       # 6
        capital_letters,         # 7
        paragraph_count,         # 8
        complex_words,           # 9
        conjunctions,            # 10
        # Add more features to reach 67
        char_count_no_spaces,    # 11
        avg_sentence_chars,      # 12
        avg_paragraph_length,    # 13
        period_count,            # 14
        comma_count,             # 15
        question_count,          # 16
        exclamation_count,       # 17
        semicolon_count,         # 18
        colon_count,             # 19
        very_long_words,         # 20
        short_words,             # 21
        medium_words,            # 22
        transition_words,        # 23
        linking_words,           # 24
        syllables,               # 25
        avg_syllables_per_word,  # 26
        sentence_variation,      # 27
        longest_sentence,        # 28
        shortest_sentence,       # 29
        digit_count,             # 30
        space_count,             # 31
        newline_count,           # 32
        tab_count,               # 33
        uppercase_ratio,         # 34
        punctuation_ratio,       # 35
        complex_word_ratio,      # 36
    ]
    
    # Pad to 67 features if needed
    while len(features) < 67:
        features.append(0.0)
    
    # Take only first 67 features
    features = features[:67]
    
    return np.array(features).reshape(1, -1)


def normalize_score_by_level(base_score: float, task_level: str) -> float:
    """
    Normalize score based on CEFR task level to ensure fair scoring.
    Lower levels (A1-A2) should be more lenient, higher levels (C1-C2) should be stricter.
    This ensures that a B2-level essay gets appropriate score for B2 task, not IELTS standard.
    IMPORTANT: Higher levels are MUCH STRICTER - simple A2 text submitted for B1/B2/C1 should get lower scores.
    """
    task_level_upper = task_level.upper() if task_level else 'B2'
    
    # CEFR-appropriate scoring ranges for each level
    # Lower levels: More lenient (higher base scores for same quality)
    # Higher levels: MUCH STRICTER (lower base scores for same quality)
    level_expectations = {
        'A1': {'min': 5.0, 'good': 7.0, 'excellent': 8.5},  # Very lenient
        'A2': {'min': 5.5, 'good': 7.5, 'excellent': 9.0},  # Lenient
        'B1': {'min': 6.0, 'good': 7.5, 'excellent': 9.0},  # Moderate - STRICTER than A2
        'B2': {'min': 6.5, 'good': 7.5, 'excellent': 9.0},  # Standard (IELTS-like) - STRICTER than B1
        'C1': {'min': 7.0, 'good': 8.0, 'excellent': 9.5},  # Stricter - MUCH STRICTER than B2
        'C2': {'min': 7.5, 'good': 8.5, 'excellent': 9.5},  # Very strict - VERY STRICT
    }
    
    expectations = level_expectations.get(task_level_upper, level_expectations['B2'])
    
    # If base score is already high (excellent), keep it high for any level
    if base_score >= 8.5:
        return min(10.0, base_score)
    
    # For lower levels, be more lenient - boost scores
    # For higher levels, be MUCH STRICTER - reduce scores significantly
    if task_level_upper in ['A1', 'A2']:
        # Very lenient: Boost scores by 0.5-1.0 points
        if base_score >= expectations['good']:
            return min(10.0, base_score + 0.3)
        elif base_score >= expectations['min']:
            return min(10.0, base_score + 0.5)
        else:
            return min(10.0, base_score + 0.8)
    elif task_level_upper == 'B1':
        # STRICTER than A2: Reduce scores for simple text
        # If text is too simple (low base score), penalize more
        if base_score >= expectations['good']:
            return min(10.0, base_score - 0.2)  # Slight reduction
        elif base_score >= expectations['min']:
            return min(10.0, base_score - 0.5)  # Moderate reduction
        else:
            return min(10.0, base_score - 1.0)  # Significant reduction for poor quality
    elif task_level_upper == 'B2':
        # STRICTER than B1: Reduce scores more
        if base_score >= expectations['good']:
            return min(10.0, base_score - 0.3)  # Moderate reduction
        elif base_score >= expectations['min']:
            return min(10.0, base_score - 0.8)  # Significant reduction
        else:
            return min(10.0, base_score - 1.5)  # Large reduction for poor quality
    elif task_level_upper == 'C1':
        # MUCH STRICTER than B2: Reduce scores significantly
        if base_score >= expectations['good']:
            return min(10.0, base_score - 0.8)  # Significant reduction
        elif base_score >= expectations['min']:
            return min(10.0, base_score - 1.5)  # Large reduction
        else:
            return min(10.0, base_score - 2.5)  # Very large reduction for poor quality
    elif task_level_upper == 'C2':
        # VERY STRICT: Reduce scores very significantly
        if base_score >= expectations['good']:
            return min(10.0, base_score - 1.0)  # Large reduction
        elif base_score >= expectations['min']:
            return min(10.0, base_score - 2.0)  # Very large reduction
        else:
            return min(10.0, base_score - 3.0)  # Maximum reduction for poor quality
    
    return base_score


def score_to_scale_10(ielts_score: float, task_level: Optional[str] = None, task_type: Optional[str] = None) -> float:
    """Convert IELTS score (0-9) to 10-point scale, with CEFR-based normalization
    This ensures scoring is appropriate for the task level, not just IELTS standard
    For simple tasks (sentence/paragraph), applies additional boost"""
    # Linear conversion: 0-9 -> 0-10
    score_10 = round((ielts_score / 9.0) * 10.0, 1)
    
    # Check if this is a simple task that needs extra boost
    is_simple_task = task_type and ('sentence' in task_type.lower() or 'paragraph' in task_type.lower())
    task_level_upper = task_level.upper() if task_level else 'B2'
    is_lower_level = task_level_upper in ['A1', 'A2']
    
    # For simple tasks at lower levels, model severely underestimates quality
    # Model is trained on IELTS essays, so simple tasks get unfairly low scores
    if is_simple_task and is_lower_level:
        # Significant boost: +2.0 points (model thinks it's 5.8, but it's actually 7.8+)
        score_10 = min(10.0, score_10 + 2.0)
    elif is_simple_task:
        # Moderate boost for simple tasks
        score_10 = min(10.0, score_10 + 1.5)
    elif is_lower_level:
        # Small boost for lower level tasks
        score_10 = min(10.0, score_10 + 1.0)
    
    # Apply CEFR-based normalization if task level is provided
    # This adjusts the score to be appropriate for the task's CEFR level
    if task_level:
        score_10 = normalize_score_by_level(score_10, task_level.upper())
    
    return round(score_10, 1)


def score_to_cefr(score_10: float) -> Tuple[str, str]:
    """Convert 10-point scale score to CEFR level"""
    if score_10 >= 9.4:  # ~8.5 IELTS
        return 'C2', 'Proficient'
    elif score_10 >= 7.8:  # ~7.0 IELTS
        return 'C1', 'Advanced'
    elif score_10 >= 6.1:  # ~5.5 IELTS
        return 'B2', 'Upper Intermediate'
    elif score_10 >= 4.4:  # ~4.0 IELTS
        return 'B1', 'Intermediate'
    elif score_10 >= 3.3:  # ~3.0 IELTS
        return 'A2', 'Elementary'
    else:
        return 'A1', 'Beginner'


def parse_target_words(target_words_str: str) -> Tuple[int, int]:
    """Parse target words string (e.g., '50-80 words', '250-300 words') into min and max"""
    if not target_words_str:
        return 0, 9999  # No limit if not specified
    
    # Remove 'words' and extract numbers
    numbers = re.findall(r'\d+', target_words_str)
    
    if len(numbers) >= 2:
        return int(numbers[0]), int(numbers[1])
    elif len(numbers) == 1:
        # If only one number, use it as minimum with 20% buffer
        min_words = int(numbers[0])
        return min_words, int(min_words * 1.2)
    else:
        return 0, 9999


def get_task_requirements(task: Optional[Dict]) -> Dict:
    """Get task requirements based on task type and level"""
    if not task:
        # Default IELTS Task 2 requirements
        return {
            'min_words': 250,
            'max_words': 350,
            'min_paragraphs': 4,
            'recommended_paragraphs': 5,
            'task_type': 'essay',
        }
    
    task_type = task.get('type', '').lower()
    level = task.get('level', '').upper()
    target_words = task.get('targetWords', '')
    
    min_words, max_words = parse_target_words(target_words)
    
    # Adjust paragraph requirements based on task type
    if 'sentence' in task_type:
        # Sentence building tasks: 1-2 paragraphs are fine
        min_paragraphs = 1
        recommended_paragraphs = 2
    elif 'paragraph' in task_type:
        # Paragraph writing: 1-2 paragraphs
        min_paragraphs = 1
        recommended_paragraphs = 2
    elif 'email' in task_type:
        # Email: typically 3-4 paragraphs (intro, body, conclusion)
        min_paragraphs = 2
        recommended_paragraphs = 3
    else:
        # Essay tasks: 4-5 paragraphs (intro, 2-3 body, conclusion)
        min_paragraphs = 4
        recommended_paragraphs = 5
    
    return {
        'min_words': min_words,
        'max_words': max_words,
        'min_paragraphs': min_paragraphs,
        'recommended_paragraphs': recommended_paragraphs,
        'task_type': task_type,
        'level': level,
    }


# Cache for dictionary API results (to avoid repeated API calls)
_word_cache = {}
_cache_hits = 0
_cache_misses = 0

def check_word_in_dictionary(word: str, timeout: float = 0.8) -> Optional[bool]:
    """
    Check if a word is a valid English word using Free Dictionary API
    Returns True if word is valid, False if invalid, None if API unavailable
    Uses caching to avoid repeated API calls
    """
    global _word_cache, _cache_hits, _cache_misses
    
    # Clean word
    clean_word = re.sub(r'[^\w]', '', word.lower())
    if not clean_word or len(clean_word) < 2:
        return False
    
    # Check cache first
    if clean_word in _word_cache:
        _cache_hits += 1
        return _word_cache[clean_word]
    
    # Check if word contains numbers (definitely not valid)
    if re.search(r'\d', clean_word):
        _word_cache[clean_word] = False
        return False
    
    # Call API
    try:
        url = f"https://api.dictionaryapi.dev/api/v2/entries/en/{clean_word}"
        response = requests.get(url, timeout=timeout)
        
        if response.status_code == 200:
            # Word found in dictionary - valid
            _word_cache[clean_word] = True
            _cache_misses += 1
            return True
        else:
            # Word not found - invalid
            _word_cache[clean_word] = False
            _cache_misses += 1
            return False
    except (requests.exceptions.RequestException, requests.exceptions.Timeout, Exception):
        # API unavailable or timeout - return None to indicate we should use fallback
        _cache_misses += 1
        return None


def detect_repeated_chars(word: str) -> str:
    """Compress repeated characters: cooool -> cool"""
    if len(word) < 3:
        return word
    # Compress 3+ repeated characters to 2
    compressed = re.sub(r'(.)\1{2,}', r'\1\1', word)
    return compressed


def check_language_confidence(text: str) -> Tuple[bool, float]:
    """
    Quick language detection based on English patterns
    Returns: (is_english, confidence)
    Simple heuristic: check for common English words and patterns
    """
    if not text or len(text.strip()) < 10:
        return False, 0.0
    
    text_lower = text.lower()
    words = text_lower.split()
    
    if len(words) < 3:
        return False, 0.0
    
    # Common English words (most frequent 100)
    common_english = {
        'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with',
        'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
        'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if',
        'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him',
        'know', 'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than',
        'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two',
        'how', 'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give',
        'day', 'most', 'us', 'is', 'was', 'are', 'were', 'been', 'being', 'have', 'has', 'had'
    }
    
    # Count common English words
    english_word_count = sum(1 for word in words if re.sub(r'[^\w]', '', word) in common_english)
    english_ratio = english_word_count / len(words) if len(words) > 0 else 0.0
    
    # Check for English-like patterns (vowels, consonants)
    total_chars = len(re.sub(r'[^\w]', '', text_lower))
    vowels = len(re.findall(r'[aeiou]', text_lower))
    vowel_ratio = vowels / total_chars if total_chars > 0 else 0.0
    
    # English typically has 30-40% vowels
    is_vowel_ratio_ok = 0.25 <= vowel_ratio <= 0.50
    
    # Calculate confidence
    confidence = (english_ratio * 0.6 + (1.0 if is_vowel_ratio_ok else 0.3) * 0.4)
    
    # Consider English if confidence >= 0.5
    is_english = confidence >= 0.5
    
    return is_english, confidence


def calculate_dictionary_coverage(words: List[str], task_level: Optional[str] = None) -> Tuple[float, int, int]:
    """
    Calculate dictionary coverage: validWords / totalWords
    Returns: (coverage_ratio, valid_count, total_count)
    """
    if not words:
        return 0.0, 0, 0
    
    valid_count = 0
    total_count = len(words)
    
    # Check common words first (fast)
    common_english_words = {
        'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with',
        'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
        'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if',
        'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him',
        'know', 'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than',
        'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two',
        'how', 'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give',
        'day', 'most', 'us', 'is', 'was', 'are', 'were', 'been', 'being', 'have', 'has', 'had', 'having',
        'do', 'does', 'did', 'doing', 'get', 'got', 'getting', 'go', 'goes', 'went', 'going', 'come', 'came',
        'coming', 'make', 'made', 'making', 'take', 'took', 'taking', 'see', 'saw', 'seeing', 'know', 'knew',
        'knowing', 'think', 'thought', 'thinking', 'say', 'said', 'saying', 'tell', 'told', 'telling', 'give',
        'gave', 'giving', 'find', 'found', 'finding', 'ask', 'asked', 'asking', 'try', 'tried', 'trying', 'need',
        'needed', 'needing', 'want', 'wanted', 'wanting', 'like', 'liked', 'liking', 'help', 'helped', 'helping',
        'wake', 'wakes', 'waking', 'woke', 'get', 'gets', 'getting', 'got', 'brush', 'brushes', 'brushing',
        'brushed', 'wash', 'washes', 'washing', 'washed', 'have', 'has', 'having', 'had', 'breakfast', 'lunch',
        'dinner', 'morning', 'afternoon', 'evening', 'night', 'every', 'always', 'usually', 'sometimes', 'often',
        'never', 'at', 'in', 'on', 'after', 'before', 'around', 'then', 'next', 'first', 'second', 'finally'
    }
    
    # Sample words to check with API (limit to 15 for speed)
    words_to_check = []
    for word in words:
        clean_word = re.sub(r'[^\w]', '', word.lower())
        if not clean_word or len(clean_word) < 2:
            continue
        
        if clean_word in common_english_words:
            valid_count += 1
        else:
            words_to_check.append(clean_word)
    
    # Check with API (sample if too many)
    max_api_checks = 15
    words_to_check_api = words_to_check[:max_api_checks] if len(words_to_check) > max_api_checks else words_to_check
    
    for clean_word in words_to_check_api:
        api_result = check_word_in_dictionary(clean_word, timeout=0.4)
        if api_result is True:
            valid_count += 1
        elif api_result is None:
            # API unavailable - use pattern matching (strict)
            if len(clean_word) >= 2 and re.search(r'[aeiou]', clean_word):
                vowels = len(re.findall(r'[aeiou]', clean_word))
                consonants = len(re.findall(r'[bcdfghjklmnpqrstvwxyz]', clean_word))
                vowel_ratio = vowels / len(clean_word) if len(clean_word) > 0 else 0
                has_long_cluster = bool(re.search(r'[bcdfghjklmnpqrstvwxyz]{4,}', clean_word)) or bool(re.search(r'[aeiou]{4,}', clean_word))
                
                if vowels > 0 and consonants > 0 and 0.25 <= vowel_ratio <= 0.50 and len(clean_word) <= 12 and not has_long_cluster:
                    valid_count += 1
    
    # For remaining words, use pattern matching
    for clean_word in words_to_check[max_api_checks:]:
        if len(clean_word) >= 2 and re.search(r'[aeiou]', clean_word):
            vowels = len(re.findall(r'[aeiou]', clean_word))
            consonants = len(re.findall(r'[bcdfghjklmnpqrstvwxyz]', clean_word))
            vowel_ratio = vowels / len(clean_word) if len(clean_word) > 0 else 0
            has_long_cluster = bool(re.search(r'[bcdfghjklmnpqrstvwxyz]{4,}', clean_word)) or bool(re.search(r'[aeiou]{4,}', clean_word))
            
            if vowels > 0 and consonants > 0 and 0.25 <= vowel_ratio <= 0.50 and len(clean_word) <= 12 and not has_long_cluster:
                valid_count += 1
    
    coverage = valid_count / total_count if total_count > 0 else 0.0
    
    # Adjust threshold based on task level
    if task_level:
        level_upper = task_level.upper()
        if level_upper in ['A1', 'A2']:
            # More lenient for beginners
            min_coverage = 0.60
        else:
            # B1-C2: stricter
            min_coverage = 0.75
    else:
        min_coverage = 0.70
    
    return coverage, valid_count, total_count


def detect_gibberish_heuristics(text: str) -> Tuple[bool, List[str]]:
    """
    Detect gibberish using heuristics
    Returns: (is_gibberish, reasons)
    """
    reasons = []
    is_gibberish = False
    
    if not text or len(text.strip()) < 10:
        return True, ["Text too short"]
    
    text_lower = text.lower()
    words = text_lower.split()
    
    if len(words) < 3:
        return True, ["Too few words"]
    
    # 1. Check vowel ratio
    total_chars = len(re.sub(r'[^\w]', '', text_lower))
    vowels = len(re.findall(r'[aeiou]', text_lower))
    vowel_ratio = vowels / total_chars if total_chars > 0 else 0.0
    
    if vowel_ratio < 0.25:
        is_gibberish = True
        reasons.append(f"Vowel ratio too low ({vowel_ratio:.2%})")
    elif vowel_ratio > 0.60:
        is_gibberish = True
        reasons.append(f"Vowel ratio too high ({vowel_ratio:.2%})")
    
    # 2. Check for unusual bigrams/trigrams
    text_clean = re.sub(r'[^\w\s]', '', text_lower)
    # Common invalid bigrams in English
    invalid_bigrams = ['xz', 'qg', 'hjg', 'jq', 'zx', 'qx', 'zj', 'qj']
    invalid_count = sum(1 for bigram in invalid_bigrams if bigram in text_clean)
    
    if invalid_count > 2:
        is_gibberish = True
        reasons.append(f"Too many invalid bigrams ({invalid_count})")
    
    # 3. Check for repeated character runs (> 3)
    repeated_char_pattern = re.findall(r'(.)\1{3,}', text_lower)
    if len(repeated_char_pattern) > 1:
        is_gibberish = True
        reasons.append(f"Too many repeated character runs ({len(repeated_char_pattern)})")
    
    # 4. Check average word length
    avg_word_length = sum(len(re.sub(r'[^\w]', '', word)) for word in words) / len(words) if words else 0
    if avg_word_length < 3.0:
        is_gibberish = True
        reasons.append(f"Average word length too short ({avg_word_length:.1f})")
    
    return is_gibberish, reasons


def validate_text_gate(text: str, task_level: Optional[str] = None) -> Tuple[bool, Optional[str]]:
    """
    Validity Gate: Check if text is valid English before scoring
    Returns: (is_valid, error_message)
    If not valid, returns False with error message
    """
    if not text or len(text.strip()) < 10:
        return False, "Your text is too short. Please write at least 10 characters."
    
    # 1. Language ID check
    is_english, lang_confidence = check_language_confidence(text)
    if not is_english or lang_confidence < 0.5:
        return False, "Your text doesn't look like valid English. Please write in English."
    
    # 2. Tokenization & cleaning
    words_raw = re.findall(r'\b[a-zA-Z\']+\b', text.lower())
    words_cleaned = [detect_repeated_chars(word) for word in words_raw]
    
    if len(words_cleaned) < 3:
        return False, "Your text doesn't contain enough words. Please write at least 3 words."
    
    # 3. Dictionary Coverage check
    coverage, valid_count, total_count = calculate_dictionary_coverage(words_cleaned, task_level)
    
    # Adjust threshold based on level
    if task_level:
        level_upper = task_level.upper()
        if level_upper in ['A1', 'A2']:
            min_coverage = 0.60
        else:
            min_coverage = 0.75
    else:
        min_coverage = 0.70
    
    if coverage < min_coverage:
        return False, f"Your text contains too many invalid words ({coverage:.0%} valid). Please write meaningful English sentences."
    
    # 4. Gibberish Heuristics check
    is_gibberish, gibberish_reasons = detect_gibberish_heuristics(text)
    if is_gibberish:
        return False, f"Your text doesn't look like valid English. {', '.join(gibberish_reasons)}"
    
    # 5. Combined decision: must pass at least 2 of 3 major checks
    checks_passed = 0
    if is_english and lang_confidence >= 0.5:
        checks_passed += 1
    if coverage >= min_coverage:
        checks_passed += 1
    if not is_gibberish:
        checks_passed += 1
    
    if checks_passed < 2:
        return False, "Your text doesn't look like valid English. Please revise and try again."
    
    return True, None


def detect_meaningless_text(text: str) -> Tuple[bool, float, bool]:
    """
    Detect if text is meaningless/random gibberish
    Returns: (is_meaningless, penalty_multiplier, is_random_words)
    - is_meaningless: True if text is not meaningful English
    - penalty_multiplier: 0.0-1.0, where 0.0 = completely meaningless, 1.0 = meaningful
    - is_random_words: True if text is completely random (not English at all) - should get 0 score
    """
    # First check with validity gate
    is_valid, error_msg = validate_text_gate(text)
    if not is_valid:
        return True, 0.0, True  # Invalid text = random words
    
    if not text or len(text.strip()) < 10:
        return True, 0.0, True  # Random words - give 0
    
    words = text.lower().split()
    if len(words) < 3:
        return True, 0.0, True  # Random words - give 0
    
    # Quick check: if text has too many numbers or unusual patterns, likely random
    # Count numbers and unusual characters
    number_count = len(re.findall(r'\d', text))
    total_chars_quick = len(re.sub(r'\s', '', text))
    number_ratio = number_count / total_chars_quick if total_chars_quick > 0 else 0
    
    # If more than 5% of characters are numbers, likely random typing
    if number_ratio > 0.05:
        return True, 0.0, True  # Random words - give 0
    
    # Common English words (most frequent 1000 words)
    common_english_words = {
        'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with',
        'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
        'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if',
        'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him',
        'know', 'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than',
        'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two',
        'how', 'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give',
        'day', 'most', 'us', 'is', 'was', 'are', 'were', 'been', 'being', 'have', 'has', 'had', 'having',
        'do', 'does', 'did', 'doing', 'get', 'got', 'getting', 'go', 'goes', 'went', 'going', 'come', 'came',
        'coming', 'make', 'made', 'making', 'take', 'took', 'taking', 'see', 'saw', 'seeing', 'know', 'knew',
        'knowing', 'think', 'thought', 'thinking', 'say', 'said', 'saying', 'tell', 'told', 'telling', 'give',
        'gave', 'giving', 'find', 'found', 'finding', 'ask', 'asked', 'asking', 'try', 'tried', 'trying', 'need',
        'needed', 'needing', 'want', 'wanted', 'wanting', 'like', 'liked', 'liking', 'help', 'helped', 'helping',
        'wake', 'wakes', 'waking', 'woke', 'get', 'gets', 'getting', 'got', 'brush', 'brushes', 'brushing',
        'brushed', 'wash', 'washes', 'washing', 'washed', 'have', 'has', 'having', 'had', 'breakfast', 'lunch',
        'dinner', 'morning', 'afternoon', 'evening', 'night', 'every', 'always', 'usually', 'sometimes', 'often',
        'never', 'at', 'in', 'on', 'after', 'before', 'around', 'then', 'next', 'first', 'second', 'finally'
    }
    
    # Check how many words are valid English words
    valid_words = 0
    total_chars = 0
    valid_chars = 0
    words_with_numbers = 0
    api_available = True
    words_to_check = []
    
    # First pass: collect words to check and do basic filtering
    for word in words:
        # Remove punctuation
        clean_word = re.sub(r'[^\w]', '', word)
        if not clean_word:
            continue
        
        total_chars += len(clean_word)
        
        # Check for numbers in word (indicates gibberish like "goiw08i" or "hw89u")
        if re.search(r'\d', clean_word):
            # Contains numbers - definitely gibberish, count it as invalid
            words_with_numbers += 1
            continue
        
        # Check if it's a common English word (fast check)
        if clean_word in common_english_words:
            valid_words += 1
            valid_chars += len(clean_word)
        else:
            # Need to check with API or pattern matching
            words_to_check.append((clean_word, word))
    
    # Quick check: if too many words look invalid based on pattern, likely random
    # Count words with obvious invalid patterns (no vowels, long clusters, etc.)
    obviously_invalid = 0
    for clean_word, original_word in words_to_check:
        # Check for obvious invalid patterns
        if len(clean_word) > 3:
            # No vowels at all
            if not re.search(r'[aeiou]', clean_word):
                obviously_invalid += 1
            # Too many consonants in a row (more than 3)
            elif re.search(r'[bcdfghjklmnpqrstvwxyz]{4,}', clean_word):
                obviously_invalid += 1
            # Too many vowels in a row (more than 3)
            elif re.search(r'[aeiou]{4,}', clean_word):
                obviously_invalid += 1
    
    # If more than 50% of words are obviously invalid, likely random
    if len(words_to_check) > 0 and obviously_invalid / len(words_to_check) > 0.5:
        # Very likely random words - skip API calls
        valid_word_ratio_quick = valid_words / len(words) if len(words) > 0 else 0.0
        if valid_word_ratio_quick < 0.30:
            return True, 0.0, True  # Random words - give 0
    
    # Second pass: check words with API (sample if too many)
    # Limit to 10 words to avoid too many API calls and speed up
    max_api_checks = 10
    words_to_check_api = words_to_check[:max_api_checks] if len(words_to_check) > max_api_checks else words_to_check
    
    # Check words with API (with early exit if too many invalid)
    api_valid_count = 0
    api_invalid_count = 0
    api_failed_count = 0
    
    for clean_word, original_word in words_to_check_api:
        # Early exit: if we've checked enough and found mostly invalid, likely random
        if api_invalid_count >= 5 and api_valid_count == 0:
            # Too many invalid words, likely random
            break
        
        # Check with API
        api_result = check_word_in_dictionary(clean_word, timeout=0.5)  # Reduced timeout
        
        if api_result is True:
            # Valid word from API
            api_valid_count += 1
            valid_words += 1
            valid_chars += len(clean_word)
        elif api_result is False:
            # Invalid word from API
            api_invalid_count += 1
        else:
            # API unavailable - use pattern matching fallback (but be strict)
            api_failed_count += 1
            api_available = False
            
            # Fallback to pattern matching (very strict)
            if len(clean_word) >= 2 and re.search(r'[aeiou]', clean_word):
                # Check if it has reasonable consonant-vowel pattern
                vowels = len(re.findall(r'[aeiou]', clean_word))
                consonants = len(re.findall(r'[bcdfghjklmnpqrstvwxyz]', clean_word))
                vowel_ratio = vowels / len(clean_word) if len(clean_word) > 0 else 0
                has_long_consonant_cluster = bool(re.search(r'[bcdfghjklmnpqrstvwxyz]{4,}', clean_word))
                has_long_vowel_cluster = bool(re.search(r'[aeiou]{4,}', clean_word))
                
                # Very strict: must have reasonable vowel ratio, no long clusters, and reasonable length
                if vowels > 0 and consonants > 0 and vowel_ratio >= 0.25 and len(clean_word) <= 12 and not has_long_consonant_cluster and not has_long_vowel_cluster:
                    # Might be a valid word (not in our list but looks English-like)
                    valid_words += 1
                    valid_chars += len(clean_word)
    
    # For words not checked by API (if we sampled), use pattern matching (very strict)
    if len(words_to_check) > max_api_checks:
        for clean_word, original_word in words_to_check[max_api_checks:]:
            # Use pattern matching for remaining words (very strict)
            if len(clean_word) >= 2 and re.search(r'[aeiou]', clean_word):
                vowels = len(re.findall(r'[aeiou]', clean_word))
                consonants = len(re.findall(r'[bcdfghjklmnpqrstvwxyz]', clean_word))
                vowel_ratio = vowels / len(clean_word) if len(clean_word) > 0 else 0
                has_long_consonant_cluster = bool(re.search(r'[bcdfghjklmnpqrstvwxyz]{4,}', clean_word))
                has_long_vowel_cluster = bool(re.search(r'[aeiou]{4,}', clean_word))
                
                # Very strict: must have reasonable vowel ratio, no long clusters, and reasonable length
                if vowels > 0 and consonants > 0 and vowel_ratio >= 0.25 and len(clean_word) <= 12 and not has_long_consonant_cluster and not has_long_vowel_cluster:
                    valid_words += 1
                    valid_chars += len(clean_word)
    
    # Early exit: if API found mostly invalid words, likely random
    if api_invalid_count >= 5 and api_valid_count == 0 and len(words_to_check_api) >= 5:
        # Too many invalid words from API, likely random
        valid_word_ratio_early = valid_words / len(words) if len(words) > 0 else 0.0
        if valid_word_ratio_early < 0.30:
            return True, 0.0, True  # Random words - give 0
    
    if len(words) == 0:
        return True, 0.0, True  # Random words - give 0
    
    # Calculate ratios
    # Count words with numbers as invalid words
    total_valid_words = valid_words
    total_invalid_words = len(words) - valid_words  # Includes words with numbers and invalid patterns
    valid_word_ratio = valid_words / len(words) if len(words) > 0 else 0.0
    valid_char_ratio = valid_chars / total_chars if total_chars > 0 else 0.0
    number_word_ratio = words_with_numbers / len(words) if len(words) > 0 else 0.0
    
    # Check for patterns that indicate gibberish
    # 1. Very low valid word ratio (< 20%)
    # 2. Very low valid char ratio (< 30%)
    # 3. Many words with unusual patterns (all consonants, no vowels, etc.)
    # 4. Many words with numbers (indicates random typing)
    
    unusual_words = 0
    for word in words:
        clean_word = re.sub(r'[^\w]', '', word)
        if not clean_word:
            continue
        # Check for unusual patterns
        if len(clean_word) > 3:
            # No vowels at all
            if not re.search(r'[aeiou]', clean_word):
                unusual_words += 1
            # Too many consonants in a row (more than 3)
            elif re.search(r'[bcdfghjklmnpqrstvwxyz]{4,}', clean_word):
                unusual_words += 1
            # Too many vowels in a row (more than 3)
            elif re.search(r'[aeiou]{4,}', clean_word):
                unusual_words += 1
    
    unusual_ratio = unusual_words / len(words) if len(words) > 0 else 0.0
    
    # Determine if text is meaningless or random words
    # If valid word ratio is very low AND valid char ratio is very low, it's likely gibberish
    is_meaningless = False
    is_random_words = False
    penalty_multiplier = 1.0
    
    # More strict thresholds - require higher percentage of valid words
    # If text has many words with numbers (> 5%), it's likely random typing
    # If less than 25% valid words OR (less than 30% valid words AND less than 30% valid chars)
    # -> This is RANDOM WORDS, not English at all -> Give 0 score
    if number_word_ratio > 0.05 or valid_word_ratio < 0.20 or (valid_word_ratio < 0.25 and valid_char_ratio < 0.25):
        # Very likely random words - NOT English at all
        is_meaningless = True
        is_random_words = True  # This is random words, not just bad English
        penalty_multiplier = 0.0  # Completely meaningless - give 0
    elif valid_word_ratio < 0.25 or (valid_word_ratio < 0.30 and valid_char_ratio < 0.30) or (number_word_ratio > 0.03 and valid_word_ratio < 0.45):
        # Very likely random words - NOT English at all
        is_meaningless = True
        is_random_words = True  # This is random words, not just bad English
        penalty_multiplier = 0.0  # Completely meaningless - give 0
    elif valid_word_ratio < 0.35 or (valid_word_ratio < 0.45 and unusual_ratio > 0.5) or (number_word_ratio > 0.02 and valid_word_ratio < 0.55):
        # Likely gibberish - probably random words
        is_meaningless = True
        is_random_words = True  # Likely random words
        penalty_multiplier = 0.0  # Give 0 for random words
    elif valid_word_ratio < 0.50 or (valid_word_ratio < 0.60 and unusual_ratio > 0.6):
        # Probably gibberish - might be random words
        is_meaningless = True
        is_random_words = True  # Probably random words
        penalty_multiplier = 0.0  # Give 0 for random words
    elif valid_word_ratio < 0.65:
        # Might be gibberish, but could be bad English - reduce score significantly
        is_meaningless = True
        is_random_words = False  # Bad English, not random words
        penalty_multiplier = 0.3  # Bad English gets low score but not 0
    elif valid_word_ratio < 0.75:
        # Some gibberish, moderate penalty
        is_meaningless = True
        is_random_words = False  # Poor English
        penalty_multiplier = 0.5
    elif valid_word_ratio < 0.85:
        # Some questionable words, light penalty
        is_meaningless = False
        is_random_words = False
        penalty_multiplier = 0.7
    
    return is_meaningless, penalty_multiplier, is_random_words


def get_detailed_feedback(text: str, score_10: float, prompt: str = "", task: Optional[Dict] = None) -> Dict:
    """Generate detailed feedback based on 10-point scale score and task requirements
    Uses CEFR-based scoring instead of pure IELTS criteria
    For sentence/paragraph tasks, uses task-specific scoring (much more lenient)
    Detects and penalizes meaningless/random text"""
    
    word_count = len(text.split())
    sentence_count = len(re.split(r'[.!?]+', text))
    unique_words = len(set(text.lower().split()))
    paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
    paragraph_count = len(paragraphs)
    
    # Detect meaningless/random text
    is_meaningless, meaning_penalty_multiplier, is_random_words = detect_meaningless_text(text)
    
    # Apply meaning penalty to base score BEFORE any other adjustments
    if is_random_words:
        # If text is random words (not English at all), give 0 score
        score_10 = 0.0
    elif is_meaningless:
        # If text is bad English (but still English), apply penalty
        score_10 = score_10 * meaning_penalty_multiplier
    else:
        # Apply penalty multiplier to reduce score proportionally
        score_10 = score_10 * meaning_penalty_multiplier
    
    # Get task requirements
    task_req = get_task_requirements(task)
    min_words = task_req['min_words']
    max_words = task_req['max_words']
    min_paragraphs = task_req['min_paragraphs']
    recommended_paragraphs = task_req['recommended_paragraphs']
    task_level = task_req.get('level', 'B2')
    task_type = task_req.get('task_type', 'essay')
    
    # Check if this is a simple task (sentence/paragraph) that needs special handling
    is_simple_task = 'sentence' in task_type.lower() or 'paragraph' in task_type.lower()
    task_level_upper = task_level.upper() if task_level else 'B2'
    is_lower_level = task_level_upper in ['A1', 'A2']
    
    # ========== TOPIC GATE: Check topic relevance BEFORE scoring any criteria ==========
    topic_multiplier = 1.0
    topic_gate_passed = True
    topic_gate_message = None
    topic_result = None  # Initialize to avoid UnboundLocalError
    
    if not is_random_words and TASK_FULFILLMENT_CHECKER_AVAILABLE and prompt:
        try:
            topic_result = calculate_topic_score(text, prompt, task_level)
            topic_score = topic_result['topic_score']
            topic_multiplier = topic_result['topic_multiplier']
            topic_gate_passed = topic_result['is_on_topic']
            
            # Apply topic gate rules
            if topic_score < 0.55:
                # Reject: off-topic - don't score individual criteria
                topic_gate_passed = False
                topic_gate_message = "Your response does not address the prompt topic. Please revise to address the prompt directly."
                topic_multiplier = 0.0
            elif topic_score < 0.70:
                # Weak-topic: apply penalty multiplier to all criteria
                topic_gate_passed = False
                topic_gate_message = "Your response partially addresses the prompt topic. Try to connect your ideas more directly to the prompt."
                topic_multiplier = 0.7
            else:
                # On-topic: normal scoring
                topic_gate_passed = True
                topic_multiplier = 1.0
        except Exception as e:
            print(f"[Scoring] Error in topic gate: {e}")
            import traceback
            traceback.print_exc()
            # Continue with normal scoring if topic gate fails
            topic_multiplier = 1.0
            topic_gate_passed = True
    
    # ========== TASK RESPONSE SCORING (CEFR-based, task-specific) ==========
    # If text is random words (not English), give 0 score
    if is_random_words:
        task_response_score_10 = 0.0  # 0 score for random words
        task_response_feedback = [
            "⚠️ Your text appears to be random characters or not in English.",
            "Please write meaningful sentences in English that address the prompt.",
            "The prompt requires: " + (prompt[:100] if prompt else "a proper response")
        ]
        task_compliance_bonus = 0.0
        task_compliance_penalty = 0.0
    elif is_meaningless:
        # Bad English (but still English) - give low score but not 0
        task_response_score_10 = max(0.0, score_10 * 0.3)  # Very low score for bad English
        task_response_feedback = [
            "⚠️ Your text contains many words that are not proper English.",
            "Please write meaningful sentences in English that address the prompt.",
            "The prompt requires: " + (prompt[:100] if prompt else "a proper response")
        ]
        task_compliance_bonus = 0.0
        task_compliance_penalty = 0.0
    else:
        # For simple tasks (sentence/paragraph) at lower levels, start with higher base score
        # Model is trained on IELTS essays, so it underestimates simple tasks
        if is_simple_task and is_lower_level:
            # Boost base score significantly for simple tasks at A1-A2 level
            # These tasks are much easier than IELTS essays, so they deserve higher scores
            task_response_score_10 = min(10.0, score_10 + 1.5)  # Significant boost
        elif is_simple_task:
            # Simple tasks at higher levels also need boost
            task_response_score_10 = min(10.0, score_10 + 1.0)
        elif is_lower_level:
            # Lower level tasks need moderate boost
            task_response_score_10 = min(10.0, score_10 + 0.8)
        else:
            task_response_score_10 = score_10  # Start with base score from model
    
    # Initialize feedback arrays (will be set if not meaningless)
    if not is_meaningless and not is_random_words:
        task_response_feedback = []
        task_compliance_bonus = 0.0
        task_compliance_penalty = 0.0
    else:
        # Already set above for meaningless text or random words
        pass
    
    # Check task-specific requirements from prompt (sentence count, tense, etc.)
    # Skip this if text is meaningless or random words
    if not is_meaningless and not is_random_words and prompt:
        prompt_lower = prompt.lower()
        
        # Check for sentence count requirement (e.g., "5-7 sentences")
        sentence_count_match = re.search(r'(\d+)\s*[-–—]\s*(\d+)\s*sentences?', prompt_lower)
        if sentence_count_match:
            min_sentences_req = int(sentence_count_match.group(1))
            max_sentences_req = int(sentence_count_match.group(2))
            
            if min_sentences_req <= sentence_count <= max_sentences_req:
                task_response_feedback.append(f"Excellent! You wrote {sentence_count} sentences, perfectly within the required range ({min_sentences_req}-{max_sentences_req} sentences).")
                task_compliance_bonus += 0.8  # Significant bonus for meeting sentence count
            elif sentence_count < min_sentences_req:
                task_response_feedback.append(f"Try to write more sentences. Requirement: {min_sentences_req}-{max_sentences_req} sentences. You wrote {sentence_count} sentences.")
                task_compliance_penalty += 0.5  # Moderate penalty
            elif sentence_count > max_sentences_req:
                task_response_feedback.append(f"You wrote {sentence_count} sentences, slightly more than required ({min_sentences_req}-{max_sentences_req}). That's okay, but try to stay within the range.")
                # No penalty for slightly over
        
        # Check for tense requirement (e.g., "simple present tense")
        if 'simple present' in prompt_lower or 'present simple' in prompt_lower:
            # Check if text uses present simple (basic check)
            present_indicators = re.findall(r'\b(wake|wakes|get|gets|brush|brushes|wash|washes|have|has|go|goes|leave|leaves|help|helps|start|starts|check|checks)\b', text.lower())
            past_indicators = re.findall(r'\b(woke|got|brushed|washed|had|went|left|helped|started|checked|was|were)\b', text.lower())
            
            if len(present_indicators) > len(past_indicators) * 2:
                task_response_feedback.append("✓ Good use of simple present tense")
                task_compliance_bonus += 0.5
            elif len(past_indicators) > len(present_indicators):
                task_response_feedback.append("The prompt asks for simple present tense, but you used past tense in some places. Try to use present tense (e.g., 'I wake up' instead of 'I woke up').")
                task_compliance_penalty += 0.3
        
        # Check for time expressions requirement
        if 'time expressions' in prompt_lower or 'time expression' in prompt_lower:
            time_expressions = re.findall(r'\b(at\s+\d+|every\s+\w+|in\s+the\s+\w+|after\s+\w+|before\s+\w+|around\s+\d+|usually|always|sometimes|often|never|then|next|first|finally)\b', text.lower())
            if len(time_expressions) >= 3:
                task_response_feedback.append(f"✓ Excellent use of time expressions ({len(time_expressions)} found: {', '.join(time_expressions[:3])})")
                task_compliance_bonus += 0.5
            elif len(time_expressions) >= 2:
                task_response_feedback.append(f"✓ Good use of time expressions ({len(time_expressions)} found)")
                task_compliance_bonus += 0.3
            elif len(time_expressions) >= 1:
                task_response_feedback.append("You used some time expressions. Try to use more (e.g., 'at 6:00', 'every morning', 'after breakfast', 'then').")
                # No penalty, just suggestion
            else:
                task_response_feedback.append("The prompt asks for time expressions. Try adding phrases like 'at 6:00', 'every morning', 'after breakfast', 'then', 'usually'.")
                task_compliance_penalty += 0.2
    
    # Off-topic detection using keyword coverage and fulfillment checker
    # Skip if text is random words (must stay at 0.0)
    off_topic_penalty = 0.0
    if not is_random_words and TASK_FULFILLMENT_CHECKER_AVAILABLE and prompt:
        try:
            off_topic_result = analyze_off_topic_detection(text, prompt, task_level)
            
            # Only set topic_multiplier = 0.0 if VERY HIGH confidence (>= 0.9) AND very low keyword coverage (< 0.2)
            # OR if there's a contradiction (confidence >= 0.95) - contradictions are very reliable
            # This prevents false positives when Gemini is not available
            has_contradiction = off_topic_result.get('reasons') and any('contradiction' in reason.lower() or 'discusses' in reason.lower() for reason in off_topic_result['reasons'])
            is_very_off_topic = (
                off_topic_result['is_off_topic'] and 
                (
                    (off_topic_result['confidence'] >= 0.95) or  # Contradiction or very high confidence
                    (off_topic_result['confidence'] >= 0.9 and off_topic_result['keyword_coverage'] < 0.2)  # High confidence + very low coverage
                )
            )
            
            if is_very_off_topic:
                # If VERY off-topic (high confidence + very low keyword coverage), set ALL scores to 0.0
                task_response_score_10 = 0.0
                
                # Set topic_multiplier to 0.0 to ensure all criteria scores become 0.0
                topic_multiplier = 0.0
                topic_gate_passed = False
                topic_gate_message = "Your response does not address the prompt topic. Please revise to address the prompt directly."
                
                # Set flag to prevent any further adjustments
                off_topic_penalty = 999.0  # Large value to indicate off-topic (must stay at 0.0)
                
                # Clear previous feedback and set off-topic feedback
                task_response_feedback = []
                task_response_feedback.append(f"⚠️ Your response does not address the prompt topic.")
                if off_topic_result['reasons']:
                    task_response_feedback.extend(off_topic_result['reasons'][:2])
                
                # Reset bonuses and penalties (they won't be applied anyway)
                task_compliance_bonus = 0.0
                task_compliance_penalty = 0.0
                
                print(f"[Scoring] OFF-TOPIC DETECTED! Setting topic_multiplier = 0.0")
                print(f"[Scoring] Off-topic reasons: {off_topic_result['reasons']}")
                print(f"[Scoring] Keyword coverage: {off_topic_result['keyword_coverage']:.2%}")
                print(f"[Scoring] Confidence: {off_topic_result['confidence']:.2f}")
                print(f"[Scoring] Setting off_topic_penalty = 999.0 to prevent adjustments")
            elif off_topic_result['is_off_topic']:
                # If off-topic but not very certain, apply penalty instead of 0.0
                # This is more lenient when Gemini is not available
                off_topic_penalty = min(100, off_topic_result['confidence'] * 50)  # Penalty 0-50 based on confidence
                print(f"[Scoring] Off-topic detected but not certain (confidence: {off_topic_result['confidence']:.2f}, coverage: {off_topic_result['keyword_coverage']:.2%})")
                print(f"[Scoring] Applying penalty instead of 0.0: {off_topic_penalty:.1f}")
                print(f"[Scoring] Off-topic reasons: {off_topic_result['reasons']}")
                
                # Clear previous feedback and set off-topic feedback
                task_response_feedback = []
                task_response_feedback.append(f"⚠️ Your response does not address the prompt topic.")
                if off_topic_result['reasons']:
                    task_response_feedback.extend(off_topic_result['reasons'][:2])
                
                # If keyword coverage is very low (< 0.2), definitely off-topic
                if off_topic_result['keyword_coverage'] < 0.2:
                    task_response_feedback.append("Your response appears to be about a completely different topic than the prompt. Please address the prompt directly.")
                
                # Reset bonuses and penalties (they won't be applied anyway, but for clarity)
                task_compliance_bonus = 0.0
                task_compliance_penalty = 0.0
                
                # Set flag to skip further adjustments
                off_topic_penalty = 999.0  # Large value to indicate off-topic
        except Exception as e:
            print(f"[Scoring] Error in off-topic detection: {e}")
            import traceback
            traceback.print_exc()
    
    # Use semantic analysis for task response if available
    # Skip if text is random words (must stay at 0.0)
    # Skip if already detected as off-topic from contradiction detection
    semantic_analysis_success = False
    if not is_random_words and off_topic_penalty < 100 and TASK_RESPONSE_ANALYZER_AVAILABLE and prompt:
        try:
            # Get task type from task requirements
            task_type_from_req = task_req.get('task_type', 'essay')
            # Normalize task type
            if 'sentence' in task_type_from_req:
                task_type_normalized = 'sentence'
            elif 'paragraph' in task_type_from_req:
                task_type_normalized = 'paragraph'
            elif 'email' in task_type_from_req:
                task_type_normalized = 'email'
            elif 'essay' in task_type_from_req:
                task_type_normalized = 'essay'
            else:
                task_type_normalized = 'essay'  # Default
            
            task_analysis = analyze_task_response_semantic(
                essay=text,
                prompt=prompt,
                task_level=task_level,
                task_type=task_type_normalized,
                use_gemini=True
            )
            
            # Get semantic relevance scores
            relevance_score = task_analysis.get('relevance_score', 7.0)
            coverage_score = task_analysis.get('coverage_score', 7.0)
            
            # Combine relevance and coverage (weighted average)
            semantic_task_score = (relevance_score * 0.6 + coverage_score * 0.4)
            
            # Adjust base score based on semantic analysis
            # BUT: Skip if already detected as off-topic (off_topic_penalty >= 100 or topic_multiplier == 0.0)
            if off_topic_penalty >= 100 or topic_multiplier == 0.0:
                print(f"[Scoring] Skipping semantic analysis adjustments - already detected as off-topic")
                semantic_analysis_success = True  # Mark as success to prevent fallback
            else:
                # Trust semantic analysis more for task response (it understands context better)
                # For off-topic detection, be STRICT - if semantic says low relevance, trust it
                score_diff = semantic_task_score - task_response_score_10
                
                # If semantic analysis indicates off-topic (relevance < 5), set ALL scores to 0.0
                # Only set 0.0 if relevance is VERY low (< 3.0) - this is more lenient
                if relevance_score < 3.0:
                    # Very off-topic - set ALL scores to 0.0
                    task_response_score_10 = 0.0
                    
                    # Set topic_multiplier to 0.0 to ensure all criteria scores become 0.0
                    topic_multiplier = 0.0
                    topic_gate_passed = False
                    topic_gate_message = "Your response does not address the prompt topic. Please revise to address the prompt directly."
                    
                    task_response_feedback.append("⚠️ Your response does not address the prompt topic. Please write about the topic specified in the prompt.")
                    # Set flag to skip further adjustments
                    off_topic_penalty = 999.0  # Large value to indicate off-topic
                elif relevance_score < 5.0:
                    # Off-topic but not very certain - apply penalty instead of 0.0
                    off_topic_penalty = min(100, (5.0 - relevance_score) * 20)  # Penalty based on how low relevance is
                    task_response_feedback.append(f"⚠️ Your response may not fully address the prompt topic (relevance: {relevance_score:.1f}/10). Please ensure you address the prompt directly.")
                    print(f"[Scoring] Semantic analysis indicates low relevance ({relevance_score:.1f}/10), applying penalty: {off_topic_penalty:.1f}")
                elif abs(score_diff) > 1.5:
                    # Significant difference - trust semantic analysis more
                    # But if semantic is much lower, be cautious (might be false negative)
                    if semantic_task_score < task_response_score_10:
                        # Semantic says lower - use weighted average (don't penalize too much)
                        task_response_score_10 = semantic_task_score * 0.4 + task_response_score_10 * 0.6
                    else:
                        # Semantic says higher - trust it more
                        task_response_score_10 = semantic_task_score * 0.7 + task_response_score_10 * 0.3
                elif abs(score_diff) > 0.5 and off_topic_penalty < 100 and topic_multiplier > 0.0:
                    # Moderate difference - use balanced average
                    task_response_score_10 = semantic_task_score * 0.6 + task_response_score_10 * 0.4
                elif off_topic_penalty < 100 and topic_multiplier > 0.0:
                    # Similar scores - use weighted average favoring semantic
                    task_response_score_10 = semantic_task_score * 0.55 + task_response_score_10 * 0.45
            
            # Apply off-topic penalty if detected (only if not already set to 0.0)
            if off_topic_penalty > 0 and off_topic_penalty < 100:  # Only apply if not already set to 0.0
                task_response_score_10 = max(0.0, task_response_score_10 - off_topic_penalty * 0.5)  # Additional penalty
            
            # Add semantic analysis feedback
            task_response_feedback.extend(task_analysis.get('feedback', []))
            
            # Add strengths and weaknesses from semantic analysis (encouraging format)
            strengths = task_analysis.get('strengths', [])
            weaknesses = task_analysis.get('weaknesses', [])
            if strengths:
                # Add strengths as positive feedback
                for strength in strengths[:2]:
                    task_response_feedback.append(f"✓ {strength}")
            if weaknesses:
                # Add weaknesses as constructive suggestions (not harsh criticism)
                for weakness in weaknesses[:2]:
                    task_response_feedback.append(f"💡 {weakness}")
            
            # Mark semantic analysis as successful
            semantic_analysis_success = True
                
        except Exception as e:
            print(f"[Scoring] Error in semantic task response analysis: {e}")
            import traceback
            traceback.print_exc()
            semantic_analysis_success = False
    
    # Fallback to keyword matching if semantic analysis not available or failed
    # Skip if text is random words (must stay at 0.0)
    # Skip if already detected as off-topic from contradiction detection
    if not is_random_words and off_topic_penalty < 100 and not semantic_analysis_success and prompt:
        # Basic keyword matching (fallback)
        prompt_lower = prompt.lower()
        text_lower = text.lower()
        prompt_keywords = set([w for w in prompt_lower.split() if len(w) > 4])
        matching_keywords = sum(1 for kw in prompt_keywords if kw in text_lower)
        keyword_coverage = matching_keywords / len(prompt_keywords) if prompt_keywords else 0.5
        
        # More lenient keyword matching (reduce false positives)
        if keyword_coverage < 0.2:
            # Only mark as off-topic if very low overlap
            task_response_feedback.append("Try to connect your ideas more directly to the prompt topic.")
            task_response_score_10 = max(0, task_response_score_10 - 1.0)  # Reduced penalty
        elif keyword_coverage >= 0.4:
            # Be generous - if 40%+ overlap, consider it relevant
            task_response_feedback.append("Good relevance to the topic")
            task_compliance_bonus += 0.3
        elif keyword_coverage >= 0.2:
            # Low but not zero - give benefit of doubt
            task_response_feedback.append("Your response addresses the topic - try using more specific vocabulary from the prompt")
            # No penalty, just suggestion
    
    # Check structure and organization based on task type (CEFR-appropriate)
    # Skip if text is random words (must stay at 0.0)
    # For simple tasks, don't penalize paragraph structure heavily
    if not is_random_words and is_simple_task:
        # Sentence/paragraph tasks don't need strict paragraph structure
        if paragraph_count >= 1:
            task_response_feedback.append("Good structure for this task type")
            task_compliance_bonus += 0.2
        # No penalty for simple tasks
    elif not is_random_words:
        # Essay tasks need proper paragraph structure
        # Skip if text is random words (must stay at 0.0)
        if paragraph_count < min_paragraphs:
            task_response_feedback.append(f"Structure needs improvement. This {task_level} level task requires at least {min_paragraphs} paragraph(s).")
            task_compliance_penalty += 1.0
        elif paragraph_count >= recommended_paragraphs:
            task_response_feedback.append("Excellent paragraph structure!")
            task_compliance_bonus += 0.3
        elif paragraph_count >= min_paragraphs:
            task_response_feedback.append("Good paragraph structure")
            task_compliance_bonus += 0.1
    
    # Check word count based on task requirements (CEFR-appropriate penalties)
    # Skip if text is random words (must stay at 0.0)
    # For simple tasks, be more lenient with word count
    if not is_random_words and is_simple_task:
        # Simple tasks: focus on sentence count, not word count
        # Only check word count if it's extremely short or long
        if word_count < 20:
            task_response_feedback.append(f"Your response is quite short ({word_count} words). Try to write more to fully address the prompt.")
            task_compliance_penalty += 0.3  # Reduced penalty
        elif word_count > 200:
            task_response_feedback.append(f"Your response is quite long ({word_count} words). For this task type, try to be more concise.")
            # No penalty, just feedback
        else:
            # Word count is reasonable for simple tasks
            task_response_feedback.append(f"Good length for this task type ({word_count} words)")
            task_compliance_bonus += 0.2
    elif not is_random_words:
        # Essay tasks: strict word count requirements
        # Skip if text is random words (must stay at 0.0)
        if word_count < min_words * 0.8:
            task_response_feedback.append(f"Word count is too low. This task requires {min_words}-{max_words} words. You wrote {word_count} words.")
            task_compliance_penalty += 1.5
        elif word_count < min_words:
            task_response_feedback.append(f"Try to reach the minimum requirement of {min_words} words. Current: {word_count} words.")
            task_compliance_penalty += 0.5
        elif min_words <= word_count <= max_words:
            task_response_feedback.append(f"Excellent! You wrote {word_count} words, perfectly within the required range ({min_words}-{max_words} words).")
            task_compliance_bonus += 0.5
        elif word_count <= max_words * 1.1:
            task_response_feedback.append(f"Good length! You wrote {word_count} words. Target: {min_words}-{max_words} words.")
            task_compliance_bonus += 0.2
        elif word_count <= max_words * 1.2:
            task_response_feedback.append(f"Word count slightly exceeds the requirement. Consider being more concise. Current: {word_count} words.")
        else:
            task_response_feedback.append(f"Word count exceeds the requirement. Consider being more concise. Current: {word_count} words, Target: {min_words}-{max_words} words.")
            task_compliance_penalty += 0.3
    
    # Apply compliance adjustments
    # Skip adjustments if text is random words (must stay at 0.0)
    # Skip adjustments if already detected as off-topic (must stay at 0.0)
    # Also skip if topic_multiplier = 0.0 (off-topic detected)
    if not is_random_words and off_topic_penalty < 100 and topic_multiplier > 0.0:
        task_response_score_10 = task_response_score_10 + task_compliance_bonus - task_compliance_penalty
        task_response_score_10 = max(0.0, min(10.0, task_response_score_10))
    elif off_topic_penalty >= 100 or topic_multiplier == 0.0:
        # Off-topic must stay at 0.0, no adjustments allowed
        task_response_score_10 = 0.0
        print(f"[Scoring] Task response score locked at 0.0 (off_topic_penalty={off_topic_penalty}, topic_multiplier={topic_multiplier})")
    else:
        # Random words must stay at 0.0, no adjustments allowed
        task_response_score_10 = 0.0
    
    # Coherence and Cohesion - CEFR-appropriate expectations with evidence-bound scoring
    # If text is random words, give 0 score
    if is_random_words:
        coherence_score_10 = 0.0  # 0 score for random words
        coherence_feedback = ["⚠️ Your text does not form coherent sentences in English."]
        coherence_bonus = 0.0
        coherence_penalty = 0.0
    elif is_meaningless:
        # Bad English - give low score but not 0
        coherence_score_10 = max(0.0, score_10 * 0.3)  # Very low score for bad English
        coherence_feedback = ["⚠️ Your text does not form coherent sentences in English."]
        coherence_bonus = 0.0
        coherence_penalty = 0.0
    else:
        # Initialize coherence feedback arrays BEFORE evidence-bound scoring
        coherence_feedback = []
        coherence_bonus = 0.0
        coherence_penalty = 0.0
        
        # Use evidence-bound scoring if available
        if EVIDENCE_BOUND_SCORER_AVAILABLE and prompt:
            try:
                coherence_evidence = analyze_coherence_evidence_bound(text, prompt, task_level)
                # Convert raw score (0-100) to 10-point scale
                coherence_score_10 = coherence_evidence['coherence_score_raw'] / 10.0
                coherence_feedback.extend(coherence_evidence['feedback'])
            except Exception as e:
                print(f"[Scoring] Error in evidence-bound coherence scoring: {e}")
                # Fallback to base scoring
                if is_simple_task and is_lower_level:
                    coherence_score_10 = min(10.0, score_10 + 1.2)  # Significant boost
                elif is_simple_task:
                    coherence_score_10 = min(10.0, score_10 + 0.8)  # Moderate boost
                elif is_lower_level:
                    coherence_score_10 = min(10.0, score_10 + 0.6)  # Small boost
                else:
                    coherence_score_10 = score_10
        else:
            # Fallback to base scoring
            if is_simple_task and is_lower_level:
                coherence_score_10 = min(10.0, score_10 + 1.2)  # Significant boost
            elif is_simple_task:
                coherence_score_10 = min(10.0, score_10 + 0.8)  # Moderate boost
            elif is_lower_level:
                coherence_score_10 = min(10.0, score_10 + 0.6)  # Small boost
            else:
                coherence_score_10 = score_10
    
    # Coherence feedback arrays are already initialized above
    # (either in is_random_words/is_meaningless blocks, or in else block before evidence-bound scoring)
    
    # CEFR-appropriate expectations (more lenient for lower levels and simple tasks)
    # Initialize default values first
    min_sentences = 10  # Default value
    min_linking_words = 3  # Default value
    recommended_sentences = 14  # Default value
    excellent_sentences = 16  # Default value
    
    # Skip this if text is random words or bad English
    if is_random_words or is_meaningless:
        # Already handled above, skip further coherence checks
        pass
    elif is_simple_task:
        # Simple tasks: very lenient expectations
        if task_level in ['A1', 'A2']:
            min_sentences = 3  # Very lenient for sentence tasks
            min_linking_words = 0  # Not required for simple tasks
            recommended_sentences = 6
            excellent_sentences = 8
        else:
            min_sentences = 4
            min_linking_words = 1
            recommended_sentences = 7
            excellent_sentences = 10
    elif task_level in ['A1', 'A2']:
        min_sentences = 4  # Very lenient
        min_linking_words = 1
        recommended_sentences = 6
        excellent_sentences = 8
    elif task_level == 'B1':
        min_sentences = 6
        min_linking_words = 2
        recommended_sentences = 10
        excellent_sentences = 12
    elif task_level == 'B2':
        min_sentences = 10
        min_linking_words = 3
        recommended_sentences = 14
        excellent_sentences = 16
    else:  # C1, C2
        min_sentences = 12
        min_linking_words = 4
        recommended_sentences = 16
        excellent_sentences = 20
    
    # CEFR-appropriate sentence count checking
    # For simple tasks, be very lenient (they often have specific sentence count requirements)
    # Skip this if text is random words or bad English
    if is_random_words or is_meaningless:
        # Already handled above, skip sentence count checks
        pass
    elif is_simple_task:
        # Simple tasks: sentence count is usually specified in prompt, so be lenient
        if sentence_count >= min_sentences:
            coherence_feedback.append(f"✓ Good number of sentences ({sentence_count}) for this task")
            coherence_bonus += 0.3
        elif sentence_count >= min_sentences * 0.8:
            coherence_feedback.append(f"Acceptable number of sentences ({sentence_count}). Try to write a bit more if possible.")
            coherence_bonus += 0.1
        else:
            coherence_feedback.append(f"You wrote {sentence_count} sentences. Try to write a few more to fully address the prompt.")
            coherence_penalty += 0.3  # Reduced penalty
    else:
        # Essay tasks: standard sentence count checking
        if sentence_count < min_sentences * 0.7:
            coherence_feedback.append(f"Too few sentences. For {task_level} level, aim for at least {min_sentences} sentences.")
            coherence_penalty += 1.0
        elif sentence_count >= excellent_sentences:
            coherence_feedback.append("Excellent sentence variety and structure!")
            coherence_bonus += 0.3
        elif sentence_count >= recommended_sentences:
            coherence_feedback.append("Good sentence variety")
            coherence_bonus += 0.2
        elif sentence_count >= min_sentences:
            coherence_feedback.append(f"Acceptable sentence count. For {task_level} level, aim for {recommended_sentences} sentences for better variety.")
            coherence_bonus += 0.1
        else:
            coherence_feedback.append(f"Try to write more sentences. For {task_level} level, aim for at least {recommended_sentences} sentences.")
            coherence_penalty += 0.5
    
    # Check for linking words - CEFR-appropriate
    # For simple tasks, linking words are optional (especially for A1-A2)
    linking_words = len(re.findall(r'\b(however|moreover|therefore|furthermore|in addition|consequently|although|because|while|whereas|and|but|or|so|yet|then|after that|finally|first|second|also|furthermore|additionally|meanwhile|similarly|likewise|on the other hand|in contrast|nevertheless|nonetheless)\b', text.lower()))
    
    if is_simple_task:
        # Simple tasks: linking words are nice but not required
        if linking_words >= 2:
            coherence_feedback.append("Good use of connecting words")
            coherence_bonus += 0.2
        elif linking_words >= 1:
            coherence_feedback.append("Some use of connecting words - good!")
            coherence_bonus += 0.1
        # No penalty for simple tasks if no linking words
    else:
        # Essay tasks: linking words are expected
        if linking_words >= min_linking_words * 1.5:
            coherence_feedback.append("Excellent use of linking words and transitions!")
            coherence_bonus += 0.3
        elif linking_words >= min_linking_words:
            coherence_feedback.append("Good use of linking words")
            coherence_bonus += 0.2
        elif linking_words >= min_linking_words * 0.7:
            coherence_feedback.append(f"Consider using more linking words. For {task_level} level, aim for at least {min_linking_words} linking words.")
            coherence_penalty += 0.2
        else:
            coherence_feedback.append(f"Use more linking words to connect your ideas. For {task_level} level, aim for at least {min_linking_words} linking words.")
            coherence_penalty += 0.5
    
    # Apply coherence adjustments
    # Skip adjustments if text is random words (must stay at 0.0)
    if not is_random_words:
        coherence_score_10 = coherence_score_10 + coherence_bonus - coherence_penalty
        coherence_score_10 = max(0.0, min(10.0, coherence_score_10))
        
        # Apply topic multiplier (Topic Gate)
        print(f"[Scoring] Applying topic_multiplier {topic_multiplier} to coherence_score_10 (before: {coherence_score_10:.1f})")
        coherence_score_10 = coherence_score_10 * topic_multiplier
        coherence_score_10 = max(0.0, min(10.0, coherence_score_10))
        print(f"[Scoring] Coherence score after topic_multiplier: {coherence_score_10:.1f}")
    else:
        # Random words must stay at 0.0, no adjustments allowed
        coherence_score_10 = 0.0
    
    # Lexical Resource - CEFR-appropriate expectations with evidence-bound scoring
    # If text is random words, give 0 score
    if is_random_words:
        lexical_score_10 = 0.0  # 0 score for random words
        lexical_feedback = ["⚠️ Your text does not contain valid English words."]
        lexical_bonus = 0.0
        lexical_penalty = 0.0
    elif is_meaningless:
        # Bad English - give low score but not 0
        lexical_score_10 = max(0.0, score_10 * 0.3)  # Very low score for bad English
        lexical_feedback = ["⚠️ Your text contains many words that are not proper English."]
        lexical_bonus = 0.0
        lexical_penalty = 0.0
    else:
        # Initialize lexical feedback arrays BEFORE evidence-bound scoring
        lexical_feedback = []
        lexical_bonus = 0.0
        lexical_penalty = 0.0
        
        # Use evidence-bound scoring if available
        if EVIDENCE_BOUND_SCORER_AVAILABLE and prompt:
            try:
                lexical_evidence = analyze_lexical_evidence_bound(text, prompt, task_level)
                # Convert raw score (0-100) to 10-point scale
                lexical_score_10 = lexical_evidence['lexical_score_raw'] / 10.0
                lexical_feedback.extend(lexical_evidence['feedback'])
            except Exception as e:
                print(f"[Scoring] Error in evidence-bound lexical scoring: {e}")
                # Fallback to base scoring
                if is_simple_task and is_lower_level:
                    lexical_score_10 = min(10.0, score_10 + 1.0)  # Significant boost
                elif is_simple_task:
                    lexical_score_10 = min(10.0, score_10 + 0.6)  # Moderate boost
                elif is_lower_level:
                    lexical_score_10 = min(10.0, score_10 + 0.5)  # Small boost
                else:
                    lexical_score_10 = score_10
        else:
            # Fallback to base scoring
            if is_simple_task and is_lower_level:
                lexical_score_10 = min(10.0, score_10 + 1.0)  # Significant boost
            elif is_simple_task:
                lexical_score_10 = min(10.0, score_10 + 0.6)  # Moderate boost
            elif is_lower_level:
                lexical_score_10 = min(10.0, score_10 + 0.5)  # Small boost
            else:
                lexical_score_10 = score_10
    
    lexical_diversity = unique_words / word_count if word_count > 0 else 0
    
    # Lexical feedback arrays are already initialized above
    # (either in is_random_words/is_meaningless blocks, or in else block before evidence-bound scoring)
    
    # CEFR-appropriate lexical diversity expectations
    # Initialize default values first
    min_diversity = 0.30  # Default value
    good_diversity = 0.45  # Default value
    excellent_diversity = 0.55  # Default value
    
    # Skip this if text is random words or bad English
    # For simple tasks, vocabulary diversity is less important
    if is_random_words or is_meaningless:
        # Already handled above, skip further lexical checks
        pass
    elif is_simple_task:
        # Simple tasks: focus on accuracy, not diversity
        if lexical_diversity >= 0.25:
            lexical_feedback.append("Good vocabulary use for this task type")
            lexical_bonus += 0.3
        elif lexical_diversity >= 0.20:
            lexical_feedback.append("Acceptable vocabulary for this task")
            lexical_bonus += 0.1
        # No penalty for simple tasks - they use simple vocabulary by design
        min_diversity = 0.15  # Very lenient
        good_diversity = 0.25
        excellent_diversity = 0.35
    elif task_level in ['A1', 'A2']:
        min_diversity = 0.20  # Very lenient for beginners
        good_diversity = 0.30
        excellent_diversity = 0.40
    elif task_level == 'B1':
        min_diversity = 0.25
        good_diversity = 0.40
        excellent_diversity = 0.50
    elif task_level == 'B2':
        min_diversity = 0.30
        good_diversity = 0.45
        excellent_diversity = 0.55
    else:  # C1, C2
        min_diversity = 0.35
        good_diversity = 0.50
        excellent_diversity = 0.60
    
    # Skip lexical diversity checks if text is random words or bad English
    if is_random_words or is_meaningless:
        # Already handled above, skip lexical diversity checks
        pass
    else:
        if lexical_diversity >= excellent_diversity:
            lexical_feedback.append("Excellent vocabulary diversity!")
            lexical_bonus += 0.4
        elif lexical_diversity >= good_diversity:
            lexical_feedback.append("Good vocabulary diversity")
            lexical_bonus += 0.3
        elif lexical_diversity >= min_diversity:
            lexical_feedback.append(f"Vocabulary is acceptable for {task_level} level. Aim for {good_diversity:.0%} diversity for improvement.")
            lexical_bonus += 0.1
        elif lexical_diversity >= min_diversity * 0.8:
            lexical_feedback.append(f"Vocabulary could be more diverse. For {task_level} level, aim for {good_diversity:.0%} diversity.")
            lexical_penalty += 0.3
        else:
            lexical_feedback.append(f"Limited vocabulary range. For {task_level} level, aim for more varied words (target: {good_diversity:.0%} diversity).")
            lexical_penalty += 1.0
    
    # Check for academic/advanced vocabulary - CEFR-appropriate
    # Skip this if text is meaningless
    if not is_meaningless:
        if task_level in ['B2', 'C1', 'C2'] and word_count > 150:
            advanced_words = len(re.findall(r'\b(consequently|furthermore|moreover|nevertheless|therefore|demonstrate|illustrate|analyze|significant|essential|considerable|substantial|evident|notably|furthermore|additionally|subsequently|hence|thus|whereas|nevertheless|nonetheless|notwithstanding)\b', text.lower()))
            expected_advanced = 3 if task_level == 'B2' else (4 if task_level == 'C1' else 5)
            if advanced_words >= expected_advanced:
                lexical_feedback.append("Excellent use of advanced vocabulary!")
                lexical_bonus += 0.3
            elif advanced_words >= expected_advanced * 0.7:
                lexical_feedback.append("Good use of advanced vocabulary")
                lexical_bonus += 0.2
            else:
                lexical_feedback.append(f"For {task_level} level, consider using more advanced vocabulary (aim for {expected_advanced}+ advanced words).")
                lexical_penalty += 0.2
        elif task_level in ['A1', 'A2', 'B1']:
            # Lower levels: Don't penalize for lack of advanced vocabulary
            if word_count > 100:
                simple_but_varied = unique_words >= word_count * 0.3
                if simple_but_varied:
                    lexical_feedback.append("Good use of vocabulary appropriate for your level")
                    lexical_bonus += 0.1
    
    # Apply lexical adjustments
    # Skip adjustments if text is random words (must stay at 0.0)
    if not is_random_words:
        lexical_score_10 = lexical_score_10 + lexical_bonus - lexical_penalty
        lexical_score_10 = max(0.0, min(10.0, lexical_score_10))
        
        # Apply topic multiplier (Topic Gate)
        print(f"[Scoring] Applying topic_multiplier {topic_multiplier} to lexical_score_10 (before: {lexical_score_10:.1f})")
        lexical_score_10 = lexical_score_10 * topic_multiplier
        lexical_score_10 = max(0.0, min(10.0, lexical_score_10))
        print(f"[Scoring] Lexical score after topic_multiplier: {lexical_score_10:.1f}")
    else:
        # Random words must stay at 0.0, no adjustments allowed
        lexical_score_10 = 0.0
    
    # Grammatical Range and Accuracy - CEFR-appropriate expectations with evidence-bound scoring
    # If text is random words, give 0 score
    if is_random_words:
        grammar_score_10 = 0.0  # 0 score for random words
        grammar_feedback = ["⚠️ Your text does not form valid English sentences."]
        grammar_bonus = 0.0
        grammar_penalty = 0.0
    elif is_meaningless:
        # Bad English - give low score but not 0
        grammar_score_10 = max(0.0, score_10 * 0.3)  # Very low score for bad English
        grammar_feedback = ["⚠️ Your text does not form valid English sentences."]
        grammar_bonus = 0.0
        grammar_penalty = 0.0
    else:
        # Initialize grammar feedback arrays BEFORE evidence-bound scoring
        grammar_feedback = []
        grammar_bonus = 0.0
        grammar_penalty = 0.0
        
        # Use evidence-bound scoring if available
        if EVIDENCE_BOUND_SCORER_AVAILABLE and prompt:
            try:
                grammar_evidence = analyze_grammar_evidence_bound(text, prompt, task_type, task_level)
                # Convert raw score (0-100) to 10-point scale
                grammar_score_10 = grammar_evidence['grammar_score_raw'] / 10.0
                grammar_feedback.extend(grammar_evidence['feedback'])
            except Exception as e:
                print(f"[Scoring] Error in evidence-bound grammar scoring: {e}")
                # Fallback to base scoring
                if is_simple_task and is_lower_level:
                    grammar_score_10 = min(10.0, score_10 + 1.2)  # Significant boost
                elif is_simple_task:
                    grammar_score_10 = min(10.0, score_10 + 0.8)  # Moderate boost
                elif is_lower_level:
                    grammar_score_10 = min(10.0, score_10 + 0.6)  # Small boost
                else:
                    grammar_score_10 = score_10
        else:
            # Fallback to base scoring
            if is_simple_task and is_lower_level:
                grammar_score_10 = min(10.0, score_10 + 1.2)  # Significant boost
            elif is_simple_task:
                grammar_score_10 = min(10.0, score_10 + 0.8)  # Moderate boost
            elif is_lower_level:
                grammar_score_10 = min(10.0, score_10 + 0.6)  # Small boost
            else:
                grammar_score_10 = score_10
    
    # Grammar feedback arrays are already initialized above
    # (either in is_random_words/is_meaningless blocks, or in else block before evidence-bound scoring)
    
    avg_sentence_length = word_count / sentence_count if sentence_count > 0 else 0
    
    # CEFR-appropriate sentence length and complexity expectations
    # Initialize default values first
    min_avg_length = 8  # Default value
    good_avg_length = 14  # Default value
    excellent_avg_length = 18  # Default value
    min_complex_structures = 2  # Default value
    good_complex_structures = 4  # Default value
    
    # For simple tasks, simple sentences are expected and correct
    # Skip this if text is random words or bad English
    if is_random_words or is_meaningless:
        # Already handled above, skip sentence length and complexity setup
        pass
    elif is_simple_task:
        # Simple tasks: simple sentences are perfect
        if avg_sentence_length >= 8:
            grammar_feedback.append("Good sentence length for this task type")
            grammar_bonus += 0.2
        elif avg_sentence_length >= 6:
            grammar_feedback.append("Appropriate sentence length")
            grammar_bonus += 0.1
        # No penalty for shorter sentences in simple tasks
        min_avg_length = 5  # Very lenient
        good_avg_length = 8
        excellent_avg_length = 12
        min_complex_structures = 0  # Not required
        good_complex_structures = 1
    elif task_level in ['A1', 'A2']:
        min_avg_length = 4  # Very lenient for beginners
        good_avg_length = 7
        excellent_avg_length = 10
        min_complex_structures = 0  # No requirement for beginners
        good_complex_structures = 1
    elif task_level == 'B1':
        min_avg_length = 6
        good_avg_length = 10
        excellent_avg_length = 14
        min_complex_structures = 1
        good_complex_structures = 2
    elif task_level == 'B2':
        min_avg_length = 8
        good_avg_length = 14
        excellent_avg_length = 18
        min_complex_structures = 2
        good_complex_structures = 4
    else:  # C1, C2
        min_avg_length = 10
        good_avg_length = 16
        excellent_avg_length = 22
        min_complex_structures = 4
        good_complex_structures = 6
    
    # Sentence length checking (very lenient for simple tasks)
    # Skip this if text is random words or bad English
    if is_random_words or is_meaningless:
        # Already handled above, skip sentence length checks
        pass
    elif is_simple_task:
        # Simple tasks: sentence length is less important
        if avg_sentence_length >= good_avg_length:
            grammar_feedback.append("Good sentence length for this task")
            grammar_bonus += 0.2
        elif avg_sentence_length >= min_avg_length:
            grammar_feedback.append("Appropriate sentence length")
            grammar_bonus += 0.1
        # No penalty for simple tasks - they should have simple sentences
    else:
        # Essay tasks: standard sentence length checking
        if avg_sentence_length >= excellent_avg_length:
            grammar_feedback.append("Excellent sentence complexity and variety!")
            grammar_bonus += 0.3
        elif avg_sentence_length >= good_avg_length:
            grammar_feedback.append("Good sentence complexity")
            grammar_bonus += 0.2
        elif avg_sentence_length >= min_avg_length:
            grammar_feedback.append(f"Sentence complexity is acceptable for {task_level} level. Aim for {good_avg_length} words average for improvement.")
            grammar_bonus += 0.1
        elif avg_sentence_length >= min_avg_length * 0.8:
            grammar_feedback.append(f"Try to vary sentence complexity. For {task_level} level, aim for average {good_avg_length} words per sentence.")
            grammar_penalty += 0.3
        else:
            grammar_feedback.append(f"Sentences are quite short. For {task_level} level, aim for average {good_avg_length} words per sentence.")
            grammar_penalty += 0.8
    
    # Check for complex structures - CEFR-appropriate
    # Skip this if text is random words or bad English
    if is_random_words or is_meaningless:
        # Already handled above, skip complex structure checks
        pass
    else:
        complex_structures = len(re.findall(r'\b(that|which|who|whom|whose|when|where|if|unless|although|because|since|while|as|though|even though|provided that|in case|so that|in order that|despite|in spite of)\b', text.lower()))
        
        # For simple tasks, complex structures are NOT expected (simple sentences are correct)
        if is_simple_task:
            # Simple tasks: simple sentences are perfect, no complex structures needed
            grammar_feedback.append("Good use of simple sentences - perfect for this task type")
            grammar_bonus += 0.2
            # No penalty for simple tasks - they should use simple structures
        elif task_level in ['A1', 'A2']:
            # For A1-A2 essay tasks, complex structures are optional
            if complex_structures >= good_complex_structures:
                grammar_feedback.append("Good use of complex structures for your level!")
                grammar_bonus += 0.2
            elif complex_structures >= min_complex_structures:
                grammar_feedback.append("Some use of complex structures - good progress!")
                grammar_bonus += 0.1
            # No penalty for A1-A2 if no complex structures
        else:
            # For B1+ essay tasks, complex structures are expected
            if complex_structures >= good_complex_structures:
                grammar_feedback.append("Excellent use of complex grammatical structures!")
                grammar_bonus += 0.3
            elif complex_structures >= min_complex_structures:
                grammar_feedback.append("Good use of complex structures")
                grammar_bonus += 0.2
            elif complex_structures >= min_complex_structures * 0.7:
                grammar_feedback.append(f"Consider using more complex structures. For {task_level} level, aim for at least {good_complex_structures} complex structures.")
                grammar_penalty += 0.3
            else:
                grammar_feedback.append(f"Try to use more complex grammatical structures. For {task_level} level, aim for at least {good_complex_structures} complex structures.")
                grammar_penalty += 0.6
    
    # Apply grammar adjustments
    # Skip adjustments if text is random words (must stay at 0.0)
    if not is_random_words:
        grammar_score_10 = grammar_score_10 + grammar_bonus - grammar_penalty
        grammar_score_10 = max(0.0, min(10.0, grammar_score_10))
        
        # Apply topic multiplier (Topic Gate)
        print(f"[Scoring] Applying topic_multiplier {topic_multiplier} to grammar_score_10 (before: {grammar_score_10:.1f})")
        grammar_score_10 = grammar_score_10 * topic_multiplier
        grammar_score_10 = max(0.0, min(10.0, grammar_score_10))
        print(f"[Scoring] Grammar score after topic_multiplier: {grammar_score_10:.1f}")
    else:
        # Random words must stay at 0.0, no adjustments allowed
        grammar_score_10 = 0.0
    
    # Calculate Mechanics score if CEFR rubric is available
    mechanics_score_10 = 0.0
    mechanics_feedback = []
    
    if CEFR_RUBRIC_AVAILABLE and not is_random_words:
        try:
            rubric = get_level_rubric(task_level)
            mechanics_score_100, mechanics_feedback_list = calculate_mechanics_score(text, rubric)
            mechanics_score_10 = mechanics_score_100 / 10.0  # Convert to 10-point scale
            mechanics_feedback = mechanics_feedback_list
        except Exception as e:
            print(f"[Scoring] Error calculating mechanics score: {e}")
            # Default: assume good mechanics if calculation fails
            mechanics_score_10 = 8.0
            mechanics_feedback = ["Mechanics scoring unavailable"]
    
    return {
        'task_response': {
            'score': round(task_response_score_10, 1),
            'feedback': task_response_feedback
        },
        'coherence_cohesion': {
            'score': round(coherence_score_10, 1),
            'feedback': coherence_feedback
        },
        'lexical_resource': {
            'score': round(lexical_score_10, 1),
            'feedback': lexical_feedback
        },
        'grammatical_range': {
            'score': round(grammar_score_10, 1),
            'feedback': grammar_feedback
        },
        'mechanics': {
            'score': round(mechanics_score_10, 1),
            'feedback': mechanics_feedback
        } if CEFR_RUBRIC_AVAILABLE else None,
        'topic_gate_info': {
            'topic_score': topic_result['topic_score'] if topic_result else 1.0,
            'topic_multiplier': topic_multiplier,
            'topic_gate_passed': topic_gate_passed,
            'topic_gate_message': topic_gate_message
        } if topic_result else None
    }


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint
    Check service status and loaded models
    
    ---
    tags:
      - Health
    responses:
      200:
        description: Service is healthy
        schema:
          type: object
          properties:
            status:
              type: string
              example: healthy
            active_model:
              type: string
              example: bert_pro
            models_loaded:
              type: object
            traditional_model_loaded:
              type: boolean
            bert_model_loaded:
              type: boolean
    """
    loaded_models = {}
    for name, model_info in all_models.items():
        loaded_models[name] = model_info.get('loaded', False)
    
    return jsonify({
        'status': 'healthy',
        'active_model': active_model_type,
        'models_loaded': loaded_models,
        'traditional_model_loaded': model_loaded,
        'bert_model_loaded': bert_model_loaded,
        'scaler_loaded': scaler is not None,
        'vectorizer_loaded': vectorizer is not None,
    })


def fallback_score(text: str) -> float:
    """Fallback scoring algorithm when model is not available"""
    word_count = len(text.split())
    sentence_count = len(re.split(r'[.!?]+', text))
    unique_words = len(set(text.lower().split()))
    lexical_diversity = unique_words / word_count if word_count > 0 else 0
    
    # Base score from word count
    if word_count >= 250:
        base_score = 6.0
    elif word_count >= 200:
        base_score = 5.5
    elif word_count >= 150:
        base_score = 5.0
    else:
        base_score = 4.5
    
    # Adjust based on lexical diversity
    if lexical_diversity > 0.7:
        base_score += 0.5
    elif lexical_diversity > 0.5:
        base_score += 0.3
    elif lexical_diversity < 0.3:
        base_score -= 0.5
    
    # Adjust based on sentence variety
    avg_sentence_length = word_count / sentence_count if sentence_count > 0 else 0
    if 15 <= avg_sentence_length <= 25:
        base_score += 0.3
    elif avg_sentence_length < 10:
        base_score -= 0.3
    
    return max(3.0, min(8.0, base_score))


def predict_with_active_model(text: str, prompt: str = "") -> Tuple[float, str]:
    """
    Predict IELTS score using the active model
    Args:
        text: Essay text to score
        prompt: Optional prompt/question text (used by question-aware models)
    Returns: (score, model_type)
    """
    if active_model and model_loader:
        try:
            model_type = active_model_type
            if model_type == 'bert_pro':
                score = model_loader.predict_bert_pro(active_model, text)
                return score, 'BERT PRO'
            elif model_type == 'bert_multi':
                score = model_loader.predict_bert_multi_task(active_model, text)
                return score, 'BERT Multi-task'
            elif model_type == 'bert':
                score = model_loader.predict_bert_sentence_transformer(active_model, text)
                return score, 'BERT'
            elif model_type == 'traditional':
                score = model_loader.predict_traditional(active_model, text, extract_features_with_vectorizer)
                return score, 'Traditional'
        except Exception as e:
            print(f"Error predicting with active model: {e}")
            import traceback
            traceback.print_exc()
    
    # Fallback to BERT model with question awareness
    if bert_model_loaded and bert_assessor is not None:
        try:
            # Use prompt as question if available
            question = prompt if prompt else ""
            result = bert_assessor.predict(essay=text, task_type=2, question=question)
            model_name = 'BERT Question-Aware' if bert_assessor.use_question else 'BERT Legacy'
            return result['score'], model_name
        except Exception as e:
            print(f"BERT model prediction failed: {e}")
            import traceback
            traceback.print_exc()
    
    # Fallback to traditional model (legacy)
    if model_loaded and model is not None:
        try:
            features = extract_features_with_vectorizer(text)
            if vectorizer is None and scaler is not None:
                features = scaler.transform(features)
            prediction = model.predict(features, verbose=0)
            if isinstance(prediction, np.ndarray):
                score = float(prediction[0][0] if prediction.ndim > 1 else prediction[0])
            else:
                score = float(prediction)
            return max(0, min(9, score)), 'Traditional Legacy'
        except Exception as e:
            print(f"Traditional model prediction failed: {e}")
    
    # Ultimate fallback
    return fallback_score(text), 'Fallback'


def check_off_topic_with_gemini(text: str, prompt: str, task_level: str = "B2") -> Tuple[bool, float, str]:
    """
    Use Gemini to check if essay is off-topic BEFORE scoring
    Returns: (is_off_topic, confidence, reason)
    """
    if not prompt or not prompt.strip():
        return False, 0.0, ""
    
    gemini_api_key = os.getenv('GEMINI_API_KEY')
    if not gemini_api_key or gemini_api_key.strip() == '':
        print("[Off-topic Check] ⚠️ Gemini API key not configured (GEMINI_API_KEY env var not set)")
        print("[Off-topic Check] Skipping Gemini off-topic check - will use fallback methods")
        return False, 0.0, ""
    
    print(f"[Off-topic Check] ✓ Gemini API key found, performing off-topic check...")
    
    try:
        # Build prompt for Gemini
        # Truncate text if too long
        essay_text = text[:2000] if len(text) > 2000 else text
        
        check_prompt = f"""You are an expert English teacher. Check if the student's essay addresses the given prompt topic.

Writing Prompt: "{prompt}"

Student's Essay:
"{essay_text}"

CRITICAL INSTRUCTIONS:
1. Check if the essay's MAIN TOPIC matches the prompt's MAIN TOPIC
2. Be STRICT but SEMANTICALLY AWARE - understand synonyms and related concepts:
   - "memorable trip" = "vacation" = "travel" = "journey" = "holiday" → SAME TOPIC
   - "online shopping" = "e-commerce" = "buying online" → SAME TOPIC
   - "university education" = "college" = "higher education" → SAME TOPIC
   - "environmental pollution" = "pollution" = "environmental issues" → SAME TOPIC
3. Examples of OFF-TOPIC (completely different topics):
   - Prompt: "online shopping" → Essay: "work from home vs office" → OFF-TOPIC
   - Prompt: "university education" → Essay: "remote work benefits" → OFF-TOPIC
   - Prompt: "environmental pollution" → Essay: "office vs home work" → OFF-TOPIC
   - Prompt: "weekend activities" → Essay: "daily routine, work" → OFF-TOPIC
4. Examples of ON-TOPIC (same topic, different wording):
   - Prompt: "A Memorable Trip" → Essay: "Last summer vacation to Da Nang" → ON-TOPIC ✓
   - Prompt: "My Vacation" → Essay: "memorable trip to the beach" → ON-TOPIC ✓
   - Prompt: "Online Shopping" → Essay: "buying things on the internet" → ON-TOPIC ✓
5. Only mark as OFF-TOPIC if the essay discusses a COMPLETELY DIFFERENT TOPIC from the prompt

Return ONLY valid JSON with this EXACT structure:
{{
  "is_off_topic": true,
  "confidence": 0.95,
  "reason": "Essay discusses work/office but prompt asks about online shopping"
}}

If on-topic (same topic, even with different wording):
{{
  "is_off_topic": false,
  "confidence": 0.0,
  "reason": ""
}}"""
        
        # Call Gemini API
        api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_api_key}"
        
        response = requests.post(
            api_url,
            json={
                "contents": [{
                    "parts": [{"text": check_prompt}]
                }],
                "generationConfig": {
                    "temperature": 0.1,  # Low temperature for consistent results
                    "maxOutputTokens": 500,
                    "responseMimeType": "application/json"
                }
            },
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('candidates') and len(data['candidates']) > 0:
                candidate = data['candidates'][0]
                if candidate.get('content') and candidate['content'].get('parts'):
                    result_text = candidate['content']['parts'][0].get('text', '')
                    
                    # Parse JSON
                    import json
                    try:
                        # Remove markdown code blocks if present
                        result_text = result_text.replace('```json', '').replace('```', '').strip()
                        result = json.loads(result_text)
                        
                        is_off_topic = result.get('is_off_topic', False)
                        confidence = result.get('confidence', 0.0)
                        reason = result.get('reason', '')
                        
                        print(f"[Off-topic Check] Gemini result: is_off_topic={is_off_topic}, confidence={confidence}, reason={reason}")
                        return is_off_topic, confidence, reason
                    except json.JSONDecodeError as e:
                        print(f"[Off-topic Check] Failed to parse Gemini JSON: {e}")
                        print(f"[Off-topic Check] Response text: {result_text[:200]}")
        
        # Log error details
        print(f"[Off-topic Check] Gemini API call failed or returned invalid response")
        print(f"[Off-topic Check] Status code: {response.status_code}")
        if response.status_code != 200:
            try:
                error_data = response.json()
                print(f"[Off-topic Check] Error response: {error_data}")
            except:
                print(f"[Off-topic Check] Error response text: {response.text[:200]}")
        return False, 0.0, ""
        
    except requests.exceptions.Timeout:
        print(f"[Off-topic Check] Gemini API timeout (10s) - skipping check")
        return False, 0.0, ""
    except requests.exceptions.RequestException as e:
        print(f"[Off-topic Check] Gemini API request error: {e}")
        return False, 0.0, ""
    except Exception as e:
        print(f"[Off-topic Check] Unexpected error calling Gemini: {e}")
        import traceback
        traceback.print_exc()
        return False, 0.0, ""


@app.route('/score', methods=['POST'])
def score_writing():
    """Score writing essay using best available model
    Automatically selects model in priority order: BERT PRO > BERT Multi > BERT > Traditional
    
    ---
    tags:
      - Scoring
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - text
          properties:
            text:
              type: string
              description: Essay text to score
              example: "Climate change is one of the most pressing issues facing humanity today."
            prompt:
              type: string
              description: Optional writing prompt
              example: "Discuss the impact of climate change"
    responses:
      200:
        description: Scoring successful
        schema:
          type: object
          properties:
            score_10:
              type: number
              example: 7.5
            ielts_score:
              type: number
              example: 6.8
            band:
              type: string
              example: "Good User"
            overall_score:
              type: number
              example: 7.2
            cefr_level:
              type: string
              example: "C1"
            cefr_description:
              type: string
              example: "Advanced"
            detailed_scores:
              type: object
            word_count:
              type: integer
              example: 250
            statistics:
              type: object
            model_type:
              type: string
              example: "BERT PRO"
            using_fallback:
              type: boolean
              example: false
      400:
        description: Bad request
        schema:
          type: object
          properties:
            error:
              type: string
      500:
        description: Internal server error
    """
    try:
        data = request.json
        text = data.get('text', '')
        prompt = data.get('prompt', '')  # Optional
        task = data.get('task', None)  # Optional - task requirements for task-based scoring
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        # STEP 1: Check off-topic with Gemini BEFORE scoring (if prompt provided)
        if prompt and prompt.strip():
            task_level = task.get('level') if task else 'B2'
            is_off_topic, confidence, reason = check_off_topic_with_gemini(text, prompt, task_level)
            
            print(f"[Scoring] Gemini off-topic check: is_off_topic={is_off_topic}, confidence={confidence:.2f}, reason={reason}")
            
            if is_off_topic and confidence >= 0.9:  # Very high confidence off-topic (only reject when extremely certain)
                print(f"[Scoring] Gemini detected off-topic (confidence: {confidence:.2f}): {reason}")
                print(f"[Scoring] Returning 0 scores without model scoring")
                
                # Return 0 scores immediately
                return jsonify({
                    'score_10': 0.0,
                    'ielts_score': 0.0,
                    'band': 'Off-topic',
                    'overall_score': 0.0,
                    'cefr_level': 'N/A',
                    'cefr_description': 'Off-topic response',
                    'detailed_scores': {
                        'task_response': {
                            'score': 0.0,
                            'feedback': [f"⚠️ Your response does not address the prompt topic. {reason}"]
                        },
                        'coherence_cohesion': {
                            'score': 0.0,
                            'feedback': ["Response is off-topic"]
                        },
                        'lexical_resource': {
                            'score': 0.0,
                            'feedback': ["Response is off-topic"]
                        },
                        'grammatical_range': {
                            'score': 0.0,
                            'feedback': ["Response is off-topic"]
                        }
                    },
                    'word_count': len(text.split()),
                    'statistics': {},
                    'model_type': 'Gemini Off-topic Check',
                    'using_fallback': False,
                    'off_topic_detected': True,
                    'off_topic_reason': reason,
                    'off_topic_confidence': confidence
                })
        
        # Validity Gate: Check if text is valid English before scoring
        task_level = task.get('level') if task else None
        is_valid, error_msg = validate_text_gate(text, task_level)
        if not is_valid:
            return jsonify({
                'error': 'Invalid text',
                'message': error_msg,
                'validity_check_failed': True
            }), 400
        
        # Predict with active model (pass prompt if available)
        ielts_score, model_type = predict_with_active_model(text, prompt)
        
        # Get band description
        band_description = get_band_description(ielts_score)
        
        # Convert to 10-point scale with level-based normalization
        task_level = task.get('level') if task else None
        task_type = task.get('type') if task else None
        score_10 = score_to_scale_10(ielts_score, task_level, task_type)
        cefr_level, cefr_description = score_to_cefr(score_10)
        
        # Get detailed feedback (prompt and task are optional, but task helps with task-based scoring)
        detailed_feedback = get_detailed_feedback(text, score_10, prompt, task)
        
        # Calculate overall score with weighted average
        # Task Response is most important (30%), then Coherence (25%), Lexical (25%), Grammar (20%)
        # This better reflects the importance of addressing the prompt correctly
        task_response_score = detailed_feedback['task_response']['score']
        coherence_score = detailed_feedback['coherence_cohesion']['score']
        lexical_score = detailed_feedback['lexical_resource']['score']
        grammar_score = detailed_feedback['grammatical_range']['score']
        
        # If task_response is 0.0 due to off-topic, set overall_score to 0.0
        topic_gate_info = detailed_feedback.get('topic_gate_info')
        is_off_topic = topic_gate_info and topic_gate_info.get('topic_multiplier') == 0.0
        
        if task_response_score == 0.0 and is_off_topic:
            # Off-topic detected - set overall_score to 0.0
            overall_score = 0.0
        elif task_response_score == 0.0 and coherence_score == 0.0 and lexical_score == 0.0 and grammar_score == 0.0:
            # All scores are 0.0 (likely random words)
            overall_score = 0.0
        else:
            # Weighted average
            overall_score = (
                task_response_score * 0.30 +
                coherence_score * 0.25 +
                lexical_score * 0.25 +
                grammar_score * 0.20
            )
            
            # Ensure overall score is within valid range
            overall_score = max(0.0, min(10.0, overall_score))
        
        # Prepare response
        response_data = {
            'score_10': round(score_10, 1),
            'ielts_score': round(ielts_score, 1),
            'band': band_description,
            'overall_score': round(overall_score, 1),
            'cefr_level': cefr_level,
            'cefr_description': cefr_description,
            'detailed_scores': detailed_feedback,
            'word_count': len(text.split()),
            'statistics': {
                'words': len(text.split()),
                'characters': len(text),
                'sentences': len(re.split(r'[.!?]+', text)),
                'paragraphs': len([p.strip() for p in text.split('\n\n') if p.strip()]),
                'unique_words': len(set(text.lower().split()))
            },
            'model_type': model_type,
            'using_fallback': model_type == 'Fallback',
            'scoring_system': 'traditional',
            'using_ai_model': True,
            'prompt_required': False
        }
        
        # Add topic gate information if available
        topic_gate_info = detailed_feedback.get('topic_gate_info')
        if topic_gate_info:
            response_data['topic_score'] = topic_gate_info['topic_score']
            response_data['topic_multiplier'] = topic_gate_info['topic_multiplier']
            response_data['topic_gate_passed'] = topic_gate_info['topic_gate_passed']
            if topic_gate_info.get('topic_gate_message'):
                response_data['topic_gate_message'] = topic_gate_info['topic_gate_message']
        
        # Add CEFR level group and score bands if available
        if CEFR_RUBRIC_AVAILABLE and task_level:
            try:
                level_group = get_cefr_level_group(task_level)
                score_bands = get_level_score_bands(level_group)
                response_data['cefr_level_group'] = level_group
                response_data['score_bands'] = score_bands
            except Exception as e:
                print(f"[Scoring] Error adding CEFR level info: {e}")
        
        return jsonify(response_data)
        
    except Exception as e:
        print(f"Error scoring writing: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


def get_band_description(score: float) -> str:
    """Get IELTS band description"""
    if score >= 9.0:
        return 'Expert User'
    elif score >= 8.0:
        return 'Very Good User'
    elif score >= 7.0:
        return 'Good User'
    elif score >= 6.0:
        return 'Competent User'
    elif score >= 5.0:
        return 'Modest User'
    elif score >= 4.0:
        return 'Limited User'
    elif score >= 3.0:
        return 'Extremely Limited User'
    elif score >= 2.0:
        return 'Intermittent User'
    else:
        return 'Non User'


@app.route('/score-ai', methods=['POST'])
def score_writing_ai():
    """Score writing using AI model - NO PROMPT REQUIRED
    Uses best available AI model (BERT PRO > BERT Multi > BERT > Traditional)
    
    ---
    tags:
      - Scoring
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - text
          properties:
            text:
              type: string
              description: Essay text to score
              example: "Climate change is one of the most pressing issues facing humanity today."
            prompt:
              type: string
              description: Optional writing prompt
              example: "Discuss the impact of climate change"
    responses:
      200:
        description: Scoring successful
        schema:
          type: object
          properties:
            score_10:
              type: number
              example: 7.5
            ielts_score:
              type: number
              example: 6.8
            band:
              type: string
              example: "Good User"
            overall_score:
              type: number
              example: 7.2
            cefr_level:
              type: string
              example: "C1"
            cefr_description:
              type: string
              example: "Advanced"
            model_type:
              type: string
              example: "BERT PRO"
            prompt_required:
              type: boolean
              example: false
            using_ai_model:
              type: boolean
              example: true
      400:
        description: Bad request
      503:
        description: AI model not available
      500:
        description: Internal server error
    """
    try:
        data = request.json
        text = data.get('text', '')
        prompt = data.get('prompt', '')  # Optional - for feedback only
        task = data.get('task', None)  # Optional - task requirements for task-based scoring
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        # STEP 1: Check off-topic with Gemini BEFORE scoring (if prompt provided)
        if prompt and prompt.strip():
            task_level = task.get('level') if task else 'B2'
            is_off_topic, confidence, reason = check_off_topic_with_gemini(text, prompt, task_level)
            
            print(f"[Scoring AI] Gemini off-topic check: is_off_topic={is_off_topic}, confidence={confidence:.2f}, reason={reason}")
            
            if is_off_topic and confidence >= 0.9:  # Very high confidence off-topic (only reject when extremely certain)
                print(f"[Scoring AI] Gemini detected off-topic (confidence: {confidence:.2f}): {reason}")
                print(f"[Scoring AI] Returning 0 scores without model scoring")
                
                # Return 0 scores immediately
                return jsonify({
                    'score_10': 0.0,
                    'ielts_score': 0.0,
                    'band': 'Off-topic',
                    'overall_score': 0.0,
                    'cefr_level': 'N/A',
                    'cefr_description': 'Off-topic response',
                    'detailed_scores': {
                        'task_response': {
                            'score': 0.0,
                            'feedback': [f"⚠️ Your response does not address the prompt topic. {reason}"]
                        },
                        'coherence_cohesion': {
                            'score': 0.0,
                            'feedback': ["Response is off-topic"]
                        },
                        'lexical_resource': {
                            'score': 0.0,
                            'feedback': ["Response is off-topic"]
                        },
                        'grammatical_range': {
                            'score': 0.0,
                            'feedback': ["Response is off-topic"]
                        }
                    },
                    'word_count': len(text.split()),
                    'statistics': {},
                    'model_type': 'Gemini Off-topic Check',
                    'using_fallback': False,
                    'off_topic_detected': True,
                    'off_topic_reason': reason,
                    'off_topic_confidence': confidence
                })
        
        # Check if any AI model is available (not fallback)
        if not active_model and not bert_model_loaded:
            return jsonify({
                'error': 'AI model not available',
                'message': 'No AI models loaded. Please ensure models are in ai-models/writing-scorer/models/'
            }), 503
        
        # Predict with active model (pass prompt if available for question-aware models)
        ielts_score, model_type = predict_with_active_model(text, prompt)
        
        # Get band description
        band_description = get_band_description(ielts_score)
        
        # Convert to 10-point scale with level-based normalization
        task_level = task.get('level') if task else None
        task_type = task.get('type') if task else None
        score_10 = score_to_scale_10(ielts_score, task_level, task_type)
        cefr_level, cefr_description = score_to_cefr(score_10)
        
        # Traditional scoring system
        detailed_feedback = get_detailed_feedback(text, score_10, prompt, task)
        
        # Calculate overall score with weighted average
        # Task Response is most important (30%), then Coherence (25%), Lexical (25%), Grammar (20%)
        # This better reflects the importance of addressing the prompt correctly
        task_response_score = detailed_feedback['task_response']['score']
        coherence_score = detailed_feedback['coherence_cohesion']['score']
        lexical_score = detailed_feedback['lexical_resource']['score']
        grammar_score = detailed_feedback['grammatical_range']['score']
        
        # If task_response is 0.0 due to off-topic, set overall_score to 0.0
        topic_gate_info = detailed_feedback.get('topic_gate_info')
        is_off_topic = topic_gate_info and topic_gate_info.get('topic_multiplier') == 0.0
        
        if task_response_score == 0.0 and is_off_topic:
            # Off-topic detected - set overall_score to 0.0
            overall_score = 0.0
        elif task_response_score == 0.0 and coherence_score == 0.0 and lexical_score == 0.0 and grammar_score == 0.0:
            # All scores are 0.0 (likely random words)
            overall_score = 0.0
        else:
            # Weighted average
            overall_score = (
                task_response_score * 0.30 +
                coherence_score * 0.25 +
                lexical_score * 0.25 +
                grammar_score * 0.20
            )
            
            # Ensure overall score is within valid range
            overall_score = max(0.0, min(10.0, overall_score))
        
        # Prepare response
        response_data = {
            'score_10': round(score_10, 1),
            'ielts_score': round(ielts_score, 1),
            'band': band_description,
            'overall_score': round(overall_score, 1),
            'cefr_level': cefr_level,
            'cefr_description': cefr_description,
            'detailed_scores': detailed_feedback,
            'word_count': len(text.split()),
            'statistics': {
                'words': len(text.split()),
                'characters': len(text),
                'sentences': len(re.split(r'[.!?]+', text)),
                'paragraphs': len([p.strip() for p in text.split('\n\n') if p.strip()]),
                'unique_words': len(set(text.lower().split()))
            },
            'model_type': model_type,
            'prompt_required': False,
            'using_ai_model': model_type != 'Fallback' and model_type != 'Traditional',
            'scoring_system': 'traditional'
        }
        
        # Add topic gate information if available
        topic_gate_info = detailed_feedback.get('topic_gate_info')
        if topic_gate_info:
            response_data['topic_score'] = topic_gate_info['topic_score']
            response_data['topic_multiplier'] = topic_gate_info['topic_multiplier']
            response_data['topic_gate_passed'] = topic_gate_info['topic_gate_passed']
            if topic_gate_info.get('topic_gate_message'):
                response_data['topic_gate_message'] = topic_gate_info['topic_gate_message']
        
        return jsonify(response_data)
        
    except Exception as e:
        print(f"Error scoring writing with AI model: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/grammar-check', methods=['POST'])
def grammar_check():
    """Check grammar and spelling errors in text
    Uses LanguageTool API for grammar checking
    
    ---
    tags:
      - Grammar
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - text
          properties:
            text:
              type: string
              description: Text to check for grammar errors
              example: "I recieve the letter yesterday."
            language:
              type: string
              description: Language code
              example: "en-US"
              default: "en-US"
    responses:
      200:
        description: Grammar check successful
        schema:
          type: object
          properties:
            issues:
              type: array
              items:
                type: object
            issue_count:
              type: integer
              example: 1
            language:
              type: string
              example: "English (US)"
      400:
        description: Bad request
      500:
        description: Internal server error
    """
    try:
        data = request.json
        text = data.get('text', '')
        language = data.get('language', 'en-US')
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        # Call LanguageTool API
        import requests
        
        try:
            lt_response = requests.post(
                'https://api.languagetool.org/v2/check',
                data={
                    'text': text,
                    'language': language,
                },
                timeout=10
            )
            
            if lt_response.status_code == 200:
                lt_data = lt_response.json()
                issues = []
                
                matches = lt_data.get('matches', [])
                print(f"LanguageTool found {len(matches)} issues")
                
                for match in matches:
                    # Extract context text for better matching
                    context_obj = match.get('context', {})
                    context_text = context_obj.get('text', '') if isinstance(context_obj, dict) else str(context_obj)
                    
                    # Get sentence context if available
                    sentence = match.get('sentence', '')
                    if sentence and not context_text:
                        context_text = sentence
                    
                    issue = {
                        'type': match.get('rule', {}).get('category', {}).get('name', 'Grammar'),
                        'message': match.get('message', 'Grammar error'),
                        'short_message': match.get('shortMessage', ''),
                        'offset': match.get('offset', 0),
                        'length': match.get('length', 0),
                        'context': {
                            'text': context_text,
                            'offset': match.get('offset', 0),
                            'length': match.get('length', 0),
                        } if context_text else match.get('context', {}),
                        'sentence_index': 0,
                        'severity': 'error' if match.get('rule', {}).get('issueType') == 'misspelling' else 'warning',
                        'replacements': [{'value': r.get('value', '')} for r in match.get('replacements', [])[:5]],
                    }
                    issues.append(issue)
                
                print(f"Returning {len(issues)} issues to frontend")
                
                return jsonify({
                    'issues': issues,
                    'issue_count': len(issues),
                    'language': lt_data.get('language', {}).get('name', language)
                })
            else:
                return basic_grammar_check(text)
                
        except requests.exceptions.RequestException as e:
            print(f"LanguageTool API error: {e}, using fallback")
            return basic_grammar_check(text)
        
    except Exception as e:
        print(f"Grammar check error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/score-v2', methods=['POST'])
def score_writing_v2():
    """
    Score writing using NEW intelligent prompt-aware system
    This system:
    - Analyzes prompt to understand requirements
    - Validates content relevance semantically
    - Assesses quality (vocab, grammar, coherence)
    - Produces accurate scores for ANY prompt
    ---
    tags:
      - Scoring
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            text:
              type: string
              description: Essay text to score
            prompt:
              type: string
              description: Writing prompt/task description
            level:
              type: string
              description: Target CEFR level (A1-C2)
              default: B2
            task_type:
              type: string
              description: Optional task type override
    responses:
      200:
        description: Scoring result
        schema:
          type: object
          properties:
            overall_score:
              type: number
              example: 7.5
            cefr_level:
              type: string
              example: B2
            detailed_scores:
              type: object
            is_off_topic:
              type: boolean
    """
    try:
        data = request.json
        text = data.get('text', '')
        prompt = data.get('prompt', '')
        task_level = data.get('level', 'B2')
        task_type = data.get('task_type')
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        if not prompt:
            return jsonify({'error': 'No prompt provided'}), 400
        
        # Check if intelligent scorer is available
        if not INTELLIGENT_SCORER_AVAILABLE:
            return jsonify({
                'error': 'Intelligent scorer not available',
                'message': 'Please use /score endpoint instead'
            }), 503
        
        print(f"\n{'='*80}")
        print(f"[Score V2] Starting intelligent scoring...")
        print(f"[Score V2] Prompt: {prompt[:100]}...")
        print(f"[Score V2] Level: {task_level}")
        print(f"[Score V2] Essay length: {len(text.split())} words")
        print(f"{'='*80}\n")
        
        # Use intelligent scorer
        result = score_essay_intelligent(
            essay=text,
            prompt=prompt,
            task_level=task_level.upper(),
            task_type=task_type
        )
        
        if 'error' in result:
            print(f"[Score V2] Error: {result['error']}")
            return jsonify(result), 500
        
        print(f"\n{'='*80}")
        print(f"[Score V2] ✓ Scoring complete!")
        print(f"[Score V2] Overall Score: {result.get('overall_score')}/10")
        print(f"[Score V2] CEFR Level: {result.get('cefr_level')}")
        print(f"[Score V2] Off-topic: {result.get('is_off_topic', False)}")
        print(f"{'='*80}\n")
        
        return jsonify(result)
        
    except Exception as e:
        print(f"[Score V2] Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


def basic_grammar_check(text: str):
    """Fallback basic grammar checking with offset/length calculation"""
    issues = []
    
    # Check capitalization for each sentence
    sentences = re.split(r'([.!?]+)', text)
    current_offset = 0
    
    i = 0
    while i < len(sentences):
        sentence_text = sentences[i].strip() if i < len(sentences) else ""
        punctuation = sentences[i + 1] if i + 1 < len(sentences) else ""
        
        if sentence_text:
            sentence_start_offset = text.find(sentence_text, current_offset)
            if sentence_start_offset == -1:
                sentence_start_offset = current_offset
            
            # Check capitalization
            if sentence_text and sentence_text[0].islower():
                offset = sentence_start_offset
                length = 1
                issues.append({
                    'type': 'Capitalization',
                    'message': f'Sentence should start with capital letter: "{sentence_text[:20]}..."',
                    'short_message': 'Capitalization error',
                    'offset': offset,
                    'length': length,
                    'sentence_index': len([s for s in issues if s.get('type') == 'Capitalization']),
                    'severity': 'error',
                    'context': {
                        'text': sentence_text[:50] + ('...' if len(sentence_text) > 50 else ''),
                        'offset': offset,
                        'length': length
                    },
                    'replacements': [{'value': sentence_text[0].upper() + sentence_text[1:]}]
                })
            
            # Check common errors - find all occurrences of " i " in sentence
            sentence_lower = sentence_text.lower()
            search_pos = 0
            while True:
                pos = sentence_lower.find(' i ', search_pos)
                if pos == -1:
                    break
                offset = sentence_start_offset + pos + 1
                length = 1
                issues.append({
                    'type': 'Spelling',
                    'message': 'Use "I" (capital) for first person pronoun',
                    'short_message': 'Pronoun capitalization',
                    'offset': offset,
                    'length': length,
                    'sentence_index': len([s for s in issues if s.get('type') == 'Spelling']),
                    'severity': 'error',
                    'context': {
                        'text': sentence_text[max(0, pos-10):min(len(sentence_text), pos+15)],
                        'offset': offset,
                        'length': length
                    },
                    'replacements': [{'value': 'I'}]
                })
                search_pos = pos + 1
            
            current_offset = sentence_start_offset + len(sentence_text) + len(punctuation)
        
        i += 2
    
    # Check for common misspellings
    common_errors = [
        ('teh', 'the'),
        ('adn', 'and'),
        ('recieve', 'receive'),
        ('seperate', 'separate'),
        ('definately', 'definitely'),
        ('occured', 'occurred'),
    ]
    
    for error_word, correct_word in common_errors:
        start = 0
        while True:
            pos = text.lower().find(error_word, start)
            if pos == -1:
                break
            if (pos == 0 or not text[pos-1].isalnum()) and \
               (pos + len(error_word) >= len(text) or not text[pos + len(error_word)].isalnum()):
                issues.append({
                    'type': 'Spelling',
                    'message': f'Possible misspelling: "{error_word}" should be "{correct_word}"',
                    'short_message': 'Misspelling',
                    'offset': pos,
                    'length': len(error_word),
                    'severity': 'error',
                    'context': {
                        'text': text[max(0, pos-20):min(len(text), pos+len(error_word)+20)],
                        'offset': pos,
                        'length': len(error_word)
                    },
                    'replacements': [{'value': correct_word}]
                })
            start = pos + 1
    
    return jsonify({
        'issues': issues,
        'issue_count': len(issues)
    })


# Initialize Swagger after all routes are defined
swagger = None
if SWAGGER_AVAILABLE:
    try:
        swagger_config = {
            "headers": [],
            "specs": [
                {
                    "endpoint": "apispec",
                    "route": "/apispec.json",
                    "rule_filter": lambda rule: True,
                    "model_filter": lambda tag: True,
                }
            ],
            "static_url_path": "/flasgger_static",
            "swagger_ui": True,
            "specs_route": "/api-docs"
        }

        swagger_template = {
            "info": {
                "title": "IELTS Writing Scorer API",
                "description": "RESTful API for scoring IELTS writing essays using multiple AI models (BERT PRO, BERT Multi-task, BERT, Traditional). Supports automatic model selection, detailed feedback, grammar checking, and CEFR level conversion.",
                "version": "1.0.0",
                "contact": {
                    "name": "API Support"
                }
            },
            "tags": [
                {
                    "name": "Health",
                    "description": "Service health and status endpoints"
                },
                {
                    "name": "Scoring",
                    "description": "Essay scoring endpoints"
                },
                {
                    "name": "Grammar",
                    "description": "Grammar checking endpoints"
                }
            ],
            "servers": [
                {
                    "url": "http://localhost:5001",
                    "description": "Development server"
                }
            ]
        }
        
        swagger = Swagger(app, config=swagger_config, template=swagger_template)
        print("[OK] Swagger initialized successfully")
    except Exception as e:
        print(f"[WARNING] Swagger initialization failed: {e}")
        import traceback
        traceback.print_exc()
        swagger = None

if __name__ == '__main__':
    print("="*70)
    print("IELTS Writing Scorer Service")
    print("="*70)
    print(f"\nActive Model: {active_model_type or 'None (using fallback)'}")
    print(f"\nLoaded Models:")
    for name, model_info in all_models.items():
        status = '[OK] Loaded' if model_info.get('loaded') else '[FAIL] Not loaded'
        print(f"  - {name}: {status}")
    print(f"\nLegacy Models:")
    print(f"  - Traditional: {'[OK] Loaded' if model_loaded else '[FAIL] Not loaded'}")
    print(f"  - BERT Legacy: {'[OK] Loaded' if bert_model_loaded else '[FAIL] Not loaded'}")
    print("="*70)
    print("\nEndpoints:")
    print("  POST /score - Score writing (uses best available model)")
    print("  POST /score-ai - Score writing using AI model only (no prompt required)")
    print("  POST /grammar-check - Check grammar")
    print("  GET /health - Health check")
    if swagger:
        print("\n[Swagger] API Documentation:")
        print("  http://localhost:5001/api-docs")
    else:
        print("\n[WARNING] Swagger documentation not available")
    print("\nStarting server on port 5001...")
    print("="*70)
    app.run(host='0.0.0.0', port=5001, debug=True)
