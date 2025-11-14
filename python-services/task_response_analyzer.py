"""
Task Response Analyzer
Uses semantic analysis to evaluate if essay addresses the prompt/task requirements
Can use Gemini API or fallback to rule-based analysis
"""

import os
import re
import json
from typing import Dict, Optional, Tuple
import requests
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


def analyze_task_response_semantic(
    essay: str,
    prompt: str,
    task_level: str = "B2",
    task_type: str = "essay",
    use_gemini: bool = True
) -> Dict:
    """
    Analyze task response relevance using semantic analysis
    
    Args:
        essay: Student's essay text
        prompt: Writing prompt/task question
        task_level: CEFR level (A1, A2, B1, B2, C1, C2)
        use_gemini: Whether to use Gemini API (requires GEMINI_API_KEY)
    
    Returns:
        Dictionary with:
        - relevance_score: 0-10 score for how well essay addresses prompt
        - coverage_score: 0-10 score for how well essay covers all parts of prompt
        - feedback: List of feedback points
        - strengths: List of strengths
        - weaknesses: List of weaknesses
    """
    
    if not prompt or not prompt.strip():
        # No prompt provided, return neutral score
        return {
            'relevance_score': 7.0,
            'coverage_score': 7.0,
            'feedback': ["No prompt provided for comparison"],
            'strengths': [],
            'weaknesses': []
        }
    
    # Try Gemini API if available
    if use_gemini:
        try:
            gemini_result = analyze_with_gemini(essay, prompt, task_level, task_type)
            if gemini_result:
                return gemini_result
        except Exception as e:
            print(f"[Task Response Analyzer] Gemini API failed: {e}, using fallback")
    
    # Fallback to rule-based analysis
    return analyze_task_response_rule_based(essay, prompt, task_level, task_type)


