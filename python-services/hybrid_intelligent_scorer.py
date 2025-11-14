"""
Hybrid Intelligent Scorer v3
Kết hợp:
1. Intelligent scoring system (Gemini-based) - prompt-aware
2. BERT models (cross-validation) - semantic similarity check
3. Improved off-topic detection - không cho 0 điểm ngay
4. IELTS 4 criteria scoring - Task Response, Coherence, Lexical Resource, Grammar
"""

import json
from typing import Dict, List, Optional, Tuple
import os
import re
import logging
from pathlib import Path
from datetime import datetime

# Setup logging
log_dir = Path(__file__).parent / "logs"
log_dir.mkdir(exist_ok=True)

log_file = log_dir / f"hybrid_scorer_{datetime.now().strftime('%Y%m%d')}.log"
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [%(levelname)s] - %(message)s',
    handlers=[
        logging.FileHandler(log_file, encoding='utf-8'),
        logging.StreamHandler()  # Also print to console
    ]
)
logger = logging.getLogger(__name__)

# Import modules
try:
    from prompt_analyzer import analyze_prompt
    from content_validator import validate_content
    from quality_assessor import assess_quality
    from text_validator import validate_text_quality
    MODULES_AVAILABLE = True
except ImportError as e:
    logger.error(f"Module import error: {e}")
    MODULES_AVAILABLE = False
    # Fallback if text_validator not available
    try:
        from text_validator import validate_text_quality
    except:
        def validate_text_quality(text: str) -> Dict:
            return {"is_valid": True, "penalty_multiplier": 1.0, "issues": []}

# Try to import task fulfillment checker and task response analyzer
try:
    from task_fulfillment_checker import (
        analyze_off_topic_detection,
        calculate_topic_score,
        detect_topic_contradiction
    )
    from task_response_analyzer import analyze_task_response_semantic
    TASK_CHECKERS_AVAILABLE = True
    logger.info("Task fulfillment checker and task response analyzer available")
except ImportError as e:
    logger.warning(f"Task checkers not available: {e}")
    TASK_CHECKERS_AVAILABLE = False

# Try to import BERT model for cross-validation
try:
    from model_loader import ModelLoader
    from pathlib import Path
    import sys
    
    # Setup path
    SCRIPT_DIR = Path(__file__).parent.resolve()
    PROJECT_ROOT = SCRIPT_DIR.parent
    AI_MODELS_DIR = PROJECT_ROOT / 'ai-models' / 'writing-scorer'
    
    if str(AI_MODELS_DIR) not in sys.path:
        sys.path.insert(0, str(AI_MODELS_DIR))
    
    # Try to load BERT model
    try:
        from model_loader import load_all_models
        all_models, model_loader = load_all_models(AI_MODELS_DIR)
        
        # Get BERT model for semantic similarity
        bert_model = None
        if all_models.get('bert', {}).get('loaded'):
            bert_model = all_models['bert']
            # Verify encoder is actually available
            if bert_model.get('encoder'):
                BERT_AVAILABLE = True
                print("[Hybrid Scorer] ✓ BERT model loaded for cross-validation")
            else:
                BERT_AVAILABLE = False
                bert_model = None
                print("[Hybrid Scorer] BERT model loaded but encoder not available")
        elif all_models.get('bert_multi', {}).get('loaded'):
            bert_model = all_models['bert_multi']
            # Verify encoder is actually available
            if bert_model.get('encoder'):
                BERT_AVAILABLE = True
                print("[Hybrid Scorer] ✓ BERT Multi-task model loaded for cross-validation")
            else:
                BERT_AVAILABLE = False
                bert_model = None
                print("[Hybrid Scorer] BERT Multi-task model loaded but encoder not available")
        else:
            BERT_AVAILABLE = False
            print("[Hybrid Scorer] BERT model not available, using Gemini only")
    except Exception as e:
        BERT_AVAILABLE = False
        logger.warning(f"Could not load BERT model: {e}")
        bert_model = None
        model_loader = None
        print("[Hybrid Scorer] BERT model loading failed, using Gemini only")
except ImportError:
    BERT_AVAILABLE = False
    bert_model = None
    model_loader = None
    print("[Hybrid Scorer] Model loader not available")


def calculate_semantic_similarity_bert(essay: str, prompt: str) -> Optional[float]:
    """
    Sử dụng BERT model để tính semantic similarity giữa essay và prompt
    Returns: similarity score 0-1 (1 = very similar, 0 = completely different)
    """
    logger.info("=" * 60)
    logger.info("BERT SEMANTIC SIMILARITY")
    logger.info(f"Input: Essay length={len(essay)} chars, {len(essay.split())} words | Prompt length={len(prompt)} chars, {len(prompt.split())} words")
    
    # Check BERT availability more thoroughly
    if not BERT_AVAILABLE:
        logger.info("BERT model not available (BERT_AVAILABLE=False), using Gemini only")
        return None
    
    if not bert_model:
        logger.info("BERT model not loaded (bert_model=None), using Gemini only")
        return None
    
    # Check if encoder is available
    if not bert_model.get('encoder'):
        logger.info("BERT encoder not available in model, using Gemini only")
        return None
    
    try:
        # Use BERT encoder to get embeddings
        if bert_model.get('encoder'):
            encoder = bert_model['encoder']
            encoder_name = bert_model.get('encoder_name', 'unknown')
            logger.info(f"Using encoder: {encoder_name}")
            
            # Get embeddings
            logger.info("=" * 60)
            logger.info("VECTOR EMBEDDING EXTRACTION")
            logger.info("Step 1: Encoding essay into vector...")
            essay_embedding = encoder.encode([essay], convert_to_numpy=True)[0]
            logger.info("Step 2: Encoding prompt into vector...")
            prompt_embedding = encoder.encode([prompt], convert_to_numpy=True)[0]
            
            logger.info("=" * 60)
            logger.info("EMBEDDING VECTOR STATISTICS")
            logger.info(f"Essay Embedding Vector:")
            logger.info(f"  Shape: {essay_embedding.shape}, Dtype: {essay_embedding.dtype}, Dimension: {essay_embedding.shape[0]}")
            logger.info(f"  Statistics: Min={essay_embedding.min():.6f}, Max={essay_embedding.max():.6f}, Mean={essay_embedding.mean():.6f}, Std={essay_embedding.std():.6f}")
            logger.info(f"  L2 norm: {np.linalg.norm(essay_embedding):.6f}")
            logger.info(f"  Sample values (first 10 dims): {essay_embedding[:10]}")
            logger.info(f"  Sample values (last 10 dims): {essay_embedding[-10:]}")
            
            logger.info(f"Prompt Embedding Vector:")
            logger.info(f"  Shape: {prompt_embedding.shape}, Dtype: {prompt_embedding.dtype}, Dimension: {prompt_embedding.shape[0]}")
            logger.info(f"  Statistics: Min={prompt_embedding.min():.6f}, Max={prompt_embedding.max():.6f}, Mean={prompt_embedding.mean():.6f}, Std={prompt_embedding.std():.6f}")
            logger.info(f"  L2 norm: {np.linalg.norm(prompt_embedding):.6f}")
            logger.info(f"  Sample values (first 10 dims): {prompt_embedding[:10]}")
            logger.info(f"  Sample values (last 10 dims): {prompt_embedding[-10:]}")
            
            # Calculate cosine similarity
            import numpy as np
            logger.info("=" * 60)
            logger.info("COSINE SIMILARITY CALCULATION")
            logger.info("Step 1: Calculate dot product (element-wise multiplication and sum)")
            dot_product = np.dot(essay_embedding, prompt_embedding)
            logger.info(f"  Dot product (essay · prompt): {dot_product:.6f}")
            logger.info(f"  Formula: Σ(essay[i] × prompt[i]) for i in [0, {essay_embedding.shape[0]-1}]")
            logger.info(f"  Calculation: sum of {essay_embedding.shape[0]} element-wise products")
            
            logger.info("Step 2: Calculate L2 norms (Euclidean distance from origin)")
            norm_essay = np.linalg.norm(essay_embedding)
            norm_prompt = np.linalg.norm(prompt_embedding)
            logger.info(f"  Essay L2 norm: ||essay|| = √(Σ(essay[i]²)) = {norm_essay:.6f}")
            logger.info(f"  Prompt L2 norm: ||prompt|| = √(Σ(prompt[i]²)) = {norm_prompt:.6f}")
            
            logger.info("Step 3: Calculate cosine similarity")
            logger.info(f"  Formula: cosine_sim = (essay · prompt) / (||essay|| × ||prompt||)")
            logger.info(f"  Calculation: {dot_product:.6f} / ({norm_essay:.6f} × {norm_prompt:.6f})")
            
            if norm_essay > 0 and norm_prompt > 0:
                cosine_sim = dot_product / (norm_essay * norm_prompt)
                logger.info(f"  Raw cosine similarity: {cosine_sim:.6f} (theoretical range: -1 to 1)")
                interpretation = "Very high similarity (almost identical meaning)" if cosine_sim > 0.9 else \
                                "High similarity (related topics)" if cosine_sim > 0.7 else \
                                "Moderate similarity (somewhat related)" if cosine_sim > 0.5 else \
                                "Low similarity (different topics)" if cosine_sim > 0.3 else \
                                "Very low similarity (unrelated)"
                logger.info(f"  Interpretation: {interpretation}")
                
                # Normalize to 0-1 range (cosine similarity is -1 to 1, but embeddings usually 0-1)
                similarity = max(0, min(1, (cosine_sim + 1) / 2))
                logger.info(f"  Normalized similarity: {similarity:.6f} (range: 0 to 1)")
                logger.info(f"  Normalization formula: (cosine_sim + 1) / 2 = ({cosine_sim:.6f} + 1) / 2")
                logger.info("=" * 60)
                logger.info("FINAL RESULT")
                logger.info(f"Final BERT semantic similarity: {similarity:.4f}")
                logger.info(f"Relevance score (0-100): {similarity * 100:.1f}/100")
                logger.info("=" * 60)
                return float(similarity)
            else:
                logger.error(f"Zero norm detected: Essay norm={norm_essay}, Prompt norm={norm_prompt}")
        
        logger.warning("No encoder available in BERT model")
        return None
    except Exception as e:
        logger.error(f"BERT similarity calculation error: {e}")
        import traceback
        traceback.print_exc()
        return None


