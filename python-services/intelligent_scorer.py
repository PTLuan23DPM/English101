"""
Intelligent Scorer
New prompt-aware scoring system that:
1. Analyzes the prompt to understand requirements
2. Validates if essay addresses the prompt
3. Assesses writing quality
4. Produces accurate, scalable scores

This system works for ANY prompt without retraining
"""

import json
from typing import Dict, List, Optional, Tuple

# Import our new modules
try:
    from prompt_analyzer import analyze_prompt
    from content_validator import validate_content
    from quality_assessor import assess_quality
    MODULES_AVAILABLE = True
except ImportError as e:
    print(f"[Intelligent Scorer] Module import error: {e}")
    MODULES_AVAILABLE = False


def calculate_word_count_score(essay: str, target_word_count: Dict) -> Dict:
    """
    Calculate score based on word count compliance
    """
    words = essay.split()
    word_count = len(words)
    
    minimum = target_word_count.get('minimum', 50)
    maximum = target_word_count.get('maximum', 300)
    target = target_word_count.get('target', 150)
    
    # Score calculation
    if word_count < minimum:
        # Too short - penalize significantly
        ratio = word_count / minimum
        score = int(ratio * 70)  # Max 70 if just under minimum
        feedback = f"Too short: {word_count} words (minimum: {minimum})"
        penalty = 0.7
    elif word_count > maximum:
        # Too long - minor penalty
        score = 85
        feedback = f"Slightly too long: {word_count} words (maximum: {maximum})"
        penalty = 0.95
    elif minimum <= word_count <= target:
        # In range but below target
        ratio = (word_count - minimum) / (target - minimum)
        score = int(70 + ratio * 20)  # 70-90
        feedback = f"Good length: {word_count} words"
        penalty = 1.0
    else:
        # Target to maximum - optimal
        score = 90 + min((word_count - target) / (maximum - target) * 10, 10)
        feedback = f"Excellent length: {word_count} words"
        penalty = 1.0
    
    return {
        "word_count": word_count,
        "target_range": f"{minimum}-{maximum}",
        "score": int(score),
        "feedback": feedback,
        "penalty_multiplier": penalty
    }


def calculate_final_score(
    content_validation: Dict,
    quality_assessment: Dict,
    word_count_result: Dict,
    scoring_emphasis: Dict
) -> Dict:
    """
    Calculate final score with weighted criteria
    """
    # If off-topic, return 0 immediately
    if not content_validation.get('is_on_topic', True):
        return {
            "overall_score": 0.0,
            "cefr_level": "N/A",
            "band": "Off-topic",
            "detailed_scores": {
                "task_response": 0,
                "vocabulary": 0,
                "grammar": 0,
                "coherence": 0
            },
            "is_off_topic": True,
            "off_topic_reason": content_validation.get('off_topic_reason', 'Content does not address the prompt')
        }
    
    # Get emphasis weights (default if not provided)
    emphasis = {
        "task_response": scoring_emphasis.get('task_response', 0.35),
        "vocabulary": scoring_emphasis.get('vocabulary', 0.25),
        "grammar": scoring_emphasis.get('grammar', 0.25),
        "coherence": scoring_emphasis.get('coherence', 0.15)
    }
    
    # Calculate component scores (0-100)
    task_response_score = content_validation.get('overall_relevance', 70)
    vocabulary_score = quality_assessment.get('vocabulary', {}).get('score', 70)
    grammar_score = quality_assessment.get('grammar', {}).get('score', 70)
    coherence_score = quality_assessment.get('coherence', {}).get('score', 70)
    
    # Apply word count penalty to task response
    word_count_penalty = word_count_result.get('penalty_multiplier', 1.0)
    task_response_score = int(task_response_score * word_count_penalty)
    
    # Calculate weighted average
    overall_score = (
        task_response_score * emphasis['task_response'] +
        vocabulary_score * emphasis['vocabulary'] +
        grammar_score * emphasis['grammar'] +
        coherence_score * emphasis['coherence']
    )
    
    # Convert to 10-point scale
    score_10 = overall_score / 10.0
    
    # Determine CEFR level
    if score_10 >= 9.0:
        cefr_level = "C2"
        band = "Excellent"
    elif score_10 >= 8.0:
        cefr_level = "C1"
        band = "Very Good"
    elif score_10 >= 7.0:
        cefr_level = "B2"
        band = "Good"
    elif score_10 >= 6.0:
        cefr_level = "B1"
        band = "Satisfactory"
    elif score_10 >= 5.0:
        cefr_level = "A2"
        band = "Fair"
    elif score_10 >= 3.0:
        cefr_level = "A1"
        band = "Basic"
    else:
        cefr_level = "Pre-A1"
        band = "Very Limited"
    
    return {
        "overall_score": round(score_10, 2),
        "score_100": round(overall_score, 1),
        "cefr_level": cefr_level,
        "band": band,
        "detailed_scores": {
            "task_response": round(task_response_score / 10, 1),
            "vocabulary": round(vocabulary_score / 10, 1),
            "grammar": round(grammar_score / 10, 1),
            "coherence": round(coherence_score / 10, 1)
        },
        "raw_scores_100": {
            "task_response": task_response_score,
            "vocabulary": vocabulary_score,
            "grammar": grammar_score,
            "coherence": coherence_score
        },
        "is_off_topic": False,
        "scoring_weights": emphasis
    }


