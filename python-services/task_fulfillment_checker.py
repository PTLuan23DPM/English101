"""
Task Fulfillment Checker
Checks if essay fulfills mandatory requirements from prompt using keyword coverage and semantic analysis
"""

import re
import json
import os
import requests
from typing import Dict, List, Optional, Tuple


def extract_keywords_and_constraints(prompt: str) -> Dict:
    """
    Extract keywords and constraints from prompt
    IMPROVED: Focus on MAIN TOPIC NOUNS and key phrases, not generic words
    Returns: {
        'keywords': List of core keywords (prioritized by importance),
        'main_topic_nouns': List of main topic nouns (most important),
        'required_elements': List of required elements (WHERE, WHAT, WHY, etc.),
        'task_type': Type of task (narrative, descriptive, argumentative, etc.)
    }
    """
    prompt_lower = prompt.lower()
    
    # Enhanced stop words - more comprehensive
    stop_words = {
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
        'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
        'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this',
        'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their',
        'what', 'which', 'who', 'whom', 'whose', 'where', 'when', 'why',
        'how', 'all', 'each', 'every', 'some', 'any', 'no', 'not', 'if',
        'then', 'else', 'while', 'because', 'although', 'however', 'therefore',
        'write', 'describe', 'explain', 'discuss', 'tell', 'about', 'your',
        'you', 'yourself', 'think', 'opinion', 'believe', 'agree', 'disagree',
        'compare', 'contrast', 'difference', 'similar', 'different', 'both',
        'one', 'two', 'first', 'second', 'also', 'more', 'most', 'less', 'least'
    }
    
    # Extract multi-word key phrases FIRST (these are most important)
    key_phrases = []
    important_phrases_patterns = [
        r'\bwork\s+from\s+home\b', r'\bwork\s+at\s+home\b', r'\bremote\s+work\b',
        r'\buniversity\s+education\b', r'\bhigher\s+education\b', r'\bcollege\s+education\b',
        r'\bdaily\s+routine\b', r'\bevery\s+day\b', r'\bevery\s+morning\b',
        r'\bweekend\s+activities\b', r'\bweekend\s+activity\b',
        r'\bonline\s+shopping\b', r'\bonline\s+store\b', r'\be-commerce\b',
        r'\benvironmental\s+pollution\b', r'\bair\s+pollution\b', r'\bwater\s+pollution\b',
        r'\bmemorable\s+trip\b', r'\bvacation\s+trip\b', r'\btravel\s+experience\b',
        r'\bfavorite\s+food\b', r'\bfavorite\s+meal\b',
        r'\bwork\s+life\s+balance\b', r'\bwork-life\s+balance\b'
    ]
    
    for pattern in important_phrases_patterns:
        matches = re.findall(pattern, prompt_lower)
        for match in matches:
            if isinstance(match, tuple):
                match = ' '.join(match)
            key_phrases.append(match)
            # Also add individual words from phrase (but mark as part of phrase)
            for word in match.split():
                if len(word) > 2:
                    key_phrases.append(word)
    
    # Extract MAIN TOPIC NOUNS (most important for topic detection)
    # Look for nouns that appear early in prompt or are capitalized
    words = re.findall(r'\b\w+\b', prompt_lower)
    
    # Identify main topic nouns by:
    # 1. Words that appear after key verbs (write about, discuss, describe)
    # 2. Capitalized words in original prompt (if any)
    # 3. Nouns that are not stop words and length > 4
    main_topic_nouns = []
    topic_indicators = ['about', 'discuss', 'describe', 'write', 'tell', 'explain', 'opinion']
    
    for i, word in enumerate(words):
        if word in topic_indicators and i + 1 < len(words):
            # Next few words after topic indicator are likely main topic
            for j in range(i + 1, min(i + 5, len(words))):
                next_word = words[j]
                if len(next_word) > 4 and next_word not in stop_words:
                    main_topic_nouns.append(next_word)
    
    # Also extract all meaningful keywords (nouns, verbs, adjectives - length > 4)
    # But prioritize main topic nouns
    keywords = set(main_topic_nouns)  # Start with main topic nouns
    
    # Add other meaningful words (length > 4, not stop words)
    for word in words:
        if len(word) > 4 and word not in stop_words:
            keywords.add(word)
    
    # Add words from key phrases
    for phrase in key_phrases:
        if ' ' in phrase:  # Multi-word phrase
            keywords.add(phrase)  # Add whole phrase
        else:
            keywords.add(phrase)  # Single word
    
    # Remove very common words that might cause false matches
    common_false_positives = {'work', 'home', 'office', 'time', 'people', 'life', 'way', 'things', 'thing', 'place', 'places'}
    keywords = {k for k in keywords if k not in common_false_positives or k in main_topic_nouns}
    
    # Prioritize: main_topic_nouns first, then key phrases, then other keywords
    prioritized_keywords = main_topic_nouns + [p for p in key_phrases if ' ' in p] + [k for k in keywords if k not in main_topic_nouns and k not in key_phrases]
    
    # Remove duplicates while preserving order
    seen = set()
    unique_keywords = []
    for k in prioritized_keywords:
        if k not in seen:
            seen.add(k)
            unique_keywords.append(k)
    
    # Extract required elements based on prompt structure
    required_elements = []
    
    # Check for WHERE (location/place)
    if any(word in prompt_lower for word in ['where', 'place', 'location', 'went', 'go', 'visit', 'travel']):
        required_elements.append('WHERE')
    
    # Check for WHAT (activities/actions)
    if any(word in prompt_lower for word in ['what', 'did', 'do', 'activity', 'activities', 'action', 'happen']):
        required_elements.append('WHAT')
    
    # Check for WHY (reason/special)
    if any(word in prompt_lower for word in ['why', 'special', 'memorable', 'important', 'reason', 'because']):
        required_elements.append('WHY')
    
    # Check for WHEN (time)
    if any(word in prompt_lower for word in ['when', 'time', 'during', 'while', 'after', 'before']):
        required_elements.append('WHEN')
    
    # Check for WHO (people)
    if any(word in prompt_lower for word in ['who', 'people', 'person', 'with', 'together']):
        required_elements.append('WHO')
    
    # Check for time expressions requirement
    if 'time expression' in prompt_lower or 'time expressions' in prompt_lower:
        required_elements.append('TIME_EXPRESSIONS')
    
    # Determine task type
    task_type = 'descriptive'
    if any(word in prompt_lower for word in ['opinion', 'think', 'believe', 'agree', 'disagree']):
        task_type = 'argumentative'
    elif any(word in prompt_lower for word in ['narrative', 'story', 'tell', 'happened']):
        task_type = 'narrative'
    elif any(word in prompt_lower for word in ['compare', 'comparison', 'contrast', 'difference']):
        task_type = 'comparative'
    
    return {
        'keywords': unique_keywords[:15],  # Limit to top 15 most important
        'main_topic_nouns': main_topic_nouns[:5],  # Top 5 main topic nouns
        'key_phrases': [p for p in key_phrases if ' ' in p][:5],  # Top 5 key phrases
        'required_elements': required_elements,
        'task_type': task_type
    }


