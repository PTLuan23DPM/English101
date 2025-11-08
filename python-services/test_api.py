"""
Simple test script for IELTS Writing Scorer API
"""

import requests
import json
import time

BASE_URL = "http://localhost:5001"

def test_health():
    """Test health endpoint"""
    print("=" * 70)
    print("Testing Health Endpoint")
    print("=" * 70)
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print("✓ Service is healthy")
            print(f"  Active Model: {data.get('active_model', 'Unknown')}")
            print(f"  Models Loaded:")
            for model, loaded in data.get('models_loaded', {}).items():
                status = "✓" if loaded else "✗"
                print(f"    {status} {model}")
            return True
        else:
            print(f"✗ Health check failed: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("✗ Cannot connect to service. Is it running on port 5001?")
        return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

def test_score_ai():
    """Test AI scoring endpoint"""
    print("\n" + "=" * 70)
    print("Testing AI Scoring Endpoint")
    print("=" * 70)
    
    sample_essay = """
    Climate change is one of the most pressing issues facing humanity today. 
    It affects every aspect of our lives, from the food we eat to the air we breathe.
    Governments and individuals must take action to reduce greenhouse gas emissions.
    Renewable energy sources like solar and wind power can help reduce our dependence on fossil fuels.
    Additionally, reforestation efforts can absorb carbon dioxide from the atmosphere.
    """
    
    try:
        response = requests.post(
            f"{BASE_URL}/score-ai",
            json={
                "text": sample_essay.strip(),
                "prompt": "Discuss the impact of climate change and solutions"
            },
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✓ Scoring successful")
            print(f"  Model Used: {data.get('model_type', 'Unknown')}")
            print(f"  IELTS Score: {data.get('ielts_score', 0):.1f}/9.0")
            print(f"  10-Point Score: {data.get('score_10', 0):.1f}/10.0")
            print(f"  CEFR Level: {data.get('cefr_level', 'Unknown')} ({data.get('cefr_description', 'Unknown')})")
            print(f"  Overall Score: {data.get('overall_score', 0):.1f}/10.0")
            print(f"  Word Count: {data.get('word_count', 0)}")
            
            print("\n  Detailed Scores:")
            for criteria, details in data.get('detailed_scores', {}).items():
                score = details.get('score', 0)
                print(f"    {criteria.replace('_', ' ').title()}: {score:.1f}/10.0")
            
            return True
        elif response.status_code == 503:
            print("✗ AI model not available")
            print(f"  Message: {response.json().get('message', 'Unknown error')}")
            return False
        else:
            print(f"✗ Scoring failed: {response.status_code}")
            print(f"  Response: {response.text}")
            return False
    except requests.exceptions.ConnectionError:
        print("✗ Cannot connect to service. Is it running on port 5001?")
        return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

def test_grammar_check():
    """Test grammar check endpoint"""
    print("\n" + "=" * 70)
    print("Testing Grammar Check Endpoint")
    print("=" * 70)
    
    sample_text = "I recieve the letter yesterday. It was very importent for me."
    
    try:
        response = requests.post(
            f"{BASE_URL}/grammar-check",
            json={
                "text": sample_text,
                "language": "en-US"
            },
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            issue_count = data.get('issue_count', 0)
            print(f"✓ Grammar check successful")
            print(f"  Issues Found: {issue_count}")
            
            if issue_count > 0:
                print("\n  Issues:")
                for i, issue in enumerate(data.get('issues', [])[:5], 1):
                    print(f"    {i}. {issue.get('type', 'Unknown')}: {issue.get('message', 'No message')}")
            
            return True
        else:
            print(f"✗ Grammar check failed: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("✗ Cannot connect to service. Is it running on port 5001?")
        return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

def main():
    """Run all tests"""
    print("\n" + "=" * 70)
    print("IELTS Writing Scorer API Test")
    print("=" * 70)
    print("\nMake sure the service is running on http://localhost:5001")
    print("Press Ctrl+C to cancel, or wait 3 seconds...")
    time.sleep(3)
    
    results = []
    
    # Test health
    results.append(("Health Check", test_health()))
    
    # Test scoring
    results.append(("AI Scoring", test_score_ai()))
    
    # Test grammar
    results.append(("Grammar Check", test_grammar_check()))
    
    # Summary
    print("\n" + "=" * 70)
    print("Test Summary")
    print("=" * 70)
    for test_name, passed in results:
        status = "✓ PASSED" if passed else "✗ FAILED"
        print(f"  {status}: {test_name}")
    
    total_passed = sum(1 for _, passed in results if passed)
    print(f"\nTotal: {total_passed}/{len(results)} tests passed")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nTest cancelled by user")

