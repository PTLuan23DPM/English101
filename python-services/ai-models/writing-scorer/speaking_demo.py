from speaking_test import SpeakingTestSystem

system = SpeakingTestSystem()

# User presses button, speaks, auto-stops after 2s silence
results = system.run_test(
    prompt="Please read: The quick brown fox jumps over the lazy dog.",
    use_vad=True
)

print(f"Score: {results['final_score']['final_score']:.2f}/100")