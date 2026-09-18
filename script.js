let cart = [];
let customerId = (() => {
  const stored = localStorage.getItem("thalasseri_customer_id");
  if (!stored) return null;
  const parsed = Number(stored);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
})();

function showMessage(text) {
  const box = document.getElementById("message");
  if (!box) return;

  box.innerText = text;
  box.style.display = "block";

  setTimeout(() => {
    box.style.display = "none";
  }, 3000);
}

function scrollToMenu() {
  document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" });
}

function scrollToCart() {
  document.getElementById("cart")?.scrollIntoView({ behavior: "smooth" });
}

async function loadMenu() {
  const grid = document.getElementById("menuGrid");
  if (!grid) return;

  try {
    const response = await fetch("/api/menu");
    const data = await response.json();
    const menu = Array.isArray(data) ? data : (data.menu || []);

    if (!menu.length) {
      grid.innerHTML = `<div class="loading">No menu available.</div>`;
      return;
    }

    grid.innerHTML = menu.map((item) => {
      const available = item.available !== false && item.available !== 0;
      const imageHtml = item.image
        ? (item.image.startsWith("http") || item.image.startsWith("data:") || item.image.startsWith("/")
            ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" style="width:100%;height:100%;object-fit:cover;display:block;">`
            : `<span style="font-size:72px;display:block;">${escapeHtml(item.image)}</span>`)
        : `<span style="font-size:72px;display:block;">${getFoodEmoji(item.name)}</span>`;

      return `
        <div class="menu-card">
          <div class="menu-image" style="height:180px;display:flex;align-items:center;justify-content:center;background:var(--light-green);overflow:hidden;">
            ${imageHtml}
          </div>
          <div class="menu-info">
            <h3>${escapeHtml(item.name)}</h3>
            <p>Authentic Thalasseri taste</p>
            <div class="menu-price">AED ${Number(item.price).toFixed(2)}</div>
            ${available
              ? `<button class="menu-add" onclick='addToCart(${JSON.stringify(item)})'>+ Add to Cart</button>`
              : `<div class="sold-out">Sold Out</div>`}
          </div>
        </div>
      `;
    }).join("");
  } catch (error) {
    console.error(error);
    grid.innerHTML = `<div class="loading">Unable to connect to server.</div>`;
  }
}

function getFoodEmoji(name) {
  const n = String(name || "").toLowerCase();

  if (n.includes("biriyani")) return "🍛";
  if (n.includes("chicken")) return "🍗";
  if (n.includes("beef")) return "🥩";
  if (n.includes("roll")) return "🌯";
  if (n.includes("lime")) return "🍋";
  if (n.includes("meal")) return "🍚";
  if (n.includes("fish")) return "🐟";
  if (n.includes("drinks")) return "🥤";
  return "🍽️";
}

function addToCart(item) {
  const existing = cart.find(x => x.id === item.id);

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      id: item.id,
      name: item.name,
      price: Number(item.price),
      qty: 1
    });
  }

  renderCart();
  showMessage(`${item.name} added to cart`);
}

function changeQty(id, amount) {
  const item = cart.find(x => x.id === id);
  if (!item) return;

  item.qty += amount;
  if (item.qty <= 0) {
    cart = cart.filter(x => x.id !== id);
  }

  renderCart();
}

function removeFromCart(id) {
  cart = cart.filter(x => x.id !== id);
  renderCart();
}

function renderCart() {
  const box = document.getElementById("cartItems");
  if (!box) return;

  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartCountEl = document.getElementById("cartCount");
  if (cartCountEl) cartCountEl.innerText = count;

  if (!cart.length) {
    box.innerHTML = `<div class="empty-cart">Your cart is empty</div>`;
  } else {
    box.innerHTML = cart.map((item) => {
      const subtotal = item.price * item.qty;
      return `
        <div class="cart-item">
          <div>
            <strong>${escapeHtml(item.name)}</strong><br>
            <small>AED ${item.price.toFixed(2)}</small>
          </div>
          <div class="qty">
            <button onclick="changeQty(${item.id}, -1)">−</button>
            <strong>${item.qty}</strong>
            <button onclick="changeQty(${item.id}, 1)">+</button>
          </div>
          <strong>AED ${subtotal.toFixed(2)}</strong>
          <button class="remove-btn" onclick="removeFromCart(${item.id})">Remove</button>
        </div>
      `;
    }).join("");
  }

  const total = getCartTotal();
  const cartTotal = document.getElementById("cartTotal");
  const cartTotalBottom = document.getElementById("cartTotalBottom");
  if (cartTotal) cartTotal.innerText = `AED ${total.toFixed(2)}`;
  if (cartTotalBottom) cartTotalBottom.innerText = `AED ${total.toFixed(2)}`;
}

function getCartTotal() {
  return cart.reduce((total, item) => total + item.price * item.qty, 0);
}

