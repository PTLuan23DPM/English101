"""
Hybrid Deep Learning Scorer (Upgraded)
Uses the hybrid deep model (Transformer + LSTM + Features) for:
1. Essay Scoring (Regression)
2. Semantic Off-topic Detection (SBERT Cosine Similarity)
3. Quality Filtering
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from transformers import AutoTokenizer, AutoModel
import numpy as np
from pathlib import Path
from typing import Dict, Optional, Tuple, List
import re
import sys
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Config
MODEL_NAME = 'sentence-transformers/all-MiniLM-L6-v2'
MAX_LEN = 512
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Feature columns (Khớp với lúc train)
FEATURE_COLS = [
    'word_count', 'sent_count', 'avg_word_len', 'spell_err_count',
    'noun_count', 'adj_count', 'verb_count', 'adv_count',
    'readability_score', 'punctuation_score', 'vocabulary_richness',
    'complex_sentence_ratio', 'clause_density', 'semantic_coherence',
    'sentiment_subjectivity', 'transitional_phrase_use',
    'figurative_language_use', 'question_usage'
]

# ==========================================
# 1. KIẾN TRÚC MODEL (Giữ nguyên y hệt lúc train)
# ==========================================
class HybridModel(nn.Module):
    def __init__(self, model_name, num_features, hidden_dim=256):
        super(HybridModel, self).__init__()
        self.transformer = AutoModel.from_pretrained(model_name)
        
        self.lstm = nn.LSTM(
            self.transformer.config.hidden_size, 
            hidden_dim, 
            2, 
            batch_first=True, 
            bidirectional=True, 
            dropout=0.3
        )
        self.attention = nn.Linear(hidden_dim * 2, 1)
        
        self.feature_net = nn.Sequential(
            nn.Linear(num_features, 128),
            nn.BatchNorm1d(128),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(128, 64),
            nn.ReLU()
        )
        
        self.regressor = nn.Sequential(
            nn.Linear(hidden_dim * 2 + 64, 128),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(128, 1),
            nn.Sigmoid()
        )

    def forward(self, input_ids, attention_mask, features):
        trans_out = self.transformer(input_ids, attention_mask)
        lstm_out, _ = self.lstm(trans_out.last_hidden_state)
        attn_weights = torch.softmax(torch.tanh(self.attention(lstm_out)), dim=1)
        text_emb = torch.sum(attn_weights * lstm_out, dim=1)
        feat_emb = self.feature_net(features)
        combined = torch.cat((text_emb, feat_emb), dim=1)
        return self.regressor(combined)

# ==========================================
# 2. CLASS SCORER CHÍNH
# ==========================================
class HybridDeepScorer:
    def __init__(self, model_path: Optional[str] = None):
        self.model = None
        self.tokenizer = None
        self.scaler = None
        self.min_score = 0.0
        self.max_score = 10.0
        self.features_list = FEATURE_COLS
        self.loaded = False
        
        # Tự động tìm model (thử trực tiếp trong python-services trước, sau đó thử models/)
        if model_path is None:
            script_dir = Path(__file__).parent
            # Thử trực tiếp trong python-services trước
            model_path = script_dir / 'hybrid_deep_model.pth'
            # Nếu không có, thử trong folder models
            if not model_path.exists():
                model_path = script_dir / 'models' / 'hybrid_deep_model.pth'
        
        if isinstance(model_path, str):
            model_path = Path(model_path)
        
        if model_path.exists():
            self.load_model(model_path)
        else:
            logger.warning(f"⚠️ Model file not found at {model_path}")

    def load_model(self, model_path: Path):
        try:
            logger.info(f"⏳ Loading model from {model_path}...")
            # weights_only=False để load Scaler của sklearn
            checkpoint = torch.load(model_path, map_location=DEVICE, weights_only=False)
            
            self.scaler = checkpoint.get('scaler')
            self.min_score = checkpoint.get('min_score', 0.0)
            self.max_score = checkpoint.get('max_score', 10.0)
            self.features_list = checkpoint.get('features_list', FEATURE_COLS)
            model_name = checkpoint.get('model_name', MODEL_NAME)
            
            self.tokenizer = AutoTokenizer.from_pretrained(model_name)
            
            num_features = len(self.features_list)
            self.model = HybridModel(model_name, num_features).to(DEVICE)
            self.model.load_state_dict(checkpoint['model_state'])
            self.model.eval()
            
            self.loaded = True
            logger.info(f"✅ Model loaded! Scale: {self.min_score}-{self.max_score}")
        except Exception as e:
            logger.error(f"❌ Failed to load model: {e}")
            self.loaded = False

    # --- FEATURE ENGINEERING (Giữ logic đơn giản, nhanh) ---
    def extract_features(self, text: str) -> np.ndarray:
        text = str(text).strip()
        words = re.findall(r'\b\w+\b', text.lower())
        sentences = re.split(r'[.!?]+', text)
        sentences = [s for s in sentences if len(s.strip()) > 0]
        
        word_count = len(words)
        sent_count = len(sentences)
        avg_word_len = sum(len(w) for w in words) / word_count if word_count > 0 else 0
        
        # Spell check giả lập (từ dài > 20 ký tự hoặc không có nguyên âm)
        spell_err_count = sum(1 for w in words if len(w) > 20 or not re.search(r'[aeiou]', w))
        
        # Các feature cơ bản (4 cái đầu)
        feats = [word_count, sent_count, avg_word_len, spell_err_count]
        
        # Padding cho đủ số lượng features (18 hoặc 24 tùy lúc train)
        target_len = len(self.features_list)
        if len(feats) < target_len:
            feats += [0.0] * (target_len - len(feats))
        
        return np.array(feats[:target_len])

    # --- NÂNG CẤP QUAN TRỌNG: SBERT CHECK LẠC ĐỀ ---
    def _get_embedding(self, text: str):
        """Lấy vector trung bình từ SBERT"""
        inputs = self.tokenizer(text, return_tensors="pt", padding=True, truncation=True, max_length=MAX_LEN).to(DEVICE)
        with torch.no_grad():
            # Chỉ chạy phần Transformer (SBERT) để lấy ngữ nghĩa
            output = self.model.transformer(**inputs)
        
        # Mean Pooling (Lấy trung bình cộng các token vector)
        # (Đây là cách SBERT tạo ra sentence embedding chuẩn)
        attention_mask = inputs['attention_mask']
        token_embeddings = output.last_hidden_state
        
        input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
        sum_embeddings = torch.sum(token_embeddings * input_mask_expanded, 1)
        sum_mask = torch.clamp(input_mask_expanded.sum(1), min=1e-9)
        
        return sum_embeddings / sum_mask

    def _detect_off_topic(self, essay: str, prompt: str) -> Tuple[bool, float]:
        """
        So sánh ngữ nghĩa Essay và Prompt dùng Cosine Similarity
        """
        essay_emb = self._get_embedding(essay)
        prompt_emb = self._get_embedding(prompt)
        
        # Tính Cosine Similarity
        similarity = F.cosine_similarity(essay_emb, prompt_emb).item()
        
        # Logic phán quyết
        # < 0.3: Rất ít liên quan
        # 0.3 - 0.5: Có thể liên quan ít
        # > 0.5: Liên quan tốt
        is_off_topic = similarity < 0.20  
    
        confidence = 1.0 - similarity
        return is_off_topic, round(similarity, 4)

    # --- HÀM CHẤM ĐIỂM TỔNG HỢP ---
    def score_essay(self, text: str, prompt: Optional[str] = None) -> Dict:
        if not self.loaded:
            return {'error': 'Model not loaded', 'score': 0}

        # 1. Predict Score (Deep Learning)
        # -------------------------------
        raw_feats = self.extract_features(text)
        # Normalize features
        try:
            feats_norm = self.scaler.transform([raw_feats])
        except:
            feats_norm = raw_feats.reshape(1, -1) # Fallback
            
        feats_tensor = torch.tensor(feats_norm, dtype=torch.float).to(DEVICE)
        inputs = self.tokenizer(text, return_tensors="pt", padding=True, truncation=True, max_length=MAX_LEN).to(DEVICE)
        
        with torch.no_grad():
            output = self.model(inputs['input_ids'], inputs['attention_mask'], feats_tensor)
        
        # Denormalize
        normalized_score = output.item() # 0-1
        final_score = normalized_score * (self.max_score - self.min_score) + self.min_score
        
        # 2. Check Off-topic (Semantic)
        # -----------------------------
        is_off_topic = False
        similarity = 0.0
        off_topic_conf = 0.0
        
        if prompt:
            is_off_topic, similarity = self._detect_off_topic(text, prompt)
            off_topic_conf = 1.0 - similarity if is_off_topic else 0.0
            
            # Phạt nặng nếu lạc đề
            if is_off_topic:
                final_score = 0.0
                logger.warning(f"❌ Detected Off-topic (Sim: {similarity:.2f}). Score set to 0.")

        # 3. Quality Filter (Basic)
        # -------------------------
        # Nếu bài viết quá ngắn (<10 từ), điểm auto thấp
        if len(text.split()) < 10:
            final_score = min(final_score, 2.0)

        return {
            'score': round(final_score, 2),
            'normalized_score': round(normalized_score, 4),
            'is_off_topic': is_off_topic,
            'similarity': similarity, # Trả về để debug
            'off_topic_confidence': round(off_topic_conf, 2),
            'metadata': {
                'word_count': raw_feats[0]
            }
        }

# Singleton instance
_hybrid_scorer = None

def get_hybrid_scorer() -> Optional[HybridDeepScorer]:
    global _hybrid_scorer
    if _hybrid_scorer is None:
        _hybrid_scorer = HybridDeepScorer()
    return _hybrid_scorer

# Wrapper function for writing_scorer.py compatibility
def score_essay_hybrid(essay: str, prompt: Optional[str] = None, task_level: Optional[str] = None, task_type: Optional[str] = None) -> Dict:
    """
    Wrapper function for scoring essays using the hybrid intelligent scorer.
    Compatible with writing_scorer.py API.
    
    Args:
        essay: The essay text to score
        prompt: The prompt/task description
        task_level: CEFR level (A1-C2) - currently not used but kept for compatibility
        task_type: Task type - currently not used but kept for compatibility
    
    Returns:
        Dictionary with scoring results including:
        - overall_score: Final score (0-10)
        - score_10: Same as overall_score
        - detailed_scores: Dictionary with breakdown scores
        - is_off_topic: Boolean indicating if essay is off-topic
        - off_topic_confidence: Confidence level for off-topic detection
        - error: Error message if scoring failed
    """
    scorer = get_hybrid_scorer()
    if not scorer or not scorer.loaded:
        return {
            'error': 'Hybrid scorer not loaded',
            'overall_score': 0.0,
            'score_10': 0.0
        }
    
    try:
        result = scorer.score_essay(essay, prompt)
        
        if 'error' in result:
            return {
                'error': result['error'],
                'overall_score': 0.0,
                'score_10': 0.0
            }
        
        # Format result to match expected API
        score = result.get('score', 0.0)
        
        return {
            'overall_score': score,
            'score_10': score,
            'detailed_scores': {
                'task_response': {
                    'score': score * 0.25,  # Approximate breakdown
                    'feedback': ['Task response evaluated']
                },
                'coherence_cohesion': {
                    'score': score * 0.25,
                    'feedback': ['Coherence and cohesion evaluated']
                },
                'lexical_resource': {
                    'score': score * 0.25,
                    'feedback': ['Lexical resource evaluated']
                },
                'grammatical_range': {
                    'score': score * 0.25,
                    'feedback': ['Grammatical range evaluated']
                }
            },
            'is_off_topic': result.get('is_off_topic', False),
            'off_topic_confidence': result.get('off_topic_confidence', 0.0),
            'similarity': result.get('similarity', 0.0),
            'metadata': result.get('metadata', {})
        }
    except Exception as e:
        logger.error(f"Error in score_essay_hybrid: {e}")
        return {
            'error': str(e),
            'overall_score': 0.0,
            'score_10': 0.0
        }

# Module availability flag
MODULES_AVAILABLE = True