# Synonym groups for semantic matching
SYNONYM_GROUPS = {
    # Travel-related
    'trip': ['trip', 'vacation', 'holiday', 'travel', 'journey', 'tour', 'visit', 'traveled', 'travelled', 'traveling', 'travelling'],
    'vacation': ['trip', 'vacation', 'holiday', 'travel', 'journey', 'tour', 'visit', 'traveled', 'travelled', 'traveling', 'travelling'],
    'memorable': ['memorable', 'unforgettable', 'special', 'important', 'significant', 'remarkable'],
    'travel': ['trip', 'vacation', 'holiday', 'travel', 'journey', 'tour', 'visit', 'traveled', 'travelled', 'traveling', 'travelling'],
    # Shopping-related
    'shopping': ['shopping', 'buying', 'purchase', 'buy', 'shop', 'shopped'],
    'online': ['online', 'internet', 'web', 'digital', 'e-commerce', 'ecommerce'],
    # Education-related
    'education': ['education', 'learning', 'study', 'studying', 'school', 'university', 'college'],
    'university': ['university', 'college', 'school', 'institution', 'academic'],
    # Environment-related
    'pollution': ['pollution', 'contamination', 'waste', 'garbage', 'trash'],
    'environmental': ['environmental', 'environment', 'ecological', 'eco', 'green'],
}