async function requestCustomerOTP() {
  const nameEl = document.getElementById("customerName");
  const phoneEl = document.getElementById("customerPhone");
  const otpBox = document.getElementById("otpBox");
  const name = nameEl ? nameEl.value.trim() : "";
  const phone = phoneEl ? phoneEl.value.trim() : "";
  const password = document.getElementById("customerPassword")?.value || "";
  const confirmPassword = document.getElementById("customerConfirmPassword")?.value || "";

  if (!name) {
    showMessage("Please enter your name.");
    nameEl?.focus();
    return;
  }

  if (!phone) {
    showMessage("Please enter your phone number.");
    phoneEl?.focus();
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
    const response = await fetch("/api/customer/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone })
    });

    const data = await response.json();
    if (!response.ok) {
      showMessage(data.error || "Could not send OTP.");
      return;
    }

    if (otpBox) otpBox.style.display = "block";
    showMessage("OTP generated. Check the server terminal.");

    const otp = document.getElementById("customerOTP");
    if (otp) setTimeout(() => otp.focus(), 150);
  } catch (error) {
    console.error(error);
    showMessage("Server connection failed.");
  }
}

async function verifyCustomerOTP() {
  const otp = document.getElementById("customerOTP")?.value.trim() || "";
  const name = document.getElementById("customerName")?.value.trim() || "";
  const phone = document.getElementById("customerPhone")?.value.trim() || "";
  const password = document.getElementById("customerPassword")?.value || "";
  const confirmPassword = document.getElementById("customerConfirmPassword")?.value || "";

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
    const response = await fetch("/api/customer/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, phone, password, confirm_password: confirmPassword, otp })
    });

    const data = await response.json();
    if (!response.ok) {
      showMessage(data.error || "Account creation failed.");
      return;
    }

    customerId = Number(data.customer_id || data.id || data.customer?.id);
    if (!customerId) {
      showMessage("Customer ID missing.");
      return;
    }

    localStorage.setItem("thalasseri_customer_id", String(customerId));
    showMessage("✅ Account created successfully!");

    const otpBox = document.getElementById("otpBox");
    if (otpBox) otpBox.style.display = "none";

    updateCustomerLoginUI();
    thalasseryApplyLoginGate();
    await loadCustomerData();

    setTimeout(() => {
      const section = document.querySelector(".customer-section");
      section?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
  } catch (error) {
    console.error(error);
    showMessage("Server connection failed.");
  }
}

async function loginCustomerWithPassword() {
  const identifier = document.getElementById("loginIdentifier")?.value.trim() || "";
  const password = document.getElementById("loginPassword")?.value || "";

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
    const response = await fetch("/api/customer/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ identifier, password })
    });

    const data = await response.json();
    if (!response.ok) {
      showMessage(data.error || "Login failed.");
      return;
    }

    customerId = Number(data.customer_id || data.id || data.customer?.id);
    if (!customerId) {
      showMessage("Customer ID missing.");
      return;
    }

    localStorage.setItem("thalasseri_customer_id", String(customerId));
    showMessage("✅ Login successful!");
    updateCustomerLoginUI();
    thalasseryApplyLoginGate();
    await loadCustomerData();

    setTimeout(() => {
      const section = document.querySelector(".customer-section");
      section?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
  } catch (error) {
    console.error(error);
    showMessage("Server connection failed.");
  }
}

async function loadCustomerData() {
  if (!customerId) return;

  try {
    const response = await fetch(`/api/customer/${customerId}`);
    if (!response.ok) return;

    const data = await response.json();
    const customer = data.customer || data;

    const nameInput = document.getElementById("customerName");
    const phoneInput = document.getElementById("customerPhone");
    if (nameInput) nameInput.value = customer.name || "";
    if (phoneInput) phoneInput.value = customer.phone || "";

    const limit = Number(customer.credit_limit || customer.creditLimit || 0);
    const used = Number(customer.credit_used || customer.creditUsed || 0);
    const available = Math.max(0, limit - used);

    const creditLimitEl = document.getElementById("creditLimit");
    const creditUsedEl = document.getElementById("creditUsed");
    const creditAvailableEl = document.getElementById("creditAvailable");
    if (creditLimitEl) creditLimitEl.innerText = `AED ${limit.toFixed(2)}`;
    if (creditUsedEl) creditUsedEl.innerText = `AED ${used.toFixed(2)}`;
    if (creditAvailableEl) creditAvailableEl.innerText = `AED ${available.toFixed(2)}`;

    await loadOrders();
  } catch (error) {
    console.error(error);
  }
}

