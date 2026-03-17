/**
 * Service Worker
 *
 * 提供离线功能和缓存管理
 */

const CACHE_NAME = 'webgeodb-offline-v1';
const OFFLINE_CACHE = 'webgeodb-offline-tiles';

// 需要缓存的资源
const CACHE_URLS = [
  '/',
  '/index.html',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// 安装Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] 安装中...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] 缓存资源...');
        return cache.addAll(CACHE_URLS);
      })
      .then(() => {
        console.log('[SW] 安装完成');
        // 强制激活
        return self.skipWaiting();
      })
  );
});

// 激活Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] 激活中...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // 删除旧缓存
            if (cacheName !== CACHE_NAME && cacheName !== OFFLINE_CACHE) {
              console.log('[SW] 删除旧缓存:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] 激活完成');
        // 立即控制所有客户端
        return self.clients.claim();
      })
  );
});

// 拦截网络请求
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 处理瓦片请求
  if (url.hostname.includes('tile.openstreetmap.org')) {
    event.respondWith(handleTileRequest(event.request));
    return;
  }

  // 处理其他请求
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 缓存命中，返回缓存
        if (response) {
          console.log('[SW] 缓存命中:', event.request.url);
          return response;
        }

        // 缓存未命中，发起网络请求
        return fetch(event.request)
          .then((response) => {
            // 检查是否为有效响应
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // 克隆响应（响应流只能使用一次）
            const responseToCache = response.clone();

            // 缓存新资源
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // 网络请求失败，返回离线页面（如果存在）
            return caches.match('/offline.html');
          });
      })
  );
});

/**
 * 处理瓦片请求
 */
async function handleTileRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const z = parseInt(url.pathname.split('/')[1]);
  const x = parseInt(url.pathname.split('/')[2]);
  const y = parseInt(url.pathname.split('/')[3].replace('.png', ''));

  const cacheKey = `${z}-${x}-${y}`;

  // 尝试从缓存获取
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    console.log('[SW] 瓦片缓存命中:', cacheKey);
    return cachedResponse;
  }

  // 尝试从IndexedDB获取
  try {
    // 注意: Service Worker中无法直接访问IndexedDB
    // 这里简化处理，直接发起网络请求
    const response = await fetch(request);

    if (response.ok) {
      // 缓存瓦片
      const responseToCache = response.clone();
      caches.open(OFFLINE_CACHE).then((cache) => {
        cache.put(request, responseToCache);
      });
    }

    return response;
  } catch (error) {
    console.error('[SW] 瓦片请求失败:', cacheKey, error);

    // 返回空白瓦片
    return new Response(
      generateEmptyTile(),
      {
        headers: {
          'Content-Type': 'image/png'
        }
      }
    );
  }
}

/**
 * 生成空白瓦片
 */
function generateEmptyTile(): ArrayBuffer {
  // 1x1像素的透明PNG
  const hex = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  const binaryString = atob(hex);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// 监听消息
self.addEventListener('message', (event) => {
  console.log('[SW] 收到消息:', event.data);

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME);
    caches.delete(OFFLINE_CACHE);
  }
});

export {};
