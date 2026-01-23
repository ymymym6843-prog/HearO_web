/**
 * HearO Service Worker
 *
 * 프리렌더링 TTS 파일 캐싱 전략:
 * - Cache-First: 프리렌더링된 오디오/이미지
 * - Network-First: API 요청
 * - Stale-While-Revalidate: 정적 자산
 */

const CACHE_NAME = 'hearo-v1';
const PRERENDER_CACHE = 'hearo-prerender-v1';
const STATIC_CACHE = 'hearo-static-v1';

// 캐시할 프리렌더링 파일 패턴
const PRERENDER_PATTERNS = [
  /\/assets\/prerendered\/tts\/.*\.wav$/,
  /\/assets\/prerendered\/stories\/.*\.txt$/,
  /\/assets\/prerendered\/npc\/.*\.(jpg|png|webp)$/,
  /\/images\/worldviews\/.*\.(jpg|png|webp)$/,
];

// 정적 자산 패턴
const STATIC_PATTERNS = [
  /\.js$/,
  /\.css$/,
  /\.woff2?$/,
  /\.ttf$/,
];

// 네트워크 우선 패턴 (API)
const NETWORK_FIRST_PATTERNS = [
  /\/api\//,
  /supabase\.co/,
];

/**
 * 설치 이벤트
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // 핵심 자산 사전 캐싱
      return cache.addAll([
        '/',
        '/offline.html',
        '/images/logo-icon.png',
      ]).catch((error) => {
        console.warn('[SW] Precache failed:', error);
      });
    })
  );

  // 즉시 활성화
  self.skipWaiting();
});

/**
 * 활성화 이벤트
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');

  event.waitUntil(
    Promise.all([
      // 기존 캐시 정리
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              // 현재 버전이 아닌 캐시 삭제
              return name !== CACHE_NAME &&
                     name !== PRERENDER_CACHE &&
                     name !== STATIC_CACHE;
            })
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      }),
      // 즉시 제어 시작
      self.clients.claim(),
    ])
  );
});

/**
 * Fetch 이벤트
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // POST 요청 등은 캐시하지 않음
  if (request.method !== 'GET') {
    return;
  }

  // 네트워크 우선 (API)
  if (matchesPattern(url.pathname, NETWORK_FIRST_PATTERNS) ||
      url.hostname.includes('supabase')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // 캐시 우선 (프리렌더링)
  if (matchesPattern(url.pathname, PRERENDER_PATTERNS)) {
    event.respondWith(cacheFirst(request, PRERENDER_CACHE));
    return;
  }

  // Stale-While-Revalidate (정적 자산)
  if (matchesPattern(url.pathname, STATIC_PATTERNS)) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  // 기본: 네트워크 시도 후 캐시
  event.respondWith(networkFirst(request));
});

/**
 * 패턴 매칭
 */
function matchesPattern(pathname, patterns) {
  return patterns.some((pattern) => pattern.test(pathname));
}

/**
 * 캐시 우선 전략
 */
async function cacheFirst(request, cacheName = CACHE_NAME) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    console.log('[SW] Cache hit:', request.url);
    return cached;
  }

  try {
    const response = await fetch(request);

    // 성공 응답만 캐시
    if (response.ok) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.error('[SW] Fetch failed:', request.url, error);

    // 오프라인 폴백
    if (request.destination === 'document') {
      const offlinePage = await caches.match('/offline.html');
      if (offlinePage) return offlinePage;
    }

    throw error;
  }
}

/**
 * 네트워크 우선 전략
 */
async function networkFirst(request) {
  try {
    const response = await fetch(request);

    // 성공 시 캐시 업데이트
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    // 네트워크 실패 시 캐시 조회
    const cached = await caches.match(request);

    if (cached) {
      console.log('[SW] Serving from cache (offline):', request.url);
      return cached;
    }

    throw error;
  }
}

/**
 * Stale-While-Revalidate 전략
 */
async function staleWhileRevalidate(request, cacheName = STATIC_CACHE) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // 백그라운드에서 업데이트
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => {
      // 네트워크 실패 무시 (캐시된 버전 사용)
    });

  // 캐시가 있으면 즉시 반환, 없으면 네트워크 대기
  return cached || fetchPromise;
}

/**
 * 프리렌더링 파일 사전 캐싱 (메시지로 트리거)
 */
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  if (type === 'PRECACHE_PRERENDER') {
    // 프리렌더링 파일 목록 캐싱
    const urls = payload.urls || [];

    event.waitUntil(
      caches.open(PRERENDER_CACHE).then(async (cache) => {
        let cached = 0;
        let failed = 0;

        for (const url of urls) {
          try {
            const response = await fetch(url);
            if (response.ok) {
              await cache.put(url, response);
              cached++;
            } else {
              failed++;
            }
          } catch {
            failed++;
          }
        }

        // 결과 보고
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'PRECACHE_COMPLETE',
              payload: { cached, failed, total: urls.length },
            });
          });
        });
      })
    );
  }

  if (type === 'CLEAR_PRERENDER_CACHE') {
    event.waitUntil(caches.delete(PRERENDER_CACHE));
  }
});
