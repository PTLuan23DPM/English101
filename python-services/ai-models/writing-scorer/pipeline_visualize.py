import pandas as pd
import numpy as np
import pickle
from pathlib import Path

try:
    from transformers import BertTokenizer, BertModel
    import torch
except ImportError:
    print("\nPlease run:")
    print("pip install transformers torch")
    import sys
    sys.exit(1)

import tensorflow as tf
try:
    import tf_keras as keras
    from tf_keras import layers, Model
except ImportError:
    from tensorflow import keras
    from tensorflow.keras import layers, Model


class AttentionLayer(layers.Layer):
    """Self-attention layer"""
    def __init__(self, units, **kwargs):
        super(AttentionLayer, self).__init__(**kwargs)
        self.units = units
        self.W = None
        
    def build(self, input_shape):
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
        score = tf.nn.tanh(tf.tensordot(inputs, self.W, axes=1) + self.b)
        attention_weights = tf.nn.softmax(
            tf.tensordot(score, self.u, axes=1), axis=1
        )
        attention_weights = tf.expand_dims(attention_weights, -1)
        weighted_input = tf.reduce_sum(inputs * attention_weights, axis=1)
        return weighted_input
    
    def get_config(self):
        config = super().get_config()
        config.update({"units": self.units})
        return config


