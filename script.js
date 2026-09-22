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

function listenToLoads() {

    if (!window.db) {
        return;
    }

    db.collection("loads")
        .orderBy("createdAt", "desc")
        .onSnapshot(

            function (snapshot) {

                const loadsList =
                    document.getElementById("loadsList");

                if (!loadsList) {
                    return;
                }

                if (snapshot.empty) {

                    loadsList.innerHTML =
                        '<p class="loads-empty">' +
                        'لا توجد طلبات نقل حالياً.' +
                        '</p>';

                    return;
                }

                loadsList.innerHTML = "";

                snapshot.forEach(function (doc) {

                    const card = renderLoad(doc.id, doc.data());
                    loadsList.appendChild(card);

                });

            },

            function (error) {

                console.error("Error loading loads:", error);

                const loadsList =
                    document.getElementById("loadsList");

                if (loadsList) {

                    loadsList.innerHTML =
                        '<p class="loads-empty">' +
                        'تعذّر تحميل طلبات النقل.' +
                        '</p>';

                }

            }
        );
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

    alert(
        "الحساب الشخصي\n\n" +
        "تسجيل الدخول وإنشاء الحساب " +
        "سيتم إضافته لاحقاً."
    );
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
