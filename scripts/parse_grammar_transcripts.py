"""
Script to parse grammar transcripts and create structured lesson files
"""
import json
import re
import os
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

TOPIC_PROFILES = [
    {
        "match": ["present simple"],
        "keywords": ["do", "does", "don't", "doesn't", "always", "often", "never", "usually", "rarely"],
        "distractors": ["did", "doing", "done"]
    },
    {
        "match": ["present continuous", "present progressive"],
        "keywords": ["am", "is", "are", "ing", "right now", "currently"],
        "distractors": ["was", "were", "ed"]
    },
    {
        "match": ["present perfect"],
        "keywords": ["have", "has", "ever", "never", "yet", "already", "just"],
        "distractors": ["had", "will", "was"]
    },
    {
        "match": ["past simple"],
        "keywords": ["ed", "yesterday", "ago", "last", "did"],
        "distractors": ["do", "does", "will"]
    },
    {
        "match": ["past continuous"],
        "keywords": ["was", "were", "ing", "while"],
        "distractors": ["am", "is", "are"]
    },
    {
        "match": ["past perfect"],
        "keywords": ["had", "already", "by the time"],
        "distractors": ["has", "have", "will"]
    },
    {
        "match": ["future", "will", "going to"],
        "keywords": ["will", "won't", "going to", "shall"],
        "distractors": ["would", "can", "did"]
    },
    {
        "match": ["modal", "modals", "probability"],
        "keywords": ["can", "could", "should", "must", "may", "might", "have to"],
        "distractors": ["will", "did", "do"]
    },
    {
        "match": ["conditional"],
        "keywords": ["if", "would", "could", "might", "will"],
        "distractors": ["when", "because", "since"]
    },
    {
        "match": ["article"],
        "keywords": ["a", "an", "the", "zero article"],
        "distractors": ["some", "any", "one"]
    },
    {
        "match": ["preposition"],
        "keywords": ["in", "on", "at", "to", "for", "with", "about", "from"],
        "distractors": ["under", "between", "through"]
    },
    {
        "match": ["comparative", "superlative", "degree"],
        "keywords": ["more", "most", "er", "est", "than", "as"],
        "distractors": ["less", "least", "equal"]
    },
    {
        "match": ["passive"],
        "keywords": ["is", "are", "was", "were", "been", "by", "get"],
        "distractors": ["do", "does", "have"]
    },
    {
        "match": ["reported speech", "reported", "reported speech statements"],
        "keywords": ["said", "told", "asked", "that", "if", "whether"],
        "distractors": ["say", "tell", "ask"]
    },
    {
        "match": ["relative clause", "relative clauses"],
        "keywords": ["who", "which", "that", "whose", "where"],
        "distractors": ["whom", "because", "since"]
    },
    {
        "match": ["phrasal verb", "phrasal verbs"],
        "keywords": ["up", "off", "out", "in", "away", "back"],
        "distractors": ["down", "through", "under"]
    },
    {
        "match": ["quantifier", "quantifiers"],
        "keywords": ["some", "any", "many", "much", "few", "little", "a lot of"],
        "distractors": ["none", "no", "plenty"]
    },
    {
        "match": ["reflexive"],
        "keywords": ["myself", "yourself", "himself", "herself", "ourselves", "themselves"],
        "distractors": ["me", "you", "him"]
    },
    {
        "match": ["wish", "if only"],
        "keywords": ["wish", "if only", "would", "could", "had"],
        "distractors": ["hope", "want", "like"]
    },
    {
        "match": ["gerund", "infinitive", "verbs followed by"],
        "keywords": ["to", "ing", "verb + ing", "verb + to"],
        "distractors": ["ed", "s", "did"]
    },
]

def get_topic_profile(title: str) -> Dict[str, Any]:
    title_lower = title.lower()
    for profile in TOPIC_PROFILES:
        if any(keyword in title_lower for keyword in profile["match"]):
            return profile
    return {"match": [title_lower], "keywords": [], "distractors": []}

