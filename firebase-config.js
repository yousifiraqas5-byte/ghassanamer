// ========================================
// حمولتي - Firebase Configuration
// ========================================
//
// This file initializes the Firebase app using the Web App configuration
// for the "ghassanamer" Firebase project. The config is safe to include
// in client-side code — it is NOT a secret and does not grant privileged
// access. Only Admin SDK private keys must be kept server-side, and none
// are used in this frontend.
//
// Services initialized:
//   - Cloud Firestore (database for cargo/load requests)
//   - Firebase Authentication (Google Sign-In)
//
// Services NOT needed (not initialized):
//   - Firebase Storage (no file uploads in the app)
//   - Firebase Analytics (optional; omitted for minimal setup)

// Firebase Web App configuration (from Firebase Console / `firebase apps:sdkconfig`)
const firebaseConfig = {
    apiKey: "AIzaSyC5KXBX3eqSPMb6U7mq-UsJbQra9n27mvU",
    authDomain: "ghassanamer.firebaseapp.com",
    projectId: "ghassanamer",
    storageBucket: "ghassanamer.firebasestorage.app",
    messagingSenderId: "600885269127",
    appId: "1:600885269127:web:0a2d625e31e1f15f2bde22",
    measurementId: "G-W1Y5TFESE4"
};

// Initialize Firebase app
const firebaseApp = firebase.initializeApp(firebaseConfig);

// Initialize Cloud Firestore
const db = firebase.firestore();

// Make Firestore instance available globally for script.js to use
window.db = db;
window.firebaseApp = firebaseApp;

// ========================================
// Firebase Authentication (تسجيل الدخول بحساب Google)
// ========================================
// ملاحظة: تهيئة Auth آمنة — إذا ظهر خطأ invalid-api-key
// (مثلاً لأن نطاق الموقع غير مضاف لقيود المفتاح في
// Google Cloud Console) يبقى بقية الموقع يعمل بشكل طبيعي
// ويظهر سبب المشكلة في الكونsole بدل توقّف الصفحة.

let auth = null;

try {

    // Initialize Firebase Authentication
    auth = firebase.auth();

    // Show Firebase's built-in messages in Arabic (we still map our own
    // Arabic messages in script.js for the important cases)
    auth.languageCode = "ar";

} catch (authError) {

    console.error(
        "حمولتي - فشل تهيئة Firebase Authentication:",
        authError && authError.code ? authError.code : authError
    );
}

// Make Auth instance available globally for script.js to use
window.auth = auth;
window.authErrorCode = authError && authError.code ? authError.code : "";

console.log("حمولتي - Firebase initialized:", firebaseApp.name);
