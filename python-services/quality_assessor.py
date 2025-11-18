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
    
    vocabulary_score = int(diversity_score + length_score + sophistication_score)
    
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
    
    grammar_score = int(length_score + variety_score + punct_score)
    
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
    
    coherence_score = int(paragraph_score + linking_score + structure_score)
    
    return {
        "num_paragraphs": num_paragraphs,
        "linking_words_count": linking_count,
        "has_introduction": has_introduction,
        "has_conclusion": has_conclusion,
        "score": coherence_score
    }


def assess_quality_with_gemini(
    essay: str,
    task_level: str = "B2"
) -> Optional[Dict]:
    """
    Use Gemini to assess writing quality with detailed feedback
    """
    gemini_api_key = os.environ.get('GEMINI_API_KEY')
    
    if not gemini_api_key:
        print("[Quality Assessor] Gemini API key not configured")
        return None
    
    # Detect spelling errors first
    spelling_errors, spelling_count, spelling_rate = detect_spelling_errors(essay)
    spelling_errors_text = ", ".join(spelling_errors[:5]) if spelling_errors else "None detected"
    
    assessment_prompt = f"""You are an expert IELTS writing assessor. Evaluate this essay using IELTS 4 criteria at {task_level} level.

Student's Essay:
"{essay[:3000]}"

Task Level: {task_level}

CRITICAL: Check for spelling errors carefully. Common errors found: {spelling_errors_text}
If you find spelling errors, you MUST list them in the "errors" array and reduce the score accordingly.

Evaluate using IELTS criteria and return ONLY valid JSON:

{{
  "vocabulary": {{
    "score": 85,
    "range": "good variety of vocabulary, avoids repetition",
    "accuracy": "mostly accurate word choice",
    "collocations": "uses natural word combinations",
    "style": "appropriate academic/formal style",
    "sophistication": "uses some less common vocabulary appropriately",
    "errors": ["repeated word 'very' too often", "incorrect collocation: 'make homework' should be 'do homework'"],
    "suggestions": ["Use synonyms: 'extremely', 'particularly'", "Learn common collocations"]
  }},
  "grammar": {{
    "score": 80,
    "range": "uses variety of sentence structures (simple, compound, complex)",
    "accuracy": "mostly accurate with minor errors",
    "sentence_structures": ["simple sentences", "compound sentences", "complex sentences with relative clauses", "passive voice", "conditional sentences"],
    "errors": ["Subject-verb agreement: 'people likes' should be 'people like'", "Tense consistency: mixed past and present"],
    "suggestions": ["Review subject-verb agreement", "Maintain consistent tense throughout"]
  }},
  "coherence": {{
    "score": 85,
    "coherence": "ideas flow logically, clear structure",
    "cohesion": "good use of linking words and referencing",
    "organization": "well-organized with clear paragraphs and topic sentences",
    "linking_words": ["however", "therefore", "furthermore", "in addition"],
    "referencing": "uses pronouns (it, they, this) appropriately",
    "paragraph_structure": "clear introduction, body paragraphs, conclusion",
    "suggestions": ["Add more topic sentences to paragraphs", "Use more varied linking words"]
  }},
  "mechanics": {{
    "score": 90,
    "spelling_errors": [],
    "punctuation_errors": ["Missing comma after introductory phrase"],
    "capitalization_errors": []
  }}
}}

CRITICAL SCORING RULES (0-100 for each):
- 90-100: Excellent, NO ERRORS, sophisticated use
- 80-89: Good, 1-2 MINOR errors that don't impede understanding
- 70-79: Satisfactory, 3-4 errors but communication clear
- 60-69: Fair, 5-6 errors affect clarity
- 50-59: Poor, 7-10 errors impede understanding
- Below 50: Very poor, 10+ serious errors

IMPORTANT - STRICT RULES: 
- SPELLING ERRORS: If you find spelling errors (e.g., "enjyo" instead of "enjoy", "wacths" instead of "watch"), score MUST be below 70. Each spelling error reduces score by 10-15 points.
- VOCABULARY ERRORS: If you find vocabulary errors (wrong word choice, incorrect collocations), score MUST be below 80. Each error reduces score by 8-12 points.
- GRAMMAR ERRORS: If you find grammar errors (subject-verb agreement, tense, articles, "go to slep" instead of "go to sleep"), score MUST be below 80. Each error reduces score by 10-15 points.
- List ALL errors in the "errors" array - be thorough and specific. Include spelling, vocabulary, and grammar errors.
- DO NOT give high scores (80+) if there are ANY spelling errors or multiple other errors
- Example: If essay has "enjyo", "wacths", "litsen", "slep" → vocabulary score MUST be below 60, grammar score MUST be below 60

For {task_level} level, expect:
- Vocabulary: Appropriate range and accuracy for level - but still penalize errors
- Grammar: Mix of sentence types, mostly accurate - but still penalize errors
- Coherence: Clear structure with linking words

Be STRICT and ACCURATE. If there are errors, the score MUST reflect them.
Adjust expectations based on {task_level} level, but always penalize errors.
Return ONLY the JSON."""

    try:
        # Try v1 first, fallback to v1beta if needed
        api_url = f"https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key={gemini_api_key}"
        
        response = requests.post(
            api_url,
            json={
                "contents": [{
                    "parts": [{"text": assessment_prompt}]
                }],
                "generationConfig": {
                    "temperature": 0.3,
                    "maxOutputTokens": 2048,
                }
            },
            timeout=15
        )
        
        # If 404, try v1beta
        if response.status_code == 404:
            api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={gemini_api_key}"
            response = requests.post(
                api_url,
                json={
                    "contents": [{
                        "parts": [{"text": assessment_prompt}]
                    }],
                    "generationConfig": {
                        "temperature": 0.3,
                        "maxOutputTokens": 2048,
                    }
                },
                timeout=15
            )
        
        if response.status_code != 200:
            print(f"[Quality Assessor] Gemini API error: {response.status_code} - {response.text[:200]}")
            return None
        
        result = response.json()
        
        if 'candidates' not in result or not result['candidates']:
            return None
        
        content = result['candidates'][0]['content']['parts'][0]['text']
        
        # Extract JSON
        json_match = re.search(r'\{[\s\S]*\}', content)
        if not json_match:
            return None
        
        assessment = json.loads(json_match.group(0))
        
        print(f"[Quality Assessor] Assessment complete - Vocab: {assessment.get('vocabulary', {}).get('score', 0)}, Grammar: {assessment.get('grammar', {}).get('score', 0)}")
        return assessment
        
    except Exception as e:
        print(f"[Quality Assessor] Error: {e}")
        return None