def visualize_essay_pipeline(essay_text, question_text="", model_path='./model.keras'):
    """
    Complete pipeline visualization using loaded model
    """
    print("="*80)
    print("IELTS ESSAY ASSESSMENT - COMPLETE PIPELINE VISUALIZATION")
    print("="*80)
    
    # Initialize BERT
    print("\n[STEP 0] Initializing BERT model...")
    tokenizer = BertTokenizer.from_pretrained('bert-base-uncased')
    bert_model = BertModel.from_pretrained('bert-base-uncased')
    bert_model.eval()
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    bert_model.to(device)
    print(f"✓ BERT loaded on {device}")
    
    # Load metadata to check if question is used
    metadata_path = model_path.replace('model.keras', 'metadata.pkl')
    try:
        with open(metadata_path, 'rb') as f:
            metadata = pickle.load(f)
        use_question = metadata.get('use_question', False)
        max_length = metadata.get('max_length', 512)
    except:
        print("⚠ Could not load metadata, assuming no question awareness")
        use_question = False
        max_length = 512
    
    print(f"✓ Question awareness: {'ENABLED' if use_question else 'DISABLED'}")
    
    # Load trained model
    print("\n[STEP 0.5] Loading trained model...")
    try:
        trained_model = keras.models.load_model(
            model_path,
            custom_objects={'AttentionLayer': AttentionLayer},
            compile=False
        )
        trained_model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.001),
            loss='mse',
            metrics=['mae']
        )
        print("✓ Trained model loaded")
    except Exception as e:
        print(f"❌ Error loading model: {e}")
        print("\nTrying to load without compilation...")
        try:
            trained_model = keras.models.load_model(
                model_path,
                custom_objects={'AttentionLayer': AttentionLayer}
            )
            print("✓ Model loaded successfully")
        except Exception as e2:
            print(f"❌ Failed completely: {e2}")
            return None
    
    print(f"\n{'='*80}")
    print("[INPUT TEXT]")
    print(f"{'='*80}")
    print(f"\nEssay ({len(essay_text.split())} words):")
    print(f"{essay_text[:300]}{'...' if len(essay_text) > 300 else ''}\n")
    if use_question and question_text:
        print(f"Question:")
        print(f"{question_text[:200]}{'...' if len(question_text) > 200 else ''}\n")
    
    # =============================================================================
    # STEP 1: TOKENIZATION
    # =============================================================================
    print(f"\n{'='*80}")
    print("[STEP 1] TOKENIZATION")
    print(f"{'='*80}")
    
    encoded = tokenizer.encode_plus(
        essay_text,
        add_special_tokens=True,
        max_length=max_length,
        padding='max_length',
        truncation=True,
        return_attention_mask=True,
        return_tensors='pt'
    )
    
    input_ids = encoded['input_ids'][0].numpy()
    attention_mask = encoded['attention_mask'][0].numpy()
    actual_length = int(attention_mask.sum())
    actual_tokens = input_ids[:actual_length]
    decoded_tokens = [tokenizer.decode([tid]) for tid in actual_tokens]
    
    print(f"\nTokenization Results:")
    print(f"  Total sequence length: {len(input_ids)} (with padding)")
    print(f"  Actual tokens: {actual_length}")
    print(f"  Padding tokens: {len(input_ids) - actual_length}")
    
    print(f"\nFirst 20 tokens:")
    for i in range(min(20, len(decoded_tokens))):
        print(f"  {i:3d}: {decoded_tokens[i]:15s} (ID: {actual_tokens[i]:5d})")
    
    if len(decoded_tokens) > 20:
        print(f"  ... ({len(decoded_tokens) - 20} more tokens)")
    
    # =============================================================================
    # STEP 2: BERT EMBEDDINGS
    # =============================================================================
    print(f"\n{'='*80}")
    print("[STEP 2] BERT EMBEDDINGS EXTRACTION")
    print(f"{'='*80}")
    
    input_ids_tensor = encoded['input_ids'].to(device)
    attention_mask_tensor = encoded['attention_mask'].to(device)
    
    with torch.no_grad():
        outputs = bert_model(
            input_ids=input_ids_tensor,
            attention_mask=attention_mask_tensor
        )
        last_hidden_state = outputs.last_hidden_state
    
    embeddings = last_hidden_state.cpu().numpy()[0][:actual_length, :]
    
    print(f"\nBERT Embeddings Shape: {embeddings.shape}")
    print(f"  Sequence length: {embeddings.shape[0]}")
    print(f"  Embedding dimension: {embeddings.shape[1]}")
    
    print(f"\nStatistics of embeddings:")
    print(f"  Mean: {embeddings.mean():.4f}")
    print(f"  Std: {embeddings.std():.4f}")
    print(f"  Min: {embeddings.min():.4f}")
    print(f"  Max: {embeddings.max():.4f}")
    
    print(f"\nFirst token (excluding CLS) embedding (first 10 dimensions):")
    print(f"  {embeddings[1, :10]}")
    
    # Handle question if enabled
    combined_features = embeddings
    if use_question and question_text:
        print(f"\n{'='*80}")
        print("[STEP 2.5] QUESTION PROCESSING")
        print(f"{'='*80}")
        
        q_encoded = tokenizer.encode_plus(
            question_text,
            add_special_tokens=True,
            max_length=max_length,
            padding='max_length',
            truncation=True,
            return_attention_mask=True,
            return_tensors='pt'
        )
        
        with torch.no_grad():
            q_outputs = bert_model(
                input_ids=q_encoded['input_ids'].to(device),
                attention_mask=q_encoded['attention_mask'].to(device)
            )
        
        q_embeddings = q_outputs.last_hidden_state.cpu().numpy()[0]
        q_mask = q_encoded['attention_mask'].cpu().numpy()[0]
        q_actual_length = int(q_mask.sum())
        q_embeddings = q_embeddings[:q_actual_length, :]
        
        print(f"\nQuestion embeddings shape: {q_embeddings.shape}")
        
        question_repr = np.mean(q_embeddings, axis=0)
        print(f"Question representation (mean pooled): {question_repr.shape}")
        print(f"  First 10 dims: {question_repr[:10]}")
        
        question_expanded = np.tile(question_repr, (embeddings.shape[0], 1))
        combined_features = np.concatenate([embeddings, question_expanded], axis=1)
        print(f"\nCombined features: {combined_features.shape}")
        print(f"  Essay: {embeddings.shape[1]} + Question: {question_expanded.shape[1]} = {combined_features.shape[1]} dims")
    
    # =============================================================================
    # STEP 3: PREPARE INPUT
    # =============================================================================
    print(f"\n{'='*80}")
    print("[STEP 3] PREPARING INPUT FOR MODEL")
    print(f"{'='*80}")
    
    model_seq_length = trained_model.input_shape[1]
    
    if combined_features.shape[0] < model_seq_length:
        padding_length = model_seq_length - combined_features.shape[0]
        padding = np.zeros((padding_length, combined_features.shape[1]))
        features_padded = np.vstack([combined_features, padding])
        print(f"\nPadding: {combined_features.shape[0]} → {model_seq_length} (added {padding_length} zeros)")
    else:
        features_padded = combined_features[:model_seq_length, :]
        print(f"\nTruncation: {combined_features.shape[0]} → {model_seq_length}")
    
    features_batch = np.expand_dims(features_padded, axis=0)
    print(f"\nFinal input shape: {features_batch.shape}")
    
    # =============================================================================
    # STEP 4-7: MODEL LAYERS
    # =============================================================================
    print(f"\n{'='*80}")
    print("[STEP 4] BIDIRECTIONAL LSTM LAYER")
    print(f"{'='*80}")
    
    try:
        bilstm_layer = trained_model.get_layer('bilstm')
        bilstm_model = Model(inputs=trained_model.input, outputs=bilstm_layer.output)
        bilstm_output = bilstm_model.predict(features_batch, verbose=0)
        
        print(f"\nBiLSTM Output: {bilstm_output.shape}")
        print(f"  Hidden units: {bilstm_output.shape[2]} (128 forward + 128 backward)")
        print(f"  Mean: {bilstm_output.mean():.4f}, Std: {bilstm_output.std():.4f}")
        print(f"\nFirst timestep (first 10 dims): {bilstm_output[0, 0, :10]}")
        
        last_real_idx = min(actual_length - 1, bilstm_output.shape[1] - 1)
        print(f"Last real timestep {last_real_idx} (first 10 dims): {bilstm_output[0, last_real_idx, :10]}")
    except Exception as e:
        print(f"⚠ Could not extract BiLSTM output: {e}")
        bilstm_output = None
    
    # Attention
    print(f"\n{'='*80}")
    print("[STEP 5] ATTENTION MECHANISM")
    print(f"{'='*80}")
    
    try:
        attention_layer = trained_model.get_layer('attention')
        attention_model = Model(inputs=trained_model.input, outputs=attention_layer.output)
        attention_output = attention_model.predict(features_batch, verbose=0)
        
        print(f"\nAttention Output: {attention_output.shape}")
        print(f"  Mean: {attention_output.mean():.4f}, Std: {attention_output.std():.4f}")
        print(f"  First 20 dims: {attention_output[0, :20]}")
        
        # Compute attention weights
        if bilstm_output is not None:
            W = attention_layer.W.numpy()
            b = attention_layer.b.numpy()
            u = attention_layer.u.numpy()
            
            scores = np.tanh(np.dot(bilstm_output[0], W) + b)
            attention_logits = np.dot(scores, u)
            attention_weights = np.exp(attention_logits) / np.sum(np.exp(attention_logits))
            
    except Exception as e:
        print(f"⚠ Could not extract attention output: {e}")
    
    # FC Layer
    print(f"\n{'='*80}")
    print("[STEP 6] FULLY CONNECTED LAYER")
    print(f"{'='*80}")
    
    try:
        fc_layer = trained_model.get_layer('fc_layer')
        fc_model = Model(inputs=trained_model.input, outputs=fc_layer.output)
        fc_output = fc_model.predict(features_batch, verbose=0)
        
        print(f"\nFC Layer Output: {fc_output.shape}")
        print(f"  Mean: {fc_output.mean():.4f}, Std: {fc_output.std():.4f}")
        print(f"  First 20 dims: {fc_output[0, :20]}")
        
        active_units = np.sum(fc_output[0] > 0)
        print(f"\nReLU Activation: {active_units}/{fc_output.shape[1]} active ({active_units/fc_output.shape[1]*100:.1f}%)")
    except Exception as e:
        print(f"⚠ Could not extract FC output: {e}")
    
    # =============================================================================
    # STEP 7-8: FINAL PREDICTION
    # =============================================================================
    print(f"\n{'='*80}")
    print("[STEP 7] OUTPUT LAYER")
    print(f"{'='*80}")
    
    prediction_scaled = trained_model.predict(features_batch, verbose=0)
    print(f"\nRaw output (0-1 scaled): {prediction_scaled[0][0]:.6f}")
    
    print(f"\n{'='*80}")
    print("[STEP 8] FINAL SCORE")
    print(f"{'='*80}")
    
    score_unrounded = prediction_scaled[0][0] * 9.0
    score_rounded = round(score_unrounded * 2) / 2
    
    print(f"\nScore (0-9 scale): {score_unrounded:.6f}")
    print(f"Score (rounded): {score_rounded:.1f}")
    
    band_descriptions = {
        9.0: 'Expert User', 8.5: 'Very Good User', 8.0: 'Very Good User',
        7.5: 'Good User', 7.0: 'Good User', 6.5: 'Competent User',
        6.0: 'Competent User', 5.5: 'Modest User', 5.0: 'Modest User',
        4.5: 'Limited User', 4.0: 'Limited User'
    }
    band = band_descriptions.get(score_rounded, 'Unknown')
    
    print(f"\n{'='*80}")
    print("[FINAL RESULT]")
    print(f"{'='*80}")
    print(f"\nPREDICTED BAND SCORE: {score_rounded:.1f}")
    print(f"BAND DESCRIPTION: {band}")
    print(f"WORD COUNT: {len(essay_text.split())} words")
    print(f"\n{'='*80}\n")


