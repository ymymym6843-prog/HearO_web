#!/usr/bin/env python3
"""
HearO Web MVP TTS 생성 - Gemini 2.5 Flash/Pro TTS

MVP 운동 6개에 대한 TTS 음성 파일 생성
- 기존 유지: squat, plank_hold, high_knees (이미 생성됨)
- 신규 생성: lunge, bicep_curl, arm_raise

사용법:
    set GEMINI_API_KEY=your_api_key
    python generate_tts_gemini.py
    python generate_tts_gemini.py --worldview fantasy
    python generate_tts_gemini.py --exercise lunge
    python generate_tts_gemini.py --dry-run
    python generate_tts_gemini.py --new-only  # 신규 운동만 생성
"""

import os
import sys
import json
import time
import argparse
import base64
import wave
import io
import requests
from pathlib import Path
from typing import Dict, Any, Optional, List

# ============================================================
# 설정
# ============================================================

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
OUTPUT_DIR = PROJECT_ROOT / "public" / "assets" / "prerendered" / "tts"
STORIES_FILE = PROJECT_ROOT / "public" / "assets" / "prerendered" / "stories" / "all_stories.json"
PROGRESS_FILE = SCRIPT_DIR / ".tts_gemini_progress.json"

# 전체 세계관 (6개)
ALL_WORLDVIEWS = ["fantasy", "sports", "idol", "sf", "zombie", "spy"]

# MVP 운동 목록 (6개)
MVP_EXERCISES = [
    "squat",       # 기존 (TTS 있음)
    "lunge",       # 신규 (TTS 필요)
    "bicep_curl",  # 신규 (TTS 필요)
    "arm_raise",   # 신규 (TTS 필요)
    "high_knees",  # 기존 (TTS 있음)
    "plank_hold",  # 기존 (TTS 있음)
]

# 신규 생성 필요한 운동 (TTS 없음)
NEW_EXERCISES = ["lunge", "bicep_curl", "arm_raise"]

# 기존 TTS 있는 운동
EXISTING_EXERCISES = ["squat", "high_knees", "plank_hold"]

# 등급
GRADES = ["perfect", "good", "normal"]

# Gemini TTS API 설정
GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"
TTS_MODEL = "gemini-2.5-flash-preview-tts"  # Flash 모델 우선 사용
TTS_MODEL_FALLBACK = "gemini-2.5-pro-preview-tts"  # Pro 모델 폴백

# ============================================================
# 음성 스타일 정의
# ============================================================

VOICE_STYLES = {
    "neutral": "",
    "expressive": "[Expressive, emotive tone] ",
    "dramatic": "[Dramatic, theatrical delivery] ",
    "gentle": "[Soft, gentle voice] ",
    "energetic": "[Energetic, upbeat tone] ",
}

