let cart = JSON.parse(localStorage.getItem("thalassery_cart") || "[]");
let customerId = localStorage.getItem("thalasseri_customer_id");

function saveCart(){
  localStorage.setItem("thalassery_cart", JSON.stringify(cart));
}

function cartCount(){
  return cart.reduce((sum,item)=>sum + Number(item.qty || 0),0);
}

function updateCartCount(){
  document.querySelectorAll("[data-cart-count]").forEach(el=>{
    el.textContent = cartCount();
  });
}

function addToCart(item){
  const existing = cart.find(x=>String(x.id)===String(item.id));

  if(existing){
    existing.qty++;
  }else{
    cart.push({
      id:item.id,
      name:item.name,
      price:Number(item.price || 0),
      qty:1
    });
  }

  saveCart();
  updateCartCount();

  const msg=document.getElementById("toast");
  if(msg){
    msg.textContent="✓ Added to cart";
    msg.classList.add("show");
    setTimeout(()=>msg.classList.remove("show"),1500);
  }
}

function removeFromCart(id){
  cart=cart.filter(x=>String(x.id)!==String(id));
  saveCart();
  location.reload();
}

function changeQty(id,amount){
  const item=cart.find(x=>String(x.id)===String(id));
  if(!item)return;

  item.qty += amount;

  if(item.qty<=0){
    cart=cart.filter(x=>String(x.id)!==String(id));
  }

  saveCart();
  location.reload();
}

function requireLogin(){
  if(!customerId){
    location.href="/";
    return false;
  }
  return true;
}

async function loadMenu(){
  const grid=document.getElementById("menuGrid");
  if(!grid)return;

  try{
    const response=await fetch("/api/menu");
    const data=await response.json();

    const menu=Array.isArray(data)
      ? data
      : (data.menu || data.items || []);

    if(!menu.length){
      grid.innerHTML='<div class="empty-state">No menu items available.</div>';
      return;
    }

    grid.innerHTML=menu.map(item=>`
      <article class="food-card">
        <div class="food-image">🍛</div>
        <div class="food-body">
          <h3>${escapeHtml(item.name || "Food")}</h3>
          <p>${escapeHtml(item.description || "Freshly prepared Thalassery special.")}</p>

          <div class="food-bottom">
            <span class="price">AED ${Number(item.price || 0).toFixed(2)}</span>

            <button
              class="add-btn"
              onclick='addToCart(${JSON.stringify({
                id:item.id,
                name:item.name,
                price:item.price
              })})'
            >
              + Add
            </button>
          </div>
        </div>
      </article>
    `).join("");

  }catch(error){
    console.error(error);
    grid.innerHTML='<div class="empty-state">Could not load menu.</div>';
  }
}

function renderCart(){
  const box=document.getElementById("cartItems");
  const subtotalEl=document.getElementById("subtotal");
  const totalEl=document.getElementById("cartTotal");

  if(!box)return;

  if(!cart.length){
    box.innerHTML=`
      <div class="empty-state">
        <div style="font-size:55px">🛒</div>
        <h3>Your cart is empty</h3>
        <p>Add delicious Thalassery food from the menu.</p>
        <a class="primary-btn" href="/menu">Browse Menu</a>
      </div>
    `;

    if(subtotalEl)subtotalEl.textContent="AED 0.00";
    if(totalEl)totalEl.textContent="AED 0.00";
    return;
  }

  let total=0;

  box.innerHTML=cart.map(item=>{
    const line=Number(item.price)*Number(item.qty);
    total+=line;

    return `
      <div class="cart-row">
        <div>
          <strong>${escapeHtml(item.name)}</strong>
          <div style="color:#718176;margin-top:5px">
            AED ${Number(item.price).toFixed(2)}
          </div>
        </div>

        <div class="qty-controls">
          <button onclick="changeQty(${item.id},-1)">−</button>
          <strong>${item.qty}</strong>
          <button onclick="changeQty(${item.id},1)">+</button>
          <button onclick="removeFromCart(${item.id})">×</button>
        </div>
      </div>
    `;
  }).join("");

  if(subtotalEl)subtotalEl.textContent=`AED ${total.toFixed(2)}`;
  if(totalEl)totalEl.textContent=`AED ${total.toFixed(2)}`;
}

