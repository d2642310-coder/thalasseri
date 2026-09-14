from pathlib import Path

ROOT = Path("/workspaces/thalasseri")

def page(title, body, active=""):
    nav = f'''
<header class="premium-nav">
  <a class="brand" href="/home">THALASSERY <span>FOOD</span></a>

  <nav class="nav-links">
    <a class="{ "active" if active=="home" else "" }" href="/home">Home</a>
    <a class="{ "active" if active=="menu" else "" }" href="/menu">Menu</a>
    <a class="{ "active" if active=="cart" else "" }" href="/cart">Cart</a>
    <a class="{ "active" if active=="orders" else "" }" href="/orders">Orders</a>
    <a class="{ "active" if active=="account" else "" }" href="/account">Account</a>
  </nav>

  <div style="display:flex;align-items:center;gap:8px">
    <a class="nav-cart" href="/cart">
      🛒 Cart <span data-cart-count>0</span>
    </a>
    <button class="mobile-menu" onclick="document.getElementById('mobileNav').classList.toggle('open')">☰</button>
  </div>

  <div id="mobileNav" style="
    display:none;
    position:absolute;
    right:15px;
    top:65px;
    width:220px;
    padding:10px;
    background:white;
    border:1px solid #e0e9e2;
    border-radius:17px;
    box-shadow:0 20px 50px rgba(0,0,0,.14);
  ">
    <a style="display:block;padding:12px" href="/home">Home</a>
    <a style="display:block;padding:12px" href="/menu">Menu</a>
    <a style="display:block;padding:12px" href="/cart">Cart</a>
    <a style="display:block;padding:12px" href="/orders">Orders</a>
    <a style="display:block;padding:12px" href="/account">Account</a>
    <button style="width:100%;margin-top:5px" class="secondary-btn" onclick="logoutPremium()">Logout</button>
  </div>
</header>
<script>
const s=document.createElement("style");
s.textContent="#mobileNav.open{display:block!important}";
document.head.appendChild(s);
</script>
'''

    return f'''<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>{title} — THALASSERY FOOD</title>
<link rel="stylesheet" href="/premium.css">
</head>
<body>
{nav}
<main class="page">
{body}
</main>

<div id="toast" style="
position:fixed;
bottom:25px;
left:50%;
transform:translateX(-50%);
padding:12px 18px;
background:#173321;
color:white;
border-radius:12px;
opacity:0;
pointer-events:none;
transition:.2s;
z-index:9999;
"></div>

<script src="/premium.js"></script>
</body>
</html>'''

# HOME
home = page("Home", '''
<section class="hero-premium">
  <div>
    <div class="eyebrow">Authentic Kerala Flavour</div>

    <h1>
      Taste of<br>
      <span>Thalassery.</span>
    </h1>

    <p>
      Traditional Thalassery flavours, freshly prepared
      and delivered to your doorstep.
    </p>

    <div class="hero-buttons">
      <a class="primary-btn" href="/menu">Explore Menu →</a>
      <a class="secondary-btn" href="/orders">My Orders</a>
    </div>
  </div>

  <div class="hero-card">
    <div class="hero-food-icon">🍛</div>
  </div>
</section>

<section style="margin-top:70px">
  <div class="section-title">
    <small>EXPLORE</small>
    <h2>What are you craving?</h2>
    <p>Choose your favourite Thalassery category.</p>
  </div>

  <div class="category-grid">
    <a class="category-card" href="/menu">
      <div class="category-icon">🍛</div>
      <strong>Meals</strong>
    </a>

    <a class="category-card" href="/menu">
      <div class="category-icon">🍗</div>
      <strong>Chicken</strong>
    </a>

    <a class="category-card" href="/menu">
      <div class="category-icon">🍚</div>
      <strong>Rice</strong>
    </a>

    <a class="category-card" href="/menu">
      <div class="category-icon">🥤</div>
      <strong>Drinks</strong>
    </a>
  </div>
</section>
''',"home")

# MENU
menu = page("Menu", '''
<div class="section-title">
  <small>THALASSERY KITCHEN</small>
  <h2>Our Menu</h2>
  <p>Freshly prepared favourites.</p>
</div>

<div id="menuGrid" class="menu-grid">
  <div class="empty-state">Loading menu...</div>
</div>
''',"menu")

# CART
cart = page("Cart", '''
<div class="section-title">
  <small>YOUR SELECTION</small>
  <h2>Your Cart</h2>
  <p>Review your food before checkout.</p>
</div>

<div class="panel">
  <div id="cartItems"></div>

  <div class="total-box">
    <div class="total-line">
      <span>Subtotal</span>
      <strong id="subtotal">AED 0.00</strong>
    </div>

    <div class="total-line final">
      <span>Total</span>
      <strong id="cartTotal">AED 0.00</strong>
    </div>

    <a
      class="primary-btn"
      href="/checkout"
      style="display:block;text-align:center;margin-top:18px"
    >
      Proceed to Checkout →
    </a>
  </div>
</div>
''',"cart")

