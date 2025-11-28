"""
Quality Assessor
Assesses writing quality: vocabulary diversity, grammar accuracy, coherence
Language-agnostic quality metrics that work for any prompt
"""

import re
import json
import requests
import os
from typing import Dict, List, Optional, Tuple
from collections import Counter
from pathlib import Path

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    # Try to load .env from project root (parent of python-services)
    env_path = Path(__file__).parent.parent / '.env'
    if env_path.exists():
        load_dotenv(env_path)
    else:
        # Try current directory
        load_dotenv()
except ImportError:
    # dotenv not available, try to load manually
    env_path = Path(__file__).parent.parent / '.env'
    if env_path.exists():
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key.strip()] = value.strip().strip('"').strip("'")
except Exception:
    pass

# Common English words dictionary for basic spell checking
COMMON_ENGLISH_WORDS = {
    'i', 'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could',
    'can', 'may', 'might', 'must', 'shall', 'this', 'that', 'these', 'those',
    'he', 'she', 'it', 'they', 'we', 'you', 'me', 'him', 'her', 'us', 'them',
    'my', 'your', 'his', 'her', 'its', 'our', 'their', 'mine', 'yours', 'hers', 'ours', 'theirs',
    'what', 'which', 'who', 'whom', 'whose', 'where', 'when', 'why', 'how',
    'and', 'or', 'but', 'so', 'because', 'if', 'then', 'else', 'while', 'until',
    'for', 'with', 'from', 'to', 'in', 'on', 'at', 'by', 'of', 'about', 'into', 'through',
    'during', 'before', 'after', 'above', 'below', 'up', 'down', 'out', 'off', 'over', 'under',
    'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how',
    'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such',
    'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
    'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'first', 'second', 'third', 'last', 'next', 'previous', 'new', 'old', 'good', 'bad',
    'big', 'small', 'large', 'little', 'long', 'short', 'high', 'low', 'early', 'late',
    'young', 'old', 'right', 'wrong', 'true', 'false', 'yes', 'no', 'maybe',
    'go', 'went', 'gone', 'come', 'came', 'get', 'got', 'give', 'gave', 'given',
    'take', 'took', 'taken', 'make', 'made', 'see', 'saw', 'seen', 'know', 'knew', 'known',
    'think', 'thought', 'say', 'said', 'tell', 'told', 'ask', 'asked', 'want', 'wanted',
    'need', 'needed', 'try', 'tried', 'use', 'used', 'work', 'worked', 'play', 'played',
    'like', 'liked', 'love', 'loved', 'help', 'helped', 'look', 'looked', 'find', 'found',
    'time', 'day', 'week', 'month', 'year', 'hour', 'minute', 'second', 'morning', 'afternoon', 'evening', 'night',
    'today', 'yesterday', 'tomorrow', 'now', 'then', 'soon', 'later', 'always', 'often', 'sometimes', 'never',
    'house', 'home', 'room', 'door', 'window', 'table', 'chair', 'bed', 'kitchen', 'bathroom',
    'food', 'water', 'bread', 'milk', 'meat', 'fruit', 'vegetable', 'breakfast', 'lunch', 'dinner',
    'friend', 'family', 'mother', 'father', 'parent', 'brother', 'sister', 'son', 'daughter',
    'school', 'student', 'teacher', 'class', 'book', 'read', 'write', 'study', 'learn',
    'sport', 'football', 'basketball', 'tennis', 'swim', 'run', 'walk', 'exercise',
    'music', 'song', 'listen', 'watch', 'movie', 'film', 'television', 'tv',
    'weekend', 'holiday', 'vacation', 'travel', 'trip', 'visit', 'cafe', 'park', 'relax', 'refresh'
}

