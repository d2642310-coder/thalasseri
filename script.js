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



// =========================================================
// CUSTOMER OTP LOGIN
// =========================================================

async function requestCustomerOTP() {

  const nameEl =
    document.getElementById("customerName");

  const phoneEl =
    document.getElementById("customerPhone");

  const otpBox =
    document.getElementById("otpBox");

  const name =
    nameEl ? nameEl.value.trim() : "";

  const phone =
    phoneEl ? phoneEl.value.trim() : "";

  const password =
    document.getElementById("customerPassword")?.value || "";

  const confirmPassword =
    document.getElementById("customerConfirmPassword")?.value || "";

  if (!name) {
    showMessage("Please enter your name.");
    if (nameEl) nameEl.focus();
    return;
  }

  if (!phone) {
    showMessage("Please enter your phone number.");
    if (phoneEl) phoneEl.focus();
    return;
  }

  if (password.length < 6) {
    showMessage("Password must be at least 6 characters.");
    document.getElementById("customerPassword")?.focus();
    return;
  }

  if (password !== confirmPassword) {
    showMessage("Passwords do not match.");
    document.getElementById("customerConfirmPassword")?.focus();
    return;
  }

  try {

    const response =
      await fetch(
        "/api/customer/request-otp",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: name,
            phone: phone
          })
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      showMessage(
        data.error || "Could not send OTP."
      );
      return;
    }

    if (otpBox) {
      otpBox.style.display = "block";
    }

    showMessage(
      "OTP generated. Check the server terminal."
    );

    const otp =
      document.getElementById("customerOTP");

    if (otp) {
      setTimeout(function() {
        otp.focus();
      }, 150);
    }

  } catch (error) {

    console.error(error);

    showMessage(
      "Server connection failed."
    );
  }
}


async function verifyCustomerOTP() {

  const otp =
    document.getElementById("customerOTP")?.value.trim() || "";

  const name =
    document.getElementById("customerName")?.value.trim() || "";

  const phone =
    document.getElementById("customerPhone")?.value.trim() || "";

  const password =
    document.getElementById("customerPassword")?.value || "";

  const confirmPassword =
    document.getElementById("customerConfirmPassword")?.value || "";

  if (!name) {
    showMessage("Please enter your name.");
    return;
  }

  if (!phone) {
    showMessage("Please enter your phone number.");
    return;
  }

  if (password.length < 6) {
    showMessage("Password must be at least 6 characters.");
    return;
  }

  if (password !== confirmPassword) {
    showMessage("Passwords do not match.");
    return;
  }

  if (!/^\d{6}$/.test(otp)) {
    showMessage("Please enter the 6-digit OTP.");
    return;
  }

  try {

    const response = await fetch(
      "/api/customer/register",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          name: name,
          phone: phone,
          password: password,
          confirm_password: confirmPassword,
          otp: otp
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      showMessage(
        data.error || "Account creation failed."
      );
      return;
    }

    customerId =
      data.customer_id || data.id;

    if (!customerId) {
      showMessage("Customer ID missing.");
      return;
    }

    localStorage.setItem(
      "thalasseri_customer_id",
      customerId
    );

    showMessage(
      "✅ Account created successfully!"
    );

    const otpBox =
      document.getElementById("otpBox");

    if (otpBox) {
      otpBox.style.display = "none";
    }

    updateCustomerLoginUI();

    await loadCustomerData();

    setTimeout(function() {

      const customerSection =
        document.querySelector(".customer-section");

      if (customerSection) {
        customerSection.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
      }

    }, 300);

  } catch (error) {

    console.error(error);
    showMessage("Server connection failed.");

  }
}


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
/* ============================
   DELIVERY MAP
============================ */

let deliveryMap = null;
let deliveryMarker = null;
let leafletLoaded = false;

function loadLeaflet(callback) {

  if (leafletLoaded) {
    callback();
    return;
  }

  if (!document.getElementById("leaflet-css")) {
    const css = document.createElement("link");
    css.id = "leaflet-css";
    css.rel = "stylesheet";
    css.href =
      "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(css);
  }

  if (document.getElementById("leaflet-js")) {
    document.getElementById("leaflet-js").addEventListener("load", function() {
      leafletLoaded = true;
      callback();
    });
    return;
  }

  const script = document.createElement("script");
  script.id = "leaflet-js";
  script.src =
    "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

  script.onload = function() {
    leafletLoaded = true;
    callback();
  };

  document.body.appendChild(script);
}

