"""
Model Conversion Script
Converts the old model format to a new compatible format by:
1. Loading with TensorFlow 2.x compatibility mode
2. Extracting and saving weights separately
3. Rebuilding with current tf_keras
"""
import numpy as np
import pickle
import os
import h5py

# Try to use tensorflow.keras first (more compatible with old models)
import tensorflow as tf
print(f"TensorFlow version: {tf.__version__}")

# First try with tensorflow.keras (more backward compatible)
from tensorflow import keras as tf_keras_compat
from tensorflow.keras import layers as compat_layers

try:
    import tf_keras as keras
    from tf_keras import layers
    USE_TF_KERAS = True
    print("Using tf_keras for new model")
except ImportError:
    from tensorflow import keras
    from tensorflow.keras import layers
    USE_TF_KERAS = False
    print("Using tensorflow.keras")


class AttentionLayer(compat_layers.Layer):
    """Attention layer - compatible version"""
    def __init__(self, units, **kwargs):
        super(AttentionLayer, self).__init__(**kwargs)
        self.units = units
        
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


class AttentionLayerNew(layers.Layer):
    """Attention layer - new tf_keras version"""
    def __init__(self, units, **kwargs):
        super(AttentionLayerNew, self).__init__(**kwargs)
        self.units = units
        
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
        super(AttentionLayerNew, self).build(input_shape)
    
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


def build_new_model(sequence_length, feature_dim):
    """Build model with new tf_keras"""
    inputs = layers.Input(shape=(sequence_length, feature_dim), name='bert_embeddings')
    
    bilstm = layers.Bidirectional(
        layers.LSTM(128, return_sequences=True, dropout=0.2),
        name='bilstm'
    )(inputs)
    
    attention = AttentionLayerNew(units=256, name='attention')(bilstm)
    
    fc = layers.Dense(140, activation='relu', name='fc_layer')(attention)
    
    outputs = layers.Dense(1, activation='linear', name='output')(fc)
    
    model = keras.Model(inputs=inputs, outputs=outputs)
    
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=0.001),
        loss='mse',
        metrics=['mae']
    )
    
    return model


