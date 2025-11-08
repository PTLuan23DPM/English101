"""
Model Loader for IELTS Writing Scorer
Supports multiple model types: Traditional, BERT (different encoders), BERT Multi-task, BERT PRO
"""

import pickle
import numpy as np
from pathlib import Path
from typing import Dict, Optional, Tuple
from tensorflow import keras

try:
    import sentence_transformers
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False
    print("[WARNING] sentence-transformers not available. Install with: pip install sentence-transformers")

try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False


class ModelLoader:
    """Load and manage different types of IELTS scoring models"""
    
    def __init__(self, models_dir: Path):
        self.models_dir = Path(models_dir)
        self.models = {}
        
    def load_traditional_model(self, model_path: Path, scaler_path: Path, vectorizer_path: Path) -> Dict:
        """Load traditional feature-based model"""
        try:
            model = keras.models.load_model(str(model_path))
            scaler = None
            vectorizer = None
            
            if scaler_path.exists():
                with open(scaler_path, 'rb') as f:
                    scaler = pickle.load(f)
            
            if vectorizer_path.exists():
                with open(vectorizer_path, 'rb') as f:
                    vectorizer = pickle.load(f)
            
            return {
                'type': 'traditional',
                'model': model,
                'scaler': scaler,
                'vectorizer': vectorizer,
                'loaded': True
            }
        except Exception as e:
            print(f"Failed to load traditional model: {e}")
            return {'type': 'traditional', 'loaded': False, 'error': str(e)}
    
    def load_bert_model_sentence_transformer(
        self, 
        model_path: Path, 
        scaler_path: Optional[Path] = None,
        encoder_name: Optional[str] = None
    ) -> Dict:
        """Load BERT model using sentence transformers"""
        if not SENTENCE_TRANSFORMERS_AVAILABLE:
            return {'type': 'bert_sentence_transformer', 'loaded': False, 'error': 'sentence-transformers not installed'}
        
        try:
            # Load encoder name from file if provided
            if encoder_name is None:
                encoder_file = model_path.parent / 'bert_encoder_name.txt'
                if encoder_file.exists():
                    with open(encoder_file, 'r') as f:
                        encoder_name = f.read().strip()
                else:
                    encoder_name = 'all-MiniLM-L6-v2'  # Default
            
            # Load sentence transformer model
            encoder = sentence_transformers.SentenceTransformer(encoder_name)
            
            # Load Keras model
            model = keras.models.load_model(str(model_path))
            
            # Load scaler if available
            scaler = None
            if scaler_path and scaler_path.exists():
                with open(scaler_path, 'rb') as f:
                    scaler = pickle.load(f)
            
            return {
                'type': 'bert_sentence_transformer',
                'model': model,
                'encoder': encoder,
                'encoder_name': encoder_name,
                'scaler': scaler,
                'loaded': True
            }
        except Exception as e:
            print(f"Failed to load BERT sentence transformer model: {e}")
            return {'type': 'bert_sentence_transformer', 'loaded': False, 'error': str(e)}
    
    def load_bert_multi_model(
        self,
        model_path: Path,
        scaler_path: Optional[Path] = None,
        encoder_name: Optional[str] = None
    ) -> Dict:
        """Load BERT multi-task fine-tuned model"""
        if not SENTENCE_TRANSFORMERS_AVAILABLE:
            return {'type': 'bert_multi_task', 'loaded': False, 'error': 'sentence-transformers not installed'}
        
        try:
            # Load encoder name from file if provided
            if encoder_name is None:
                encoder_file = model_path.parent / 'encoder.txt'
                if encoder_file.exists():
                    with open(encoder_file, 'r') as f:
                        encoder_name = f.read().strip()
                else:
                    encoder_name = 'paraphrase-mpnet-base-v2'  # Default
            
            # Load sentence transformer model
            encoder = sentence_transformers.SentenceTransformer(encoder_name)
            
            # Load Keras model
            model = keras.models.load_model(str(model_path))
            
            # Load scaler if available
            scaler = None
            if scaler_path and scaler_path.exists():
                with open(scaler_path, 'rb') as f:
                    scaler = pickle.load(f)
            
            return {
                'type': 'bert_multi_task',
                'model': model,
                'encoder': encoder,
                'encoder_name': encoder_name,
                'scaler': scaler,
                'loaded': True
            }
        except Exception as e:
            print(f"Failed to load BERT multi-task model: {e}")
            return {'type': 'bert_multi_task', 'loaded': False, 'error': str(e)}
    
    def load_bert_pro_model(self, model_path: Path) -> Dict:
        """Load BERT PRO model (may use different architecture)"""
        try:
            # Try to load as Keras model
            model = keras.models.load_model(str(model_path))
            
            return {
                'type': 'bert_pro',
                'model': model,
                'loaded': True
            }
        except Exception as e:
            print(f"Failed to load BERT PRO model: {e}")
            return {'type': 'bert_pro', 'loaded': False, 'error': str(e)}
    
    def predict_traditional(self, model_info: Dict, text: str, extract_features_func) -> float:
        """Predict using traditional model"""
        if not model_info.get('loaded'):
            raise ValueError("Model not loaded")
        
        # Extract features
        features = extract_features_func(text)
        
        # Scale if scaler available
        if model_info.get('scaler') is not None:
            features = model_info['scaler'].transform(features)
        
        # Predict
        prediction = model_info['model'].predict(features, verbose=0)
        
        # Handle different prediction shapes
        if isinstance(prediction, np.ndarray):
            if prediction.ndim > 1:
                score = float(prediction[0][0] if len(prediction[0]) > 0 else prediction[0])
            else:
                score = float(prediction[0])
        else:
            score = float(prediction)
        
        return max(0, min(9, score))
    
    def predict_bert_sentence_transformer(self, model_info: Dict, text: str) -> float:
        """Predict using BERT sentence transformer model"""
        if not model_info.get('loaded'):
            raise ValueError("Model not loaded")
        
        # Get embeddings from sentence transformer
        encoder = model_info['encoder']
        embedding = encoder.encode([text], convert_to_numpy=True)[0]
        
        # Reshape for model input
        embedding = np.expand_dims(embedding, axis=0)
        
        # Scale if scaler available
        if model_info.get('scaler') is not None:
            embedding = model_info['scaler'].transform(embedding)
        
        # Predict
        prediction = model_info['model'].predict(embedding, verbose=0)
        
        # Handle prediction
        if isinstance(prediction, np.ndarray):
            if prediction.ndim > 1:
                score = float(prediction[0][0] if len(prediction[0]) > 0 else prediction[0])
            else:
                score = float(prediction[0])
        else:
            score = float(prediction)
        
        return max(0, min(9, score))
    
    def predict_bert_multi_task(self, model_info: Dict, text: str) -> float:
        """Predict using BERT multi-task model"""
        # Similar to sentence transformer but may have different output
        return self.predict_bert_sentence_transformer(model_info, text)
    
    def predict_bert_pro(self, model_info: Dict, text: str) -> float:
        """Predict using BERT PRO model"""
        if not model_info.get('loaded'):
            raise ValueError("Model not loaded")
        
        if not SENTENCE_TRANSFORMERS_AVAILABLE:
            raise ValueError("sentence-transformers not available for BERT PRO")
        
        # BERT PRO may have different input format
        # This is a placeholder - adjust based on actual model architecture
        model = model_info['model']
        
        # Try to infer input shape from model
        try:
            input_shape = model.input_shape
        except:
            input_shape = None
        
        # For now, assume similar to sentence transformer
        # You may need to adjust based on actual model
        try:
            # Try with sentence transformer first
            encoder_name = 'all-MiniLM-L6-v2'  # Default
            encoder = sentence_transformers.SentenceTransformer(encoder_name)
            embedding = encoder.encode([text], convert_to_numpy=True)[0]
            embedding = np.expand_dims(embedding, axis=0)
            
            prediction = model.predict(embedding, verbose=0)
            
            if isinstance(prediction, np.ndarray):
                if prediction.ndim > 1:
                    score = float(prediction[0][0] if len(prediction[0]) > 0 else prediction[0])
                else:
                    score = float(prediction[0])
            else:
                score = float(prediction)
            
            return max(0, min(9, score))
        except Exception as e:
            print(f"BERT PRO prediction error: {e}")
            raise


