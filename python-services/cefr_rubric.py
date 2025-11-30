"""
CEFR Level-based Rubric
Defines scoring criteria, weights, and thresholds for different CEFR levels
"""

from typing import Dict, List, Tuple
import re


def get_cefr_level_group(level: str) -> str:
    """
    Group CEFR level into Beginner, Intermediate, or Advanced
    Returns: 'beginner', 'intermediate', or 'advanced'
    """
    level_upper = level.upper() if level else 'B2'
    
    if level_upper in ['A1', 'A2']:
        return 'beginner'
    elif level_upper in ['B1', 'B2']:
        return 'intermediate'
    else:  # C1, C2
        return 'advanced'


def get_level_rubric(level: str) -> Dict:
    """
    Get rubric configuration for a specific CEFR level
    Returns: {
        'level_group': str,
        'target_length': Dict with min/max words,
        'criteria_weights': Dict with weights for each criterion,
        'thresholds': Dict with thresholds for each criterion,
        'error_tolerance': Dict with error tolerance percentages
    }
    """
    level_group = get_cefr_level_group(level)
    level_upper = level.upper() if level else 'B2'
    
    if level_group == 'beginner':
        # Beginner (A1-A2)
        if level_upper == 'A1':
            target_length = {'min': 60, 'max': 100}
        else:  # A2
            target_length = {'min': 100, 'max': 150}
        
        return {
            'level_group': 'beginner',
            'target_length': target_length,
            'criteria_weights': {
                'task_fulfillment': 0.30,
                'coherence_organization': 0.20,
                'lexical_resource': 0.15,
                'grammar_range_accuracy': 0.25,
                'mechanics': 0.10
            },
            'thresholds': {
                'task_fulfillment': {
                    'excellent': 85,
                    'good': 70,
                    'acceptable': 55,
                    'poor': 0
                },
                'coherence_organization': {
                    'min_linking_words': 5,
                    'max_linking_words': 7,
                    'min_paragraphs': 2,
                    'max_paragraphs': 3
                },
                'lexical_resource': {
                    'min_topic_terms': 2,
                    'max_topic_terms': 3,
                    'max_repetition': 5,  # max times a word can repeat
                    'min_diversity': 0.20
                },
                'grammar_range_accuracy': {
                    'min_simple_sentences': 0.70,  # 70% should be simple
                    'max_error_rate': 0.15,  # 15% of sentences can have errors
                    'allowed_errors': ['article', 'singular_plural', 'tense_simple']
                },
                'mechanics': {
                    'max_spelling_error_rate': 0.08,  # 8% of words
                    'max_punctuation_error_rate': 0.08
                }
            },
            'error_tolerance': {
                'grammar': 0.15,  # 15% of sentences can have errors
                'spelling': 0.08,  # 8% of words
                'punctuation': 0.08
            }
        }
    
    elif level_group == 'intermediate':
        # Intermediate (B1-B2)
        if level_upper == 'B1':
            target_length = {'min': 150, 'max': 200}
        else:  # B2
            target_length = {'min': 200, 'max': 250}
        
        return {
            'level_group': 'intermediate',
            'target_length': target_length,
            'criteria_weights': {
                'task_fulfillment': 0.25,
                'coherence_organization': 0.25,
                'lexical_resource': 0.20,
                'grammar_range_accuracy': 0.25,
                'mechanics': 0.05
            },
            'thresholds': {
                'task_fulfillment': {
                    'excellent': 85,
                    'good': 70,
                    'acceptable': 55,
                    'poor': 0
                },
                'coherence_organization': {
                    'min_linking_words': 8,
                    'max_linking_words': 12,
                    'min_paragraphs': 3,
                    'max_paragraphs': 4,
                    'required_linking_words': ['however', 'therefore', 'in addition', 'although', 'moreover', 'furthermore']
                },
                'lexical_resource': {
                    'min_topic_terms': 4,
                    'max_topic_terms': 6,
                    'min_diversity': 0.35,  # type/token ratio
                    'require_collocations': True
                },
                'grammar_range_accuracy': {
                    'required_structures': ['relative_clauses', 'conditionals', 'passive'],
                    'min_complex_structures': 2,
                    'max_error_rate': 0.10,  # 10% of sentences
                    'required_structures_count': 2
                },
                'mechanics': {
                    'max_spelling_error_rate': 0.05,  # 5% of words
                    'max_punctuation_error_rate': 0.05
                }
            },
            'error_tolerance': {
                'grammar': 0.10,  # 10% of sentences
                'spelling': 0.05,  # 5% of words
                'punctuation': 0.05
            }
        }
    
    else:  # advanced
        # Advanced (C1-C2)
        if level_upper == 'C1':
            target_length = {'min': 250, 'max': 320}
        else:  # C2
            target_length = {'min': 300, 'max': 380}
        
        return {
            'level_group': 'advanced',
            'target_length': target_length,
            'criteria_weights': {
                'task_fulfillment': 0.20,
                'coherence_organization': 0.25,
                'lexical_resource': 0.25,
                'grammar_range_accuracy': 0.25,
                'mechanics': 0.05
            },
            'thresholds': {
                'task_fulfillment': {
                    'excellent': 88,
                    'good': 75,
                    'acceptable': 60,
                    'poor': 0
                },
                'coherence_organization': {
                    'min_linking_words': 10,
                    'max_linking_words': 15,
                    'min_paragraphs': 4,
                    'max_paragraphs': 5,
                    'required_linking_words': ['furthermore', 'moreover', 'nevertheless', 'consequently', 'notwithstanding', 'whereas'],
                    'require_advanced_organization': True
                },
                'lexical_resource': {
                    'min_topic_terms': 6,
                    'max_topic_terms': 10,
                    'min_diversity': 0.50,  # type/token ratio
                    'require_collocations': True,
                    'require_precise_word_choice': True,
                    'avoid_generic_words': True
                },
                'grammar_range_accuracy': {
                    'required_structures': ['inversion', 'cleft_sentences', 'non_finite_clauses', 'advanced_passive', 'subjunctive'],
                    'min_complex_structures': 3,
                    'max_error_rate': 0.05,  # 5% of sentences
                    'require_advanced_structures': True
                },
                'mechanics': {
                    'max_spelling_error_rate': 0.03,  # 3% of words
                    'max_punctuation_error_rate': 0.03
                }
            },
            'error_tolerance': {
                'grammar': 0.05,  # 5% of sentences
                'spelling': 0.03,  # 3% of words
                'punctuation': 0.03
            }
        }


