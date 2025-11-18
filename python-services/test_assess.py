"""
Test script for QuestionAssessor model
Tests the BERT-based IELTS writing assessor with question awareness
"""

from ml_assess import QuestionAssessor  
import time
from pathlib import Path
import sys

def print_header(text):
    print("\n" + "="*70)
    print(text.center(70))
    print("="*70 + "\n")

# Test essay
test_essay = """
In the world today, technology is very common and everywhere we look we can see it. Some people are thinking that technology make life easier and more comfortable, but other people are thinking that it is making life more and more difficult every day. There is many discussion about this topic and people cannot agree because everyone have different experience with technology. In my view, technology is both good and bad, but sometimes I feel it makes life more confusing than before.

Firstly, for people who like technology, they say it is something that make everything faster. For example, before people need to write letter and wait many days to get answer, but now they can just send message in few seconds by phone or computer. Also, many people use internet for studying and learning new things. Students can find many information online, they can watch video and do homework using computer. Also, people can buy things online and do shopping without going out of the house, which is very easy especially when the weather is bad. So, in this way technology is saving time and also giving more comfort to human life.

However, there is also another side that is not so good. Some people think that technology make life too busy and stressful. For example, now everyone always look at their phone and forget to talk face to face. When internet stop working, people get angry and cannot do anything. Also, many old people cannot understand how to use new machines or mobile phones, so they feel left behind. Sometimes technology also make people lazy, because they use machines for everything and don't do any real work. Even young children play games all day and don't go outside, which is bad for health. Many people also feel lonely because they talk to screens and not real friends.

In my own opinion, technology is good if people use it in right way, but most of time people use it too much. It is like food, if you eat too much it become bad for you. Life before was more simple and peaceful, but now it is full of stress because of too much technology. So I think people should not depend only on machines and internet, they should live more natural and simple life.
"""
test_question = """
Some people believe that technology has made our lives more complicated, 
while others think it has made things easier. Discuss both views and 
give your own opinion.
"""

if __name__ == '__main__':
    print("Loading ML-based model...")
    
    # Determine model path based on project structure
    SCRIPT_DIR = Path(__file__).parent.resolve()
    PROJECT_ROOT = SCRIPT_DIR.parent
    AI_MODELS_DIR = PROJECT_ROOT / 'ai-models' / 'writing-scorer'
    
    # Try different possible model locations
    model_paths = [
        AI_MODELS_DIR / 'bert_question_model',
        PROJECT_ROOT / 'ai-models' / 'writing-scorer' / 'bert_question_model',
        Path('./bert_question_model'),
        Path('../ai-models/writing-scorer/bert_question_model'),
    ]
    
    model_loaded = False
    ml_assessor = None
    
    for model_path in model_paths:
        if model_path.exists() and (model_path / 'model.keras').exists():
            try:
                print(f"\nTrying to load model from: {model_path}")
                ml_assessor = QuestionAssessor()
                ml_assessor.load_model(str(model_path))
                model_loaded = True
                print(f"[OK] Model loaded successfully from {model_path}")
                break
            except Exception as e:
                print(f"[WARNING] Failed to load from {model_path}: {e}")
                continue
    
    if not model_loaded:
        print("\n[ERROR] Could not find or load model.")
        print("Please ensure the model is trained and saved in one of these locations:")
        for path in model_paths:
            print(f"  - {path}")
        print("\nTo train the model, run: python ml_assess.py")
        sys.exit(1)
    
    try:
        print("\nAssessing essay...")
        start_time = time.time()
        ml_result = ml_assessor.predict(test_essay, task_type=2, question=test_question)
        ml_time = time.time() - start_time
        
        print(f"\n{'='*70}")
        print("RESULTS".center(70))
        print(f"{'='*70}")
        print(f"   Score: {ml_result['score']}")
        print(f"   Band: {ml_result['band']}")
        print(f"   Prediction time: {ml_time:.3f} seconds")
        
        print(f"\nSample Feedback:")
        for category, items in ml_result['feedback'].items():
            print(f"\n{category.replace('_', ' ').title()}:")
            for item in items[:3]:
                print(f"  {item}")
        
        print("\n[OK] Test completed successfully!")
        
    except Exception as e:
        print(f"\n[ERROR] Prediction failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