def load_all_models(models_base_dir: Path) -> Tuple[Dict[str, Dict], ModelLoader]:
    """
    Load all available models from the models directory
    Returns: (dictionary with model names as keys, ModelLoader instance)
    """
    loader = ModelLoader(models_base_dir)
    models = {}
    
    models_dir = models_base_dir / 'models'
    
    # 1. Traditional Model
    traditional_dir = models_dir / 'IELTS_Model'
    if traditional_dir.exists():
        model_path = traditional_dir / 'essay_model.keras'
        scaler_path = traditional_dir / 'scaler.pkl'
        vectorizer_path = traditional_dir / 'vectorizer.pkl'
        
        if model_path.exists():
            models['traditional'] = loader.load_traditional_model(
                model_path, scaler_path, vectorizer_path
            )
            print(f"[OK] Traditional model loaded from {traditional_dir}")
    
    # 2. BERT Model (all-MiniLM-L6-v2)
    bert_dir = models_dir / 'IELTS_Model_BERT'
    if bert_dir.exists():
        model_path = bert_dir / 'bert_essay_model.keras'
        scaler_path = bert_dir / 'bert_scaler.pkl'
        
        if model_path.exists():
            models['bert'] = loader.load_bert_model_sentence_transformer(
                model_path, scaler_path
            )
            print(f"[OK] BERT model loaded from {bert_dir}")
    
    # 3. BERT Multi-task Fine-tuned
    bert_multi_dir = models_dir / 'IELTS_Model_BERT_Multi_Fine'
    if bert_multi_dir.exists():
        model_path = bert_multi_dir / 'bert_multi_finetuned.keras'
        scaler_path = bert_multi_dir / 'scaler.pkl'
        
        if model_path.exists():
            models['bert_multi'] = loader.load_bert_multi_model(
                model_path, scaler_path
            )
            print(f"[OK] BERT Multi-task model loaded from {bert_multi_dir}")
    
    # 4. BERT PRO
    bert_pro_dir = models_dir / 'IELTS_Model_BERT_PRO'
    if bert_pro_dir.exists():
        model_path = bert_pro_dir / 'bert_essay_pro.keras'
        
        if model_path.exists():
            models['bert_pro'] = loader.load_bert_pro_model(model_path)
            print(f"[OK] BERT PRO model loaded from {bert_pro_dir}")
    
    return models, loader