async function placeOrder(paymentMethod) {
  if (!customerId) {
    showMessage("Please enter customer details first.");
    return;
  }

  if (!cart.length) {
    showMessage("Your cart is empty.");
    return;
  }

  const items = cart.map(item => ({ menu_item_id: item.id, quantity: item.qty }));

  try {
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_id: Number(customerId),
        items,
        payment_method: paymentMethod
      })
    });

    const data = await response.json();
    if (!response.ok) {
      showMessage(data.error || "Unable to place order.");
      return;
    }

    cart = [];
    renderCart();
    showMessage(paymentMethod === "credit" ? "Added to credit successfully!" : "Order placed successfully!");
    await loadCustomerData();
  } catch (error) {
    console.error(error);
    showMessage("Server connection failed.");
  }
}

async function loadOrders() {
  if (!customerId) return;

  try {
    const response = await fetch(`/api/customer/${customerId}/orders`);
    if (!response.ok) return;

    const data = await response.json();
    const orders = Array.isArray(data) ? data : (data.orders || []);
    const box = document.getElementById("ordersList");
    if (!box) return;

    if (!orders.length) {
      box.innerHTML = `<div class="empty-orders">No orders yet.</div>`;
      return;
    }

    box.innerHTML = orders.map((order) => {
      return `
        <div class="order-card">
          <strong>Order #${order.id}</strong><br><br>
          Total: <strong>AED ${Number(order.total || 0).toFixed(2)}</strong><br>
          Payment: ${escapeHtml(order.payment_method || "-")}<br>
          Status: <span class="order-status">${escapeHtml(order.status || "Pending")}</span>
        </div>
      `;
    }).join("");
  } catch (error) {
    console.error(error);
  }
}

async function resendCustomerOTP() {
  await requestCustomerOTP();
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

  localStorage.removeItem("thalasseri_customer_id");
  customerId = null;
  updateCustomerLoginUI();
  thalasseryApplyLoginGate();
  showMessage("You have been logged out.");

  setTimeout(() => {
    window.location.reload();
  }, 600);
}

function updateCustomerLoginUI() {
  const status = document.getElementById("customerLoginStatus");
  const mobileLogin = document.getElementById("mobileAuthButton");
  const mobileLogout = document.getElementById("mobileLogoutButton");

  if (customerId) {
    if (status) {
      status.textContent = "✓ Logged in";
      status.classList.add("logged-in");
    }

    if (mobileLogin) mobileLogin.textContent = "My Account";
    if (mobileLogout) mobileLogout.style.display = "block";
  } else {
    if (status) {
      status.textContent = "Guest";
      status.classList.remove("logged-in");
    }

    if (mobileLogin) mobileLogin.textContent = "Login / Create Account";
    if (mobileLogout) mobileLogout.style.display = "none";
  }
}

function thalasseryApplyLoginGate() {
  const loggedIn = !!customerId || !!localStorage.getItem("thalasseri_customer_id");
  const auth = document.querySelector(".customer-section");

  if (!auth) return;

  if (loggedIn) {
    auth.style.display = "none";
  } else {
    auth.style.display = "flex";
    setTimeout(() => {
      auth.scrollIntoView({ behavior: "instant", block: "center" });
    }, 50);
  }
}

function toggleNavMenu() {
  const menu = document.getElementById("navMoreMenu");
  if (menu) menu.classList.toggle("active");
}

function closeNavMenu() {
  const menu = document.getElementById("navMoreMenu");
  if (menu) menu.classList.remove("active");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function openCustomerAuth() {
  const section = document.querySelector(".customer-section");
  if (section) {
    section.style.display = "flex";
    section.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  setTimeout(() => {
    const input = document.getElementById(authMode === "login" ? "loginIdentifier" : "customerName");
    input?.focus();
  }, 250);
}

function showCreateAccount() {
  authMode = "create";
  const createBox = document.getElementById("createAccountBox");
  const loginBox = document.getElementById("loginBox");
  const createTab = document.getElementById("createAccountTab");
  const loginTab = document.getElementById("loginTab");
  const otpBox = document.getElementById("otpBox");

  if (createBox) createBox.style.display = "block";
  if (loginBox) loginBox.style.display = "none";
  if (createTab) createTab.classList.add("active");
  if (loginTab) loginTab.classList.remove("active");
  if (otpBox) otpBox.style.display = "none";
}

function showCustomerLogin() {
  authMode = "login";
  const createBox = document.getElementById("createAccountBox");
  const loginBox = document.getElementById("loginBox");
  const createTab = document.getElementById("createAccountTab");
  const loginTab = document.getElementById("loginTab");
  const otpBox = document.getElementById("otpBox");

  if (createBox) createBox.style.display = "none";
  if (loginBox) loginBox.style.display = "block";
  if (createTab) createTab.classList.remove("active");
  if (loginTab) loginTab.classList.add("active");
  if (otpBox) otpBox.style.display = "none";
}

let authMode = "create";

function initDeliveryMap() {
  const mapElement = document.getElementById("deliveryMap");
  if (!mapElement) return;

  if (window.deliveryMap) {
    setTimeout(() => window.deliveryMap.invalidateSize(), 300);
    return;
  }

  const css = document.getElementById("leaflet-css") || document.createElement("link");
  if (!document.getElementById("leaflet-css")) {
    css.id = "leaflet-css";
    css.rel = "stylesheet";
    css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(css);
  }

  if (!document.getElementById("leaflet-js")) {
    const script = document.createElement("script");
    script.id = "leaflet-js";
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => {
      window.deliveryMap = L.map("deliveryMap").setView([25.3463, 55.4209], 13);
      L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
        maxZoom: 19,
        attribution: "Tiles &copy; Esri"
      }).addTo(window.deliveryMap);

      window.deliveryMap.on("click", (event) => {
        setDeliveryLocation(event.latlng.lat, event.latlng.lng);
      });
    };
    document.body.appendChild(script);
  }
}

