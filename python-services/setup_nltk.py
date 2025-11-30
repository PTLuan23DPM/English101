"""
Fix for NLTK/CMUdict installation issue
Run this script once to properly install NLTK data
"""

import sys
import os

def setup_nltk():
    """Setup NLTK with proper data download"""
    print("="*60)
    print("NLTK SETUP FOR SPEAKING TEST")
    print("="*60)
    
    try:
        import nltk
        print("✓ NLTK is installed")
    except ImportError:
        print("✗ NLTK is NOT installed")
        print("\nPlease install NLTK first:")
        print("  pip install nltk")
        return False
    
    # Download required data
    print("\nDownloading NLTK data...")
    
    try:
        # Try to import cmudict first
        from nltk.corpus import cmudict
        phoneme_dict = cmudict.dict()
        print("✓ CMUdict is already available")
        
        # Test it
        test_word = phoneme_dict.get('hello')
        if test_word:
            print(f"✓ CMUdict working! Test: 'hello' = {test_word[0]}")
        
        return True
        
    except LookupError:
        print("✗ CMUdict not found, downloading...")
        
        # Download with proper error handling
        try:
            nltk.download('cmudict', quiet=False)
            print("✓ CMUdict downloaded")
            
            # Verify it works
            from nltk.corpus import cmudict
            phoneme_dict = cmudict.dict()
            
            test_word = phoneme_dict.get('hello')
            if test_word:
                print(f"✓ CMUdict working! Test: 'hello' = {test_word[0]}")
                return True
            else:
                print("✗ CMUdict downloaded but not working properly")
                return False
                
        except Exception as e:
            print(f"✗ Error downloading CMUdict: {e}")
            return False
    
    except Exception as e:
        print(f"✗ Error setting up NLTK: {e}")
        return False


def test_phoneme_conversion():
    """Test phoneme conversion with sample text"""
    print("\n" + "="*60)
    print("TESTING PHONEME CONVERSION")
    print("="*60)
    
    try:
        from nltk.corpus import cmudict
        phoneme_dict = cmudict.dict()
        
        test_words = ['the', 'quick', 'brown', 'fox', 'jumps', 'over', 'lazy', 'dog']
        
        print("\nTesting sample words:")
        all_working = True
        
        for word in test_words:
            phonemes = phoneme_dict.get(word.lower())
            if phonemes:
                print(f"  ✓ {word:10s} -> {' '.join(phonemes[0])}")
            else:
                print(f"  ✗ {word:10s} -> NOT FOUND")
                all_working = False
        
        if all_working:
            print("\n✓ All test words converted successfully!")
            print("✓ Your speaking test should work properly now.")
            return True
        else:
            print("\n⚠ Some words not found in CMUdict")
            print("  This is normal for proper nouns or uncommon words")
            return True
            
    except Exception as e:
        print(f"\n✗ Error testing phoneme conversion: {e}")
        return False


if __name__ == "__main__":
    print("\n" + "="*60)
    print("SPEAKING TEST - NLTK SETUP UTILITY")
    print("="*60)
    print("\nThis script will:")
    print("  1. Check if NLTK is installed")
    print("  2. Download CMUdict data")
    print("  3. Test phoneme conversion")
    print("="*60)
    
    input("\nPress Enter to start...")
    
    # Setup NLTK
    if setup_nltk():
        # Test phoneme conversion
        if test_phoneme_conversion():
            print("\n" + "="*60)
            print("✓ SETUP COMPLETE!")
            print("="*60)
            print("\nYou can now run your speaking test:")
            print("  python speaking_test_optimized.py")
            print("="*60)
        else:
            print("\n" + "="*60)
            print("⚠ SETUP INCOMPLETE")
            print("="*60)
            print("\nPhoneme conversion may not work properly.")
            print("But the speaking test will still run with limited functionality.")
            print("="*60)
    else:
        print("\n" + "="*60)
        print("✗ SETUP FAILED")
        print("="*60)
        print("\nPlease install NLTK first:")
        print("  pip install nltk")
        print("\nThen run this script again.")
        print("="*60)