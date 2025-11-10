"""
Content Validator
Validates if essay content addresses the prompt requirements
Uses semantic understanding to check relevance
"""

import re
import json
import requests
import os
from typing import Dict, List, Optional, Tuple


def validate_content_with_gemini(
    essay: str,
    prompt: str,
    prompt_analysis: Dict,
    task_level: str = "B2"
) -> Optional[Dict]:
    """
    Use Gemini to validate if essay addresses prompt requirements
    Returns validation result with detailed feedback
    """
    gemini_api_key = os.environ.get('GEMINI_API_KEY')
    
    if not gemini_api_key:
        print("[Content Validator] Gemini API key not configured")
        return None
    
    # Build required elements text
    required_text = ""
    if prompt_analysis.get('required_elements'):
        required_text = "\n".join([
            f"- {key.upper()}: {value}"
            for key, value in prompt_analysis['required_elements'].items()
            if value
        ])
    
    # Build content requirements text
    content_reqs_text = ""
    if prompt_analysis.get('content_requirements'):
        content_reqs_text = "\n".join([
            f"- {req}" for req in prompt_analysis['content_requirements']
        ])
    
    validation_prompt = f"""You are an expert English writing evaluator. Check if the student's essay properly addresses the writing prompt requirements.

Writing Prompt: "{prompt}"

Required Elements:
{required_text if required_text else "- Address the main topic"}

Content Requirements:
{content_reqs_text if content_reqs_text else "- Stay on topic"}

Main Topic: {prompt_analysis.get('main_topic', 'general')}
Topic Keywords: {', '.join(prompt_analysis.get('topic_keywords', [])[:10])}

Student's Essay:
"{essay[:2500]}"

CRITICAL EVALUATION CRITERIA:
1. **Topic Relevance** (0-100): Does the essay discuss the SAME TOPIC as the prompt?
   - 90-100: Directly addresses the topic with clear connection
   - 70-89: Addresses the topic with some relevance
   - 50-69: Partially relevant but weak connection
   - 0-49: Off-topic or completely different subject

2. **Required Elements** (0-100): Does it include all required elements (what, where, when, why, who)?
   - Score based on how many required elements are present and well-developed

3. **Content Quality** (0-100): How well does it fulfill the writing purpose?
   - Consider depth, detail, and completeness of response

4. **Semantic Match** (0-100): Understanding synonyms and related concepts
   - "vacation" = "trip" = "travel" = "holiday" (SAME TOPIC)
   - "shopping online" = "e-commerce" = "buying on internet" (SAME TOPIC)
   - "daily routine" ≠ "vacation trip" (DIFFERENT TOPICS)

Return ONLY valid JSON with this EXACT structure:
{{
  "is_on_topic": true,
  "topic_relevance_score": 85,
  "required_elements_score": 90,
  "content_quality_score": 80,
  "overall_relevance": 85,
  "confidence": 0.9,
  "addressed_elements": ["what", "when", "why"],
  "missing_elements": ["where"],
  "feedback": {{
    "strengths": ["Clearly addresses main topic", "Good detail about activities"],
    "weaknesses": ["Missing location information", "Could expand on reasons"],
    "suggestions": ["Add more details about where this happened"]
  }},
  "off_topic_reason": ""
}}

If off-topic (score < 50):
{{
  "is_on_topic": false,
  "topic_relevance_score": 30,
  "required_elements_score": 20,
  "content_quality_score": 25,
  "overall_relevance": 25,
  "confidence": 0.95,
  "addressed_elements": [],
  "missing_elements": ["what", "where", "when", "why", "who"],
  "feedback": {{
    "strengths": [],
    "weaknesses": ["Essay discusses completely different topic"],
    "suggestions": ["Rewrite to address the actual prompt topic"]
  }},
  "off_topic_reason": "Essay discusses work/office but prompt asks about vacation/travel"
}}

Evaluate strictly but fairly. Return ONLY the JSON."""

    try:
        api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_api_key}"
        
        response = requests.post(
            api_url,
            json={
                "contents": [{
                    "parts": [{"text": validation_prompt}]
                }],
                "generationConfig": {
                    "temperature": 0.3,
                    "maxOutputTokens": 2048,
                }
            },
            timeout=15
        )
        
        if response.status_code != 200:
            print(f"[Content Validator] Gemini API error: {response.status_code}")
            return None
        
        result = response.json()
        
        if 'candidates' not in result or not result['candidates']:
            print("[Content Validator] No response from Gemini")
            return None
        
        content = result['candidates'][0]['content']['parts'][0]['text']
        
        # Extract JSON
        json_match = re.search(r'\{[\s\S]*\}', content)
        if not json_match:
            print("[Content Validator] No JSON in response")
            return None
        
        validation = json.loads(json_match.group(0))
        
        print(f"[Content Validator] Validation complete - On topic: {validation.get('is_on_topic')}, Relevance: {validation.get('overall_relevance')}")
        return validation
        
    except Exception as e:
        print(f"[Content Validator] Error: {e}")
        return None


