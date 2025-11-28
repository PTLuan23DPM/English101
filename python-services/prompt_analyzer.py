"""
Prompt Analyzer
Analyzes writing prompts to extract requirements, constraints, and scoring criteria
This module enables prompt-aware scoring for any new writing task
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


def analyze_prompt_with_gemini(prompt: str, task_level: str = "B2") -> Optional[Dict]:
    """Use Gemini to analyze prompt and extract detailed requirements."""
    gemini_api_key = os.environ.get("GEMINI_API_KEY")
    if not gemini_api_key:
        print("[Prompt Analyzer] Gemini API key not configured")
        return None

    analysis_prompt = f"""
### ROLE
You are a Lead IELTS Task Designer. Your job is to deconstruct writing prompts into strict validation criteria.

### INPUT
Prompt: "{prompt}"
Target Level: {task_level}

### INSTRUCTIONS
Analyze the prompt and output a JSON object.
1. **Core Topic vs. Focus**: Differentiate between the general topic (e.g., "Technology") and the specific question (e.g., "Should children use smartphones?").
2. **Strictness**: Determine if this task requires strict adherence (e.g., Academic Essay) or allows creativity (e.g., Story).
3. **Constraints**: Identify specific constraints (time, place, word count).

### OUTPUT JSON FORMAT
{{
  "task_type": "argumentative" | "narrative" | "descriptive" | "email" | "sentence",
  "main_topic": "The broad subject (e.g., Education)",
  "specific_focus": "The specific angle (e.g., Online learning pros/cons)",
  "topic_keywords": ["key1", "key2", "key3"],
  "strictness": "strict" | "normal" | "lenient", 
  "required_elements": {{
    "what": "actions/objects mentioned",
    "where": "location constraint",
    "when": "time constraint",
    "why": "reasoning requirement",
    "who": "specific characters/roles"
  }},
  "word_count": {{
    "minimum": 150,
    "maximum": 300,
    "target": 250
  }},
  "grammatical_focus": ["passive voice", "conditionals", "past tense"],
  "off_topic_indicators": [
    "writing about generic topic instead of specific focus",
    "ignoring the 'why' question"
  ]
}}

Return ONLY the JSON.
"""

    try:
        api_url = f"https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key={gemini_api_key}"
        response = requests.post(
            api_url,
            json={
                "contents": [{"parts": [{"text": analysis_prompt}]}],
                "generationConfig": {
                    "temperature": 0.1,
                    "responseMimeType": "application/json",
                },
            },
            timeout=10,
        )

        if response.status_code != 200:
            print(f"[Prompt Analyzer] Gemini API error: {response.status_code}")
            return None

        result = response.json()
        if "candidates" not in result or not result["candidates"]:
            return None

        content = result["candidates"][0]["content"]["parts"][0].get("text", "")
        json_match = re.search(r"\{[\s\S]*\}", content)
        if not json_match:
            return None

        analysis = json.loads(json_match.group(0))

        if "specific_focus" not in analysis:
            analysis["specific_focus"] = analysis.get("main_topic", "")
        if "strictness" not in analysis:
            analysis["strictness"] = "normal"

        print(f"[Prompt Analyzer] Analyzed: {analysis.get('main_topic')} -> {analysis.get('specific_focus')}")
        return analysis

    except Exception as e:
        print(f"[Prompt Analyzer] Error: {e}")
        return None


def analyze_prompt_rule_based(prompt: str, task_level: str = "B2") -> Dict:
    """
    Rule-based prompt analysis as fallback when Gemini is unavailable
    """
    prompt_lower = prompt.lower()
    
    # Determine task type
    task_type = "descriptive"
    if any(word in prompt_lower for word in ['write a letter', 'email', 'message']):
        task_type = "email"
    elif any(word in prompt_lower for word in ['write 5-7 sentences', 'complete the sentence']):
        task_type = "sentence"
    elif any(word in prompt_lower for word in ['tell', 'story', 'happened', 'experience', 'memorable']):
        task_type = "narrative"
    elif any(word in prompt_lower for word in ['opinion', 'agree', 'disagree', 'think', 'believe']):
        task_type = "argumentative"
    
    # Extract keywords
    stop_words = {
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'write', 'describe', 'explain', 'about'
    }
    keywords = [
        word for word in re.findall(r'\b\w+\b', prompt_lower)
        if len(word) > 3 and word not in stop_words
    ][:10]  # Top 10 keywords
    
    # Determine word count based on task type and level
    if task_type == "sentence":
        word_count = {"minimum": 30, "maximum": 100, "target": 50}
    elif task_type == "email":
        word_count = {"minimum": 80, "maximum": 200, "target": 120}
    elif task_level in ['A1', 'A2']:
        word_count = {"minimum": 50, "maximum": 150, "target": 80}
    elif task_level in ['B1', 'B2']:
        word_count = {"minimum": 100, "maximum": 250, "target": 150}
    else:  # C1, C2
        word_count = {"minimum": 150, "maximum": 350, "target": 250}
    
    # Extract required elements
    required_elements = {}
    if any(word in prompt_lower for word in ['what', 'activities', 'do', 'did']):
        required_elements['what'] = "activities or actions"
    if any(word in prompt_lower for word in ['where', 'place', 'location']):
        required_elements['where'] = "location or place"
    if any(word in prompt_lower for word in ['when', 'time']):
        required_elements['when'] = "time or period"
    if any(word in prompt_lower for word in ['why', 'reason', 'because']):
        required_elements['why'] = "reasons or explanations"
    if any(word in prompt_lower for word in ['who', 'with', 'people']):
        required_elements['who'] = "people or companions"
    
    # Main topic (first meaningful noun phrase)
    main_topic = " ".join(keywords[:3]) if keywords else "general topic"
    
    result = {
        "task_type": task_type,
        "main_topic": main_topic,
        "topic_keywords": keywords,
        "required_elements": required_elements,
        "word_count": word_count,
        "grammatical_focus": [],
        "content_requirements": [],
        "scoring_emphasis": {
            "task_response": 0.35,
            "vocabulary": 0.25,
            "grammar": 0.25,
            "coherence": 0.15,
        },
        "off_topic_indicators": [],
        "fallback": True,
    }
    result["specific_focus"] = result.get("main_topic", "general topic")
    result["strictness"] = "normal"
    return result


def analyze_prompt(prompt: str, task_level: str = "B2") -> Dict:
    """
    Main function to analyze prompt
    Uses Gemini if available, falls back to rule-based analysis
    """
    # Try Gemini first
    gemini_analysis = analyze_prompt_with_gemini(prompt, task_level)
    
    if gemini_analysis:
        gemini_analysis['source'] = 'gemini'
        return gemini_analysis
    
    # Fallback to rule-based
    print("[Prompt Analyzer] Using rule-based analysis as fallback")
    rule_analysis = analyze_prompt_rule_based(prompt, task_level)
    rule_analysis['source'] = 'rule_based'
    
    return rule_analysis

