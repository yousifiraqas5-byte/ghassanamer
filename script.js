// ========================================
// حمولتي - Main JavaScript
// ========================================


// ========================================
// حالة عامة
// ========================================

// معرّف الحمولة المختارة حالياً لتقديم عرض سعر عليها
let currentOfferLoadId = null;

// تتبّع مستمعي العروض (onSnapshot) المفتوحين لكل حمولة
// لتجنّب فتح أكثر من مستمع لنفس الحمولة
const offersListeners = {};

// مستمع طلبات النقل الحالي
// (يُستخدم لإعادة التحميل من Firestore عند السحب Pull-to-Refresh)
let loadsUnsubscribe = null;

// تسميات وحدة الوزن للعرض
const WEIGHT_UNIT_LABELS = {
    kg: "كغم",
    ton: "طن"
};

// تسميات حالة الحمولة
const LOAD_STATUS_LABELS = {
    available: "متاح",
    accepted: "تم الاتفاق"
};

// تسميات حالة العرض
const OFFER_STATUS_LABELS = {
    pending: "قيد الانتظار",
    accepted: "مقبول",
    rejected: "مرفوض"
};


// ========================================
// فتح نموذج إضافة حمولة
// ========================================

function showCargoForm() {

    const modal = document.getElementById("cargoModal");

    if (modal) {
        modal.classList.add("active");
        document.body.style.overflow = "hidden";
    }
}


// ========================================
// إغلاق النموذج
// ========================================

function closeModal() {

    const modal = document.getElementById("cargoModal");

    if (modal) {
        modal.classList.remove("active");
        document.body.style.overflow = "";
    }
}


// ========================================
// عرض طلبات النقل
// ========================================

function showAvailableLoads() {

    const loadsSection =
        document.querySelector(".loads-section");

    if (loadsSection) {

        loadsSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }
}


// ========================================
// تنسيق الوقت النسبي
// ========================================

function formatRelativeTime(timestamp) {

    if (!timestamp || typeof timestamp.toDate !== "function") {
        return "الآن";
    }

    const date = timestamp.toDate();
    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) {
        return "الآن";
    }

    if (diffMinutes < 60) {
        return "منذ " + diffMinutes + " دقيقة";
    }

    const diffHours = Math.floor(diffMinutes / 60);

    if (diffHours < 24) {
        return "منذ " + diffHours + " ساعة";
    }

    const diffDays = Math.floor(diffHours / 24);

    return "منذ " + diffDays + " يوم";
}


// ========================================
// تنسيق الوزن مع الوحدة
// ========================================

function formatWeight(weight, unit) {

    const unitLabel = WEIGHT_UNIT_LABELS[unit] || "طن";

    const weightNumber = Number(weight);

    const weightText = isNaN(weightNumber)
        ? weight
        : weightNumber.toLocaleString("ar-IQ");

    return weightText + " " + unitLabel;
}


// ========================================
// نشر طلب الحمولة (Firebase)
// ========================================

function publishCargo() {

    if (!window.db) {
        alert("تعذّر الاتصال بقاعدة البيانات. حاول مرة أخرى.");
        return;
    }

    const from =
        document.getElementById("fromLocation").value.trim();

    const to =
        document.getElementById("toLocation").value.trim();

    const cargo =
        document.getElementById("cargoType").value.trim();

    const weightRaw =
        document.getElementById("cargoWeight").value.trim();

    const weightUnit =
        document.getElementById("cargoWeightUnit").value;

    const truck =
        document.getElementById("truckType").value;

    const price =
        document.getElementById("cargoPrice").value.trim();


    // التحقق من البيانات

    if (!from ||
        !to ||
        !cargo ||
        !weightRaw ||
        !truck ||
        !price) {

        alert(
            "يرجى إكمال جميع معلومات الحمولة."
        );

        return;
    }

    const weightNumber = Number(weightRaw);

    if (isNaN(weightNumber) || weightNumber <= 0) {

        alert(
            "يرجى إدخال وزن صحيح (أرقام فقط)."
        );

        return;
    }

    const priceNumber = Number(price);

    if (isNaN(priceNumber) || priceNumber <= 0) {

        alert(
            "يرجى إدخال سعر مقترح صحيح."
        );

        return;
    }


    const submitBtn = document.querySelector(
        "#cargoModal .submit-btn"
    );

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "جارِ النشر...";
    }


    db.collection("loads").add({
        fromLocation: from,
        toLocation: to,
        cargoType: cargo,
        cargoWeight: weightNumber,
        cargoWeightUnit: weightUnit,
        truckType: truck,
        cargoPrice: priceNumber,
        status: "available",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    })

        .then(function () {

            alert(
                "تم نشر طلب النقل بنجاح 🚛"
            );

            closeModal();

            // تنظيف الحقول

            document.getElementById("fromLocation").value = "";
            document.getElementById("toLocation").value = "";
            document.getElementById("cargoType").value = "";
            document.getElementById("cargoWeight").value = "";
            document.getElementById("cargoWeightUnit").value = "ton";
            document.getElementById("truckType").value = "";
            document.getElementById("cargoPrice").value = "";

        })

        .catch(function (error) {

            console.error("Error publishing cargo:", error);

            alert(
                "حدث خطأ أثناء نشر الطلب. حاول مرة أخرى."
            );

        })

        .finally(function () {

            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = "نشر طلب النقل";
            }

        });
}


// ========================================
// عرض قائمة الحمولات (Realtime من Firebase)
// ========================================

function renderLoad(id, data) {

    const statusLabel =
        LOAD_STATUS_LABELS[data.status] || "متاح";

    const statusClass =
        data.status === "accepted"
            ? "load-status accepted"
            : "load-status";

    const timeLabel = formatRelativeTime(data.createdAt);

    const weightLabel = formatWeight(
        data.cargoWeight,
        data.cargoWeightUnit
    );

    const priceLabel = Number(data.cargoPrice || 0)
        .toLocaleString("ar-IQ");

    const acceptDisabled =
        data.status === "accepted" ? "disabled" : "";

    const article = document.createElement("article");
    article.className = "load-card";
    article.id = "load-" + id;

    article.innerHTML =
        '<div class="load-top">' +
            '<span class="' + statusClass + '">' + statusLabel + '</span>' +
            '<span class="load-time">' + timeLabel + '</span>' +
        '</div>' +

        '<h3>' + data.fromLocation + ' → ' + data.toLocation + '</h3>' +

        '<div class="load-info">' +
            '<div>📦 <span>' + data.cargoType + '</span></div>' +
            '<div>⚖️ <span>' + weightLabel + '</span></div>' +
            '<div>🚛 <span>' + data.truckType + '</span></div>' +
        '</div>' +

        '<div class="load-bottom">' +
            '<strong>' + priceLabel + ' د.ع</strong>' +
            '<button class="accept-btn" ' + acceptDisabled +
                ' onclick="acceptLoad(\'' + id + '\')">أوافق على الطلب</button>' +
            '<button class="offer-btn" ' + acceptDisabled +
                ' onclick="openOfferModal(\'' + id + '\')">قدّم عرض سعر</button>' +
        '</div>' +

        '<button class="offers-toggle" onclick="toggleOffers(\'' + id + '\')">' +
            'عرض العروض (<span id="offersCount-' + id + '">0</span>)' +
        '</button>' +

        '<div class="offers-list" id="offersList-' + id + '"></div>';

    return article;
}