def validate_content_rule_based(
    essay: str,
    prompt: str,
    prompt_analysis: Dict
) -> Dict:
    """
    Rule-based content validation as fallback
    """
    essay_lower = essay.lower()
    prompt_lower = prompt.lower()
    
    # Check topic keywords
    topic_keywords = prompt_analysis.get('topic_keywords', [])
    matched_keywords = sum(1 for kw in topic_keywords if kw in essay_lower)
    keyword_coverage = matched_keywords / len(topic_keywords) if topic_keywords else 0.5
    
    # Check required elements
    required_elements = prompt_analysis.get('required_elements', {})
    addressed_elements = []
    missing_elements = []
    
    for element, description in required_elements.items():
        # Simple heuristic: check if essay has relevant words
        element_indicators = {
            'what': ['do', 'did', 'activity', 'activities', 'action'],
            'where': ['place', 'location', 'at', 'in', 'to'],
            'when': ['time', 'day', 'morning', 'evening', 'last', 'ago'],
            'why': ['because', 'reason', 'since', 'special', 'memorable'],
            'who': ['with', 'friend', 'family', 'people', 'person']
        }
        
        indicators = element_indicators.get(element, [])
        if any(ind in essay_lower for ind in indicators):
            addressed_elements.append(element)
        else:
            missing_elements.append(element)
    
    elements_score = (len(addressed_elements) / len(required_elements) * 100) if required_elements else 80
    
    # Overall relevance
    overall_relevance = (keyword_coverage * 0.6 + elements_score / 100 * 0.4) * 100
    
    # Determine if on-topic
    is_on_topic = overall_relevance >= 50
    
    return {
        "is_on_topic": is_on_topic,
        "topic_relevance_score": int(keyword_coverage * 100),
        "required_elements_score": int(elements_score),
        "content_quality_score": 70,  # Default
        "overall_relevance": int(overall_relevance),
        "confidence": 0.6,  # Lower confidence for rule-based
        "addressed_elements": addressed_elements,
        "missing_elements": missing_elements,
        "feedback": {
            "strengths": ["Essay shows effort"] if is_on_topic else [],
            "weaknesses": [f"Missing {len(missing_elements)} required elements"] if missing_elements else [],
            "suggestions": [f"Add information about {', '.join(missing_elements)}"] if missing_elements else []
        },
        "off_topic_reason": "Low keyword coverage and missing elements" if not is_on_topic else "",
        "fallback": True
    }


def validate_content(
    essay: str,
    prompt: str,
    prompt_analysis: Dict,
    task_level: str = "B2"
) -> Dict:
    """
    Main function to validate essay content
    """
    # Try Gemini first
    gemini_validation = validate_content_with_gemini(essay, prompt, prompt_analysis, task_level)
    
    if gemini_validation:
        gemini_validation['source'] = 'gemini'
        return gemini_validation
    
    # Fallback to rule-based
    print("[Content Validator] Using rule-based validation as fallback")
    rule_validation = validate_content_rule_based(essay, prompt, prompt_analysis)
    rule_validation['source'] = 'rule_based'
    
    return rule_validation

