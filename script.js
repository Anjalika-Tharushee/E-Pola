const products = [
  {
    id: "pola-phone-pro",
    name: "iPhone Pro",
    category: "Phones",
    price: 289900,
    image: "assets/images/phones.png",
    description: "A powerful smartphone with a pro camera system and all-day battery life.",
    details: "Capture detailed photos, enjoy a vivid display, and stay productive throughout the day with this premium smartphone.",
    specs: ["Pro camera system", "All-day battery", "High-resolution display", "Fast wireless connectivity"],
  },
  {
    id: "pola-air-laptop",
    name: "MacBook Air",
    category: "Computers",
    price: 459900,
    image: "assets/images/laptop.png",
    description: "A slim, lightweight laptop for work, study, and creativity.",
    details: "Take your everyday work anywhere with a lightweight design, responsive performance, and a crisp display.",
    specs: ["Lightweight aluminium design", "High-resolution display", "Fast solid-state storage", "All-day battery"],
  },
  {
    id: "pola-smart-tv",
    name: "Smart TV",
    category: "Home electronics",
    price: 189900,
    image: "assets/images/television.png",
    description: "Bring your favourite entertainment to the big screen.",
    details: "Enjoy films, shows, and more at home with a large, detailed screen and connected entertainment features.",
    specs: ["4K-ready display", "Smart streaming apps", "Multiple HDMI inputs", "Slim home-friendly design"],
  },
];

// Load seller-created products into the existing product catalogue
try {
  const sellerProducts = JSON.parse(
    localStorage.getItem("epola-seller-products-v1") || "[]"
  );

  if (Array.isArray(sellerProducts)) {
    sellerProducts.forEach((product) => {
      if (
        product &&
        typeof product.id === "string" &&
        typeof product.name === "string" &&
        Number(product.price) > 0 &&
        !products.some((existing) => existing.id === product.id)
      ) {
        products.push({
          id: product.id,
          name: product.name,
          category: product.category || "Other",
          price: Number(product.price),
          image: product.image || "assets/images/phones.png",
          description: product.description || "",
          details: product.description || "",
          specs: [],
          stock: Number(product.stock || 0),
          sellerEmail: product.sellerEmail || ""
        });
      }
    });
  }
} catch (error) {
  console.error("Could not load seller products:", error);
}

const CART_KEY = "pola-cart-v1";
const WISHLIST_KEY = "pola-wishlist-v1";
const USERS_KEY = "pola-users-v1";
const SESSION_KEY = "pola-session-v1";
const ORDERS_KEY = "pola-orders-v1";

function readStoredArray(key) {
  const value = localStorage.getItem(key);
  if (value === null) return [];

  const parsed = JSON.parse(value);
  if (!Array.isArray(parsed)) {
    throw new Error(`Saved data for "${key}" must be an array.`);
  }
  return parsed;
}

function getCart() {
  return readStoredArray(CART_KEY).filter(
    (item) =>
      item &&
      typeof item.id === "string" &&
      Number.isInteger(item.quantity) &&
      item.quantity > 0 &&
      products.some((product) => product.id === item.id),
  );
}

function getWishlist() {
  return [
    ...new Set(
      readStoredArray(WISHLIST_KEY).filter(
        (id) => typeof id === "string" && products.some((product) => product.id === id),
      ),
    ),
  ];
}

function getOrders() {
  return readStoredArray(ORDERS_KEY);
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function saveWishlist(wishlist) {
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
}

function getUsers() {
  return readStoredArray(USERS_KEY);
}

function getSession() {
  const rawSession = localStorage.getItem(SESSION_KEY);
  if (!rawSession) return null;
  const session = JSON.parse(rawSession);
  return session && typeof session.email === "string" && typeof session.name === "string"
    ? session
    : null;
}

function formatPrice(price) {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 0,
  }).format(price);
}

function getRouteParams() {
  const hash = window.location.hash.slice(1);
  const queryStart = hash.indexOf("?");
  return new URLSearchParams(queryStart === -1 ? "" : hash.slice(queryStart + 1));
}