function listenToLoads(onFirstSnapshot, fromServer) {

    if (!window.db) {
        return;
    }

    // لا نفتح أكثر من مستمع واحد لنفس القائمة
    // (يُستخدم عند إعادة التحميل بالسحب Pull-to-Refresh)
    if (typeof loadsUnsubscribe === "function") {

        try {
            loadsUnsubscribe();
        } catch (error) {
            console.warn("حمولتي - تعذّر إيقاف مستمع طلبات النقل:", error);
        }

        loadsUnsubscribe = null;
    }

    // إشعار واحد بعد أول نتيجة (ناجحة أو فاشلة)
    let firstSnapshotNotified = false;

    const notifyFirstSnapshot = function () {

        if (firstSnapshotNotified) {
            return;
        }

        firstSnapshotNotified = true;

        if (typeof onFirstSnapshot === "function") {
            onFirstSnapshot();
        }
    };

    const loadsQuery =
        db.collection("loads").orderBy("createdAt", "desc");

    const handleLoadsSnapshot = function (snapshot) {

        const loadsList =
            document.getElementById("loadsList");

        if (!loadsList) {

            notifyFirstSnapshot();

            return;
        }

        if (snapshot.empty) {

            loadsList.innerHTML =
                '<p class="loads-empty">' +
                'لا توجد طلبات نقل حالياً.' +
                '</p>';

            notifyFirstSnapshot();

            return;
        }

        loadsList.innerHTML = "";

        snapshot.forEach(function (doc) {

            const card = renderLoad(doc.id, doc.data());
            loadsList.appendChild(card);

        });

        notifyFirstSnapshot();

    };


    const handleLoadsError = function (error) {

        console.error("Error loading loads:", error);

        const loadsList =
            document.getElementById("loadsList");

        if (loadsList) {

            loadsList.innerHTML =
                '<p class="loads-empty">' +
                'تعذّر تحميل طلبات النقل.' +
                '</p>';

        }

        notifyFirstSnapshot();

        // إذا تعذّرت القراءة من الخادم (مثلاً بدون إنترنت)
        // نرجع للمستمع العادي حتى تبقى القائمة حيّة
        if (fromServer) {

            window.setTimeout(function () {
                listenToLoads();
            }, 0);
        }

    };


    try {

        // عند إعادة التحميل بالسحب نقرأ من الخادم مباشرة،
        // وعند التشغيل العادي نستخدم المصدر الافتراضي (الكاش ثم الخادم)
        loadsUnsubscribe = fromServer
            ? loadsQuery.onSnapshot(
                  { source: "server" },
                  handleLoadsSnapshot,
                  handleLoadsError
              )
            : loadsQuery.onSnapshot(
                  handleLoadsSnapshot,
                  handleLoadsError
              );

    } catch (listenError) {

        console.warn(
            "حمولتي - تعذّر فتح مستمع من الخادم، نستخدم المستمع العادي:",
            listenError
        );

        loadsUnsubscribe = loadsQuery.onSnapshot(
            handleLoadsSnapshot,
            handleLoadsError
        );
    }
}

// ========================================
// قبول طلب نقل (Firebase)
// ========================================

function acceptLoad(loadId) {

    if (!window.db) {
        alert("تعذّر الاتصال بقاعدة البيانات. حاول مرة أخرى.");
        return;
    }

    const confirmed = confirm(
        "هل تريد الموافقة على طلب النقل؟"
    );

    if (!confirmed) {
        return;
    }

    db.collection("loads").doc(loadId).update({
        status: "accepted",
        acceptedAt: firebase.firestore.FieldValue.serverTimestamp()
    })

        .then(function () {

            alert(
                "تم إرسال موافقتك على الطلب 🚛\n\n" +
                "سيظهر لصاحب الحمولة أنك مهتم بالطلب."
            );

        })

        .catch(function (error) {

            console.error("Error accepting load:", error);

            alert(
                "حدث خطأ أثناء إرسال الموافقة. حاول مرة أخرى."
            );

        });
}


// ========================================
// عروض الأسعار (Firebase)
// ========================================

function openOfferModal(loadId) {

    currentOfferLoadId = loadId;

    const modal = document.getElementById("offerModal");

    if (modal) {
        modal.classList.add("active");
        document.body.style.overflow = "hidden";
    }
}

function closeOfferModal() {

    const modal = document.getElementById("offerModal");

    if (modal) {
        modal.classList.remove("active");
        document.body.style.overflow = "";
    }

    currentOfferLoadId = null;

    const priceInput = document.getElementById("offerPrice");

    if (priceInput) {
        priceInput.value = "";
    }
}

function submitOffer() {

    if (!window.db) {
        alert("تعذّر الاتصال بقاعدة البيانات. حاول مرة أخرى.");
        return;
    }

    if (!currentOfferLoadId) {
        alert("حدث خطأ، يرجى إعادة المحاولة.");
        return;
    }

    const priceInput = document.getElementById("offerPrice");
    const price = priceInput ? priceInput.value.trim() : "";
    const priceNumber = Number(price);

    if (!price || isNaN(priceNumber) || priceNumber <= 0) {

        alert(
            "يرجى إدخال سعر عرض صحيح."
        );

        return;
    }

    const loadId = currentOfferLoadId;

    const submitBtn = document.querySelector(
        "#offerModal .submit-btn"
    );

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "جارِ الإرسال...";
    }

    db.collection("offers").add({
        loadId: loadId,
        price: priceNumber,
        status: "pending",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    })

        .then(function () {

            alert("تم إرسال عرض السعر بنجاح 💰");

            closeOfferModal();

        })

        .catch(function (error) {

            console.error("Error submitting offer:", error);

            alert(
                "حدث خطأ أثناء إرسال العرض. حاول مرة أخرى."
            );

        })

        .finally(function () {

            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = "إرسال العرض";
            }

        });
}


// ========================================
// عرض/إخفاء عروض حمولة معيّنة
// ========================================

function renderOfferItem(offerId, loadId, data) {

    const statusLabel =
        OFFER_STATUS_LABELS[data.status] || "قيد الانتظار";

    const statusClass = "offer-status offer-status-" +
        (data.status || "pending");

    const priceLabel = Number(data.price || 0)
        .toLocaleString("ar-IQ");

    const timeLabel = formatRelativeTime(data.createdAt);

    const acceptButton = data.status === "pending"
        ? '<button class="offer-accept-btn" onclick="acceptOffer(\'' +
            offerId + '\', \'' + loadId + '\', ' + Number(data.price || 0) +
            ')">قبول العرض</button>'
        : "";

    const item = document.createElement("div");
    item.className = "offer-item";

    item.innerHTML =
        '<div class="offer-item-info">' +
            '<strong>' + priceLabel + ' د.ع</strong>' +
            '<span class="' + statusClass + '">' + statusLabel + '</span>' +
            '<small>' + timeLabel + '</small>' +
        '</div>' +
        acceptButton;

    return item;
}

