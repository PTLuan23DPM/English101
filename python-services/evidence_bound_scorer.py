"""
Evidence-bound Scorer
Checks if scoring criteria have evidence tied to the prompt/topic
Implements evidence-bound scoring for Coherence, Lexical, and Grammar
"""

import re
from typing import Dict, List, Optional, Tuple


def analyze_coherence_evidence_bound(text: str, prompt: str, task_level: str = "B2") -> Dict:
    """
    Analyze coherence & cohesion with evidence bound to prompt structure
    Returns: {
        'segments': Dict mapping sentences/paragraphs to labels (WHERE/WHAT/WHY/TIME/OTHER),
        'gaps': List of gaps (missing steps, jumps in logic),
        'coherence_score_raw': float (0-100),
        'feedback': List[str]
    }
    """
    from task_fulfillment_checker import extract_keywords_and_constraints
    
    prompt_info = extract_keywords_and_constraints(prompt)
    required_elements = prompt_info['required_elements']
    
    # Split text into sentences
    sentences = re.split(r'[.!?]+', text)
    sentences = [s.strip() for s in sentences if s.strip()]
    
    segments = {}
    gaps = []
    text_lower = text.lower()
    
    # Check each sentence for required elements
    for i, sentence in enumerate(sentences):
        sentence_lower = sentence.lower()
        labels = []
        
        # Check WHERE
        if 'WHERE' in required_elements:
            where_indicators = ['where', 'went', 'go', 'visit', 'travel', 'place', 'location', 'there', 'here']
            if any(word in sentence_lower for word in where_indicators):
                labels.append('WHERE')
        
        # Check WHAT
        if 'WHAT' in required_elements:
            what_indicators = ['did', 'do', 'activity', 'activities', 'action', 'happened', 'visited', 'saw', 'enjoyed', 'tried']
            if any(word in sentence_lower for word in what_indicators):
                labels.append('WHAT')
        
        # Check WHY
        if 'WHY' in required_elements:
            why_indicators = ['because', 'why', 'special', 'memorable', 'important', 'reason', 'loved', 'enjoyed', 'amazing', 'wonderful']
            if any(word in sentence_lower for word in why_indicators):
                labels.append('WHY')
        
        # Check WHEN/TIME
        if 'WHEN' in required_elements or 'TIME_EXPRESSIONS' in required_elements:
            time_indicators = ['when', 'time', 'during', 'while', 'after', 'before', 'at', 'every', 'then', 'first', 'next', 'finally']
            if any(word in sentence_lower for word in time_indicators):
                labels.append('TIME')
        
        # If no required elements found, mark as OTHER
        if not labels:
            labels.append('OTHER')
        
        segments[f"sentence_{i+1}"] = labels
    
    # Check for gaps (missing required elements)
    found_elements = set()
    for labels in segments.values():
        found_elements.update(labels)
    
    for element in required_elements:
        if element not in found_elements:
            gaps.append(f"Missing {element} element")
    
    # Check for logical flow (WHERE → WHAT → WHY)
    if 'WHERE' in required_elements and 'WHAT' in required_elements and 'WHY' in required_elements:
        # Check if order is logical
        where_found = False
        what_found = False
        why_found = False
        
        for labels in segments.values():
            if 'WHERE' in labels:
                where_found = True
            if 'WHAT' in labels and where_found:
                what_found = True
            if 'WHY' in labels and what_found:
                why_found = True
        
        if where_found and not what_found:
            gaps.append("Missing WHAT after WHERE")
        if what_found and not why_found and 'WHY' in required_elements:
            gaps.append("Missing WHY after WHAT")
    
    # Count OTHER segments (not related to prompt)
    other_count = sum(1 for labels in segments.values() if 'OTHER' in labels and len(labels) == 1)
    total_segments = len(segments)
    other_ratio = other_count / total_segments if total_segments > 0 else 0.0
    
    # Calculate coherence score raw (0-100)
    # Base score: 100
    # Penalties: -10 per gap, -15 if >30% segments are OTHER
    coherence_score_raw = 100.0
    coherence_score_raw -= len(gaps) * 10
    if other_ratio > 0.30:
        coherence_score_raw -= 15
    
    coherence_score_raw = max(0.0, min(100.0, coherence_score_raw))
    
    # Generate feedback
    feedback = []
    if len(gaps) == 0 and other_ratio <= 0.30:
        feedback.append("Excellent coherence - your response follows a logical structure")
    elif len(gaps) > 0:
        feedback.append(f"Try to address all parts of the prompt: {', '.join(gaps)}")
    if other_ratio > 0.30:
        feedback.append(f"Some parts of your response don't directly relate to the prompt ({other_ratio:.0%} off-topic)")
    
    return {
        'segments': segments,
        'gaps': gaps,
        'coherence_score_raw': round(coherence_score_raw, 1),
        'feedback': feedback,
        'other_ratio': other_ratio
    }


