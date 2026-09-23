// ========================================
// حمولتي - Service Worker
// ========================================
//
// استراتيجية التحديث:
//  - رقم نسخة واحد (APP_VERSION) يحدّد اسم الكاش. غيّره مع كل نشر جديد.
//  - عند التثبيت: نجلب كل ملف مباشرة من الشبكة (cache: "reload") بدل
//    الاعتماد على Cache-Control المتصفح، حتى لا تنسخ نسخة الكاش الجديدة
//    ملفات قديمة كانت محفوظة أصلاً في HTTP cache على الجهاز (هذا هو
//    السبب الشائع لبقاء iPhone على نسخة قديمة رغم تغيير اسم الكاش).
//  - عند التفعيل: نحذف تلقائياً أي كاش قديم بأي اسم غير الاسم الحالي
//    (يشمل هذا "hamoulati-v7" وأي اسم سابق آخر) + skipWaiting/clientsClaim
//    حتى يسيطر الإصدار الجديد فوراً على كل الصفحات المفتوحة.
//  - عند الجلب (fetch): نستخدم "network-first" لكل الملفات من نفس
//    الموقع (index.html, script.js, style.css, firebase-config.js...):
//    نحاول الشبكة أولاً دائماً (فنحصل على أحدث نسخة كلما توفر اتصال)،
//    ونحدّث الكاش بالنتيجة، ونستخدم الكاش فقط كبديل عند تعذّر الاتصال
//    (Offline). هذا يحل مشكلة "التحديث ما يوصل iPhone" لأنه لا يعتمد
//    على أن يكتشف المتصفح تغييراً في السكربت ليقرر التحديث؛ كل تحميل
//    صفحة/ملف يحاول يجيب الأحدث مباشرة.
//
// ========================================

const APP_VERSION = "v8";
const CACHE_NAME = "hamoulati-" + APP_VERSION;

const FILES_TO_CACHE = [
    "./",
    "./index.html",
    "./style.css",
    "./script.js",
    "./manifest.json",
    "./firebase-config.js",
    "./icons/icon-180.png",
    "./icons/icon-192.png",
    "./icons/icon-512.png",
    "./icons/favicon-32.png"
];

// ========================================
// التثبيت: تنزيل نسخة جديدة كاملة من الشبكة مباشرة (بدون HTTP cache)
// ========================================

self.addEventListener("install", event => {

    event.waitUntil(
        (async () => {

            const cache = await caches.open(CACHE_NAME);

            await Promise.all(
                FILES_TO_CACHE.map(async (url) => {

                    try {

                        // cache: "reload" يتجاوز الـ HTTP cache في المتصفح
                        // ويجبر الطلب يروح للشبكة، حتى نضمن أن الملفات
                        // المحفوظة بالكاش الجديد فعلاً حديثة.
                        const response = await fetch(url, { cache: "reload" });

                        if (response && response.ok) {
                            await cache.put(url, response);
                        }

                    } catch (error) {

                        console.warn(
                            "حمولتي SW - تعذّر تخزين الملف أثناء التثبيت:",
                            url,
                            error
                        );
                    }
                })
            );

            // تفعيل النسخة الجديدة فوراً بدل انتظار إغلاق كل التبويبات
            await self.skipWaiting();

        })()
    );
});

// ========================================
// التفعيل: حذف أي كاش قديم (بأي اسم سابق) + السيطرة الفورية على الصفحات
// ========================================

self.addEventListener("activate", event => {

    event.waitUntil(
        (async () => {

            const keys = await caches.keys();

            await Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );

            await self.clients.claim();

        })()
    );
});

// ========================================
// الجلب: network-first لكل ملفات الموقع، مع الكاش كبديل عند عدم الاتصال
// ========================================

self.addEventListener("fetch", event => {

    // نتعامل فقط مع طلبات GET من نفس الموقع (نفس ما كان يُخزَّن بالكاش)
    if (event.request.method !== "GET") {
        return;
    }

    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    event.respondWith(
        (async () => {

            try {

                const networkResponse = await fetch(event.request);

                if (networkResponse && networkResponse.ok) {

                    const cache = await caches.open(CACHE_NAME);
                    cache.put(event.request, networkResponse.clone());
                }

                return networkResponse;

            } catch (error) {

                // لا يوجد اتصال بالإنترنت → نرجع لأحدث نسخة محفوظة بالكاش
                const cachedResponse = await caches.match(event.request);

                if (cachedResponse) {
                    return cachedResponse;
                }

                // آخر حل: صفحة البداية من الكاش (يفيد عند التنقل أوفلاين)
                if (event.request.mode === "navigate") {
                    return caches.match("./index.html");
                }

                throw error;
            }
        })()
    );
});