function toggleOffers(loadId) {

    const offersList = document.getElementById("offersList-" + loadId);

    if (!offersList) {
        return;
    }

    const isOpen = offersList.classList.contains("open");

    if (isOpen) {
        offersList.classList.remove("open");
        return;
    }

    offersList.classList.add("open");

    // إذا كان هناك مستمع فعلاً لهذه الحمولة، لا داعي لفتح آخر
    if (offersListeners[loadId]) {
        return;
    }

    subscribeOffers(loadId);
}


// ========================================
// فتح مستمع عروض حمولة معيّنة
// (يُستخدم أيضاً لإعادة تحميل العروض عند السحب للتحديث)
// ========================================

function subscribeOffers(loadId) {

    const offersList = document.getElementById("offersList-" + loadId);

    if (!offersList) {
        return;
    }

    if (!window.db) {
        return;
    }

    offersList.innerHTML =
        '<p class="offers-loading">جارِ تحميل العروض...</p>';

    const unsubscribe = db.collection("offers")
        .where("loadId", "==", loadId)
        .orderBy("createdAt", "desc")
        .onSnapshot(

            function (snapshot) {

                const countEl =
                    document.getElementById("offersCount-" + loadId);

                if (countEl) {
                    countEl.textContent = snapshot.size;
                }

                if (snapshot.empty) {

                    offersList.innerHTML =
                        '<p class="offers-empty">لا توجد عروض بعد.</p>';

                    return;
                }

                offersList.innerHTML = "";

                snapshot.forEach(function (doc) {

                    const item = renderOfferItem(
                        doc.id,
                        loadId,
                        doc.data()
                    );

                    offersList.appendChild(item);

                });

            },

            function (error) {

                console.error("Error loading offers:", error);

                offersList.innerHTML =
                    '<p class="offers-empty">تعذّر تحميل العروض.</p>';

            }
        );

    offersListeners[loadId] = unsubscribe;
}


// ========================================
// قبول عرض سعر معيّن
// ========================================