function getCurrentView() {
  const route = window.location.hash.slice(1).split("?")[0];
  if (route.startsWith("product/")) {
    return { view: "detail", productId: decodeURIComponent(route.slice("product/".length)) };
  }
  if (route.startsWith("order-confirmation/")) {
    return {
      view: "order-confirmation",
      orderId: decodeURIComponent(route.slice("order-confirmation/".length)),
    };
  }

  const supportedViews = new Set(["home", "shop", "cart", "checkout", "wishlist", "login", "register"]);
  return { view: supportedViews.has(route) ? route : "home" };
}

function productCard(product) {
  const inCart = getCart().some((item) => item.id === product.id);
  const inWishlist = getWishlist().includes(product.id);

  return `
    <article class="product-card">
      <a class="product-image" href="#product/${encodeURIComponent(product.id)}" aria-label="View ${product.name} details">
        <img src="${product.image}" alt="${product.name}" loading="lazy" />
        <span class="product-category">${product.category}</span>
      </a>
      <div class="product-info">
        <div>
          <h3><a href="#product/${encodeURIComponent(product.id)}">${product.name}</a></h3>
          <p>${product.description}</p>
        </div>
        <strong class="product-price">${formatPrice(product.price)}</strong>
        <div class="product-actions">
          <button class="button button-primary" type="button" data-add-cart="${product.id}">
            ${inCart ? "Add another" : "Add to cart"}
          </button>
          <button class="button button-secondary wishlist-toggle${inWishlist ? " is-saved" : ""}" type="button" data-toggle-wishlist="${product.id}" aria-label="${inWishlist ? "Remove" : "Save"} ${product.name} ${inWishlist ? "from" : "to"} wishlist" aria-pressed="${inWishlist}">
            ${inWishlist ? "♥" : "♡"}
          </button>
        </div>
      </div>
    </article>
  `;
}

function emptyState(title, message, linkText, href) {
  return `
    <div class="empty-state">
      <span class="empty-icon" aria-hidden="true">♡</span>
      <h2>${title}</h2>
      <p>${message}</p>
      <a class="button button-primary" href="${href}">${linkText}</a>
    </div>
  `;
}

function updateCounts() {
  const cartCount = getCart().reduce((count, item) => count + item.quantity, 0);
  const wishlistCount = getWishlist().length;

  document.querySelectorAll("[data-cart-count]").forEach((element) => {
    element.textContent = String(cartCount);
  });
  document.querySelectorAll("[data-wishlist-count]").forEach((element) => {
    element.textContent = String(wishlistCount);
  });
}

function updateAccountLinks() {
  const session = getSession();
  document.querySelectorAll("[data-account-link]").forEach((link) => {
    if (session) {
      link.textContent = `Hi, ${session.name.split(" ")[0]} · Sign out`;
      link.href = "#sign-out";
      link.setAttribute("data-sign-out", "");
    } else {
      link.textContent = "Sign in";
      link.href = "#login";
      link.removeAttribute("data-sign-out");
    }
  });
}

function renderWelcomeMessage() {
  const message = document.querySelector("[data-welcome-message]");
  const session = getSession();
  if (message) {
    message.hidden = true;
    message.textContent = "";
  }
  if (!message || !session || getRouteParams().get("welcome") !== "1") {
    return;
  }

  message.hidden = false;
  message.textContent = `Welcome, ${session.name.split(" ")[0]} — your account is ready.`;
}

function getFilteredProducts() {
  const params = getRouteParams();
  const view = getCurrentView().view;
  const query = (view === "shop" ? params.get("q") || "" : "").trim().toLowerCase();
  const selectedCategory = view === "shop"
    ? document.querySelector("[data-category-filter]")?.value || params.get("category") || ""
    : "";
  const maxPrice = view === "shop"
    ? Number(document.querySelector("[data-price-filter]")?.value || Infinity)
    : Infinity;
  const sort = view === "shop"
    ? document.querySelector("[data-sort-filter]")?.value || "featured"
    : "featured";

  const filtered = products.filter((product) => {
    const searchable = `${product.name} ${product.category} ${product.description} ${product.details}`.toLowerCase();
    return (
      (!query || searchable.includes(query)) &&
      (!selectedCategory || product.category === selectedCategory) &&
      product.price <= maxPrice
    );
  });

  if (sort === "price-low") filtered.sort((a, b) => a.price - b.price);
  if (sort === "price-high") filtered.sort((a, b) => b.price - a.price);
  if (sort === "name") filtered.sort((a, b) => a.name.localeCompare(b.name));
  return filtered;
}

