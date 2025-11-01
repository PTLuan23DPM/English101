"""
IELTS Writing Scorer Service
Uses Keras model to score IELTS writing and converts to CEFR levels
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import pickle
import re
import os
from pathlib import Path
from tensorflow import keras
from typing import Dict, List, Tuple

app = Flask(__name__)
CORS(app)

# Get the directory of this script
SCRIPT_DIR = Path(__file__).parent.resolve()
PROJECT_ROOT = SCRIPT_DIR.parent

# Model paths - try multiple possible locations
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

# Find and load model
model = None
scaler = None
vectorizer = None
model_loaded = False

for model_path in MODEL_PATHS:
    resolved_path = model_path.resolve()
    if resolved_path.exists():
        try:
            print(f"Loading model from: {resolved_path}")
            model = keras.models.load_model(str(resolved_path))
            model_loaded = True
            break
        except Exception as e:
            print(f"Failed to load model from {resolved_path}: {e}")

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
    print("WARNING: Model file not found! Using fallback scoring.")
    print("Please ensure model.keras is in ai-models/writing-scorer/")
    model = None
    scaler = None
    vectorizer = None


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


def score_to_scale_10(ielts_score: float) -> float:
    """Convert IELTS score (0-9) to 10-point scale"""
    # Linear conversion: 0-9 -> 0-10
    return round((ielts_score / 9.0) * 10.0, 1)


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


def get_detailed_feedback(text: str, score_10: float, prompt: str = "") -> Dict:
    """Generate detailed feedback based on 10-point scale score and prompt analysis"""
    
    word_count = len(text.split())
    sentence_count = len(re.split(r'[.!?]+', text))
    unique_words = len(set(text.lower().split()))
    paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
    paragraph_count = len(paragraphs)
    
    # Task Response - Based on prompt relevance and requirements (CEFR-based, not IELTS)
    task_response_score_10 = score_10
    task_response_feedback = []
    
    # Analyze prompt requirements
    prompt_lower = prompt.lower() if prompt else ""
    
    # Check if text addresses the prompt
    if prompt:
        # Simple keyword matching - can be improved with NLP
        prompt_keywords = set(prompt_lower.split())
        text_lower = text.lower()
        matching_keywords = sum(1 for keyword in prompt_keywords if len(keyword) > 4 and keyword in text_lower)
        keyword_coverage = matching_keywords / len(prompt_keywords) if prompt_keywords else 0
        
        if keyword_coverage < 0.3:
            task_response_feedback.append("❌ Your response doesn't fully address the prompt. Focus more on the given topic.")
            task_response_score_10 = max(0, task_response_score_10 - 2.0)
        elif keyword_coverage < 0.5:
            task_response_feedback.append("⚠️ Try to address the prompt more directly.")
            task_response_score_10 = max(0, task_response_score_10 - 1.0)
        else:
            task_response_feedback.append("✓ Good relevance to the prompt")
    
    # Check structure and organization
    if paragraph_count < 3:
        task_response_feedback.append("❌ Structure is unclear. Organize your ideas into paragraphs.")
        task_response_score_10 = max(0, task_response_score_10 - 1.5)
    elif paragraph_count < 4:
        task_response_feedback.append("⚠️ Consider adding more paragraphs for better organization.")
    else:
        task_response_feedback.append("✓ Good paragraph structure")
    
    # Check word count based on CEFR requirements (more flexible than IELTS)
    if word_count < 150:
        task_response_feedback.append("❌ Word count is too low. Expand your ideas.")
        task_response_score_10 = max(0, task_response_score_10 - 2.0)
    elif word_count < 200:
        task_response_feedback.append("⚠️ Try to write more to fully develop your ideas.")
        task_response_score_10 = max(0, task_response_score_10 - 0.5)
    elif word_count >= 250:
        task_response_feedback.append("✓ Good length for developing your ideas")
    
    task_response_score_10 = min(10.0, task_response_score_10)
    
    # Coherence and Cohesion - Convert to 10-point scale
    coherence_score_10 = score_10
    coherence_feedback = []
    
    if sentence_count < 8:
        coherence_feedback.append("❌ Too few sentences. Break your ideas into more sentences.")
        coherence_score_10 = max(0, coherence_score_10 - 1.5)
    elif sentence_count < 12:
        coherence_feedback.append("⚠️ Try to vary your sentence length and structure.")
    else:
        coherence_feedback.append("✓ Good sentence variety")
    
    # Check for linking words
    linking_words = len(re.findall(r'\b(however|moreover|therefore|furthermore|in addition|consequently|although|because|while|whereas|and|but|or|so|yet)\b', text.lower()))
    if linking_words < 3:
        coherence_feedback.append("⚠️ Use more linking words to connect your ideas.")
        coherence_score_10 = max(0, coherence_score_10 - 0.5)
    else:
        coherence_feedback.append("✓ Good use of linking words")
    
    coherence_score_10 = min(10.0, coherence_score_10)
    
    # Lexical Resource - Convert to 10-point scale
    lexical_score_10 = score_10
    lexical_diversity = unique_words / word_count if word_count > 0 else 0
    lexical_feedback = []
    
    if lexical_diversity < 0.35:
        lexical_feedback.append("❌ Limited vocabulary range. Use more varied words.")
        lexical_score_10 = max(0, lexical_score_10 - 2.0)
    elif lexical_diversity < 0.50:
        lexical_feedback.append("⚠️ Vocabulary could be more diverse.")
        lexical_score_10 = max(0, lexical_score_10 - 1.0)
    else:
        lexical_feedback.append("✓ Good vocabulary diversity")
    
    # Check for academic/advanced vocabulary
    advanced_words = len(re.findall(r'\b(consequently|furthermore|moreover|nevertheless|therefore|demonstrate|illustrate|analyze|significant|essential)\b', text.lower()))
    if advanced_words < 2 and word_count > 200:
        lexical_feedback.append("⚠️ Consider using more advanced vocabulary.")
        lexical_score_10 = max(0, lexical_score_10 - 0.5)
    
    lexical_score_10 = min(10.0, lexical_score_10)
    
    # Grammatical Range and Accuracy - Convert to 10-point scale
    grammar_score_10 = score_10
    grammar_feedback = []
    
    avg_sentence_length = word_count / sentence_count if sentence_count > 0 else 0
    if avg_sentence_length < 8:
        grammar_feedback.append("❌ Sentences are too short. Use more complex structures.")
        grammar_score_10 = max(0, grammar_score_10 - 2.0)
    elif avg_sentence_length < 12:
        grammar_feedback.append("⚠️ Try to vary sentence complexity.")
        grammar_score_10 = max(0, grammar_score_10 - 0.5)
    else:
        grammar_feedback.append("✓ Good sentence complexity")
    
    # Check for complex structures (relative clauses, conditionals, etc.)
    complex_structures = len(re.findall(r'\b(that|which|who|when|where|if|unless|although|because|since|while)\b', text.lower()))
    if complex_structures < 5:
        grammar_feedback.append("⚠️ Try to use more complex grammatical structures.")
        grammar_score_10 = max(0, grammar_score_10 - 0.5)
    else:
        grammar_feedback.append("✓ Good use of complex structures")
    
    grammar_score_10 = min(10.0, grammar_score_10)
    
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
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model_loaded,
        'scaler_loaded': scaler is not None,
        'vectorizer_loaded': vectorizer is not None,
        'model_path': str(MODEL_PATHS[0].resolve()) if MODEL_PATHS else None
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


@app.route('/score', methods=['POST'])
def score_writing():
    """Score writing submission"""
    try:
        data = request.json
        text = data.get('text', '')
        prompt = data.get('prompt', '')
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        # Use model if available, otherwise use fallback
        if model_loaded and model is not None:
            try:
                # Extract features (use vectorizer if available)
                features = extract_features_with_vectorizer(text)
                
                # Scale features - only if using manual features, not vectorizer
                # Vectorizer output (e.g., 10000 features) is incompatible with scaler (67 features)
                if vectorizer is None and scaler is not None:
                    # Using manual features (67) - can use scaler
                    features_scaled = scaler.transform(features)
                elif vectorizer is not None:
                    # Using vectorizer (10000+ features) - don't use scaler
                    features_scaled = features
                    print(f"Using vectorizer features: {features.shape}")
                else:
                    # No scaler available - use features as is
                    features_scaled = features
                
                # Predict IELTS score
                prediction = model.predict(features_scaled, verbose=0)
                
                # Handle different prediction shapes
                if isinstance(prediction, np.ndarray):
                    if prediction.ndim > 1:
                        ielts_score = float(prediction[0][0] if len(prediction[0]) > 0 else prediction[0])
                    else:
                        ielts_score = float(prediction[0])
                else:
                    ielts_score = float(prediction)
                    
                ielts_score = max(0, min(9, ielts_score))  # Clamp to 0-9
                print(f"Model prediction: {ielts_score}")
            except ValueError as e:
                # Feature mismatch or other model error - use fallback
                print(f"Model scoring failed (likely feature mismatch): {e}")
                import traceback
                traceback.print_exc()
                print("Using fallback scoring instead")
                ielts_score = fallback_score(text)
            except Exception as e:
                # Any other error - use fallback
                print(f"Error using model: {e}")
                import traceback
                traceback.print_exc()
                print("Using fallback scoring instead")
                ielts_score = fallback_score(text)
        else:
            # Use fallback scoring
            print("Using fallback scoring (model not loaded)")
            ielts_score = fallback_score(text)
        
        # Convert IELTS score (0-9) to 10-point scale
        score_10 = score_to_scale_10(ielts_score)
        print(f"Converted to 10-point scale: {score_10}")
        
        # Convert to CEFR using 10-point scale
        cefr_level, cefr_description = score_to_cefr(score_10)
        
        # Get detailed feedback (using 10-point scale and prompt)
        detailed_feedback = get_detailed_feedback(text, score_10, prompt)
        
        # Calculate overall score (average of 4 criteria) - already in 10-point scale
        overall_score = (
            detailed_feedback['task_response']['score'] +
            detailed_feedback['coherence_cohesion']['score'] +
            detailed_feedback['lexical_resource']['score'] +
            detailed_feedback['grammatical_range']['score']
        ) / 4
        
        return jsonify({
            'score_10': round(score_10, 1),  # New: 10-point scale
            'overall_score': round(overall_score, 1),  # Already in 10-point scale
            'cefr_level': cefr_level,
            'cefr_description': cefr_description,
            'detailed_scores': detailed_feedback,  # All scores are in 10-point scale
            'word_count': len(text.split()),
            'statistics': {
                'words': len(text.split()),
                'characters': len(text),
                'sentences': len(re.split(r'[.!?]+', text)),
                'paragraphs': len([p.strip() for p in text.split('\n\n') if p.strip()]),
                'unique_words': len(set(text.lower().split()))
            },
            'using_fallback': not model_loaded
        })
        
    except Exception as e:
        print(f"Error scoring writing: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/grammar-check', methods=['POST'])
def grammar_check():
    """Grammar checking using LanguageTool API"""
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
                
                # Convert LanguageTool matches to our format
                # LanguageTool returns all matches, so we process all of them
                matches = lt_data.get('matches', [])
                print(f"LanguageTool found {len(matches)} issues")
                
                for match in matches:
                    issue = {
                        'type': match.get('rule', {}).get('category', {}).get('name', 'Grammar'),
                        'message': match.get('message', 'Grammar error'),
                        'short_message': match.get('shortMessage', ''),
                        'offset': match.get('offset', 0),
                        'length': match.get('length', 0),
                        'context': match.get('context', {}),
                        'sentence_index': 0,  # Can be calculated from offset if needed
                        'severity': 'error' if match.get('rule', {}).get('issueType') == 'misspelling' else 'warning',
                        'replacements': [{'value': r.get('value', '')} for r in match.get('replacements', [])[:5]],  # Top 5 suggestions
                    }
                    issues.append(issue)
                
                print(f"Returning {len(issues)} issues to frontend")
                
                return jsonify({
                    'issues': issues,
                    'issue_count': len(issues),
                    'language': lt_data.get('language', {}).get('name', language)
                })
            else:
                # Fallback to basic checks if API fails
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
                length = 1  # Length of the character that should be capitalized
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
                # Calculate actual offset in full text
                offset = sentence_start_offset + pos + 1  # +1 to skip space before 'i'
                length = 1  # Length of 'i' that should be 'I'
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
        
        i += 2  # Move to next sentence (skip punctuation)
    
    # Check for common misspellings and errors
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
            # Check if it's a whole word (not part of another word)
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


if __name__ == '__main__':
    print("Starting Writing Scorer Service on port 5001...")
    app.run(host='0.0.0.0', port=5001, debug=True)