def detect_off_topic_generic(
    essay: str,
    prompt: str,
    prompt_analysis: Dict,
    semantic_similarity: Optional[float],
    content_validation: Dict
) -> Dict:
    """
    Generic off-topic detection method that works for any prompt/essay combination.
    Uses multiple approaches:
    1. Semantic similarity (BERT embeddings)
    2. Keyword extraction and matching
    3. Required elements coverage
    4. Topic mismatch analysis
    
    Returns: {
        "is_off_topic": bool,
        "off_topic_level": "none" | "incomplete" | "partial" | "complete",
        "confidence": float,
        "reasons": List[str],
        "keyword_coverage": float,
        "semantic_similarity": float,
        "elements_coverage": float
    }
    """
    logger.info("=" * 60)
    logger.info("GENERIC OFF-TOPIC DETECTION")
    logger.info("=" * 60)
    
    essay_lower = essay.lower()
    prompt_lower = prompt.lower()
    
    # 1. Extract keywords from prompt analysis
    topic_keywords = prompt_analysis.get('topic_keywords', [])
    main_topic = prompt_analysis.get('main_topic', '').lower()
    required_elements = prompt_analysis.get('required_elements', {})
    
    # 2. Keyword matching score
    keyword_matches = 0
    matched_keywords = []
    missing_keywords = []
    
    for keyword in topic_keywords[:15]:  # Check top 15 keywords
        keyword_lower = keyword.lower()
        if keyword_lower in essay_lower:
            keyword_matches += 1
            matched_keywords.append(keyword)
        else:
            missing_keywords.append(keyword)
    
    keyword_coverage = keyword_matches / len(topic_keywords) if topic_keywords else 0.0
    logger.info(f"Keyword Coverage: {keyword_matches}/{len(topic_keywords)} = {keyword_coverage:.2%}")
    logger.info(f"Matched keywords: {matched_keywords[:5]}")
    logger.info(f"Missing keywords: {missing_keywords[:5]}")
    
    # 3. Required elements coverage
    elements_coverage = 0.0
    addressed_elements = []
    missing_elements = []
    
    for element_key, element_desc in required_elements.items():
        if element_desc:
            # Check if essay mentions this element (simple keyword matching)
            element_keywords = element_desc.lower().split()
            element_mentioned = any(kw in essay_lower for kw in element_keywords if len(kw) > 3)
            if element_mentioned:
                addressed_elements.append(element_key)
            else:
                missing_elements.append(element_key)
    
    if required_elements:
        elements_coverage = len(addressed_elements) / len(required_elements)
        logger.info(f"Elements Coverage: {len(addressed_elements)}/{len(required_elements)} = {elements_coverage:.2%}")
        logger.info(f"Addressed: {addressed_elements}")
        logger.info(f"Missing: {missing_elements}")
    
    # 4. Semantic similarity (BERT)
    bert_similarity = semantic_similarity if semantic_similarity else 0.0
    bert_relevance = bert_similarity * 100
    logger.info(f"BERT Semantic Similarity: {bert_similarity:.4f} ({bert_relevance:.1f}%)")
    
    # 5. Gemini relevance (from content_validation)
    gemini_relevance = content_validation.get('overall_relevance', 100)
    gemini_on_topic = content_validation.get('is_on_topic', True)
    logger.info(f"Gemini Relevance: {gemini_relevance}%")
    logger.info(f"Gemini On-topic: {gemini_on_topic}")
    
    # 6. Combined scoring
    # Weight: Keyword 30%, Elements 20%, BERT 25%, Gemini 25%
    combined_score = (
        keyword_coverage * 0.30 +
        elements_coverage * 0.20 +
        (bert_relevance / 100) * 0.25 +
        (gemini_relevance / 100) * 0.25
    )
    combined_relevance = combined_score * 100
    logger.info(f"Combined Relevance: {combined_relevance:.1f}%")
    
    # 7. Determine off-topic level
    off_topic_level = "none"
    is_off_topic = False
    confidence = 0.8
    reasons = []
    
    # Critical checks
    if keyword_coverage == 0 and len(topic_keywords) > 0:
        # No keywords matched at all
        reasons.append(f"No topic keywords found in essay (expected: {', '.join(topic_keywords[:5])})")
        confidence = 0.95
        is_off_topic = True
    
    if elements_coverage < 0.3 and len(required_elements) > 0:
        # Missing most required elements
        reasons.append(f"Missing most required elements ({len(missing_elements)}/{len(required_elements)})")
        confidence = 0.85
    
    if bert_relevance < 30 and gemini_relevance < 40:
        # Both models agree it's off-topic
        reasons.append(f"Both BERT ({bert_relevance:.1f}%) and Gemini ({gemini_relevance}%) indicate low relevance")
        confidence = 0.95
        is_off_topic = True
    
    # Use task_fulfillment_checker if available for better detection
    if TASK_CHECKERS_AVAILABLE:
        try:
            logger.info("=" * 60)
            logger.info("TASK FULFILLMENT CHECKER ANALYSIS")
            logger.info("=" * 60)
            task_fulfillment_result = analyze_off_topic_detection(essay, prompt, task_level="B2")
            task_fulfillment_is_off_topic = task_fulfillment_result.get('is_off_topic', False)
            task_fulfillment_confidence = task_fulfillment_result.get('confidence', 0.0)
            task_fulfillment_keyword_coverage = task_fulfillment_result.get('keyword_coverage', 0.0)
            task_fulfillment_reasons = task_fulfillment_result.get('reasons', [])
            task_fulfillment_matched = task_fulfillment_result.get('matched_keywords', [])
            task_fulfillment_missing = task_fulfillment_result.get('missing_keywords', [])
            
            logger.info(f"Is Off-topic: {task_fulfillment_is_off_topic}")
            logger.info(f"Confidence: {task_fulfillment_confidence:.2f}")
            logger.info(f"Keyword Coverage: {task_fulfillment_keyword_coverage:.2%}")
            logger.info(f"Matched Keywords: {task_fulfillment_matched[:10]}")
            logger.info(f"Missing Keywords: {task_fulfillment_missing[:10]}")
            logger.info(f"Reasons: {task_fulfillment_reasons}")
            logger.info("=" * 60)
            
            # If task fulfillment checker says off-topic with high confidence, use it
            if task_fulfillment_is_off_topic and task_fulfillment_confidence > 0.8:
                is_off_topic = True
                confidence = max(confidence, task_fulfillment_confidence)
                reasons.extend(task_fulfillment_reasons)
                # Adjust combined relevance based on task fulfillment
                if task_fulfillment_keyword_coverage < 0.3:
                    combined_relevance = min(combined_relevance, 30)
                    logger.warning(f"Task Fulfillment: Very low keyword coverage ({task_fulfillment_keyword_coverage:.2%}) → Adjusting relevance to {combined_relevance:.1f}%")
                elif task_fulfillment_keyword_coverage < 0.5:
                    combined_relevance = min(combined_relevance, 50)
                    logger.warning(f"Task Fulfillment: Low keyword coverage ({task_fulfillment_keyword_coverage:.2%}) → Adjusting relevance to {combined_relevance:.1f}%")
        except Exception as e:
            logger.warning(f"Task fulfillment checker error: {e}")
            import traceback
            traceback.print_exc()
    
    # Determine level based on combined relevance (more lenient thresholds)
    # Only mark as complete if REALLY off-topic
    if combined_relevance < 25 or (keyword_coverage == 0 and len(topic_keywords) > 5 and bert_relevance < 20):
        # Very strict: only complete off-topic if multiple indicators agree
        off_topic_level = "complete"
        is_off_topic = True
        reasons.append("Essay does not address the prompt topic at all")
    elif combined_relevance < 40:
        # Low relevance but not complete - check contradictions
        if TASK_CHECKERS_AVAILABLE:
            try:
                has_contradiction, contradiction_reasons = detect_topic_contradiction(essay, prompt)
                if has_contradiction:
                    off_topic_level = "complete"
                    is_off_topic = True
                    reasons.extend(contradiction_reasons)
                else:
                    off_topic_level = "partial"
                    is_off_topic = True
                    reasons.append("Essay has low relevance to the prompt topic")
            except:
                off_topic_level = "partial"
                is_off_topic = True
                reasons.append("Essay has low relevance to the prompt topic")
        else:
            off_topic_level = "partial"
            is_off_topic = True
            reasons.append("Essay has low relevance to the prompt topic")
    elif combined_relevance < 55:
        off_topic_level = "partial"
        is_off_topic = True
        reasons.append("Essay partially addresses the prompt but misses key requirements")
    elif combined_relevance < 70:
        off_topic_level = "incomplete"
        reasons.append("Essay addresses the topic but is missing some required elements")
    else:
        off_topic_level = "none"
        reasons.append("Essay is on-topic")
    
    logger.info(f"Off-topic Level: {off_topic_level}")
    logger.info(f"Is Off-topic: {is_off_topic}")
    logger.info(f"Confidence: {confidence:.2f}")
    logger.info(f"Reasons: {reasons}")
    logger.info("=" * 60)
    
    return {
        "is_off_topic": is_off_topic,
        "off_topic_level": off_topic_level,
        "overall_relevance": int(combined_relevance),
        "confidence": confidence,
        "reasons": reasons,
        "keyword_coverage": keyword_coverage,
        "semantic_similarity": bert_similarity,
        "elements_coverage": elements_coverage,
        "matched_keywords": matched_keywords,
        "missing_keywords": missing_keywords[:10],
        "addressed_elements": addressed_elements,
        "missing_elements": missing_elements,
        "off_topic_reason": "; ".join(reasons) if reasons else "Essay addresses the prompt topic"
    }


def improved_off_topic_detection(
    content_validation: Dict,
    semantic_similarity: Optional[float],
    prompt_analysis: Dict,
    essay: str = ""
) -> Dict:
    """
    Cải thiện logic phát hiện lạc đề:
    - Không cho 0 điểm ngay
    - Phân biệt: lạc đề hoàn toàn vs. thiếu một số phần
    - Sử dụng BERT similarity để cross-validate
    """
    print(f"\n[HYBRID_SCORER] ========== OFF-TOPIC DETECTION ==========")
    
    gemini_relevance = content_validation.get('overall_relevance', 100)
    gemini_on_topic = content_validation.get('is_on_topic', True)
    confidence = content_validation.get('confidence', 0.8)
    
    logger.info("Gemini assessment:")
    logger.info(f"  Relevance score: {gemini_relevance}/100")
    logger.info(f"  Is on topic: {gemini_on_topic}")
    logger.info(f"  Confidence: {confidence:.2f}")
    
    # Combine Gemini và BERT scores
    final_relevance = gemini_relevance
    final_on_topic = gemini_on_topic
    
    if semantic_similarity is not None:
        # BERT similarity (0-1) -> relevance (0-100)
        bert_relevance = semantic_similarity * 100
        logger.info("BERT assessment:")
        logger.info(f"  Similarity: {semantic_similarity:.4f}")
        logger.info(f"  Relevance score: {bert_relevance:.1f}/100")
        
        # Weighted average: Gemini 70%, BERT 30%
        final_relevance = gemini_relevance * 0.7 + bert_relevance * 0.3
        logger.info(f"Combined relevance (Gemini 70% + BERT 30%): {final_relevance:.1f}/100")
        
        # Cross-validate: nếu BERT và Gemini đều thấy lạc đề thì chắc chắn lạc đề
        if bert_relevance < 40 and gemini_relevance < 50:
            final_on_topic = False
            confidence = 0.95
            # Force lower relevance if both models agree it's off-topic
            final_relevance = min(final_relevance, (bert_relevance + gemini_relevance) / 2)
            # If both are very low, force complete off-topic
            if bert_relevance < 30 and gemini_relevance < 40:
                final_relevance = 15
            logger.warning("Cross-validation: Both models indicate off-topic → High confidence off-topic")
            logger.warning(f"Adjusted relevance: {final_relevance:.1f}% (BERT: {bert_relevance:.1f}%, Gemini: {gemini_relevance:.1f}%)")
        # If BERT similarity is very low (< 0.3), likely off-topic
        elif semantic_similarity < 0.3:
            logger.warning(f"BERT similarity very low ({semantic_similarity:.3f}) → Likely off-topic")
            if gemini_relevance < 60:
                final_relevance = min(final_relevance, 30)
                logger.warning(f"Adjusted relevance to {final_relevance:.1f}% due to low BERT similarity")
        # Nếu một trong hai thấy OK thì có thể chỉ thiếu phần, không phải lạc đề
        elif bert_relevance >= 50 or gemini_relevance >= 60:
            final_on_topic = True
            logger.info("Cross-validation: At least one model indicates on-topic")
            # Giảm relevance nếu một trong hai thấy thấp (thiếu phần)
            if bert_relevance < 50:
                final_relevance = min(gemini_relevance, 70)  # Cap at 70 if missing parts
                logger.info("BERT relevance low → Capped at 70 (missing parts)")
            elif gemini_relevance < 50:
                final_relevance = min(bert_relevance, 70)
                logger.info("Gemini relevance low → Capped at 70 (missing parts)")
    else:
        logger.warning("BERT similarity not available, using Gemini only")
    
    # Phân loại mức độ lạc đề - STRICT LOGIC
    off_topic_level = "none"
    off_topic_reason = ""
    
    # CRITICAL: Use stricter thresholds for off-topic detection
    # STRICTER: If relevance < 50, consider it complete off-topic (was 40)
    if final_relevance < 50:
        # Lạc đề hoàn toàn - cho 0 điểm
        off_topic_level = "complete"
        off_topic_reason = content_validation.get('off_topic_reason', 'Essay does not address the prompt topic at all')
        # Force off-topic if relevance is very low
        final_on_topic = False
        # Force relevance to be very low
        final_relevance = min(final_relevance, 20)
        logger.warning(f"Classification: COMPLETE OFF-TOPIC (relevance < 50: {final_relevance:.1f}%)")
        logger.warning(f"Reason: {off_topic_reason}")
    elif final_relevance < 60:
        # Relevance 50-60: Check if it's a clear topic mismatch (weekends vs trip, etc.)
        off_topic_reason = content_validation.get('off_topic_reason', '')
        prompt_lower = prompt_analysis.get('main_topic', '').lower()
        essay_lower = essay.lower() if essay else ''
        
        # Check for clear topic mismatches - weekends vs trip/vacation
        if ('weekend' in off_topic_reason.lower() or 'daily routine' in off_topic_reason.lower() or 
            'weekend' in essay_lower or 'weekends' in essay_lower):
            if any(word in prompt_lower for word in ['trip', 'vacation', 'travel', 'journey', 'holiday']):
                # Force complete off-topic if clear mismatch
                off_topic_level = "complete"
                final_relevance = 15
                logger.warning(f"Classification: COMPLETE OFF-TOPIC (clear topic mismatch: weekends vs trip/vacation)")
            else:
                off_topic_level = "partial"
                logger.warning(f"Classification: PARTIAL OFF-TOPIC (relevance 40-50: {final_relevance:.1f}%)")
        else:
            off_topic_level = "partial"
            off_topic_reason = content_validation.get('off_topic_reason', 'Essay partially addresses the prompt but misses key requirements')
            logger.warning(f"Classification: PARTIAL OFF-TOPIC (relevance 40-50: {final_relevance:.1f}%)")
    elif final_relevance < 55:
        # Relevance 50-55: Partial off-topic
        off_topic_level = "partial"
        off_topic_reason = content_validation.get('off_topic_reason', 'Essay partially addresses the prompt but misses key requirements')
        logger.warning(f"Classification: PARTIAL OFF-TOPIC (relevance 50-55: {final_relevance:.1f}%)")
    elif final_relevance < 70:
        # Thiếu một số phần - trừ điểm nhẹ
        off_topic_level = "incomplete"
        off_topic_reason = "Essay addresses the topic but is missing some required elements"
        logger.info(f"Classification: INCOMPLETE (relevance 55-70: {final_relevance:.1f}%)")
    else:
        # On-topic
        off_topic_level = "none"
        logger.info(f"Classification: ON-TOPIC (relevance >= 70: {final_relevance:.1f}%)")
    
    logger.info("Final result:")
    logger.info(f"  Off-topic level: {off_topic_level}")
    logger.info(f"  Final relevance: {int(final_relevance)}/100")
    logger.info(f"  Is on topic: {final_on_topic}")
    logger.info("=" * 60)
    
    return {
        "is_on_topic": final_on_topic,
        "overall_relevance": int(final_relevance),
        "off_topic_level": off_topic_level,  # none, incomplete, partial, complete
        "off_topic_reason": off_topic_reason,
        "confidence": confidence,
        "gemini_relevance": gemini_relevance,
        "bert_similarity": semantic_similarity,
        "bert_relevance": semantic_similarity * 100 if semantic_similarity else None
    }