def analyze_with_gemini(
    essay: str,
    prompt: str,
    task_level: str,
    task_type: str = "essay"
) -> Optional[Dict]:
    """
    Analyze task response using Gemini API
    
    Args:
        essay: Student's essay text
        prompt: Writing prompt/task question
        task_level: CEFR level
    
    Returns:
        Dictionary with analysis results or None if API call fails
    """
    
    gemini_api_key = os.getenv('GEMINI_API_KEY')
    if not gemini_api_key:
        return None
    
    # Truncate essay if too long (Gemini has token limits)
    max_essay_length = 3000
    truncated_essay = essay[:max_essay_length] if len(essay) > max_essay_length else essay
    
    # Map task types to descriptions
    task_type_descriptions = {
        'sentence': 'sentence writing task',
        'paragraph': 'paragraph writing task',
        'email': 'email writing task',
        'essay': 'essay writing task',
        'short_essay': 'short essay writing task'
    }
    task_description = task_type_descriptions.get(task_type.lower(), 'writing task')
    
    # Build context-aware prompt for Gemini
    analysis_prompt = f"""You are an expert English teacher evaluating a student's {task_description} at {task_level} level.

IMPORTANT CONTEXT:
- Task Type: {task_type.upper()} (NOT a full academic essay - this is a {task_description})
- CEFR Level: {task_level}
- For {task_type} tasks, be MORE LENIENT with relevance - students may express ideas differently but still be on-topic
- Focus on whether the student addresses the MAIN TOPIC, not exact word matching
- Consider that students at {task_level} level may use simpler vocabulary but still be relevant

Writing Prompt/Task:
"{prompt}"

Student's Response:
"{truncated_essay}"

Evaluate with CONTEXT AWARENESS:
1. RELEVANCE (0-10): Does the response address the MAIN TOPIC of the prompt? 
   - Be LENIENT: If the student writes about the general topic area, give credit (7+)
   - Only mark as off-topic (below 5) if completely unrelated to the prompt topic
   - Consider synonyms and related concepts as relevant
   
2. COVERAGE (0-10): Does the response address the key requirements of the prompt?
   - For {task_type} tasks, focus on main ideas, not exhaustive coverage
   - If prompt asks for specific elements (e.g., "both views"), check if addressed
   - Be reasonable - don't expect perfect coverage for {task_level} level tasks
   
3. TASK TYPE APPROPRIATENESS: Does the response match the {task_type} format?
   - Sentence tasks: Should be complete sentences
   - Paragraph tasks: Should be coherent paragraph(s)
   - Email tasks: Should have email structure (greeting, body, closing)
   - Essay tasks: Should have essay structure (intro, body, conclusion)

CRITICAL INSTRUCTIONS:
- Be GENEROUS with relevance scores (default to 7-8 if topic is addressed, even if not perfectly)
- Only mark as off-topic (below 6) if clearly unrelated to the prompt
- Consider the student's level ({task_level}) - don't expect perfect responses
- Provide constructive, encouraging feedback
- Focus on what the student DID well, not just what's missing

CRITICAL: Return ONLY valid JSON with this EXACT structure:
{{
  "relevance_score": 8.0,
  "coverage_score": 7.5,
  "feedback": [
    "The response addresses the main topic effectively",
    "Good understanding of the prompt requirements",
    "Could develop ideas further with more examples"
  ],
  "strengths": [
    "Addresses the main topic clearly",
    "Provides relevant content",
    "Appropriate for {task_level} level"
  ],
  "weaknesses": [
    "Could expand on some points",
    "Consider adding more specific examples",
    "Work on connecting ideas more smoothly"
  ]
}}

IMPORTANT SCORING GUIDELINES - OFF-TOPIC DETECTION:
- Relevance: Be EXTREMELY STRICT about topic matching
- If essay is about a DIFFERENT TOPIC, give relevance < 5 (be strict!)
- Examples of off-topic (ALL should get relevance < 5):
  * Prompt: "weekend activities" → Essay: "daily routine, work" → relevance < 5
  * Prompt: "last vacation" → Essay: "usually I study every day" → relevance < 5
  * Prompt: "online shopping" → Essay: "work from home vs office" → relevance < 5
  * Prompt: "university education" → Essay: "work from home benefits" → relevance < 5
  * Prompt: "environmental pollution" → Essay: "remote work advantages" → relevance < 5
  * Prompt: "technology and children" → Essay: "office vs home work" → relevance < 5
- CRITICAL: Check if essay's MAIN TOPIC matches prompt's MAIN TOPIC
- Only give relevance >= 7 if essay clearly addresses the SAME TOPIC as the prompt
- If essay is off-topic (different topic entirely), give relevance 1-4
- Coverage: Be reasonable - {task_type} tasks don't need exhaustive coverage
- Level-based strictness: {task_level} level requires higher quality - be stricter than lower levels
- All scores must be numbers between 0 and 10
- "feedback" should have 3-5 constructive, encouraging points
- "strengths" should highlight what the student did well (2-4 items)
- "weaknesses" should be suggestions for improvement, not harsh criticism (2-4 items)
- All string values must be properly escaped
- Return ONLY the JSON object, no additional text
- Remember: This is a {task_level} level {task_type} task - adjust expectations accordingly

CRITICAL OFF-TOPIC RULES (MUST FOLLOW STRICTLY):
1. Weekend/Saturday/Sunday prompt but essay about work/office/weekday/daily → relevance < 5
2. Past/memory prompt but essay uses habitual present (every/usually/always) → relevance < 5
3. Vacation/holiday/trip prompt but essay about work/school/class → relevance < 5
4. Online shopping prompt but essay about work/office/remote work → relevance < 5
5. Education/university prompt but essay about workplace/office → relevance < 5
6. Environment/pollution prompt but essay about work/technology without environmental focus → relevance < 5
7. Technology/children prompt but essay about workplace/office → relevance < 5
8. Check MAIN TOPIC NOUNS: if prompt's main nouns (shopping, education, pollution, children, etc.) are missing or barely mentioned in essay → relevance < 5
9. YOU MUST give relevance_score < 5.0 if the essay's MAIN TOPIC is COMPLETELY DIFFERENT from the prompt's MAIN TOPIC
10. Be STRICT: if essay discusses Topic A but prompt asks about Topic B (even if both are valid topics), give relevance < 5"""
    
    try:
        # Try v1 first, fallback to v1beta if needed
        api_url = f"https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key={gemini_api_key}"
        
        response = requests.post(
            api_url,
            json={
                "contents": [{
                    "parts": [{
                        "text": analysis_prompt
                    }]
                }],
                "generationConfig": {
                    "temperature": 0.3,
                    "topK": 40,
                    "topP": 0.95,
                    "maxOutputTokens": 2000,
                    "responseMimeType": "application/json"
                }
            },
            timeout=30
        )
        
        # If 404, try v1beta
        if response.status_code == 404:
            api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={gemini_api_key}"
            response = requests.post(
                api_url,
                json={
                    "contents": [{
                        "parts": [{
                            "text": analysis_prompt
                        }]
                    }],
                    "generationConfig": {
                        "temperature": 0.3,
                        "topK": 40,
                        "topP": 0.95,
                        "maxOutputTokens": 2000,
                        "responseMimeType": "application/json"
                    }
                },
                timeout=30
            )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('candidates') and len(data['candidates']) > 0:
                candidate = data['candidates'][0]
                if candidate.get('content') and candidate['content'].get('parts'):
                    text = candidate['content']['parts'][0].get('text', '')
                    if text:
                        # Parse JSON response
                        result = json.loads(text)
                        return {
                            'relevance_score': float(result.get('relevance_score', 7.0)),
                            'coverage_score': float(result.get('coverage_score', 7.0)),
                            'feedback': result.get('feedback', []),
                            'strengths': result.get('strengths', []),
                            'weaknesses': result.get('weaknesses', [])
                        }
    except Exception as e:
        print(f"[Task Response Analyzer] Error calling Gemini API: {e}")
        return None
    
    return None