def get_synonyms(word: str) -> List[str]:
    """Get synonyms for a word"""
    word_lower = word.lower()
    for group_key, synonyms in SYNONYM_GROUPS.items():
        if word_lower == group_key or word_lower in synonyms:
            return synonyms
    return [word_lower]  # Return word itself if no synonyms found


def calculate_keyword_coverage(essay: str, prompt_keywords: List[str], main_topic_nouns: List[str] = None, key_phrases: List[str] = None) -> Tuple[float, List[str], List[str]]:
    """
    Calculate keyword coverage: how many keywords from prompt appear in essay
    IMPROVED: Prioritize main topic nouns and key phrases, penalize if missing
    Returns: (coverage_ratio, matched_keywords, missing_keywords)
    
    Uses semantic matching with synonyms to understand related concepts
    """
    if not prompt_keywords:
        return 1.0, [], []
    
    essay_lower = essay.lower()
    essay_words = set(re.findall(r'\b\w+\b', essay_lower))
    essay_text = essay_lower  # For phrase matching
    
    matched_keywords = []
    missing_keywords = []
    main_topic_nouns = main_topic_nouns or []
    key_phrases = key_phrases or []
    
    # CRITICAL: Check key phrases FIRST (most important)
    matched_phrases = []
    missing_phrases = []
    for phrase in key_phrases:
        phrase_lower = phrase.lower()
        if phrase_lower in essay_text:
            matched_phrases.append(phrase)
            matched_keywords.append(phrase)
        else:
            missing_phrases.append(phrase)
            missing_keywords.append(phrase)
    
    # CRITICAL: Check main topic nouns (high priority)
    matched_main_nouns = []
    missing_main_nouns = []
    for noun in main_topic_nouns:
        noun_lower = noun.lower()
        matched = False
        
        # 1. Check exact match first
        if noun_lower in essay_words:
            matched_main_nouns.append(noun)
            matched_keywords.append(noun)
            matched = True
        else:
            # 2. Check for synonyms (semantic matching)
            synonyms = get_synonyms(noun_lower)
            for synonym in synonyms:
                if synonym in essay_words:
                    matched_main_nouns.append(noun)
                    matched_keywords.append(noun)
                    matched = True
                    break
            
            # 3. Check word stem match (strict)
            if not matched:
                for essay_word in essay_words:
                    if abs(len(essay_word) - len(noun_lower)) > 2:
                        continue
                    
                    common_suffixes = ['s', 'es', 'ed', 'ing', 'er', 'ly', 'ion', 'tion']
                    for suffix in common_suffixes:
                        if essay_word == noun_lower + suffix or noun_lower == essay_word + suffix:
                            matched_main_nouns.append(noun)
                            matched_keywords.append(noun)
                            matched = True
                            break
                    if matched:
                        break
        
        if not matched:
            missing_main_nouns.append(noun)
            missing_keywords.append(noun)
    
    # Check other keywords (lower priority)
    other_keywords = [k for k in prompt_keywords if k not in main_topic_nouns and k not in key_phrases]
    for keyword in other_keywords:
        keyword_lower = keyword.lower()
        matched = False
        
        # 1. Check exact match
        if keyword_lower in essay_words:
            matched_keywords.append(keyword)
            matched = True
        else:
            # 2. Check synonyms
            synonyms = get_synonyms(keyword_lower)
            for synonym in synonyms:
                if synonym in essay_words:
                    matched_keywords.append(keyword)
                    matched = True
                    break
            
            # 3. Check stem match
            if not matched:
                for essay_word in essay_words:
                    if abs(len(essay_word) - len(keyword_lower)) > 2:
                        continue
                    common_suffixes = ['s', 'es', 'ed', 'ing', 'er', 'ly']
                    for suffix in common_suffixes:
                        if essay_word == keyword_lower + suffix or keyword_lower == essay_word + suffix:
                            matched_keywords.append(keyword)
                            matched = True
                            break
                    if matched:
                        break
        
        if not matched:
            missing_keywords.append(keyword)
    
    # Calculate weighted coverage:
    # - Key phrases: 40% weight
    # - Main topic nouns: 40% weight  
    # - Other keywords: 20% weight
    
    phrase_coverage = len(matched_phrases) / len(key_phrases) if key_phrases else 1.0
    main_noun_coverage = len(matched_main_nouns) / len(main_topic_nouns) if main_topic_nouns else 1.0
    other_coverage = len([k for k in matched_keywords if k not in main_topic_nouns and k not in key_phrases]) / len(other_keywords) if other_keywords else 1.0
    
    # If main topic nouns or key phrases are missing, heavily penalize
    if main_topic_nouns and len(matched_main_nouns) == 0:
        # No main topic nouns matched - likely completely off-topic
        coverage = 0.1  # Very low coverage
    elif key_phrases and len(matched_phrases) == 0:
        # No key phrases matched - likely off-topic
        coverage = max(0.2, phrase_coverage * 0.4 + main_noun_coverage * 0.4 + other_coverage * 0.2)
    else:
        coverage = phrase_coverage * 0.4 + main_noun_coverage * 0.4 + other_coverage * 0.2
    
    return coverage, matched_keywords, missing_keywords


