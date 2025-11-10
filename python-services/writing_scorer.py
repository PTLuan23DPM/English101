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

# Import task response analyzer
try:
    from task_response_analyzer import analyze_task_response_semantic
    TASK_RESPONSE_ANALYZER_AVAILABLE = True
except ImportError:
    TASK_RESPONSE_ANALYZER_AVAILABLE = False
    print("[WARNING] Task response analyzer not available, using basic keyword matching")

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
    """
    task_level_upper = task_level.upper() if task_level else 'B2'
    
    # CEFR-appropriate scoring ranges for each level
    # Lower levels: More lenient (higher base scores for same quality)
    # Higher levels: Stricter (lower base scores for same quality)
    level_expectations = {
        'A1': {'min': 5.0, 'good': 7.0, 'excellent': 8.5},  # Very lenient
        'A2': {'min': 5.5, 'good': 7.5, 'excellent': 9.0},  # Lenient
        'B1': {'min': 6.0, 'good': 7.5, 'excellent': 9.0},  # Moderate
        'B2': {'min': 6.5, 'good': 7.5, 'excellent': 9.0},  # Standard (IELTS-like)
        'C1': {'min': 7.0, 'good': 8.0, 'excellent': 9.5},  # Stricter
        'C2': {'min': 7.5, 'good': 8.5, 'excellent': 9.5},  # Very strict
    }
    
    expectations = level_expectations.get(task_level_upper, level_expectations['B2'])
    
    # If base score is already high (excellent), keep it high for any level
    if base_score >= 8.5:
        return min(10.0, base_score)
    
    # For lower levels, be more lenient - boost scores
    # For higher levels, be stricter - reduce scores slightly
    if task_level_upper in ['A1', 'A2']:
        # Very lenient: Boost scores by 0.5-1.0 points
        if base_score >= expectations['good']:
            return min(10.0, base_score + 0.3)
        elif base_score >= expectations['min']:
            return min(10.0, base_score + 0.5)
        else:
            return min(10.0, base_score + 0.8)
    elif task_level_upper == 'B1':
        # Lenient: Boost scores slightly
        if base_score >= expectations['good']:
            return min(10.0, base_score + 0.2)
        elif base_score >= expectations['min']:
            return min(10.0, base_score + 0.3)
        else:
            return min(10.0, base_score + 0.5)
    elif task_level_upper in ['B2']:
        # Standard: Keep scores as-is (IELTS-like)
        return base_score
    elif task_level_upper in ['C1', 'C2']:
        # Stricter: Slightly reduce scores for lower quality, keep high scores
        if base_score >= expectations['good']:
            return base_score  # Keep high scores
        elif base_score >= expectations['min']:
            return max(0.0, base_score - 0.2)  # Slight reduction
        else:
            return max(0.0, base_score - 0.5)  # More reduction for low quality
    
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


def get_detailed_feedback(text: str, score_10: float, prompt: str = "", task: Optional[Dict] = None) -> Dict:
    """Generate detailed feedback based on 10-point scale score and task requirements
    Uses CEFR-based scoring instead of pure IELTS criteria
    For sentence/paragraph tasks, uses task-specific scoring (much more lenient)"""
    
    word_count = len(text.split())
    sentence_count = len(re.split(r'[.!?]+', text))
    unique_words = len(set(text.lower().split()))
    paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
    paragraph_count = len(paragraphs)
    
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
    
    # ========== TASK RESPONSE SCORING (CEFR-based, task-specific) ==========
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
    
    task_response_feedback = []
    task_compliance_bonus = 0.0
    task_compliance_penalty = 0.0
    
    # Check task-specific requirements from prompt (sentence count, tense, etc.)
    if prompt:
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
    
    # Use semantic analysis for task response if available
    semantic_analysis_success = False
    if TASK_RESPONSE_ANALYZER_AVAILABLE and prompt:
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
            # Trust semantic analysis more for task response (it understands context better)
            # But don't penalize too harshly - be lenient
            score_diff = semantic_task_score - task_response_score_10
            if abs(score_diff) > 1.5:
                # Significant difference - trust semantic analysis more
                # But if semantic is much lower, be cautious (might be false negative)
                if semantic_task_score < task_response_score_10:
                    # Semantic says lower - use weighted average (don't penalize too much)
                    task_response_score_10 = semantic_task_score * 0.4 + task_response_score_10 * 0.6
                else:
                    # Semantic says higher - trust it more
                    task_response_score_10 = semantic_task_score * 0.7 + task_response_score_10 * 0.3
            elif abs(score_diff) > 0.5:
                # Moderate difference - use balanced average
                task_response_score_10 = semantic_task_score * 0.6 + task_response_score_10 * 0.4
            else:
                # Similar scores - use weighted average favoring semantic
                task_response_score_10 = semantic_task_score * 0.55 + task_response_score_10 * 0.45
            
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
    if not semantic_analysis_success and prompt:
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
    # For simple tasks, don't penalize paragraph structure heavily
    if is_simple_task:
        # Sentence/paragraph tasks don't need strict paragraph structure
        if paragraph_count >= 1:
            task_response_feedback.append("Good structure for this task type")
            task_compliance_bonus += 0.2
        # No penalty for simple tasks
    else:
        # Essay tasks need proper paragraph structure
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
    # For simple tasks, be more lenient with word count
    if is_simple_task:
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
    else:
        # Essay tasks: strict word count requirements
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
    task_response_score_10 = task_response_score_10 + task_compliance_bonus - task_compliance_penalty
    task_response_score_10 = max(0.0, min(10.0, task_response_score_10))
    
    # Coherence and Cohesion - CEFR-appropriate expectations
    # For simple tasks, start with higher base score and be very lenient
    if is_simple_task and is_lower_level:
        coherence_score_10 = min(10.0, score_10 + 1.2)  # Significant boost
    elif is_simple_task:
        coherence_score_10 = min(10.0, score_10 + 0.8)  # Moderate boost
    elif is_lower_level:
        coherence_score_10 = min(10.0, score_10 + 0.6)  # Small boost
    else:
        coherence_score_10 = score_10
    
    coherence_feedback = []
    coherence_bonus = 0.0
    coherence_penalty = 0.0
    
    # CEFR-appropriate expectations (more lenient for lower levels and simple tasks)
    if is_simple_task:
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
    if is_simple_task:
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
    
    coherence_score_10 = coherence_score_10 + coherence_bonus - coherence_penalty
    coherence_score_10 = max(0.0, min(10.0, coherence_score_10))
    
    # Lexical Resource - CEFR-appropriate expectations
    # For simple tasks at lower levels, be very lenient (vocabulary is simple by design)
    if is_simple_task and is_lower_level:
        lexical_score_10 = min(10.0, score_10 + 1.0)  # Significant boost
    elif is_simple_task:
        lexical_score_10 = min(10.0, score_10 + 0.6)  # Moderate boost
    elif is_lower_level:
        lexical_score_10 = min(10.0, score_10 + 0.5)  # Small boost
    else:
        lexical_score_10 = score_10
    
    lexical_diversity = unique_words / word_count if word_count > 0 else 0
    lexical_feedback = []
    lexical_bonus = 0.0
    lexical_penalty = 0.0
    
    # CEFR-appropriate lexical diversity expectations
    # For simple tasks, vocabulary diversity is less important
    if is_simple_task:
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
    
    lexical_score_10 = lexical_score_10 + lexical_bonus - lexical_penalty
    lexical_score_10 = max(0.0, min(10.0, lexical_score_10))
    
    # Grammatical Range and Accuracy - CEFR-appropriate expectations
    # For simple tasks at lower levels, be very lenient (simple sentences are expected)
    if is_simple_task and is_lower_level:
        grammar_score_10 = min(10.0, score_10 + 1.2)  # Significant boost
    elif is_simple_task:
        grammar_score_10 = min(10.0, score_10 + 0.8)  # Moderate boost
    elif is_lower_level:
        grammar_score_10 = min(10.0, score_10 + 0.6)  # Small boost
    else:
        grammar_score_10 = score_10
    
    grammar_feedback = []
    grammar_bonus = 0.0
    grammar_penalty = 0.0
    
    avg_sentence_length = word_count / sentence_count if sentence_count > 0 else 0
    
    # CEFR-appropriate sentence length and complexity expectations
    # For simple tasks, simple sentences are expected and correct
    if is_simple_task:
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
    if is_simple_task:
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
    
    grammar_score_10 = grammar_score_10 + grammar_bonus - grammar_penalty
    grammar_score_10 = max(0.0, min(10.0, grammar_score_10))
    
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
        }
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
        
        # Weighted average
        overall_score = (
            task_response_score * 0.30 +
            coherence_score * 0.25 +
            lexical_score * 0.25 +
            grammar_score * 0.20
        )
        
        # Ensure overall score is within valid range
        overall_score = max(0.0, min(10.0, overall_score))
        
        return jsonify({
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
            'using_fallback': model_type == 'Fallback'
        })
        
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
        
        # Get detailed feedback (prompt and task are optional, but task helps with task-based scoring)
        detailed_feedback = get_detailed_feedback(text, score_10, prompt, task)
        
        # Calculate overall score with weighted average
        # Task Response is most important (30%), then Coherence (25%), Lexical (25%), Grammar (20%)
        # This better reflects the importance of addressing the prompt correctly
        task_response_score = detailed_feedback['task_response']['score']
        coherence_score = detailed_feedback['coherence_cohesion']['score']
        lexical_score = detailed_feedback['lexical_resource']['score']
        grammar_score = detailed_feedback['grammatical_range']['score']
        
        # Weighted average
        overall_score = (
            task_response_score * 0.30 +
            coherence_score * 0.25 +
            lexical_score * 0.25 +
            grammar_score * 0.20
        )
        
        # Ensure overall score is within valid range
        overall_score = max(0.0, min(10.0, overall_score))
        
        return jsonify({
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
            'using_ai_model': model_type != 'Fallback' and model_type != 'Traditional'
        })
        
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