def detect_spelling_errors(text: str) -> Tuple[List[str], int, float]:
    """
    Detect spelling errors in text - ONLY detect known misspellings
    Returns: (list of misspelled words, count, error_rate)
    
    CRITICAL: Only flag words that are KNOWN misspellings, not unknown words.
    Unknown words (like "whether", "university", "education") are likely correct
    and should NOT be flagged as errors.
    """
    words = re.findall(r'\b[a-zA-Z]+\b', text.lower())
    
    if not words:
        return [], 0, 0.0
    
    # CRITICAL: Only check against KNOWN misspellings dictionary
    # Do NOT flag unknown words as errors - they are likely correct
    common_misspellings = {
        'enjyo': 'enjoy', 'ofnet': 'often', 'goé': 'go', 'wacths': 'watch',
        'litsen': 'listen', 'slep': 'sleep', 'weekoinds': 'weekends',
        'favoriaete': 'favorite', 'reafreashed': 'refreshed', 'realaxed': 'relaxed',
        'teh': 'the', 'adn': 'and', 'taht': 'that', 'recieve': 'receive',
        'seperate': 'separate', 'occured': 'occurred', 'definately': 'definitely',
        'accomodate': 'accommodate', 'begining': 'beginning', 'beleive': 'believe',
        'calender': 'calendar', 'cemetary': 'cemetery', 'definately': 'definitely',
        'existance': 'existence', 'goverment': 'government', 'independant': 'independent',
        'neccessary': 'necessary', 'occured': 'occurred', 'priviledge': 'privilege',
        'seperate': 'separate', 'suprise': 'surprise', 'thier': 'their',
        'tommorrow': 'tomorrow', 'truely': 'truly', 'untill': 'until'
    }
    
    misspelled = []
    for word in words:
        # Skip very short words (likely correct)
        if len(word) <= 2:
            continue
        
        # ONLY flag if word is in known misspellings dictionary
        if word in common_misspellings:
            misspelled.append(f"{word} (should be '{common_misspellings[word]}')")
        # Do NOT flag unknown words - they are likely correct
        # (e.g., "whether", "university", "education" are correct but not in COMMON_ENGLISH_WORDS)
    
    error_count = len(misspelled)
    error_rate = error_count / len(words) if words else 0.0
    
    return misspelled[:10], error_count, error_rate  # Return first 10 errors


def calculate_vocabulary_metrics(text: str, task_level: str = "B2") -> Dict:
    """
    Calculate vocabulary diversity and sophistication metrics
    """
    # Tokenize
    words = re.findall(r'\b[a-zA-Z]+\b', text.lower())
    
    if not words:
        return {
            "total_words": 0,
            "unique_words": 0,
            "lexical_diversity": 0.0,
            "avg_word_length": 0.0,
            "sophisticated_words": 0,
            "score": 0
        }
    
    # Basic metrics
    total_words = len(words)
    unique_words = len(set(words))
    lexical_diversity = unique_words / total_words if total_words > 0 else 0.0
    avg_word_length = sum(len(w) for w in words) / total_words
    
    # Sophisticated words (length >= 7)
    sophisticated_words = sum(1 for w in words if len(w) >= 7)
    sophisticated_ratio = sophisticated_words / total_words if total_words > 0 else 0.0
    
    # Level-based thresholds
    level_thresholds = {
        'A1': {'diversity': 0.50, 'avg_length': 3.5, 'sophisticated': 0.05},
        'A2': {'diversity': 0.55, 'avg_length': 4.0, 'sophisticated': 0.08},
        'B1': {'diversity': 0.60, 'avg_length': 4.5, 'sophisticated': 0.12},
        'B2': {'diversity': 0.65, 'avg_length': 5.0, 'sophisticated': 0.15},
        'C1': {'diversity': 0.70, 'avg_length': 5.5, 'sophisticated': 0.20},
        'C2': {'diversity': 0.75, 'avg_length': 6.0, 'sophisticated': 0.25},
    }
    
    thresholds = level_thresholds.get(task_level, level_thresholds['B2'])
    
    # Calculate score (0-100)
    diversity_score = min(lexical_diversity / thresholds['diversity'], 1.0) * 40
    length_score = min(avg_word_length / thresholds['avg_length'], 1.0) * 30
    sophistication_score = min(sophisticated_ratio / thresholds['sophisticated'], 1.0) * 30
    
    # Apply stricter scaling so high scores really require strong vocabulary
    base_vocab_score = diversity_score + length_score + sophistication_score
    # Slightly more strict for higher levels
    if task_level in ['C1', 'C2', 'B2']:
        strict_factor = 0.8
    elif task_level in ['B1']:
        strict_factor = 0.85
    else:
        strict_factor = 0.9
    vocabulary_score = int(base_vocab_score * strict_factor)
    vocabulary_score = max(0, min(100, vocabulary_score))
    
    return {
        "total_words": total_words,
        "unique_words": unique_words,
        "lexical_diversity": round(lexical_diversity, 3),
        "avg_word_length": round(avg_word_length, 2),
        "sophisticated_words": sophisticated_words,
        "sophisticated_ratio": round(sophisticated_ratio, 3),
        "score": vocabulary_score
    }


