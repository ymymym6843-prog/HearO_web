import random
import os

# ==========================================
# 1. 360도 스카이박스 전용 설정 (수정됨)
# ==========================================

# 스카이박스용 필수 접두사 (Why: 360도 왜곡을 위한 equirectangular 설정)
PREFIX = "360 degree equirectangular panorama, seamless texture, 3D skybox, Ultra-detailed 3D render, volumetric lighting, cinematic atmosphere, 8k resolution, rendered in Unreal Engine 5, wide angle view of"

# 스카이박스용 필수 접미사 (Why: 2:1 비율은 구체(Sphere) 맵핑의 표준)
SUFFIX = "no frame, no border, hdri style. --ar 2:1 --style raw --v 6.0"

# ==========================================
# 2. 세계관별 데이터 (장소 & 시간)
# ==========================================

worlds = {
    "Fantasy": {
        # 판타지: 아스테리아 왕국
        "template": "{prefix} {location} in the Kingdom of Asteria. {time_weather}. Magical atmosphere with floating golden particles. {suffix}",
        "locations": [
            "an Ancient magic library with floating books",
            "a Crystal training chamber with glowing shards",
            "Floating stone platforms in the sky",
            "an Enchanted forest clearing with magical flowers",
            "a Wizard tower interior with scrolls",
            "an Arcane rune circle glowing on the ground",
            "a Moonlit sanctuary with silver water",
            "a Magical waterfall cave with blue light",
            "a Starry observation deck with telescopes",
            "a Dragon's lair entrance with treasure",
            "an Alchemist's workshop with bubbling potions",
            "a Glowing mushroom grove in a dark forest",
            "Ancient temple ruins covered in vines",
            "Floating islands connected by light bridges",
            "a Portal chamber with a swirling vortex",
            "a Sacred spring with healing water",
            "a Spell casting arena with barriers",
            "an Elven garden with white marble structures",
            "a Phoenix nest on a high peak",
            "an Enchanted mirror hall with reflections"
        ],
        "times": [
            "at warm sunset with purple clouds",
            "under a starry night sky with two moons",
            "in a mysterious foggy morning",
            "during a magical eclipse event"
        ]
    },
    "Sports": {
        # 스포츠: 챔피언스 리그
        "template": "{prefix} {location}. {time_weather}. High energy atmosphere with golden lighting (#ffd700). View from the center looking out. {suffix}",
        "locations": [
            "a Modern gym interior with high-tech equipment",
            "an Olympic training center with large windows",
            "a Stadium locker room with uniforms",
            "an Outdoor running track at dawn",
            "a Professional Boxing ring arena",
            "an Olympic Swimming pool lane with clear water",
            "a Pro Basketball court with polished wood",
            "a Soccer field sideline view",
            "a Heavy Weight room with dumbbells",
            "a Peaceful Yoga studio with sunlight",
            "a Medal podium with spotlights",
            "a Sports rehabilitation room with sensors",
            "a Press conference room with microphones",
            "a Champions wall hall of fame",
            "a Training field at sunset",
            "an Ice skating rink with reflections",
            "a Tennis court stadium",
            "an Indoor Climbing wall facility",
            "a Marathon finish line with confetti",
            "a Sports science lab with monitors"
        ],
        "times": [
            "during a championship final match night",
            "during a bright afternoon training session",
            "under dramatic stadium floodlights",
            "in the quiet moments before the game"
        ]
    },
    "Idol": {
        # 아이돌: 스타라이트 엔터
        "template": "{prefix} {location}. {time_weather}. K-pop style with pink (#ff69b4) and purple lighting. Sparkling and dreamy vibe. {suffix}",
        "locations": [
            "a Dance practice room with full-wall mirrors",
            "a Professional Recording studio booth",
            "a Huge Concert stage with LED screens",
            "a Neon lit backstage corridor",
            "a Makeup room vanity with lights",
            "a Pastel colored Music video set",
            "a Fan meeting venue with gifts",
            "a Rooftop photoshoot set with city view",
            "a Vocal training booth with piano",
            "an Entertainment agency fancy lobby",
            "an Award show red carpet event",
            "an Idol dorm living room with plushies",
            "a Debut showcase stage with smoke effects",
            "a Trendy Street fashion district",
            "a Concert hall filled with Light stick ocean",
            "an Album jacket shooting studio",
            "a Practice room mirror selfie spot",
            "a Dream stage with a single spotlight",
            "a Music show waiting room with name tags",
            "a Fan event cafe with decorations"
        ],
        "times": [
            "filled with confetti and excitement",
            "with emotional and soft moody lighting",
            "bursting with bright energetic pop lights",
            "with a dreamy spotlight on the center"
        ]
    },
    "SF": {
        # SF: U.S.S. 노바호
        "template": "{prefix} {location} inside U.S.S. Nova. {time_weather}. Cyan (#00d4ff) and blue holographic interfaces. Futuristic and sleek. {suffix}",
        "locations": [
            "a Space station corridor with white panels",
            "a Holographic control room with star maps",
            "a Cryo chamber room with sleeping pods",
            "a Zero gravity training sphere",
            "a Cybernetic enhancement lab with arms",
            "a Spaceship cockpit with window view",
            "a Planet observation deck with glass floor",
            "an AI core mainframe server room",
            "a Neon city skyline visible from window",
            "an Android assembly line factory",
            "a Teleportation chamber with beams",
            "a Laser grid training room",
            "a Quantum computer room with cables",
            "an Alien planet surface with strange plants",
            "a Futuristic Medical bay with scanners",
            "a Warp drive engine room with blue core",
            "a Virtual reality nexus hub",
            "a Mars colony dome interior",
            "an Energy shield generator room",
            "Floating data streams in a dark room"
        ],
        "times": [
            "with deep space stars visible outside",
            "during a red alert emergency situation",
            "in calm standard operating mode",
            "with mysterious glowing alien artifacts"
        ]
    },
    "Zombie": {
        # 좀비: 뉴호프
        "template": "{prefix} {location}. {time_weather}. Green toxic atmosphere (#4caf50). Ruins and nature reclaiming the city. {suffix}",
        "locations": [
            "an Underground bunker with metal doors",
            "a Makeshift medical lab with plastic curtains",
            "a Barricaded safe house living room",
            "an Abandoned hospital hallway",
            "a Supply storage room with shelves",
            "a Rooftop survivor camp with tents",
            "an Overgrown city street with vines",
            "a Military checkpoint with fences",
            "an Emergency radio tower on a hill",
            "a Vaccination center with debris",
            "a Quarantine zone with warning signs",
            "a Survivor training ground with targets",
            "a Weapon crafting workshop with tools",
            "a Food greenhouse dome on a roof",
            "a Night watch tower with searchlight",
            "an Abandoned mall atrium",
            "a Refugee camp with campfires",
            "a Fortified school entrance",
            "a City skyline at dawn over ruins",
            "a Hope community garden with corn"
        ],
        "times": [
            "in heavy rain and thunder",
            "under a dark green toxic sky",
            "in a foggy gray dawn",
            "at pitch black night with flickering lights"
        ]
    },
    "Spy": {
        # 스파이: 에이전시 쉐도우
        "template": "{prefix} {location}. {time_weather}. Purple (#9c27b0) and neon accents. Mysterious and sleek spy movie vibe. {suffix}",
        "locations": [
            "a Secret underground base operations room",
            "a High-tech surveillance room with screens",
            "a Laser grid training hallway",
            "a Disguise wardrobe room with mirrors",
            "a Dark Interrogation chamber with one light",
            "a Gadget laboratory with prototypes",
            "a Casino operation floor with tables",
            "a Rooftop helipad at night",
            "a Mission briefing room with holograms",
            "an Encrypted server room with cables",
            "a Night city infiltration point",
            "an Embassy ballroom with chandeliers",
            "a Safe house apartment with weapon wall",
            "a Submarine interior corridor",
            "a Mountain fortress exterior in snow",
            "a Villain's lair office with shark tank",
            "an Escape vehicle garage with sports cars",
            "a Satellite control center",
            "a Passport forging desk with stamps",
            "a Double agent meetup spot in a park"
        ],
        "times": [
            "with dark dramatic shadows",
            "illuminated by cold blue monitor lights",
            "during a intense rainy night",
            "with a sunrise viewing the city skyline"
        ]
    }
}

