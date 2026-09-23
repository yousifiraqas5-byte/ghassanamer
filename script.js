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
// نظام الحساب وتسجيل الدخول بحساب Google
// (Firebase Authentication - Google Sign-In)
// ========================================

// المستخدم الحالي من Firebase Auth
let currentUser = null;

// ملف المستخدم من Firestore (مجموعة users)
let currentUserProfile = null;

// معرّفات عروض نافذة الحساب داخل الصفحة
const ACCOUNT_VIEW_IDS = {
    loggedOut: "accountLoggedOutView",
    name: "accountNameView",
    profile: "accountProfileView"
};

// رسائل أخطاء تسجيل الدخول بالعربي (Google Sign-In)
const AUTH_ERROR_MESSAGES = {
    "auth/popup-blocked":
        "المتصفح منع نافذة تسجيل الدخول. اسمح بالنوافذ المنبثقة وحاول مرة أخرى.",
    "auth/popup-closed-by-user":
        "تم إغلاق نافذة تسجيل الدخول قبل إكمال العملية.",
    "auth/cancelled-popup-request":
        "تم إلغاء الطلب لوجود محاولة تسجيل دخول أخرى قيد التنفيذ.",
    "auth/account-exists-with-different-credential":
        "هذا البريد الإلكتروني مرتبط مسبقاً بطريقة تسجيل دخول أخرى.",
    "auth/unauthorized-domain":
        "هذا النطاق غير مصرّح به في Firebase Authentication. أضف نطاق الموقع من إعدادات Firebase.",
    "auth/operation-not-allowed":
        "تسجيل الدخول بحساب Google غير مفعّل في Firebase. فعّله من صفحة Sign-in method.",
    "auth/network-request-failed":
        "تعذّر الاتصال بالإنترنت. تحقق من الشبكة وحاول مرة أخرى.",
    "auth/user-disabled":
        "تم إيقاف هذا الحساب. تواصل مع الدعم.",
    "auth/internal-error":
        "حدث خطأ داخلي في خدمة تسجيل الدخول. حاول مرة أخرى."
};


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
// تسجيل الدخول بحساب Google عبر Firebase Authentication
// ========================================

function signInWithGoogle() {

    if (!window.auth) {

        showAccountGeneralError(
            "خدمة تسجيل الدخول غير متوفّرة حالياً. حدّث الصفحة وحاول مرة أخرى."
        );

        return;
    }

    hideAccountGeneralError();

    const googleBtn = document.getElementById("googleSignInBtn");

    setButtonBusy(googleBtn, true, "جارِ تسجيل الدخول...");

    const provider = new firebase.auth.GoogleAuthProvider();

    auth.signInWithPopup(provider)

        .then(function (result) {

            return handleSignedInUser(result.user);

        })

        .catch(function (error) {

            // المستخدم أغلق نافذة تسجيل الدخول بنفسه: لا داعي لإظهار خطأ
            if (error && error.code === "auth/popup-closed-by-user") {
                return;
            }

            console.error("Error signing in with Google:", error);

            showAccountGeneralError(
                getAuthErrorMessage(
                    error,
                    "فشل تسجيل الدخول بحساب Google. حاول مرة أخرى."
                )
            );

        })

        .finally(function () {

            setButtonBusy(googleBtn, false);

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

    const userRef = db.collection("users").doc(user.uid);

    return userRef.get()

        .then(function (snapshot) {

            const existingProfile = snapshot.exists ? snapshot.data() : null;

            // الاسم يأتي من حساب Google، وإلا من الملف المحفوظ سابقاً
            const name =
                (user.displayName && user.displayName.trim())
                    || (existingProfile && existingProfile.name)
                    || "";

            // حالة نادرة: حساب Google بلا اسم ظاهر ولا اسم محفوظ سابقاً
            // → نطلب الاسم يدوياً (بدون اختراع رقم هاتف أو أي بيانات أخرى)
            if (!name) {

                currentUserProfile = existingProfile;

                prepareNameView(user);
                showAccountView("name");

                return;
            }

            const payload = {
                name: name,
                email: user.email || "",
                photoURL: user.photoURL || "",
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // createdAt يُكتب مرة واحدة فقط عند إنشاء الحساب
            if (!snapshot.exists) {

                payload.createdAt =
                    firebase.firestore.FieldValue.serverTimestamp();
            }

            return userRef.set(payload, { merge: true })

                .then(function () {

                    currentUserProfile = Object.assign(
                        {}, existingProfile, payload
                    );

                    updateAccountNavState(user);
                    renderProfileView(user, currentUserProfile);

                })

                .catch(function (error) {

                    // لا نمنع المستخدم من رؤية حسابه إذا فشل التحديث
                    console.error("Error updating user profile:", error);

                    currentUserProfile = existingProfile;
                    renderProfileView(user, existingProfile);

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

    const hint = document.getElementById("accountNameHint");

    if (hint) {

        hint.textContent = (user && user.email)
            ? ("سيتم ربط الحساب بالبريد: " + user.email)
            : "";
    }

    const nameInput = document.getElementById("accountNameInput");

    if (nameInput) {
        nameInput.value = "";
    }

    hideAccountError("accountNameError");
}


// ========================================
// حفظ الاسم وإنشاء/تحديث ملف المستخدم في Firestore
// (حالة نادرة: حساب Google بلا اسم ظاهر)
// البيانات: { name, email, photoURL, createdAt, updatedAt }
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

    // البريد وصورة الحساب يُؤخذان من Firebase Auth (حساب Google) مباشرة
    const email = user.email || "";
    const photoURL = user.photoURL || "";

    const userRef = db.collection("users").doc(user.uid);

    const saveBtn = document.getElementById("saveNameBtn");

    setButtonBusy(saveBtn, true, "جارِ الحفظ...");

    userRef.get()

        .then(function (snapshot) {

            const payload = {
                name: name,
                email: email,
                photoURL: photoURL,
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

            currentUserProfile = {
                name: name,
                email: email,
                photoURL: photoURL
            };

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

    const name = (profile && profile.name)
        ? profile.name
        : ((user && user.displayName) ? user.displayName : "");

    const email = (user && user.email)
        ? user.email
        : ((profile && profile.email) ? profile.email : "");

    const photoURL = (user && user.photoURL)
        ? user.photoURL
        : ((profile && profile.photoURL) ? profile.photoURL : "");

    const nameEl = document.getElementById("accountNameDisplay");

    if (nameEl) {
        nameEl.textContent = name || "مستخدم حمولتي";
    }

    const avatarEl = document.getElementById("accountAvatar");

    if (avatarEl) {

        if (photoURL) {

            avatarEl.textContent = "";
            avatarEl.style.backgroundImage = "url('" + photoURL + "')";
            avatarEl.classList.add("has-photo");

        } else {

            avatarEl.style.backgroundImage = "";
            avatarEl.classList.remove("has-photo");
            avatarEl.textContent = name ? name.charAt(0) : "👤";
        }
    }

    const emailEl = document.getElementById("accountEmailDisplay");

    if (emailEl) {
        emailEl.textContent = email || "—";
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
            : ((user && user.displayName) ? String(user.displayName).trim() : "");

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

    currentUserProfile = null;

    const fieldIds = ["accountNameInput"];

    fieldIds.forEach(function (fieldId) {

        const field = document.getElementById(fieldId);

        if (field) {
            field.value = "";
        }
    });

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


