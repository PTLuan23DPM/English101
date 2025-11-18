"""
Diagnostic script to verify model weights loaded correctly
"""
import numpy as np
import pickle
import os

try:
    import tf_keras as keras
    from tf_keras import layers
except ImportError:
    from tensorflow import keras
    from tensorflow.keras import layers


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


def diagnose_model(model_path='./model.keras'):
    """
    Check if model can be loaded and inspect its weights
    """
    print("="*80)
    print("MODEL DIAGNOSTICS")
    print("="*80)
    
    print(f"\n[1] Checking model file...")
    if not os.path.exists(model_path):
        print(f"❌ Model file not found: {model_path}")
        return False
    
    file_size = os.path.getsize(model_path) / (1024 * 1024)  # MB
    print(f"✓ Model file exists: {model_path}")
    print(f"  File size: {file_size:.2f} MB")
    
    print(f"\n[2] Attempting to load model...")
    try:
        model = keras.models.load_model(
            model_path,
            custom_objects={'AttentionLayer': AttentionLayer}
        )
        print("✓ Model loaded successfully!")
        print(f"\n[3] Model architecture:")
        model.summary()
        
        print(f"\n[4] Checking layer weights...")
        total_params = 0
        for layer in model.layers:
            weights = layer.get_weights()
            if len(weights) > 0:
                layer_params = sum([w.size for w in weights])
                total_params += layer_params
                
                # Check if weights are initialized (not all zeros or random)
                weight_stats = []
                for w in weights:
                    weight_stats.append({
                        'shape': w.shape,
                        'mean': float(np.mean(w)),
                        'std': float(np.std(w)),
                        'min': float(np.min(w)),
                        'max': float(np.max(w)),
                        'nonzero': float(np.count_nonzero(w) / w.size * 100)
                    })
                
                print(f"\n  Layer: {layer.name}")
                print(f"    Parameters: {layer_params:,}")
                for i, stats in enumerate(weight_stats):
                    print(f"    Weight {i}: {stats['shape']}")
                    print(f"      Mean: {stats['mean']:.6f}, Std: {stats['std']:.6f}")
                    print(f"      Range: [{stats['min']:.6f}, {stats['max']:.6f}]")
                    print(f"      Non-zero: {stats['nonzero']:.1f}%")
        
        print(f"\n[5] Total parameters: {total_params:,}")
        
        print(f"\n[6] Testing with random input...")
        input_shape = model.input_shape
        test_input = np.random.randn(1, input_shape[1], input_shape[2]).astype(np.float32)
        prediction = model.predict(test_input, verbose=0)
        print(f"✓ Model can make predictions")
        print(f"  Input shape: {test_input.shape}")
        print(f"  Output: {prediction[0][0]:.6f}")
        print(f"  Output (scaled 0-9): {prediction[0][0] * 9:.2f}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error loading model: {e}")
        print(f"\nError type: {type(e).__name__}")
        print(f"Error details: {str(e)[:500]}")
        return False


def check_metadata(metadata_path='./metadata.pkl'):
    """Check metadata file"""
    print(f"\n{'='*80}")
    print("[METADATA CHECK]")
    print(f"{'='*80}")
    
    if not os.path.exists(metadata_path):
        print(f"❌ Metadata not found: {metadata_path}")
        return
    
    try:
        with open(metadata_path, 'rb') as f:
            metadata = pickle.load(f)
        
        print("✓ Metadata loaded:")
        for key, value in metadata.items():
            print(f"  {key}: {value}")
    except Exception as e:
        print(f"❌ Error loading metadata: {e}")


if __name__ == '__main__':
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Check model
    model_path = os.path.join(script_dir, 'model.keras')
    success = diagnose_model(model_path)
    
    # Check metadata
    metadata_path = os.path.join(script_dir, 'metadata.pkl')
    check_metadata(metadata_path)
    
    print(f"\n{'='*80}")
    if success:
        print("✓ DIAGNOSIS COMPLETE - Model appears functional")
        print("\nIf predictions are still wrong, the model may need retraining")
        print("with your current environment to ensure full compatibility.")
    else:
        print("❌ DIAGNOSIS FAILED - Model has compatibility issues")
        print("\nRecommendation: Retrain the model using your current environment")
    print(f"{'='*80}\n")