if __name__ == '__main__':
    import os
    
    # Get script directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(script_dir, 'model.keras')
    
    # Check if model exists
    if not os.path.exists(model_path):
        print(f"❌ Model not found at: {model_path}")
        print("\nPlease update model_path in the script.")
        import sys
        sys.exit(1)
    
    # Sample essay
    essay = """
    In today's digital age, technology has fundamentally transformed how people communicate. 
    While traditional methods like face-to-face conversations and handwritten letters were once 
    the primary means of staying in touch, modern innovations such as smartphones, social media, 
    and video conferencing have revolutionized interpersonal connections.
    
    On one hand, technology has made communication more convenient and accessible. People can 
    instantly connect with friends and family across the globe through messaging apps and social 
    platforms. This has strengthened relationships by enabling constant contact regardless of 
    physical distance. Moreover, video calls allow people to see each other in real-time, 
    maintaining a personal touch despite geographical barriers.
    
    However, critics argue that digital communication has led to increased social isolation. 
    Many individuals spend excessive time on their devices, reducing meaningful in-person 
    interactions. The quality of online conversations often lacks the depth and emotional 
    connection found in face-to-face dialogue.
    
    In my opinion, while technology has introduced challenges to authentic communication, 
    its benefits outweigh the drawbacks when used responsibly. The key lies in finding a 
    balance between digital and traditional forms of interaction.
    """
    
    question = """
    Some people believe that technology has made communication easier and brought people 
    closer together, while others think it has made people more isolated. Discuss both 
    views and give your own opinion.
    """
    
    visualize_essay_pipeline(essay.strip(), question.strip(), model_path=model_path)