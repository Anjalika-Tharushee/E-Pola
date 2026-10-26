
"use strict";

const SELLERS_KEY = "epola-sellers-v1";
const SELLER_SESSION_KEY = "epola-seller-session-v1";
const SELLER_PRODUCTS_KEY = "epola-seller-products-v1";
const ORDER_STATUS_KEY = "epola-order-status-v1";
const ORDERS_KEY = "pola-orders-v1";

const $ = (id) => document.getElementById(id);

let authMode = "login";
let currentSeller = null;
let selectedImage = "";
let imageChanged = false;

function readArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function readObject(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

function saveArray(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  })[char]);
}

function money(value) {
  return "LKR " + Number(value || 0).toLocaleString("en-LK", {
    maximumFractionDigits: 2
  });
}

function showMessage(id, message, error = false) {
  const element = $(id);
  element.textContent = message;
  element.classList.toggle("error", error);
}

function getProducts() {
  return readArray(SELLER_PRODUCTS_KEY);
}

function getOrders() {
  return readArray(ORDERS_KEY);
}

function getMyProducts() {
  return getProducts().filter(
    (product) => product.sellerEmail === currentSeller.email
  );
}

function setAuthMode(mode) {
  authMode = mode;
  const registering = mode === "register";

  $("nameField").hidden = !registering;
  $("sellerName").required = registering;
  $("loginTab").classList.toggle("active", !registering);
  $("registerTab").classList.toggle("active", registering);
  $("authTitle").textContent = registering ? "Create Seller Account" : "Welcome back";
  $("authDescription").textContent = registering
    ? "Register your seller account to start listing products."
    : "Sign in to manage your products and orders.";
  $("authSubmit").textContent = registering ? "Create Account" : "Sign In";
  showMessage("authMessage", "");
}

$("loginTab").addEventListener("click", () => setAuthMode("login"));
$("registerTab").addEventListener("click", () => setAuthMode("register"));

$("authForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const email = $("sellerEmail").value.trim().toLowerCase();
  const password = $("sellerPassword").value;
  const sellers = readArray(SELLERS_KEY);

  if (authMode === "register") {
    const name = $("sellerName").value.trim();

    if (!name) {
      showMessage("authMessage", "Enter your seller or business name.", true);
      return;
    }

    if (sellers.some((seller) => seller.email === email)) {
      showMessage("authMessage", "This email is already registered. Please sign in.", true);
      return;
    }

    sellers.push({
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      name,
      email,
      password
    });

    saveArray(SELLERS_KEY, sellers);
    showMessage("authMessage", "Account created! You can now sign in.");
    setAuthMode("login");
    $("sellerEmail").value = email;
    $("sellerPassword").value = "";
    return;
  }

  const seller = sellers.find(
    (entry) => entry.email === email && entry.password === password
  );

  if (!seller) {
    showMessage("authMessage", "Incorrect email or password.", true);
    return;
  }

  currentSeller = { id: seller.id, name: seller.name, email: seller.email };
  sessionStorage.setItem(SELLER_SESSION_KEY, JSON.stringify(currentSeller));
  openDashboard();
});

function restoreSession() {
  try {
    const session = JSON.parse(sessionStorage.getItem(SELLER_SESSION_KEY) || "null");
    if (!session || !session.email) return;

    const seller = readArray(SELLERS_KEY).find(
      (entry) => entry.email === session.email && entry.id === session.id
    );

    if (seller) {
      currentSeller = { id: seller.id, name: seller.name, email: seller.email };
      openDashboard();
    } else {
      sessionStorage.removeItem(SELLER_SESSION_KEY);
    }
  } catch {
    sessionStorage.removeItem(SELLER_SESSION_KEY);
  }
}

function openDashboard() {
  $("authView").hidden = true;
  $("dashboardView").hidden = false;
  $("dashboardSellerName").textContent = currentSeller.name;
  $("dashboardSellerEmail").textContent = currentSeller.email;
  $("sellerAvatar").textContent = currentSeller.name.charAt(0).toUpperCase();
  renderDashboard();
}

$("logoutBtn").addEventListener("click", () => {
  sessionStorage.removeItem(SELLER_SESSION_KEY);
  currentSeller = null;
  $("dashboardView").hidden = true;
  $("authView").hidden = false;
  $("authForm").reset();
  setAuthMode("login");
});