def extract_grammar_rules(text: str) -> List[str]:
    """Extract grammar rules/formulas from text"""
    rules = []
    
    # Look for patterns like "We use X to Y" or "X is used to Y"
    patterns = [
        r"We use (.+?) to (.+?)(?:\.|$)",
        r"(.+?) is used to (.+?)(?:\.|$)",
        r"The structure is: (.+?)(?:\.|$)",
        r"(.+?) means (.+?)(?:\.|$)",
        r"When (.+?), we (.+?)(?:\.|$)",
    ]
    
    for pattern in patterns:
        matches = re.finditer(pattern, text, re.IGNORECASE | re.MULTILINE)
        for match in matches:
            rule = match.group(0).strip()
            if len(rule) > 10 and len(rule) < 200:  # Reasonable length
                rules.append(rule)
    
    # Capture formula-style lines containing + or /
    formula_pattern = r"([A-Za-z\s]+?\+.+)"
    for match in re.finditer(formula_pattern, text):
        formula = match.group(1).strip()
        if 5 < len(formula) < 120:
            rules.append(formula)

    return list(dict.fromkeys(rule.strip() for rule in rules if rule.strip()))  # Preserve order

def extract_formula_tokens(rules: List[str]) -> List[str]:
    tokens = []
    for rule in rules:
        # Capture terms inside quotes/backticks
        tokens.extend(re.findall(r"['\"`]{1}([^'\"`]+)['\"`]{1}", rule))
        # Capture segments separated by +
        if "+" in rule:
            tokens.extend([part.strip() for part in rule.split("+") if part.strip()])
        # Capture modal/tense indicators
        tokens.extend(re.findall(r"\b(?:do|does|did|am|is|are|was|were|have|has|had|will|would|should|must|can|could|may|might|to|not|no)\b", rule, re.IGNORECASE))
    clean_tokens = []
    seen = set()
    for token in tokens:
        normalized = token.strip().lower()
        if normalized and normalized not in seen and len(normalized) < 30:
            clean_tokens.append(token.strip())
            seen.add(normalized)
    return clean_tokens

def build_focus_pairs(examples: List[str], focus_terms: List[str]) -> List[Dict[str, str]]:
    pairs = []
    ordered_terms = sorted(set(term.strip().lower() for term in focus_terms if term.strip()), key=len, reverse=True)
    for example in examples:
        sentence = example.strip()
        if len(sentence) < 8:
            continue
        selected_term: Optional[str] = None
        gap_sentence = sentence
        for term in ordered_terms:
            pattern = re.compile(rf"\b{re.escape(term)}\b", re.IGNORECASE)
            match = pattern.search(sentence)
            if match:
                start, end = match.span()
                selected_term = sentence[start:end]
                gap_sentence = sentence[:start] + "_____" + sentence[end:]
                break
        if selected_term:
            pairs.append({
                "original": sentence,
                "gap": gap_sentence,
                "answer": selected_term
            })
    return pairs

def generate_distractors(correct_word: str, profile: Dict[str, Any]) -> List[str]:
    distractors = []
    clean = correct_word.strip(",.?!").lower()
    if clean in {"do", "does"}:
        distractors = ["did", "doing", "done"]
    elif clean in {"don't", "doesn't"}:
        distractors = ["didn't", "won't", "can't"]
    elif clean in {"am", "is", "are", "was", "were"}:
        distractors = ["be", "been", "being"]
    elif clean in {"have", "has", "had"}:
        distractors = ["having", "hasn't", "haven't"]
    elif clean.endswith("ing"):
        distractors = [clean[:-3], clean + "ly", clean.replace("ing", "ed")]
    elif clean in {"a", "an", "the"}:
        distractors = ["some", "any", "one"]
    elif clean in {"in", "on", "at", "to", "for", "with"}:
        distractors = ["under", "between", "into"]
    elif clean in {"can", "could", "should", "must", "may", "might"}:
        distractors = ["will", "would", "shall"]
    else:
        distractors = [clean + "s", clean + "ed", "not " + clean]

    if profile.get("distractors"):
        distractors.extend(profile["distractors"])

    unique = []
    seen = set()
    for option in distractors:
        opt_clean = option.strip()
        if opt_clean and opt_clean.lower() != clean and opt_clean.lower() not in seen:
            unique.append(opt_clean)
            seen.add(opt_clean.lower())
        if len(unique) == 3:
            break
    return unique

