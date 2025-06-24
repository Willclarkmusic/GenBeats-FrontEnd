import os
import random
import subprocess
import sys

# --- Configuration ---
INPUT_DIR = os.path.join("public", "audio", "orig")
OUTPUT_DIR = os.path.join("public", "audio")
FFMPEG_PATH = "ffmpeg"  # Assumes ffmpeg is in the system's PATH

# --- Vibe-based Filenames ---
# A list of 100 evocative filenames.
FILENAMES = [
    "SummerVibes.mp3", "StudyTime.mp3", "DarkChill.mp3", "FreshFeelings.mp3",
    "MidnightLofi.mp3", "CosmicDrift.mp3", "SunsetDrive.mp3", "RetroRewind.mp3",
    "ZenGarden.mp3", "UrbanGlow.mp3", "OceanBreeze.mp3", "StarlightWhisper.mp3",
    "AutumnLeaves.mp3", "DigitalNomad.mp3", "NeonDreams.mp3", "SilentFocus.mp3",
    "SundayMorning.mp3", "RainyDayJazz.mp3", "CityLights.mp3", "LostInThought.mp3",
    "Wavy.mp3", "AfternoonNap.mp3", "GoldenHour.mp3", "MoonlitPath.mp3",
    "FiresideChat.mp3", "CoastalHighway.mp3", "DistantMemories.mp3", "ChilledCow.mp3",
    "KeyboardClicks.mp3", "PeacefulMind.mp3", "MorningCoffee.mp3", "WinterChill.mp3",
    "SpringBlossom.mp3", "EmptyStreets.mp3", "LateNightCoding.mp3", "Wanderlust.mp3",
    "ElectricSheep.mp3", "CloudWatching.mp3", "NostalgicVibes.mp3", "CaliVibes.mp3",
    "TokyoDrift.mp3", "KyotoCalm.mp3", "BerlinBeat.mp3", "ParisianStroll.mp3",
    "LondonFog.mp3", "NYStateOfMind.mp3", "MoscowMood.mp3", "RomeReflection.mp3",
    "VinylCrackles.mp3", "TapeHiss.mp3", "AnalogWarmth.mp3", "PixelPerfect.mp3",
    "BitCrushed.mp3", "FutureFunk.mp3", "Vaporwave.mp3", "SynthwaveSunset.mp3",
    "DialUpDreams.mp3", "FloppyDiskFunk.mp3", "GlitchGarden.mp3", "LoFiLeisure.mp3",
    "LazySunday.mp3", "MellowMorning.mp3", "GroovyAfternoon.mp3", "EasyEvening.mp3",
    "DreamyDaze.mp3", "SmoothSailing.mp3", "CoolBreeze.mp3", "WarmNights.mp3",
    "StarrySkies.mp3", "CosmicDust.mp3", "GalacticGroove.mp3", "InterstellarFunk.mp3",
    "ZeroGravity.mp3", "BlackHoleBlues.mp3", "SupernovaSoul.mp3", "QuasarQuiet.mp3",
    "PulsarPop.mp3", "NebulaNights.mp3", "CometCruise.mp3", "AsteroidAmbience.mp3",
    "ZenithZone.mp3", "NadirNod.mp3", "EclipseEase.mp3", "OrbitChill.mp3",
    "SolsticeSonata.mp3", "EquinoxEase.mp3", "TwilightTones.mp3", "DawnDitty.mp3",
    "DaydreamDisco.mp3", "MindfulMelody.mp3", "FocusFlow.mp3", "CalmCanvas.mp3",
    "SereneSoundscape.mp3", "TranquilTrack.mp3", "PeacefulPulse.mp3", "StillnessSuite.mp3"
]

def check_ffmpeg():
    """Check if ffmpeg is installed and available in the PATH."""
    try:
        subprocess.run([FFMPEG_PATH, "-version"], check=True, capture_output=True)
        print("ffmpeg found.")
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("ERROR: ffmpeg not found. Please install ffmpeg and ensure it is in your system's PATH.")
        return False

def install_ffmpeg_normalize():
    """Install the ffmpeg-normalize library using pip."""
    try:
        import ffmpeg_normalize
        print("ffmpeg-normalize is already installed.")
    except ImportError:
        print("ffmpeg-normalize not found. Installing...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "ffmpeg-normalize"])
            print("ffmpeg-normalize installed successfully.")
        except subprocess.CalledProcessError as e:
            print(f"Error installing ffmpeg-normalize: {e}")
            sys.exit(1)

def process_audio_files():
    """
    Converts all .wav files from the input directory to .mp3 in the output directory,
    normalizes them, and renames them to random evocative names.
    """
    if not check_ffmpeg():
        sys.exit(1)
        
    install_ffmpeg_normalize()
    from ffmpeg_normalize import FFmpegNormalize

    # --- Ensure directories exist ---
    if not os.path.isdir(INPUT_DIR):
        print(f"Error: Input directory not found at '{INPUT_DIR}'")
        return

    if not os.path.isdir(OUTPUT_DIR):
        print(f"Output directory not found at '{OUTPUT_DIR}'. Creating it...")
        os.makedirs(OUTPUT_DIR)

    # --- Get list of WAV files ---
    try:
        wav_files = [f for f in os.listdir(INPUT_DIR) if f.lower().endswith(".wav")]
        if not wav_files:
            print(f"No .wav files found in '{INPUT_DIR}'.")
            return
        print(f"Found {len(wav_files)} .wav files to process.")
    except Exception as e:
        print(f"Error reading from input directory: {e}")
        return

    # --- Shuffle filenames for randomness ---
    random.shuffle(FILENAMES)
    
    # --- Check if we have enough unique names ---
    if len(wav_files) > len(FILENAMES):
        print(f"Warning: Not enough unique filenames ({len(FILENAMES)}) for all .wav files ({len(wav_files)}).")
        # Extend the list with generic names if needed
        needed = len(wav_files) - len(FILENAMES)
        FILENAMES.extend([f"GeneratedTrack_{i+1}.mp3" for i in range(needed)])

    # --- Process each file ---
    normalizer = FFmpegNormalize(
        audio_codec='libmp3lame',
        target_level=-14.0,  # LUFS target for loudness, good for music
        print_stats=False
    )

    for i, wav_file in enumerate(wav_files):
        input_path = os.path.join(INPUT_DIR, wav_file)
        new_filename = FILENAMES[i]
        output_path = os.path.join(OUTPUT_DIR, new_filename)

        print(f"Processing ({i+1}/{len(wav_files)}): '{wav_file}' -> '{new_filename}'")

        try:
            normalizer.add_media_file(input_path, output_path)
        except Exception as e:
            print(f"  Error processing {wav_file}: {e}")
    
    print("\nStarting FFmpeg processing...")
    normalizer.run_normalization()
    print("\nAudio processing complete!")
    print(f"All processed files are in '{OUTPUT_DIR}'.")

if __name__ == "__main__":
    process_audio_files() 