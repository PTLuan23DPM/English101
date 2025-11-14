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

CRITICAL EVALUATION CRITERIA (STRICT OFF-TOPIC DETECTION):
1. **Topic Relevance** (0-100): Does the essay discuss the SAME TOPIC as the prompt?
   
   STRICT RULES - Mark as COMPLETELY OFF-TOPIC (0-29) if:
   - Essay discusses COMPLETELY DIFFERENT topic (e.g., prompt about "vacation/trip" but essay about "weekends/daily routine/work")
   - Essay has NO connection to prompt topic at all
   - Essay is clearly answering a different question
   - Essay describes something that is NOT what the prompt asks for
   - Example: Prompt asks "memorable trip/vacation" but essay describes "weekend activities" → COMPLETELY OFF-TOPIC
   - Example: Prompt asks "favorite food" but essay describes "hobbies" → COMPLETELY OFF-TOPIC
   
   Mark as PARTIALLY OFF-TOPIC (30-49) if:
   - Essay touches on the topic but mostly discusses unrelated things
   - Essay mentions the topic briefly but then goes off-track
   
   Mark as INCOMPLETE (50-69) if:
   - Essay addresses the topic but is missing key required elements
   - Essay partially addresses the prompt (give lower relevance score)
   
   Mark as ON-TOPIC (70-100) if:
   - Essay directly addresses the topic with clear connection
   - Essay uses synonyms or related concepts (e.g., "trip" for "vacation", "journey" for "travel")
   - Essay addresses the topic but may be missing minor details
   
   Scoring:
   - 90-100: Directly addresses the topic with clear connection
   - 70-89: Addresses the topic with some relevance (may be missing minor details)
   - 50-69: Partially relevant - addresses main topic but missing key elements
   - 30-49: Weakly relevant - touches on topic but mostly off-track
   - 0-29: Completely off-topic - different subject entirely (e.g., "weekends" vs "trip/vacation")

2. **Required Elements** (0-100): Does it include all required elements (what, where, when, why, who)?
   - Score based on how many required elements are present and well-developed
   - Missing 1-2 elements: 70-80
   - Missing 3+ elements: 50-70
   - All elements present: 80-100

3. **Content Quality** (0-100): How well does it fulfill the writing purpose?
   - Consider depth, detail, examples, and completeness of response
   - Well-developed with examples: 80-100
   - Adequate development: 60-79
   - Superficial or vague: 40-59

4. **Semantic Match** (0-100): Understanding synonyms and related concepts
   - "vacation" = "trip" = "travel" = "holiday" = "journey" = "memorable trip" (SAME TOPIC)
   - "shopping online" = "e-commerce" = "buying on internet" = "online purchases" (SAME TOPIC)
   - "daily routine" ≠ "vacation trip" (DIFFERENT TOPICS - COMPLETELY OFF-TOPIC)
   - "weekends" ≠ "trip/vacation" (DIFFERENT TOPICS - COMPLETELY OFF-TOPIC)
   - "work" ≠ "vacation" (DIFFERENT TOPICS - COMPLETELY OFF-TOPIC)
   - "hobbies" ≠ "favorite food" (DIFFERENT TOPICS - COMPLETELY OFF-TOPIC)
   
   CRITICAL EXAMPLES:
   - Prompt: "Write about a memorable trip or vacation"
     Essay about "weekends" or "daily routine" → COMPLETELY OFF-TOPIC (0-29 relevance)
   - Prompt: "Describe your favorite food"
     Essay about "hobbies" or "sports" → COMPLETELY OFF-TOPIC (0-29 relevance)

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

IMPORTANT: Only mark is_on_topic=false if topic_relevance_score < 30 (completely different topic).
If topic_relevance_score is 30-49, mark is_on_topic=true but with low overall_relevance (partial relevance).

If completely off-topic (relevance < 30):
{{
  "is_on_topic": false,
  "topic_relevance_score": 20,
  "required_elements_score": 10,
  "content_quality_score": 15,
  "overall_relevance": 15,
  "confidence": 0.95,
  "addressed_elements": [],
  "missing_elements": ["what", "where", "when", "why", "who"],
  "feedback": {{
    "strengths": [],
    "weaknesses": ["Essay discusses completely different topic with no connection to prompt"],
    "suggestions": ["Rewrite to address the actual prompt topic"]
  }},
  "off_topic_reason": "Essay discusses weekends/daily routine but prompt asks about memorable trip/vacation - completely different topics. Essay must describe a specific trip or vacation, not general weekend activities."
}}

If partially relevant (relevance 30-49):
{{
  "is_on_topic": true,
  "topic_relevance_score": 40,
  "required_elements_score": 30,
  "content_quality_score": 35,
  "overall_relevance": 35,
  "confidence": 0.85,
  "addressed_elements": ["what"],
  "missing_elements": ["where", "when", "why"],
  "feedback": {{
    "strengths": ["Touches on the topic"],
    "weaknesses": ["Weak connection to prompt", "Missing most required elements"],
    "suggestions": ["Focus more directly on the prompt topic", "Include all required elements"]
  }},
  "off_topic_reason": "Essay partially addresses topic but is mostly off-track"
}}

Evaluate strictly but fairly. Return ONLY the JSON."""

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