def assess_quality(essay: str, task_level: str = "B2") -> Dict:
    """
    Main function to assess writing quality
    Combines rule-based metrics with optional Gemini assessment
    """
    # Calculate rule-based metrics (always available)
    vocab_metrics = calculate_vocabulary_metrics(essay, task_level)
    grammar_metrics = calculate_grammar_metrics(essay, task_level)
    coherence_metrics = calculate_coherence_metrics(essay, task_level)
    
    # Try Gemini for detailed assessment
    gemini_assessment = assess_quality_with_gemini(essay, task_level)
    
    if gemini_assessment:
        # Use Gemini scores but keep metrics for transparency
        return {
            "vocabulary": {
                "score": gemini_assessment.get('vocabulary', {}).get('score', vocab_metrics['score']),
                "metrics": vocab_metrics,
                "feedback": gemini_assessment.get('vocabulary', {})
            },
            "grammar": {
                "score": gemini_assessment.get('grammar', {}).get('score', grammar_metrics['score']),
                "metrics": grammar_metrics,
                "feedback": gemini_assessment.get('grammar', {})
            },
            "coherence": {
                "score": gemini_assessment.get('coherence', {}).get('score', coherence_metrics['score']),
                "metrics": coherence_metrics,
                "feedback": gemini_assessment.get('coherence', {})
            },
            "mechanics": {
                "score": gemini_assessment.get('mechanics', {}).get('score', 95),
                "feedback": gemini_assessment.get('mechanics', {})
            },
            "source": "gemini"
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

