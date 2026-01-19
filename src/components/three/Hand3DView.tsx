'use client';

console.log('[Hand3DView 파일] 모듈 로드됨');

/**
 * 3D 손 모델 뷰어 컴포넌트
 * FBX 손 모델을 로드하고 MediaPipe 랜드마크로 애니메이션
 */

import { useRef, useEffect, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import type { HandLandmarkPoint } from '@/types/hand';

interface Hand3DViewProps {
  landmarks: HandLandmarkPoint[] | null;
  mirror?: boolean;
  backgroundColor?: string;
}

// MediaPipe 랜드마크 인덱스
const LM = {
  WRIST: 0,
  THUMB_CMC: 1, THUMB_MCP: 2, THUMB_IP: 3, THUMB_TIP: 4,
  INDEX_MCP: 5, INDEX_PIP: 6, INDEX_DIP: 7, INDEX_TIP: 8,
  MIDDLE_MCP: 9, MIDDLE_PIP: 10, MIDDLE_DIP: 11, MIDDLE_TIP: 12,
  RING_MCP: 13, RING_PIP: 14, RING_DIP: 15, RING_TIP: 16,
  PINKY_MCP: 17, PINKY_PIP: 18, PINKY_DIP: 19, PINKY_TIP: 20,
};

// 로딩 컴포넌트
function Loader() {
  return (
    <Html center>
      <div className="text-center text-white">
        <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2" />
        <p className="text-sm">로딩중...</p>
      </div>
    </Html>
  );
}

// 두 벡터 사이 각도 계산
function getAngle(
  p1: HandLandmarkPoint,
  p2: HandLandmarkPoint,
  p3: HandLandmarkPoint
): number {
  const v1 = { x: p2.x - p1.x, y: p2.y - p1.y, z: p2.z - p1.z };
  const v2 = { x: p3.x - p2.x, y: p3.y - p2.y, z: p3.z - p2.z };

  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);

  if (mag1 === 0 || mag2 === 0) return 0;
  return Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2))));
}

