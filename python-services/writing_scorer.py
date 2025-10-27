"""
IELTS Writing Scorer Service
Uses Keras model to score IELTS writing and converts to CEFR levels
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import pickle
import re
from tensorflow import keras
from typing import Dict, List, Tuple

app = Flask(__name__)
CORS(app)

# Load model and scaler
model = keras.models.load_model('../ai-models/writing-scorer/model.keras')
with open('../ai-models/writing-scorer/scaler.pkl', 'rb') as f:
    scaler = pickle.load(f)


def extract_features(text: str) -> np.ndarray:
    """Extract features from text for model input"""
    
    # Basic text statistics
    word_count = len(text.split())
    char_count = len(text)
    sentence_count = len(re.split(r'[.!?]+', text))
    
    # Average lengths
    avg_word_length = char_count / word_count if word_count > 0 else 0
    avg_sentence_length = word_count / sentence_count if sentence_count > 0 else 0
    
    # Vocabulary diversity
    unique_words = len(set(text.lower().split()))
    lexical_diversity = unique_words / word_count if word_count > 0 else 0
    
    # Punctuation and capitalization
    punctuation_count = sum(1 for c in text if c in '.,!?;:')
    capital_letters = sum(1 for c in text if c.isupper())
    
    # Paragraph structure
    paragraph_count = len(text.split('\n\n'))
    
    # Complex sentence indicators
    complex_words = sum(1 for word in text.split() if len(word) > 6)
    conjunctions = len(re.findall(r'\b(however|moreover|therefore|furthermore|nevertheless)\b', text.lower()))
    
    # Feature vector (adjust based on your model's input)
    features = np.array([
        word_count,
        char_count,
        sentence_count,
        avg_word_length,
        avg_sentence_length,
        lexical_diversity,
        punctuation_count,
        capital_letters,
        paragraph_count,
        complex_words,
        conjunctions,
        # Add more features as needed for your model
    ])
    
    return features.reshape(1, -1)


def ielts_to_cefr(ielts_score: float) -> Tuple[str, str]:
    """Convert IELTS score to CEFR level"""
    if ielts_score >= 8.5:
        return 'C2', 'Proficient'
    elif ielts_score >= 7.0:
        return 'C1', 'Advanced'
    elif ielts_score >= 5.5:
        return 'B2', 'Upper Intermediate'
    elif ielts_score >= 4.0:
        return 'B1', 'Intermediate'
    elif ielts_score >= 3.0:
        return 'A2', 'Elementary'
    else:
        return 'A1', 'Beginner'


def get_detailed_feedback(text: str, ielts_score: float) -> Dict:
    """Generate detailed feedback based on score and analysis"""
    
    word_count = len(text.split())
    sentence_count = len(re.split(r'[.!?]+', text))
    unique_words = len(set(text.lower().split()))
    
    # Task Response
    task_response_score = min(9, ielts_score + 0.5)
    task_response_feedback = []
    
    if word_count < 250:
        task_response_feedback.append("❌ Word count is below 250 words. Aim for at least 250 words.")
        task_response_score = min(task_response_score, 5.5)
    elif word_count < 270:
        task_response_feedback.append("⚠️ Word count is slightly low. Try to write more.")
    else:
        task_response_feedback.append("✓ Good word count")
    
    # Coherence and Cohesion
    coherence_score = min(9, ielts_score)
    coherence_feedback = []
    
    if sentence_count < 10:
        coherence_feedback.append("❌ Too few sentences. Break your ideas into more sentences.")
    else:
        coherence_feedback.append("✓ Good sentence variety")
    
    # Lexical Resource
    lexical_score = min(9, ielts_score)
    lexical_diversity = unique_words / word_count if word_count > 0 else 0
    lexical_feedback = []
    
    if lexical_diversity < 0.4:
        lexical_feedback.append("❌ Limited vocabulary range. Use more varied words.")
        lexical_score = min(lexical_score, 5.5)
    elif lexical_diversity < 0.6:
        lexical_feedback.append("⚠️ Vocabulary could be more diverse")
    else:
        lexical_feedback.append("✓ Good vocabulary diversity")
    
    # Grammatical Range and Accuracy
    grammar_score = min(9, ielts_score - 0.5)
    grammar_feedback = []
    
    avg_sentence_length = word_count / sentence_count if sentence_count > 0 else 0
    if avg_sentence_length < 10:
        grammar_feedback.append("❌ Sentences are too short. Use more complex structures.")
        grammar_score = min(grammar_score, 5.5)
    elif avg_sentence_length < 15:
        grammar_feedback.append("⚠️ Try to vary sentence complexity")
    else:
        grammar_feedback.append("✓ Good sentence complexity")
    
    return {
        'task_response': {
            'score': round(task_response_score, 1),
            'feedback': task_response_feedback
        },
        'coherence_cohesion': {
            'score': round(coherence_score, 1),
            'feedback': coherence_feedback
        },
        'lexical_resource': {
            'score': round(lexical_score, 1),
            'feedback': lexical_feedback
        },
        'grammatical_range': {
            'score': round(grammar_score, 1),
            'feedback': grammar_feedback
        }
    }


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'model_loaded': True})


@app.route('/score', methods=['POST'])
def score_writing():
    """Score writing submission"""
    try:
        data = request.json
        text = data.get('text', '')
        prompt = data.get('prompt', '')
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        # Extract features
        features = extract_features(text)
        
        # Scale features
        features_scaled = scaler.transform(features)
        
        # Predict IELTS score
        prediction = model.predict(features_scaled, verbose=0)
        ielts_score = float(prediction[0][0])
        ielts_score = max(0, min(9, ielts_score))  # Clamp to 0-9
        
        # Convert to CEFR
        cefr_level, cefr_description = ielts_to_cefr(ielts_score)
        
        # Get detailed feedback
        detailed_feedback = get_detailed_feedback(text, ielts_score)
        
        # Calculate overall score (average of 4 criteria)
        overall_score = (
            detailed_feedback['task_response']['score'] +
            detailed_feedback['coherence_cohesion']['score'] +
            detailed_feedback['lexical_resource']['score'] +
            detailed_feedback['grammatical_range']['score']
        ) / 4
        
        return jsonify({
            'ielts_score': round(ielts_score, 1),
            'overall_score': round(overall_score, 1),
            'cefr_level': cefr_level,
            'cefr_description': cefr_description,
            'detailed_scores': detailed_feedback,
            'word_count': len(text.split()),
            'statistics': {
                'words': len(text.split()),
                'characters': len(text),
                'sentences': len(re.split(r'[.!?]+', text)),
                'paragraphs': len(text.split('\n\n')),
                'unique_words': len(set(text.lower().split()))
            }
        })
        
    except Exception as e:
        print(f"Error scoring writing: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/grammar-check', methods=['POST'])
def grammar_check():
    """Basic grammar checking (can be enhanced with LanguageTool)"""
    try:
        data = request.json
        text = data.get('text', '')
        
        issues = []
        
        # Basic checks
        sentences = re.split(r'[.!?]+', text)
        for i, sentence in enumerate(sentences):
            sentence = sentence.strip()
            if sentence:
                # Check capitalization
                if sentence[0].islower():
                    issues.append({
                        'type': 'capitalization',
                        'message': 'Sentence should start with capital letter',
                        'sentence_index': i,
                        'severity': 'error'
                    })
                
                # Check common errors
                if ' i ' in sentence.lower():
                    issues.append({
                        'type': 'pronoun',
                        'message': 'Use "I" (capital) for first person pronoun',
                        'sentence_index': i,
                        'severity': 'error'
                    })
        
        return jsonify({
            'issues': issues,
            'issue_count': len(issues)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print("Starting Writing Scorer Service on port 5001...")
    app.run(host='0.0.0.0', port=5001, debug=True)