# 세계관별 음성 설정
WORLDVIEW_VOICE_SETTINGS = {
    "fantasy": {
        "character": "현자 엘더린",
        "gender": "male",
        "voice_name": "Zubenelgenubi",
        "base_rate": 0.85,
        "grade_styles": {
            "perfect": {"style": "dramatic", "rate": 0.8, "description": "위대한 영웅을 축하하는 장엄한 예언"},
            "good": {"style": "gentle", "rate": 0.85, "description": "따뜻하게 격려하는 현자의 축복"},
            "normal": {"style": "expressive", "rate": 0.88, "description": "희망을 전하는 자애로운 조언"}
        }
    },
    "sports": {
        "character": "코치 박",
        "gender": "male",
        "voice_name": "Algieba",
        "base_rate": 1.05,
        "grade_styles": {
            "perfect": {"style": "energetic", "rate": 1.1, "description": "챔피언의 승리를 축하하는 환호"},
            "good": {"style": "expressive", "rate": 1.05, "description": "성과를 인정하는 열정적 격려"},
            "normal": {"style": "energetic", "rate": 1.08, "description": "다음 도전을 응원하는 파이팅"}
        }
    },
    "idol": {
        "character": "매니저 수진",
        "gender": "female",
        "voice_name": "Achernar",
        "base_rate": 1.0,
        "grade_styles": {
            "perfect": {"style": "expressive", "rate": 1.05, "description": "데뷔 성공을 축하하는 감격"},
            "good": {"style": "gentle", "rate": 1.0, "description": "따뜻하게 칭찬하는 언니 톤"},
            "normal": {"style": "expressive", "rate": 1.02, "description": "꿈을 응원하는 친근한 격려"}
        }
    },
    "sf": {
        "character": "AI 아리아",
        "gender": "female",
        "voice_name": "Autonoe",
        "base_rate": 1.05,
        "grade_styles": {
            "perfect": {"style": "expressive", "rate": 1.0, "description": "감정을 배운 AI의 기쁨"},
            "good": {"style": "neutral", "rate": 1.05, "description": "차분한 분석과 인정"},
            "normal": {"style": "gentle", "rate": 1.02, "description": "인간적 따뜻함을 담은 격려"}
        }
    },
    "zombie": {
        "character": "닥터 리",
        "gender": "male",
        "voice_name": "Enceladus",
        "base_rate": 1.08,
        "grade_styles": {
            "perfect": {"style": "expressive", "rate": 1.05, "description": "생존 성공의 안도"},
            "good": {"style": "neutral", "rate": 1.08, "description": "차분한 의료인 격려"},
            "normal": {"style": "expressive", "rate": 1.1, "description": "희망을 전하는 생존자"}
        }
    },
    "spy": {
        "character": "핸들러 오메가",
        "gender": "male",
        "voice_name": "Charon",
        "base_rate": 0.88,
        "grade_styles": {
            "perfect": {"style": "dramatic", "rate": 0.85, "description": "임무 완수를 인정하는 절제된 칭찬"},
            "good": {"style": "neutral", "rate": 0.88, "description": "냉철하지만 인정하는"},
            "normal": {"style": "gentle", "rate": 0.9, "description": "다음 임무를 위한 격려"}
        }
    }
}

# ============================================================
# 헬퍼 함수
# ============================================================

def get_voice_settings(worldview: str, grade: str) -> Dict[str, Any]:
    """세계관 + 등급별 음성 설정 반환"""
    settings = WORLDVIEW_VOICE_SETTINGS[worldview]
    grade_settings = settings["grade_styles"][grade]
    return {
        "character": settings["character"],
        "voice_name": settings["voice_name"],
        "style": grade_settings["style"],
        "rate": grade_settings["rate"],
        "description": grade_settings["description"]
    }