def calculate_grammar_metrics(text: str, task_level: str = "B2") -> Dict:
    """
    Calculate basic grammar metrics
    (For detailed grammar, would need external API or LLM)
    """
    # Count sentences
    sentences = [s.strip() for s in re.split(r'[.!?]+', text) if s.strip()]
    num_sentences = len(sentences)
    
    if num_sentences == 0:
        return {"score": 0, "avg_sentence_length": 0, "sentence_variety": 0}
    
    # Sentence lengths
    sentence_lengths = [len(s.split()) for s in sentences]
    avg_sentence_length = sum(sentence_lengths) / num_sentences
    
    # Sentence variety (standard deviation of lengths)
    if num_sentences > 1:
        mean_len = avg_sentence_length
        variance = sum((l - mean_len) ** 2 for l in sentence_lengths) / num_sentences
        std_dev = variance ** 0.5
        sentence_variety = min(std_dev / 5.0, 1.0)  # Normalize
    else:
        sentence_variety = 0.0
    
    # Check for basic punctuation
    has_commas = ',' in text
    has_complex_punct = any(p in text for p in [';', ':', '—', '–'])
    
    # Level-based expectations
    level_expectations = {
        'A1': {'min_length': 5, 'max_length': 15, 'variety': 0.3},
        'A2': {'min_length': 6, 'max_length': 18, 'variety': 0.4},
        'B1': {'min_length': 8, 'max_length': 20, 'variety': 0.5},
        'B2': {'min_length': 10, 'max_length': 25, 'variety': 0.6},
        'C1': {'min_length': 12, 'max_length': 30, 'variety': 0.7},
        'C2': {'min_length': 15, 'max_length': 35, 'variety': 0.8},
    }
    
    expectations = level_expectations.get(task_level, level_expectations['B2'])
    
    # Calculate score
    length_score = 40
    if avg_sentence_length < expectations['min_length']:
        length_score = int(avg_sentence_length / expectations['min_length'] * 40)
    elif avg_sentence_length > expectations['max_length']:
        length_score = 30  # Penalize overly long sentences
    
    variety_score = min(sentence_variety / expectations['variety'], 1.0) * 40
    
    punct_score = 10 if has_commas else 5
    punct_score += 10 if has_complex_punct else 0
    
    base_grammar_score = length_score + variety_score + punct_score
    # Grammar should be penalized more strongly at higher levels
    if task_level in ['C1', 'C2', 'B2']:
        strict_factor = 0.8
    elif task_level in ['B1']:
        strict_factor = 0.85
    else:
        strict_factor = 0.9
    grammar_score = int(base_grammar_score * strict_factor)
    
    return {
        "num_sentences": num_sentences,
        "avg_sentence_length": round(avg_sentence_length, 1),
        "sentence_variety": round(sentence_variety, 2),
        "has_complex_punctuation": has_complex_punct,
        "score": min(grammar_score, 100)
    }


def calculate_coherence_metrics(text: str, task_level: str = "B2") -> Dict:
    """
    Calculate coherence and organization metrics
    """
    # Count paragraphs (double newline or significant spacing)
    paragraphs = [p.strip() for p in re.split(r'\n\s*\n', text) if p.strip()]
    num_paragraphs = len(paragraphs)
    
    # Linking words/phrases
    linking_words = [
        'first', 'second', 'third', 'finally', 'however', 'moreover', 'furthermore',
        'therefore', 'thus', 'consequently', 'additionally', 'also', 'besides',
        'in addition', 'on the other hand', 'in contrast', 'similarly', 'likewise',
        'for example', 'for instance', 'such as', 'in conclusion', 'to sum up'
    ]
    
    text_lower = text.lower()
    linking_count = sum(1 for word in linking_words if word in text_lower)
    
    # Check for logical structure
    has_introduction = any(text_lower.startswith(phrase) for phrase in ['i', 'my', 'in my', 'this essay', 'today'])
    has_conclusion = any(phrase in text_lower[-200:] for phrase in ['in conclusion', 'to sum up', 'finally', 'in summary'])
    
    # Level-based expectations
    level_expectations = {
        'A1': {'min_paragraphs': 1, 'min_linking': 2},
        'A2': {'min_paragraphs': 1, 'min_linking': 3},
        'B1': {'min_paragraphs': 2, 'min_linking': 4},
        'B2': {'min_paragraphs': 3, 'min_linking': 5},
        'C1': {'min_paragraphs': 3, 'min_linking': 7},
        'C2': {'min_paragraphs': 4, 'min_linking': 10},
    }
    
    expectations = level_expectations.get(task_level, level_expectations['B2'])
    
    # Calculate score
    paragraph_score = min(num_paragraphs / expectations['min_paragraphs'], 1.0) * 40
    linking_score = min(linking_count / expectations['min_linking'], 1.0) * 40
    structure_score = 10 if has_introduction else 0
    structure_score += 10 if has_conclusion else 0
    
    base_coherence_score = paragraph_score + linking_score + structure_score
    # Coherence also slightly stricter for higher levels
    if task_level in ['C1', 'C2', 'B2']:
        strict_factor = 0.85
    elif task_level in ['B1']:
        strict_factor = 0.9
    else:
        strict_factor = 0.95
    coherence_score = int(base_coherence_score * strict_factor)
    
    return {
        "num_paragraphs": num_paragraphs,
        "linking_words_count": linking_count,
        "has_introduction": has_introduction,
        "has_conclusion": has_conclusion,
        "score": coherence_score
    }