def convert_model(old_model_path='./model.keras', output_dir='./'):
    """
    Convert old model to new format
    """
    print("="*80)
    print("MODEL CONVERSION")
    print("="*80)
    
    print(f"\n[1] Loading old model with backward compatibility mode...")
    
    # Try multiple loading strategies
    old_model = None
    weights_dict = {}
    
    # Strategy 1: Try loading with tensorflow.keras (more compatible)
    try:
        print("\n  Strategy 1: Loading with tensorflow.keras...")
        old_model = tf_keras_compat.models.load_model(
            old_model_path,
            custom_objects={'AttentionLayer': AttentionLayer},
            compile=False
        )
        print("  ✓ Model loaded successfully!")
        
        # Extract architecture info
        print(f"\n[2] Extracting model information...")
        print(f"  Input shape: {old_model.input_shape}")
        print(f"  Output shape: {old_model.output_shape}")
        
        sequence_length = old_model.input_shape[1]
        feature_dim = old_model.input_shape[2]
        
        print(f"\n[3] Extracting weights from old model...")
        for layer in old_model.layers:
            weights = layer.get_weights()
            if len(weights) > 0:
                weights_dict[layer.name] = weights
                print(f"  ✓ {layer.name}: {len(weights)} weight arrays")
        
        print(f"\n  Total layers with weights: {len(weights_dict)}")
        
    except Exception as e:
        print(f"  ✗ Strategy 1 failed: {e}")
        
        # Strategy 2: Try to read HDF5 directly
        print("\n  Strategy 2: Reading weights from HDF5 file...")
        try:
            with h5py.File(old_model_path, 'r') as f:
                print(f"  ✓ Opened HDF5 file")
                
                # Try to determine architecture from file
                if 'model_weights' in f:
                    print("  Found model_weights group")
                    # This is a more complex extraction, would need to traverse the HDF5 structure
                
                # For now, we'll need the model to load to get architecture
                print("  ⚠ Cannot extract architecture without loading model")
                print("  This strategy requires manual architecture specification")
                
        except Exception as e2:
            print(f"  ✗ Strategy 2 failed: {e2}")
    
    if not weights_dict:
        print("\n❌ Could not extract weights from old model")
        print("\nThe model file is incompatible with current environment.")
        print("Recommendation: Retrain the model using your current setup.")
        return False
    
    print(f"\n[4] Building new model with extracted architecture...")
    new_model = build_new_model(sequence_length, feature_dim)
    print("  ✓ New model built")
    
    print(f"\n[5] Transferring weights to new model...")
    transferred = 0
    for layer_name, old_weights in weights_dict.items():
        try:
            new_layer = new_model.get_layer(layer_name)
            new_layer.set_weights(old_weights)
            print(f"  ✓ {layer_name}")
            transferred += 1
        except Exception as e:
            print(f"  ⚠ {layer_name}: {e}")
    
    print(f"\n  Transferred: {transferred}/{len(weights_dict)} layers")
    
    if transferred < len(weights_dict) * 0.8:
        print("\n  ⚠ Less than 80% of weights transferred!")
        print("  The converted model may not work properly.")
    
    print(f"\n[6] Saving converted model...")
    
    # Save as new format
    new_model_path = os.path.join(output_dir, 'model_converted.keras')
    new_model.save(new_model_path)
    print(f"  ✓ Saved to: {new_model_path}")
    
    # Also save weights separately for backup
    weights_path = os.path.join(output_dir, 'model_weights.npz')
    np.savez(weights_path, **weights_dict)
    print(f"  ✓ Weights backup: {weights_path}")
    
    # Update metadata
    metadata_path = os.path.join(output_dir, 'metadata.pkl')
    if os.path.exists(metadata_path):
        with open(metadata_path, 'rb') as f:
            metadata = pickle.load(f)
    else:
        metadata = {
            'max_length': 512,
            'bert_model': 'bert-base-uncased',
            'use_question': False
        }
    
    new_metadata_path = os.path.join(output_dir, 'metadata_converted.pkl')
    with open(new_metadata_path, 'wb') as f:
        pickle.dump(metadata, f)
    print(f"  ✓ Metadata: {new_metadata_path}")
    
    print(f"\n[7] Testing converted model...")
    test_input = np.random.randn(1, sequence_length, feature_dim).astype(np.float32)
    
    old_pred = old_model.predict(test_input, verbose=0) if old_model else None
    new_pred = new_model.predict(test_input, verbose=0)
    
    print(f"  New model output: {new_pred[0][0]:.6f} (scaled: {new_pred[0][0]*9:.2f})")
    if old_pred is not None:
        print(f"  Old model output: {old_pred[0][0]:.6f} (scaled: {old_pred[0][0]*9:.2f})")
        diff = abs(old_pred[0][0] - new_pred[0][0])
        print(f"  Difference: {diff:.6f}")
        if diff < 0.001:
            print("  ✓ Models match closely!")
        else:
            print("  ⚠ Models have different outputs")
    
    print(f"\n{'='*80}")
    print("✓ CONVERSION COMPLETE")
    print(f"{'='*80}")
    print("\nConverted files:")
    print(f"  - {new_model_path}")
    print(f"  - {weights_path}")
    print(f"  - {new_metadata_path}")
    print("\nTo use converted model, update your scripts to use 'model_converted.keras'")
    print(f"{'='*80}\n")
    
    return True


if __name__ == '__main__':
    script_dir = os.path.dirname(os.path.abspath(__file__))
    old_model_path = os.path.join(script_dir, 'model.keras')
    
    if not os.path.exists(old_model_path):
        print(f"❌ Model not found: {old_model_path}")
    else:
        success = convert_model(old_model_path, script_dir)
        
        if not success:
            print("\n" + "="*80)
            print("ALTERNATIVE: RETRAIN THE MODEL")
            print("="*80)
            print("\nSince conversion failed, the recommended approach is to")
            print("retrain your model with the current environment.")
            print("\nThis will ensure full compatibility and avoid any issues.")