def load_stories() -> Dict:
    """스토리 JSON 로드"""
    if not STORIES_FILE.exists():
        print(f"[ERROR] 스토리 파일 없음: {STORIES_FILE}")
        sys.exit(1)
    with open(STORIES_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def load_progress() -> Dict:
    """진행 상황 로드"""
    if PROGRESS_FILE.exists():
        with open(PROGRESS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"completed": [], "failed": [], "skipped": []}

def save_progress(progress: Dict) -> None:
    """진행 상황 저장"""
    with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
        json.dump(progress, f, indent=2, ensure_ascii=False)

def get_file_key(worldview: str, exercise: str, grade: str) -> str:
    """파일 키 생성"""
    return f"{worldview}/{exercise}_{grade}"

# ============================================================
# Gemini TTS API
# ============================================================

def call_gemini_tts_api(
    text: str,
    voice_settings: Dict[str, Any],
    api_key: str,
    use_fallback: bool = False
) -> Optional[bytes]:
    """Gemini TTS API 호출"""
    model = TTS_MODEL_FALLBACK if use_fallback else TTS_MODEL
    model_name = "Pro" if use_fallback else "Flash"

    try:
        style = voice_settings["style"]
        style_prefix = VOICE_STYLES.get(style, "")
        styled_text = style_prefix + text

        url = f"{GEMINI_API_BASE}/{model}:generateContent"
        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": api_key
        }

        payload = {
            "contents": [{"parts": [{"text": styled_text}]}],
            "generationConfig": {
                "responseModalities": ["AUDIO"],
                "speechConfig": {
                    "voiceConfig": {
                        "prebuiltVoiceConfig": {
                            "voiceName": voice_settings["voice_name"]
                        }
                    }
                }
            }
        }

        max_retries = 2
        for retry in range(max_retries):
            response = requests.post(url, headers=headers, json=payload, timeout=60)

            if response.status_code == 429:
                if not use_fallback:
                    print(f"      [FALLBACK] {model_name} rate limit -> Pro")
                    return call_gemini_tts_api(text, voice_settings, api_key, use_fallback=True)
                wait_time = 30 + (30 * retry)
                print(f"      [RATE_LIMIT] {wait_time}초 대기 ({retry + 1}/{max_retries})")
                time.sleep(wait_time)
                continue
            break

        if response.status_code == 429:
            print(f"      [RATE_LIMIT] 재시도 횟수 초과")
            return None

        if response.status_code == 403:
            if not use_fallback:
                print(f"      [FALLBACK] {model_name} 할당량 초과 -> Pro")
                return call_gemini_tts_api(text, voice_settings, api_key, use_fallback=True)
            print(f"      [QUOTA] 할당량 초과 - 한도 리셋 필요")
            return None

        if response.status_code != 200:
            if not use_fallback:
                return call_gemini_tts_api(text, voice_settings, api_key, use_fallback=True)
            print(f"      [ERROR] API 오류: {response.status_code}")
            return None

        data = response.json()
        audio_data = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("inlineData", {})

        if not audio_data.get("data"):
            if not use_fallback:
                return call_gemini_tts_api(text, voice_settings, api_key, use_fallback=True)
            print(f"      [ERROR] 오디오 데이터 없음")
            return None

        audio_bytes = base64.b64decode(audio_data["data"])
        if use_fallback:
            print(f"      [OK] Pro 모델 사용")
        return audio_bytes

    except requests.exceptions.Timeout:
        if not use_fallback:
            return call_gemini_tts_api(text, voice_settings, api_key, use_fallback=True)
        print(f"      [TIMEOUT]")
        return None
    except Exception as e:
        if not use_fallback:
            return call_gemini_tts_api(text, voice_settings, api_key, use_fallback=True)
        print(f"      [ERROR] {e}")
        return None

def pcm_to_wav(pcm_data: bytes, sample_rate: int = 24000) -> bytes:
    """PCM -> WAV 변환"""
    wav_buffer = io.BytesIO()
    with wave.open(wav_buffer, 'wb') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(pcm_data)
    return wav_buffer.getvalue()

def save_audio_file(audio_data: bytes, output_path: Path) -> bool:
    """오디오 파일 저장"""
    try:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        wav_data = pcm_to_wav(audio_data)
        with open(output_path, "wb") as f:
            f.write(wav_data)
        return True
    except Exception as e:
        print(f"      [ERROR] 저장 실패: {e}")
        return False

# ============================================================
# TTS 생성
# ============================================================

def generate_tts(
    worldview: str,
    exercise: str,
    grade: str,
    text: str,
    api_key: str,
    dry_run: bool = False
) -> bool:
    """TTS 생성"""
    voice_settings = get_voice_settings(worldview, grade)
    output_path = OUTPUT_DIR / worldview / f"{exercise}_{grade}.wav"

    print(f"\n[TTS] {worldview}/{exercise}_{grade}")
    print(f"      캐릭터: {voice_settings['character']}")
    print(f"      스타일: {voice_settings['style']}")
    print(f"      텍스트: {text[:50]}...")

    if dry_run:
        print(f"      [DRY-RUN] 건너뜀")
        return True

    audio_data = call_gemini_tts_api(text, voice_settings, api_key)
    if audio_data is None:
        return False

    if save_audio_file(audio_data, output_path):
        file_size = output_path.stat().st_size / 1024
        print(f"      [OK] 저장됨 ({file_size:.1f}KB)")
        return True
    return False

