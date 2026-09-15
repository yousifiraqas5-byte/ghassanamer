// ================================
// تريلات العراق - JavaScript
// ================================

// البحث
const searchInput = document.querySelector(".search-box input");
const categories = document.querySelectorAll(".category");
const truckCards = document.querySelectorAll(".truck-card");

if (searchInput) {
    searchInput.addEventListener("input", function () {
        const searchText = this.value.trim().toLowerCase();

        // البحث داخل الأقسام
        categories.forEach(function (category) {
            const text = category.innerText.toLowerCase();

            if (text.includes(searchText)) {
                category.style.display = "";
            } else {
                category.style.display = "none";
            }
        });

        // البحث داخل الإعلانات
        truckCards.forEach(function (card) {
            const text = card.innerText.toLowerCase();

            if (text.includes(searchText)) {
                card.style.display = "";
            } else {
                card.style.display = "none";
            }
        });
    });
}


// ================================
// الضغط على الأقسام
// ================================

categories.forEach(function (category) {

    category.addEventListener("click", function () {

        const title = this.querySelector("h3");

        if (!title) return;

        const categoryName = title.innerText;

        alert("اخترت قسم: " + categoryName);

    });

});


// ================================
// زر عرض التفاصيل
// ================================

const detailButtons = document.querySelectorAll(".button");

detailButtons.forEach(function (button) {

    button.addEventListener("click", function (event) {

        event.preventDefault();

        alert("صفحة تفاصيل الإعلان ستتوفر قريباً 🚛");

    });

});


// ================================
// رسالة عند تحميل الموقع
// ================================

document.addEventListener("DOMContentLoaded", function () {

    console.log("تم تشغيل موقع تريلات العراق بنجاح 🚛");

});