def extract_examples(text: str) -> List[str]:
    """Extract example sentences from text (usually in quotes)"""
    examples = []
    
    # Find quoted examples (handle multi-line quotes)
    quoted = re.findall(r'"([^"]+)"', text)
    for q in quoted:
        # Split multi-line quotes into separate sentences
        if '\n' in q:
            sentences = re.split(r'\n+', q)
            for s in sentences:
                s_clean = s.strip()
                if 10 < len(s_clean) < 200:
                    examples.append(s_clean)
        else:
            examples.append(q)
    
    # Find examples with "e.g." or "for example"
    eg_pattern = r"(?:e\.g\.|for example|such as)[\s:]+([^\.]+?)(?:\.|$)"
    eg_matches = re.finditer(eg_pattern, text, re.IGNORECASE)
    for match in eg_matches:
        examples_text = match.group(1)
        # Split by commas or newlines
        parts = re.split(r'[,\n]', examples_text)
        examples.extend([p.strip() for p in parts if len(p.strip()) > 5])
    
    # Find complete example sentences (sentences that start with capital and end with punctuation)
    # Look for sentences that are likely examples (contain verbs, not just explanations)
    sentence_pattern = r'(?:^|\n)([A-Z][^.!?]+[.!?])'
    sentence_matches = re.finditer(sentence_pattern, text, re.MULTILINE)
    for match in sentence_matches:
        sentence = match.group(1).strip()
        # Skip if it's too short or too long
        if 15 < len(sentence) < 200:
            # Skip if it's an explanation sentence (starts with "We use", "We can", etc.)
            if not re.match(r'^(We use|We can|We make|We say|We often|We usually|We also|We don\'t|We can\'t|The structure|The main|This is|These are|Here are|Note that|Remember that)', sentence, re.IGNORECASE):
                # Check if it looks like an example (contains verbs, not just definitions)
                if any(word in sentence.lower() for word in ['is', 'are', 'was', 'were', 'have', 'has', 'had', 'do', 'does', 'did', 'can', 'could', 'will', 'would', 'should', 'must', 'may', 'might']):
                    # Check if it's not already in examples
                    if sentence not in examples:
                        examples.append(sentence)
    
    # Extract from bullet points or lists
    bullet_pattern = r'(?:^|\n)[\s]*[-•*]\s+([^.\n]+[.!?])'
    bullet_matches = re.finditer(bullet_pattern, text, re.MULTILINE)
    for match in bullet_matches:
        item = match.group(1).strip()
        if 10 < len(item) < 200 and item not in examples:
            examples.append(item)
    
    # Remove duplicates and clean
    unique_examples = []
    seen = set()
    for ex in examples:
        ex_clean = ex.strip().strip('"').strip("'")
        # Split if contains multiple sentences separated by \n\n
        if '\n\n' in ex_clean:
            parts = ex_clean.split('\n\n')
            for part in parts:
                part_clean = part.strip()
                if 10 < len(part_clean) < 200:
                    part_lower = part_clean.lower()
                    if part_lower not in seen:
                        seen.add(part_lower)
                        unique_examples.append(part_clean)
        else:
            if ex_clean and 10 < len(ex_clean) < 200:
                ex_lower = ex_clean.lower()
                if ex_lower not in seen:
                    seen.add(ex_lower)
                    unique_examples.append(ex_clean)
    
    return unique_examples[:30]  # Return up to 30 examples

