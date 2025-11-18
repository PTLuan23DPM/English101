"""
BERT-based IELTS Writing Assessor with Question Awareness
Original model implementation for essay scoring using BERT embeddings
"""

import pandas as pd
import numpy as np
import pickle
from pathlib import Path
from typing import Dict, Tuple, Optional
import logging
import os
from datetime import datetime
import requests
from textwrap import dedent

# Setup logging
log_dir = Path(__file__).parent / "logs"
log_dir.mkdir(exist_ok=True)

log_file = log_dir / f"ml_assess_{datetime.now().strftime('%Y%m%d')}.log"
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [%(levelname)s] - %(message)s',
    handlers=[
        logging.FileHandler(log_file, encoding='utf-8'),
        logging.StreamHandler()  # Also print to console
    ]
)
logger = logging.getLogger(__name__)

MAX_SCORE = 10.0
ROUNDING_STEP = 0.5
SEVERE_WORD_COUNT_CAP = (4.5 / 9.0) * MAX_SCORE
MODERATE_WORD_COUNT_CAP = (5.5 / 9.0) * MAX_SCORE
DEFAULT_GEMINI_MODEL = os.environ.get('GEMINI_MODEL', 'gemini-2.5-flash')
IELTS_BAND_THRESHOLDS = [
    (9.0, 'Expert User'),
    (8.5, 'Very Good User'),
    (8.0, 'Very Good User'),
    (7.5, 'Good User'),
    (7.0, 'Good User'),
    (6.5, 'Competent User'),
    (6.0, 'Competent User'),
    (5.5, 'Modest User'),
    (5.0, 'Modest User'),
    (4.5, 'Limited User'),
    (4.0, 'Limited User'),
    (3.5, 'Extremely Limited User'),
    (3.0, 'Extremely Limited User'),
    (2.5, 'Intermittent User'),
    (2.0, 'Intermittent User'),
    (1.0, 'Non User'),
    (0.0, 'Did not attempt'),
]
NORMALIZED_BAND_THRESHOLDS = [
    ((threshold / 9.0) * MAX_SCORE, description)
    for threshold, description in IELTS_BAND_THRESHOLDS
]

try:
    from transformers import BertTokenizer, BertModel
    import torch
    import torch.nn as nn
except ImportError:
    print("\nPlease run:")
    print("pip install transformers torch")
    import sys
    sys.exit(1)

from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error

import tensorflow as tf
try:
    import tf_keras as keras
    from tf_keras import layers, regularizers, callbacks
except ImportError:
    from tensorflow import keras
    from tensorflow.keras import layers, regularizers, callbacks


class AttentionLayer(layers.Layer):
    """
    Self-attention layer 
    Computes attention scores over sequence and returns weighted sum
    """
    def __init__(self, units, **kwargs):
        super(AttentionLayer, self).__init__(**kwargs)
        self.units = units
        self.W = None
        
    def build(self, input_shape):
        # weight matrix for attention
        self.W = self.add_weight(
            name='attention_weight',
            shape=(input_shape[-1], self.units),
            initializer='glorot_uniform',
            trainable=True
        )
        self.b = self.add_weight(
            name='attention_bias',
            shape=(self.units,),
            initializer='zeros',
            trainable=True
        )
        self.u = self.add_weight(
            name='attention_context',
            shape=(self.units,),
            initializer='glorot_uniform',
            trainable=True
        )
        super(AttentionLayer, self).build(input_shape)
    
    def call(self, inputs):
        # inputs shape: (batch_size, sequence_length, features)
        
        # Compute attention scores
        score = tf.nn.tanh(tf.tensordot(inputs, self.W, axes=1) + self.b)
        
        # Shape: (batch_size, sequence_length)
        attention_weights = tf.nn.softmax(
            tf.tensordot(score, self.u, axes=1), axis=1
        )
        
        # Expand dims for broadcasting: (batch_size, sequence_length, 1)
        attention_weights = tf.expand_dims(attention_weights, -1)
        
        # Weighted sum: (batch_size, features)
        weighted_input = tf.reduce_sum(inputs * attention_weights, axis=1)
        
        return weighted_input
    
    def get_config(self):
        config = super().get_config()
        config.update({"units": self.units})
        return config