def check_task_fulfillment_rubric(essay: str, prompt: str, task_level: str = "B2") -> Dict:
    """
    Check task fulfillment using rubric checklist
    Returns: {
        'answered_where': {'yes': bool, 'evidence': str},
        'answered_what': {'yes': bool, 'evidence': str},
        'answered_why': {'yes': bool, 'evidence': str},
        'time_expressions': {'yes': bool, 'samples': List[str]},
        'fulfillment_score': float (0-10),
        'missing_requirements': List[str]
    }
    """
    prompt_info = extract_keywords_and_constraints(prompt)
    essay_lower = essay.lower()
    
    results = {}
    missing_requirements = []
    
    # Check WHERE
    if 'WHERE' in prompt_info['required_elements']:
        where_indicators = ['where', 'went', 'go', 'visit', 'travel', 'place', 'location', 'there', 'here']
        where_evidence = [word for word in where_indicators if word in essay_lower]
        has_where = len(where_evidence) > 0
        results['answered_where'] = {
            'yes': has_where,
            'evidence': ', '.join(where_evidence[:3]) if where_evidence else 'None'
        }
        if not has_where:
            missing_requirements.append('WHERE (location/place)')
    
    # Check WHAT
    if 'WHAT' in prompt_info['required_elements']:
        what_indicators = ['did', 'do', 'activity', 'activities', 'action', 'happened', 'visited', 'saw', 'enjoyed']
        what_evidence = [word for word in what_indicators if word in essay_lower]
        has_what = len(what_evidence) > 0
        results['answered_what'] = {
            'yes': has_what,
            'evidence': ', '.join(what_evidence[:3]) if what_evidence else 'None'
        }
        if not has_what:
            missing_requirements.append('WHAT (activities/actions)')
    
    # Check WHY
    if 'WHY' in prompt_info['required_elements']:
        why_indicators = ['because', 'why', 'special', 'memorable', 'important', 'reason', 'loved', 'enjoyed', 'amazing']
        why_evidence = [word for word in why_indicators if word in essay_lower]
        has_why = len(why_evidence) > 0
        results['answered_why'] = {
            'yes': has_why,
            'evidence': ', '.join(why_evidence[:3]) if why_evidence else 'None'
        }
        if not has_why:
            missing_requirements.append('WHY (reason/special)')
    
    # Check TIME_EXPRESSIONS
    if 'TIME_EXPRESSIONS' in prompt_info['required_elements']:
        time_expressions = re.findall(
            r'\b(at\s+\d+|every\s+\w+|in\s+the\s+\w+|after\s+\w+|before\s+\w+|around\s+\d+|usually|always|sometimes|often|never|then|next|first|finally|during|while|when)\b',
            essay_lower
        )
        has_time_expressions = len(time_expressions) >= 2
        results['time_expressions'] = {
            'yes': has_time_expressions,
            'samples': time_expressions[:5] if time_expressions else []
        }
        if not has_time_expressions:
            missing_requirements.append('TIME_EXPRESSIONS')
    
    # Calculate fulfillment score
    total_requirements = len(prompt_info['required_elements'])
    fulfilled_requirements = total_requirements - len(missing_requirements)
    
    if total_requirements == 0:
        fulfillment_score = 7.0  # Default if no specific requirements
    else:
        fulfillment_ratio = fulfilled_requirements / total_requirements
        # Strict scoring: if missing any must-have requirement, penalize heavily
        if len(missing_requirements) > 0:
            # Missing requirements = severe penalty
            fulfillment_score = fulfillment_ratio * 6.0  # Max 6.0 if missing requirements
        else:
            fulfillment_score = 7.0 + (fulfillment_ratio * 3.0)  # 7.0-10.0 if all fulfilled
    
    results['fulfillment_score'] = round(fulfillment_score, 1)
    results['missing_requirements'] = missing_requirements
    
    return results