function renderCheckout(){
  const box=document.getElementById("checkoutItems");
  const totalEl=document.getElementById("checkoutTotal");

  if(!box)return;

  let total=0;

  box.innerHTML=cart.map(item=>{
    const line=Number(item.price)*Number(item.qty);
    total+=line;

    return `
      <div class="total-line">
        <span>${escapeHtml(item.name)} × ${item.qty}</span>
        <strong>AED ${line.toFixed(2)}</strong>
      </div>
    `;
  }).join("");

  if(totalEl)totalEl.textContent=`AED ${total.toFixed(2)}`;
}

async function placePremiumOrder(){
  if(!requireLogin())return;

  if(!cart.length){
    alert("Your cart is empty.");
    return;
  }

  const address=document.getElementById("deliveryAddress")?.value.trim() || "";
  const lat=document.getElementById("mapLatitude")?.value || "";
  const lng=document.getElementById("mapLongitude")?.value || "";
  const payment=document.getElementById("paymentMethod")?.value || "Cash";

  if(!address){
    alert("Please enter your delivery address.");
    return;
  }

  try{
    const response=await fetch("/api/orders",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        customer_id:Number(customerId),
        items:cart.map(item=>({
          id:item.id,
          quantity:item.qty
        })),
        payment_method:payment,
        delivery_address:address,
        latitude:lat ? Number(lat) : null,
        longitude:lng ? Number(lng) : null
      })
    });

    const data=await response.json();

    if(!response.ok){
      alert(data.error || "Could not place order.");
      return;
    }

    cart=[];
    saveCart();

    location.href="/order-success";
  }catch(error){
    console.error(error);
    alert("Server connection failed.");
  }
}

async function loadOrders(){
  if(!requireLogin())return;

  const box=document.getElementById("ordersList");
  if(!box)return;

  try{
    const response=await fetch(`/api/customer/${customerId}/orders`);
    const data=await response.json();

    const orders=Array.isArray(data)
      ? data
      : (data.orders || []);

    if(!orders.length){
      box.innerHTML=`
        <div class="empty-state">
          <div style="font-size:55px">📦</div>
          <h3>No orders yet</h3>
          <p>Your orders will appear here.</p>
          <a class="primary-btn" href="/menu">Start Ordering</a>
        </div>
      `;
      return;
    }

    box.innerHTML=orders.map(order=>`
      <div class="order-card">
        <div class="order-top">
          <div>
            <strong>Order #${order.id}</strong>
            <div style="margin-top:6px;color:#718176">
              ${order.created_at || ""}
            </div>
          </div>

          <span class="status">
            ${escapeHtml(order.status || "Pending")}
          </span>
        </div>

        <div class="total-line" style="margin-top:18px">
          <span>Total</span>
          <strong>AED ${Number(order.total || 0).toFixed(2)}</strong>
        </div>

        ${
          order.latitude !== null &&
          order.latitude !== undefined &&
          order.longitude !== null &&
          order.longitude !== undefined
          ? `
            <button
              class="secondary-btn"
              style="margin-top:12px"
              onclick="window.open('https://www.google.com/maps/search/?api=1&query=${order.latitude},${order.longitude}','_blank')"
            >
              📍 Delivery Location
            </button>
          `
          : ""
        }
      </div>
    `).join("");

  }catch(error){
    console.error(error);
    box.innerHTML='<div class="empty-state">Could not load orders.</div>';
  }
}

async function loadAccount(){
  if(!requireLogin())return;

  const name=document.getElementById("accountName");
  const phone=document.getElementById("accountPhone");
  const credit=document.getElementById("accountCredit");

  try{
    const response=await fetch(`/api/customer/${customerId}`);
    const data=await response.json();

    if(name)name.textContent=data.name || "Customer";
    if(phone)phone.textContent=data.phone || "";
    if(credit)credit.textContent=`AED ${Number(data.available_credit || 0).toFixed(2)}`;
  }catch(error){
    console.error(error);
  }
}

function logoutPremium(){
  localStorage.removeItem("thalasseri_customer_id");
  customerId=null;
  location.href="/";
}

function escapeHtml(value){
  return String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

document.addEventListener("DOMContentLoaded",()=>{
  updateCartCount();
  loadMenu();
  renderCart();
  renderCheckout();
  loadOrders();
  loadAccount();
});