function renderProducts() {
  const filtered = getFilteredProducts();
  const resultsCount = document.querySelector("[data-results-count]");
  if (resultsCount) {
    resultsCount.textContent = `Showing ${filtered.length} of ${products.length} devices`;
  }

  document.querySelectorAll("[data-product-list]").forEach((container) => {
    container.innerHTML = filtered.length
      ? filtered.map((product) => productCard(product)).join("")
      : emptyState("No devices found", "Try another search or adjust your filters.", "Clear filters", "#shop");
  });
}

function renderCart() {
  const list = document.querySelector("[data-cart-list]");
  const totalContainer = document.querySelector("[data-cart-total]");
  if (!list || !totalContainer) return;

  const cart = getCart();
  const units = cart.reduce((count, item) => count + item.quantity, 0);
  const summary = document.querySelector("[data-cart-summary]");
  if (summary) summary.textContent = `${units} ${units === 1 ? "item" : "items"}`;

  if (!cart.length) {
    list.innerHTML = emptyState(
      "Your cart is empty",
      "Find something you love and add it to your cart.",
      "Browse products",
      "#shop",
    );
    totalContainer.innerHTML = "";
    return;
  }

  list.innerHTML = cart
    .map((item) => {
      const product = products.find((entry) => entry.id === item.id);
      return `
        <article class="cart-item">
          <a href="#product/${encodeURIComponent(product.id)}"><img src="${product.image}" alt="${product.name}" /></a>
          <div class="cart-item-info">
            <span class="product-category">${product.category}</span>
            <h2><a href="#product/${encodeURIComponent(product.id)}">${product.name}</a></h2>
            <strong>${formatPrice(product.price)}</strong>
          </div>
          <div class="quantity-control" aria-label="Quantity for ${product.name}">
            <button type="button" data-quantity="${product.id}" data-change="-1" aria-label="Decrease quantity">−</button>
            <span>${item.quantity}</span>
            <button type="button" data-quantity="${product.id}" data-change="1" aria-label="Increase quantity">+</button>
          </div>
          <button class="remove-button" type="button" data-remove-cart="${product.id}">Remove</button>
        </article>
      `;
    })
    .join("");

  const total = cart.reduce((sum, item) => {
    const product = products.find((entry) => entry.id === item.id);
    return sum + product.price * item.quantity;
  }, 0);

  totalContainer.innerHTML = `
    <h2>Order summary</h2>
    <div class="summary-line"><span>Subtotal (${units} items)</span><strong>${formatPrice(total)}</strong></div>
    <div class="summary-line"><span>Delivery</span><span>Free</span></div>
    <div class="summary-total"><span>Total</span><strong>${formatPrice(total)}</strong></div>
    <p class="storage-note">Your cart is saved in this browser.</p>
    <a class="button button-primary checkout-button" href="#checkout">Proceed to checkout</a>
  `;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function getCartTotal(cart) {
  return cart.reduce((sum, item) => {
    const product = products.find((entry) => entry.id === item.id);
    return sum + product.price * item.quantity;
  }, 0);
}

function renderCheckout() {
  const container = document.querySelector("[data-checkout-content]");
  if (!container) return;

  const cart = getCart();
  if (!cart.length) {
    container.innerHTML = emptyState(
      "Your cart is empty",
      "Add a device to your cart before checking out.",
      "Browse products",
      "#shop",
    );
    return;
  }

  const session = getSession();
  const name = session ? ` value="${escapeHtml(session.name)}"` : "";
  const email = session ? ` value="${escapeHtml(session.email)}"` : "";
  const items = cart.map((item) => {
    const product = products.find((entry) => entry.id === item.id);
    return `
      <li class="checkout-item">
        <img src="${product.image}" alt="" />
        <span><strong>${product.name}</strong><small>Qty ${item.quantity}</small></span>
        <strong>${formatPrice(product.price * item.quantity)}</strong>
      </li>
    `;
  }).join("");

  container.innerHTML = `
    <form class="checkout-form" data-checkout-form>
      <section class="checkout-panel" aria-labelledby="delivery-title">
        <h2 id="delivery-title">Delivery details</h2>
        <div class="checkout-fields">
          <label>Full name<input name="name" type="text" autocomplete="name" required minlength="2"${name} /></label>
          <label>Email address<input name="email" type="email" autocomplete="email" required${email} /></label>
          <label>Phone number<input name="phone" type="tel" autocomplete="tel" inputmode="tel" placeholder="+94 77 123 4567" required /></label>
          <label>City<input name="city" type="text" autocomplete="address-level2" required /></label>
          <label class="checkout-wide">Delivery address<textarea name="address" autocomplete="street-address" rows="3" required></textarea></label>
          <label>Postal code<input name="postalCode" type="text" autocomplete="postal-code" inputmode="numeric" required /></label>
        </div>
        <fieldset class="payment-choice">
          <legend>Payment method</legend>
          <label><input type="radio" name="payment" value="Cash on delivery" checked /> Cash on delivery</label>
          <p>Demo checkout only. No online payment is collected.</p>
        </fieldset>
        <p class="form-message" data-checkout-message role="status" aria-live="polite"></p>
        <button class="button button-primary checkout-submit" type="submit">Place demo order</button>
        <p class="demo-notice">Order details are saved only in this browser for demonstration.</p>
      </section>
    </form>
    <aside class="checkout-panel checkout-order-summary">
      <h2>Order summary</h2>
      <ul class="checkout-items">${items}</ul>
      <div class="summary-line"><span>Subtotal</span><strong>${formatPrice(getCartTotal(cart))}</strong></div>
      <div class="summary-line"><span>Delivery</span><span>Free</span></div>
      <div class="summary-total"><span>Total</span><strong>${formatPrice(getCartTotal(cart))}</strong></div>
    </aside>
  `;
}

function renderOrderConfirmation() {
  const container = document.querySelector("[data-order-confirmation]");
  if (!container) return;

  const { orderId } = getCurrentView();
  const order = getOrders().find((entry) => entry.id === orderId);
  if (!order) {
    container.innerHTML = emptyState(
      "Order not found",
      "This order is not saved in this browser.",
      "Return to shop",
      "#shop",
    );
    return;
  }

  container.innerHTML = `
    <section class="order-confirmation">
      <span class="confirmation-mark" aria-hidden="true">✓</span>
      <span class="eyebrow">Order received</span>
      <h1>Thank you, ${escapeHtml(order.customer.name)}.</h1>
      <p>Your demo order <strong>${escapeHtml(order.id)}</strong> has been saved in this browser.</p>
      <p>A confirmation would be sent to <strong>${escapeHtml(order.customer.email)}</strong> in a live store.</p>
      <div class="checkout-panel confirmation-summary">
        <h2>Order summary</h2>
        <ul class="checkout-items">
          ${order.items.map((item) => `<li class="confirmation-line"><span>${escapeHtml(item.name)} × ${item.quantity}</span><strong>${formatPrice(item.price * item.quantity)}</strong></li>`).join("")}
        </ul>
        <div class="summary-line"><span>Delivery</span><span>Free</span></div>
        <div class="summary-total"><span>Total</span><strong>${formatPrice(order.total)}</strong></div>
        <p class="confirmation-address">${escapeHtml(order.customer.address)}, ${escapeHtml(order.customer.city)} ${escapeHtml(order.customer.postalCode)}</p>
        <p class="storage-note">Payment: ${escapeHtml(order.paymentMethod)}. This demo does not process payments or send messages.</p>
      </div>
      <a class="button button-primary" href="#shop">Continue shopping</a>
    </section>
  `;
}

function handleCheckout(form) {
  const cart = getCart();
  if (!cart.length) {
    showCheckoutMessage(form, "Your cart is empty. Add a device before placing an order.");
    return false;
  }

  const data = new FormData(form);
  const customer = {
    name: String(data.get("name") || "").trim(),
    email: String(data.get("email") || "").trim(),
    phone: String(data.get("phone") || "").trim(),
    city: String(data.get("city") || "").trim(),
    address: String(data.get("address") || "").trim(),
    postalCode: String(data.get("postalCode") || "").trim(),
  };
  if (!/^\+?[0-9 ]{7,20}$/.test(customer.phone)) {
    showCheckoutMessage(form, "Enter a valid phone number using digits, spaces, and an optional leading +.");
    return false;
  }
  const items = cart.map((item) => {
    const product = products.find((entry) => entry.id === item.id);
    return { id: product.id, name: product.name, price: product.price, quantity: item.quantity };
  });
  const order = {
    id: `EP-${Date.now().toString(36).toUpperCase()}`,
    createdAt: new Date().toISOString(),
    customer,
    paymentMethod: String(data.get("payment")),
    items,
    total: getCartTotal(cart),
  };

  const orders = getOrders();
  orders.push(order);
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  saveCart([]);
  window.location.hash = `order-confirmation/${encodeURIComponent(order.id)}`;
  return true;
}

function showCheckoutMessage(form, message) {
  const output = form.querySelector("[data-checkout-message]");
  if (output) {
    output.textContent = message;
    output.className = "form-message is-error";
  }
}

function renderWishlist() {
  const container = document.querySelector("[data-wishlist-list]");
  if (!container) return;

  const wishlist = getWishlist();
  const summary = document.querySelector("[data-wishlist-summary]");
  if (summary) {
    summary.textContent = `${wishlist.length} ${wishlist.length === 1 ? "saved item" : "saved items"}`;
  }

  const savedProducts = wishlist
    .map((id) => products.find((product) => product.id === id))
    .filter(Boolean);
  container.innerHTML = savedProducts.length
    ? savedProducts.map((product) => productCard(product)).join("")
    : emptyState(
        "Your wishlist is empty",
        "Save products here to find them again later.",
        "Explore products",
        "#shop",
      );
}

function renderProductDetail() {
  const container = document.querySelector("[data-product-detail] .detail-content");
  if (!container) return;

  const productId = getCurrentView().productId;
  const product = products.find((entry) => entry.id === productId);
  if (!product) {
    container.innerHTML = emptyState(
      "Device not found",
      "Choose a product from the shop to see its details.",
      "Browse devices",
      "#shop",
    );
    return;
  }

  document.title = `${product.name} | ePola`;
  const saved = getWishlist().includes(product.id);
  container.innerHTML = `
    <div class="detail-image"><img src="${product.image}" alt="${product.name}" /></div>
    <section class="detail-info">
      <span class="product-category">${product.category}</span>
      <h1>${product.name}</h1>
      <p class="detail-description">${product.details}</p>
      <strong class="detail-price">${formatPrice(product.price)}</strong>
      <div class="detail-actions">
        <button class="button button-primary" type="button" data-add-cart="${product.id}">Add to cart</button>
        <button class="button button-secondary wishlist-toggle${saved ? " is-saved" : ""}" type="button" data-toggle-wishlist="${product.id}" aria-pressed="${saved}">${saved ? "♥ Saved" : "♡ Save to wishlist"}</button>
      </div>
      <div class="spec-list">
        <h2>Highlights</h2>
        <ul>${product.specs.map((spec) => `<li>${spec}</li>`).join("")}</ul>
      </div>
      <p class="demo-notice">Product information and prices are sample data for this demo.</p>
    </section>
  `;
}

function renderCatalogControls() {
  const params = getRouteParams();
  const searchInput = document.querySelector("[data-catalog-search] input");
  const categoryFilter = document.querySelector("[data-category-filter]");
  const priceFilter = document.querySelector("[data-price-filter]");
  const priceLabel = document.querySelector("[data-price-label]");

  if (searchInput) searchInput.value = params.get("q") || "";
  if (categoryFilter) categoryFilter.value = params.get("category") || "";
  if (priceFilter && priceLabel) priceLabel.textContent = formatPrice(Number(priceFilter.value));
}

function showFormMessage(form, message, type = "error") {
  const output = form.querySelector("[data-form-message]");
  if (!output) return;
  output.textContent = message;
  output.className = `form-message is-${type}`;
}

async function hashPassword(password, salt) {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Secure password hashing is unavailable in this browser. Open the page in a recent Chrome version.");
  }
  const bytes = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function createSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function handleRegistration(form) {
  const data = new FormData(form);
  const name = String(data.get("name") || "").trim();
  const email = String(data.get("email") || "").trim().toLowerCase();
  const password = String(data.get("password") || "");
  const confirmPassword = String(data.get("confirmPassword") || "");

  if (name.length < 2) return showFormMessage(form, "Enter your full name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showFormMessage(form, "Enter a valid email address.");
  if (password.length < 8) return showFormMessage(form, "Your password must be at least 8 characters.");
  if (password !== confirmPassword) return showFormMessage(form, "The passwords do not match.");

  const users = getUsers();
  if (users.some((user) => user.email === email)) {
    return showFormMessage(form, "An account with this email already exists. Sign in instead.");
  }

  const salt = createSalt();
  users.push({ name, email, salt, passwordHash: await hashPassword(password, salt) });
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  localStorage.setItem(SESSION_KEY, JSON.stringify({ name, email }));
  window.location.hash = "home?welcome=1";
}

async function handleLogin(form) {
  const data = new FormData(form);
  const email = String(data.get("email") || "").trim().toLowerCase();
  const password = String(data.get("password") || "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
    return showFormMessage(form, "Enter a valid email and password (at least 8 characters).");
  }

  const user = getUsers().find((entry) => entry.email === email);
  if (!user || (await hashPassword(password, user.salt)) !== user.passwordHash) {
    return showFormMessage(form, "Email or password is incorrect.");
  }

  localStorage.setItem(SESSION_KEY, JSON.stringify({ name: user.name, email: user.email }));
  window.location.hash = "home?welcome=1";
}

function initAuthForms() {
  const registrationForm = document.querySelector("[data-register-form]");
  registrationForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await handleRegistration(registrationForm);
    } catch (error) {
      showFormMessage(registrationForm, error.message || "Could not create your account.");
    }
  });

  const loginForm = document.querySelector("[data-login-form]");
  loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await handleLogin(loginForm);
    } catch (error) {
      showFormMessage(loginForm, error.message || "Could not sign in.");
    }
  });
}