def calculate_topic_score(essay: str, prompt: str, task_level: str = "B2") -> Dict:
    """
    Calculate comprehensive topic score (keyword coverage + embedding similarity + fulfillment)
    Returns: {
        'topic_score': float (0-1.0),
        'keyword_coverage': float,
        'fulfillment_score': float,
        'semantic_similarity': float (if available),
        'is_on_topic': bool,
        'topic_multiplier': float (0.0-1.0)
    }
    """
    prompt_info = extract_keywords_and_constraints(prompt)
    
    # 1. Keyword Coverage
    keyword_coverage, matched_keywords, missing_keywords = calculate_keyword_coverage(
        essay,
        prompt_info['keywords'],
        main_topic_nouns=prompt_info.get('main_topic_nouns', []),
        key_phrases=prompt_info.get('key_phrases', [])
    )
    
    # 2. Task Fulfillment Rubric
    fulfillment_check = check_task_fulfillment_rubric(essay, prompt, task_level)
    fulfillment_score_normalized = fulfillment_check['fulfillment_score'] / 10.0  # 0-1.0
    
    # 3. Combine scores (weighted average)
    # Keyword coverage: 40%, Fulfillment: 40%, Semantic similarity: 20% (if available)
    topic_score = (keyword_coverage * 0.4 + fulfillment_score_normalized * 0.6)
    
    # Determine topic multiplier and status
    if topic_score < 0.55:
        # Reject: off-topic
        is_on_topic = False
        topic_multiplier = 0.0  # Reject - don't score
    elif topic_score < 0.70:
        # Weak-topic: apply penalty
        is_on_topic = False
        topic_multiplier = 0.7  # Weak topic penalty
    else:
        # On-topic: normal scoring
        is_on_topic = True
        topic_multiplier = 1.0
    
    return {
        'topic_score': round(topic_score, 2),
        'keyword_coverage': keyword_coverage,
        'fulfillment_score': fulfillment_check['fulfillment_score'],
        'is_on_topic': is_on_topic,
        'topic_multiplier': topic_multiplier,
        'matched_keywords': matched_keywords,
        'missing_keywords': missing_keywords,
        'fulfillment_details': fulfillment_check
    }