def analyze_lexical_evidence_bound(text: str, prompt: str, task_level: str = "B2") -> Dict:
    """
    Analyze lexical resource with evidence bound to topic domain
    Returns: {
        'topic_term_hits': int,
        'topic_lexicon': List[str],
        'type_token_ratio': float,
        'lexical_score_raw': float (0-100),
        'feedback': List[str]
    }
    """
    from task_fulfillment_checker import extract_keywords_and_constraints, calculate_keyword_coverage
    
    prompt_info = extract_keywords_and_constraints(prompt)
    keywords = prompt_info['keywords']
    
    # Calculate topic term hits (non-duplicate)
    topic_term_hits, matched_keywords, missing_keywords = calculate_keyword_coverage(text, keywords)
    topic_term_hits_count = len(matched_keywords)
    
    # Calculate type-token ratio (TTR) to prevent repetition
    words = text.lower().split()
    unique_words = len(set(words))
    type_token_ratio = unique_words / len(words) if len(words) > 0 else 0.0
    
    # Determine target topic terms based on level
    if task_level.upper() in ['A1', 'A2']:
        target_topic_terms = 2
    elif task_level.upper() == 'B1':
        target_topic_terms = 3
    elif task_level.upper() == 'B2':
        target_topic_terms = 4
    else:  # C1, C2
        target_topic_terms = 5
    
    # Calculate lexical score raw
    # Formula: 40% * (min(topicTermHits/target, 1)) + 40% * TTR + 20% * registerScore
    topic_term_ratio = min(topic_term_hits_count / target_topic_terms, 1.0) if target_topic_terms > 0 else 0.0
    register_score = 0.8  # Default register score (can be improved with more analysis)
    
    lexical_score_raw = (
        topic_term_ratio * 0.4 +
        type_token_ratio * 0.4 +
        register_score * 0.2
    ) * 100
    
    # If topicTermHits < 2, cap at 40
    if topic_term_hits_count < 2:
        lexical_score_raw = min(40.0, lexical_score_raw)
    
    lexical_score_raw = max(0.0, min(100.0, lexical_score_raw))
    
    # Generate feedback
    feedback = []
    if topic_term_hits_count >= target_topic_terms:
        feedback.append(f"Excellent use of topic-related vocabulary ({topic_term_hits_count} terms)")
    elif topic_term_hits_count >= target_topic_terms * 0.7:
        feedback.append(f"Good use of topic vocabulary ({topic_term_hits_count} terms, aim for {target_topic_terms})")
    else:
        feedback.append(f"Try to use more vocabulary from the prompt topic ({topic_term_hits_count} terms, aim for {target_topic_terms})")
    
    if type_token_ratio >= 0.5:
        feedback.append("Good vocabulary diversity")
    elif type_token_ratio >= 0.4:
        feedback.append("Acceptable vocabulary diversity - try to vary your word choice more")
    else:
        feedback.append("Limited vocabulary diversity - try using different words instead of repeating")
    
    return {
        'topic_term_hits': topic_term_hits_count,
        'topic_lexicon': matched_keywords,
        'type_token_ratio': round(type_token_ratio, 2),
        'lexical_score_raw': round(lexical_score_raw, 1),
        'feedback': feedback
    }


