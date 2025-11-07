import pandas as pd
import numpy as np
import pickle
from pathlib import Path
from typing import Dict, Tuple

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
        # Learnable weight matrix for attention
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
        # Shape: (batch_size, sequence_length, units)
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


class PMCStyleIELTSAssessor:
    """
    IELTS Assessment using BERT + BiLSTM + Attention
    "Automated essay scoring with SBERT embeddings and LSTM-Attention networks" (Nie, 2025)
    """
    
    def __init__(self, max_length=512, bert_model='bert-base-uncased'):
        """
        Initialize with BERT tokenizer and model
        
        Args:
            max_length: Maximum sequence length (default 512 for BERT)
            bert_model: BERT model name
        """
        print(f"Loading BERT model: {bert_model}")
        self.tokenizer = BertTokenizer.from_pretrained(bert_model)
        self.bert_model = BertModel.from_pretrained(bert_model)
        self.bert_model.eval()  # Set to evaluation mode
        
        self.max_length = max_length
        self.model = None
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.bert_model.to(self.device)
        
        print(f"Using device: {self.device}")
        
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
    
    def extract_bert_features(self, essay: str) -> np.ndarray:
        """
        Extract BERT token embeddings for an essay
        Returns token-level embeddings (sequence_length, 768)
        
        Args:
            essay: Essay text
            
        Returns:
            Token embeddings from BERT's last hidden state
        """
        # Tokenize with BERT tokenizer
        encoded = self.tokenizer.encode_plus(
            essay,
            add_special_tokens=True,
            max_length=self.max_length,
            padding='max_length',
            truncation=True,
            return_attention_mask=True,
            return_tensors='pt'
        )
        
        input_ids = encoded['input_ids'].to(self.device)
        attention_mask = encoded['attention_mask'].to(self.device)
        
        # Get BERT embeddings
        with torch.no_grad():
            outputs = self.bert_model(
                input_ids=input_ids,
                attention_mask=attention_mask
            )
            # Use last hidden state: (batch_size=1, sequence_length, 768)
            last_hidden_state = outputs.last_hidden_state
        
        # Convert to numpy and remove batch dimension
        embeddings = last_hidden_state.cpu().numpy()[0]  # (sequence_length, 768)
        mask = attention_mask.cpu().numpy()[0]  # (sequence_length,)
        
        # Only return embeddings for actual tokens (not padding)
        # Keep at least 1 token
        actual_length = max(1, int(mask.sum()))
        
        return embeddings[:actual_length, :]
    
    def prepare_training_data(self, df: pd.DataFrame, max_samples=None) -> Tuple:
        """
        Extract BERT token embeddings from all essays
        
        Args:
            df: DataFrame with essays
            max_samples: Limit number of samples for memory efficiency
            
        Returns:
            X_train, X_test, y_train, y_test, y_train_orig, y_test_orig
        """
        print("\nExtracting BERT token embeddings from essays...")
        print("This will take some time (processing with BERT)...")
        
        if max_samples:
            df = df.head(max_samples)
            print(f"Limited to {max_samples} samples for memory efficiency")
        
        features_list = []
        scores = []
        
        for idx, row in df.iterrows():
            if idx % 50 == 0:
                print(f"Processing essay {idx + 1}/{len(df)}")
            
            try:
                # Extract token-level BERT embeddings
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
        print(f"  Max sequence length: {max_seq_length}")
        
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
        
        print(f"  Feature shape: {X.shape}")  # (n_essays, max_seq_length, 768)
        
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
    
    def build_model(self, sequence_length: int, feature_dim: int = 768) -> keras.Model:
        """
        BERT embeddings → BiLSTM → Attention → FC
        
        Args:
            sequence_length: Maximum sequence length
            feature_dim: BERT embedding dimension (768)
            
        Returns:
            Compiled Keras model
        """
        print("\n" + "="*70)
        print("BUILDING PMC-STYLE MODEL")
        print("="*70)
        
        # Input: (sequence_length, feature_dim)
        inputs = layers.Input(shape=(sequence_length, feature_dim), name='bert_embeddings')
        
        # Bidirectional LSTM layer
        # 128 LSTM units
        bilstm = layers.Bidirectional(
            layers.LSTM(128, return_sequences=True, dropout=0.2),
            name='bilstm'
        )(inputs)
        # Output: (sequence_length, 256) - 128*2 for bidirectional
        
        # Attention layer
        attention = AttentionLayer(units=256, name='attention')(bilstm)
        # Output: (256,) - weighted sum over sequence
        
        # Fully connected layer (140 units)
        fc = layers.Dense(140, activation='relu', name='fc_layer')(attention)
        
        # Output layer (linear activation for regression)
        outputs = layers.Dense(1, activation='linear', name='output')(fc)
        
        # Build model
        model = keras.Model(inputs=inputs, outputs=outputs)
        
        # Compile with MSE loss 
        model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.001),  
            loss='mse',
            metrics=['mae']
        )
        
        return model
    
    def cosine_similarity_loss(self, y_true, y_pred):
        """
        Cosine similarity loss 
        Encourages similar essays to have similar predictions
        """
        # Normalize vectors
        y_true_norm = tf.nn.l2_normalize(y_true, axis=-1)
        y_pred_norm = tf.nn.l2_normalize(y_pred, axis=-1)
        
        # Cosine similarity
        cos_sim = tf.reduce_sum(y_true_norm * y_pred_norm, axis=-1)
        
        # Loss is 1 - cosine_similarity
        return 1.0 - cos_sim
    
    def combined_loss(self, alpha=0.7, beta=0.3):
        """
        Combined MSE + Cosine Similarity loss
        
        Args:
            alpha: Weight for MSE loss
            beta: Weight for cosine similarity loss
        """
        def loss(y_true, y_pred):
            mse = tf.keras.losses.mean_squared_error(y_true, y_pred)
            cos_loss = self.cosine_similarity_loss(y_true, y_pred)
            return alpha * mse + beta * cos_loss
        return loss
    
    def train(self, X_train, y_train, X_val, y_val, epochs=50, batch_size=32, use_combined_loss=False):
        """
        Args:
            X_train: Training features (token embeddings)
            y_train: Training scores (0-1 scaled)
            X_val: Validation features
            y_val: Validation scores
            epochs: Number of training epochs (PMC uses 50)
            batch_size: Batch size
            use_combined_loss: Whether to use combined MSE+Cosine loss
            
        Returns:
            Training history
        """
        print("\n" + "="*70)
        print("TRAINING PMC-STYLE MODEL")
        print("="*70)
        
        # Build model
        self.model = self.build_model(
            sequence_length=X_train.shape[1],
            feature_dim=X_train.shape[2]
        )
        
        print(f"\nModel architecture:")
        self.model.summary()
        
        # Optionally use combined loss
        if use_combined_loss:
            print("\nUsing combined MSE + Cosine Similarity loss")
            self.model.compile(
                optimizer=keras.optimizers.Adam(learning_rate=0.001),
                loss=self.combined_loss(alpha=0.7, beta=0.3),
                metrics=['mae']
            )
        
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
        Predict IELTS band score
        
        Args:
            essay: Essay text
            task_type: 1 or 2 (for word count validation)
            question: Question text (not used in PMC approach, kept for compatibility)
            
        Returns:
            Dictionary with score and feedback
        """
        if self.model is None:
            raise ValueError("Model not trained! Call train() first.")
        
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
        
        # Extract BERT features
        features = self.extract_bert_features(essay)
        
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
        score = prediction_scaled * 9.0
        
        # Round to nearest 0.5
        score = round(score * 2) / 2
        
        # Apply sanity checks based on word count
        min_words = 150 if task_type == 1 else 250
        
        if word_count < min_words * 0.5:
            score = min(score, 4.5)
        elif word_count < min_words * 0.7:
            score = min(score, 5.5)
        
        # Ensure score is in valid range
        score = max(0.0, min(9.0, score))
        
        return {
            'score': float(score),
            'band': self.get_band_description(score),
            'feedback': self.generate_feedback(essay, score)
        }
    
    def get_band_description(self, score: float) -> str:
        """Get IELTS band description"""
        descriptions = {
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
            1.0: 'Non User',
            0.0: 'Did not attempt'
        }
        return descriptions.get(score, 'Unknown')
    
    def generate_feedback(self, essay: str, score: float) -> Dict:
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
        
        return feedback
    
    def evaluate(self, X_test, y_test_original, y_test_scaled):
        """Evaluate model performance"""
        print("\n" + "="*70)
        print("MODEL EVALUATION")
        print("="*70)
        
        # Make predictions
        y_pred_scaled = self.model.predict(X_test, verbose=0)
        y_pred = y_pred_scaled.flatten() * 9.0
        
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
    
    def save_model(self, model_dir='./bert_ielts_model'):
        """Save model"""
        Path(model_dir).mkdir(exist_ok=True)
        
        self.model.save(f'{model_dir}/model.keras')
        
        # Save metadata
        metadata = {
            'max_length': self.max_length,
            'bert_model': 'bert-base-uncased'
        }
        
        with open(f'{model_dir}/metadata.pkl', 'wb') as f:
            pickle.dump(metadata, f)
        
        print(f"\n✓ Model saved to {model_dir}/")
    
    def load_model(self, model_dir='./bert_ielts_model'):
        """Load saved model"""
        import os
        
        # Load metadata
        with open(f'{model_dir}/metadata.pkl', 'rb') as f:
            metadata = pickle.load(f)
        
        self.max_length = metadata['max_length']
        
        # Load model with custom objects
        self.model = keras.models.load_model(
            f'{model_dir}/model.keras',
            custom_objects={'AttentionLayer': AttentionLayer}
        )
        
        print(f"✓ Model loaded from {model_dir}/")


# MAIN EXECUTION
if __name__ == '__main__':
    # Initialize assessor
    assessor = PMCStyleIELTSAssessor(max_length=512)
    
    # Load data
    csv_path = r'C:\Users\Admin\Downloads\Documents\ielts_writing_dataset.csv'
    df = assessor.load_data(csv_path)
    
    # Prepare training data (limit samples for memory efficiency during testing)
    # Remove max_samples parameter to use full dataset
    X_train, X_test, y_train, y_test, y_train_orig, y_test_orig = \
        assessor.prepare_training_data(df, max_samples=500)  # Remove this limit for full training
    
    # Train model
    history = assessor.train(
        X_train, y_train,
        X_test, y_test,
        epochs=50,  
        batch_size=32,
        use_combined_loss=False  # Set to True to use combined loss
    )
    
    # Evaluate
    metrics = assessor.evaluate(X_test, y_test_orig, y_test)
    
    # Save model
    assessor.save_model('./bert_ielts_model')
    
    # Test with sample essay
    sample_essay = df.iloc[0]['Essay']
    actual_score = df.iloc[0]['Overall']
    
    result = assessor.predict(sample_essay, task_type=2)
    
    print(f"\n{'='*70}")
    print("SAMPLE PREDICTION")
    print('='*70)
    print(f"\nEssay preview: {sample_essay[:200]}...")
    print(f"\nActual score: {actual_score}")
    print(f"Predicted score: {result['score']}")
    print(f"Band: {result['band']}")
    print(f"\nFeedback:")
    for category, items in result['feedback'].items():
        print(f"\n{category.replace('_', ' ').title()}:")
        for item in items:
            print(f"  {item}")