# ============================================================
# 메인
# ============================================================

def main():
    parser = argparse.ArgumentParser(description="HearO Web MVP TTS 생성")
    parser.add_argument("--dry-run", action="store_true", help="실제 생성 없이 확인만")
    parser.add_argument("--worldview", "-w", choices=ALL_WORLDVIEWS, help="특정 세계관만")
    parser.add_argument("--exercise", "-e", choices=MVP_EXERCISES, help="특정 운동만")
    parser.add_argument("--new-only", action="store_true", help="신규 운동만 (lunge, bicep_curl, arm_raise)")
    parser.add_argument("--reset", action="store_true", help="진행 상황 초기화")
    parser.add_argument("--retry-failed", action="store_true", help="실패한 항목만 재시도")
    parser.add_argument("--api-key", "-k", default=os.environ.get("GEMINI_API_KEY"))
    args = parser.parse_args()

    api_key = args.api_key
    if not api_key and not args.dry_run:
        print("[ERROR] Gemini API 키 필요")
        print("        set GEMINI_API_KEY=your_api_key")
        sys.exit(1)

    stories = load_stories()

    if args.reset:
        progress = {"completed": [], "failed": [], "skipped": []}
        save_progress(progress)
        print("[INFO] 진행 상황 초기화")
    else:
        progress = load_progress()

    # 대상 결정
    worldviews = [args.worldview] if args.worldview else ALL_WORLDVIEWS

    if args.exercise:
        exercises = [args.exercise]
    elif args.new_only:
        exercises = NEW_EXERCISES
    else:
        exercises = MVP_EXERCISES

    total = len(worldviews) * len(exercises) * len(GRADES)

    print(f"""
============================================================
HearO Web MVP TTS 생성 - Gemini 2.5 Flash/Pro
============================================================
세계관: {', '.join(worldviews)}
운동: {', '.join(exercises)}
등급: perfect, good, normal
총 파일: {total}개
============================================================
""")

    success_count = 0
    fail_count = 0
    skip_count = 0

    for worldview in worldviews:
        if worldview not in stories:
            print(f"[WARN] 세계관 없음: {worldview}")
            continue

        for exercise in exercises:
            if exercise not in stories[worldview]:
                print(f"[WARN] 운동 스토리 없음: {worldview}/{exercise}")
                continue

            for grade in GRADES:
                file_key = get_file_key(worldview, exercise, grade)

                if args.retry_failed:
                    if file_key not in progress.get("failed", []):
                        continue
                elif file_key in progress["completed"]:
                    skip_count += 1
                    continue

                text = stories[worldview][exercise].get(grade)
                if not text:
                    print(f"[WARN] 텍스트 없음: {file_key}")
                    continue

                success = generate_tts(worldview, exercise, grade, text, api_key, args.dry_run)

                if success:
                    success_count += 1
                    if file_key not in progress["completed"]:
                        progress["completed"].append(file_key)
                    if file_key in progress.get("failed", []):
                        progress["failed"].remove(file_key)
                else:
                    fail_count += 1
                    if "failed" not in progress:
                        progress["failed"] = []
                    if file_key not in progress["failed"]:
                        progress["failed"].append(file_key)

                save_progress(progress)

                if not args.dry_run:
                    time.sleep(8)  # Rate limit 방지

    print(f"""
============================================================
결과
============================================================
성공: {success_count}개
실패: {fail_count}개
스킵: {skip_count}개
총 완료: {len(progress['completed'])}개
============================================================
""")

    if fail_count > 0:
        print(f"[TIP] 실패 재시도: python generate_tts_gemini.py --retry-failed")

if __name__ == "__main__":
    main()