def calculate_word_count_score(essay: str, target_word_count: Dict) -> Dict:
    """Calculate score based on word count compliance"""
    print(f"\n[HYBRID_SCORER] ========== WORD COUNT VALIDATION ==========")
    
    words = essay.split()
    word_count = len(words)
    
    minimum = target_word_count.get('minimum', 50)
    maximum = target_word_count.get('maximum', 300)
    target = target_word_count.get('target', 150)
    
    print(f"[HYBRID_SCORER] Word count requirements:")
    print(f"  - Minimum: {minimum} words")
    print(f"  - Target: {target} words")
    print(f"  - Maximum: {maximum} words")
    print(f"  - Actual: {word_count} words")
    print(f"  - Ratio to target: {word_count/target:.2%}")
    
    if word_count < minimum:
        ratio = word_count / minimum
        score = int(ratio * 70)
        feedback = f"Too short: {word_count} words (minimum: {minimum})"
        penalty = 0.7
        print(f"[HYBRID_SCORER] Status: TOO SHORT")
        print(f"[HYBRID_SCORER] Score calculation: {word_count}/{minimum} * 70 = {score}")
    elif word_count > maximum:
        score = 85
        feedback = f"Slightly too long: {word_count} words (maximum: {maximum})"
        penalty = 0.95
        print(f"[HYBRID_SCORER] Status: TOO LONG")
        print(f"[HYBRID_SCORER] Score: 85 (minor penalty)")
    elif minimum <= word_count <= target:
        ratio = (word_count - minimum) / (target - minimum) if target > minimum else 1.0
        score = int(70 + ratio * 20)
        feedback = f"Good length: {word_count} words"
        penalty = 1.0
        print(f"[HYBRID_SCORER] Status: GOOD (within range)")
        print(f"[HYBRID_SCORER] Score calculation: 70 + ({ratio:.2f} * 20) = {score}")
    else:
        score = 90 + min((word_count - target) / (maximum - target) * 10, 10)
        feedback = f"Excellent length: {word_count} words"
        penalty = 1.0
        print(f"[HYBRID_SCORER] Status: EXCELLENT (at target)")
        print(f"[HYBRID_SCORER] Score: {score}")
    
    print(f"[HYBRID_SCORER] Final word count score: {score}/100")
    print(f"[HYBRID_SCORER] Penalty multiplier: {penalty}")
    print(f"[HYBRID_SCORER] ===========================================\n")
    
    return {
        "word_count": word_count,
        "target_range": f"{minimum}-{maximum}",
        "score": int(score),
        "feedback": feedback,
        "penalty_multiplier": penalty
    }


def calculate_task_response_score_ielts(
    content_validation: Dict,
    word_count_result: Dict,
    prompt_analysis: Dict,
    off_topic_info: Dict
) -> Dict:
    """
    IELTS Task Response / Task Achievement scoring
    Tiêu chí:
    1. Phân tích kỹ đề bài - hiểu đúng yêu cầu
    2. Trình bày quan điểm rõ ràng
    3. Phát triển ý đầy đủ với ví dụ cụ thể
    4. Không lạc đề, không thiếu ý
    """
    off_topic_level = off_topic_info.get('off_topic_level', 'none')
    relevance = off_topic_info.get('overall_relevance', 100)
    off_topic_reason = off_topic_info.get('off_topic_reason', '')
    
    # CRITICAL: If completely off-topic, return 0 immediately - no further calculation
    if off_topic_level == "complete":
        logger.info("Task Response: Completely off-topic → 0 points")
        return {
            "score": 0.0,
            "score_100": 0,
            "feedback": [f"❌ {off_topic_reason or 'Essay does not address the prompt topic at all'}"],
            "addressed_elements": [],
            "missing_elements": [],
            "off_topic_level": "complete"
        }
    
    # Check required elements
    addressed_elements = content_validation.get('addressed_elements', [])
    missing_elements = content_validation.get('missing_elements', [])
    total_elements = len(addressed_elements) + len(missing_elements)
    
    # Base score từ relevance và off-topic level
    # CRITICAL: If relevance is very low, treat as complete off-topic
    if relevance < 40:
        logger.warning(f"Task Response: Relevance too low ({relevance:.1f}%) → Treating as complete off-topic")
        return {
            "score": 0.0,
            "score_100": 0,
            "feedback": [f"❌ Essay does not address the prompt topic (relevance: {relevance:.1f}%)"],
            "addressed_elements": [],
            "missing_elements": [],
            "off_topic_level": "complete"
        }
    
    if off_topic_level == "partial":
        # Lạc đề một phần - nhưng nếu relevance < 45 thì vẫn là complete off-topic
        if relevance < 45:
            logger.warning(f"Task Response: Relevance too low for partial ({relevance:.1f}%) → Treating as complete off-topic")
            return {
                "score": 0.0,
                "score_100": 0,
                "feedback": [f"❌ Essay does not address the prompt topic (relevance: {relevance:.1f}%)"],
                "addressed_elements": [],
                "missing_elements": [],
                "off_topic_level": "complete"
            }
        # Lạc đề một phần - relevance 45-55 → score 20-40
        base_score = 20 + (relevance - 45) / 10 * 20  # Map 45-55 relevance to 20-40 score
        logger.info(f"Task Response: Partially off-topic (relevance={relevance:.1f}%) → base score={base_score:.1f}")
    elif off_topic_level == "incomplete":
        # Thiếu phần - relevance 55-70 → score 40-60
        base_score = 40 + (relevance - 55) / 15 * 20  # Map 55-70 relevance to 40-60 score
        logger.info(f"Task Response: Incomplete (relevance={relevance:.1f}%) → base score={base_score:.1f}")
    else:
        # On-topic - relevance 70-100 → score 70-100 (tăng từ 60-100)
        base_score = 70 + (relevance - 70) / 30 * 30  # Map 70-100 relevance to 70-100 score
        logger.info(f"Task Response: On-topic (relevance={relevance:.1f}%) → base score={base_score:.1f}")
    
    # Adjust based on elements coverage - MORE LENIENT
    if total_elements > 0:
        elements_coverage = len(addressed_elements) / total_elements
        logger.info(f"Task Response: Elements coverage={elements_coverage:.1%} ({len(addressed_elements)}/{total_elements})")
        # More lenient penalty - only penalize if really missing many elements
        if elements_coverage < 0.3:
            base_score *= 0.8  # Reduced from 0.7
            logger.info(f"Task Response: Very low coverage (<30%) → reduced by 20%")
        elif elements_coverage < 0.5:
            base_score *= 0.9  # Reduced from 0.7
            logger.info(f"Task Response: Low coverage (<50%) → reduced by 10%")
        elif elements_coverage < 0.7:
            base_score *= 0.95  # Reduced from 0.85
            logger.info(f"Task Response: Moderate coverage (<70%) → reduced by 5%")
        else:
            # Good coverage - bonus
            base_score *= 1.05
            base_score = min(100, base_score)
            logger.info(f"Task Response: Good coverage (≥70%) → bonus 5%")
    
    # Apply word count penalty
    word_count_penalty = word_count_result.get('penalty_multiplier', 1.0)
    if word_count_penalty < 1.0:
        logger.info(f"Task Response: Word count penalty={word_count_penalty:.2f}")
    base_score = base_score * word_count_penalty
    
    # Check content quality (depth, detail, examples)
    content_quality = content_validation.get('content_quality_score', 70)
    quality_factor = content_quality / 100
    
    # Final score: 60% base score + 40% quality-adjusted score (tăng quality weight)
    # If on-topic and good quality, should get high score
    final_score = base_score * 0.6 + (base_score * quality_factor) * 0.4
    
    # Bonus for on-topic essays with good quality
    if off_topic_level == "none" and content_quality >= 75:
        final_score = min(100, final_score * 1.1)  # 10% bonus
        logger.info(f"Task Response: On-topic with good quality → 10% bonus")
    
    final_score = max(0, min(100, final_score))
    
    logger.info(f"Task Response: Final score={final_score:.1f}/100 (base={base_score:.1f}, quality={content_quality})")
    
    # Generate feedback - clear and specific
    feedback_items = []
    
    if off_topic_level == "partial":
        feedback_items.append(f"⚠️ Partially off-topic: {off_topic_reason or 'Essay partially addresses the prompt but misses key requirements'}")
    elif off_topic_level == "incomplete":
        feedback_items.append(f"⚠️ Incomplete response: {off_topic_reason or 'Essay addresses the topic but is missing some required elements'}")
    
    if missing_elements:
        feedback_items.append(f"❌ Missing required elements: {', '.join(missing_elements[:3])}")
        if len(missing_elements) > 3:
            feedback_items.append(f"   ... and {len(missing_elements) - 3} more")
    
    if addressed_elements:
        feedback_items.append(f"✓ Addressed elements: {', '.join(addressed_elements[:3])}")
        if len(addressed_elements) > 3:
            feedback_items.append(f"   ... and {len(addressed_elements) - 3} more")
    
    if content_quality >= 80:
        feedback_items.append("✓ Well-developed ideas with good detail and examples")
    elif content_quality >= 60:
        feedback_items.append("✓ Ideas are developed with some detail")
    else:
        feedback_items.append("⚠️ Ideas need more development and specific examples")
    
    word_count_feedback = word_count_result.get('feedback', '')
    if word_count_feedback:
        feedback_items.append(f"✓ Word count: {word_count_feedback}")
    
    return {
        "score": round(final_score / 10, 1),
        "score_100": int(final_score),
        "feedback": feedback_items,
        "addressed_elements": addressed_elements,
        "missing_elements": missing_elements,
        "off_topic_level": off_topic_level
    }