def detect_topic_contradiction(essay: str, prompt: str) -> Tuple[bool, List[str]]:
    """
    Detect obvious topic contradictions (e.g., "weekend" prompt but "daily routine" essay)
    Returns: (has_contradiction, contradiction_reasons)
    """
    essay_lower = essay.lower()
    prompt_lower = prompt.lower()
    
    contradictions = []
    has_contradiction = False
    
    # Define mutually exclusive topic pairs
    topic_contradictions = [
        # Weekend vs Daily/Weekday
        {
            'prompt_indicators': ['weekend', 'saturday', 'sunday', 'weekend activities', 'leisure time'],
            'essay_indicators': ['every morning', 'every day', 'daily', 'work', 'office', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'weekday', 'routine', 'go to work', 'at work', 'job'],
            'message': 'Essay discusses daily/work routine but prompt asks about weekend activities'
        },
        # Past/Memory vs Present/Future
        # IMPORTANT: Only detect contradiction if essay uses PRESENT/HABITUAL tense indicators
        # AND prompt asks for PAST experience. If essay also has past tense indicators, it's OK.
        {
            'prompt_indicators': ['remember', 'past', 'last', 'ago', 'used to', 'previous', 'memory', 'memorable'],
            # Note: Removed 'was', 'were', 'did' from prompt_indicators - these are too common in both prompts and essays
            'essay_indicators': ['every', 'usually', 'always', 'often', 'sometimes', 'normally', 'typically', 'will', 'going to', 'plan to', 'future'],
            # Only flag if essay has 3+ present/habitual indicators AND no past indicators
            'message': 'Essay uses present/habitual tense but prompt asks about past experience'
        },
        # Vacation/Holiday vs Work/School
        {
            'prompt_indicators': ['vacation', 'holiday', 'trip', 'travel', 'tour', 'relaxing', 'leisure'],
            # Note: 'visit' removed from prompt_indicators to avoid false positives (e.g., "visited places" is part of travel)
            'essay_indicators': ['work', 'office', 'meeting', 'deadline', 'project', 'school', 'class', 'homework', 'exam', 'assignment', 'go to work', 'at work', 'job', 'workplace'],
            'message': 'Essay discusses work/school but prompt asks about vacation/holiday'
        },
        # Daily Routine vs Vacation/Trip
        {
            'prompt_indicators': ['daily', 'routine', 'every day', 'every morning', 'usually', 'always', 'often', 'normally', 'typically', 'habit', 'habits', 'regular', 'regularly', 'weekday', 'weekdays'],
            'essay_indicators': ['vacation', 'holiday', 'trip', 'travel', 'travelled', 'traveled', 'journey', 'tour', 'beach', 'hotel', 'visited', 'explored', 'sightseeing', 'tourist', 'memorable', 'special', 'last summer', 'last year', 'last month'],
            'message': 'Essay discusses vacation/trip but prompt asks about daily routine'
        },
        # Work from Home vs Office vs University Education
        {
            'prompt_indicators': ['work from home', 'work at home', 'remote work', 'working from home', 'home office', 'telecommute', 'telecommuting', 'office', 'workplace', 'workplace environment', 'vs office', 'versus office'],
            'essay_indicators': ['university', 'education', 'college', 'school', 'student', 'teacher', 'study', 'studying', 'academic', 'tuition', 'degree', 'campus', 'classroom', 'lecture', 'professor', 'higher education', 'university education', 'free education', 'educational'],
            'message': 'Essay discusses university/education but prompt asks about work from home vs office'
        },
        # University Education vs Work from Home
        {
            'prompt_indicators': ['university', 'education', 'college', 'higher education', 'university education', 'academic', 'tuition', 'degree', 'campus', 'student', 'teacher', 'free education'],
            'essay_indicators': ['work from home', 'work at home', 'remote work', 'working from home', 'home office', 'telecommute', 'telecommuting', 'office', 'workplace', 'workplace environment', 'remote', 'commute', 'vs office', 'versus office'],
            'message': 'Essay discusses work from home/office but prompt asks about university education'
        },
    ]
    
    for contradiction_check in topic_contradictions:
        # Check if prompt contains any of the prompt indicators
        prompt_has_indicator = any(indicator in prompt_lower for indicator in contradiction_check['prompt_indicators'])
        
        if prompt_has_indicator:
            # Check if essay contains any of the contradicting indicators
            essay_has_contradiction = sum(1 for indicator in contradiction_check['essay_indicators'] if indicator in essay_lower)
            
            # Special handling for Past/Memory contradiction
            if 'past' in contradiction_check['message'].lower() or 'memory' in contradiction_check['message'].lower():
                # For past/memory prompts, also check if essay has past tense indicators
                # If essay has past indicators (last, ago, was, were, did, visited, went), it's OK
                past_indicators_in_essay = any(word in essay_lower for word in ['last', 'ago', 'was', 'were', 'did', 'visited', 'went', 'had', 'travelled', 'traveled'])
                
                # Only flag contradiction if essay has 3+ present/habitual indicators AND no past indicators
                if essay_has_contradiction >= 3 and not past_indicators_in_essay:
                    has_contradiction = True
                    contradictions.append(contradiction_check['message'])
            else:
                # For other contradictions, use original logic (2+ indicators)
                if essay_has_contradiction >= 2:
                    has_contradiction = True
                    contradictions.append(contradiction_check['message'])
    
    return has_contradiction, contradictions


