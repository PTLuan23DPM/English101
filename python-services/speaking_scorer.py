from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import uuid
import subprocess
from speaking_engine import speaking_engine

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'temp_audio'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def check_ffmpeg():
    """Check if ffmpeg is available"""
    try:
        subprocess.run(['ffmpeg', '-version'], 
                      stdout=subprocess.PIPE, 
                      stderr=subprocess.PIPE, 
                      check=True,
                      timeout=5)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
        return False

def convert_webm_to_wav(input_path, output_path):
    """Chuẩn hóa audio từ web (webm) sang wav 16kHz"""
    # WebM format requires FFmpeg, so check FFmpeg first
    if not check_ffmpeg():
        print("ERROR: FFmpeg is not installed or not in PATH")
        print("Please install FFmpeg: https://ffmpeg.org/download.html")
        print("Or add FFmpeg to your system PATH")
        return False, "FFmpeg is required to convert WebM audio files. Please install FFmpeg from https://ffmpeg.org/download.html"
    
    try:
        command = [
            'ffmpeg', '-y', '-v', 'error',
            '-i', input_path,
            '-ac', '1', '-ar', '16000',
            output_path
        ]
        result = subprocess.run(command, check=True, capture_output=True, text=True, timeout=30)
        return True, None
    except subprocess.CalledProcessError as e:
        error_msg = e.stderr if e.stderr else "FFmpeg conversion failed"
        print(f"FFmpeg conversion error: {error_msg}")
        return False, f"Audio conversion failed: {error_msg}"
    except FileNotFoundError:
        error_msg = "FFmpeg executable not found. Please install FFmpeg from https://ffmpeg.org/download.html"
        print(f"ERROR: {error_msg}")
        return False, error_msg
    except subprocess.TimeoutExpired:
        error_msg = "Audio conversion timeout. The file may be too large."
        print(f"ERROR: {error_msg}")
        return False, error_msg
    except Exception as e:
        error_msg = f"Audio conversion error: {str(e)}"
        print(f"FFmpeg Error: {e}")
        return False, error_msg

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'service': 'speaking-scorer'})

@app.route('/score', methods=['POST'])
@app.route('/score-speech', methods=['POST'])
def score_speech():
    try:
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file'}), 400
            
        file = request.files['audio']
        # Support both 'prompt' and 'referenceText' for compatibility
        prompt = request.form.get('prompt', '') or request.form.get('referenceText', '')
        mode = request.form.get('mode', 'roleplay')  # roleplay, shadowing, dubbing
        
        # Save upload
        filename = str(uuid.uuid4())
        webm_path = os.path.join(UPLOAD_FOLDER, f"{filename}.webm")
        wav_path = os.path.join(UPLOAD_FOLDER, f"{filename}.wav")
        file.save(webm_path)
        
        # Convert
        conversion_success, conversion_error = convert_webm_to_wav(webm_path, wav_path)
        if not conversion_success:
            # Cleanup on failure
            try:
                os.remove(webm_path)
            except:
                pass
            return jsonify({
                'error': 'Audio conversion failed', 
                'details': conversion_error or 'FFmpeg is required to convert audio files. Please install FFmpeg and ensure it is in your system PATH.'
            }), 500
        
        # Score using speaking engine
        try:
            result = speaking_engine.score_submission(wav_path, prompt)
        except Exception as engine_error:
            import traceback
            print(f"Speaking engine error: {engine_error}")
            print(traceback.format_exc())
            # Cleanup on failure
            try:
                os.remove(webm_path)
                os.remove(wav_path)
            except:
                pass
            return jsonify({
                'error': 'Scoring engine error',
                'details': str(engine_error)
            }), 500
        
        # Add mode-specific adjustments
        if mode == 'shadowing':
            # Shadowing focuses more on pronunciation/rhythm
            # Adjust weights: 40% content, 60% pronunciation
            result['overall_score'] = round(
                result.get('content_accuracy', 0) * 0.4 + 
                result.get('pronunciation_score', 0) * 0.6, 
                1
            )
        elif mode == 'dubbing':
            # Dubbing focuses on timing and accuracy
            # Similar to roleplay but with timing consideration
            result['overall_score'] = round(
                result.get('content_accuracy', 0) * 0.5 + 
                result.get('pronunciation_score', 0) * 0.5, 
                1
            )
        # roleplay uses default weights (60% content, 40% pronunciation)
        
        # Normalize score to 0-10 scale for consistency
        if result.get('overall_score', 0) > 10:
            result['overall_score'] = round(result['overall_score'] / 10, 1)
        result['score_10'] = result.get('overall_score', 0)
        
        # Cleanup
        try:
            os.remove(webm_path)
            os.remove(wav_path)
        except:
            pass
        
        return jsonify(result)
            
    except Exception as e:
        import traceback
        print(f"Scoring error: {e}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002)