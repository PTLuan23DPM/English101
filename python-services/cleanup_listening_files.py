"""
Clean up listening files: Remove JSON files that don't have corresponding MP3 files
"""
import os
from pathlib import Path

def find_listening_files_dir():
    """Find the listening_file directory"""
    possible_paths = [
        Path(__file__).parent.parent / 'listening_file',
        Path(__file__).parent.parent.parent / 'listening_file',
        Path('C:/Users/ADMIN/Desktop/English101/listening_file'),
        Path('listening_file'),
    ]
    
    for path in possible_paths:
        if path.exists() and path.is_dir():
            return path
    
    return None

def cleanup_listening_files():
    """Remove JSON files that don't have corresponding MP3 files"""
    listening_dir = find_listening_files_dir()
    
    if not listening_dir:
        print("ERROR: Could not find listening_file directory")
        return
    
    print(f"Scanning: {listening_dir}")
    
    removed_count = 0
    kept_count = 0
    
    # Walk through all directories
    for root, dirs, files in os.walk(listening_dir):
        # Skip .git directories
        if '.git' in root:
            continue
        
        for file in files:
            if not file.endswith('.json'):
                continue
            
            json_path = Path(root) / file
            
            # Try to find corresponding MP3 file
            # Check multiple possible MP3 filenames (with/without underscores, quotes, etc.)
            base_name = file.replace('.json', '')
            
            # Possible MP3 filenames
            mp3_candidates = [
                base_name + '.mp3',
                base_name.replace('_', ' ') + '.mp3',
                base_name.replace('_', "'") + '.mp3',
                base_name.replace('_', '') + '.mp3',
            ]
            
            # Also check if JSON has a 'filename' field that points to MP3
            try:
                import json
                with open(json_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    if 'filename' in data:
                        mp3_candidates.insert(0, data['filename'])
            except:
                pass
            
            # Check if any MP3 file exists
            mp3_found = False
            for mp3_candidate in mp3_candidates:
                mp3_path = Path(root) / mp3_candidate
                if mp3_path.exists() and mp3_path.is_file():
                    mp3_found = True
                    break
            
            if not mp3_found:
                # No MP3 found - remove JSON
                print(f"REMOVING: {json_path.relative_to(listening_dir)} (no MP3 found)")
                try:
                    json_path.unlink()
                    removed_count += 1
                except Exception as e:
                    print(f"  ERROR: Could not delete {json_path}: {e}")
            else:
                kept_count += 1
                print(f"KEEPING: {json_path.relative_to(listening_dir)} (has MP3)")
    
    print(f"\n{'='*60}")
    print(f"Cleanup complete!")
    print(f"  Removed: {removed_count} JSON files (no MP3)")
    print(f"  Kept: {kept_count} JSON files (with MP3)")
    print(f"{'='*60}")

if __name__ == '__main__':
    cleanup_listening_files()