function setDeliveryLocation(latitude, longitude) {
  if (!window.deliveryMap) return;

  if (window.deliveryMarker) {
    window.deliveryMarker.setLatLng([latitude, longitude]);
  } else {
    window.deliveryMarker = L.marker([latitude, longitude], { draggable: true }).addTo(window.deliveryMap);
    window.deliveryMarker.on("dragend", (ev) => {
      const pos = ev.target.getLatLng();
      setDeliveryLocation(pos.lat, pos.lng);
    });
  }

  window.deliveryMap.setView([latitude, longitude], 17);

  const latInput = document.getElementById("mapLatitude");
  const lngInput = document.getElementById("mapLongitude");
  const locationBox = document.getElementById("selectedLocation");

  if (latInput) latInput.value = latitude;
  if (lngInput) lngInput.value = longitude;
  if (locationBox) {
    locationBox.innerHTML = `<strong>✅ Location selected</strong><br>${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  }

  updateDeliveryAddress();
}

function updateDeliveryAddress() {
  const buildingNumber = document.getElementById("buildingNumber")?.value.trim() || "";
  const buildingName = document.getElementById("buildingName")?.value.trim() || "";
  const streetArea = document.getElementById("streetArea")?.value.trim() || "";
  const note = document.getElementById("deliveryNote")?.value.trim() || "";
  const lat = document.getElementById("mapLatitude")?.value || "";
  const lng = document.getElementById("mapLongitude")?.value || "";

  const parts = [];
  if (buildingNumber) parts.push("Building/House: " + buildingNumber);
  if (buildingName) parts.push("Building: " + buildingName);
  if (streetArea) parts.push("Area/Street: " + streetArea);
  if (lat && lng) parts.push(`GPS: ${lat}, ${lng}`);
  if (note) parts.push("Note: " + note);

  const addressInput = document.getElementById("deliveryAddress");
  if (addressInput) addressInput.value = parts.join(" | ");
}

function openGoogleMapLocation() {
  const lat = document.getElementById("mapLatitude")?.value;
  const lng = document.getElementById("mapLongitude")?.value;
  const url = lat && lng ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}` : "https://www.google.com/maps";
  window.open(url, "_blank");
}

function useCurrentLocation() {
  if (!navigator.geolocation) {
    showMessage("Location is not supported by your browser.");
    return;
  }

  showMessage("📍 Getting your current location...");

  navigator.geolocation.getCurrentPosition((position) => {
    initDeliveryMap();
    setTimeout(() => {
      if (window.deliveryMap) setDeliveryLocation(position.coords.latitude, position.coords.longitude);
    }, 1000);
    showMessage("📍 Current location selected!");
  }, (error) => {
    console.error("Location error:", error);
    showMessage("Please allow location access in your browser.");
  }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
}

document.addEventListener("input", (event) => {
  if (["buildingNumber", "buildingName", "streetArea", "deliveryNote"].includes(event.target.id)) {
    updateDeliveryAddress();
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  customerId = (() => {
    const stored = localStorage.getItem("thalasseri_customer_id");
    if (!stored) return null;
    const parsed = Number(stored);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  })();

  updateCustomerLoginUI();
  thalasseryApplyLoginGate();

  await loadMenu();
  if (customerId) await loadCustomerData();
  renderCart();

  setTimeout(() => {
    initDeliveryMap();
  }, 500);
});

document.addEventListener("click", (event) => {
  const menu = document.getElementById("navMoreMenu");
  const button = document.querySelector(".nav-more-btn");
  if (!menu || !button) return;

  if (!menu.contains(event.target) && !button.contains(event.target)) {
    menu.classList.remove("active");
  }
});

window.addEventListener("storage", () => {
  customerId = (() => {
    const stored = localStorage.getItem("thalasseri_customer_id");
    if (!stored) return null;
    const parsed = Number(stored);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  })();

  updateCustomerLoginUI();
  thalasseryApplyLoginGate();
});