function acceptOffer(offerId, loadId, price) {

    if (!window.db) {
        alert("تعذّر الاتصال بقاعدة البيانات. حاول مرة أخرى.");
        return;
    }

    const confirmed = confirm(
        "هل تريد قبول هذا العرض بسعر " +
        Number(price).toLocaleString("ar-IQ") +
        " د.ع؟"
    );

    if (!confirmed) {
        return;
    }

    const batch = db.batch();

    const offerRef = db.collection("offers").doc(offerId);

    batch.update(offerRef, {
        status: "accepted",
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    const loadRef = db.collection("loads").doc(loadId);

    batch.update(loadRef, {
        status: "accepted",
        acceptedOfferId: offerId,
        acceptedPrice: price,
        acceptedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    batch.commit()

        .then(function () {

            // رفض بقية العروض المعلّقة لنفس الحمولة

            return db.collection("offers")
                .where("loadId", "==", loadId)
                .where("status", "==", "pending")
                .get();

        })

        .then(function (pendingOffers) {

            if (pendingOffers.empty) {
                return;
            }

            const rejectBatch = db.batch();

            pendingOffers.forEach(function (doc) {

                rejectBatch.update(doc.ref, {
                    status: "rejected",
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

            });

            return rejectBatch.commit();

        })

        .then(function () {

            alert("تم قبول العرض بنجاح ✅");

        })

        .catch(function (error) {

            console.error("Error accepting offer:", error);

            alert(
                "حدث خطأ أثناء قبول العرض. حاول مرة أخرى."
            );

        });
}


// ========================================
// الصفحة الرئيسية
// ========================================

function goHome() {

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


// ========================================
// الحساب
// ========================================

function showProfile() {

    const modal = document.getElementById("accountModal");

    if (!modal) {
        return;
    }

    modal.classList.add("active");
    document.body.style.overflow = "hidden";

    if (!window.auth) {

        showAccountGeneralError(
            "خدمة تسجيل الدخول غير متوفّرة حالياً. حدّث الصفحة وحاول مرة أخرى."
        );

        showAccountView("loggedOut");

        return;
    }

    hideAccountGeneralError();

    // مسجّل دخول مسبقاً → نعرض بيانات حسابه مباشرة

    if (currentUser) {

        if (currentUserProfile && currentUserProfile.name) {

            renderProfileView(currentUser, currentUserProfile);

            return;
        }

        loadUserProfile(currentUser)

            .then(function (profile) {

                currentUserProfile = profile;

                updateAccountNavState(currentUser);

                if (profile && profile.name) {

                    renderProfileView(currentUser, profile);

                    return;
                }

                prepareNameView(currentUser);
                showAccountView("name");

            })

            .catch(function (error) {

                console.error("Error loading user profile:", error);

                showAccountGeneralError(
                    "تعذّر تحميل بيانات حسابك. تحقق من الاتصال بالإنترنت."
                );

            });

        return;
    }

    showAccountView("loggedOut");
}



// ========================================
// إغلاق النافذة عند الضغط خارجها
// ========================================

const cargoModal =
    document.getElementById("cargoModal");

if (cargoModal) {

    cargoModal.addEventListener(
        "click",
        function (event) {

            if (event.target === cargoModal) {
                closeModal();
            }

        }
    );
}

const offerModalEl =
    document.getElementById("offerModal");

if (offerModalEl) {

    offerModalEl.addEventListener(
        "click",
        function (event) {

            if (event.target === offerModalEl) {
                closeOfferModal();
            }

        }
    );
}


// ========================================
// تشغيل الموقع
// ========================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        console.log(
            "🚛 حمولتي - تم تشغيل الموقع بنجاح"
        );

        listenToLoads();

        // تشغيل نظام الحساب (تسجيل الدخول برقم الهاتف)
        initAccountAuth();

        // تشغيل ميزة السحب للتحديث (Pull-to-Refresh)
        initPullToRefresh();

        // السماح بإدخال أرقام فقط في حقل الوزن

        const weightInput = document.getElementById("cargoWeight");

        if (weightInput) {

            weightInput.addEventListener("input", function () {

                weightInput.value =
                    weightInput.value.replace(/[^0-9]/g, "");

            });

        }

    }
);


// ========================================
// نظام الحساب وتسجيل الدخول برقم الهاتف
// (Firebase Authentication - Phone / OTP)
// ========================================

// المستخدم الحالي من Firebase Auth
let currentUser = null;

// ملف المستخدم من Firestore (مجموعة users)
let currentUserProfile = null;

// نتيجة إرسال رمز التحقق (مطلوبة لتأكيد الرمز)
let confirmationResult = null;

// أداة reCAPTCHA المطلوبة لتسجيل الدخول بالهاتف على الويب
let recaptchaVerifier = null;

// رقم الهاتف (بصيغة E.164) الذي أُرسل إليه الرمز
let pendingPhoneNumber = "";

// مؤقّت السماح بإعادة إرسال الرمز
let otpResendTimer = null;

// عدد الثواني قبل السماح بإعادة إرسال الرمز
const OTP_RESEND_DELAY = 60;

// رمز العراق الدولي
const IRAQ_COUNTRY_CODE = "964";

// معرّفات عروض نافذة الحساب داخل الصفحة
const ACCOUNT_VIEW_IDS = {
    loggedOut: "accountLoggedOutView",
    phone: "accountPhoneView",
    otp: "accountOtpView",
    name: "accountNameView",
    profile: "accountProfileView"
};

// أرقام عربية (٠-٩) وفارسية (۰-۹) لتحويلها إلى أرقام لاتينية
const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const EXTENDED_ARABIC_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

// رسائل أخطاء تسجيل الدخول بالعربي
const AUTH_ERROR_MESSAGES = {
    "auth/invalid-phone-number":
        "رقم الهاتف غير صحيح. اكتب رقم موبايل عراقي مثل 07701234567 أو +9647701234567.",
    "auth/missing-phone-number":
        "يرجى إدخال رقم الهاتف أولاً.",
    "auth/too-many-requests":
        "صارت محاولات كثيرة على هذا الرقم. انتظر قليلاً ثم حاول مرة أخرى.",
    "auth/quota-exceeded":
        "تم تجاوز الحد المسموح لإرسال رسائل التحقق. حاول لاحقاً.",
    "auth/invalid-verification-code":
        "رمز التحقق خاطئ. تأكد من الرمز واكتبه مرة أخرى.",
    "auth/code-expired":
        "انتهت صلاحية رمز التحقق. اضغط على «إعادة إرسال الرمز».",
    "auth/invalid-verification-id":
        "انتهت صلاحية جلسة التحقق. اضغط على «إعادة إرسال الرمز».",
    "auth/session-expired":
        "انتهت صلاحية جلسة التحقق. اضغط على «إعادة إرسال الرمز».",
    "auth/captcha-check-failed":
        "فشل التحقق من reCAPTCHA. أعد المحاولة من جديد.",
    "auth/missing-app-credential":
        "تعذّر تجهيز التحقق (reCAPTCHA). حدّث الصفحة وحاول مرة أخرى.",
    "auth/invalid-app-credential":
        "تعذّر التحقق من reCAPTCHA. حدّث الصفحة وحاول مرة أخرى.",
    "auth/unauthorized-domain":
        "هذا النطاق غير مصرّح به في Firebase Authentication. أضف نطاق الموقع من إعدادات Firebase.",
    "auth/operation-not-allowed":
        "تسجيل الدخول بالهاتف غير مفعّل في Firebase. فعّل Phone من صفحة Sign-in method.",
    "auth/billing-not-enabled":
        "خدمة رسائل التحقق غير مفعّلة (المشروع يحتاج تفعيل الفاتورة).",
    "auth/network-request-failed":
        "تعذّر الاتصال بالإنترنت. تحقق من الشبكة وحاول مرة أخرى.",
    "auth/user-disabled":
        "تم إيقاف هذا الحساب. تواصل مع الدعم.",
    "auth/internal-error":
        "حدث خطأ داخلي في خدمة تسجيل الدخول. حاول مرة أخرى.",
    "auth/argument-error":
        "تعذّر إكمال العملية. تأكد من الرقم وحاول مرة أخرى."
};

// ========================================
// تحويل الأرقام العربية/الفارسية إلى أرقام لاتينية
// ========================================

function toLatinDigits(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)

        .replace(/[٠-٩]/g, function (digit) {
            return String(ARABIC_INDIC_DIGITS.indexOf(digit));
        })

        .replace(/[۰-۹]/g, function (digit) {
            return String(EXTENDED_ARABIC_DIGITS.indexOf(digit));
        });
}


// ========================================
// تحويل رقم الهاتف العراقي إلى صيغة E.164
// يقبل: 07701234567 / 7701234567 / 9647701234567
//        +9647701234567 / 009647701234567 / 96407701234567
// ويرجّع "+9647701234567" بدون تكرار مفتاح الدولة
// ويرجّع "" إذا الرقم غير صحيح
// ========================================

function normalizeIraqiPhone(rawValue) {

    if (rawValue === null || rawValue === undefined) {
        return "";
    }

    // نُبقي الأرقام فقط (نحذف المسافات والشرطات وعلامة +)
    let value = toLatinDigits(rawValue).replace(/[^0-9]/g, "");

    if (!value) {
        return "";
    }

    // صيغة الاتصال الدولية: 00964... تصير 964...
    if (value.indexOf("00" + IRAQ_COUNTRY_CODE) === 0) {
        value = value.slice(2);
    }

    // إذا كتب المستخدم مفتاح الدولة مع صفر زائد:
    // 96407701234567 تصير 9647701234567
    if (value.indexOf(IRAQ_COUNTRY_CODE + "0") === 0) {

        value =
            IRAQ_COUNTRY_CODE +
            value.slice(IRAQ_COUNTRY_CODE.length + 1).replace(/^0+/, "");
    }

    // لا نكرّر مفتاح الدولة: نضيفه فقط إذا الرقم ما يبدأ بيه
    if (value.indexOf(IRAQ_COUNTRY_CODE) !== 0) {
        value = IRAQ_COUNTRY_CODE + value.replace(/^0+/, "");
    }

    // رقم الموبايل العراقي = 964 + 7XXXXXXXXX
    if (!/^9647[0-9]{9}$/.test(value)) {
        return "";
    }

    return "+" + value;
}


// ========================================
// التحقق من رقم الهاتف العراقي (صيغة E.164)
// ========================================

function isValidIraqiPhone(e164Phone) {

    return typeof e164Phone === "string"
        && /^\+9647[0-9]{9}$/.test(e164Phone);
}


// ========================================
// عرض رقم الهاتف بشكل مقروء: +964 770 123 4567
// ========================================

function formatPhoneForDisplay(phone) {

    const digits = toLatinDigits(phone).replace(/[^0-9]/g, "");

    if (digits.length === 13 && digits.indexOf(IRAQ_COUNTRY_CODE) === 0) {

        const local = digits.slice(IRAQ_COUNTRY_CODE.length);

        return "+" + IRAQ_COUNTRY_CODE + " " +
            local.slice(0, 3) + " " +
            local.slice(3, 6) + " " +
            local.slice(6);
    }

    return digits ? "+" + digits : "";
}


// ========================================
// تاريخ الانضمام المختصر
// ========================================

function formatMemberSince(createdAt) {

    if (!createdAt || typeof createdAt.toDate !== "function") {
        return "عضو جديد";
    }

    const date = createdAt.toDate();

    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    return "عضو منذ " + day + "/" + month + "/" + year;
}


// ========================================
// رسائل أخطاء تسجيل الدخول بالعربي
// ========================================

function getAuthErrorMessage(error, fallbackMessage) {

    const defaultMessage =
        fallbackMessage || "فشل تسجيل الدخول. حاول مرة أخرى.";

    const code = (error && error.code) ? String(error.code) : "";

    if (AUTH_ERROR_MESSAGES[code]) {
        return AUTH_ERROR_MESSAGES[code];
    }

    return defaultMessage;
}


// ========================================
// إظهار/إخفاء رسائل الخطأ داخل نافذة الحساب
// ========================================

function showAccountError(elementId, message) {

    const errorEl = document.getElementById(elementId);

    if (!errorEl) {
        return;
    }

    errorEl.textContent = message;
    errorEl.hidden = false;
}

function hideAccountError(elementId) {

    const errorEl = document.getElementById(elementId);

    if (!errorEl) {
        return;
    }

    errorEl.textContent = "";
    errorEl.hidden = true;
}

function showAccountGeneralError(message) {

    showAccountError("accountGeneralError", message);
}

function hideAccountGeneralError() {

    hideAccountError("accountGeneralError");
}


// ========================================
// تعطيل الزر مع تغيير نصه أثناء العمليات
// ========================================

function setButtonBusy(button, isBusy, busyText) {

    if (!button) {
        return;
    }

    if (isBusy) {

        button.dataset.idleText = button.textContent;
        button.disabled = true;

        if (busyText) {
            button.textContent = busyText;
        }

        return;
    }

    button.disabled = false;

    if (button.dataset.idleText) {

        button.textContent = button.dataset.idleText;

        delete button.dataset.idleText;
    }
}


// ========================================
// التنقل بين عروض نافذة الحساب
// ========================================

function showAccountView(viewName) {

    Object.keys(ACCOUNT_VIEW_IDS).forEach(function (key) {

        const view = document.getElementById(ACCOUNT_VIEW_IDS[key]);

        if (!view) {
            return;
        }

        if (key === viewName) {

            view.classList.add("active");

            return;
        }

        view.classList.remove("active");
    });
}


// ========================================
// هل نافذة الحساب مفتوحة حالياً؟
// ========================================

function isAccountModalOpen() {

    const modal = document.getElementById("accountModal");

    return !!(modal && modal.classList.contains("active"));
}

// ========================================
// تهيئة reCAPTCHA (مطلوبة لتسجيل الدخول بالهاتف على الويب)
// ========================================

function setupRecaptchaVerifier() {

    resetRecaptchaVerifier();

    const container = document.getElementById("recaptcha-container");

    if (!container || !window.auth) {
        return;
    }

    recaptchaVerifier = new firebase.auth.RecaptchaVerifier(
        container,
        {
            size: "invisible",
            "expired-callback": function () {

                // انتهت صلاحية reCAPTCHA: ننشئ واحدة جديدة بالمحاولة القادمة
                resetRecaptchaVerifier();
            }
        },
        window.auth
    );
}


// ========================================
// تنظيف reCAPTCHA بعد كل استخدام
// ========================================

function resetRecaptchaVerifier() {

    if (!recaptchaVerifier) {
        return;
    }

    try {
        recaptchaVerifier.clear();
    } catch (error) {
        console.warn("حمولتي - تعذّر تنظيف reCAPTCHA:", error);
    }

    recaptchaVerifier = null;
}


// ========================================
// مؤقّت إعادة إرسال الرمز
// ========================================

function startOtpResendTimer() {

    const resendBtn = document.getElementById("resendOtpBtn");

    if (!resendBtn) {
        return;
    }

    stopOtpResendTimer();

    let remaining = OTP_RESEND_DELAY;

    resendBtn.disabled = true;
    resendBtn.textContent =
        "إعادة إرسال الرمز بعد " + remaining + " ثانية";

    otpResendTimer = window.setInterval(function () {

        remaining = remaining - 1;

        if (remaining <= 0) {

            stopOtpResendTimer();

            resendBtn.disabled = false;
            resendBtn.textContent = "إعادة إرسال الرمز";

            return;
        }

        resendBtn.textContent =
            "إعادة إرسال الرمز بعد " + remaining + " ثانية";

    }, 1000);
}

function stopOtpResendTimer() {

    if (!otpResendTimer) {
        return;
    }

    window.clearInterval(otpResendTimer);
    otpResendTimer = null;
}


// ========================================
// معاينة الرقم بعد تحويله (بدون تكرار 964)
// ========================================

function updatePhonePreview(value) {

    const preview = document.getElementById("accountPhonePreview");

    if (!preview) {
        return;
    }

    const typed = toLatinDigits(value).replace(/[^0-9+]/g, "");

    if (!typed) {

        preview.textContent = "";
        preview.hidden = true;
        preview.className = "account-preview";

        return;
    }

    const e164Phone = normalizeIraqiPhone(value);

    preview.hidden = false;

    if (e164Phone) {

        preview.className = "account-preview valid";
        preview.textContent =
            "سيتم إرسال الرمز إلى: " + formatPhoneForDisplay(e164Phone);

        return;
    }

    preview.className = "account-preview invalid";
    preview.textContent = "الرقم غير مكتمل أو غير صحيح";
}


// ========================================
// ربط حقول نافذة الحساب
// ========================================

function bindAccountInputs() {

    const phoneInput = document.getElementById("accountPhone");

    if (phoneInput) {

        phoneInput.addEventListener("input", function () {

            let value = toLatinDigits(phoneInput.value);

            // نسمح بالأرقام والمسافة وعلامة + في البداية
            value = value.replace(/[^0-9+\s]/g, "");

            if (value.indexOf("+") > 0) {
                value = value.replace(/\+/g, "");
            }

            phoneInput.value = value;

            updatePhonePreview(value);
        });
    }

    const otpInput = document.getElementById("accountOtp");

    if (otpInput) {

        otpInput.addEventListener("input", function () {

            otpInput.value = toLatinDigits(otpInput.value)
                .replace(/[^0-9]/g, "")
                .slice(0, 6);
        });
    }
}

// ========================================
// إرسال رمز التحقق (OTP) إلى رقم الهاتف
// ========================================

function sendOtp() {

    if (!window.auth) {

        showAccountError(
            "accountPhoneError",
            "خدمة تسجيل الدخول غير متوفّرة حالياً. حدّث الصفحة وحاول مرة أخرى."
        );

        return;
    }

    const phoneInput = document.getElementById("accountPhone");

    const rawPhone = phoneInput ? phoneInput.value : "";

    const e164Phone = normalizeIraqiPhone(rawPhone);

    hideAccountError("accountPhoneError");

    if (!isValidIraqiPhone(e164Phone)) {

        showAccountError(
            "accountPhoneError",
            "رقم الهاتف غير صحيح. اكتب رقم موبايل عراقي مثل 07701234567."
        );

        return;
    }

    const sendBtn = document.getElementById("sendOtpBtn");

    setButtonBusy(sendBtn, true, "جارِ إرسال الرمز...");

    // إنشاء أداة reCAPTCHA جديدة قبل كل محاولة إرسال
    setupRecaptchaVerifier();

    if (!recaptchaVerifier) {

        setButtonBusy(sendBtn, false);

        showAccountError(
            "accountPhoneError",
            "تعذّر تجهيز التحقق (reCAPTCHA). حدّث الصفحة وحاول مرة أخرى."
        );

        return;
    }

    auth.signInWithPhoneNumber(e164Phone, recaptchaVerifier)

        .then(function (result) {

            confirmationResult = result;
            pendingPhoneNumber = e164Phone;

            const phoneLabel = document.getElementById("accountOtpPhone");

            if (phoneLabel) {
                phoneLabel.textContent = formatPhoneForDisplay(e164Phone);
            }

            const otpInput = document.getElementById("accountOtp");

            if (otpInput) {
                otpInput.value = "";
            }

            hideAccountError("accountOtpError");

            showAccountView("otp");
            startOtpResendTimer();

            if (otpInput) {
                otpInput.focus();
            }

        })

        .catch(function (error) {

            console.error("Error sending OTP:", error);

            // بعد أي فشل ننشئ reCAPTCHA جديدة للمحاولة القادمة
            resetRecaptchaVerifier();

            showAccountError(
                "accountPhoneError",
                getAuthErrorMessage(
                    error,
                    "فشل إرسال الرمز. حاول مرة أخرى."
                )
            );

        })

        .finally(function () {

            setButtonBusy(sendBtn, false);

        });
}


// ========================================
// إعادة إرسال رمز التحقق لنفس الرقم
// ========================================

function resendOtp() {

    const resendBtn = document.getElementById("resendOtpBtn");

    if (resendBtn && resendBtn.disabled) {
        return;
    }

    if (!pendingPhoneNumber) {

        showAccountView("phone");

        return;
    }

    const phoneInput = document.getElementById("accountPhone");

    if (phoneInput) {
        phoneInput.value = pendingPhoneNumber;
    }

    sendOtp();
}

// ========================================
// تأكيد رمز التحقق وتسجيل الدخول
// ========================================

function verifyOtp() {

    if (!window.auth || !confirmationResult) {

        showAccountError(
            "accountOtpError",
            "انتهت صلاحية جلسة التحقق. اضغط على «إعادة إرسال الرمز»."
        );

        return;
    }

    const otpInput = document.getElementById("accountOtp");

    const code = toLatinDigits(otpInput ? otpInput.value : "")
        .replace(/[^0-9]/g, "");

    hideAccountError("accountOtpError");

    if (code.length !== 6) {

        showAccountError(
            "accountOtpError",
            "أدخل رمز التحقق المكوّن من 6 أرقام."
        );

        return;
    }

    const verifyBtn = document.getElementById("verifyOtpBtn");

    setButtonBusy(verifyBtn, true, "جارِ التحقق...");

    confirmationResult.confirm(code)

        .then(function (result) {

            confirmationResult = null;

            stopOtpResendTimer();
            resetRecaptchaVerifier();

            return handleSignedInUser(result.user);

        })

        .catch(function (error) {

            console.error("Error verifying OTP:", error);

            showAccountError(
                "accountOtpError",
                getAuthErrorMessage(
                    error,
                    "فشل تسجيل الدخول. حاول مرة أخرى."
                )
            );

        })

        .finally(function () {

            setButtonBusy(verifyBtn, false);

        });
}


// ========================================
// بعد نجاح التحقق: قراءة/إنشاء ملف المستخدم في Firestore
// مجموعة users — معرّف الوثيقة = uid
// ========================================

function handleSignedInUser(user) {

    if (!user) {

        showAccountView("loggedOut");

        return Promise.resolve();
    }

    currentUser = user;

    updateAccountNavState(user);

    if (!window.db) {

        renderProfileView(user, null);

        return Promise.resolve();
    }

    return db.collection("users").doc(user.uid).get()

        .then(function (snapshot) {

            const profile = snapshot.exists ? snapshot.data() : null;

            currentUserProfile = profile;

            // مستخدم جديد (أو ملف بلا اسم) → نطلب الاسم
            if (!profile || !profile.name) {

                prepareNameView(user);
                showAccountView("name");

                return;
            }

            // مستخدم موجود → نحدّث رقم الهاتف ووقت آخر تحديث فقط
            return db.collection("users").doc(user.uid).set({

                phone: user.phoneNumber || "",
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()

            }, { merge: true })

                .then(function () {

                    renderProfileView(user, profile);

                })

                .catch(function (error) {

                    // لا نمنع المستخدم من رؤية حسابه إذا فشل التحديث
                    console.error("Error updating user profile:", error);

                    renderProfileView(user, profile);

                });

        })

        .catch(function (error) {

            console.error("Error loading user profile:", error);

            renderProfileView(user, null);

            showAccountGeneralError(
                "تعذّر تحميل بيانات حسابك. تحقق من الاتصال بالإنترنت."
            );

        });
}

// ========================================
// قراءة ملف المستخدم من Firestore (بدون كتابة)
// ========================================

function loadUserProfile(user) {

    if (!window.db || !user) {
        return Promise.resolve(null);
    }

    return db.collection("users").doc(user.uid).get()

        .then(function (snapshot) {

            return snapshot.exists ? snapshot.data() : null;

        });
}


// ========================================
// تجهيز عرض إدخال الاسم
// ========================================

function prepareNameView(user) {

    const hint = document.getElementById("accountNamePhoneHint");

    if (hint) {

        hint.textContent = "سيتم ربط الحساب بالرقم: " +
            formatPhoneForDisplay(user ? user.phoneNumber : "");
    }

    const nameInput = document.getElementById("accountNameInput");

    if (nameInput) {
        nameInput.value = "";
    }

    hideAccountError("accountNameError");
}


// ========================================
// حفظ الاسم وإنشاء/تحديث ملف المستخدم في Firestore
// البيانات: { name, phone, createdAt, updatedAt }
// ========================================

function saveAccountName() {

    if (!window.auth || !window.auth.currentUser) {

        showAccountView("loggedOut");

        return;
    }

    if (!window.db) {

        showAccountError(
            "accountNameError",
            "تعذّر الاتصال بقاعدة البيانات. حاول مرة أخرى."
        );

        return;
    }

    const nameInput = document.getElementById("accountNameInput");

    const name = nameInput ? nameInput.value.trim() : "";

    hideAccountError("accountNameError");

    if (name.length < 2) {

        showAccountError(
            "accountNameError",
            "يرجى إدخال الاسم (حرفان على الأقل)."
        );

        return;
    }

    if (name.length > 40) {

        showAccountError(
            "accountNameError",
            "الاسم طويل جداً. اكتب اسماً أقصر من 40 حرفاً."
        );

        return;
    }

    const user = window.auth.currentUser;

    // رقم الهاتف يُؤخذ من Firebase Auth ولا يُكتب يدوياً
    const phone = user.phoneNumber || "";

    const userRef = db.collection("users").doc(user.uid);

    const saveBtn = document.getElementById("saveNameBtn");

    setButtonBusy(saveBtn, true, "جارِ الحفظ...");

    userRef.get()

        .then(function (snapshot) {

            const payload = {
                name: name,
                phone: phone,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // createdAt يُكتب مرة واحدة فقط عند إنشاء الحساب
            if (!snapshot.exists) {

                payload.createdAt =
                    firebase.firestore.FieldValue.serverTimestamp();
            }

            return userRef.set(payload, { merge: true });

        })

        .then(function () {

            currentUserProfile = { name: name, phone: phone };

            updateAccountNavState(user);

            alert("تم إنشاء حسابك بنجاح ✅");

            renderProfileView(user, currentUserProfile);

        })

        .catch(function (error) {

            console.error("Error saving user profile:", error);

            showAccountError(
                "accountNameError",
                "فشل حفظ بيانات الحساب. حاول مرة أخرى."
            );

        })

        .finally(function () {

            setButtonBusy(saveBtn, false);

        });
}

// ========================================
// عرض بيانات الحساب
// ========================================

function renderProfileView(user, profile) {

    const name = (profile && profile.name) ? profile.name : "";

    const phone = (user && user.phoneNumber)
        ? user.phoneNumber
        : ((profile && profile.phone) ? profile.phone : "");

    const nameEl = document.getElementById("accountNameDisplay");

    if (nameEl) {
        nameEl.textContent = name || "مستخدم حمولتي";
    }

    const avatarEl = document.getElementById("accountAvatar");

    if (avatarEl) {
        avatarEl.textContent = name ? name.charAt(0) : "👤";
    }

    const phoneEl = document.getElementById("accountPhoneDisplay");

    if (phoneEl) {
        phoneEl.textContent = formatPhoneForDisplay(phone) || "—";
    }

    const joinedEl = document.getElementById("accountJoined");

    if (joinedEl) {

        joinedEl.textContent = formatMemberSince(
            profile ? profile.createdAt : null
        );
    }

    showAccountView("profile");
}


// ========================================
// تحديث زر "حسابي" في الشريط السفلي
// ========================================

function updateAccountNavState(user) {

    const label = document.getElementById("accountNavLabel");

    if (!label) {
        return;
    }

    const name =
        (user && currentUserProfile && currentUserProfile.name)
            ? String(currentUserProfile.name).trim()
            : "";

    if (!name) {

        label.textContent = "حسابي";

        return;
    }

    label.textContent = name.length > 8
        ? name.slice(0, 8) + "…"
        : name;
}

// ========================================
// تصفير حالة الحساب في الواجهة
// ========================================

function resetAccountState() {

    confirmationResult = null;
    pendingPhoneNumber = "";
    currentUserProfile = null;

    stopOtpResendTimer();
    resetRecaptchaVerifier();

    const fieldIds = ["accountPhone", "accountOtp", "accountNameInput"];

    fieldIds.forEach(function (fieldId) {

        const field = document.getElementById(fieldId);

        if (field) {
            field.value = "";
        }
    });

    updatePhonePreview("");

    hideAccountError("accountPhoneError");
    hideAccountError("accountOtpError");
    hideAccountError("accountNameError");
    hideAccountGeneralError();

    updateAccountNavState(null);
}


// ========================================
// تسجيل الخروج
// ========================================

function logoutAccount() {

    if (!window.auth) {
        return;
    }

    const confirmed = confirm("هل تريد تسجيل الخروج من حسابك؟");

    if (!confirmed) {
        return;
    }

    const logoutBtn = document.getElementById("logoutBtn");

    setButtonBusy(logoutBtn, true, "جارِ الخروج...");

    window.auth.signOut()

        .then(function () {

            resetAccountState();

            showAccountView("loggedOut");

        })

        .catch(function (error) {

            console.error("Error signing out:", error);

            showAccountGeneralError("فشل تسجيل الخروج. حاول مرة أخرى.");

        })

        .finally(function () {

            setButtonBusy(logoutBtn, false);

        });
}


// ========================================
// إغلاق نافذة الحساب
// ========================================

function closeAccountModal() {

    const modal = document.getElementById("accountModal");

    if (!modal) {
        return;
    }

    modal.classList.remove("active");

    document.body.style.overflow = "";
}


// ========================================
// تشغيل نظام الحساب ومراقبة حالة تسجيل الدخول
// ملاحظة: تسجيل الدخول غير مطلوب لعرض أو نشر الحمولات
// ========================================

function initAccountAuth() {

    bindAccountInputs();

    if (!window.auth) {

        console.warn("حمولتي - Firebase Auth غير متوفّر");

        return;
    }

    currentUser = window.auth.currentUser || null;

    updateAccountNavState(currentUser);

    // مراقبة حالة تسجيل الدخول تلقائياً
    window.auth.onAuthStateChanged(function (user) {

        currentUser = user;
        currentUserProfile = null;

        if (!user) {

            updateAccountNavState(null);

            if (isAccountModalOpen()) {
                showAccountView("loggedOut");
            }

            return;
        }

        loadUserProfile(user)

            .then(function (profile) {

                currentUserProfile = profile;

                updateAccountNavState(user);

                if (!isAccountModalOpen()) {
                    return;
                }

                if (profile && profile.name) {

                    renderProfileView(user, profile);

                    return;
                }

                prepareNameView(user);
                showAccountView("name");

            })

            .catch(function (error) {

                console.error("Error loading user profile:", error);

                updateAccountNavState(user);

                if (isAccountModalOpen()) {

                    showAccountGeneralError(
                        "تعذّر تحميل بيانات حسابك. تحقق من الاتصال بالإنترنت."
                    );
                }

            });

    });
}


// ========================================
// إغلاق نافذة الحساب عند الضغط خارجها
// ========================================

const accountModalEl = document.getElementById("accountModal");

if (accountModalEl) {

    accountModalEl.addEventListener(
        "click",
        function (event) {

            if (event.target === accountModalEl) {
                closeAccountModal();
            }

        }
    );
}









// ========================================
// السحب للتحديث (Pull-to-Refresh)
// سحب الشاشة للأسفل من أعلى الصفحة يعيد تحميل
// الحمولات والعروض مباشرة من Firestore
// ========================================

// حدود السحب (بالبيكسل)
const PULL_TRIGGER = 70;
const PULL_MAX = 130;

// أثناء الجلب من الخادم (منع تكرار الطلبات)
let pullRefreshBusy = false;

// بداية لمسة السحب الحالية
let pullStart = null;

// آخر مسافة سحب محسوبة
let pullDistance = 0;

// عناصر المؤشر (تُقرأ مرة واحدة عند تحميل الصفحة)
const pullIndicator =
    document.getElementById("pullRefreshIndicator");

const pullLabel =
    document.getElementById("pullRefreshLabel");

// هل الجهاز يدعم اللمس؟
const PULL_TOUCH_SUPPORTED =
    ("ontouchstart" in window)
    || (navigator.maxTouchPoints > 0)
    || (navigator.msMaxTouchPoints > 0);


// هل توجد نافذة منبثقة (Modal) مفتوحة؟
function isAnyModalOpen() {

    const openModals = document.querySelectorAll(".modal.active");

    return openModals.length > 0;
}


// تغيير حالة مؤشر السحب
// hidden | pull | ready | loading | done
function setPullState(state) {

    if (!pullIndicator) {
        return;
    }

    if (state === "hidden") {

        pullIndicator.classList.remove("visible", "spinning", "done");
        pullIndicator.style.transform = "";

        if (pullLabel) {
            pullLabel.textContent = "";
        }

        return;
    }

    pullIndicator.classList.add("visible");

    if (state === "pull") {

        pullIndicator.classList.remove("spinning", "done");

        if (pullLabel) {
            pullLabel.textContent = "اسحب أكثر للتحديث";
        }

        return;
    }

    if (state === "ready") {

        pullIndicator.classList.remove("spinning", "done");

        if (pullLabel) {
            pullLabel.textContent = "اترك للتحديث";
        }

        return;
    }

    if (state === "loading") {

        pullIndicator.classList.add("spinning");
        pullIndicator.classList.remove("done");

        pullIndicator.style.transform = "translateY(70px)";

        if (pullLabel) {
            pullLabel.textContent = "جارِ التحديث...";
        }

        return;
    }

    if (state === "done") {

        pullIndicator.classList.remove("spinning");
        pullIndicator.classList.add("done");

        pullIndicator.style.transform = "translateY(70px)";

        if (pullLabel) {
            pullLabel.textContent = "تم التحديث ✓";
        }
    }
}


// إلغاء السحبة الحالية وإرجاع المؤشر
function cancelPull() {

    pullStart = null;
    pullDistance = 0;

    if (pullIndicator) {

        pullIndicator.classList.remove("dragging");
        pullIndicator.style.transform = "";
    }

    setPullState("hidden");
}

// ========================================
// إعادة تحميل بيانات الصفحة من Firestore
// 1) طلبات النقل: مستمع جديد يقرأ من الخادم مباشرة
// 2) العروض: إعادة اشتراك لكل قائمة عروض مفتوحة
// ========================================

function refreshLoadsData(doneCallback) {

    if (!window.db) {

        if (typeof doneCallback === "function") {
            doneCallback();
        }

        return;
    }

    // الحمولات التي كانت قوائم عروضها مفتوحة قبل التحديث
    const openLoadIds = Object.keys(offersListeners);

    // إعادة تحميل طلبات النقل من الخادم مباشرة،
    // وبعد رسم القائمة نعيد فتح قوائم العروض التي كانت مفتوحة
    listenToLoads(function () {

        openLoadIds.forEach(function (loadId) {

            const oldUnsubscribe = offersListeners[loadId];

            if (typeof oldUnsubscribe === "function") {

                try {
                    oldUnsubscribe();
                } catch (error) {
                    console.warn("حمولتي - تعذّر إيقاف مستمع العروض:", error);
                }
            }

            delete offersListeners[loadId];

            const offersList =
                document.getElementById("offersList-" + loadId);

            // نعيد الاشتراك فقط للحمولات المعروضة والمفتوحة
            if (offersList && offersList.classList.contains("open")) {
                subscribeOffers(loadId);
            }

        });

        if (typeof doneCallback === "function") {
            doneCallback();
        }

    }, true);
}


// تحديث بيانات الحساب إن كان المستخدم مسجّل الدخول
function refreshAccountData() {

    if (!window.auth || !window.auth.currentUser) {
        return;
    }

    const user = window.auth.currentUser;

    loadUserProfile(user)

        .then(function (profile) {

            currentUserProfile = profile;

            updateAccountNavState(user);

            if (isAccountModalOpen() && profile && profile.name) {
                renderProfileView(user, profile);
            }

        })

        .catch(function (error) {

            console.error("Error refreshing account data:", error);

        });
}


// ========================================
// تنفيذ التحديث وعرض المؤشر
// ========================================

function performPullRefresh() {

    if (pullRefreshBusy) {
        return;
    }

    pullRefreshBusy = true;

    setPullState("loading");

    let finished = false;

    const finish = function () {

        if (finished) {
            return;
        }

        finished = true;

        setPullState("done");

        window.setTimeout(function () {
            setPullState("hidden");
        }, 900);

        pullRefreshBusy = false;
    };

    // منع علوق المؤشر إذا تأخّرت القراءة
    const timeoutId = window.setTimeout(function () {

        console.warn("حمولتي - انتهت مهلة التحديث بالسحب");

        finish();

    }, 8000);

    refreshLoadsData(function () {

        window.clearTimeout(timeoutId);

        // إبقاء المؤشر ظاهراً ثوانٍ قصيرة بعد اكتمال التحديث
        window.setTimeout(finish, 250);

    });

    refreshAccountData();
}

// ========================================
// ربط أحداث اللمس (الجوال)
// ========================================

function initPullToRefresh() {

    if (!PULL_TOUCH_SUPPORTED) {
        return;
    }

    document.addEventListener(
        "touchstart",
        function (event) {

            if (pullRefreshBusy) {
                return;
            }

            if (isAnyModalOpen()) {
                return;
            }

            // السحب للتحديث يعمل فقط من أعلى الصفحة تماماً
            if (window.scrollY > 0) {
                return;
            }

            const touch = event.touches && event.touches[0];

            if (!touch) {
                return;
            }

            pullStart = {
                x: touch.clientX,
                y: touch.clientY
            };

            pullDistance = 0;

            if (pullIndicator) {
                pullIndicator.classList.add("dragging");
            }

        },
        { passive: true }
    );

    document.addEventListener(
        "touchmove",
        function (event) {

            if (!pullStart || pullRefreshBusy) {
                return;
            }

            if (isAnyModalOpen()) {
                cancelPull();
                return;
            }

            const touch = event.touches && event.touches[0];

            if (!touch) {
                cancelPull();
                return;
            }

            const deltaX = Math.abs(touch.clientX - pullStart.x);
            const deltaY = touch.clientY - pullStart.y;

            // نلغي السحب إذا نزل المستخدم بالصفحة
            // أو رجع لأعلى أو صارت اللمسة أفقية
            if (window.scrollY > 0 || deltaY <= 0 || deltaX > deltaY) {
                cancelPull();
                return;
            }

            pullDistance = Math.min(PULL_MAX, deltaY);

            setPullState(
                pullDistance >= PULL_TRIGGER ? "ready" : "pull"
            );

            if (pullIndicator) {
                pullIndicator.style.transform =
                    "translateY(" + Math.round(pullDistance) + "px)";
            }

        },
        { passive: true }
    );

    document.addEventListener(
        "touchend",
        function () {

            if (!pullStart) {
                return;
            }

            pullStart = null;

            if (pullIndicator) {
                pullIndicator.classList.remove("dragging");
            }

            // تجاوز حد السحب → تنفيذ التحديث
            if (pullDistance >= PULL_TRIGGER) {
                performPullRefresh();
                return;
            }

            cancelPull();

        },
        { passive: true }
    );

    document.addEventListener(
        "touchcancel",
        function () {
            cancelPull();
        },
        { passive: true }
    );

    console.log("حمولتي - السحب للتحديث جاهز");
}