def assess_quality_with_gemini(
    essay: str,
    task_level: str = "B2",
) -> Optional[Dict]:
    """Use Gemini to assess writing quality with detailed feedback (strict mode)."""
    gemini_api_key = os.environ.get("GEMINI_API_KEY")
    if not gemini_api_key:
        print("[Quality Assessor] Gemini API key not configured")
        return None

    spelling_errors, spelling_count, spelling_rate = detect_spelling_errors(essay)
    spelling_context = (
        f"Detected potential spelling errors: {', '.join(spelling_errors[:5])}"
        if spelling_errors
        else "No obvious spelling errors detected via dictionary check."
    )

    assessment_prompt = f"""
### ROLE
You are a DRACONIAN IELTS EXAMINER. You are NOT here to encourage. You are here to grade strictly based on CEFR/IELTS standards.
Your goal is to punish \"safe\" but \"simple\" writing.

### INPUT
Target Level: {task_level}
Pre-check: {spelling_context}
Essay:
\"{essay[:3500]}\"

### SCORING CRITERIA (STRICT ENFORCEMENT)

1. **Grammar (0-100)**:
   - **The Simplicity Penalty**: If the essay uses mostly simple sentences (Subject-Verb-Object) like \"I like football. It is fun.\", the MAXIMUM score is 50, even if there are ZERO errors.
   - **Complexity Requirement**: To score >60, there MUST be compound sentences. To score >70, there MUST be complex sentences (relative clauses, conditionals).
   - **Error Penalty**: Deduct 15 points for basic errors (subject-verb agreement, singular/plural).

2. **Vocabulary (0-100)**:
   - **The Basic Penalty**: If the essay relies on A1/A2 words (good, bad, nice, happy, thing), the MAXIMUM score is 55.
   - **Precision**: High scores (75+) require precise topic-specific collocations, not just \"big words\".
   - **Spelling**: If you see basic spelling errors (e.g., \"becuase\", \"wrok\"), deduct 10 points per error type.

3. **Coherence (0-100)**:
   - Deduct points if linking words are repetitive (e.g., starting every sentence with \"And\" or \"Also\").

### OUTPUT FORMAT (JSON ONLY)
{{
  \"vocabulary\": {{
    \"score\": <int>,
    \"range\": \"string\",
    \"accuracy\": \"string\",
    \"collocations\": \"string\",
    \"sophistication\": \"string\",
    \"errors\": [\"list\", \"of\", \"specific\", \"errors\"],
    \"suggestions\": [\"specific\", \"improvements\"]
  }},
  \"grammar\": {{
    \"score\": <int>,
    \"range\": \"string\",
    \"accuracy\": \"string\",
    \"sentence_structures\": [\"list\", \"structures\", \"found\"],
    \"errors\": [\"list\", \"of\", \"specific\", \"errors\"],
    \"suggestions\": [\"specific\", \"improvements\"]
  }},
  \"coherence\": {{
    \"score\": <int>,
    \"coherence\": \"string\",
    \"cohesion\": \"string\",
    \"organization\": \"string\",
    \"linking_words\": [\"list\", \"found\"],
    \"paragraph_structure\": \"string\",
    \"suggestions\": [\"string\"]
  }},
  \"mechanics\": {{
    \"score\": <int>,
    \"spelling_errors\": [\"list\"],
    \"punctuation_errors\": [\"list\"],
    \"capitalization_errors\": [\"list\"]
  }}
}}

BE HARSH. DO NOT INFLATE SCORES.
"""

    try:
        api_url = f"https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key={gemini_api_key}"
        response = requests.post(
            api_url,
            json={
                "contents": [{"parts": [{"text": assessment_prompt}]}],
                "generationConfig": {
                    "temperature": 0.1,
                    "responseMimeType": "application/json",
                },
            },
            timeout=15,
        )

        if response.status_code != 200:
            print(f"[Quality Assessor] Gemini API error: {response.status_code}")
            return None

        result = response.json()
        if "candidates" not in result or not result["candidates"]:
            return None

        content = result["candidates"][0]["content"]["parts"][0].get("text", "")
        if content.startswith("```json"):
            content = content[7:-3].strip()

        json_match = re.search(r"\{[\s\S]*\}", content)
        if not json_match:
            return None

        assessment = json.loads(json_match.group(0))
        print(
            f"[Quality Assessor] Gemini strict score - Vocab: {assessment.get('vocabulary', {}).get('score')}, Grammar: {assessment.get('grammar', {}).get('score')}"
        )
        return assessment

    except Exception as e:
        print(f"[Quality Assessor] Error: {e}")
        return None