function initDeliveryMap() {

  loadLeaflet(function() {

    const mapElement =
      document.getElementById("deliveryMap");

    if (!mapElement) return;

    if (deliveryMap) {
      setTimeout(function() {
        deliveryMap.invalidateSize();
      }, 300);
      return;
    }

    const defaultLat = 25.3463;
    const defaultLng = 55.4209;

    deliveryMap =
      L.map("deliveryMap").setView(
        [defaultLat, defaultLng],
        13
      );

    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 19,
        attribution: "Tiles &copy; Esri"
      }
    ).addTo(deliveryMap);

    deliveryMap.on("click", function(event) {

      setDeliveryLocation(
        event.latlng.lat,
        event.latlng.lng
      );

    });

    setTimeout(function() {
      deliveryMap.invalidateSize();
    }, 500);

  });
}

function setDeliveryLocation(latitude, longitude) {

  if (!deliveryMap) return;

  if (deliveryMarker) {

    deliveryMarker.setLatLng([
      latitude,
      longitude
    ]);

  } else {

    deliveryMarker =
      L.marker(
        [latitude, longitude],
        {
          draggable: true
        }
      ).addTo(deliveryMap);

    deliveryMarker.on(
      "dragend",
      function(event) {

        const position =
          event.target.getLatLng();

        setDeliveryLocation(
          position.lat,
          position.lng
        );

      }
    );
  }

  deliveryMap.setView(
    [latitude, longitude],
    17
  );

  const latInput =
    document.getElementById("mapLatitude");

  const lngInput =
    document.getElementById("mapLongitude");

  const locationBox =
    document.getElementById("selectedLocation");

  if (latInput) {
    latInput.value = latitude;
  }

  if (lngInput) {
    lngInput.value = longitude;
  }

  if (locationBox) {

    locationBox.innerHTML = `
      <strong>✅ Location selected</strong><br>
      ${latitude.toFixed(6)},
      ${longitude.toFixed(6)}
    `;

  }

  updateDeliveryAddress();
}

function updateDeliveryAddress() {

  const buildingNumber =
    document.getElementById("buildingNumber")?.value.trim() || "";

  const buildingName =
    document.getElementById("buildingName")?.value.trim() || "";

  const streetArea =
    document.getElementById("streetArea")?.value.trim() || "";

  const note =
    document.getElementById("deliveryNote")?.value.trim() || "";

  const lat =
    document.getElementById("mapLatitude")?.value || "";

  const lng =
    document.getElementById("mapLongitude")?.value || "";

  const parts = [];

  if (buildingNumber) {
    parts.push(
      "Building/House: " + buildingNumber
    );
  }

  if (buildingName) {
    parts.push(
      "Building: " + buildingName
    );
  }

  if (streetArea) {
    parts.push(
      "Area/Street: " + streetArea
    );
  }

  if (lat && lng) {
    parts.push(
      `GPS: ${lat}, ${lng}`
    );
  }

  if (note) {
    parts.push(
      "Note: " + note
    );
  }

  const addressInput =
    document.getElementById("deliveryAddress");

  if (addressInput) {
    addressInput.value =
      parts.join(" | ");
  }
}