// FBX 손 모델 컴포넌트
function FBXHandModel({
  landmarks,
  mirror,
}: {
  landmarks: HandLandmarkPoint[] | null;
  mirror: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const bonesRef = useRef<Map<string, THREE.Bone>>(new Map());
  const initRotsRef = useRef<Map<string, THREE.Euler>>(new Map());
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // FBX 모델 로드
  useEffect(() => {
    console.log('[Hand3D] FBX 로드 시작');
    const loader = new FBXLoader();

    loader.load(
      '/models/hand/right_hand.fbx',
      (fbx) => {
        console.log('[Hand3D] FBX 로드 성공');

        // 스케일 및 회전
        fbx.scale.setScalar(0.1);
        fbx.rotation.set(-Math.PI / 2, 0, Math.PI);

        // 뼈대 및 메시 수집 - skeleton에서 직접 가져오기
        const bones = new Map<string, THREE.Bone>();
        const initRots = new Map<string, THREE.Euler>();

        fbx.traverse((child) => {
          if (child instanceof THREE.SkinnedMesh && child.skeleton) {
            console.log('[Hand3D] SkinnedMesh 발견:', child.name);
            console.log('[Hand3D] Skeleton bones 수:', child.skeleton.bones.length);

            // skeleton에서 뼈대 가져오기
            child.skeleton.bones.forEach((bone) => {
              bones.set(bone.name, bone);
              initRots.set(bone.name, bone.rotation.clone());
              console.log('[Hand3D] 뼈대:', bone.name);
            });
          }
        });

        console.log('[Hand3D] 총 뼈대 수:', bones.size);
        console.log('[Hand3D] 뼈대 이름들:', Array.from(bones.keys()).join(', '));

        bonesRef.current = bones;
        initRotsRef.current = initRots;
        modelRef.current = fbx;
        setLoaded(true);
      },
      (progress) => {
        if (progress.total > 0) {
          console.log('[Hand3D] 로딩:', Math.round(progress.loaded / progress.total * 100), '%');
        }
      },
      (err) => {
        console.error('[Hand3D] FBX 로드 실패:', err);
        setError('FBX 로드 실패');
      }
    );
  }, []);

  const frameCountRef = useRef(0);

  // 매 프레임 업데이트
  useFrame(() => {
    if (!loaded || !modelRef.current || !landmarks || landmarks.length < 21) {
      return;
    }

    // TypeScript narrowing을 위한 로컬 참조 (null 체크 이후)
    const lm = landmarks;
    const bones = bonesRef.current;
    const initRots = initRotsRef.current;
    frameCountRef.current++;

    // 50프레임마다 디버그 로그
    const shouldLog = frameCountRef.current % 50 === 1;

    // 손목 위치로 모델 이동
    if (groupRef.current) {
      const wrist = lm[LM.WRIST];
      const x = (mirror ? 1 - wrist.x : wrist.x) - 0.5;
      const y = -(wrist.y - 0.5);
      groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, x * 2, 0.3);
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, y * 2, 0.3);

      if (shouldLog) {
        console.log('[Hand3D] 위치:', groupRef.current.position.x.toFixed(2), groupRef.current.position.y.toFixed(2));
      }
    }

    // 손가락 회전 적용
    applyFinger('index', LM.INDEX_MCP, LM.INDEX_PIP, LM.INDEX_DIP, LM.INDEX_TIP, shouldLog);
    applyFinger('middle', LM.MIDDLE_MCP, LM.MIDDLE_PIP, LM.MIDDLE_DIP, LM.MIDDLE_TIP, false);
    applyFinger('ring', LM.RING_MCP, LM.RING_PIP, LM.RING_DIP, LM.RING_TIP, false);
    applyPinky(shouldLog);
    applyThumb(shouldLog);

    function applyFinger(name: string, mcp: number, pip: number, dip: number, tip: number, log: boolean) {
      // 실제 뼈대 이름: handsb_r_* (b가 있음!)
      const bone1 = bones.get(`handsb_r_${name}1`);
      const bone2 = bones.get(`handsb_r_${name}2`);
      const bone3 = bones.get(`handsb_r_${name}3`);

      // 각 관절 굽힘 각도
      const angle1 = getAngle(lm[LM.WRIST], lm[mcp], lm[pip]);
      const angle2 = getAngle(lm[mcp], lm[pip], lm[dip]);
      const angle3 = getAngle(lm[pip], lm[dip], lm[tip]);

      if (log) {
        console.log(`[${name}] bone1:`, !!bone1, 'angle1:', angle1.toFixed(3), 'angle2:', angle2.toFixed(3));
      }

      // Z축 회전 적용 (손가락 굽힘 방향)
      if (bone1) {
        const init = initRots.get(`handsb_r_${name}1`);
        const targetZ = (init?.z || 0) + angle1 * 0.8;
        bone1.rotation.z = THREE.MathUtils.lerp(bone1.rotation.z, targetZ, 0.4);
        if (log) console.log(`[${name}1] rotation.z:`, bone1.rotation.z.toFixed(3));
      }
      if (bone2) {
        const init = initRots.get(`handsb_r_${name}2`);
        const targetZ = (init?.z || 0) + angle2 * 0.8;
        bone2.rotation.z = THREE.MathUtils.lerp(bone2.rotation.z, targetZ, 0.4);
      }
      if (bone3) {
        const init = initRots.get(`handsb_r_${name}3`);
        const targetZ = (init?.z || 0) + angle3 * 0.8;
        bone3.rotation.z = THREE.MathUtils.lerp(bone3.rotation.z, targetZ, 0.4);
      }
    }

    function applyPinky(log: boolean) {
      // pinky는 pinky0부터 시작 (4개 뼈대)
      const bone0 = bones.get('handsb_r_pinky0');
      const bone1 = bones.get('handsb_r_pinky1');
      const bone2 = bones.get('handsb_r_pinky2');
      const bone3 = bones.get('handsb_r_pinky3');

      const angle0 = getAngle(lm[LM.WRIST], lm[LM.PINKY_MCP], lm[LM.PINKY_PIP]);
      const angle1 = getAngle(lm[LM.PINKY_MCP], lm[LM.PINKY_PIP], lm[LM.PINKY_DIP]);
      const angle2 = getAngle(lm[LM.PINKY_PIP], lm[LM.PINKY_DIP], lm[LM.PINKY_TIP]);

      if (log) {
        console.log('[pinky] bone0:', !!bone0, 'angles:', angle0.toFixed(3), angle1.toFixed(3));
      }

      // Z축 회전
      if (bone0) {
        const init = initRots.get('handsb_r_pinky0');
        bone0.rotation.z = THREE.MathUtils.lerp(bone0.rotation.z, (init?.z || 0) + angle0 * 0.6, 0.4);
      }
      if (bone1) {
        const init = initRots.get('handsb_r_pinky1');
        bone1.rotation.z = THREE.MathUtils.lerp(bone1.rotation.z, (init?.z || 0) + angle0 * 0.6, 0.4);
      }
      if (bone2) {
        const init = initRots.get('handsb_r_pinky2');
        bone2.rotation.z = THREE.MathUtils.lerp(bone2.rotation.z, (init?.z || 0) + angle1 * 0.8, 0.4);
      }
      if (bone3) {
        const init = initRots.get('handsb_r_pinky3');
        bone3.rotation.z = THREE.MathUtils.lerp(bone3.rotation.z, (init?.z || 0) + angle2 * 0.8, 0.4);
      }
    }

    function applyThumb(log: boolean) {
      // 실제 뼈대 이름: handsb_r_thumb* (thumb1부터 시작)
      const bone1 = bones.get('handsb_r_thumb1');
      const bone2 = bones.get('handsb_r_thumb2');
      const bone3 = bones.get('handsb_r_thumb3');

      const angle1 = getAngle(lm[LM.WRIST], lm[LM.THUMB_CMC], lm[LM.THUMB_MCP]);
      const angle2 = getAngle(lm[LM.THUMB_CMC], lm[LM.THUMB_MCP], lm[LM.THUMB_IP]);
      const angle3 = getAngle(lm[LM.THUMB_MCP], lm[LM.THUMB_IP], lm[LM.THUMB_TIP]);

      if (log) {
        console.log('[thumb] bone1:', !!bone1, 'angles:', angle1.toFixed(3), angle2.toFixed(3), angle3.toFixed(3));
      }

      // 엄지는 Z축 회전
      if (bone1) {
        const init = initRots.get('handsb_r_thumb1');
        bone1.rotation.z = THREE.MathUtils.lerp(bone1.rotation.z, (init?.z || 0) + angle1 * 0.6, 0.4);
      }
      if (bone2) {
        const init = initRots.get('handsb_r_thumb2');
        bone2.rotation.z = THREE.MathUtils.lerp(bone2.rotation.z, (init?.z || 0) + angle2 * 0.6, 0.4);
      }
      if (bone3) {
        const init = initRots.get('handsb_r_thumb3');
        bone3.rotation.z = THREE.MathUtils.lerp(bone3.rotation.z, (init?.z || 0) + angle3 * 0.6, 0.4);
      }
    }
  });

  if (error) {
    return (
      <Html center>
        <div className="text-red-500 text-sm">{error}</div>
      </Html>
    );
  }

  if (!loaded || !modelRef.current) {
    return <Loader />;
  }

  return (
    <group ref={groupRef}>
      <primitive object={modelRef.current} />
    </group>
  );
}

