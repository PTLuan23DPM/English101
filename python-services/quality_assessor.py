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
    
    assessment_prompt = f"""You are an expert English writing quality assessor. Evaluate this essay's writing quality at {task_level} level.

Student's Essay:
"{essay[:3000]}"

Task Level: {task_level}

Evaluate these aspects and return ONLY valid JSON:

{{
  "vocabulary": {{
    "score": 85,
    "diversity": "good",
    "sophistication": "appropriate for level",
    "errors": ["repeated word 'very' too often"],
    "suggestions": ["Use synonyms: 'extremely', 'particularly'"]
  }},
  "grammar": {{
    "score": 80,
    "accuracy": "mostly accurate with minor errors",
    "sentence_variety": "good mix of simple and complex",
    "errors": ["Subject-verb agreement: 'people likes'", "Tense consistency issue"],
    "suggestions": ["Review subject-verb agreement", "Maintain consistent tense"]
  }},
  "coherence": {{
    "score": 85,
    "organization": "well-organized with clear paragraphs",
    "linking": "good use of transitional phrases",
    "flow": "ideas connect logically",
    "suggestions": ["Add topic sentences to paragraphs"]
  }},
  "mechanics": {{
    "score": 90,
    "spelling_errors": [],
    "punctuation_errors": ["Missing comma after introductory phrase"],
    "capitalization_errors": []
  }}
}}

Scoring Guidelines (0-100 for each):
- 90-100: Excellent, minimal errors
- 80-89: Good, few errors that don't impede understanding
- 70-79: Satisfactory, some errors but communication clear
- 60-69: Fair, frequent errors affect clarity
- Below 60: Poor, serious errors impede understanding

Be fair but accurate. Adjust expectations based on {task_level} level.
Return ONLY the JSON."""

    try:
        api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_api_key}"
        
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
            print(f"[Quality Assessor] Gemini API error: {response.status_code}")
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