function openGoogleMapLocation() {

  const lat =
    document.getElementById("mapLatitude")?.value;

  const lng =
    document.getElementById("mapLongitude")?.value;

  if (lat && lng) {

    window.open(
      `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      "_blank"
    );

  } else {

    window.open(
      "https://www.google.com/maps",
      "_blank"
    );

  }
}

function useCurrentLocation() {

  if (!navigator.geolocation) {

    showMessage(
      "Location is not supported by your browser."
    );

    return;
  }

  showMessage(
    "📍 Getting your current location..."
  );

  navigator.geolocation.getCurrentPosition(

    function(position) {

      const latitude =
        position.coords.latitude;

      const longitude =
        position.coords.longitude;

      initDeliveryMap();

      setTimeout(function() {

        if (deliveryMap) {

          setDeliveryLocation(
            latitude,
            longitude
          );

        }

      }, 1000);

      showMessage(
        "📍 Current location selected!"
      );

    },

    function(error) {

      console.error(
        "Location error:",
        error
      );

      showMessage(
        "Please allow location access in your browser."
      );

    },

    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
}

document.addEventListener(
  "input",
  function(event) {

    if (
      event.target.id === "buildingNumber" ||
      event.target.id === "buildingName" ||
      event.target.id === "streetArea" ||
      event.target.id === "deliveryNote"
    ) {

      updateDeliveryAddress();

    }

  }
);

document.addEventListener(
  "DOMContentLoaded",
  function() {

    setTimeout(
      initDeliveryMap,
      500
    );

  }
);


// ============================================================
// THALASSERY CUSTOMER AUTH SYSTEM
// CREATE ACCOUNT + LOGIN + OTP + LOGOUT
// ============================================================

let authMode = "create";
let otpPhone = "";


function openCustomerAuth() {

  const section = document.querySelector(".customer-section");

  if (section) {
    section.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }

  setTimeout(function() {

    if (!customerId) {

      const input =
        document.getElementById(
          authMode === "login"
            ? "loginPhone"
            : "customerName"
        );

      if (input) {
        input.focus();
      }

    }

  }, 500);
}


function showCreateAccount() {

  authMode = "create";

  const createBox =
    document.getElementById("createAccountBox");

  const loginBox =
    document.getElementById("loginBox");

  const createTab =
    document.getElementById("createAccountTab");

  const loginTab =
    document.getElementById("loginTab");

  if (createBox) createBox.style.display = "block";
  if (loginBox) loginBox.style.display = "none";

  if (createTab) createTab.classList.add("active");
  if (loginTab) loginTab.classList.remove("active");

  const otpBox =
    document.getElementById("otpBox");

  if (otpBox) otpBox.style.display = "none";
}


function showCustomerLogin() {

  authMode = "login";

  const createBox =
    document.getElementById("createAccountBox");

  const loginBox =
    document.getElementById("loginBox");

  const createTab =
    document.getElementById("createAccountTab");

  const loginTab =
    document.getElementById("loginTab");

  if (createBox) createBox.style.display = "none";
  if (loginBox) loginBox.style.display = "block";

  if (createTab) createTab.classList.remove("active");
  if (loginTab) loginTab.classList.add("active");

  const otpBox =
    document.getElementById("otpBox");

  if (otpBox) otpBox.style.display = "none";
}


async function requestLoginOTP() {

  const phoneEl =
    document.getElementById("loginPhone");

  const phone =
    phoneEl ? phoneEl.value.trim() : "";

  if (!phone) {
    showMessage("Please enter your registered phone number.");
    if (phoneEl) phoneEl.focus();
    return;
  }

  try {

    const response = await fetch(
      "/api/customer/request-otp",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: "",
          phone: phone
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      showMessage(
        data.error || "Could not generate OTP."
      );
      return;
    }

    otpPhone = phone;
    authMode = "login";

    const otpBox =
      document.getElementById("otpBox");

    if (otpBox) {
      otpBox.style.display = "block";
    }

    showMessage(
      "Login OTP generated. Check the server terminal."
    );

    const otp =
      document.getElementById("customerOTP");

    if (otp) {
      setTimeout(function() {
        otp.focus();
      }, 150);
    }

  } catch (error) {

    console.error(error);
    showMessage("Server connection failed.");

  }
}



async function loginCustomerWithPassword() {

  const identifier =
    document.getElementById("loginIdentifier")?.value.trim() || "";

  const password =
    document.getElementById("loginPassword")?.value || "";

  if (!identifier) {
    showMessage("Please enter your phone number or name.");
    document.getElementById("loginIdentifier")?.focus();
    return;
  }

  if (!password) {
    showMessage("Please enter your password.");
    document.getElementById("loginPassword")?.focus();
    return;
  }

  try {

    const response = await fetch(
      "/api/customer/login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          identifier: identifier,
          password: password
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      showMessage(
        data.error || "Login failed."
      );
      return;
    }

    customerId =
      data.customer_id || data.id;

    if (!customerId) {
      showMessage("Customer ID missing.");
      return;
    }

    localStorage.setItem(
      "thalasseri_customer_id",
      customerId
    );

    showMessage("✅ Login successful!");

    updateCustomerLoginUI();

    await loadCustomerData();

    setTimeout(function() {

      const customerSection =
        document.querySelector(".customer-section");

      if (customerSection) {
        customerSection.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
      }

    }, 300);

  } catch (error) {

    console.error(error);
    showMessage("Server connection failed.");

  }
}


async function resendCustomerOTP() {

  if (authMode === "login") {

    const phone =
      document.getElementById("loginPhone")?.value.trim();

    if (!phone) {
      showMessage("Please enter your phone number.");
      return;
    }

    await requestLoginOTP();
    return;
  }

  await requestCustomerOTP();
}


async function verifyCustomerOTP() {

  const otp =
    document.getElementById("customerOTP")?.value.trim() || "";

  const name =
    document.getElementById("customerName")?.value.trim() || "";

  const phone =
    document.getElementById("customerPhone")?.value.trim() || "";

  const password =
    document.getElementById("customerPassword")?.value || "";

  const confirmPassword =
    document.getElementById("customerConfirmPassword")?.value || "";

  if (!name) {
    showMessage("Please enter your name.");
    return;
  }

  if (!phone) {
    showMessage("Please enter your phone number.");
    return;
  }

  if (password.length < 6) {
    showMessage("Password must be at least 6 characters.");
    return;
  }

  if (password !== confirmPassword) {
    showMessage("Passwords do not match.");
    return;
  }

  if (!/^\d{6}$/.test(otp)) {
    showMessage("Please enter the 6-digit OTP.");
    return;
  }

  try {

    const response = await fetch(
      "/api/customer/verify-otp",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          name: name,
          phone: phone,
          password: password,
          confirm_password: confirmPassword,
          otp: otp
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      showMessage(
        data.error || "Account creation failed."
      );
      return;
    }

    customerId =
      data.customer_id || data.id;

    if (!customerId) {
      showMessage("Customer ID missing.");
      return;
    }

    localStorage.setItem(
      "thalasseri_customer_id",
      customerId
    );

    showMessage(
      "✅ Account created successfully!"
    );

    const otpBox =
      document.getElementById("otpBox");

    if (otpBox) {
      otpBox.style.display = "none";
    }

    updateCustomerLoginUI();

    await loadCustomerData();

    thalasseryApplyLoginGate();

    setTimeout(function() {

      const customerSection =
        document.querySelector(".customer-section");

      if (customerSection) {
        customerSection.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
      }

    }, 300);

  } catch (error) {

    console.error(error);

    showMessage(
      "Server connection failed."
    );
  }
}


async function logoutCustomer() {

  try {
    await fetch("/api/customer/logout", {
      method: "POST",
      credentials: "include"
    });
  } catch (error) {
    console.error(error);
  }



  localStorage.removeItem(
    "thalasseri_customer_id"
  );

  customerId = null;

  updateCustomerLoginUI();

  showMessage(
    "You have been logged out."
  );

  setTimeout(function() {
    window.location.reload();
  }, 600);
}


function updateCustomerLoginUI() {

  const status =
    document.getElementById(
      "customerLoginStatus"
    );

  const mobileLogin =
    document.getElementById(
      "mobileAuthButton"
    );

  const mobileLogout =
    document.getElementById(
      "mobileLogoutButton"
    );

  if (customerId) {

    if (status) {
      status.textContent = "✓ Logged in";
      status.classList.add("logged-in");
    }

    if (mobileLogin) {
      mobileLogin.textContent = "My Account";
    }

    if (mobileLogout) {
      mobileLogout.style.display = "block";
    }

  } else {

    if (status) {
      status.textContent = "Guest";
      status.classList.remove("logged-in");
    }

    if (mobileLogin) {
      mobileLogin.textContent =
        "Login / Create Account";
    }

    if (mobileLogout) {
      mobileLogout.style.display = "none";
    }

  }
}


function toggleNavMenu() {

  const menu =
    document.getElementById("navMoreMenu");

  if (menu) {
    menu.classList.toggle("active");
  }

}


function closeNavMenu() {

  const menu =
    document.getElementById("navMoreMenu");

  if (menu) {
    menu.classList.remove("active");
  }

}


document.addEventListener(
  "click",
  function(event) {

    const menu =
      document.getElementById("navMoreMenu");

    const button =
      document.querySelector(".nav-more-btn");

    if (!menu || !button) return;

    if (
      !menu.contains(event.target) &&
      !button.contains(event.target)
    ) {
      menu.classList.remove("active");
    }

  }
);


document.addEventListener(
  "DOMContentLoaded",
  function() {

    updateCustomerLoginUI();

  }
);



/* =========================================================
   THALASSERY — LOGIN FIRST CUSTOMER GATE
   ========================================================= */

function thalasseryApplyLoginGate() {
  const loggedIn = !!localStorage.getItem("thalasseri_customer_id");

  document.body.classList.toggle("customer-logged-out", !loggedIn);
  document.documentElement.classList.toggle("customer-logged-out", !loggedIn);

  /* Logged out: force auth screen */
  if (!loggedIn) {
    const auth = document.querySelector(".customer-section");

    if (auth) {
      auth.style.display = "flex";
    }

    /* Scroll to login automatically */
    setTimeout(() => {
      if (auth) {
        auth.scrollIntoView({
          behavior: "instant",
          block: "center"
        });
      }
    }, 50);
  }
}

/* Run immediately */
document.addEventListener("DOMContentLoaded", () => {
  thalasseryApplyLoginGate();
});

/* Re-check after login/logout actions */
window.addEventListener("storage", () => {
  thalasseryApplyLoginGate();
});


}

})();