def analyze_grammar_evidence_bound(text: str, prompt: str, task_type: str = "essay", task_level: str = "B2") -> Dict:
    """
    Analyze grammatical range & accuracy with evidence bound to task type
    Returns: {
        'structures_used': List[Dict] with structure name and example sentence,
        'misuse_flags': List[str],
        'grammar_score_raw': float (0-100),
        'feedback': List[str]
    }
    """
    text_lower = text.lower()
    structures_used = []
    misuse_flags = []
    
    # Determine required structures based on task type
    required_structures = []
    
    if 'narrative' in task_type.lower() or 'story' in task_type.lower() or 'trip' in prompt.lower() or 'vacation' in prompt.lower():
        # Narrative tasks require: past simple, past continuous, time clauses
        required_structures = ['past_simple', 'past_continuous', 'time_clauses']
        
        # Check for past simple
        past_simple_indicators = re.findall(r'\b(went|did|was|were|had|saw|visited|enjoyed|tried|stayed|took|got|left|arrived|spent)\b', text_lower)
        if past_simple_indicators:
            structures_used.append({
                'structure': 'past_simple',
                'example': past_simple_indicators[0] if past_simple_indicators else None
            })
        else:
            misuse_flags.append("Narrative tasks require past simple tense")
        
        # Check for past continuous
        past_continuous_indicators = re.findall(r'\b(was|were)\s+\w+ing\b', text_lower)
        if past_continuous_indicators:
            structures_used.append({
                'structure': 'past_continuous',
                'example': past_continuous_indicators[0] if past_continuous_indicators else None
            })
        
        # Check for time clauses
        time_clause_indicators = re.findall(r'\b(when|while|during|after|before|as|then|first|next|finally)\b', text_lower)
        if time_clause_indicators:
            structures_used.append({
                'structure': 'time_clauses',
                'example': time_clause_indicators[0] if time_clause_indicators else None
            })
    
    elif 'opinion' in task_type.lower() or 'argument' in task_type.lower() or 'think' in prompt.lower() or 'believe' in prompt.lower():
        # Argumentative tasks require: argument markers, conditionals, modals
        required_structures = ['argument_markers', 'conditionals', 'modals']
        
        # Check for argument markers
        argument_markers = re.findall(r'\b(i think|i believe|in my opinion|i agree|i disagree|however|moreover|furthermore|therefore|consequently)\b', text_lower)
        if argument_markers:
            structures_used.append({
                'structure': 'argument_markers',
                'example': argument_markers[0] if argument_markers else None
            })
        else:
            misuse_flags.append("Argumentative tasks require argument markers (I think, I believe, etc.)")
        
        # Check for conditionals
        conditionals = re.findall(r'\b(if|unless|provided that|as long as|would|could|should|might)\b', text_lower)
        if conditionals:
            structures_used.append({
                'structure': 'conditionals',
                'example': conditionals[0] if conditionals else None
            })
        
        # Check for modals
        modals = re.findall(r'\b(must|should|could|would|might|may|can|cannot)\b', text_lower)
        if modals:
            structures_used.append({
                'structure': 'modals',
                'example': modals[0] if modals else None
            })
    
    elif 'routine' in prompt.lower() or 'daily' in prompt.lower() or 'present' in prompt.lower():
        # Routine/descriptive tasks require: present simple, time expressions
        required_structures = ['present_simple', 'time_expressions']
        
        # Check for present simple
        present_simple_indicators = re.findall(r'\b(wake|wakes|get|gets|brush|brushes|wash|washes|have|has|go|goes|leave|leaves|do|does)\b', text_lower)
        if present_simple_indicators:
            structures_used.append({
                'structure': 'present_simple',
                'example': present_simple_indicators[0] if present_simple_indicators else None
            })
        else:
            misuse_flags.append("Routine tasks require present simple tense")
        
        # Check for time expressions
        time_expressions = re.findall(r'\b(at\s+\d+|every\s+\w+|in\s+the\s+\w+|after\s+\w+|before\s+\w+|around\s+\d+|usually|always|sometimes|often|never|then|next|first|finally)\b', text_lower)
        if time_expressions:
            structures_used.append({
                'structure': 'time_expressions',
                'example': time_expressions[0] if time_expressions else None
            })
    
    # Check for misuse (wrong structures for task type)
    if 'narrative' in task_type.lower() or 'trip' in prompt.lower():
        # Narrative should use past, not present
        present_indicators = re.findall(r'\b(wake|wakes|get|gets|brush|brushes|wash|washes|have|has|go|goes|leave|leaves|do|does)\b', text_lower)
        if len(present_indicators) > len(past_simple_indicators) if 'past_simple_indicators' in locals() else 0:
            misuse_flags.append("Narrative tasks should use past tense, not present tense")
    
    # Calculate grammar score raw
    # Base score from accuracy (assume 80% for now, can be improved with grammar checker)
    base_accuracy = 80.0
    
    # Range bonus: +20 if all required structures used, +10 if 70% used, 0 if <70%
    structures_used_names = [s['structure'] for s in structures_used]
    required_used = sum(1 for req in required_structures if req in structures_used_names)
    required_ratio = required_used / len(required_structures) if required_structures else 1.0
    
    if required_ratio >= 1.0:
        range_bonus = 20.0
    elif required_ratio >= 0.7:
        range_bonus = 10.0
    else:
        range_bonus = 0.0
    
    # If structures don't match task type, cap at 60
    if len(misuse_flags) > 0:
        grammar_score_raw = min(60.0, base_accuracy + range_bonus)
    else:
        grammar_score_raw = base_accuracy + range_bonus
    
    # If missing >= 2 required structures, cap at 60
    if required_used < len(required_structures) - 1:
        grammar_score_raw = min(60.0, grammar_score_raw)
    
    grammar_score_raw = max(0.0, min(100.0, grammar_score_raw))
    
    # Generate feedback
    feedback = []
    if required_ratio >= 1.0:
        feedback.append(f"Excellent use of task-appropriate grammatical structures ({required_used}/{len(required_structures)})")
    elif required_ratio >= 0.7:
        feedback.append(f"Good use of grammatical structures ({required_used}/{len(required_structures)}, aim for all)")
    else:
        feedback.append(f"Try to use more task-appropriate structures ({required_used}/{len(required_structures)} required)")
    
    if misuse_flags:
        feedback.extend(misuse_flags)
    
    return {
        'structures_used': structures_used,
        'misuse_flags': misuse_flags,
        'grammar_score_raw': round(grammar_score_raw, 1),
        'feedback': feedback,
        'required_structures': required_structures,
        'required_used': required_used
    }