def calculate_coherence_score_ielts(
    quality_assessment: Dict,
    essay: str,
    prompt_analysis: Optional[Dict] = None
) -> Dict:
    """
    Coherence and Cohesion scoring - Based on prompt requirements, not IELTS
    Tiêu chí:
    1. Mạch lạc (Coherence): Cấu trúc logic phù hợp với đề bài
    2. Liên kết (Cohesion): Từ nối, phép thế, chia đoạn hợp lý
    3. Organization: Tổ chức theo yêu cầu đề bài
    """
    coherence_data = quality_assessment.get('coherence', {})
    coherence_score = coherence_data.get('score', 70)
    metrics = coherence_data.get('metrics', {})
    
    # Check structure based on prompt requirements
    num_paragraphs = metrics.get('num_paragraphs', 1)
    linking_words = metrics.get('linking_words_count', 0)
    has_intro = metrics.get('has_introduction', False)
    has_conclusion = metrics.get('has_conclusion', False)
    
    # Determine expected structure from prompt
    task_type = prompt_analysis.get('task_type', 'general') if prompt_analysis else 'general'
    task_level = prompt_analysis.get('task_level', 'B2') if prompt_analysis else 'B2'
    
    # Expected paragraphs based on task type AND level
    expected_paragraphs = {
        'narrative': {'A1': 2, 'A2': 2, 'B1': 3, 'B2': 3, 'C1': 4, 'C2': 4},
        'argumentative': {'A1': 3, 'A2': 3, 'B1': 4, 'B2': 4, 'C1': 5, 'C2': 5},
        'descriptive': {'A1': 2, 'A2': 2, 'B1': 3, 'B2': 3, 'C1': 4, 'C2': 4},
        'opinion': {'A1': 3, 'A2': 3, 'B1': 4, 'B2': 4, 'C1': 5, 'C2': 5},
        'discussion': {'A1': 3, 'A2': 3, 'B1': 4, 'B2': 4, 'C1': 5, 'C2': 5},
        'general': {'A1': 2, 'A2': 2, 'B1': 3, 'B2': 3, 'C1': 4, 'C2': 4}
    }
    expected_para = expected_paragraphs.get(task_type, {}).get(task_level, 3)
    
    # Structure score (0-50) - based on prompt requirements
    structure_score = 0
    
    # Paragraph count score (0-25)
    if num_paragraphs >= expected_para:
        structure_score += 25
    elif num_paragraphs >= expected_para - 1:
        structure_score += 20
    elif num_paragraphs >= 2:
        structure_score += 15
    else:
        structure_score += 10
    
    # Introduction/Conclusion score (0-15)
    if has_intro:
        structure_score += 8
    if has_conclusion:
        structure_score += 7
    
    # Organization score (0-10) - based on prompt
    if prompt_analysis:
        required_elements = prompt_analysis.get('required_elements', {})
        if required_elements:
            # Check if essay addresses required elements in logical order
            structure_score += 10
    
    # Linking words score (0-25) - adjusted for level
    # More linking words expected for higher levels
    level_linking_expectations = {
        'A1': 2, 'A2': 3, 'B1': 4, 'B2': 5, 'C1': 7, 'C2': 10
    }
    expected_linking = level_linking_expectations.get(task_level, 5)
    
    linking_score = min(linking_words / expected_linking * 25, 25) if expected_linking > 0 else 0
    
    # Flow and organization (0-25) - từ Gemini assessment, adjusted for prompt
    flow_score = coherence_score * 0.25
    
    final_score = structure_score + linking_score + flow_score
    final_score = max(0, min(100, final_score))
    
    # Generate feedback based on prompt
    feedback_items = []
    
    if num_paragraphs < expected_para:
        feedback_items.append(f"⚠️ Essay needs {expected_para} paragraphs (expected for {task_type} task at {task_level} level, found {num_paragraphs})")
    elif num_paragraphs >= expected_para:
        feedback_items.append(f"✓ Good paragraph structure ({num_paragraphs} paragraphs, expected {expected_para})")
    
    if linking_words < expected_linking:
        feedback_items.append(f"⚠️ Use more linking words (expected {expected_linking} for {task_level} level, found {linking_words})")
        feedback_items.append("💡 Try: however, therefore, furthermore, in addition, on the other hand")
    elif linking_words >= expected_linking:
        feedback_items.append(f"✓ Good use of linking words ({linking_words} found)")
    
    if not has_intro:
        feedback_items.append("⚠️ Add a clear introduction")
    if not has_conclusion:
        feedback_items.append("⚠️ Add a clear conclusion")
    
    coherence_fb = coherence_data.get('feedback', {})
    if coherence_fb.get('suggestions'):
        feedback_items.extend([f"💡 {s}" for s in coherence_fb['suggestions'][:2]])
    
    return {
        "score": round(final_score / 10, 1),
        "score_100": int(final_score),
        "feedback": feedback_items,
        "structure_score": structure_score,
        "linking_score": linking_score,
        "flow_score": flow_score
    }


def calculate_lexical_resource_score_ielts(
    quality_assessment: Dict,
    task_level: str,
    essay: str = ""
) -> Dict:
    """
    Lexical Resource scoring - Based on actual errors and level requirements
    Tiêu chí:
    1. Độ đa dạng (Range): Nhiều từ vựng khác nhau, tránh lặp
    2. Độ chính xác (Accuracy): Dùng từ đúng nghĩa, đúng ngữ cảnh - TRỪ ĐIỂM KHI CÓ LỖI
    3. Collocations: Cụm từ tự nhiên
    4. Văn phong: Phù hợp với level
    """
    vocab_data = quality_assessment.get('vocabulary', {})
    vocab_score = vocab_data.get('score', 70)  # Base score from Gemini
    metrics = vocab_data.get('metrics', {})
    feedback_data = vocab_data.get('feedback', {})
    
    # Get errors from Gemini assessment
    errors = feedback_data.get('errors', [])
    
    # CRITICAL: Also check for spelling errors - but ONLY use Gemini errors, not rule-based
    # Rule-based detection is unreliable (flags correct words like "whether", "university")
    spelling_errors = []
    # Only use spelling errors from Gemini assessment, not from detect_spelling_errors
    # because detect_spelling_errors flags unknown words as errors (incorrect)
    for error in errors:
        if 'spelling' in str(error).lower() or 'spell' in str(error).lower():
            spelling_errors.append(error)
    
    logger.info(f"Spelling errors from Gemini: {len(spelling_errors)}")
    
    num_errors = len(errors)
    
    # Range score (0-35) - từ lexical diversity
    lexical_diversity = metrics.get('lexical_diversity', 0.5)
    level_thresholds = {
        'A1': 0.50, 'A2': 0.55, 'B1': 0.60, 'B2': 0.65, 'C1': 0.70, 'C2': 0.75
    }
    threshold = level_thresholds.get(task_level, 0.65)
    range_score = min(lexical_diversity / threshold, 1.0) * 35
    
    # Sophistication score (0-25) - từ sophisticated words ratio
    sophisticated_ratio = metrics.get('sophisticated_ratio', 0.1)
    sophistication_thresholds = {
        'A1': 0.05, 'A2': 0.08, 'B1': 0.12, 'B2': 0.15, 'C1': 0.20, 'C2': 0.25
    }
    soph_threshold = sophistication_thresholds.get(task_level, 0.15)
    sophistication_score = min(sophisticated_ratio / soph_threshold, 1.0) * 25
    
    # Check for spelling errors specifically
    spelling_error_count = sum(1 for e in errors if 'spelling' in str(e).lower() or 'should be' in str(e).lower())
    vocab_error_count = num_errors - spelling_error_count
    
    # CRITICAL: Categorize vocabulary errors into basic and advanced
    # Basic errors: wrong word choice, incorrect collocations, common mistakes
    # Advanced errors: style issues, subtle nuances
    basic_vocab_errors = []
    advanced_vocab_errors = []
    basic_keywords = ['wrong', 'incorrect', 'should be', 'use', 'instead of', 'collocation', 'common mistake']
    
    for error in errors:
        if 'spelling' not in str(error).lower():
            error_lower = str(error).lower()
            is_basic = any(keyword in error_lower for keyword in basic_keywords)
            if is_basic:
                basic_vocab_errors.append(error)
            else:
                advanced_vocab_errors.append(error)
    
    basic_vocab_count = len(basic_vocab_errors)
    advanced_vocab_count = len(advanced_vocab_errors)
    
    logger.info("Vocabulary error categorization:")
    logger.info(f"  Basic errors (wrong word, collocation): {basic_vocab_count}")
    logger.info(f"  Advanced errors (style, nuance): {advanced_vocab_count}")
    logger.info(f"  Spelling errors: {spelling_error_count}")
    
    # Accuracy score (0-40) - từ Gemini assessment, TRỪ ĐIỂM KHI CÓ LỖI
    # CRITICAL: Base accuracy should be lower if Gemini reports errors
    # Basic errors are MORE SEVERE - should not happen at any level
    if num_errors > 0:
        # Basic errors: -15 each (severe)
        # Advanced errors: -8 each
        # Spelling errors: -10 each (moderate - only if confirmed by Gemini)
        reduction = (spelling_error_count * 10) + (basic_vocab_count * 15) + (advanced_vocab_count * 8)
        
        if vocab_score > 80:
            # If score is high but has errors, reduce significantly
            vocab_score = max(25, vocab_score - reduction)
            logger.info(f"Reduced base vocab score by {reduction} points (basic errors are very severe)")
        elif vocab_score > 60:
            # If score is moderate, still reduce heavily for basic errors
            reduction_factor = 0.9 if basic_vocab_count > 0 else 0.75
            vocab_score = max(15, vocab_score - (reduction * reduction_factor))
            logger.info(f"Reduced base vocab score by {reduction * reduction_factor:.1f} points")
        else:
            # Even if score is low, still reduce for basic errors
            if basic_vocab_count > 0:
                vocab_score = max(10, vocab_score - (basic_vocab_count * 15))
                logger.info(f"Reduced base vocab score by {basic_vocab_count * 15} points (basic errors)")
    
    base_accuracy = vocab_score * 0.4
    
    # Penalty for errors - BALANCED PENALTY
    # Basic vocab errors: -15 points each (severe)
    # Advanced vocab errors: -8 to -12 points each
    # Spelling errors: -10 points each (moderate - only if confirmed by Gemini)
    error_penalty = 0
    
    if spelling_error_count > 0:
        # Spelling errors: moderate penalty (only if confirmed by Gemini)
        error_penalty += spelling_error_count * 10
        logger.info(f"Spelling errors penalty: {spelling_error_count} × 10 = {spelling_error_count * 10}")
    
    if basic_vocab_count > 0:
        # Basic errors are VERY SEVERE - should not happen at any level
        error_penalty += basic_vocab_count * 25
        logger.info(f"Basic vocab errors penalty: {basic_vocab_count} × 25 = {basic_vocab_count * 25} (VERY SEVERE)")
    
    if advanced_vocab_count > 0:
        # Advanced errors: progressive penalty
        if advanced_vocab_count <= 2:
            error_penalty += advanced_vocab_count * 12
        elif advanced_vocab_count <= 4:
            error_penalty += 2 * 12 + (advanced_vocab_count - 2) * 15
        else:
            error_penalty += 2 * 12 + 2 * 15 + (advanced_vocab_count - 4) * 18
        logger.info(f"Advanced vocab errors penalty: {advanced_vocab_count} errors = {error_penalty - (spelling_error_count * 20) - (basic_vocab_count * 25)}")
    
    # Cap penalty at 40 (max accuracy score)
    error_penalty = min(error_penalty, 40)
    
    accuracy_score = max(0, base_accuracy - error_penalty)
    
    # CRITICAL: Cap score based on error severity - BALANCED
    # Basic vocab errors: cap at 50 for 1, 40 for 2, 30 for 3+
    # Spelling errors: cap at 60 for 1-2, 50 for 3-4, 40 for 5+
    # Advanced vocab errors: cap at 70 for 1-2, 60 for 3-4, 50 for 5+
    calculated_score = range_score + sophistication_score + accuracy_score
    
    if basic_vocab_count > 0:
        # Basic errors: moderate cap
        max_score = max(30, 70 - (basic_vocab_count * 10))
        final_score = min(calculated_score, max_score)
        logger.info(f"Basic vocab errors detected ({basic_vocab_count}) → max score capped at {max_score}")
    elif spelling_error_count > 0:
        # Spelling errors: moderate cap (only if confirmed by Gemini)
        if spelling_error_count <= 2:
            max_score = 60
        elif spelling_error_count <= 4:
            max_score = 50
        else:
            max_score = 40
        final_score = min(calculated_score, max_score)
        logger.info(f"Spelling errors detected ({spelling_error_count}) → max score capped at {max_score}")
    elif advanced_vocab_count > 0:
        # Advanced errors: moderate cap
        max_score = max(25, 100 - (advanced_vocab_count * 10))
        final_score = min(calculated_score, max_score)
        logger.info(f"Advanced vocab errors detected ({advanced_vocab_count}) → max score capped at {max_score}")
    else:
        final_score = calculated_score
        logger.info(f"No vocab errors detected → no score cap applied")
    
    final_score = max(0, min(100, final_score))
    
    # Generate feedback
    feedback_items = []
    
    if lexical_diversity < threshold * 0.8:
        feedback_items.append("⚠️ Use more varied vocabulary, avoid repetition")
    else:
        feedback_items.append("✓ Good vocabulary diversity")
    
    if sophisticated_ratio < soph_threshold * 0.7:
        feedback_items.append(f"⚠️ Try using more sophisticated vocabulary (expected {soph_threshold:.1%} for {task_level} level)")
    
    # CRITICAL: Show errors and penalize - prioritize basic errors
    if errors:
        # Show basic vocab errors first (most severe - should not happen)
        if basic_vocab_count > 0:
            feedback_items.append(f"❌ Basic vocabulary errors detected ({basic_vocab_count}) - VERY SEVERE:")
            for error in basic_vocab_errors[:3]:
                feedback_items.append(f"   • {error}")
            if basic_vocab_count > 3:
                feedback_items.append(f"   ... and {basic_vocab_count - 3} more basic vocabulary errors")
            feedback_items.append("⚠️ These are fundamental errors (wrong word, collocation) that should not occur")
        
        # Show spelling errors
        if spelling_error_count > 0:
            feedback_items.append(f"❌ Spelling errors detected ({spelling_error_count}):")
            shown = 0
            for error in errors:
                if 'spelling' in str(error).lower() or 'should be' in str(error).lower():
                    feedback_items.append(f"   • {error}")
                    shown += 1
                    if shown >= 3:
                        break
            if spelling_error_count > 3:
                feedback_items.append(f"   ... and {spelling_error_count - 3} more spelling errors")
            if spelling_error_count > 0:
                feedback_items.append(f"⚠️ Score reduced by {spelling_error_count * 10} points due to {spelling_error_count} spelling error(s)")
        
        # Show advanced vocab errors
        if advanced_vocab_count > 0:
            feedback_items.append(f"❌ Advanced vocabulary errors detected ({advanced_vocab_count}):")
            for error in advanced_vocab_errors[:3]:
                feedback_items.append(f"   • {error}")
            if advanced_vocab_count > 3:
                feedback_items.append(f"   ... and {advanced_vocab_count - 3} more advanced vocabulary errors")
        
        # Score penalty message
        if error_penalty > 0:
            penalty_msg = f"⚠️ Score reduced by {error_penalty:.0f} points due to "
            parts = []
            if basic_vocab_count > 0:
                parts.append(f"{basic_vocab_count} basic vocab (VERY SEVERE)")
            if spelling_error_count > 0:
                parts.append(f"{spelling_error_count} spelling")
            if advanced_vocab_count > 0:
                parts.append(f"{advanced_vocab_count} advanced vocab")
            penalty_msg += ", ".join(parts) + " error(s)"
            feedback_items.append(penalty_msg)
    else:
        feedback_items.append("✓ No vocabulary errors detected")
    
    suggestions = feedback_data.get('suggestions', [])
    if suggestions:
        feedback_items.extend([f"💡 {s}" for s in suggestions[:2]])
    
    return {
        "score": round(final_score / 10, 1),
        "score_100": int(final_score),
        "feedback": feedback_items,
        "range_score": range_score,
        "sophistication_score": sophistication_score,
        "accuracy_score": accuracy_score,
        "error_count": num_errors,
        "error_penalty": error_penalty
    }