function initCatalog() {
  renderCatalogControls();

  document.querySelector("[data-home-search]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = document.querySelector("[data-home-search] input").value.trim();
    window.location.hash = query ? `shop?q=${encodeURIComponent(query)}` : "shop";
  });

  const searchForm = document.querySelector("[data-catalog-search]");
  searchForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const params = getRouteParams();
    const query = searchForm.querySelector("input").value.trim();
    if (query) params.set("q", query);
    else params.delete("q");
    const category = document.querySelector("[data-category-filter]")?.value || "";
    if (category) params.set("category", category);
    else params.delete("category");
    window.location.hash = params.toString() ? `shop?${params.toString()}` : "shop";
  });

  document.querySelector("[data-category-filter]")?.addEventListener("change", (event) => {
    const params = getRouteParams();
    if (event.target.value) params.set("category", event.target.value);
    else params.delete("category");
    window.location.hash = params.toString() ? `shop?${params.toString()}` : "shop";
  });
  document.querySelector("[data-sort-filter]")?.addEventListener("change", renderProducts);
  document.querySelector("[data-price-filter]")?.addEventListener("input", (event) => {
    const priceLabel = document.querySelector("[data-price-label]");
    if (priceLabel) priceLabel.textContent = formatPrice(Number(event.target.value));
    renderProducts();
  });
  document.querySelector("[data-clear-filters]")?.addEventListener("click", () => {
    const searchInput = document.querySelector("[data-catalog-search] input");
    const categoryFilter = document.querySelector("[data-category-filter]");
    const sortFilter = document.querySelector("[data-sort-filter]");
    const priceFilter = document.querySelector("[data-price-filter]");
    const priceLabel = document.querySelector("[data-price-label]");

    if (searchInput) searchInput.value = "";
    if (categoryFilter) categoryFilter.value = "";
    if (sortFilter) sortFilter.value = "featured";
    if (priceFilter) priceFilter.value = priceFilter.max;
    if (priceLabel && priceFilter) priceLabel.textContent = formatPrice(Number(priceFilter.value));
    window.location.hash = "shop";
    if (getCurrentView().view === "shop" && window.location.hash === "#shop") renderProducts();
  });
}