# ==========================================
# 3. 실행 및 파일 저장
# ==========================================

def generate_prompts():
    all_prompts = []
    
    print("🚀 HearO 스카이박스 프롬프트 생성을 시작합니다... (2:1 Ratio)")

    for world_name, data in worlds.items():
        print(f"   - Processing: {world_name} (20 locations)...")
        
        for location in data["locations"]:
            # 각 장소마다 시간/날씨를 랜덤하게 하나 선택
            selected_time = random.choice(data["times"])
            
            # 템플릿 적용
            prompt = data["template"].format(
                prefix=PREFIX,
                location=location,
                time_weather=selected_time,
                suffix=SUFFIX
            )
            
            all_prompts.append(f"[{world_name}] {prompt}\n")

    # 결과 파일 저장
    file_name = "hearo_skybox_prompts.txt"
    try:
        with open(file_name, "w", encoding="utf-8") as f:
            f.write("\n".join(all_prompts))
        
        print(f"\n✅ 완료! 총 {len(all_prompts)}개의 프롬프트가 생성되었습니다.")
        print(f"📂 파일 위치: {os.path.abspath(file_name)}")
        print("👉 팁: 이제 Gemini나 Midjourney가 2:1 비율의 360도용 이미지를 만들어줍니다.")
        
    except Exception as e:
        print(f"\n❌ 파일 저장 중 오류 발생: {e}")

if __name__ == "__main__":
    generate_prompts()