class QuestionAssessor:
    """
    IELTS Assessment with BERT and optional question awareness
    """
    
    def __init__(self, max_length=512, bert_model='bert-base-uncased', use_question=True):
        """
        Initialize with BERT tokenizer and model
        
        Args:
            max_length: Maximum sequence length (default 512 for BERT)
            bert_model: BERT model name
            use_question: Whether to use question in scoring
        """
        print(f"Loading BERT model: {bert_model}")
        self.tokenizer = BertTokenizer.from_pretrained(bert_model)
        self.bert_model = BertModel.from_pretrained(bert_model)
        self.bert_model.eval()  # Set to evaluation mode
        
        self.max_length = max_length
        self.use_question = use_question
        self.model = None
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.bert_model.to(self.device)
        
        print(f"Using device: {self.device}")
        print(f"Question awareness: {'ENABLED' if use_question else 'DISABLED'}")
        
    def load_data(self, csv_path: str) -> pd.DataFrame:
        """Load IELTS essay data from CSV"""
        print(f"\nLoading data from: {csv_path}")
        
        df = pd.read_csv(csv_path)
        
        # Remove unusable rows
        initial_count = len(df)
        df = df.dropna(subset=['Essay', 'Overall'])
        
        removed = initial_count - len(df)
        if removed > 0:
            print(f"Removed {removed} rows with missing Essay or Overall score")
        
        print(f"Total essays loaded: {len(df)}")
        print(f"\nScore distribution:")
        print(df['Overall'].value_counts().sort_index())
        
        return df
    
    def extract_bert_features(self, text: str) -> np.ndarray:
        """
        Extract BERT token embeddings for text with detailed logging
        Returns token-level embeddings (sequence_length, 768)
        
        Args:
            text: Input text
            
        Returns:
            Token embeddings from BERT's last hidden state
        """
        logger.info("=" * 60)
        logger.info("BERT FEATURE EXTRACTION")
        logger.info(f"Input text: {len(text)} characters, {len(text.split())} words")
        logger.info(f"Preview: {text[:100]}...")
        
        # Step 1: BERT Tokenizer
        logger.info("Step 1: BERT Tokenizer")
        logger.info(f"  Input: Essay text ({len(text)} characters, {len(text.split())} words)")
        logger.info(f"  Tokenizer: {self.tokenizer.__class__.__name__}")
        logger.info(f"  Max length: {self.max_length}")
        
        encoded = self.tokenizer.encode_plus(
            text,
            add_special_tokens=True,
            max_length=self.max_length,
            padding='max_length',
            truncation=True,
            return_attention_mask=True,
            return_tensors='pt'
        )
        
        input_ids = encoded['input_ids'].to(self.device)
        attention_mask = encoded['attention_mask'].to(self.device)
        
        # Log tokenization info
        num_tokens = int(attention_mask.sum().item())
        logger.info(f"  Output:")
        logger.info(f"    Token IDs shape: {input_ids.shape} (batch_size=1, sequence_length={self.max_length})")
        logger.info(f"    Attention mask shape: {attention_mask.shape} (batch_size=1, sequence_length={self.max_length})")
        logger.info(f"    Actual tokens (non-padding): {num_tokens}/{self.max_length}")
        logger.info(f"    Padding tokens: {self.max_length - num_tokens}")
        logger.info(f"    Token IDs range: {input_ids.min().item()} to {input_ids.max().item()}")
        logger.info(f"    Token IDs dtype: {input_ids.dtype}")
        logger.info(f"    Attention mask dtype: {attention_mask.dtype}")
        logger.info(f"    Sample token IDs (first 10): {input_ids[0, :10].cpu().numpy().tolist()}")
        logger.info(f"    Sample token IDs (last 10): {input_ids[0, -10:].cpu().numpy().tolist()}")
        logger.info(f"    Sample attention mask (first 10): {attention_mask[0, :10].cpu().numpy().tolist()}")
        logger.info(f"    Sample attention mask (last 10): {attention_mask[0, -10:].cpu().numpy().tolist()}")
        logger.info(f"  Model: BertTokenizer (HuggingFace)")
        logger.info(f"  Task: Convert essay → token IDs, Create attention mask, Apply max_length={self.max_length}")
        
        # Step 2: BERT Encoder
        logger.info("Step 2: BERT Encoder")
        logger.info(f"  Input: Token IDs shape={input_ids.shape}, Attention mask shape={attention_mask.shape}")
        logger.info(f"  Running BERT model on {self.device}...")
        
        with torch.no_grad():
            outputs = self.bert_model(
                input_ids=input_ids,
                attention_mask=attention_mask
            )
            # Use last hidden state: (batch_size=1, sequence_length, 768)
            last_hidden_state = outputs.last_hidden_state
        
        logger.info(f"  Output from BERT:")
        logger.info(f"    Last hidden state shape: {last_hidden_state.shape} (batch_size=1, sequence_length={last_hidden_state.shape[1]}, hidden_dim=768)")
        logger.info(f"    Statistics: Min={last_hidden_state.min().item():.6f}, Max={last_hidden_state.max().item():.6f}, Mean={last_hidden_state.mean().item():.6f}, Std={last_hidden_state.std().item():.6f}")
        logger.info(f"  Model: BertModel (HuggingFace Pretrained)")
        logger.info(f"  Task: Convert each token → 768-dim vector, Encode entire essay into matrix")
        logger.info(f"  Meaning: BERT creates embedding for each token, later models learn patterns from embeddings")
        
        # Convert to numpy and remove batch dimension
        embeddings = last_hidden_state.cpu().numpy()[0]  # (sequence_length, 768)
        mask = attention_mask.cpu().numpy()[0]  # (sequence_length,)
        
        # Only return embeddings for actual tokens (not padding)
        actual_length = max(1, int(mask.sum()))
        final_embeddings = embeddings[:actual_length, :]
        
        logger.info(f"  Final embeddings (after removing padding):")
        logger.info(f"    embeddings = last_hidden_state[0][:actual_length]")
        logger.info(f"    Shape: {final_embeddings.shape} (sequence_length={actual_length}, feature_dim=768)")
        logger.info(f"    Dtype: {final_embeddings.dtype}")
        logger.info(f"    Total elements: {final_embeddings.size}")
        logger.info(f"    Memory size: {final_embeddings.nbytes / 1024:.2f} KB")
        logger.info(f"    Range: min={final_embeddings.min():.4f}, max={final_embeddings.max():.4f}, mean={final_embeddings.mean():.4f}")
        logger.info(f"    Std: {final_embeddings.std():.4f}")
        logger.info(f"    First token embedding (first 10 dims): {final_embeddings[0, :10]}")
        logger.info(f"    First token embedding (last 10 dims): {final_embeddings[0, -10:]}")
        logger.info(f"    Last token embedding (first 10 dims): {final_embeddings[-1, :10]}")
        logger.info("=" * 60)
        
        return final_embeddings
    
    def extract_features_with_question(self, essay: str, question: str) -> np.ndarray:
        """
        Extract features with question awareness
        
        Args:
            essay: Essay text
            question: Question text
            
        Returns:
            Combined features (sequence_length, 1536)
            - First 768 dims: Essay embeddings
            - Last 768 dims: Question representation (repeated for each token)
        """
        print(f"\n[ML_ASSESS] ========== QUESTION-AWARE FEATURE EXTRACTION ==========")
        print(f"[ML_ASSESS] Question text: {question[:100]}...")
        
        # Extract essay features
        essay_features = self.extract_bert_features(essay)  # (seq_len, 768)
        
        if not self.use_question or not question or not question.strip():
            # If not using question, return essay features only
            print(f"[ML_ASSESS] Question not used, returning essay features only")
            return essay_features
        
        # Extract question features
        print(f"[ML_ASSESS] Extracting question features...")
        question_features = self.extract_bert_features(question)  # (q_len, 768)
        print(f"[ML_ASSESS] Question features shape: {question_features.shape}")
        
        # Get question representation via mean pooling
        question_repr = np.mean(question_features, axis=0)  # (768,)
        print(f"[ML_ASSESS] Question representation (mean pooled): shape={question_repr.shape}")
        print(f"[ML_ASSESS] Question repr stats: min={question_repr.min():.4f}, max={question_repr.max():.4f}, mean={question_repr.mean():.4f}")
        
        # Expand question to match essay length
        essay_seq_len = essay_features.shape[0]
        question_expanded = np.tile(question_repr, (essay_seq_len, 1))  # (seq_len, 768)
        print(f"[ML_ASSESS] Expanded question to match essay length: {question_expanded.shape}")
        
        # Concatenate essay and question features
        combined = np.concatenate([essay_features, question_expanded], axis=1)  # (seq_len, 1536)
        print(f"[ML_ASSESS] Combined features:")
        print(f"  - Shape: {combined.shape}")
        print(f"  - First 768 dims: Essay embeddings")
        print(f"  - Last 768 dims: Question representation (repeated)")
        print(f"[ML_ASSESS] =======================================================\n")
        
        return combined
    
    def prepare_training_data(self, df: pd.DataFrame, max_samples=None) -> Tuple:
        """
        Extract BERT token embeddings from all essays with optional questions
        
        Args:
            df: DataFrame with essays and optional questions
            max_samples: Limit number of samples for memory efficiency
            
        Returns:
            X_train, X_test, y_train, y_test, y_train_orig, y_test_orig
        """
        print("\nExtracting BERT features from essays...")
        if self.use_question:
            print("Including question awareness...")
        print("This will take some time (processing with BERT)...")
        
        if max_samples:
            df = df.head(max_samples)
            print(f"Limited to {max_samples} samples for memory efficiency")
        
        features_list = []
        scores = []
        
        has_questions = 'Question' in df.columns
        
        for idx, row in df.iterrows():
            if idx % 50 == 0:
                print(f"Processing essay {idx + 1}/{len(df)}")
            
            try:
                question = row.get('Question', '') if has_questions else ''
                
                if self.use_question and question:
                    features = self.extract_features_with_question(row['Essay'], question)
                else:
                    features = self.extract_bert_features(row['Essay'])
                
                features_list.append(features)
                scores.append(row['Overall'])
            except Exception as e:
                print(f"Error processing essay {idx}: {e}")
                continue
        
        print(f"\nFeature extraction complete!")
        print(f"  Total essays processed: {len(features_list)}")
        
        # Pad sequences to same length
        max_seq_length = max(f.shape[0] for f in features_list)
        feature_dim = features_list[0].shape[1]
        print(f"  Max sequence length: {max_seq_length}")
        print(f"  Feature dimension: {feature_dim}")
        
        X_padded = []
        for features in features_list:
            if features.shape[0] < max_seq_length:
                # Pad with zeros
                padding = np.zeros((max_seq_length - features.shape[0], features.shape[1]))
                features_padded = np.vstack([features, padding])
            else:
                features_padded = features
            X_padded.append(features_padded)
        
        X = np.array(X_padded)
        y = np.array(scores)
        
        print(f"  Feature shape: {X.shape}")
        
        # Show score distribution
        print("\nScore distribution:")
        unique, counts = np.unique(y, return_counts=True)
        for score, count in zip(unique, counts):
            print(f"  Band {score}: {count} essays")
        
        # Split data
        y_stratify = np.round(y * 2).astype(int)
        unique_groups, group_counts = np.unique(y_stratify, return_counts=True)
        min_samples = np.min(group_counts)
        
        if min_samples >= 2:
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42, stratify=y_stratify
            )
        else:
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42
            )
        
        # Normalize scores to [0, 1]
        y_train_scaled = y_train / 9.0
        y_test_scaled = y_test / 9.0
        
        print(f"\nTraining set: {len(X_train)} essays")
        print(f"Test set: {len(X_test)} essays")
        
        return X_train, X_test, y_train_scaled, y_test_scaled, y_train, y_test
    
    def build_model(self, sequence_length: int, feature_dim: int) -> keras.Model:
        """
        Build Keras model with BiLSTM + Attention
        
        Args:
            sequence_length: Maximum sequence length
            feature_dim: Feature dimension (768 without question, 1536 with question)
            
        Returns:
            Compiled Keras model
        """        
        print(f"\nInput dimension: {feature_dim}")
        if feature_dim == 1536:
            print("  → Using essay (768) + question (768) features")
        else:
            print("  → Using essay features only")
        
        # Input: (sequence_length, feature_dim)
        inputs = layers.Input(shape=(sequence_length, feature_dim), name='bert_embeddings')
        
        # Bidirectional LSTM layer
        bilstm = layers.Bidirectional(
            layers.LSTM(128, return_sequences=True, dropout=0.2),
            name='bilstm'
        )(inputs)
        # Output: (sequence_length, 256)
        
        # Attention layer
        attention = AttentionLayer(units=256, name='attention')(bilstm)
        # Output: (256,)
        
        # Fully connected layer
        fc = layers.Dense(140, activation='relu', name='fc_layer')(attention)
        
        # Output layer (linear activation for regression)
        outputs = layers.Dense(1, activation='linear', name='output')(fc)
        
        # Build model
        model = keras.Model(inputs=inputs, outputs=outputs)
        
        # Compile
        model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.001),
            loss='mse',
            metrics=['mae']
        )
        
        return model
    
    def train(self, X_train, y_train, X_val, y_val, epochs=50, batch_size=32, use_combined_loss=False):
        """
        Train the model
        
        Args:
            X_train: Training features
            y_train: Training scores (0-1 scaled)
            X_val: Validation features
            y_val: Validation scores
            epochs: Number of training epochs
            batch_size: Batch size
            use_combined_loss: Whether to use combined MSE+Cosine loss
            
        Returns:
            Training history
        """
        # Build model
        self.model = self.build_model(
            sequence_length=X_train.shape[1],
            feature_dim=X_train.shape[2]
        )
        
        print(f"\nModel architecture:")
        self.model.summary()
        
        # Callbacks
        early_stop = callbacks.EarlyStopping(
            monitor='val_loss',
            patience=15,
            restore_best_weights=True,
            verbose=1
        )
        
        reduce_lr = callbacks.ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=7,
            min_lr=0.00001,
            verbose=1
        )
        
        # Train
        print(f"\nTraining for up to {epochs} epochs...")
        print("(Will stop early if validation loss stops improving)\n")
        
        history = self.model.fit(
            X_train, y_train,
            validation_data=(X_val, y_val),
            epochs=epochs,
            batch_size=batch_size,
            callbacks=[early_stop, reduce_lr],
            verbose=1
        )
        
        print("\nTraining complete!")
        
        return history
    
    def predict(self, essay: str, task_type: int = 2, question: str = "") -> Dict:
        """
        Predict IELTS band score with optional question awareness
        
        Args:
            essay: Essay text
            task_type: 1 or 2 (for word count validation)
            question: Question text (used if use_question=True)
            
        Returns:
            Dictionary with score and feedback
        """
        if self.model is None:
            raise ValueError("Model not trained! Call train() first or load_model().")
        
        # Basic validation
        essay = essay.strip()
        word_count = len(essay.split())
        
        if word_count < 30:
            return {
                'score': 1.0,
                'band': 'Non User',
                'feedback': {
                    'overall': [f"Essay too short ({word_count} words)"],
                    'interpretation': ['Minimum 30 words required for assessment']
                }
            }
        
        if word_count < 50:
            return {
                'score': 2.0,
                'band': 'Intermittent User',
                'feedback': {
                    'overall': [f"Essay very short ({word_count} words)"],
                    'interpretation': ['Essay should be at least 150 words for Task 1, 250 words for Task 2']
                }
            }
        
        # Extract features
        print(f"\n[ML_ASSESS] ========== PREDICTION PROCESS ==========")
        print(f"[ML_ASSESS] Essay word count: {word_count}")
        print(f"[ML_ASSESS] Task type: {task_type}")
        print(f"[ML_ASSESS] Using question: {self.use_question and bool(question)}")
        
        if self.use_question and question:
            features = self.extract_features_with_question(essay, question)
            print(f"[ML_ASSESS] Combined features (essay + question): shape={features.shape}")
        else:
            features = self.extract_bert_features(essay)
            print(f"[ML_ASSESS] Essay-only features: shape={features.shape}")
        
        # Pad to match training sequence length
        model_seq_length = self.model.input_shape[1]
        model_feature_dim = self.model.input_shape[2]
        print(f"[ML_ASSESS] Model input requirements:")
        print(f"  - Required sequence length: {model_seq_length}")
        print(f"  - Required feature dimension: {model_feature_dim}")
        print(f"  - Current features: sequence={features.shape[0]}, dim={features.shape[1]}")
        
        if features.shape[0] < model_seq_length:
            padding_size = model_seq_length - features.shape[0]
            padding = np.zeros((padding_size, features.shape[1]))
            features = np.vstack([features, padding])
            print(f"[ML_ASSESS] Padded features: added {padding_size} zero-padding tokens")
        else:
            features = features[:model_seq_length, :]
            print(f"[ML_ASSESS] Truncated features to {model_seq_length} tokens")
        
        # Add batch dimension
        features = np.expand_dims(features, axis=0)
        print(f"[ML_ASSESS] Final input shape for model: {features.shape}")
        print(f"[ML_ASSESS] Input statistics:")
        print(f"  - Shape: {features.shape} (batch_size=1, sequence_length={features.shape[1]}, feature_dim={features.shape[2]})")
        print(f"  - Dtype: {features.dtype}")
        print(f"  - Min: {features.min():.6f}, Max: {features.max():.6f}, Mean: {features.mean():.6f}")
        print(f"  - Std: {features.std():.6f}")
        
        # Create intermediate models to extract layer outputs
        print(f"\n[ML_ASSESS] ========== MODEL PIPELINE EXECUTION ==========")
        
        try:
            import tensorflow as tf
            from tensorflow import keras
            
            # Step 3: BiLSTM Layer
            logger.info("Step 3: BiLSTM Layer (256 units)")
            logger.info(f"  Model: Bidirectional(LSTM(128))")
            logger.info(f"  Task: Learn 'flow' of text over time, Understand structure: coherence - progression - linking")
            bilstm_layer = self.model.get_layer('bilstm')
            bilstm_model = keras.Model(inputs=self.model.input, outputs=bilstm_layer.output)
            bilstm_output = bilstm_model.predict(features, verbose=0)
            logger.info(f"  Input shape: {features.shape} (seq_len, 768)")
            logger.info(f"  Output shape: {bilstm_output.shape} (batch_size=1, sequence_length={bilstm_output.shape[1]}, hidden_dim=256)")
            logger.info(f"  Output breakdown:")
            logger.info(f"    - LSTM forward: 128 dim")
            logger.info(f"    - LSTM backward: 128 dim")
            logger.info(f"    - Total: 256 dim per token")
            logger.info(f"  Output statistics:")
            logger.info(f"    Min: {bilstm_output.min():.6f}, Max: {bilstm_output.max():.6f}")
            logger.info(f"    Mean: {bilstm_output.mean():.6f}, Std: {bilstm_output.std():.6f}")
            logger.info(f"  Sample output (first token, first 10 dims): {bilstm_output[0, 0, :10]}")
            logger.info(f"  Sample output (first token, last 10 dims): {bilstm_output[0, 0, -10:]}")
            logger.info(f"  Sample output (middle token, first 10 dims): {bilstm_output[0, bilstm_output.shape[1]//2, :10]}")
            logger.info(f"  Meaning: BiLSTM learns sentence order & logical flow → important for Coherence & Cohesion")
            
            # Step 4: Self-Attention Layer
            logger.info("Step 4: Self-Attention Layer (256 units)")
            logger.info(f"  Model: Custom AttentionLayer")
            logger.info(f"  Task: Calculate attention score for each token, Focus on important words in essay")
            logger.info(f"  Mechanism:")
            logger.info(f"    1. Score = tanh(H_t W + b) where H_t is BiLSTM output, W is weight matrix")
            logger.info(f"    2. Attention weights = softmax(Score · u) where u is context vector")
            logger.info(f"    3. Weighted sum = Σ(attention_weights[i] × H_t[i]) for all tokens")
            logger.info(f"    4. Output: Compress entire sequence into 1 vector (256-dim)")
            attention_layer = self.model.get_layer('attention')
            attention_model = keras.Model(inputs=self.model.input, outputs=attention_layer.output)
            attention_output = attention_model.predict(features, verbose=0)
            logger.info(f"  Input shape: {bilstm_output.shape} (seq_len, 256)")
            logger.info(f"  Output shape: {attention_output.shape} (batch_size=1, vector_dim=256)")
            logger.info(f"  Output statistics:")
            logger.info(f"    Min: {attention_output.min():.6f}, Max: {attention_output.max():.6f}")
            logger.info(f"    Mean: {attention_output.mean():.6f}, Std: {attention_output.std():.6f}")
            logger.info(f"    L2 norm: {np.linalg.norm(attention_output[0]):.6f}")
            logger.info(f"  Sample values (first 10 dims): {attention_output[0, :10]}")
            logger.info(f"  Sample values (last 10 dims): {attention_output[0, -10:]}")
            logger.info(f"  Meaning: Allows model to know which parts of essay are more important (key arguments, main idea)")
            
            # Step 5: Dense Layers
            logger.info("Step 5: Fully Connected Layers")
            logger.info(f"  Model: FC(140) → FC(1)")
            logger.info(f"  Task: Compress & predict band score as regression")
            fc_layer = self.model.get_layer('fc_layer')
            fc_model = keras.Model(inputs=self.model.input, outputs=fc_layer.output)
            fc_output = fc_model.predict(features, verbose=0)
            logger.info(f"  FC Layer (140 units, ReLU activation):")
            logger.info(f"    Input shape: {attention_output.shape} (256,)")
            logger.info(f"    Output shape: {fc_output.shape} (batch_size=1, 140)")
            logger.info(f"    Output statistics:")
            logger.info(f"      Min: {fc_output.min():.6f}, Max: {fc_output.max():.6f}")
            logger.info(f"      Mean: {fc_output.mean():.6f}, Std: {fc_output.std():.6f}")
            logger.info(f"    Sample values (first 10): {fc_output[0, :10]}")
            logger.info(f"    Sample values (last 10): {fc_output[0, -10:]}")
            
            # Final output layer
            logger.info("  Output Layer (1 unit, linear activation):")
            output_layer = self.model.get_layer('output')
            output_model = keras.Model(inputs=self.model.input, outputs=output_layer.output)
            prediction_scaled = output_model.predict(features, verbose=0)[0][0]
            logger.info(f"    Input shape: {fc_output.shape} (140,)")
            logger.info(f"    Output shape: (1,) - single scalar")
            logger.info(f"    Raw prediction (scaled 0-1): {prediction_scaled:.6f}")
            logger.info(f"    Output range: y_pred_scaled ∈ [0, 1]")
            
        except Exception as e:
            logger.warning(f"Could not extract intermediate layer outputs: {e}")
            logger.info("Falling back to direct prediction...")
            prediction_scaled = self.model.predict(features, verbose=0)[0][0]
            logger.info(f"Raw prediction (scaled 0-1): {prediction_scaled:.6f}")
        
        # Step 6: Post-processing (Not a model)
        logger.info("=" * 60)
        logger.info("Step 6: Post-processing (Not a model)")
        logger.info("  Input: raw score from neural model")
        logger.info("  Output: Final score (0-10) rounded to 0.5, Band description, Simple feedback")
        
        # Unscale prediction
        logger.info("  Unscaling prediction:")
        logger.info(f"    Formula: final_score = y_pred_scaled × {MAX_SCORE:.1f}")
        logger.info(f"    Calculation: {prediction_scaled:.6f} × {MAX_SCORE:.1f}")
        score = prediction_scaled * MAX_SCORE
        logger.info(f"    Unscaled score (0-{MAX_SCORE:.0f}): {score:.4f}")
        
        # Round to nearest 0.5
        logger.info("  Rounding to nearest 0.5:")
        score_before_rounding = score
        score = round(score * 2) / 2
        logger.info(f"    Formula: round(score × 2) / 2")
        logger.info(f"    Calculation: round({score_before_rounding:.4f} × 2) / 2 = {score:.1f}")
        logger.info(f"    Rounded score: {score:.1f} (from {score_before_rounding:.4f})")
        logger.info("=" * 60)
        
        # Apply sanity checks based on word count
        logger.info("  Word count validation (Rule-based):")
        min_words = 150 if task_type == 1 else 250
        logger.info(f"    Task type: {task_type} (1 = Task 1, 2 = Task 2)")
        logger.info(f"    Minimum words required: {min_words}")
        logger.info(f"    Actual word count: {word_count}")
        logger.info(f"    Ratio: {word_count/min_words:.2%}")
        
        score_before_penalty = score
        if word_count < min_words * 0.5:
            score = min(score, SEVERE_WORD_COUNT_CAP)
            logger.info(f"    Rule: word count < 50% of minimum → max score capped at {SEVERE_WORD_COUNT_CAP:.1f}")
            logger.info(f"    Applied penalty: {score:.1f} (was {score_before_penalty:.1f})")
        elif word_count < min_words * 0.7:
            score = min(score, MODERATE_WORD_COUNT_CAP)
            logger.info(f"    Rule: word count < 70% of minimum → max score capped at {MODERATE_WORD_COUNT_CAP:.1f}")
            logger.info(f"    Applied penalty: {score:.1f} (was {score_before_penalty:.1f})")
        else:
            logger.info(f"    No word count penalty applied")
        
        # Ensure score is in valid range
        score = max(0.0, min(MAX_SCORE, score))
        logger.info(f"  Final score: {score:.1f}/{MAX_SCORE:.1f}")
        logger.info(f"  Band description: {self.get_band_description(score)}")
        logger.info("=" * 60)
        
        feedback = self.generate_feedback(essay, score, question)
        llm_assessment = self.generate_llm_assessment(essay, score, question)
        if llm_assessment:
            feedback['llm_assessment'] = llm_assessment
        
        result = {
            'score': float(score),
            'band': self.get_band_description(score),
            'feedback': feedback
        }
        
        if llm_assessment:
            result['assessment'] = llm_assessment
        
        return result
    
    def get_band_description(self, score: float) -> str:
        """Map a 0-10 score to an IELTS-style descriptor."""
        for threshold, description in NORMALIZED_BAND_THRESHOLDS:
            if score >= threshold:
                return description
        return 'Unknown'
    
    def generate_feedback(self, essay: str, score: float, question: str = "") -> Dict:
        """Generate feedback based on prediction"""
        feedback = {
            'overall': [],
            'interpretation': []
        }
        
        word_count = len(essay.split())
        
        # Score-based feedback
        if score >= 8.0:
            feedback['overall'].append("Excellent essay overall")
        elif score >= 7.0:
            feedback['overall'].append("Good essay with strong writing")
        elif score >= 6.0:
            feedback['overall'].append("Competent essay, room for improvement")
        elif score >= 5.0:
            feedback['overall'].append("Modest essay, needs significant improvement")
        else:
            feedback['overall'].append("Limited writing ability demonstrated")
        
        feedback['overall'].append(f"Word count: {word_count}")
        
        if self.use_question and question:
            feedback['interpretation'].append("Question relevance considered in scoring")
        
        return feedback
    
    def generate_llm_assessment(self, essay: str, score: float, question: str = "") -> Optional[str]:
        """
        Use Gemini to generate a narrative assessment that references the BERT score.
        Gemini is only used for textual feedback, never for scoring decisions.
        """
        gemini_api_key = os.environ.get('GEMINI_API_KEY')
        if not gemini_api_key:
            return None
        
        model = os.environ.get('GEMINI_ASSESSMENT_MODEL', DEFAULT_GEMINI_MODEL)
        base_prompt = dedent(f"""
            You are an IELTS writing examiner. A BERT-based regression model produced
            an overall writing score of {score:.1f} out of {MAX_SCORE:.1f}.
            Write a short assessment (3 concise bullet points) that:
            • Explains why this score is appropriate, referencing Task Response, Coherence,
              Lexical Resource, and Grammar only if you have signals from the essay.
            • Highlights one strength and one priority improvement.
            • Avoids assigning a new score or contradicting the provided score.
            • Keeps each bullet under 20 words, using direct actionable language.
        """).strip()
        
        essay_excerpt = essay.strip()
        if len(essay_excerpt) > 4000:
            essay_excerpt = essay_excerpt[:4000] + "\n...[truncated]"
        
        prompt_parts = [
            {"text": base_prompt},
        ]
        
        if question:
            prompt_parts.append({"text": f"Prompt:\n{question.strip()}"})
        
        prompt_parts.append({"text": f"Essay:\n{essay_excerpt}"})
        
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": prompt_parts
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "top_p": 0.9,
                "max_output_tokens": 256
            }
        }
        
        endpoints = [
            f"https://generativelanguage.googleapis.com/v1/models/{model}:generateContent",
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        ]
        
        for api_url in endpoints:
            try:
                response = requests.post(
                    api_url,
                    params={"key": gemini_api_key},
                    json=payload,
                    timeout=30
                )
                if response.status_code == 404 and "v1/models" in api_url:
                    continue
                response.raise_for_status()
                data = response.json()
                candidates = data.get('candidates', [])
                if not candidates:
                    continue
                candidate_parts = candidates[0].get('content', {}).get('parts', [])
                if not candidate_parts:
                    continue
                text = candidate_parts[0].get('text', '').strip()
                if text:
                    return text
            except requests.exceptions.RequestException as exc:
                logger.warning(f"Gemini assessment call failed via {api_url}: {exc}")
            except Exception as exc:
                logger.warning(f"Unexpected error during Gemini assessment: {exc}")
        
        return None
    
    def evaluate(self, X_test, y_test_original, y_test_scaled):
        """Evaluate model performance"""
        print("\n" + "="*70)
        print("MODEL EVALUATION")
        print("="*70)
        
        # Make predictions
        y_pred_scaled = self.model.predict(X_test, verbose=0)
        y_pred = y_pred_scaled.flatten() * MAX_SCORE
        
        # Round to nearest 0.5
        y_pred_rounded = np.round(y_pred * 2) / 2
        
        # Calculate metrics
        y_test_converted = (y_test_original / 9.0) * MAX_SCORE
        mae = mean_absolute_error(y_test_converted, y_pred_rounded)
        rmse = np.sqrt(mean_squared_error(y_test_converted, y_pred_rounded))
        
        # Accuracy within bands
        within_05 = np.mean(np.abs(y_test_converted - y_pred_rounded) <= 0.5) * 100
        within_10 = np.mean(np.abs(y_test_converted - y_pred_rounded) <= 1.0) * 100
        exact = np.mean(y_test_converted == y_pred_rounded) * 100
        
        # R-squared
        ss_res = np.sum((y_test_converted - y_pred_rounded) ** 2)
        ss_tot = np.sum((y_test_converted - np.mean(y_test_converted)) ** 2)
        r2 = 1 - (ss_res / ss_tot)
        
        print(f"\nMean Absolute Error: {mae:.2f} points (0-10 scale)")
        print(f"Root Mean Squared Error: {rmse:.2f}")
        print(f"R-squared (R²): {r2:.4f}")
        print(f"\nAccuracy:")
        print(f"  Exact matches: {exact:.1f}%")
        print(f"  Within 0.5 points: {within_05:.1f}%")
        print(f"  Within 1.0 points: {within_10:.1f}%")
        
        return {
            'mae': mae,
            'rmse': rmse,
            'r2': r2,
            'exact': exact,
            'within_05': within_05,
            'within_10': within_10
        }
    
    def save_model(self, model_dir='./bert_question_model'):
        """Save model"""
        Path(model_dir).mkdir(parents=True, exist_ok=True)
        
        self.model.save(f'{model_dir}/model.keras')
        
        # Save metadata
        metadata = {
            'max_length': self.max_length,
            'bert_model': 'bert-base-uncased',
            'use_question': self.use_question
        }
        
        with open(f'{model_dir}/metadata.pkl', 'wb') as f:
            pickle.dump(metadata, f)
        
        print(f"\nModel saved to {model_dir}/")
    
    def load_model(self, model_dir='./bert_question_model'):
        """Load saved model"""
        model_path = Path(model_dir)
        
        if not model_path.exists():
            raise FileNotFoundError(f"Model directory not found: {model_dir}")
        
        # Load metadata
        metadata_path = model_path / 'metadata.pkl'
        if not metadata_path.exists():
            raise FileNotFoundError(f"Metadata file not found: {metadata_path}")
        
        with open(metadata_path, 'rb') as f:
            metadata = pickle.load(f)
        
        self.max_length = metadata['max_length']
        self.use_question = metadata.get('use_question', False)
        
        # Load model with custom objects
        model_file = model_path / 'model.keras'
        if not model_file.exists():
            raise FileNotFoundError(f"Model file not found: {model_file}")
        
        self.model = keras.models.load_model(
            str(model_file),
            custom_objects={'AttentionLayer': AttentionLayer}
        )
        
        print(f"Model loaded from {model_dir}/")
        print(f"  Question awareness: {'ENABLED' if self.use_question else 'DISABLED'}")