# CHECKOUT
checkout = page("Checkout", '''
<div class="section-title">
  <small>FINAL STEP</small>
  <h2>Checkout</h2>
  <p>Enter your delivery details.</p>
</div>

<div class="checkout-grid">

  <div class="panel">
    <h3>Delivery Details</h3>

    <input
      class="form-control"
      id="deliveryAddress"
      placeholder="Building / House / Street / Area"
    >

    <textarea
      class="form-control"
      id="deliveryNote"
      style="margin-top:12px"
      rows="3"
      placeholder="Delivery note (optional)"
    ></textarea>

    <h3 style="margin-top:25px">Delivery Location</h3>

    <div id="deliveryMap" class="map-box"></div>

    <input type="hidden" id="mapLatitude">
    <input type="hidden" id="mapLongitude">

    <button
      type="button"
      class="secondary-btn"
      style="margin-top:10px"
      onclick="useCheckoutLocation()"
    >
      📍 Use My Current Location
    </button>

    <h3 style="margin-top:25px">Payment</h3>

    <select class="form-control" id="paymentMethod">
      <option value="Cash">Cash on Delivery</option>
      <option value="Credit">Credit</option>
    </select>
  </div>

  <div class="panel">
    <h3>Your Order</h3>

    <div id="checkoutItems"></div>

    <div class="total-box">
      <div class="total-line final">
        <span>Total</span>
        <strong id="checkoutTotal">AED 0.00</strong>
      </div>

      <button
        class="primary-btn"
        style="width:100%;margin-top:15px"
        onclick="placePremiumOrder()"
      >
        Place Order →
      </button>
    </div>
  </div>

</div>

<script>
let checkoutMap=null;
let checkoutMarker=null;

function initCheckoutMap(){
  if(typeof L==="undefined")return;

  if(checkoutMap)return;

  checkoutMap=L.map("deliveryMap").setView([25.3463,55.4209],13);

  L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    {maxZoom:19,attribution:"Tiles © Esri"}
  ).addTo(checkoutMap);

  checkoutMap.on("click",e=>{
    setCheckoutLocation(e.latlng.lat,e.latlng.lng);
  });
}

function setCheckoutLocation(lat,lng){
  if(!checkoutMap)return;

  if(checkoutMarker){
    checkoutMarker.setLatLng([lat,lng]);
  }else{
    checkoutMarker=L.marker([lat,lng],{draggable:true}).addTo(checkoutMap);

    checkoutMarker.on("dragend",e=>{
      const p=e.target.getLatLng();
      setCheckoutLocation(p.lat,p.lng);
    });
  }

  document.getElementById("mapLatitude").value=lat;
  document.getElementById("mapLongitude").value=lng;

  checkoutMap.setView([lat,lng],17);
}

function useCheckoutLocation(){
  if(!navigator.geolocation){
    alert("Location is not supported.");
    return;
  }

  navigator.geolocation.getCurrentPosition(pos=>{
    initCheckoutMap();

    setTimeout(()=>{
      setCheckoutLocation(
        pos.coords.latitude,
        pos.coords.longitude
      );
    },500);
  },()=>{
    alert("Please allow location access.");
  });
}

const leaflet=document.createElement("script");
leaflet.src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
leaflet.onload=()=>{
  const css=document.createElement("link");
  css.rel="stylesheet";
  css.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  document.head.appendChild(css);
  setTimeout(initCheckoutMap,300);
};
document.body.appendChild(leaflet);
</script>
''',"cart")

# ORDERS
orders = page("Orders", '''
<div class="section-title">
  <small>YOUR ACTIVITY</small>
  <h2>My Orders</h2>
  <p>Track your previous and current orders.</p>
</div>

<div id="ordersList">
  <div class="empty-state">Loading orders...</div>
</div>
''',"orders")

# ACCOUNT
account = page("Account", '''
<div class="section-title">
  <small>PROFILE</small>
  <h2>My Account</h2>
  <p>Your THALASSERY customer account.</p>
</div>

<div class="panel">
  <h3>Customer Information</h3>

  <div class="account-grid">

    <div class="stat-card">
      <small>Name</small>
      <strong id="accountName">—</strong>
    </div>

    <div class="stat-card">
      <small>Phone</small>
      <strong id="accountPhone">—</strong>
    </div>

    <div class="stat-card">
      <small>Available Credit</small>
      <strong id="accountCredit">AED 0.00</strong>
    </div>

  </div>

  <div style="margin-top:25px;display:flex;gap:10px;flex-wrap:wrap">
    <a class="primary-btn" href="/orders">View Orders</a>
    <button class="secondary-btn" onclick="logoutPremium()">Logout</button>
  </div>
</div>
''',"account")

success = page("Order Confirmed", '''
<div class="panel" style="max-width:650px;margin:70px auto;text-align:center">
  <div style="font-size:80px">✅</div>

  <h1>Order Placed!</h1>

  <p style="color:#718176;line-height:1.7">
    Thank you for ordering from THALASSERY FOOD.
    Your order has been received successfully.
  </p>

  <div style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-top:25px">
    <a class="primary-btn" href="/orders">View My Orders</a>
    <a class="secondary-btn" href="/menu">Order More</a>
  </div>
</div>
''')

for name,content in {
    "home.html":home,
    "menu.html":menu,
    "cart.html":cart,
    "checkout.html":checkout,
    "orders.html":orders,
    "account.html":account,
    "order-success.html":success
}.items():
    (ROOT/name).write_text(content)

print("Premium pages created.")