def analyze_task_response_rule_based(
    essay: str,
    prompt: str,
    task_level: str,
    task_type: str = "essay"
) -> Dict:
    """
    Analyze task response using rule-based heuristics (fallback when Gemini unavailable)
    
    Args:
        essay: Student's essay text
        prompt: Writing prompt/task question
        task_level: CEFR level
    
    Returns:
        Dictionary with analysis results
    """
    
    essay_lower = essay.lower()
    prompt_lower = prompt.lower()
    
    # Extract key topics from prompt
    # Remove common stop words and extract meaningful keywords
    stop_words = {
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
        'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
        'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this',
        'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their',
        'what', 'which', 'who', 'whom', 'whose', 'where', 'when', 'why',
        'how', 'all', 'each', 'every', 'some', 'any', 'no', 'not', 'if',
        'then', 'else', 'while', 'because', 'although', 'however', 'therefore'
    }
    
    # Extract meaningful words from prompt (length > 3, not stop words)
    prompt_words = set([
        word for word in re.findall(r'\b\w+\b', prompt_lower)
        if len(word) > 3 and word not in stop_words
    ])
    
    # Extract meaningful words from essay
    essay_words = set([
        word for word in re.findall(r'\b\w+\b', essay_lower)
        if len(word) > 3 and word not in stop_words
    ])
    
    # Calculate keyword overlap (more lenient)
    if len(prompt_words) > 0:
        # Count exact matches
        exact_matches = len(prompt_words.intersection(essay_words))
        
        # Also check for related words (synonyms, word stems)
        # For example, "technology" matches "technological", "technologies"
        related_matches = 0
        for prompt_word in prompt_words:
            # Check if essay contains words that start with the same stem
            for essay_word in essay_words:
                if prompt_word[:4] in essay_word or essay_word[:4] in prompt_word:
                    related_matches += 0.5
                    break
        
        keyword_overlap = (exact_matches + related_matches) / len(prompt_words)
        # Cap at 1.0
        keyword_overlap = min(1.0, keyword_overlap)
    else:
        keyword_overlap = 0.6  # More lenient default if no keywords found
    
    # Check for task type indicators in prompt
    task_indicators = {
        'discuss': 'discuss' in prompt_lower,
        'opinion': 'opinion' in prompt_lower or 'think' in prompt_lower or 'believe' in prompt_lower,
        'compare': 'compare' in prompt_lower or 'comparison' in prompt_lower,
        'contrast': 'contrast' in prompt_lower or 'difference' in prompt_lower,
        'both views': 'both' in prompt_lower and ('view' in prompt_lower or 'side' in prompt_lower),
        'advantages': 'advantage' in prompt_lower or 'benefit' in prompt_lower,
        'disadvantages': 'disadvantage' in prompt_lower or 'drawback' in prompt_lower,
    }
    
    # Check if essay addresses task requirements
    essay_has_opinion = 'i think' in essay_lower or 'i believe' in essay_lower or 'in my opinion' in essay_lower or 'i agree' in essay_lower or 'i disagree' in essay_lower
    essay_has_comparison = 'compare' in essay_lower or 'similar' in essay_lower or 'different' in essay_lower or 'whereas' in essay_lower or 'while' in essay_lower
    essay_has_both_sides = essay_lower.count('however') > 0 or essay_lower.count('on the other hand') > 0 or essay_lower.count('although') > 0
    
    # Calculate relevance score (more lenient)
    # Base score from keyword overlap, but be generous
    if keyword_overlap >= 0.5:
        relevance_score = 7.5 + (keyword_overlap - 0.5) * 5.0  # 7.5-10 range
    elif keyword_overlap >= 0.3:
        relevance_score = 6.0 + (keyword_overlap - 0.3) * 7.5  # 6.0-7.5 range
    else:
        relevance_score = keyword_overlap * 20.0  # 0-6 range
    
    # Adjust based on task requirements (but be lenient)
    # Only penalize if task clearly requires something and it's completely missing
    if task_indicators['opinion'] and not essay_has_opinion:
        # Check if essay has any opinion-like statements
        has_any_opinion = 'i' in essay_lower and ('think' in essay_lower or 'believe' in essay_lower or 'feel' in essay_lower or 'agree' in essay_lower or 'disagree' in essay_lower)
        if not has_any_opinion:
            relevance_score -= 1.5  # Reduced penalty
    if task_indicators['compare'] and not essay_has_comparison:
        relevance_score -= 1.0  # Reduced penalty
    if task_indicators['both views'] and not essay_has_both_sides:
        # Check if essay has any contrast indicators
        has_contrast = 'but' in essay_lower or 'however' in essay_lower or 'although' in essay_lower
        if not has_contrast:
            relevance_score -= 1.5  # Reduced penalty
    
    # Calculate coverage score
    coverage_score = 7.0  # Base score
    if task_indicators['both views']:
        if essay_has_both_sides:
            coverage_score += 1.0
        else:
            coverage_score -= 2.0
    if task_indicators['advantages'] and 'disadvantages' in prompt_lower:
        if 'advantage' in essay_lower and 'disadvantage' in essay_lower:
            coverage_score += 1.0
        else:
            coverage_score -= 1.5
    
    # Ensure scores are in valid range
    relevance_score = max(0.0, min(10.0, relevance_score))
    coverage_score = max(0.0, min(10.0, coverage_score))
    
    # Generate feedback (more encouraging, task-type aware)
    feedback = []
    strengths = []
    weaknesses = []
    
    # Task-type specific feedback
    task_type_lower = task_type.lower()
    if 'sentence' in task_type_lower:
        task_context = "sentence"
    elif 'paragraph' in task_type_lower:
        task_context = "paragraph"
    elif 'email' in task_type_lower:
        task_context = "email"
    else:
        task_context = "essay"
    
    if keyword_overlap >= 0.5:
        strengths.append(f"Your {task_context} addresses the main topic effectively")
        feedback.append(f"Good relevance to the prompt topic - your {task_context} stays on track")
        if keyword_overlap >= 0.7:
            strengths.append("Clear connection between your response and the prompt")
    elif keyword_overlap >= 0.3:
        feedback.append(f"Your {task_context} addresses the topic - try to use more specific vocabulary from the prompt")
        strengths.append("You understood the general topic")
    else:
        # Only mark as off-topic if really low overlap
        if keyword_overlap < 0.2:
            weaknesses.append(f"Your {task_context} may not fully address the prompt topic")
            feedback.append("Try to connect your ideas more directly to the prompt")
        else:
            feedback.append(f"Your {task_context} touches on the topic - try to be more specific to the prompt")
            strengths.append("You attempted to address the topic")
    
    # Task requirements feedback (encouraging)
    if task_indicators['opinion'] and essay_has_opinion:
        strengths.append("Clear opinion/position stated")
        feedback.append("Good job stating your position clearly")
    elif task_indicators['opinion'] and not essay_has_opinion:
        feedback.append("The prompt asks for your opinion - try adding phrases like 'I think' or 'In my opinion'")
        # Don't add to weaknesses if it's a minor issue
    
    if task_indicators['both views'] and essay_has_both_sides:
        strengths.append("Addresses both sides of the argument")
        feedback.append("Excellent job discussing both perspectives")
    elif task_indicators['both views'] and not essay_has_both_sides:
        feedback.append("Try to discuss both sides of the argument - use phrases like 'On the one hand... On the other hand'")
        # Don't add to weaknesses - just suggest improvement
    
    # Ensure we have positive feedback
    if not strengths:
        strengths.append(f"Your {task_context} shows understanding of the task")
        strengths.append("You attempted to address the prompt")
    
    if not weaknesses:
        # Only add constructive suggestions, not harsh weaknesses
        weaknesses.append("Consider using more vocabulary from the prompt")
        weaknesses.append("Try to develop your ideas further")
    
    return {
        'relevance_score': round(relevance_score, 1),
        'coverage_score': round(coverage_score, 1),
        'feedback': feedback,
        'strengths': strengths,
        'weaknesses': weaknesses
    }

