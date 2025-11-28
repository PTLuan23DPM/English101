# -*- coding: utf-8 -*-
"""
Script to add correct answers to JSON files
This ensures dictation gaps have proper answers stored
"""
import json
import os
import sys
import glob

# Set UTF-8 encoding
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

def extractImportantWords(text):
    """Extract important words (nouns, verbs, adjectives) from text"""
    skipWords = set([
        "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by",
        "is", "are", "was", "were", "be", "been", "have", "has", "had", "do", "does", "did",
        "will", "would", "can", "could", "should", "may", "might", "this", "that", "these", "those",
        "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them", "my", "your",
        "his", "her", "its", "our", "their", "what", "who", "where", "when", "why", "how"
    ])
    
    words = text.split()
    important = []
    for word in words:
        clean = word.lower().replace("'", "").replace(",", "").replace(".", "").replace("!", "").replace("?", "")
        if len(clean) >= 4 and clean not in skipWords:
            important.append(word.replace(",", "").replace(".", "").replace("!", "").replace("?", ""))
    return important

def createDictationGaps(segments):
    """Create dictation gaps from segments with correct answers"""
    gaps = []
    
    for segIdx, seg in enumerate(segments):
        text = seg.get("text", "").strip()
        if not text or len(text) < 10:
            continue
        
        words = text.split()
        if len(words) < 3:
            continue
        
        # Find important words
        importantWords = extractImportantWords(text)
        
        if importantWords:
            # Create 1-2 gaps per segment
            numGaps = min(len(importantWords), 2)
            selectedWords = importantWords[:numGaps]
            
            for gapIdx, selectedWord in enumerate(selectedWords):
                # Find word position in original text
                wordIdx = -1
                for i, w in enumerate(words):
                    if selectedWord.lower() in w.lower() or w.lower() in selectedWord.lower():
                        wordIdx = i
                        break
                
                if wordIdx >= 0:
                    before = " ".join(words[:wordIdx])
                    after = " ".join(words[wordIdx + 1:])
                    answer = words[wordIdx].replace(",", "").replace(".", "").replace("!", "").replace("?", "")
                    
                    gaps.append({
                        "id": f"gap-{segIdx}-{gapIdx}",
                        "before": before,
                        "after": after,
                        "answer": answer,
                        "timestamp": seg.get("start", 0),
                        "difficulty": "hard" if len(answer) > 6 or any(c.isupper() for c in answer) else "easy"
                    })
        else:
            # Fallback: use middle word
            midIdx = len(words) // 2
            if midIdx < len(words):
                before = " ".join(words[:midIdx])
                after = " ".join(words[midIdx + 1:])
                answer = words[midIdx].replace(",", "").replace(".", "").replace("!", "").replace("?", "")
                
                gaps.append({
                    "id": f"gap-{segIdx}-0",
                    "before": before,
                    "after": after,
                    "answer": answer,
                    "timestamp": seg.get("start", 0),
                    "difficulty": "easy"
                })
    
    return gaps[:20]  # Limit to 20 gaps

def updateJsonFile(filepath):
    """Update JSON file with correct answers/dictation gaps"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Create dictation gaps if segments exist
        if "segments" in data and len(data["segments"]) > 0:
            dictationGaps = createDictationGaps(data["segments"])
            data["dictationGaps"] = dictationGaps
            print(f"  [OK] Added {len(dictationGaps)} dictation gaps to {os.path.basename(filepath)}")
        else:
            print(f"  [SKIP] No segments found in {os.path.basename(filepath)}")
            return False
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        return True
    except Exception as e:
        print(f"  [ERROR] {os.path.basename(filepath)}: {e}")
        return False

def main():
    base_dir = r"c:\Users\ADMIN\Desktop\listening_file"
    
    # Find all JSON files
    json_files = []
    for level in ["Beginner", "Intermediate", "Advanced"]:
        level_path = os.path.join(base_dir, level)
        if os.path.exists(level_path):
            # Direct files
            for file in glob.glob(os.path.join(level_path, "*.json")):
                json_files.append(file)
            # Files in subdirectories
            for file in glob.glob(os.path.join(level_path, "**", "*.json"), recursive=True):
                json_files.append(file)
    
    print(f"Found {len(json_files)} JSON files")
    print("Adding dictation gaps with correct answers...\n")
    
    updated = 0
    skipped = 0
    errors = 0
    
    for filepath in json_files:
        if updateJsonFile(filepath):
            updated += 1
        else:
            skipped += 1
    
    print(f"\n{'='*50}")
    print(f"Summary: {updated} updated, {skipped} skipped, {errors} errors")
    print(f"{'='*50}")

if __name__ == "__main__":
    main()