def calculate_mechanics_score(text: str, rubric: Dict) -> Tuple[float, List[str]]:
    """
    Calculate Mechanics score (spelling, punctuation, capitalization)
    Returns: (score 0-100, feedback list)
    """
    words = text.split()
    word_count = len(words)
    
    if word_count == 0:
        return 0.0, ["No text provided"]
    
    # Basic spelling check (simple heuristic - can be improved with dictionary API)
    # Count words with unusual patterns (e.g., too many consonants, numbers in words)
    spelling_errors = 0
    for word in words:
        word_clean = re.sub(r'[^\w]', '', word.lower())
        # Check for unusual patterns
        if len(word_clean) > 0:
            # Too many consonants in a row (more than 3)
            if re.search(r'[bcdfghjklmnpqrstvwxyz]{4,}', word_clean):
                spelling_errors += 1
            # Numbers in words (except for dates/numbers)
            if re.search(r'\d', word_clean) and not re.match(r'^\d+$', word_clean):
                spelling_errors += 1
    
    spelling_error_rate = spelling_errors / word_count if word_count > 0 else 0.0
    
    # Punctuation check
    # Count missing periods, commas in appropriate places
    sentences = re.split(r'[.!?]+', text)
    sentences = [s.strip() for s in sentences if s.strip()]
    punctuation_errors = 0
    
    # Check for missing periods at end of sentences
    for i, sentence in enumerate(sentences):
        if i < len(sentences) - 1:  # Not the last sentence
            if not sentence.endswith(('.', '!', '?')):
                punctuation_errors += 1
    
    punctuation_error_rate = punctuation_errors / len(sentences) if len(sentences) > 0 else 0.0
    
    # Capitalization check
    capitalization_errors = 0
    for sentence in sentences:
        if sentence and not sentence[0].isupper():
            capitalization_errors += 1
    
    capitalization_error_rate = capitalization_errors / len(sentences) if len(sentences) > 0 else 0.0
    
    # Get thresholds
    max_spelling_rate = rubric['thresholds']['mechanics']['max_spelling_error_rate']
    max_punctuation_rate = rubric['thresholds']['mechanics'].get('max_punctuation_error_rate', max_spelling_rate)
    
    # Calculate score (0-100)
    mechanics_score = 100.0
    
    # Penalize spelling errors
    if spelling_error_rate > max_spelling_rate:
        penalty = min(30.0, (spelling_error_rate - max_spelling_rate) * 100)
        mechanics_score -= penalty
    
    # Penalize punctuation errors
    if punctuation_error_rate > max_punctuation_rate:
        penalty = min(20.0, punctuation_error_rate * 50)
        mechanics_score -= penalty
    
    # Penalize capitalization errors
    if capitalization_error_rate > 0.1:  # More than 10% of sentences
        penalty = min(10.0, capitalization_error_rate * 50)
        mechanics_score -= penalty
    
    mechanics_score = max(0.0, min(100.0, mechanics_score))
    
    # Generate feedback
    feedback = []
    if mechanics_score >= 90:
        feedback.append("Excellent mechanics - very few errors")
    elif mechanics_score >= 75:
        feedback.append("Good mechanics - minor errors")
    elif mechanics_score >= 60:
        feedback.append("Acceptable mechanics - some errors need attention")
    else:
        feedback.append("Mechanics need improvement - frequent errors")
    
    if spelling_error_rate > max_spelling_rate:
        feedback.append(f"Spelling errors: {spelling_errors} words ({spelling_error_rate:.1%}) - aim for <{max_spelling_rate:.1%}")
    
    if punctuation_error_rate > max_punctuation_rate:
        feedback.append(f"Punctuation errors: {punctuation_errors} sentences ({punctuation_error_rate:.1%}) - aim for <{max_punctuation_rate:.1%}")
    
    if capitalization_error_rate > 0.1:
        feedback.append(f"Capitalization errors: {capitalization_errors} sentences ({capitalization_error_rate:.1%})")
    
    return round(mechanics_score, 1), feedback


