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
from pathlib import Path


def build_advanced_validation_prompt(essay: str, prompt: str, task_level: str) -> str:
    """
    Tạo prompt nâng cao để Gemini phân tích lạc đề dựa trên Logic thay vì Keyword.
    """
    return f"""
### ROLE
You are a strict IELTS/CEFR Examiner. Your task is to validate if a student's essay matches the given writing prompt.

### INPUT DATA
1. **Task Level**: {task_level} (Adjust strictness based on this. A1/A2 can be simple, B2+ must be precise)
2. **Prompt (The Question)**: "{prompt}"
3. **Student Essay**: "{essay[:2500]}"

### INSTRUCTIONS
Step 1: Analyze the PROMPT. Identify:
   - **Core Topic**: What is the main subject? (e.g., "Environment", "Technology")
   - **Specific Focus**: What specific aspect? (e.g., "Climate change solutions", not just "Weather")
   - **Task Type**: Argumentative, Problem/Solution, or Narrative?

Step 2: Analyze the ESSAY. Check:
   - Does it discuss the **Specific Focus** identified above?
   - **Topic Drift**: Does the student start on topic but drift to a memorized text? (e.g., asked about "A specific holiday trip" but wrote about "Benefits of weekends" in general).
   - **Keyword Stuffing**: Are keywords used naturally or forced?

Step 3: Determine Relevance Score (0-100) & Off-topic Status.
   - **0-30 (Complete Off-topic)**: Totally different subject OR a memorized essay on a vaguely related keyword (e.g., Prompt: "Traffic jams", Essay: "Advantages of cars").
   - **31-59 (Partial/Tangential)**: Discusses the general topic but misses the specific question (e.g., Prompt: "Solutions for pollution", Essay: "Causes of pollution").
   - **60-100 (On-topic)**: Addresses the prompt directly.

### OUTPUT FORMAT (JSON ONLY)
Return a valid JSON object with this exact structure:
{{
    "is_on_topic": boolean,
    "overall_relevance": integer,
    "off_topic_level": "none" | "incomplete" | "partial" | "complete",
    "prompt_analysis": {{
        "core_topic": "string",
        "specific_focus": "string"
    }},
    "off_topic_reason": "string",
    "confidence": float
}}
"""
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
    
    validation_prompt = build_advanced_validation_prompt(essay, prompt, task_level)
    
    extra_sections: List[str] = []
    
    if prompt_analysis.get('main_topic'):
        extra_sections.append(f"- Main Topic: {prompt_analysis.get('main_topic')}")
    topic_keywords = prompt_analysis.get('topic_keywords', [])
    if topic_keywords:
        extra_sections.append(f"- Topic Keywords: {', '.join(topic_keywords[:10])}")
    
    if prompt_analysis.get('required_elements'):
        required_text = ", ".join(
            f"{key.upper()}: {value}"
            for key, value in prompt_analysis['required_elements'].items()
            if value
        )
        extra_sections.append(f"- Required Elements: {required_text}")
    
    if prompt_analysis.get('content_requirements'):
        content_reqs_text = "; ".join(prompt_analysis['content_requirements'])
        extra_sections.append(f"- Content Requirements: {content_reqs_text}")
    
    if extra_sections:
        validation_prompt += "\n### ADDITIONAL CONTEXT\n" + "\n".join(extra_sections)

    try:
        # Try v1 first, fallback to v1beta if needed
        api_url = f"https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key={gemini_api_key}"
        
        response = requests.post(
            api_url,
            json={
                "contents": [{
                    "parts": [{"text": validation_prompt}]
                }],
                "generationConfig": {
                    "temperature": 0.3,
                    "maxOutputTokens": 4096,  # Increased to handle longer responses
                }
            },
            timeout=15
        )
        
        # If 404, try v1beta
        if response.status_code == 404:
            api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={gemini_api_key}"
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
            print(f"[Content Validator] Gemini API error: {response.status_code} - {response.text[:200]}")
            return None
        
        result = response.json()
        
        if 'candidates' not in result or not result['candidates']:
            print("[Content Validator] No response from Gemini")
            return None
        
        candidate = result['candidates'][0]
        
        # Check for MAX_TOKENS or other finish reasons
        finish_reason = candidate.get('finishReason', '')
        if finish_reason == 'MAX_TOKENS':
            print("[Content Validator] ⚠️ Response truncated due to MAX_TOKENS - increasing maxOutputTokens and retrying...")
            # Retry with higher maxOutputTokens
            api_url_retry = api_url  # Use the same URL (v1 or v1beta)
            response_retry = requests.post(
                api_url_retry,
                json={
                    "contents": [{
                        "parts": [{"text": validation_prompt}]
                    }],
                    "generationConfig": {
                        "temperature": 0.3,
                        "maxOutputTokens": 4096,  # Increased from 2048
                    }
                },
                timeout=20  # Increased timeout
            )
            
            if response_retry.status_code == 200:
                result = response_retry.json()
                if 'candidates' in result and result['candidates']:
                    candidate = result['candidates'][0]
                    finish_reason = candidate.get('finishReason', '')
                    if finish_reason == 'MAX_TOKENS':
                        print("[Content Validator] ⚠️ Still truncated after retry - using partial response")
                    else:
                        print("[Content Validator] ✓ Retry successful")
                else:
                    print("[Content Validator] Retry failed - no candidates in response")
            else:
                print(f"[Content Validator] Retry failed with status {response_retry.status_code}")
        
        # Handle different response structures
        content_text = None
        
        # Try different response formats
        if 'content' in candidate:
            if 'parts' in candidate['content'] and len(candidate['content']['parts']) > 0:
                # Standard format: content.parts[0].text
                if 'text' in candidate['content']['parts'][0]:
                    content_text = candidate['content']['parts'][0]['text']
                elif isinstance(candidate['content']['parts'][0], str):
                    content_text = candidate['content']['parts'][0]
            elif 'text' in candidate['content']:
                # Alternative format: content.text
                content_text = candidate['content']['text']
        elif 'text' in candidate:
            # Direct text in candidate
            content_text = candidate['text']
        elif 'parts' in candidate and len(candidate['parts']) > 0:
            # Parts directly in candidate
            if 'text' in candidate['parts'][0]:
                content_text = candidate['parts'][0]['text']
            elif isinstance(candidate['parts'][0], str):
                content_text = candidate['parts'][0]
        
        if not content_text:
            # If no text found, check if it's because content is empty (MAX_TOKENS case)
            if finish_reason == 'MAX_TOKENS':
                print("[Content Validator] ⚠️ Response truncated (MAX_TOKENS) and no content extracted - using rule-based fallback")
                return None  # Will trigger rule-based fallback
            else:
                print(f"[Content Validator] Unexpected response structure: {json.dumps(candidate, indent=2)[:500]}")
                return None
        
        # Extract JSON
        json_match = re.search(r'\{[\s\S]*\}', content_text)
        if not json_match:
            print("[Content Validator] No JSON in response")
            return None
        
        validation = json.loads(json_match.group(0))
        
        # Backward compatibility with legacy fields
        validation.setdefault('overall_relevance', validation.get('topic_relevance_score', 0))
        validation.setdefault('topic_relevance_score', validation.get('overall_relevance', 0))
        validation.setdefault('required_elements_score', validation.get('overall_relevance', 0))
        validation.setdefault('content_quality_score', validation.get('overall_relevance', 0))
        validation.setdefault('addressed_elements', [])
        validation.setdefault('missing_elements', [])
        validation.setdefault('off_topic_level', 'none')
        validation.setdefault('confidence', 0.8)
        validation.setdefault('off_topic_reason', '')
        
        print(f"[Content Validator] Validation complete - On topic: {validation.get('is_on_topic')}, Relevance: {validation.get('overall_relevance')}")
        return validation
        
    except KeyError as e:
        print(f"[Content Validator] Error: Missing key '{e}' in response")
        print(f"[Content Validator] Response structure: {json.dumps(result, indent=2)[:500] if 'result' in locals() else 'N/A'}")
        return None
    except Exception as e:
        print(f"[Content Validator] Error: {e}")
        import traceback
        print(f"[Content Validator] Traceback: {traceback.format_exc()}")
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