def analyze_off_topic_detection(essay: str, prompt: str, task_level: str = "B2") -> Dict:
    """
    Comprehensive off-topic detection using multiple methods
    Returns: {
        'is_off_topic': bool,
        'confidence': float (0-1),
        'keyword_coverage': float,
        'semantic_similarity': float (if available),
        'fulfillment_score': float,
        'reasons': List[str]
    }
    """
    prompt_info = extract_keywords_and_constraints(prompt)
    
    # 0. Check for obvious topic contradictions FIRST
    has_contradiction, contradiction_reasons = detect_topic_contradiction(essay, prompt)
    
    # 1. Keyword Coverage
    keyword_coverage, matched_keywords, missing_keywords = calculate_keyword_coverage(
        essay, prompt_info['keywords']
    )
    
    # Debug logging
    print(f"[Off-topic Detection] Prompt keywords: {prompt_info['keywords']}")
    print(f"[Off-topic Detection] Matched keywords: {matched_keywords}")
    print(f"[Off-topic Detection] Missing keywords: {missing_keywords}")
    print(f"[Off-topic Detection] Keyword coverage: {keyword_coverage:.2%}")
    
    # 2. Task Fulfillment Rubric
    fulfillment_check = check_task_fulfillment_rubric(essay, prompt, task_level)
    
    # 3. Determine if off-topic
    is_off_topic = False
    reasons = []
    confidence = 0.0
    
    # If there's an obvious contradiction, mark as off-topic immediately with HIGH confidence
    if has_contradiction:
        is_off_topic = True
        confidence = 0.98  # Very high confidence for contradictions
        reasons.extend(contradiction_reasons)
        print(f"[Off-topic Detection] ⚠️ CONTRADICTION DETECTED: {contradiction_reasons}")
    
    # Thresholds based on level (balanced - strict but semantic-aware)
    # With synonym matching, we can be slightly more lenient
    if task_level.upper() in ['A1', 'A2']:
        keyword_threshold = 0.35  # Lenient for beginners
        fulfillment_threshold = 5.0
    elif task_level.upper() == 'B1':
        keyword_threshold = 0.40  # Moderate
        fulfillment_threshold = 5.5
    elif task_level.upper() == 'B2':
        keyword_threshold = 0.50  # Balanced
        fulfillment_threshold = 6.0
    elif task_level.upper() == 'C1':
        keyword_threshold = 0.60  # Stricter for advanced
        fulfillment_threshold = 6.5
    else:  # C2
        keyword_threshold = 0.70  # Very strict for proficiency
        fulfillment_threshold = 7.0
    
    # If keyword coverage is very low (< 0.25), definitely off-topic (lowered from 0.35)
    # This catches cases where essay is about completely different topic
    if keyword_coverage < 0.25:
        is_off_topic = True
        confidence = 0.95
        reasons.append(f"Very low keyword coverage ({keyword_coverage:.0%}) - essay appears to be about a different topic")
    # If keyword coverage is low (< threshold), likely off-topic
    elif keyword_coverage < keyword_threshold:
        is_off_topic = True
        confidence += 0.5
        reasons.append(f"Low keyword coverage ({keyword_coverage:.0%} < {keyword_threshold:.0%})")
    
    # Check fulfillment
    if fulfillment_check['fulfillment_score'] < fulfillment_threshold:
        is_off_topic = True
        confidence += 0.4
        reasons.append(f"Low fulfillment score ({fulfillment_check['fulfillment_score']:.1f} < {fulfillment_threshold:.1f})")
        if fulfillment_check['missing_requirements']:
            reasons.append(f"Missing requirements: {', '.join(fulfillment_check['missing_requirements'])}")
    
    # If both checks fail, very high confidence
    if keyword_coverage < keyword_threshold and fulfillment_check['fulfillment_score'] < fulfillment_threshold:
        confidence = min(1.0, confidence + 0.3)
        is_off_topic = True
    
    return {
        'is_off_topic': is_off_topic,
        'confidence': min(1.0, confidence),
        'keyword_coverage': keyword_coverage,
        'matched_keywords': matched_keywords,
        'missing_keywords': missing_keywords,
        'fulfillment_score': fulfillment_check['fulfillment_score'],
        'fulfillment_details': fulfillment_check,
        'reasons': reasons
    }