def calculate_grammar_score_ielts(
    quality_assessment: Dict,
    task_level: str,
    essay: str = ""
) -> Dict:
    """
    Grammatical Range and Accuracy scoring - Based on actual errors
    Tiêu chí:
    1. Độ đa dạng (Range): Câu đơn, ghép, phức, mệnh đề quan hệ, bị động, điều kiện
    2. Độ chính xác (Accuracy): Đúng ngữ pháp, dấu câu, hòa hợp chủ-vị, thì - TRỪ ĐIỂM KHI CÓ LỖI
    """
    grammar_data = quality_assessment.get('grammar', {})
    grammar_score = grammar_data.get('score', 70)  # Base score from Gemini
    metrics = grammar_data.get('metrics', {})
    feedback_data = grammar_data.get('feedback', {})
    
    # Get errors from Gemini assessment
    errors = feedback_data.get('errors', [])
    
    logger.info("=" * 60)
    logger.info("GRAMMAR ERROR DETECTION")
    logger.info(f"Errors from Gemini: {len(errors)} errors")
    if errors:
        for i, err in enumerate(errors[:5], 1):
            logger.info(f"  {i}. {err}")
    
    # CRITICAL: Also check for spelling errors that affect grammar
    # ONLY use spelling errors from Gemini, not rule-based detection
    spelling_errors_detected = []
    # Extract spelling errors from Gemini assessment
    for error in errors:
        if 'spelling' in str(error).lower() or 'spell' in str(error).lower():
            spelling_errors_detected.append(str(error))
    
    logger.info(f"Spelling errors from Gemini (affecting grammar): {len(spelling_errors_detected)}")
    
    # Also check mechanics errors (punctuation, capitalization) from Gemini
    mechanics = quality_assessment.get('mechanics', {})
    mechanics_errors = []
    if mechanics:
        punctuation_errors = mechanics.get('punctuation_errors', [])
        capitalization_errors = mechanics.get('capitalization_errors', [])
        if punctuation_errors:
            mechanics_errors.extend([f"Punctuation: {err}" for err in punctuation_errors])
        if capitalization_errors:
            mechanics_errors.extend([f"Capitalization: {err}" for err in capitalization_errors])
        if mechanics_errors:
            errors.extend(mechanics_errors)
            logger.info(f"Added {len(mechanics_errors)} mechanics errors (punctuation/capitalization)")
    
    num_errors = len(errors)
    logger.info(f"Total grammar errors detected: {num_errors}")
    logger.info(f"Breakdown: From Gemini={len(feedback_data.get('errors', []))}, Spelling={len(spelling_errors_detected)}, Mechanics={len(mechanics_errors)}")
    logger.info("=" * 60)
    
    # Range score (0-40) - từ sentence variety
    sentence_variety = metrics.get('sentence_variety', 0.5)
    variety_thresholds = {
        'A1': 0.3, 'A2': 0.4, 'B1': 0.5, 'B2': 0.6, 'C1': 0.7, 'C2': 0.8
    }
    threshold = variety_thresholds.get(task_level, 0.6)
    range_score = min(sentence_variety / threshold, 1.0) * 40
    
    # Categorize errors into basic and advanced
    spelling_error_count = sum(1 for e in errors if 'spelling' in str(e).lower())
    mechanics_error_count = sum(1 for e in errors if 'punctuation' in str(e).lower() or 'capitalization' in str(e).lower())
    other_errors = [e for e in errors if 'spelling' not in str(e).lower() and 'punctuation' not in str(e).lower() and 'capitalization' not in str(e).lower()]
    
    # CRITICAL: Categorize grammar errors into basic and advanced
    # Basic errors: subject-verb agreement, tense, articles, plural/singular (should not happen)
    # Advanced errors: complex structures, subtle nuances
    basic_grammar_errors = []
    advanced_grammar_errors = []
    basic_keywords = ['subject-verb', 'subject verb', 'agreement', 'tense', 'article', 'a/an/the', 'plural', 'singular', 
                      'verb form', 'verb tense', 'should be', 'instead of', 'wrong form', 'incorrect form']
    
    for error in other_errors:
        error_lower = str(error).lower()
        is_basic = any(keyword in error_lower for keyword in basic_keywords)
        if is_basic:
            basic_grammar_errors.append(error)
        else:
            advanced_grammar_errors.append(error)
    
    basic_grammar_count = len(basic_grammar_errors)
    advanced_grammar_count = len(advanced_grammar_errors)
    grammar_error_count = basic_grammar_count + advanced_grammar_count
    
    logger.info("Grammar error categorization:")
    logger.info(f"  Basic errors (subject-verb, tense, articles): {basic_grammar_count} (VERY SEVERE)")
    logger.info(f"  Advanced errors (complex structures): {advanced_grammar_count}")
    logger.info(f"  Spelling errors: {spelling_error_count}")
    logger.info(f"  Mechanics errors (punctuation/capitalization): {mechanics_error_count}")
    logger.info(f"  Total: {num_errors}")
    
    # Accuracy score (0-60) - từ Gemini assessment, TRỪ ĐIỂM KHI CÓ LỖI
    # CRITICAL: Base accuracy should be lower if there are errors
    # If Gemini score is high but has errors, reduce base score
    if num_errors > 0:
        # Calculate reduction based on error types - EXTREMELY STRICT
        # Basic grammar errors: -25 each (should not happen - very severe)
        # Advanced grammar errors: -15 each
        # Spelling errors: -20 each (most severe)
        # Mechanics errors: -8 each (moderate)
        reduction = (spelling_error_count * 10) + (basic_grammar_count * 15) + (advanced_grammar_count * 10) + (mechanics_error_count * 8)
        
        if grammar_score > 80:
            # If score is high but has errors, reduce significantly
            # Basic errors are MORE SEVERE
            grammar_score = max(20, grammar_score - reduction)
            logger.info(f"Reduced base grammar score by {reduction} points (basic errors are VERY SEVERE)")
        elif grammar_score > 60:
            # If score is moderate, still reduce heavily for basic errors
            reduction_factor = 0.9 if basic_grammar_count > 0 else 0.75
            grammar_score = max(10, grammar_score - (reduction * reduction_factor))
            logger.info(f"Reduced base grammar score by {reduction * reduction_factor:.1f} points")
        else:
            # Even if score is low, still reduce for basic errors
            if basic_grammar_count > 0:
                grammar_score = max(5, grammar_score - (basic_grammar_count * 15))
                logger.info(f"Reduced base grammar score by {basic_grammar_count * 15} points (basic errors)")
    
    base_accuracy = grammar_score * 0.6
    
    # Penalty for errors - EXTREMELY STRICT PENALTY
    # Basic grammar errors: -25 points each (should not happen - very severe)
    # Advanced grammar errors: -12 to -15 points each
    # Spelling errors: -10 points each (moderate - only if confirmed by Gemini)
    # Mechanics errors: -8 points each (moderate)
    error_penalty = 0
    
    if spelling_error_count > 0:
        # Spelling errors: moderate penalty (only if confirmed by Gemini)
        error_penalty += spelling_error_count * 10
        logger.info(f"Spelling errors penalty: {spelling_error_count} × 10 = {spelling_error_count * 10}")
    
    if basic_grammar_count > 0:
        # Basic errors are VERY SEVERE - should not happen at any level
        error_penalty += basic_grammar_count * 25
        logger.info(f"Basic grammar errors penalty: {basic_grammar_count} × 25 = {basic_grammar_count * 25} (VERY SEVERE)")
    
    if advanced_grammar_count > 0:
        # Advanced errors: progressive penalty
        if advanced_grammar_count <= 2:
            error_penalty += advanced_grammar_count * 15
        elif advanced_grammar_count <= 4:
            error_penalty += 2 * 15 + (advanced_grammar_count - 2) * 18
        else:
            error_penalty += 2 * 15 + 2 * 18 + (advanced_grammar_count - 4) * 20
        logger.info(f"Advanced grammar errors penalty: {advanced_grammar_count} errors = {error_penalty - (spelling_error_count * 20) - (basic_grammar_count * 25)}")
    
    if mechanics_error_count > 0:
        # Mechanics errors: moderate penalty
        error_penalty += mechanics_error_count * 10
        logger.info(f"Mechanics errors penalty: {mechanics_error_count} × 10 = {mechanics_error_count * 10}")
    
    # Cap penalty at 60 (max accuracy score)
    error_penalty = min(error_penalty, 60)
    
    accuracy_score = max(0, base_accuracy - error_penalty)
    
    # CRITICAL: Cap score based on error severity - BALANCED
    # Basic grammar errors: cap at 50 for 1, 40 for 2, 30 for 3+
    # Spelling errors: cap at 60 for 1-2, 50 for 3-4, 40 for 5+ (only if confirmed by Gemini)
    # Advanced grammar errors: cap at 70 for 1-2, 60 for 3-4, 50 for 5+
    # Mechanics errors: cap at 75 for 1-2, 65 for 3-4, 55 for 5+
    calculated_score = range_score + accuracy_score
    
    if basic_grammar_count > 0:
        # Basic errors: moderate cap
        max_score = max(30, 70 - (basic_grammar_count * 10))
        final_score = min(calculated_score, max_score)
        logger.info(f"Basic grammar errors detected ({basic_grammar_count}) → max score capped at {max_score}")
    elif spelling_error_count > 0:
        # Spelling errors: moderate cap (only if confirmed by Gemini)
        if spelling_error_count <= 2:
            max_score = 60
        elif spelling_error_count <= 4:
            max_score = 50
        else:
            max_score = 40
        final_score = min(calculated_score, max_score)
        logger.info(f"Spelling errors detected ({spelling_error_count}) → max score capped at {max_score}")
    elif advanced_grammar_count > 0:
        # Advanced errors: moderate cap
        max_score = max(25, 100 - (advanced_grammar_count * 12))
        final_score = min(calculated_score, max_score)
        logger.info(f"Advanced grammar errors detected ({advanced_grammar_count}) → max score capped at {max_score}")
    elif mechanics_error_count > 0:
        # Mechanics errors: moderate
        max_score = max(35, 100 - (mechanics_error_count * 10))
        final_score = min(calculated_score, max_score)
        logger.info(f"Mechanics errors detected ({mechanics_error_count}) → max score capped at {max_score}")
    else:
        final_score = calculated_score
        logger.info(f"No grammar errors detected → no score cap applied")
    
    final_score = max(0, min(100, final_score))
    
    # Generate feedback
    feedback_items = []
    
    if sentence_variety < threshold * 0.7:
        feedback_items.append("⚠️ Use more varied sentence structures (simple, compound, complex)")
        feedback_items.append("💡 Try using relative clauses, passive voice, conditional sentences")
    else:
        feedback_items.append("✓ Good variety of sentence structures")
    
    # CRITICAL: Show errors and penalize - prioritize basic errors
    if errors:
        # Show basic grammar errors first (most severe - should not happen)
        if basic_grammar_count > 0:
            feedback_items.append(f"❌ Basic grammar errors detected ({basic_grammar_count}) - VERY SEVERE:")
            for error in basic_grammar_errors[:3]:
                feedback_items.append(f"   • {error}")
            if basic_grammar_count > 3:
                feedback_items.append(f"   ... and {basic_grammar_count - 3} more basic grammar errors")
            feedback_items.append("⚠️ These are fundamental errors that should not occur at any level")
        
        # Show spelling errors
        if spelling_error_count > 0:
            feedback_items.append(f"❌ Spelling errors detected ({spelling_error_count}):")
            shown = 0
            for error in errors:
                if 'spelling' in str(error).lower():
                    feedback_items.append(f"   • {error}")
                    shown += 1
                    if shown >= 3:
                        break
            if spelling_error_count > 3:
                feedback_items.append(f"   ... and {spelling_error_count - 3} more spelling errors")
            if spelling_error_count > 0:
                feedback_items.append(f"⚠️ Score reduced by {spelling_error_count * 10} points due to {spelling_error_count} spelling error(s)")
        
        # Show advanced grammar errors
        if advanced_grammar_count > 0:
            feedback_items.append(f"❌ Advanced grammar errors detected ({advanced_grammar_count}):")
            for error in advanced_grammar_errors[:3]:
                feedback_items.append(f"   • {error}")
            if advanced_grammar_count > 3:
                feedback_items.append(f"   ... and {advanced_grammar_count - 3} more advanced grammar errors")
        
        # Show mechanics errors
        if mechanics_error_count > 0:
            feedback_items.append(f"⚠️ Mechanics errors detected ({mechanics_error_count}):")
            shown = 0
            for error in errors:
                if 'punctuation' in str(error).lower() or 'capitalization' in str(error).lower():
                    feedback_items.append(f"   • {error}")
                    shown += 1
                    if shown >= 2:
                        break
        
        # Score penalty message
        if error_penalty > 0:
            penalty_msg = f"⚠️ Score reduced by {error_penalty:.0f} points due to "
            parts = []
            if basic_grammar_count > 0:
                parts.append(f"{basic_grammar_count} basic grammar (VERY SEVERE)")
            if spelling_error_count > 0:
                parts.append(f"{spelling_error_count} spelling")
            if advanced_grammar_count > 0:
                parts.append(f"{advanced_grammar_count} advanced grammar")
            if mechanics_error_count > 0:
                parts.append(f"{mechanics_error_count} mechanics")
            penalty_msg += ", ".join(parts) + " error(s)"
            feedback_items.append(penalty_msg)
    else:
        feedback_items.append("✓ No grammar errors detected")
    
    suggestions = feedback_data.get('suggestions', [])
    if suggestions:
        feedback_items.extend([f"💡 {s}" for s in suggestions[:2]])
    
    avg_length = metrics.get('avg_sentence_length', 10)
    if avg_length < 8:
        feedback_items.append("⚠️ Sentences are too short, try combining ideas")
    elif avg_length > 25:
        feedback_items.append("⚠️ Some sentences are too long, consider breaking them up")
    
    return {
        "score": round(final_score / 10, 1),
        "score_100": int(final_score),
        "feedback": feedback_items,
        "range_score": range_score,
        "accuracy_score": accuracy_score,
        "error_count": num_errors,
        "error_penalty": error_penalty
    }


