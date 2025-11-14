"""
Text Validator
Validates essay text for:
- Non-English characters
- Random characters
- Language detection
- Off-topic detection
"""

import re
from typing import Dict, Tuple, List


def detect_non_english_characters(text: str) -> Tuple[bool, List[str], float]:
    """
    Detect non-English characters in text
    Returns: (has_non_english, examples, ratio)
    """
    # English alphabet, numbers, common punctuation
    english_pattern = re.compile(r'[a-zA-Z0-9\s\.,!?;:\-\(\)\[\]"\'\'\/\@\#\$\%\&\*\+\=\<\>]')
    
    non_english_chars = []
    total_chars = len(text)
    english_chars = 0
    
    for char in text:
        if english_pattern.match(char):
            english_chars += 1
        else:
            if char not in non_english_chars and len(non_english_chars) < 10:
                non_english_chars.append(char)
    
    non_english_ratio = (total_chars - english_chars) / total_chars if total_chars > 0 else 0
    has_non_english = non_english_ratio > 0.05  # More than 5% non-English
    
    return has_non_english, non_english_chars, non_english_ratio


def detect_random_characters(text: str) -> Tuple[bool, List[str], float]:
    """
    Detect random/repeated characters that don't form words
    Returns: (has_random, examples, ratio)
    """
    # Pattern for random characters (repeated same char 3+ times, or mixed random)
    random_patterns = [
        r'(.)\1{4,}',  # Same character repeated 5+ times
        r'[^a-zA-Z\s]{5,}',  # 5+ consecutive non-letter, non-space chars
    ]
    
    random_matches = []
    for pattern in random_patterns:
        matches = re.finditer(pattern, text)
        for match in matches:
            random_matches.append(match.group(0))
    
    # Check for sequences that don't form valid words
    words = text.split()
    invalid_word_ratio = 0
    invalid_examples = []
    
    # Basic word validation (should contain letters)
    for word in words[:50]:  # Check first 50 words
        word_clean = re.sub(r'[^\w]', '', word)
        if len(word_clean) > 0:
            # Check if it's mostly letters
            letter_ratio = sum(1 for c in word_clean if c.isalpha()) / len(word_clean) if len(word_clean) > 0 else 0
            if letter_ratio < 0.5 and len(word_clean) > 2:
                invalid_word_ratio += 1
                if len(invalid_examples) < 5:
                    invalid_examples.append(word)
    
    invalid_word_ratio = invalid_word_ratio / min(len(words), 50) if words else 0
    
    has_random = len(random_matches) > 0 or invalid_word_ratio > 0.1
    
    return has_random, random_matches[:5] + invalid_examples[:5], invalid_word_ratio


def validate_text_quality(essay: str) -> Dict:
    """
    Comprehensive text validation
    Returns validation result with penalties
    """
    has_non_english, non_english_chars, non_english_ratio = detect_non_english_characters(essay)
    has_random, random_examples, random_ratio = detect_random_characters(essay)
    
    # Calculate penalty
    penalty = 1.0
    issues = []
    
    if has_non_english:
        if non_english_ratio > 0.2:  # More than 20% non-English
            penalty = 0.0  # Zero score
            issues.append(f"CRITICAL: Text contains {non_english_ratio:.1%} non-English characters: {', '.join(non_english_chars[:5])}")
        elif non_english_ratio > 0.1:  # More than 10%
            penalty = 0.3  # Heavy penalty
            issues.append(f"WARNING: Text contains {non_english_ratio:.1%} non-English characters: {', '.join(non_english_chars[:5])}")
        else:
            penalty = 0.7  # Moderate penalty
            issues.append(f"Minor: Some non-English characters detected: {', '.join(non_english_chars[:3])}")
    
    if has_random:
        if random_ratio > 0.15:  # More than 15% random
            penalty = min(penalty, 0.2)  # Heavy penalty
            issues.append(f"WARNING: Text contains random/invalid characters: {', '.join(random_examples[:3])}")
        else:
            penalty = min(penalty, 0.8)  # Moderate penalty
            issues.append(f"Minor: Some random characters detected")
    
    # Check minimum word count
    words = essay.split()
    if len(words) < 20:
        penalty = min(penalty, 0.5)
        issues.append(f"WARNING: Text too short ({len(words)} words, minimum 20)")
    
    return {
        "is_valid": penalty >= 0.5,
        "penalty_multiplier": penalty,
        "issues": issues,
        "has_non_english": has_non_english,
        "non_english_ratio": non_english_ratio,
        "has_random": has_random,
        "random_ratio": random_ratio
    }

