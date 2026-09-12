let cart = [];
let customerId =
  localStorage.getItem("thalasseri_customer_id");


// ============================
// MESSAGE
// ============================

function showMessage(text) {

  const box =
    document.getElementById("message");

  box.innerText = text;
  box.style.display = "block";

  setTimeout(() => {
    box.style.display = "none";
  }, 3000);
}


// ============================
// SCROLL
// ============================

function scrollToMenu() {
  document
    .getElementById("menu")
    .scrollIntoView({
      behavior: "smooth"
    });
}

function scrollToCart() {
  document
    .getElementById("cart")
    .scrollIntoView({
      behavior: "smooth"
    });
}


// ============================
// MENU
// ============================

async function loadMenu() {

  const grid =
    document.getElementById("menuGrid");

  try {

    const response =
      await fetch("/api/menu");

    const data =
      await response.json();

    const menu =
      Array.isArray(data)
        ? data
        : data.menu || [];

    if (!menu.length) {

      grid.innerHTML =
        `<div class="loading">
          No menu available.
        </div>`;

      return;
    }

    grid.innerHTML =
      menu.map(item => {

        const available =
          item.available !== false &&
          item.available !== 0;

        return `

          <div class="menu-card">

            <div class="menu-image">

              ${
                getFoodEmoji(item.name)
              }

            </div>

            <div class="menu-info">

              <h3>
                ${escapeHtml(item.name)}
              </h3>

              <p>
                Authentic Thalasseri taste
              </p>

              <div class="menu-price">
                AED
                ${Number(item.price).toFixed(2)}
              </div>

              ${
                available

                ?

                `<button
                  class="menu-add"
                  onclick='addToCart(${JSON.stringify(item)})'
                >
                  + Add to Cart
                </button>`

                :

                `<div class="sold-out">
                  Sold Out
                </div>`
              }

            </div>

          </div>

        `;

      }).join("");

  } catch (error) {

    console.error(error);

    grid.innerHTML =
      `<div class="loading">
        Unable to connect to server.
      </div>`;
  }
}


// ============================
// FOOD EMOJI
// ============================

function getFoodEmoji(name) {

  const n =
    String(name).toLowerCase();

  if (n.includes("biriyani")) {
    return "🍛";
  }

  if (n.includes("chicken")) {
    return "🍗";
  }

  if (n.includes("beef")) {
    return "🥩";
  }

  if (n.includes("roll")) {
    return "🌯";
  }

  if (n.includes("lime")) {
    return "🍋";
  }

  if (n.includes("meal")) {
    return "🍚";
  }

  return "🍽️";
}


// ============================
// CART
// ============================

function addToCart(item) {

  const existing =
    cart.find(
      x => x.id === item.id
    );

  if (existing) {

    existing.qty++;

  } else {

    cart.push({

      id: item.id,

      name: item.name,

      price:
        Number(item.price),

      qty: 1
    });
  }

  renderCart();

  showMessage(
    `${item.name} added to cart`
  );
}


// ============================
// QUANTITY
// ============================

function changeQty(id, amount) {

  const item =
    cart.find(
      x => x.id === id
    );

  if (!item) return;

  item.qty += amount;

  if (item.qty <= 0) {

    cart =
      cart.filter(
        x => x.id !== id
      );
  }

  renderCart();
}


// ============================
// REMOVE
// ============================

function removeFromCart(id) {

  cart =
    cart.filter(
      x => x.id !== id
    );

  renderCart();
}


// ============================
// CART RENDER
// ============================

function renderCart() {

  const box =
    document.getElementById(
      "cartItems"
    );

  const count =
    cart.reduce(
      (sum, item) =>
        sum + item.qty,
      0
    );

  document.getElementById(
    "cartCount"
  ).innerText = count;

  if (!cart.length) {

    box.innerHTML =
      `<div class="empty-cart">
        Your cart is empty
      </div>`;

  } else {

    box.innerHTML =
      cart.map(item => {

        const subtotal =
          item.price * item.qty;

        return `

          <div class="cart-item">

            <div>

              <strong>
                ${escapeHtml(item.name)}
              </strong>

              <br>

              <small>
                AED
                ${item.price.toFixed(2)}
              </small>

            </div>


            <div class="qty">

              <button
                onclick="changeQty(${item.id}, -1)"
              >
                −
              </button>

              <strong>
                ${item.qty}
              </strong>

              <button
                onclick="changeQty(${item.id}, 1)"
              >
                +
              </button>

            </div>


            <strong>
              AED
              ${subtotal.toFixed(2)}
            </strong>


            <button
              class="remove-btn"
              onclick="removeFromCart(${item.id})"
            >
              Remove
            </button>

          </div>

        `;

      }).join("");
  }

  const total =
    getCartTotal();

  document.getElementById(
    "cartTotal"
  ).innerText =
    `AED ${total.toFixed(2)}`;

  document.getElementById(
    "cartTotalBottom"
  ).innerText =
    `AED ${total.toFixed(2)}`;
}


// ============================
// TOTAL
// ============================

