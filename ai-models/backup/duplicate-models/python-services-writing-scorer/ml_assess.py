import pandas as pd
import numpy as np
import pickle
from pathlib import Path
from typing import Dict, Tuple

try:
    from sentence_transformers import SentenceTransformer
    import torch
except ImportError:
    print("\nPlease run:")
    print("pip install sentence-transformers torch")
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
    IELTS Assessment using Sentence-BERT (SBERT)
    Score range: 0-10 (changed from 0-9)
    """
    
    def __init__(self, max_sentences=50, sbert_model='all-MiniLM-L6-v2', use_question=True):
        """
        Initialize with Sentence-BERT model
        
        Args:
            max_sentences: Maximum number of sentences to process
            sbert_model: Sentence-BERT model name
                - 'all-MiniLM-L6-v2': Fast, good quality (384 dims)
                - 'all-mpnet-base-v2': Best quality (768 dims)
                - 'paraphrase-multilingual-MiniLM-L12-v2': Multilingual support
            use_question: Whether to use question in scoring
        """
        print(f"Loading Sentence-BERT model: {sbert_model}")
        self.sbert_model = SentenceTransformer(sbert_model)
        
        self.max_sentences = max_sentences
        self.use_question = use_question
        self.model = None
        self.embedding_dim = self.sbert_model.get_sentence_embedding_dimension()
        
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.sbert_model = self.sbert_model.to(self.device)
        
        print(f"Using device: {self.device}")
        print(f"Embedding dimension: {self.embedding_dim}")
        print(f"Question awareness: {'ENABLED' if use_question else 'DISABLED'}")
        print(f"Score range: 0-10 (IELTS band scores)")
        
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
    
    def split_into_sentences(self, text: str) -> list:
        """
        Split text into sentences using simple heuristics
        
        Args:
            text: Input text
            
        Returns:
            List of sentences
        """
        import re
        
        # Split on sentence boundaries
        sentences = re.split(r'[.!?]+', text)
        
        # Clean and filter
        sentences = [s.strip() for s in sentences if s.strip()]
        
        return sentences
    
    def extract_sbert_features(self, text: str) -> np.ndarray:
        """
        Extract Sentence-BERT embeddings for text
        Returns sentence-level embeddings (num_sentences, embedding_dim)
        
        Args:
            text: Input text
            
        Returns:
            Sentence embeddings from SBERT
        """
        # Split text into sentences
        sentences = self.split_into_sentences(text)
        
        if not sentences:
            # Return zero embedding if no sentences
            return np.zeros((1, self.embedding_dim))
        
        # Encode sentences with SBERT
        embeddings = self.sbert_model.encode(
            sentences,
            convert_to_numpy=True,
            show_progress_bar=False
        )
        
        return embeddings  # (num_sentences, embedding_dim)
    
    def extract_features_with_question(self, essay: str, question: str) -> np.ndarray:
        """
        Extract features combining essay and question
        
        Args:
            essay: Essay text
            question: Question text
            
        Returns:
            Combined features (num_sentences, embedding_dim * 2)
            - First half: Essay sentence embeddings
            - Second half: Question representation (repeated for each sentence)
        """
        # Extract essay features
        essay_features = self.extract_sbert_features(essay)  # (num_sent, dim)
        
        if not self.use_question or not question or not question.strip():
            # If not using question, return essay features only
            return essay_features
        
        # Extract question features - encode as single semantic unit
        question_embedding = self.sbert_model.encode(
            question,
            convert_to_numpy=True,
            show_progress_bar=False
        )  # (dim,)
        
        # Expand question to match essay length
        question_expanded = np.tile(
            question_embedding, 
            (essay_features.shape[0], 1)
        )  # (num_sent, dim)
        
        # Concatenate essay and question features
        combined = np.concatenate(
            [essay_features, question_expanded], 
            axis=1
        )  # (num_sent, dim * 2)
        
        return combined
    
    def prepare_training_data(self, df: pd.DataFrame, max_samples=None) -> Tuple:
        """
        Extract Sentence-BERT embeddings from all essays with optional questions
        
        Args:
            df: DataFrame with essays and optional questions
            max_samples: Limit number of samples for memory efficiency
            
        Returns:
            X_train, X_test, y_train, y_test, y_train_orig, y_test_orig
        """
        print("\nExtracting Sentence-BERT features from essays...")
        if self.use_question:
            print("Including question awareness...")
        print("This will take some time (processing with SBERT)...")
        
        if max_samples:
            df = df.head(max_samples)
            print(f"Using first {max_samples} samples")
        
        # Extract features
        features_list = []
        scores = []
        
        has_question = 'Question' in df.columns
        
        for idx, row in df.iterrows():
            if idx % 100 == 0:
                print(f"Processing essay {idx + 1}/{len(df)}...")
            
            essay = row['Essay']
            question = row['Question'] if has_question else ""
            score = row['Overall']
            
            # Extract features
            if self.use_question and has_question:
                features = self.extract_features_with_question(essay, question)
            else:
                features = self.extract_sbert_features(essay)
            
            features_list.append(features)
            scores.append(score)
        
        # Pad sequences to same length
        max_len = min(
            max([f.shape[0] for f in features_list]), 
            self.max_sentences
        )
        
        print(f"\nPadding/truncating to {max_len} sentences per essay")
        
        X = np.zeros((len(features_list), max_len, features_list[0].shape[1]))
        
        for i, features in enumerate(features_list):
            length = min(features.shape[0], max_len)
            X[i, :length, :] = features[:length, :]
        
        # Convert scores to numpy array
        y_original = np.array(scores)
        
        # Scale scores to 0-1 range (changed from 0-9 to 0-10)
        y_scaled = y_original / 10.0
        
        print(f"\nFeature shape: {X.shape}")
        print(f"Score range (original): {y_original.min():.1f} - {y_original.max():.1f}")
        print(f"Score range (scaled): {y_scaled.min():.3f} - {y_scaled.max():.3f}")
        
        # Split into train/test
        X_train, X_test, y_train, y_test, y_train_orig, y_test_orig = train_test_split(
            X, y_scaled, y_original,
            test_size=0.2,
            random_state=42,
            stratify=None  # Can't stratify continuous values
        )
        
        print(f"\nTraining samples: {len(X_train)}")
        print(f"Test samples: {len(X_test)}")
        
        return X_train, X_test, y_train, y_test, y_train_orig, y_test_orig
    
    def build_model(self, input_shape):
        """
        Build SBERT-BiLSTM-Attention model
        
        Architecture:
        1. Sentence-BERT embeddings (pre-computed)
        2. Bidirectional LSTM layers
        3. Self-attention mechanism
        4. Dense layers with dropout
        5. Single output (regression for 0-10 score)
        """
        print("\nBuilding SBERT-BiLSTM-Attention model...")
        print(f"Input shape: {input_shape}")
        
        # Input layer
        inputs = layers.Input(shape=input_shape, name='sbert_embeddings')
        
        # Bidirectional LSTM layers
        x = layers.Bidirectional(
            layers.LSTM(
                256, 
                return_sequences=True,
                dropout=0.3,
                recurrent_dropout=0.2
            ),
            name='bilstm_1'
        )(inputs)
        
        x = layers.Bidirectional(
            layers.LSTM(
                128, 
                return_sequences=True,
                dropout=0.3,
                recurrent_dropout=0.2
            ),
            name='bilstm_2'
        )(x)
        
        # Self-attention layer
        x = AttentionLayer(128, name='attention')(x)
        
        # Dense layers
        x = layers.Dense(
            128, 
            activation='relu',
            kernel_regularizer=regularizers.l2(0.001),
            name='dense_1'
        )(x)
        x = layers.Dropout(0.4)(x)
        
        x = layers.Dense(
            64, 
            activation='relu',
            kernel_regularizer=regularizers.l2(0.001),
            name='dense_2'
        )(x)
        x = layers.Dropout(0.3)(x)
        
        # Output layer (0-1 scaled, will be converted to 0-10)
        outputs = layers.Dense(1, activation='sigmoid', name='output')(x)
        
        # Create model
        model = keras.Model(inputs=inputs, outputs=outputs, name='sbert_bilstm_attention')
        
        # Compile with appropriate loss and metrics
        model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.001),
            loss='mse',
            metrics=['mae']
        )
        
        print("\nModel Summary:")
        model.summary()
        
        return model
    
    def train(self, X_train, y_train, X_test, y_test, epochs=50, batch_size=32):
        """
        Train the model with callbacks
        
        Args:
            X_train, y_train: Training data
            X_test, y_test: Validation data
            epochs: Number of training epochs
            batch_size: Batch size
            
        Returns:
            Training history
        """
        print("\n" + "="*70)
        print("TRAINING MODEL")
        print("="*70)
        
        # Build model
        self.model = self.build_model(input_shape=(X_train.shape[1], X_train.shape[2]))
        
        # Callbacks
        early_stop = callbacks.EarlyStopping(
            monitor='val_loss',
            patience=10,
            restore_best_weights=True,
            verbose=1
        )
        
        reduce_lr = callbacks.ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=5,
            min_lr=1e-6,
            verbose=1
        )
        
        # Train
        history = self.model.fit(
            X_train, y_train,
            validation_data=(X_test, y_test),
            epochs=epochs,
            batch_size=batch_size,
            callbacks=[early_stop, reduce_lr],
            verbose=1
        )
        
        print("\nTraining completed!")
        
        return history
    
    def predict(self, essay: str, task_type: int = 2, question: str = "") -> Dict:
        """
        Predict IELTS score for an essay
        Score range: 0-10
        
        Args:
            essay: Essay text
            task_type: 1 for Task 1, 2 for Task 2
            question: Optional question text
            
        Returns:
            Dictionary with score, band, and feedback
        """
        if self.model is None:
            raise ValueError("Model not trained or loaded. Please train or load a model first.")
        
        # Word count for sanity checks
        word_count = len(essay.split())
        
        # Extract features
        if self.use_question and question:
            features = self.extract_features_with_question(essay, question)
        else:
            features = self.extract_sbert_features(essay)
        
        # Pad to match training sequence length
        if features.shape[0] < self.model.input_shape[1]:
            padding = np.zeros((self.model.input_shape[1] - features.shape[0], features.shape[1]))
            features = np.vstack([features, padding])
        else:
            features = features[:self.model.input_shape[1], :]
        
        # Add batch dimension
        features = np.expand_dims(features, axis=0)
        
        # Predict
        prediction_scaled = self.model.predict(features, verbose=0)[0][0]
        score = prediction_scaled * 10.0  # Changed from 9.0 to 10.0
        
        # Round to nearest 0.5
        score = round(score * 2) / 2
        
        # Apply sanity checks based on word count
        min_words = 150 if task_type == 1 else 250
        
        if word_count < min_words * 0.5:
            score = min(score, 5.0)  # Adjusted for 0-10 scale
        elif word_count < min_words * 0.7:
            score = min(score, 6.0)  # Adjusted for 0-10 scale
        
        # Ensure score is in valid range (0-10)
        score = max(0.0, min(10.0, score))
        
        return {
            'score': float(score),
            'band': self.get_band_description(score),
            'feedback': self.generate_feedback(essay, score, question)
        }
    
    def get_band_description(self, score: float) -> str:
        """Get IELTS band description (0-10 scale)"""
        descriptions = {
            10.0: 'Expert User (Perfect)',
            9.5: 'Expert User',
            9.0: 'Expert User',
            8.5: 'Very Good User',
            8.0: 'Very Good User',
            7.5: 'Good User',
            7.0: 'Good User',
            6.5: 'Competent User',
            6.0: 'Competent User',
            5.5: 'Modest User',
            5.0: 'Modest User',
            4.5: 'Limited User',
            4.0: 'Limited User',
            3.5: 'Extremely Limited User',
            3.0: 'Extremely Limited User',
            2.5: 'Intermittent User',
            2.0: 'Intermittent User',
            1.5: 'Non User',
            1.0: 'Non User',
            0.5: 'Did not attempt',
            0.0: 'Did not attempt'
        }
        return descriptions.get(score, 'Unknown')
    
    def generate_feedback(self, essay: str, score: float, question: str = "") -> Dict:
        """Generate feedback based on prediction"""
        feedback = {
            'overall': [],
            'interpretation': []
        }
        
        word_count = len(essay.split())
        
        # Score-based feedback (adjusted for 0-10 scale)
        if score >= 9.0:
            feedback['overall'].append("Outstanding essay with exceptional writing")
        elif score >= 8.0:
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
        
        feedback['interpretation'].append("Scored using Sentence-BERT semantic analysis")
        
        return feedback
    
    def evaluate(self, X_test, y_test_original, y_test_scaled):
        """Evaluate model performance (0-10 scale)"""
        print("\n" + "="*70)
        print("MODEL EVALUATION")
        print("="*70)
        
        # Make predictions
        y_pred_scaled = self.model.predict(X_test, verbose=0)
        y_pred = y_pred_scaled.flatten() * 10.0  # Changed from 9.0 to 10.0
        
        # Round to nearest 0.5
        y_pred_rounded = np.round(y_pred * 2) / 2
        
        # Calculate metrics
        mae = mean_absolute_error(y_test_original, y_pred_rounded)
        rmse = np.sqrt(mean_squared_error(y_test_original, y_pred_rounded))
        
        # Accuracy within bands
        within_05 = np.mean(np.abs(y_test_original - y_pred_rounded) <= 0.5) * 100
        within_10 = np.mean(np.abs(y_test_original - y_pred_rounded) <= 1.0) * 100
        exact = np.mean(y_test_original == y_pred_rounded) * 100
        
        # R-squared
        ss_res = np.sum((y_test_original - y_pred_rounded) ** 2)
        ss_tot = np.sum((y_test_original - np.mean(y_test_original)) ** 2)
        r2 = 1 - (ss_res / ss_tot)
        
        print(f"\nMean Absolute Error: {mae:.2f} bands")
        print(f"Root Mean Squared Error: {rmse:.2f}")
        print(f"R-squared (R²): {r2:.4f}")
        print(f"\nAccuracy:")
        print(f"  Exact matches: {exact:.1f}%")
        print(f"  Within 0.5 bands: {within_05:.1f}%")
        print(f"  Within 1.0 bands: {within_10:.1f}%")
        
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
        Path(model_dir).mkdir(exist_ok=True)
        
        self.model.save(f'{model_dir}/model.keras')
        
        # Save metadata
        metadata = {
            'max_sentences': self.max_sentences,
            'sbert_model': self.sbert_model.get_sentence_embedding_dimension(),
            'use_question': self.use_question,
            'embedding_dim': self.embedding_dim
        }
        
        with open(f'{model_dir}/metadata.pkl', 'wb') as f:
            pickle.dump(metadata, f)
        
        print(f"\nModel saved to {model_dir}/")
    
    def load_model(self, model_dir='./bert_question_model'):
        """Load saved model"""
        import os
        
        # Load metadata
        with open(f'{model_dir}/metadata.pkl', 'rb') as f:
            metadata = pickle.load(f)
        
        self.max_sentences = metadata['max_sentences']
        self.use_question = metadata.get('use_question', False)
        self.embedding_dim = metadata.get('embedding_dim', 384)
        
        # Load model with custom objects
        self.model = keras.models.load_model(
            f'{model_dir}/model.keras',
            custom_objects={'AttentionLayer': AttentionLayer}
        )
        
        print(f"Model loaded from {model_dir}/")
        print(f"  Question awareness: {'ENABLED' if self.use_question else 'DISABLED'}")


# MAIN EXECUTION
if __name__ == '__main__':
    # Initialize assessor WITH question awareness using SBERT
    print("="*70)
    print("SBERT-BASED MODEL WITH QUESTION AWARENESS")
    print("Score Range: 0-10")
    print("="*70)
    
    assessor = QuestionAssessor(
        max_sentences=50,
        sbert_model='all-MiniLM-L6-v2',  # Fast and efficient
        # sbert_model='all-mpnet-base-v2',  # Better quality but slower
        use_question=True  
    )
    
    # Load data
    csv_path = r'C:\Users\Admin\Downloads\Documents\ielts_writing_dataset.csv'
    df = assessor.load_data(csv_path)
    
    # Prepare training data 
    X_train, X_test, y_train, y_test, y_train_orig, y_test_orig = \
        assessor.prepare_training_data(df, max_samples=None)
    
    # Train model
    history = assessor.train(
        X_train, y_train,
        X_test, y_test,
        epochs=50,
        batch_size=32
    )
    
    # Evaluate
    metrics = assessor.evaluate(X_test, y_test_orig, y_test)
    
    # Save model
    assessor.save_model('./bert_question_model')
    
    # Test with sample essay
    print("\n" + "="*70)
    print("TESTING ON SAMPLE ESSAY")
    print("="*70)
    
    sample_essay = df.iloc[0]['Essay']
    sample_question = df.iloc[0]['Question'] if 'Question' in df.columns else ""
    actual_score = df.iloc[0]['Overall']
    
    result = assessor.predict(sample_essay, task_type=2, question=sample_question)
    
    if sample_question:
        print(f"\nQuestion: {sample_question[:100]}...")
    print(f"\nEssay preview: {sample_essay[:200]}...")
    print(f"\nActual score: {actual_score}")
    print(f"Predicted score: {result['score']}")
    print(f"Band: {result['band']}")
    print(f"\nFeedback:")
    for category, items in result['feedback'].items():
        print(f"\n{category.replace('_', ' ').title()}:")
        for item in items:
            print(f"  {item}")