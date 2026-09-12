let cart = [];

let creditBalance = 1500;

const creditLimit = 2000;


// ADD FOOD
function addToCart(name, price) {

    const existing = cart.find(item => item.name === name);

    if (existing) {
        existing.quantity++;
    } else {
        cart.push({
            name: name,
            price: price,
            quantity: 1
        });
    }

    updateCart();

    showNotification(name + " added to cart");
}


// UPDATE CART
function updateCart() {

    const cartItems = document.getElementById("cartItems");
    const cartCount = document.getElementById("cartCount");
    const totalElement = document.getElementById("total");

    cartItems.innerHTML = "";

    let total = 0;
    let count = 0;


    if (cart.length === 0) {

        cartItems.innerHTML =
            `<p class="empty">Your cart is empty.</p>`;

    } else {

        cart.forEach((item, index) => {

            const itemTotal =
                item.price * item.quantity;

            total += itemTotal;
            count += item.quantity;


            const div = document.createElement("div");

            div.className = "cart-item";

            div.innerHTML = `
                <div>
                    <strong>${item.name}</strong>
                    <br>
                    <small>
                        ₹${item.price} × ${item.quantity}
                    </small>
                </div>

                <div>
                    <strong>₹${itemTotal}</strong>

                    <button
                        onclick="removeItem(${index})"
                        style="
                        margin-left:10px;
                        border:0;
                        background:#eee;
                        border-radius:50%;
                        width:28px;
                        height:28px;
                        cursor:pointer;
                        "
                    >
                        −
                    </button>
                </div>
            `;

            cartItems.appendChild(div);
        });
    }


    cartCount.innerText = count;
    totalElement.innerText = total;
}


// REMOVE ITEM
function removeItem(index) {

    if (cart[index].quantity > 1) {
        cart[index].quantity--;
    } else {
        cart.splice(index, 1);
    }

    updateCart();
}


// CLEAR CART
function clearCart() {

    cart = [];

    updateCart();

    showNotification("Cart cleared");
}


// GET TOTAL
function getTotal() {

    return cart.reduce(
        (total, item) =>
            total + item.price * item.quantity,
        0
    );
}


// PAY NOW
function payNow() {

    const total = getTotal();

    if (total === 0) {
        showNotification("Add food first");
        return;
    }

    showNotification(
        "Payment system will be connected later"
    );
}


// ADD TO CREDIT
function addToCredit() {

    const total = getTotal();

    if (total === 0) {
        showNotification("Add food first");
        return;
    }


    if (total > creditBalance) {

        showNotification(
            "Insufficient credit balance"
        );

        return;
    }


    creditBalance -= total;

    updateCredit();

    cart = [];

    updateCart();

    showNotification(
        "Order added to credit successfully"
    );
}


// CREDIT DISPLAY
function updateCredit() {

    document.getElementById(
        "creditBalance"
    ).innerText = creditBalance;


    document.getElementById(
        "creditDisplay"
    ).innerText = creditBalance;


    const percentage =
        (creditBalance / creditLimit) * 100;


    document.getElementById(
        "creditProgress"
    ).style.width = percentage + "%";
}


// SHOW CREDIT
function showCredit() {

    document
        .querySelector(".credit-section")
        .scrollIntoView({
            behavior: "smooth"
        });
}


// SCROLL MENU
function scrollToMenu() {

    document
        .getElementById("menu")
        .scrollIntoView({
            behavior: "smooth"
        });
}


// NOTIFICATION
function showNotification(message) {

    const notification =
        document.getElementById("notification");

    notification.innerText = message;

    notification.classList.add("show");


    setTimeout(() => {

        notification.classList.remove("show");

    }, 2500);
}


// INITIAL
updateCredit();
updateCart();
