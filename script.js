import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCK5nyqWkgD9WI0K9naso5KtHLFT9oNTXs",
  authDomain: "servicekomputersurabaya.firebaseapp.com",
  projectId: "servicekomputersurabaya",
  storageBucket: "servicekomputersurabaya.firebasestorage.app",
  messagingSenderId: "985678673202",
  appId: "1:985678673202:web:4ab14bfb82fc3dee4ad32b",
  measurementId: "G-12RJTSNG7S"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let products = [];
let cart = JSON.parse(localStorage.getItem("cart")) || [];

// 1. Load Products from Firebase
async function loadProducts() {
    const productList = document.getElementById('product-list');
    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        products = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Mapping data dari admin.html (judul, harga) ke frontend (name, price)
            products.push({
                id: doc.id,
                name: data.judul || data.name || "Produk Tanpa Nama",
                price: parseInt(data.harga || data.price || 0),
                image: data.image_url || "https://via.placeholder.com/150"
            });
        });
        renderProducts();
        updateCartUI(); // Update UI cart saat load awal
    } catch (error) {
        console.error("Error loading products:", error);
        productList.innerHTML = "<p>Gagal memuat produk dari database.</p>";
    }
}

function renderProducts() {
    const productList = document.getElementById('product-list');
    productList.innerHTML = products.map(product => `
        <div class="product-card">
            <img src="${product.image}" alt="${product.name}" class="product-img">
            <div class="product-info">
                <h3 class="product-title">${product.name}</h3>
                <p class="product-price">Rp ${product.price.toLocaleString('id-ID')}</p>
                <button class="btn-add" data-id="${product.id}">
                    + Keranjang
                </button>
            </div>
        </div>
    `).join('');

    // Event Listener untuk tombol Tambah
    document.querySelectorAll('.btn-add').forEach(btn => {
        btn.addEventListener('click', (e) => {
            addToCart(e.target.dataset.id);
        });
    });
}

// 2. Logic Keranjang
function addToCart(id) {
    const product = products.find(p => p.id === id);
    const existingItem = cart.find(item => item.id === id);

    if (existingItem) {
        existingItem.qty++;
    } else {
        cart.push({ ...product, qty: 1 });
    }
    saveCart();
    updateCartUI();
    alert("Produk masuk keranjang!");
}

function saveCart() {
    localStorage.setItem("cart", JSON.stringify(cart));
}

function updateCartUI() {
    const totalQty = cart.reduce((acc, item) => acc + item.qty, 0);
    document.getElementById('cart-count').innerText = totalQty;

    const cartItemsContainer = document.getElementById('cart-items');
    const checkoutForm = document.getElementById('checkout-form');

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p>Keranjang masih kosong.</p>';
        checkoutForm.style.display = 'none';
    } else {
        cartItemsContainer.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div>
                    <h4>${item.name}</h4>
                    <small>Rp ${item.price.toLocaleString('id-ID')}</small>
                </div>
                <div class="qty-controls">
                    <button class="qty-btn" data-id="${item.id}" data-change="-1">-</button>
                    <span>${item.qty}</span>
                    <button class="qty-btn" data-id="${item.id}" data-change="1">+</button>
                </div>
            </div>
        `).join('');
        
        // Event Listener untuk tombol Qty
        document.querySelectorAll('.qty-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                changeQty(e.target.dataset.id, parseInt(e.target.dataset.change));
            });
        });

        checkoutForm.style.display = 'block';
        calculateTotal();
    }
}

function changeQty(id, change) {
    const item = cart.find(item => item.id === id);
    if (item) {
        item.qty += change;
        if (item.qty <= 0) {
            cart = cart.filter(i => i.id !== id);
        }
    }
    saveCart();
    updateCartUI();
}

function calculateTotal() {
    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
    const courierSelect = document.getElementById('courier');
    let shippingCost = 0;
    
    if(courierSelect.value === 'jne') shippingCost = 10000;
    else if(courierSelect.value === 'pos') shippingCost = 12000;
    else if(courierSelect.value === 'tiki') shippingCost = 15000;

    const total = subtotal + shippingCost;

    document.getElementById('subtotal').innerText = `Rp ${subtotal.toLocaleString('id-ID')}`;
    document.getElementById('shipping-cost').innerText = `Rp ${shippingCost.toLocaleString('id-ID')}`;
    document.getElementById('grand-total').innerText = `Rp ${total.toLocaleString('id-ID')}`;
    
    return { subtotal, shippingCost, total };
}

function checkoutToWhatsapp() {
    const name = document.getElementById('name').value;
    const phone = document.getElementById('phone').value;
    const address = document.getElementById('address').value;
    const courier = document.getElementById('courier').value.toUpperCase();

    if (!name || !phone || !address) {
        alert("Mohon lengkapi data diri Anda!");
        return;
    }

    const { subtotal, shippingCost, total } = calculateTotal();

    let productListText = cart.map((item, idx) => 
        `${idx + 1}. ${item.name} (${item.qty}x) - Rp ${(item.price * item.qty).toLocaleString('id-ID')}`
    ).join('\n');

    const message = `*Halo Admin, Saya mau order!*%0A%0A*Data Penerima:*%0ANama: ${name}%0ANo HP: ${phone}%0AAlamat: ${address}%0AKurir: ${courier}%0A%0A*Pesanan:*%0A${encodeURIComponent(productListText)}%0A---------------------------%0ASubtotal: Rp ${subtotal.toLocaleString('id-ID')}%0AOngkir: Rp ${shippingCost.toLocaleString('id-ID')}%0A*Total Bayar: Rp ${total.toLocaleString('id-ID')}*%0A%0AMohon info rekening pembayaran. Terima kasih!`;

    const adminPhone = "628123456789"; // Ganti dengan No WA Admin
    window.open(`https://wa.me/${adminPhone}?text=${message}`, '_blank');
}

// Event Listeners
document.getElementById('cart-btn').addEventListener('click', () => {
    const modal = document.getElementById('cart-modal');
    modal.style.display = modal.style.display === 'block' ? 'none' : 'block';
});

document.getElementById('close-modal').addEventListener('click', () => {
    document.getElementById('cart-modal').style.display = 'none';
});

document.getElementById('courier').addEventListener('change', calculateTotal);
document.getElementById('btn-wa').addEventListener('click', checkoutToWhatsapp);

// Init
loadProducts();