function getCartTotal() {

  return cart.reduce(
    (total, item) =>
      total +
      item.price *
      item.qty,
    0
  );
}


// ============================
// CUSTOMER
// ============================

async function saveCustomer() {

  const name =
    document
      .getElementById("customerName")
      .value
      .trim();

  const phone =
    document
      .getElementById("customerPhone")
      .value
      .trim();

  if (!name || !phone) {

    showMessage(
      "Please enter your name and phone."
    );

    return;
  }

  try {

    const response =
      await fetch(
        "/api/customer",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            name,
            phone
          })
        }
      );

    const data =
      await response.json();

    if (!response.ok) {

      showMessage(
        data.error ||
        "Customer error"
      );

      return;
    }

    customerId =
      data.customer_id ||
      data.id ||
      data.customer?.id;

    if (!customerId) {

      showMessage(
        "Customer ID missing."
      );

      return;
    }

    localStorage.setItem(
      "thalasseri_customer_id",
      customerId
    );

    showMessage(
      "Customer saved successfully!"
    );

    await loadCustomerData();

  } catch (error) {

    console.error(error);

    showMessage(
      "Server connection failed."
    );
  }
}


// ============================
// CUSTOMER DATA
// ============================

async function loadCustomerData() {

  if (!customerId) return;

  try {

    const response =
      await fetch(
        `/api/customer/${customerId}`
      );

    if (!response.ok) return;

    const data =
      await response.json();

    const customer =
      data.customer ||
      data;

    document.getElementById(
      "customerName"
    ).value =
      customer.name || "";

    document.getElementById(
      "customerPhone"
    ).value =
      customer.phone || "";

    const limit =
      Number(
        customer.credit_limit ||
        customer.creditLimit ||
        0
      );

    const used =
      Number(
        customer.credit_used ||
        customer.creditUsed ||
        0
      );

    const available =
      Math.max(
        0,
        limit - used
      );

    document.getElementById(
      "creditLimit"
    ).innerText =
      `AED ${limit.toFixed(2)}`;

    document.getElementById(
      "creditUsed"
    ).innerText =
      `AED ${used.toFixed(2)}`;

    document.getElementById(
      "creditAvailable"
    ).innerText =
      `AED ${available.toFixed(2)}`;

    await loadOrders();

  } catch (error) {

    console.error(error);
  }
}


// ============================
// PLACE ORDER
// ============================

async function placeOrder(
  paymentMethod
) {

  if (!customerId) {

    showMessage(
      "Please enter customer details first."
    );

    return;
  }

  if (!cart.length) {

    showMessage(
      "Your cart is empty."
    );

    return;
  }

  const items =
    cart.map(item => ({
      menu_item_id: item.id,
      quantity: item.qty
    }));

  try {

    const response =
      await fetch(
        "/api/orders",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({

            customer_id:
              Number(customerId),

            items,

            payment_method:
              paymentMethod
          })
        }
      );

    const data =
      await response.json();

    if (!response.ok) {

      showMessage(
        data.error ||
        "Unable to place order."
      );

      return;
    }

    cart = [];

    renderCart();

    showMessage(
      paymentMethod === "credit"
        ? "Added to credit successfully!"
        : "Order placed successfully!"
    );

    await loadCustomerData();

  } catch (error) {

    console.error(error);

    showMessage(
      "Server connection failed."
    );
  }
}


// ============================
// ORDERS
// ============================

async function loadOrders() {

  if (!customerId) return;

  try {

    const response =
      await fetch(
        `/api/customer/${customerId}/orders`
      );

    if (!response.ok) return;

    const data =
      await response.json();

    const orders =
      Array.isArray(data)
        ? data
        : data.orders || [];

    const box =
      document.getElementById(
        "ordersList"
      );

    if (!orders.length) {

      box.innerHTML =
        `<div class="empty-orders">
          No orders yet.
        </div>`;

      return;
    }

    box.innerHTML =
      orders.map(order => {

        return `

          <div class="order-card">

            <strong>
              Order #${order.id}
            </strong>

            <br><br>

            Total:
            <strong>
              AED
              ${Number(
                order.total || 0
              ).toFixed(2)}
            </strong>

            <br>

            Payment:
            ${escapeHtml(
              order.payment_method ||
              "-"
            )}

            <br>

            Status:
            <span class="order-status">
              ${escapeHtml(
                order.status ||
                "Pending"
              )}
            </span>

          </div>

        `;

      }).join("");

  } catch (error) {

    console.error(error);
  }
}


// ============================
// SECURITY
// ============================

function escapeHtml(value) {

  return String(
    value ?? ""
  )
  .replace(
    /&/g,
    "&amp;"
  )
  .replace(
    /</g,
    "&lt;"
  )
  .replace(
    />/g,
    "&gt;"
  )
  .replace(
    /"/g,
    "&quot;"
  )
  .replace(
    /'/g,
    "&#039;"
  );
}


// ============================
// START
// ============================

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    await loadMenu();

    if (customerId) {

      await loadCustomerData();
    }

    renderCart();
  }
);