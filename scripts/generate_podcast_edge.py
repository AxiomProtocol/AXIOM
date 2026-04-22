import asyncio
import os
import re
import subprocess
from pathlib import Path
import edge_tts

SCRIPT_PATH = "documents/Axiom_Banking_RealEstate_Podcast_Script.md"
OUTPUT_PATH = "documents/Axiom_Banking_RealEstate_Podcast.mp3"
CHUNKS_DIR = "/tmp/podcast_edge_chunks"

MARCUS_VOICE = "en-US-GuyNeural"
ISHA_VOICE = "en-US-JennyNeural"

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


async def generate_audio():
    os.makedirs(CHUNKS_DIR, exist_ok=True)
    utterances = parse_script(SCRIPT_PATH)
    print(f"Parsed {len(utterances)} utterances from script")

    for i, (speaker, text) in enumerate(utterances):
        voice = MARCUS_VOICE if speaker == "MARCUS" else ISHA_VOICE
        chunk_path = os.path.join(CHUNKS_DIR, f"chunk_{i:03d}.mp3")

        if os.path.exists(chunk_path) and os.path.getsize(chunk_path) > 0:
            print(f"  [{i+1}/{len(utterances)}] {speaker} — cached", flush=True)
            continue

        print(f"  [{i+1}/{len(utterances)}] {speaker} ({len(text)} chars)", flush=True)
        comm = edge_tts.Communicate(text, voice)
        await comm.save(chunk_path)

    print("Assembling final MP3 with ffmpeg...", flush=True)

    silence_path = os.path.join(CHUNKS_DIR, "silence.mp3")
    subprocess.run(
        ["ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono",
         "-t", str(GAP_MS / 1000), "-q:a", "9", silence_path],
        capture_output=True,
    )

    list_file = os.path.join(CHUNKS_DIR, "concat_list.txt")
    chunk_files = sorted(Path(CHUNKS_DIR).glob("chunk_*.mp3"))
    with open(list_file, "w") as f:
        for idx, cf in enumerate(chunk_files):
            if idx > 0:
                f.write(f"file '{silence_path}'\n")
            f.write(f"file '{cf}'\n")

    raw_path = OUTPUT_PATH.replace(".mp3", "_raw.mp3")
    result = subprocess.run(
        ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", list_file,
         "-ab", "192k", "-ar", "44100", raw_path],
        capture_output=True, text=True,
    )

    if result.returncode != 0:
        print(f"ERROR: ffmpeg concat failed: {result.stderr[-300:]}")
        return

    print("Normalizing to -16 LUFS...", flush=True)
    norm_result = subprocess.run(
        ["ffmpeg-normalize", raw_path,
         "-o", OUTPUT_PATH,
         "-c:a", "libmp3lame",
         "-b:a", "192k",
         "-t", "-16"],
        capture_output=True, text=True,
    )

    if norm_result.returncode == 0:
        os.remove(raw_path)
        print("Normalization complete.", flush=True)
    else:
        os.replace(raw_path, OUTPUT_PATH)
        print(f"Normalization warning: {norm_result.stderr[-200:]}", flush=True)

    probe = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", OUTPUT_PATH],
        capture_output=True, text=True,
    )
    duration_s = float(probe.stdout.strip())
    duration_m = duration_s / 60
    size_mb = os.path.getsize(OUTPUT_PATH) / 1024 / 1024

    print(f"DONE: {OUTPUT_PATH} — {duration_m:.1f} min, {size_mb:.1f} MB, -16 LUFS")

    for cf in chunk_files:
        cf.unlink()
    for tmp in [silence_path, list_file]:
        if os.path.exists(tmp):
            os.remove(tmp)


if __name__ == "__main__":
    asyncio.run(generate_audio())