def calculate_final_score_ielts(
    task_response: Dict,
    coherence: Dict,
    lexical_resource: Dict,
    grammar: Dict,
    off_topic_info: Dict
) -> Dict:
    """
    Tính điểm tổng theo IELTS 4 criteria
    Trọng số: Task Response 35%, Lexical Resource 25%, Grammar 25%, Coherence 15%
    """
    off_topic_level = off_topic_info.get('off_topic_level', 'none')
    
    # Nếu lạc đề hoàn toàn, chỉ cho điểm Task Response = 0, các phần khác vẫn chấm
    if off_topic_level == "complete":
        # Vẫn chấm các phần khác để có feedback, nhưng overall = 0
        tr_score = 0
        co_score = coherence.get('score_100', 0)
        lr_score = lexical_resource.get('score_100', 0)
        gr_score = grammar.get('score_100', 0)
        
        # Overall = 0 nếu lạc đề hoàn toàn
        overall_score_100 = 0
    else:
        # Normal scoring với trọng số
        tr_score = task_response.get('score_100', 0)
        co_score = coherence.get('score_100', 0)
        lr_score = lexical_resource.get('score_100', 0)
        gr_score = grammar.get('score_100', 0)
        
        # IELTS weights
        overall_score_100 = (
            tr_score * 0.35 +
            lr_score * 0.25 +
            gr_score * 0.25 +
            co_score * 0.15
        )
    
    # Convert to 10-point scale
    overall_score_10 = overall_score_100 / 10.0
    
    # Determine CEFR level
    if overall_score_10 >= 9.0:
        cefr_level = "C2"
        band = "Excellent"
    elif overall_score_10 >= 8.0:
        cefr_level = "C1"
        band = "Very Good"
    elif overall_score_10 >= 7.0:
        cefr_level = "B2"
        band = "Good"
    elif overall_score_10 >= 6.0:
        cefr_level = "B1"
        band = "Satisfactory"
    elif overall_score_10 >= 5.0:
        cefr_level = "A2"
        band = "Fair"
    elif overall_score_10 >= 3.0:
        cefr_level = "A1"
        band = "Basic"
    else:
        cefr_level = "Pre-A1"
        band = "Very Limited"
    
    return {
        "overall_score": round(overall_score_10, 2),
        "score_10": round(overall_score_10, 2),  # Add score_10 for compatibility
        "score_100": round(overall_score_100, 1),
        "cefr_level": cefr_level,
        "band": band,
        "detailed_scores": {
            # IELTS 4 criteria - using exact names frontend expects
            "task_response": {
                "score": round(tr_score / 10, 1),
                "score_100": tr_score,
                "feedback": task_response.get('feedback', [])
            },
            "coherence_cohesion": {  # Frontend expects coherence_cohesion, not coherence
                "score": round(co_score / 10, 1),
                "score_100": co_score,
                "feedback": coherence.get('feedback', [])
            },
            "lexical_resource": {
                "score": round(lr_score / 10, 1),
                "score_100": lr_score,
                "feedback": lexical_resource.get('feedback', [])
            },
            "grammatical_range": {  # Frontend expects grammatical_range, not grammar
                "score": round(gr_score / 10, 1),
                "score_100": gr_score,
                "feedback": grammar.get('feedback', [])
            },
            # Also include old names for backward compatibility
            "coherence": {
                "score": round(co_score / 10, 1),
                "score_100": co_score,
                "feedback": coherence.get('feedback', [])
            },
            "grammar": {
                "score": round(gr_score / 10, 1),
                "score_100": gr_score,
                "feedback": grammar.get('feedback', [])
            }
        },
        "is_off_topic": off_topic_level in ["partial", "complete"],
        "off_topic_level": off_topic_level
    }