def create_exercises(lesson_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Generate exercises that stay on-topic for the grammar point"""
    exercises: List[Dict[str, Any]] = []
    examples = lesson_data.get("examples", [])
    rules = lesson_data.get("rules", [])
    title = lesson_data.get("title", "")
    explanation = lesson_data.get("explanation", "")
    profile = get_topic_profile(title)

    if not examples and explanation:
        sentences = re.findall(r'([A-Z][^.!?]+[.!?])', explanation)
        examples = [s.strip() for s in sentences if 15 < len(s.strip()) < 150][:10]

    formula_tokens = extract_formula_tokens(rules)
    focus_terms = profile.get("keywords", []) + formula_tokens

    focus_pairs = build_focus_pairs(examples, focus_terms)

    # If no focus pairs were generated, fallback to basic gap-fill words
    if not focus_pairs:
        for example in examples:
            words = example.split()
            if len(words) > 3:
                gap_idx = len(words) // 2
                answer = words[gap_idx]
                gap_sentence = " ".join(words[:gap_idx]) + " _____ " + " ".join(words[gap_idx+1:])
                focus_pairs.append({"original": example, "gap": gap_sentence, "answer": answer})
            if len(focus_pairs) >= 6:
                break

    # Multiple choice (up to 3)
    for pair in focus_pairs[:3]:
        distractors = generate_distractors(pair["answer"], profile)
        options = [pair["answer"]] + distractors
        exercises.append({
            "type": "multiple_choice",
            "question": "Choose the correct option to complete the sentence:",
            "sentence": pair["gap"],
            "options": options,
            "correct": 0,
            "explanation": f"The missing part relates to {title.lower()} usage."
        })

    # Fill in the blank (next 3)
    for pair in focus_pairs[3:6]:
        exercises.append({
            "type": "fill_blank",
            "question": "Fill in the blank with the correct grammar form:",
            "sentence": pair["gap"],
            "correct": pair["answer"],
            "hint": f"Apply the rule for {title.lower()}.",
            "explanation": f"The correct form here is '{pair['answer']}'."
        })

    # True/False derived from rules
    factual_rules = rules[:2] if rules else []
    for rule in factual_rules:
        statement = re.sub(r"\s+", " ", rule.strip())
        if len(statement) > 10:
            exercises.append({
                "type": "true_false",
                "question": "Is this statement correct?",
                "statement": statement,
                "correct": True,
                "explanation": "This reflects the rule from the lesson."
            })
            if len(exercises) >= 6:
                break

    # Ensure we have at least 4 exercises
    if len(exercises) < 4 and focus_pairs:
        for pair in focus_pairs[len(exercises):]:
            exercises.append({
                "type": "fill_blank",
                "question": "Fill in the blank with the correct grammar form:",
                "sentence": pair["gap"],
                "correct": pair["answer"],
                "hint": f"Apply the rule for {title.lower()}.",
                "explanation": f"The correct form here is '{pair['answer']}'."
            })
            if len(exercises) >= 6:
                break

    return exercises[:6]

def parse_grammar_transcript(title: str, content: str, level: str) -> Dict[str, Any]:
    """Parse a grammar transcript into structured lesson data"""
    
    # Extract introduction
    intro_match = re.search(r"^(.+?)(?:Grammar explanation|Look at these examples)", content, re.DOTALL | re.IGNORECASE)
    introduction = intro_match.group(1).strip() if intro_match else ""
    
    # Extract grammar explanation
    explanation_match = re.search(r"Grammar explanation\s*(.+?)(?:\n\n|\Z)", content, re.DOTALL | re.IGNORECASE)
    explanation = explanation_match.group(1).strip() if explanation_match else ""
    
    # Extract rules
    rules = extract_grammar_rules(content)
    
    # Extract examples
    examples = extract_examples(content)
    
    # Extract key points (headings or bold text)
    key_points = re.findall(r"^(?:With|For|When|If|Note that)\s+(.+?)(?:\.|$)", content, re.MULTILINE | re.IGNORECASE)
    key_points = [kp.strip() for kp in key_points if len(kp.strip()) > 10 and len(kp.strip()) < 150]
    
    # Create lesson data
    lesson_data = {
        "id": re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-'),
        "title": title,
        "level": level,
        "introduction": introduction,
        "explanation": explanation,
        "rules": rules[:10],  # Top 10 rules
        "keyPoints": key_points[:5],  # Top 5 key points
        "examples": examples[:20],  # Top 20 examples
        "exercises": []
    }
    
    # Generate exercises
    lesson_data["exercises"] = create_exercises(lesson_data)
    
    return lesson_data

def main():
    """Main function to parse all grammar transcripts"""
    
    # Import grammar transcripts data
    try:
        from grammar_transcripts_data import GRAMMAR_TRANSCRIPTS
    except ImportError:
        print("Error: Could not import grammar_transcripts_data.py")
        print("Make sure grammar_transcripts_data.py is in the same directory as this script")
        return
    
    # Create output directory (relative to project root, not scripts folder)
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    output_dir = project_root / "grammar_file"
    output_dir.mkdir(exist_ok=True)
    
    total_lessons = 0
    
    for level, lessons in GRAMMAR_TRANSCRIPTS.items():
        level_dir = output_dir / level
        level_dir.mkdir(exist_ok=True)
        
        for lesson_info in lessons:
            title = lesson_info["title"]
            content = lesson_info["content"]
            
            lesson_data = parse_grammar_transcript(title, content, level)
            
            # Save to JSON
            output_file = level_dir / f"{lesson_data['id']}.json"
            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(lesson_data, f, indent=2, ensure_ascii=False)
            
            print(f"Created: {output_file}")
            total_lessons += 1
    
    print(f"\nParsed {total_lessons} grammar lessons")

if __name__ == "__main__":
    main()

