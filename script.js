// ========================================
// حمولتي - Main JavaScript
// ========================================


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
// قبول طلب نقل
// ========================================

function acceptLoad(route) {

    const confirmed = confirm(
        "هل تريد الموافقة على طلب النقل؟\n\n" +
        route
    );

    if (confirmed) {

        alert(
            "تم إرسال موافقتك على الطلب 🚛\n\n" +
            "سيظهر لصاحب الحمولة أنك مهتم بالطلب."
        );

    }
}


// ========================================
// نشر طلب الحمولة
// ========================================

function publishCargo() {

    const from =
        document.getElementById("fromLocation").value.trim();

    const to =
        document.getElementById("toLocation").value.trim();

    const cargo =
        document.getElementById("cargoType").value.trim();

    const weight =
        document.getElementById("cargoWeight").value.trim();

    const truck =
        document.getElementById("truckType").value;

    const price =
        document.getElementById("cargoPrice").value.trim();


    // التحقق من البيانات

    if (!from ||
        !to ||
        !cargo ||
        !weight ||
        !truck ||
        !price) {

        alert(
            "يرجى إكمال جميع معلومات الحمولة."
        );

        return;
    }


    // رسالة نجاح مؤقتة

    alert(
        "تم تجهيز طلب النقل بنجاح 🚛\n\n" +

        "من: " + from + "\n" +
        "إلى: " + to + "\n" +
        "الحمولة: " + cargo + "\n" +
        "الوزن: " + weight + "\n" +
        "الشاحنة: " + truck + "\n" +
        "السعر: " + Number(price).toLocaleString("ar-IQ") +
        " د.ع"
    );


    // إغلاق النموذج

    closeModal();


    // تنظيف الحقول

    document.getElementById("fromLocation").value = "";
    document.getElementById("toLocation").value = "";
    document.getElementById("cargoType").value = "";
    document.getElementById("cargoWeight").value = "";
    document.getElementById("truckType").value = "";
    document.getElementById("cargoPrice").value = "";
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


// ========================================
// تشغيل الموقع
// ========================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        console.log(
            "🚛 حمولتي - تم تشغيل الموقع بنجاح"
        );

    }
);