function renderRoute() {
  const route = window.location.hash.slice(1).split("?")[0];
  const { view } = getCurrentView();
  document.querySelectorAll("[data-view]").forEach((section) => {
    const active = section.dataset.view === view;
    section.classList.toggle("is-active", active);
    section.hidden = !active;
  });

  const titles = {
    home: "ePola | Smart Tech",
    shop: "Shop Devices | ePola",
    detail: "Device Details | ePola",
    cart: "Shopping Cart | ePola",
    checkout: "Checkout | ePola",
    "order-confirmation": "Order Confirmation | ePola",
    wishlist: "Wishlist | ePola",
    login: "Sign In | ePola",
    register: "Create Account | ePola",
  };
  document.title = titles[view];
  if (view === "shop") renderCatalogControls();
  updateCounts();
  updateAccountLinks();
  renderWelcomeMessage();
  renderProducts();
  renderCart();
  renderCheckout();
  renderOrderConfirmation();
  renderWishlist();
  renderProductDetail();

  if (["about", "categories", "contact"].includes(route)) {
    requestAnimationFrame(() => {
      document.getElementById(route)?.scrollIntoView({ behavior: "smooth" });
    });
  }
}

document.addEventListener("click", (event) => {
  const signOutLink = event.target.closest("[data-sign-out]");
  if (signOutLink) {
    event.preventDefault();
    localStorage.removeItem(SESSION_KEY);
    updateAccountLinks();
    window.location.hash = "home";
    return;
  }

  const button = event.target.closest("button");
  if (!button) return;

  if (button.dataset.addCart) {
    const cart = getCart();
    const item = cart.find((entry) => entry.id === button.dataset.addCart);
    if (item) item.quantity += 1;
    else cart.push({ id: button.dataset.addCart, quantity: 1 });
    saveCart(cart);
  } else if (button.dataset.toggleWishlist) {
    const id = button.dataset.toggleWishlist;
    const wishlist = getWishlist();
    saveWishlist(wishlist.includes(id) ? wishlist.filter((item) => item !== id) : [...wishlist, id]);
  } else if (button.dataset.removeCart) {
    saveCart(getCart().filter((item) => item.id !== button.dataset.removeCart));
  } else if (button.dataset.quantity) {
    const change = Number(button.dataset.change);
    const cart = getCart()
      .map((item) =>
        item.id === button.dataset.quantity ? { ...item, quantity: item.quantity + change } : item,
      )
      .filter((item) => item.quantity > 0);
    saveCart(cart);
  } else {
    return;
  }

  updateCounts();
  updateAccountLinks();
  renderWelcomeMessage();
  renderProducts();
  renderCart();
  renderWishlist();
  renderProductDetail();
});

document.addEventListener("submit", (event) => {
  const form = event.target.closest("[data-checkout-form]");
  if (!form) return;

  event.preventDefault();
  const data = new FormData(form);
  const requiredFields = ["name", "email", "phone", "city", "address", "postalCode"];
  if (requiredFields.some((field) => !String(data.get(field) || "").trim())) {
    showCheckoutMessage(form, "Complete all delivery details before placing your order.");
    return;
  }

  const submitButton = form.querySelector("[type='submit']");
  submitButton.disabled = true;
  try {
    if (!handleCheckout(form)) submitButton.disabled = false;
  } catch (error) {
    submitButton.disabled = false;
    showCheckoutMessage(form, `Could not save your order: ${error.message || "browser storage is unavailable."}`);
  }
});

initCatalog();
initAuthForms();
window.addEventListener("hashchange", renderRoute);
renderRoute();