def assess_quality(essay: str, task_level: str = "B2") -> Dict:
    """
    Main function to assess writing quality
    Combines rule-based metrics with optional Gemini assessment
    """
    # Calculate rule-based metrics (always available & fast)
    vocab_metrics = calculate_vocabulary_metrics(essay, task_level)
    grammar_metrics = calculate_grammar_metrics(essay, task_level)
    coherence_metrics = calculate_coherence_metrics(essay, task_level)
    
    # Try Gemini for detailed assessment
    gemini_assessment = assess_quality_with_gemini(essay, task_level)
    
    if gemini_assessment:
        # ----- Vocabulary score: trust Gemini but never above rule-based by too much -----
        vocab_fb = gemini_assessment.get("vocabulary", {}) or {}
        vocab_score_raw = vocab_fb.get("score", vocab_metrics["score"])
        # Allow Gemini to be slightly higher than rule-based, but cap the gap
        max_vocab = vocab_metrics["score"] + 10
        vocab_score = max(0, min(vocab_score_raw, max_vocab))

        # ----- Grammar score: penalize heavily if Gemini reports many errors -----
        grammar_fb = gemini_assessment.get("grammar", {}) or {}
        grammar_score_raw = grammar_fb.get("score", grammar_metrics["score"])
        grammar_errors = grammar_fb.get("errors", []) or []
        # 3 điểm / lỗi, tối đa 25 điểm penalty
        grammar_penalty = min(len(grammar_errors) * 3, 25)
        grammar_score_after_errors = max(0, grammar_score_raw - grammar_penalty)
        # Không cho grammar cao hơn rule-based quá nhiều (giữ strict khi cấu trúc câu đơn giản)
        max_grammar = grammar_metrics["score"] + 5
        grammar_score = max(0, min(grammar_score_after_errors, max_grammar))

        # ----- Coherence score: nhẹ hơn, chủ yếu tin Gemini nhưng vẫn cap -----
        coherence_fb = gemini_assessment.get("coherence", {}) or {}
        coherence_score_raw = coherence_fb.get("score", coherence_metrics["score"])
        max_coherence = coherence_metrics["score"] + 10
        coherence_score = max(0, min(coherence_score_raw, max_coherence))

        mechanics_fb = gemini_assessment.get("mechanics", {}) or {}
        mechanics_score = mechanics_fb.get("score", 95)

        return {
            "vocabulary": {
                "score": vocab_score,
                "metrics": vocab_metrics,
                "feedback": vocab_fb,
            },
            "grammar": {
                "score": grammar_score,
                "metrics": grammar_metrics,
                "feedback": grammar_fb,
            },
            "coherence": {
                "score": coherence_score,
                "metrics": coherence_metrics,
                "feedback": coherence_fb,
            },
            "mechanics": {
                "score": mechanics_score,
                "feedback": mechanics_fb,
            },
            "source": "gemini_strict",
        }
    else:
        # Use only rule-based metrics
        return {
            "vocabulary": {
                "score": vocab_metrics['score'],
                "metrics": vocab_metrics,
                "feedback": {"diversity": f"{vocab_metrics['lexical_diversity']:.1%}"}
            },
            "grammar": {
                "score": grammar_metrics['score'],
                "metrics": grammar_metrics,
                "feedback": {"avg_sentence_length": grammar_metrics['avg_sentence_length']}
            },
            "coherence": {
                "score": coherence_metrics['score'],
                "metrics": coherence_metrics,
                "feedback": {"paragraphs": coherence_metrics['num_paragraphs']}
            },
            "mechanics": {
                "score": 85,  # Default
                "feedback": {}
            },
            "source": "rule_based"
        }