def get_level_score_bands(level_group: str) -> Dict:
    """
    Get score bands for converting raw scores to level-appropriate grades
    Returns: Dict with score bands and descriptions
    """
    if level_group == 'beginner':
        return {
            'excellent': (85, 100, "Excellent - meets all requirements with minor errors"),
            'good': (70, 84, "Good - meets most requirements with some errors"),
            'acceptable': (55, 69, "Acceptable - meets basic requirements but has noticeable errors"),
            'needs_improvement': (0, 54, "Needs improvement - missing requirements or has significant errors")
        }
    elif level_group == 'intermediate':
        return {
            'excellent': (85, 100, "Excellent - clear argumentation, good organization, few errors"),
            'good': (70, 84, "Good - adequate ideas, acceptable organization, some errors"),
            'acceptable': (55, 69, "Acceptable - ideas not fully developed, weak organization, noticeable errors"),
            'needs_improvement': (0, 54, "Needs improvement - off-topic or missing major requirements, disorganized")
        }
    else:  # advanced
        return {
            'excellent': (88, 100, "Excellent - strong vocabulary/grammar range, tight argumentation, nearly error-free"),
            'good': (75, 87, "Good - well-developed, occasional imprecise word choice or minor errors"),
            'acceptable': (60, 74, "Acceptable - ideas present but depth/consistency uneven, noticeable errors"),
            'needs_improvement': (0, 59, "Needs improvement - lacks depth or control of advanced structures")
        }