function renderDashboard() {
  const products = getMyProducts();
  const productIds = new Set(products.map((product) => product.id));
  const orders = getOrders().filter((order) =>
    (order.items || []).some((item) => productIds.has(item.id))
  );

  const statuses = readObject(ORDER_STATUS_KEY);
  const orderValue = orders.reduce((total, order) => {
    return total + (order.items || []).reduce((sum, item) => {
      if (!productIds.has(item.id)) return sum;
      return sum + Number(item.price || 0) * Number(item.quantity || 0);
    }, 0);
  }, 0);

  $("totalProducts").textContent = products.length;
  $("totalStock").textContent = products.reduce(
    (sum, product) => sum + Number(product.stock || 0), 0
  );
  $("totalOrders").textContent = orders.length;
  $("orderValue").textContent = money(orderValue);
  $("orderBadge").textContent = orders.length;

  renderProducts();
  renderOrders();
}

function resetProductForm() {
  $("productForm").reset();
  $("productId").value = "";
  $("productFormTitle").textContent = "Add New Product";
  $("imagePreview").hidden = true;
  $("imagePreview").removeAttribute("src");
  selectedImage = "";
  imageChanged = false;
  showMessage("productMessage", "");
}

function openProductForm(product = null) {
  resetProductForm();
  $("productForm").hidden = false;
  $("productFormTitle").textContent = product ? "Edit Product" : "Add New Product";

  if (product) {
    $("productId").value = product.id;
    $("productName").value = product.name;
    $("productCategory").value = product.category;
    $("productPrice").value = product.price;
    $("productStock").value = product.stock;
    $("productDescription").value = product.description;

    selectedImage = product.image || "";
    if (selectedImage) {
      $("imagePreview").src = selectedImage;
      $("imagePreview").hidden = false;
    }
  }

  $("productForm").scrollIntoView({ behavior: "smooth", block: "start" });
}

$("addProductBtn").addEventListener("click", () => openProductForm());

function closeProductForm() {
  $("productForm").hidden = true;
  resetProductForm();
}

$("cancelProductBtn").addEventListener("click", closeProductForm);
$("cancelProductBtnBottom").addEventListener("click", closeProductForm);

$("productImage").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    showMessage("productMessage", "Please select a JPG, PNG or WebP image.", true);
    event.target.value = "";
    return;
  }

  if (file.size > 8 * 1024 * 1024) {
    showMessage("productMessage", "Choose an image smaller than 8 MB.", true);
    event.target.value = "";
    return;
  }

  try {
    selectedImage = await compressImage(file);
    imageChanged = true;
    $("imagePreview").src = selectedImage;
    $("imagePreview").hidden = false;
    showMessage("productMessage", "Image ready to save.");
  } catch {
    showMessage("productMessage", "Could not process this image. Try another file.", true);
  }
});

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      const maxDimension = 650;
      const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");

      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));

      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.72));
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image loading failed"));
    };

    image.src = url;
  });
}

$("productForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const id = $("productId").value;
  const products = getProducts();
  const existing = products.find(
    (product) => product.id === id && product.sellerEmail === currentSeller.email
  );

  if (id && !existing) {
    showMessage("productMessage", "Product not found or access denied.", true);
    return;
  }

  if (id && $("productImage").files.length === 0 && !selectedImage) {
    selectedImage = existing?.image || "";
  }

  if (!selectedImage) {
    showMessage("productMessage", "Please upload a product image.", true);
    return;
  }

  const product = {
    id: existing ? existing.id : "seller-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
    sellerId: currentSeller.id,
    sellerEmail: currentSeller.email,
    name: $("productName").value.trim(),
    category: $("productCategory").value,
    price: Number($("productPrice").value),
    stock: Number($("productStock").value),
    description: $("productDescription").value.trim(),
    image: selectedImage,
    updatedAt: new Date().toISOString()
  };

  if (!product.name || !product.description || product.price <= 0 ||
      !Number.isFinite(product.price) || !Number.isInteger(product.stock) ||
      product.stock < 0) {
    showMessage("productMessage", "Check the product name, description, price and stock.", true);
    return;
  }

  if (existing) {
    const index = products.findIndex((entry) => entry.id === existing.id);
    products[index] = product;
  } else {
    product.createdAt = new Date().toISOString();
    products.push(product);
  }

  try {
    saveArray(SELLER_PRODUCTS_KEY, products);
    closeProductForm();
    renderDashboard();
  } catch {
    showMessage("productMessage", "Storage is full. Try a smaller image or remove old products.", true);
  }
});

