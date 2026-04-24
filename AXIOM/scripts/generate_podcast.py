import os
import re
import subprocess
import sys
import time
import json
from pathlib import Path
from pydub import AudioSegment
from elevenlabs import ElevenLabs

SCRIPT_PATH = "documents/Axiom_Banking_RealEstate_Podcast_Script.md"
OUTPUT_PATH = "documents/Axiom_Banking_RealEstate_Podcast.mp3"
CHUNKS_DIR = "/tmp/podcast_chunks"
PROGRESS_FILE = "/tmp/podcast_progress.json"
STATUS_FILE = "/tmp/podcast_status.txt"

MARCUS_VOICE = "JBFqnCBsd6RMkjVDRZzb"
ISHA_VOICE = "21m00Tcm4TlvDq8ikWAM"

MODEL = "eleven_multilingual_v2"

VOICE_SETTINGS = {
    "stability": 0.45,
    "similarity_boost": 0.8,
    "style": 0.3,
    "use_speaker_boost": True,
}

GAP_MS = 350


def parse_script(path):
    with open(path, "r") as f:
        text = f.read()
    lines = text.split("\n")
    utterances = []
    pattern = re.compile(r"^\[(MARCUS|ISHA)\]:\s*(.+)$")
    for line in lines:
        m = pattern.match(line.strip())
        if m:
            speaker = m.group(1)
            dialogue = m.group(2).strip()
            if dialogue:
                utterances.append((speaker, dialogue))
    return utterances


def chunk_text(text, max_chars=800):
    if len(text) <= max_chars:
        return [text]
    sentences = re.split(r'(?<=[.!?])\s+', text)
    chunks = []
    current = ""
    for s in sentences:
        if current and len(current) + len(s) + 1 > max_chars:
            chunks.append(current.strip())
            current = s
        else:
            current = (current + " " + s).strip()
    if current:
        chunks.append(current.strip())
    return chunks if chunks else [text]


def write_status(msg):
    with open(STATUS_FILE, "w") as f:
        f.write(msg)
    print(msg, flush=True)


def normalize_audio(input_path):
    normalized_path = input_path.replace(".mp3", "_norm.mp3")
    write_status("NORMALIZING: Running ffmpeg-normalize to -16 LUFS...")
    result = subprocess.run(
        [
            "ffmpeg-normalize", input_path,
            "-o", normalized_path,
            "-c:a", "libmp3lame",
            "-b:a", "192k",
            "-t", "-16",
        ],
        capture_output=True, text=True,
    )
    if result.returncode == 0 and os.path.exists(normalized_path):
        os.replace(normalized_path, input_path)
        write_status("NORMALIZING: Loudness normalization complete (-16 LUFS)")
    else:
        write_status(f"NORMALIZING: Warning — normalization failed: {result.stderr[-200:]}")


def generate_audio():
    api_key = os.environ.get("ELEVENLABS_API_KEY")
    if not api_key:
        write_status("ERROR: ELEVENLABS_API_KEY not set")
        return

    client = ElevenLabs(api_key=api_key)
    os.makedirs(CHUNKS_DIR, exist_ok=True)

    completed = set()
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, "r") as f:
            completed = set(json.load(f))

    utterances = parse_script(SCRIPT_PATH)
    write_status(f"RUNNING: {len(completed)}/{len(utterances)} done, resuming...")

    for i, (speaker, text) in enumerate(utterances):
        if str(i) in completed:
            continue

        voice_id = MARCUS_VOICE if speaker == "MARCUS" else ISHA_VOICE
        chunks = chunk_text(text)

        for j, chunk in enumerate(chunks):
            write_status(f"RUNNING: [{i+1}/{len(utterances)}] {speaker} chunk {j+1}/{len(chunks)} ({len(chunk)} chars)")

            max_retries = 3
            for attempt in range(max_retries):
                try:
                    audio_iter = client.text_to_speech.convert(
                        voice_id=voice_id,
                        text=chunk,
                        model_id=MODEL,
                        voice_settings=VOICE_SETTINGS,
                    )
                    chunk_path = os.path.join(CHUNKS_DIR, f"chunk_{i:03d}_{j:03d}.mp3")
                    with open(chunk_path, "wb") as f:
                        for audio_chunk in audio_iter:
                            f.write(audio_chunk)
                    break
                except Exception as e:
                    if attempt < max_retries - 1:
                        wait = 2 ** (attempt + 1)
                        write_status(f"RUNNING: Retry {attempt+1} for [{i+1}]: {e}. Waiting {wait}s...")
                        time.sleep(wait)
                    else:
                        write_status(f"ERROR: Failed [{i+1}] after {max_retries} attempts: {e}")
                        return

            time.sleep(0.25)

        completed.add(str(i))
        with open(PROGRESS_FILE, "w") as f:
            json.dump(list(completed), f)

    write_status("ASSEMBLING: Combining all chunks into final MP3...")

    silence_path = os.path.join(CHUNKS_DIR, "silence.mp3")
    subprocess.run(
        ["ffmpeg", "-y", "-f", "lavfi", "-i", f"anullsrc=r=44100:cl=mono",
         "-t", str(GAP_MS / 1000), "-q:a", "9", silence_path],
        capture_output=True,
    )

    list_file = os.path.join(CHUNKS_DIR, "concat_list.txt")
    chunk_files = sorted(Path(CHUNKS_DIR).glob("chunk_*.mp3"))
    prev_utt = None
    with open(list_file, "w") as f:
        for cf in chunk_files:
            parts = cf.stem.split("_")
            utt_idx = int(parts[1])
            if prev_utt is not None and utt_idx != prev_utt:
                f.write(f"file '{silence_path}'\n")
            prev_utt = utt_idx
            f.write(f"file '{cf}'\n")

    result = subprocess.run(
        ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", list_file,
         "-ab", "192k", "-ar", "44100", OUTPUT_PATH],
        capture_output=True, text=True,
    )

    if result.returncode != 0:
        write_status(f"ERROR: ffmpeg concat failed: {result.stderr[-300:]}")
        return

    probe = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", OUTPUT_PATH],
        capture_output=True, text=True,
    )
    duration_s = float(probe.stdout.strip())
    duration_m = duration_s / 60

    normalize_audio(OUTPUT_PATH)

    for cf in chunk_files:
        cf.unlink()
    silence = Path(silence_path)
    if silence.exists():
        silence.unlink()
    list_path = Path(list_file)
    if list_path.exists():
        list_path.unlink()
    if os.path.exists(PROGRESS_FILE):
        os.remove(PROGRESS_FILE)

    write_status(f"DONE: Saved {OUTPUT_PATH} — {duration_m:.1f} min (normalized to -16 LUFS)")


if __name__ == "__main__":
    generate_audio()