def score_essay_hybrid(
    essay: str,
    prompt: str,
    task_level: str = "B2",
    task_type: Optional[str] = None
) -> Dict:
    """
    Main function: Hybrid scoring combining Gemini + BERT + IELTS criteria
    """
    if not MODULES_AVAILABLE:
        return {
            "error": "Scoring modules not available",
            "overall_score": 0.0
        }
    
    print(f"\n{'='*80}")
    print(f"[Hybrid Scorer] Starting hybrid scoring...")
    print(f"[Hybrid Scorer] Prompt: {prompt[:100]}...")
    print(f"[Hybrid Scorer] Level: {task_level}")
    print(f"{'='*80}\n")
    
    # Step 0: Validate text quality (non-English, random chars, etc.)
    print(f"[Hybrid Scorer] Step 0: Validating text quality...")
    try:
        from text_validator import validate_text_quality
        text_validation = validate_text_quality(essay)
        
        if not text_validation.get('is_valid', True):
            logger.warning(f"Text validation failed: {text_validation.get('issues', [])}")
            return {
                "overall_score": 0.0,
                "score_10": 0.0,
                "score_100": 0.0,
                "cefr_level": "N/A",
                "band": "Invalid",
                "detailed_scores": {
                    "task_response": {"score": 0.0, "score_100": 0, "feedback": text_validation.get('issues', [])},
                    "coherence_cohesion": {"score": 0.0, "score_100": 0, "feedback": ["Text validation failed"]},
                    "lexical_resource": {"score": 0.0, "score_100": 0, "feedback": ["Text validation failed"]},
                    "grammatical_range": {"score": 0.0, "score_100": 0, "feedback": ["Text validation failed"]}
                },
                "validation_issues": text_validation.get('issues', []),
                "is_off_topic": True,
                "off_topic_level": "complete",
                "off_topic_reason": "Text contains non-English characters or invalid content"
            }
        
        if text_validation.get('penalty_multiplier', 1.0) < 1.0:
            print(f"[Hybrid Scorer] ⚠️ Text quality issues: {text_validation.get('issues', [])}")
            print(f"[Hybrid Scorer] Penalty multiplier: {text_validation.get('penalty_multiplier', 1.0)}")
    except ImportError:
        print(f"[Hybrid Scorer] Text validator not available, skipping validation")
        text_validation = {"is_valid": True, "penalty_multiplier": 1.0, "issues": []}
    
    # Step 1: Analyze prompt
    print(f"[Hybrid Scorer] Step 1: Analyzing prompt...")
    prompt_analysis = analyze_prompt(prompt, task_level)
    if not prompt_analysis:
        return {"error": "Failed to analyze prompt", "overall_score": 0.0}
    
    # Step 2: BERT semantic similarity (cross-validation) - with detailed logging
    print(f"[Hybrid Scorer] Step 2: Calculating BERT semantic similarity...")
    logger.info("=" * 60)
    logger.info("BERT SEMANTIC SIMILARITY CALCULATION")
    logger.info("=" * 60)
    logger.info(f"Input Essay: {essay[:200]}..." if len(essay) > 200 else f"Input Essay: {essay}")
    logger.info(f"Input Prompt: {prompt}")
    semantic_similarity = calculate_semantic_similarity_bert(essay, prompt)
    if semantic_similarity:
        bert_relevance = semantic_similarity * 100
        print(f"[Hybrid Scorer] BERT similarity: {semantic_similarity:.2f} ({bert_relevance:.1f}%)")
        logger.info("=" * 60)
        logger.info("BERT SIMILARITY SUMMARY")
        logger.info(f"Raw Similarity: {semantic_similarity:.4f} (0-1 scale)")
        logger.info(f"Relevance Score: {bert_relevance:.1f}% (0-100 scale)")
        logger.info(f"Interpretation: {'High relevance' if bert_relevance > 70 else 'Moderate relevance' if bert_relevance > 50 else 'Low relevance' if bert_relevance > 30 else 'Very low relevance'}")
        logger.info("=" * 60)
    else:
        logger.warning("BERT similarity not available")
    
    # Step 3: Quick contradiction check FIRST (before Gemini to save API calls)
    logger.info("=" * 60)
    logger.info("Step 3: Quick contradiction check...")
    logger.info("=" * 60)
    
    has_contradiction = False
    contradiction_reasons = []
    if TASK_CHECKERS_AVAILABLE:
        try:
            has_contradiction, contradiction_reasons = detect_topic_contradiction(essay, prompt)
            if has_contradiction:
                logger.warning("=" * 60)
                logger.warning("⚠️ TOPIC CONTRADICTION DETECTED!")
                logger.warning(f"Reasons: {contradiction_reasons}")
                logger.warning("=" * 60)
                # Return 0 immediately if contradiction detected
                return {
                    "overall_score": 0.0,
                    "score_10": 0.0,
                    "score_100": 0.0,
                    "cefr_level": "N/A",
                    "band": "Off-topic",
                    "detailed_scores": {
                        "task_response": {"score": 0.0, "score_100": 0, "feedback": contradiction_reasons},
                        "coherence_cohesion": {"score": 0.0, "score_100": 0, "feedback": ["Cannot assess coherence for off-topic essay"]},
                        "lexical_resource": {"score": 0.0, "score_100": 0, "feedback": ["Cannot assess vocabulary for off-topic essay"]},
                        "grammatical_range": {"score": 0.0, "score_100": 0, "feedback": ["Cannot assess grammar for off-topic essay"]}
                    },
                    "is_off_topic": True,
                    "off_topic_level": "complete",
                    "off_topic_reason": "; ".join(contradiction_reasons)
                }
        except Exception as e:
            logger.warning(f"Contradiction check error: {e}")
    
    # Step 3.1: Quick keyword check for obvious off-topic (generic, no hard-coding)
    logger.info("Step 3.1: Quick keyword check for obvious off-topic...")
    topic_keywords = prompt_analysis.get('topic_keywords', [])
    main_topic = prompt_analysis.get('main_topic', '').lower()
    essay_lower = essay.lower()
    
    # Generic check: If no topic keywords found in essay at all, likely off-topic
    keyword_matches = sum(1 for keyword in topic_keywords[:10] if keyword.lower() in essay_lower)
    off_topic_indicators = []
    
    if len(topic_keywords) > 0 and keyword_matches == 0:
        logger.warning(f"Quick check: NO keyword matches found ({keyword_matches}/{len(topic_keywords[:10])})")
        logger.warning(f"Main topic: {main_topic}, Topic keywords: {topic_keywords[:5]}")
        logger.warning("Likely completely off-topic - will verify with generic detection")
        off_topic_indicators.append(f"No topic keywords found in essay (expected: {', '.join(topic_keywords[:5])})")
    
    if off_topic_indicators:
        logger.warning(f"Quick check: Potential off-topic - {off_topic_indicators[0]}")
        logger.warning("Will verify with generic detection method")
    
    # Step 3.2: Validate content (Gemini) - with detailed logging
    print(f"[Hybrid Scorer] Step 3.2: Validating content with Gemini...")
    logger.info("=" * 60)
    logger.info("GEMINI CONTENT VALIDATION")
    logger.info("=" * 60)
    logger.info(f"Input Essay: {essay[:200]}..." if len(essay) > 200 else f"Input Essay: {essay}")
    logger.info(f"Input Prompt: {prompt}")
    content_validation = validate_content(essay, prompt, prompt_analysis, task_level)
    if not content_validation:
        return {"error": "Failed to validate content", "overall_score": 0.0}
    
    # Log Gemini results in detail
    gemini_relevance = content_validation.get('overall_relevance', 100)
    gemini_on_topic = content_validation.get('is_on_topic', True)
    gemini_confidence = content_validation.get('confidence', 0.8)
    gemini_reason = content_validation.get('off_topic_reason', '')
    
    logger.info("=" * 60)
    logger.info("GEMINI VALIDATION RESULTS")
    logger.info(f"Overall Relevance: {gemini_relevance}%")
    logger.info(f"Is On-topic: {gemini_on_topic}")
    logger.info(f"Confidence: {gemini_confidence:.2f}")
    logger.info(f"Off-topic Reason: {gemini_reason}")
    logger.info(f"Topic Relevance Score: {content_validation.get('topic_relevance_score', 'N/A')}")
    logger.info(f"Addressed Elements: {content_validation.get('addressed_elements', [])}")
    logger.info(f"Missing Elements: {content_validation.get('missing_elements', [])}")
    logger.info("=" * 60)
    
    # Step 4: Generic off-topic detection (works for any prompt)
    print(f"[Hybrid Scorer] Step 4: Generic off-topic detection...")
    # Use generic detection method first
    generic_off_topic = detect_off_topic_generic(
        essay,
        prompt,
        prompt_analysis,
        semantic_similarity,
        content_validation
    )
    
    # Also use improved detection for backward compatibility
    off_topic_info = improved_off_topic_detection(
        content_validation,
        semantic_similarity,
        prompt_analysis,
        essay
    )
    
    # Use task_response_analyzer for additional validation if available
    task_response_analysis = None
    if TASK_CHECKERS_AVAILABLE:
        try:
            task_response_analysis = analyze_task_response_semantic(
                essay, prompt, task_level, task_type or "essay", use_gemini=True
            )
            if task_response_analysis:
                task_relevance = task_response_analysis.get('relevance_score', 7.0) * 10  # Convert to 0-100
                logger.info(f"Task Response Analyzer relevance: {task_relevance:.1f}%")
                
                # If task response analyzer says very low relevance (< 50), it's likely off-topic
                if task_relevance < 50:
                    logger.warning(f"Task Response Analyzer indicates low relevance ({task_relevance:.1f}%)")
                    if generic_off_topic.get('off_topic_level') != 'complete':
                        # Adjust generic detection
                        generic_off_topic['overall_relevance'] = min(generic_off_topic.get('overall_relevance', 100), task_relevance)
                        if task_relevance < 40:
                            generic_off_topic['off_topic_level'] = 'complete'
                            generic_off_topic['is_off_topic'] = True
                        elif task_relevance < 50:
                            generic_off_topic['off_topic_level'] = 'partial'
                            generic_off_topic['is_off_topic'] = True
        except Exception as e:
            logger.warning(f"Task response analyzer error: {e}")
    
    # Merge results: use the most conservative (strictest) assessment
    logger.info("=" * 60)
    logger.info("MERGING OFF-TOPIC DETECTION RESULTS")
    logger.info("=" * 60)
    logger.info(f"Generic Detection: level={generic_off_topic.get('off_topic_level')}, relevance={generic_off_topic.get('overall_relevance')}%")
    logger.info(f"Improved Detection: level={off_topic_info.get('off_topic_level')}, relevance={off_topic_info.get('overall_relevance')}%")
    
    # Check for contradictions again in merged results
    if TASK_CHECKERS_AVAILABLE:
        try:
            has_contradiction_merged, contradiction_reasons_merged = detect_topic_contradiction(essay, prompt)
            if has_contradiction_merged:
                logger.warning("=" * 60)
                logger.warning("⚠️ CONTRADICTION DETECTED IN MERGE - FORCING COMPLETE OFF-TOPIC")
                logger.warning(f"Reasons: {contradiction_reasons_merged}")
                logger.warning("=" * 60)
                off_topic_info = {
                    **off_topic_info,
                    'off_topic_level': 'complete',
                    'overall_relevance': 15,
                    'off_topic_reason': "; ".join(contradiction_reasons_merged),
                    'is_off_topic': True
                }
        except Exception as e:
            logger.warning(f"Contradiction check in merge error: {e}")
    
    if generic_off_topic.get('off_topic_level') == 'complete' and off_topic_info.get('off_topic_level') != 'complete':
        logger.warning("Generic detection found complete off-topic, overriding improved detection")
        off_topic_info = {
            **off_topic_info,
            'off_topic_level': 'complete',
            'overall_relevance': generic_off_topic.get('overall_relevance', 15),
            'off_topic_reason': generic_off_topic.get('off_topic_reason', 'Essay does not address the prompt topic'),
            'is_off_topic': True
        }
    elif generic_off_topic.get('overall_relevance', 100) < off_topic_info.get('overall_relevance', 100):
        # Use lower relevance from generic detection
        off_topic_info['overall_relevance'] = generic_off_topic.get('overall_relevance', 100)
        if generic_off_topic.get('off_topic_level') in ['complete', 'partial']:
            off_topic_info['off_topic_level'] = generic_off_topic.get('off_topic_level')
            off_topic_info['off_topic_reason'] = generic_off_topic.get('off_topic_reason', off_topic_info.get('off_topic_reason', ''))
    
    logger.info(f"Final Merged Result: level={off_topic_info.get('off_topic_level')}, relevance={off_topic_info.get('overall_relevance')}%")
    logger.info("=" * 60)
    print(f"[Hybrid Scorer] Off-topic level: {off_topic_info['off_topic_level']}, Relevance: {off_topic_info['overall_relevance']}%")
    
    # CRITICAL: If completely off-topic OR relevance < 50, return 0 score immediately
    final_relevance = off_topic_info.get('overall_relevance', 100)
    final_off_topic_level = off_topic_info.get('off_topic_level', 'none')
    
    # STRICTER: Also check if relevance is very low (< 50) even if not marked as complete
    if final_off_topic_level == 'complete' or final_relevance < 50:
        if final_relevance < 50 and final_off_topic_level != 'complete':
            logger.warning("=" * 60)
            logger.warning(f"⚠️ Relevance too low ({final_relevance:.1f}% < 50%) - treating as complete off-topic")
            logger.warning("=" * 60)
            final_off_topic_level = 'complete'
            off_topic_info['off_topic_level'] = 'complete'
            off_topic_info['is_off_topic'] = True
        
        logger.warning("=" * 60)
        logger.warning("Essay is completely off-topic - returning 0 score immediately")
        logger.warning(f"Relevance: {final_relevance}%")
        logger.warning(f"Reason: {off_topic_info.get('off_topic_reason', 'N/A')}")
        logger.warning("=" * 60)
        return {
            "overall_score": 0.0,
            "score_10": 0.0,
            "score_100": 0.0,
            "cefr_level": "N/A",
            "band": "Off-topic",
            "detailed_scores": {
                "task_response": {"score": 0.0, "score_100": 0, "feedback": [off_topic_info.get('off_topic_reason', 'Essay does not address the prompt')]},
                "coherence_cohesion": {"score": 0.0, "score_100": 0, "feedback": ["Cannot assess coherence for off-topic essay"]},
                "lexical_resource": {"score": 0.0, "score_100": 0, "feedback": ["Cannot assess vocabulary for off-topic essay"]},
                "grammatical_range": {"score": 0.0, "score_100": 0, "feedback": ["Cannot assess grammar for off-topic essay"]}
            },
            "is_off_topic": True,
            "off_topic_level": final_off_topic_level,
            "off_topic_reason": off_topic_info.get('off_topic_reason', f'Essay relevance too low ({final_relevance:.1f}%) - does not address the prompt topic')
        }
    
    # Step 5: Word count check
    print(f"[Hybrid Scorer] Step 5: Checking word count...")
    word_count_result = calculate_word_count_score(essay, prompt_analysis.get('word_count', {}))
    
    # Step 6: Assess quality (Gemini + metrics)
    print(f"[Hybrid Scorer] Step 6: Assessing writing quality...")
    quality_assessment = assess_quality(essay, task_level)
    if not quality_assessment:
        return {"error": "Failed to assess quality", "overall_score": 0.0}
    
    # Step 7: Calculate IELTS 4 criteria scores
    print(f"\n[HYBRID_SCORER] ========== IELTS 4 CRITERIA SCORING ==========")
    print(f"[HYBRID_SCORER] Step 7: Calculating IELTS 4 criteria scores...")
    
    print(f"[HYBRID_SCORER] 7.1. Task Response...")
    # CRITICAL: Check off-topic level before calculating Task Response
    # STRICTER: Return 0 if complete off-topic OR relevance < 50
    task_relevance = off_topic_info.get('overall_relevance', 100)
    task_off_topic_level = off_topic_info.get('off_topic_level', 'none')
    
    if (task_off_topic_level == 'complete' or task_relevance < 50):
        logger.warning(f"Task Response: Complete off-topic detected (level={task_off_topic_level}, relevance={task_relevance:.1f}%) - returning 0")
        task_response = {
            "score": 0.0,
            "score_100": 0,
            "feedback": [off_topic_info.get('off_topic_reason', 'Essay does not address the prompt topic')],
            "addressed_elements": [],
            "missing_elements": [],
            "off_topic_level": "complete"
        }
    else:
        # Use task_response_analyzer if available for better scoring
        if TASK_CHECKERS_AVAILABLE and task_response_analysis:
            try:
                task_relevance_score = task_response_analysis.get('relevance_score', 7.0)
                task_coverage_score = task_response_analysis.get('coverage_score', 7.0)
                
                # Convert to 0-100 scale
                task_response_score_100 = (task_relevance_score * 0.6 + task_coverage_score * 0.4) * 10
                
                logger.info(f"Task Response Analyzer: relevance={task_relevance_score:.1f}, coverage={task_coverage_score:.1f}")
                logger.info(f"Task Response Analyzer score (100): {task_response_score_100:.1f}")
                
                # Calculate IELTS score normally
                task_response = calculate_task_response_score_ielts(
                    content_validation,
                    word_count_result,
                    prompt_analysis,
                    off_topic_info
                )
                
                # If task response analyzer gives higher score, use it (more generous)
                # Blend: 50% IELTS, 50% analyzer (tăng weight của analyzer)
                if task_response_score_100 > task_response.get('score_100', 0):
                    logger.info(f"Task Response Analyzer gives higher score ({task_response_score_100:.1f} vs {task_response.get('score_100', 0)}) → Using higher score")
                    blended_score = task_response.get('score_100', 0) * 0.5 + task_response_score_100 * 0.5
                else:
                    # If IELTS is higher, still blend but favor IELTS
                    blended_score = task_response.get('score_100', 0) * 0.6 + task_response_score_100 * 0.4
                
                task_response['score_100'] = int(blended_score)
                task_response['score'] = round(blended_score / 10, 1)
                
                # Add feedback from task response analyzer
                analyzer_feedback = task_response_analysis.get('feedback', [])
                analyzer_strengths = task_response_analysis.get('strengths', [])
                if analyzer_feedback:
                    task_response['feedback'] = task_response.get('feedback', []) + analyzer_feedback[:2]
                if analyzer_strengths:
                    task_response['feedback'] = task_response.get('feedback', []) + [f"✓ {s}" for s in analyzer_strengths[:2]]
            except Exception as e:
                logger.warning(f"Error using task response analyzer: {e}")
                task_response = calculate_task_response_score_ielts(
                    content_validation,
                    word_count_result,
                    prompt_analysis,
                    off_topic_info
                )
        else:
            task_response = calculate_task_response_score_ielts(
                content_validation,
                word_count_result,
                prompt_analysis,
                off_topic_info
            )
    print(f"[HYBRID_SCORER]    Task Response score: {task_response.get('score_100', 0)}/100")
    
    print(f"[HYBRID_SCORER] 7.2. Coherence & Cohesion...")
    coherence = calculate_coherence_score_ielts(quality_assessment, essay, prompt_analysis)
    print(f"[HYBRID_SCORER]    Coherence score: {coherence.get('score_100', 0)}/100")
    
    print(f"[HYBRID_SCORER] 7.3. Lexical Resource...")
    lexical_resource = calculate_lexical_resource_score_ielts(quality_assessment, task_level, essay)
    print(f"[HYBRID_SCORER]    Lexical Resource score: {lexical_resource.get('score_100', 0)}/100")
    
    print(f"[HYBRID_SCORER] 7.4. Grammatical Range & Accuracy...")
    grammar = calculate_grammar_score_ielts(quality_assessment, task_level, essay)
    print(f"[HYBRID_SCORER]    Grammar score: {grammar.get('score_100', 0)}/100")
    
    print(f"[HYBRID_SCORER] Summary of IELTS 4 criteria:")
    print(f"  - Task Response: {task_response.get('score_100', 0)}/100 (weight: 35%)")
    print(f"  - Lexical Resource: {lexical_resource.get('score_100', 0)}/100 (weight: 25%)")
    print(f"  - Grammar: {grammar.get('score_100', 0)}/100 (weight: 25%)")
    print(f"  - Coherence: {coherence.get('score_100', 0)}/100 (weight: 15%)")
    print(f"[HYBRID_SCORER] ===============================================\n")
    
    # Step 8: Apply text validation penalty
    text_penalty = text_validation.get('penalty_multiplier', 1.0)
    if text_penalty < 1.0:
        print(f"[HYBRID_SCORER] Applying text quality penalty: {text_penalty}")
        # Apply penalty to all scores
        task_response['score_100'] = int(task_response.get('score_100', 0) * text_penalty)
        coherence['score_100'] = int(coherence.get('score_100', 0) * text_penalty)
        lexical_resource['score_100'] = int(lexical_resource.get('score_100', 0) * text_penalty)
        grammar['score_100'] = int(grammar.get('score_100', 0) * text_penalty)
        if text_validation.get('issues'):
            # Add validation issues to feedback
            for issue in text_validation.get('issues', []):
                task_response['feedback'].append(f"⚠️ {issue}")
    
    # Step 9: Calculate final score
    print(f"[HYBRID_SCORER] ========== FINAL SCORE CALCULATION ==========")
    print(f"[HYBRID_SCORER] Step 9: Calculating final weighted score...")
    final_result = calculate_final_score_ielts(
        task_response,
        coherence,
        lexical_resource,
        grammar,
        off_topic_info
    )
    print(f"[HYBRID_SCORER] Final overall score: {final_result.get('overall_score', 0)}/10")
    print(f"[HYBRID_SCORER] Final score (100 scale): {final_result.get('score_100', 0)}/100")
    print(f"[HYBRID_SCORER] CEFR Level: {final_result.get('cefr_level', 'N/A')}")
    print(f"[HYBRID_SCORER] Band: {final_result.get('band', 'N/A')}")
    print(f"[HYBRID_SCORER] =============================================\n")
    
    print(f"\n{'='*80}")
    print(f"[Hybrid Scorer] ✓ Scoring complete!")
    print(f"[Hybrid Scorer] Overall Score: {final_result['overall_score']}/10")
    print(f"[Hybrid Scorer] CEFR Level: {final_result['cefr_level']}")
    print(f"[Hybrid Scorer] Off-topic: {final_result['is_off_topic']} ({off_topic_info['off_topic_level']})")
    print(f"{'='*80}\n")
    
    # Compile full result
    return {
        **final_result,
        "word_count": word_count_result['word_count'],
        "target_word_count": prompt_analysis['word_count'],
        "prompt_analysis": {
            "task_type": prompt_analysis.get('task_type'),
            "main_topic": prompt_analysis.get('main_topic'),
            "source": prompt_analysis.get('source')
        },
        "content_validation": {
            "on_topic": off_topic_info['is_on_topic'],
            "relevance": off_topic_info['overall_relevance'],
            "off_topic_level": off_topic_info['off_topic_level'],
            "addressed_elements": content_validation.get('addressed_elements', []),
            "missing_elements": content_validation.get('missing_elements', [])
        },
        "cross_validation": {
            "gemini_relevance": off_topic_info.get('gemini_relevance'),
            "bert_similarity": off_topic_info.get('bert_similarity'),
            "bert_relevance": off_topic_info.get('bert_relevance')
        },
        "scoring_method": "hybrid_v3_ielts",
        "scoring_system": "ielts_4_criteria",  # Add for frontend detection
        "scoring_weights": {
            "task_response": 0.35,
            "lexical_resource": 0.25,
            "grammar": 0.25,
            "coherence": 0.15
        }
    }