function renderProducts() {
  const search = $("productSearch").value.trim().toLowerCase();
  const category = $("categoryFilter").value;

  const products = getMyProducts().filter((product) =>
    product.name.toLowerCase().includes(search) &&
    (!category || product.category === category)
  );

  if (!products.length) {
    $("productList").innerHTML =
      '<div class="empty-state">No products found. Add your first product to get started.</div>';
    return;
  }

  $("productList").innerHTML = products.map((product) => `
    <article class="product-row">
      <img src="${escapeHTML(product.image)}" alt="${escapeHTML(product.name)}">
      <div class="product-info">
        <h3>${escapeHTML(product.name)}</h3>
        <p>${escapeHTML(product.category)} · <span class="product-price">${money(product.price)}</span></p>
        <p class="${product.stock <= 5 ? "stock-low" : ""}">
          Stock: ${Number(product.stock)} ${product.stock <= 5 ? "· Low stock" : ""}
        </p>
      </div>
      <div class="row-actions">
        <button class="btn-small" data-edit="${escapeHTML(product.id)}" type="button">Edit</button>
        <button class="btn-small delete" data-delete="${escapeHTML(product.id)}" type="button">Delete</button>
      </div>
    </article>
  `).join("");
}

$("productList").addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-edit]");
  const deleteButton = event.target.closest("[data-delete]");

  if (editButton) {
    const product = getMyProducts().find((entry) => entry.id === editButton.dataset.edit);
    if (product) openProductForm(product);
  }

  if (deleteButton) {
    const id = deleteButton.dataset.delete;
    const product = getMyProducts().find((entry) => entry.id === id);
    if (!product) return;

    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;

    saveArray(SELLER_PRODUCTS_KEY, getProducts().filter(
      (entry) => !(entry.id === id && entry.sellerEmail === currentSeller.email)
    ));
    renderDashboard();
  }
});

$("productSearch").addEventListener("input", renderProducts);
$("categoryFilter").addEventListener("change", renderProducts);

function renderOrders() {
  const products = getMyProducts();
  const productMap = new Map(products.map((product) => [product.id, product]));
  const statuses = readObject(ORDER_STATUS_KEY);

  const orders = getOrders().filter((order) =>
    (order.items || []).some((item) => productMap.has(item.id))
  );

  if (!orders.length) {
    $("ordersList").innerHTML =
      '<div class="empty-state">No orders yet. Orders containing your products will appear here.</div>';
    return;
  }

  $("ordersList").innerHTML = orders.slice().reverse().map((order) => {
    const items = (order.items || []).filter((item) => productMap.has(item.id));
    const status = statuses[order.id] || "Pending";
    const subtotal = items.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0
    );
    const customer = order.customer || {};

    return `
      <article class="order-card">
        <div class="order-top">
          <div>
            <h3>Order ${escapeHTML(order.id)}</h3>
            <p>${escapeHTML(new Date(order.createdAt || Date.now()).toLocaleString())}</p>
          </div>
          <strong class="product-price">${money(subtotal)}</strong>
        </div>
        <p>Customer: ${escapeHTML(customer.name || "Customer")}</p>
        <p>Email: ${escapeHTML(customer.email || "Not provided")}</p>
        <p>Delivery: ${escapeHTML(customer.address || customer.city || "Not provided")}</p>
        <div class="order-items">
          ${items.map((item) => `
            <div class="order-item">
              <span>${escapeHTML(item.name)} × ${Number(item.quantity)}</span>
              <strong>${money(Number(item.price) * Number(item.quantity))}</strong>
            </div>
          `).join("")}
        </div>
        <div class="order-controls">
          <label for="status-${escapeHTML(order.id)}">Order status</label>
          <select id="status-${escapeHTML(order.id)}" data-order-status="${escapeHTML(order.id)}">
            ${["Pending", "Processing", "Shipped", "Delivered", "Cancelled"].map((option) =>
              `<option ${option === status ? "selected" : ""}>${option}</option>`
            ).join("")}
          </select>
          <span class="status-pill">${escapeHTML(status)}</span>
        </div>
      </article>
    `;
  }).join("");
}

$("ordersList").addEventListener("change", (event) => {
  const select = event.target.closest("[data-order-status]");
  if (!select) return;

  const orderId = select.dataset.orderStatus;
  const belongsToSeller = getOrders().some((order) =>
    order.id === orderId &&
    (order.items || []).some((item) => getMyProducts().some((p) => p.id === item.id))
  );

  if (!belongsToSeller) return;

  const statuses = readObject(ORDER_STATUS_KEY);
  statuses[orderId] = select.value;
  localStorage.setItem(ORDER_STATUS_KEY, JSON.stringify(statuses));
  renderOrders();
});

document.querySelectorAll(".nav-tab").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".nav-tab").forEach((tab) =>
      tab.classList.toggle("active", tab === button)
    );

    $("productsSection").hidden = button.dataset.section !== "productsSection";
    $("ordersSection").hidden = button.dataset.section !== "ordersSection";
  });
});

$("refreshOrdersBtn").addEventListener("click", renderDashboard);

restoreSession();