// 메인 뷰 컴포넌트
export function Hand3DView({
  landmarks,
  mirror = true,
  backgroundColor = '#1a1a2e',
}: Hand3DViewProps) {
  // 컴포넌트 마운트 로그
  useEffect(() => {
    console.log('[Hand3DView] 컴포넌트 마운트됨');
    return () => console.log('[Hand3DView] 컴포넌트 언마운트됨');
  }, []);

  // 랜드마크 변경 로그
  useEffect(() => {
    if (landmarks) {
      console.log('[Hand3DView] 랜드마크 수신:', landmarks.length, '개');
    }
  }, [landmarks?.length]);

  return (
    <div className="w-full h-full relative" style={{ backgroundColor }}>
      <Canvas
        camera={{ position: [0, 0, 2], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={() => console.log('[Hand3DView] Canvas 생성됨')}
      >
        <Suspense fallback={<Loader />}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <directionalLight position={[-5, 5, -5]} intensity={0.5} />
          <pointLight position={[0, 0, 3]} intensity={0.5} />

          <color attach="background" args={[backgroundColor]} />

          <FBXHandModel landmarks={landmarks} mirror={mirror} />

          <OrbitControls enablePan={true} enableZoom={true} />
        </Suspense>
      </Canvas>

      <div className="absolute bottom-2 left-2 text-white/70 text-xs bg-black/50 px-2 py-1 rounded">
        {landmarks ? '손 감지됨' : '손을 보여주세요'}
      </div>
    </div>
  );
}

export default Hand3DView;