def score_essay_intelligent(
    essay: str,
    prompt: str,
    task_level: str = "B2",
    task_type: Optional[str] = None
) -> Dict:
    """
    Main function: Score essay using intelligent prompt-aware system
    
    Args:
        essay: Student's essay text
        prompt: Writing prompt/task description
        task_level: CEFR level (A1, A2, B1, B2, C1, C2)
        task_type: Optional task type override
    
    Returns:
        Complete scoring result with detailed feedback
    """
    if not MODULES_AVAILABLE:
        return {
            "error": "Intelligent scoring modules not available",
            "overall_score": 0.0
        }
    
    # Step 1: Analyze the prompt
    print(f"[Intelligent Scorer] Step 1: Analyzing prompt...")
    prompt_analysis = analyze_prompt(prompt, task_level)
    
    if not prompt_analysis:
        return {
            "error": "Failed to analyze prompt",
            "overall_score": 0.0
        }
    
    print(f"[Intelligent Scorer] Prompt analysis: {prompt_analysis.get('main_topic')} ({prompt_analysis.get('task_type')})")
    
    # Step 2: Validate content relevance
    print(f"[Intelligent Scorer] Step 2: Validating content...")
    content_validation = validate_content(essay, prompt, prompt_analysis, task_level)
    
    if not content_validation:
        return {
            "error": "Failed to validate content",
            "overall_score": 0.0
        }
    
    print(f"[Intelligent Scorer] Content validation: On-topic={content_validation.get('is_on_topic')}, Relevance={content_validation.get('overall_relevance')}%")
    
    # If off-topic, return 0 immediately
    if not content_validation.get('is_on_topic', True) and content_validation.get('overall_relevance', 100) < 50:
        print(f"[Intelligent Scorer] Essay is OFF-TOPIC. Returning 0 scores.")
        return {
            "overall_score": 0.0,
            "cefr_level": "N/A",
            "band": "Off-topic",
            "detailed_scores": {
                "task_response": {
                    "score": 0.0,
                    "feedback": [f"⚠️ {content_validation.get('off_topic_reason', 'Your response does not address the prompt topic')}"]
                },
                "vocabulary": {
                    "score": 0.0,
                    "feedback": ["Response is off-topic"]
                },
                "grammar": {
                    "score": 0.0,
                    "feedback": ["Response is off-topic"]
                },
                "coherence": {
                    "score": 0.0,
                    "feedback": ["Response is off-topic"]
                }
            },
            "word_count": len(essay.split()),
            "is_off_topic": True,
            "off_topic_reason": content_validation.get('off_topic_reason'),
            "confidence": content_validation.get('confidence', 0.9),
            "prompt_analysis": prompt_analysis,
            "scoring_method": "intelligent_v2"
        }
    
    # Step 3: Assess writing quality
    print(f"[Intelligent Scorer] Step 3: Assessing quality...")
    quality_assessment = assess_quality(essay, task_level)
    
    if not quality_assessment:
        return {
            "error": "Failed to assess quality",
            "overall_score": 0.0
        }
    
    print(f"[Intelligent Scorer] Quality: Vocab={quality_assessment.get('vocabulary', {}).get('score', 0)}, Grammar={quality_assessment.get('grammar', {}).get('score', 0)}")
    
    # Step 4: Check word count
    print(f"[Intelligent Scorer] Step 4: Checking word count...")
    word_count_result = calculate_word_count_score(essay, prompt_analysis.get('word_count', {}))
    
    print(f"[Intelligent Scorer] Word count: {word_count_result['word_count']} (score: {word_count_result['score']})")
    
    # Step 5: Calculate final score
    print(f"[Intelligent Scorer] Step 5: Calculating final score...")
    final_score = calculate_final_score(
        content_validation,
        quality_assessment,
        word_count_result,
        prompt_analysis.get('scoring_emphasis', {})
    )
    
    print(f"[Intelligent Scorer] ✓ Final score: {final_score['overall_score']}/10 ({final_score['cefr_level']})")
    
    # Step 6: Compile detailed feedback
    feedback = {
        "task_response": {
            "score": final_score['detailed_scores']['task_response'],
            "feedback": [
                f"✓ Topic Relevance: {content_validation.get('topic_relevance_score', 0)}%",
                f"✓ Required Elements: {len(content_validation.get('addressed_elements', []))}/{len(content_validation.get('addressed_elements', [])) + len(content_validation.get('missing_elements', []))}",
                f"✓ Word Count: {word_count_result['feedback']}",
            ]
        },
        "vocabulary": {
            "score": final_score['detailed_scores']['vocabulary'],
            "feedback": []
        },
        "grammar": {
            "score": final_score['detailed_scores']['grammar'],
            "feedback": []
        },
        "coherence": {
            "score": final_score['detailed_scores']['coherence'],
            "feedback": []
        }
    }
    
    # Add quality feedback
    if quality_assessment.get('source') == 'gemini':
        # Use Gemini feedback
        vocab_fb = quality_assessment.get('vocabulary', {}).get('feedback', {})
        if vocab_fb.get('suggestions'):
            feedback['vocabulary']['feedback'].extend([f"💡 {s}" for s in vocab_fb['suggestions'][:2]])
        
        grammar_fb = quality_assessment.get('grammar', {}).get('feedback', {})
        if grammar_fb.get('errors'):
            feedback['grammar']['feedback'].extend([f"⚠️ {e}" for e in grammar_fb['errors'][:3]])
        if grammar_fb.get('suggestions'):
            feedback['grammar']['feedback'].extend([f"💡 {s}" for s in grammar_fb['suggestions'][:2]])
        
        coherence_fb = quality_assessment.get('coherence', {}).get('feedback', {})
        if coherence_fb.get('suggestions'):
            feedback['coherence']['feedback'].extend([f"💡 {s}" for s in coherence_fb['suggestions'][:2]])
    else:
        # Use metric-based feedback
        vocab_metrics = quality_assessment.get('vocabulary', {}).get('metrics', {})
        feedback['vocabulary']['feedback'].append(f"Lexical diversity: {vocab_metrics.get('lexical_diversity', 0):.1%}")
        feedback['vocabulary']['feedback'].append(f"Unique words: {vocab_metrics.get('unique_words', 0)}/{vocab_metrics.get('total_words', 0)}")
        
        grammar_metrics = quality_assessment.get('grammar', {}).get('metrics', {})
        feedback['grammar']['feedback'].append(f"Avg sentence length: {grammar_metrics.get('avg_sentence_length', 0):.1f} words")
        
        coherence_metrics = quality_assessment.get('coherence', {}).get('metrics', {})
        feedback['coherence']['feedback'].append(f"Paragraphs: {coherence_metrics.get('num_paragraphs', 0)}")
        feedback['coherence']['feedback'].append(f"Linking words: {coherence_metrics.get('linking_words_count', 0)}")
    
    # Add content validation feedback
    if content_validation.get('feedback'):
        val_fb = content_validation['feedback']
        if val_fb.get('weaknesses'):
            feedback['task_response']['feedback'].extend([f"⚠️ {w}" for w in val_fb['weaknesses'][:2]])
        if val_fb.get('suggestions'):
            feedback['task_response']['feedback'].extend([f"💡 {s}" for s in val_fb['suggestions'][:2]])
    
    # Return complete result
    return {
        **final_score,
        "detailed_scores": feedback,
        "word_count": word_count_result['word_count'],
        "target_word_count": prompt_analysis['word_count'],
        "prompt_analysis": {
            "task_type": prompt_analysis.get('task_type'),
            "main_topic": prompt_analysis.get('main_topic'),
            "source": prompt_analysis.get('source')
        },
        "content_validation": {
            "on_topic": content_validation.get('is_on_topic'),
            "relevance": content_validation.get('overall_relevance'),
            "addressed_elements": content_validation.get('addressed_elements', []),
            "missing_elements": content_validation.get('missing_elements', [])
        },
        "quality_source": quality_assessment.get('source', 'rule_based'),
        "scoring_method": "intelligent_v2"
    }

