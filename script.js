import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, addDoc, runTransaction, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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
const auth = getAuth(app);

let products = [];
let cart = JSON.parse(localStorage.getItem("cart")) || [];
let wishlist = JSON.parse(localStorage.getItem("wishlist")) || [];
let currentShippingCost = 0; // Variabel global untuk menyimpan ongkir aktif
let availableCouriers = [];
let currentUser = null; // Menyimpan data user yang login
let storeConfig = null; // Menyimpan konfigurasi toko
let currentPage = 1;
const itemsPerPage = 20; // Jumlah produk per halaman

// KONFIGURASI BINDERBYTE (SERVER SENDIRI)
const BINDERBYTE_URL = 'https://servicekomputersurabaya.id/binderbyte.php'; // Pastikan file ini diupload

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
                weight: parseInt(data.berat || data.weight || 1000), // Ambil berat (gram)
                category: data.kategori || "Umum",
                image: data.image_url || "https://via.placeholder.com/150"
            });
        });

        // Render Sidebar Kategori
        const categories = [...new Set(products.map(p => p.category))].sort();
        renderCategories(categories);
        
        // Cek apakah ada pencarian dari URL (misal redirect dari detail.html)
        const params = new URLSearchParams(window.location.search);
        const query = params.get('q');
        const searchInput = document.getElementById('search-input');

        if (query && searchInput) {
            searchInput.value = query;
            handleSearch(query);
        } else {
            renderProducts();
        }

    } catch (error) {
        console.error("Error loading products:", error);
        productList.innerHTML = "<p>Gagal memuat produk dari database.</p>";
    }
}

async function loadStoreConfig() {
    try {
        const docRef = doc(db, "settings", "store_config");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            storeConfig = docSnap.data();
        }
    } catch (e) {
        console.error("Gagal load config:", e);
    }
}

function renderCategories(categories) {
    const list = document.getElementById('category-list');
    if(!list) return;
    
    let html = `<a href="#" onclick="filterCategory('all', this); return false;" class="cat-link active">Semua Produk</a>`;
    
    categories.forEach(cat => {
        html += `<a href="#" onclick="filterCategory('${cat}', this); return false;" class="cat-link">${cat}</a>`;
    });
    
    list.innerHTML = html;
}

window.filterCategory = function(category, element) {
    // Update active class
    const links = document.querySelectorAll('.cat-link');
    links.forEach(link => link.classList.remove('active'));
    if(element) element.classList.add('active');

    if (category === 'all') {
        currentPage = 1;
        renderProducts(products, true);
    } else {
        const filtered = products.filter(p => p.category === category);
        currentPage = 1;
        renderProducts(filtered, true);
    }
}

function renderProducts(data = products, resetPage = false) {
    if (resetPage) currentPage = 1;

    // Logic Pagination
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedData = data.slice(start, end);

    const productList = document.getElementById('product-list');
    if (data.length === 0) {
        productList.innerHTML = '<p style="text-align:center; width:100%;">Produk tidak ditemukan.</p>';
        return;
    }

    let html = '<div class="product-grid">';
    html += paginatedData.map(product => {
        const isWishlist = wishlist.some(item => item.id === product.id);
        const heartClass = isWishlist ? 'active' : '';
        return `
        <div class="product-card">
            <button class="btn-wishlist ${heartClass}" data-id="${product.id}"><span class="material-icons">favorite</span></button>
            <div onclick="window.location.href='detail.html?id=${product.id}'" style="cursor:pointer">
                <img src="${product.image}" alt="${product.name}" class="product-img">
            </div>
            <div class="product-info">
                <h3 class="product-title" onclick="window.location.href='detail.html?id=${product.id}'" style="cursor:pointer">${product.name}</h3>
                <p class="product-price">Rp ${product.price.toLocaleString('id-ID')}</p>
                <button class="btn-add" data-id="${product.id}">+ Keranjang</button>
            </div>
        </div>`}).join('');
    html += '</div>';
    
    productList.innerHTML = html;

    // Event Listener untuk tombol Tambah
    productList.querySelectorAll('.btn-add').forEach(btn => {
        btn.addEventListener('click', (e) => {
            addToCart(e.target.dataset.id);
        });
    });

    // Event Listener untuk tombol Wishlist
    productList.querySelectorAll('.btn-wishlist').forEach(btn => {
        btn.addEventListener('click', (e) => {
            toggleWishlist(e.currentTarget.dataset.id);
        });
    });

    setupPagination(data);
}

function setupPagination(data) {
    const paginationEl = document.getElementById('pagination');
    if(!paginationEl) return;
    
    paginationEl.innerHTML = "";
    const pageCount = Math.ceil(data.length / itemsPerPage);

    if (pageCount <= 1) return; // Tidak perlu pagination jika cuma 1 halaman

    for (let i = 1; i <= pageCount; i++) {
        const btn = document.createElement('button');
        btn.innerText = i;
        btn.classList.add('page-btn');
        if (i === currentPage) btn.classList.add('active');
        btn.addEventListener('click', () => {
            currentPage = i;
            renderProducts(data);
            window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll ke atas saat ganti halaman
        });
        paginationEl.appendChild(btn);
    }
}

function handleSearch(keyword) {
    const filtered = products.filter(p => p.name.toLowerCase().includes(keyword.toLowerCase()));
    currentPage = 1;
    renderProducts(filtered, true);
}

function sortProducts(criteria) {
    let sortedProducts = [...products]; // Copy array agar tidak merusak urutan asli jika perlu reset
    
    switch (criteria) {
        case 'price-asc':
            sortedProducts.sort((a, b) => a.price - b.price);
            break;
        case 'price-desc':
            sortedProducts.sort((a, b) => b.price - a.price);
            break;
        case 'name-asc':
            sortedProducts.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'name-desc':
            sortedProducts.sort((a, b) => b.name.localeCompare(a.name));
            break;
        default:
            // Default urutan (biasanya berdasarkan ID atau waktu load)
            break;
    }
    currentPage = 1;
    renderProducts(sortedProducts, true);
}

// Event Listener Search
const searchInput = document.getElementById('search-input');
if (searchInput) {
    searchInput.addEventListener('input', (e) => handleSearch(e.target.value));
}

// Event Listener Sort
const sortSelect = document.getElementById('sort-select');
if (sortSelect) {
    sortSelect.addEventListener('change', (e) => sortProducts(e.target.value));
}

// 2. Logic Keranjang
function addToCart(id) {
    if (!id) return;
    const product = products.find(p => p.id === id);
    const existingItem = cart.find(item => item.id === id);

    if (existingItem) {
        existingItem.qty++;
    } else {
        cart.push({ ...product, qty: 1 });
    }
    saveCart();
    updateCartUI();
    showToast("Produk masuk keranjang!");
}

// Logic Wishlist
window.toggleWishlist = async function(id) {
    const product = products.find(p => p.id === id);
    const index = wishlist.findIndex(item => item.id === id);

    if (index > -1) {
        const confirmed = await showConfirm("Hapus dari Wishlist?");
        if(!confirmed) return; // Konfirmasi hapus
        wishlist.splice(index, 1); // Hapus jika sudah ada
        showToast("Dihapus dari Wishlist");
    } else {
        wishlist.push(product); // Tambah jika belum ada
        showToast("Ditambahkan ke Wishlist");
    }
    saveWishlist();
    updateWishlistUI();
    
    // Re-render produk untuk update ikon hati
    const searchInput = document.getElementById('search-input');
    if(searchInput && searchInput.value) {
        handleSearch(searchInput.value);
    } else {
        renderProducts();
    }
}

function saveWishlist() {
    localStorage.setItem("wishlist", JSON.stringify(wishlist));
}

function updateWishlistUI() {
    const countEl = document.getElementById('wishlist-count');
    if(countEl) countEl.innerText = wishlist.length;
    const mobileCountEl = document.getElementById('mobile-wishlist-count');
    if(mobileCountEl) mobileCountEl.innerText = wishlist.length;

    const container = document.getElementById('wishlist-items');
    if(container) {
        if(wishlist.length === 0) {
            container.innerHTML = "<p>Wishlist kosong.</p>";
        } else {
            container.innerHTML = wishlist.map(item => `
                <div class="wishlist-item">
                    <div>
                        <h4>${item.name}</h4>
                        <small>Rp ${item.price.toLocaleString('id-ID')}</small>
                    </div>
                    <div style="display:flex; gap:5px; align-items:center;">
                        <button onclick="toggleWishlist('${item.id}')" class="btn-add" style="width:auto; padding:5px; font-size:0.8rem; background:#e74c3c; display:flex; align-items:center;" title="Hapus"><span class="material-icons" style="font-size:1.2rem;">delete</span></button>
                        <button onclick="moveFromWishlistToCart('${item.id}')" class="btn-add" style="width:auto; padding:5px 10px; font-size:0.8rem;">+ Keranjang</button>
                    </div>
                </div>
            `).join('');
        }
    }
}

function clearCart() {
    cart = [];
    saveCart();
    updateCartUI();
    document.getElementById('cart-modal').style.display = 'none';
}

window.moveFromWishlistToCart = function(id) {
    addToCart(id); // Tambah ke keranjang
    
    // Hapus dari wishlist tanpa konfirmasi (karena dipindah)
    const index = wishlist.findIndex(item => item.id === id);
    if (index > -1) {
        wishlist.splice(index, 1);
        saveWishlist();
        updateWishlistUI();
        renderProducts(); // Update ikon hati di grid produk
    }
}

function saveCart() {
    localStorage.setItem("cart", JSON.stringify(cart));
}

function updateCartUI() {
    // Bersihkan item yang tidak valid (null atau tanpa ID)
    cart = cart.filter(item => item && item.id);
    
    const totalQty = cart.reduce((acc, item) => acc + (item.qty || 0), 0);
    const countEl = document.getElementById('cart-count');
    if(countEl) countEl.innerText = totalQty;
    const mobileCountEl = document.getElementById('mobile-cart-count');
    if(mobileCountEl) mobileCountEl.innerText = totalQty;

    const cartItemsContainer = document.getElementById('cart-items');
    const checkoutForm = document.getElementById('checkout-form');

    if (!cartItemsContainer || !checkoutForm) return;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p>Keranjang masih kosong.</p>';
        checkoutForm.style.display = 'none';
    } else {
        cartItemsContainer.innerHTML = cart.map(item => {
            const price = typeof item.price === 'number' ? item.price : 0;
            return `
            <div class="cart-item">
                <div>
                    <h4>${item.name || 'Produk'}</h4>
                    <small>Rp ${price.toLocaleString('id-ID')}</small>
                </div>
                <div class="qty-controls">
                    <button class="qty-btn" data-id="${item.id}" data-change="-1">-</button>
                    <span>${item.qty}</span>
                    <button class="qty-btn" data-id="${item.id}" data-change="1">+</button>
                </div>
            </div>
        `}).join('');
        
        // Tambahkan tombol Kosongkan Keranjang
        cartItemsContainer.innerHTML += `
            <button onclick="clearCart()" style="background: #e74c3c; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-top: 10px; font-size: 0.8rem;">Kosongkan Keranjang</button>
        `;

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

window.clearCart = async function() {
    const confirmed = await showConfirm("Yakin ingin mengosongkan keranjang?");
    if(confirmed) {
        cart = [];
        saveCart();
        updateCartUI();
        // document.getElementById('cart-modal').style.display = 'none'; // Opsional: tutup modal atau biarkan terbuka
    }
}

/* 
   Fungsi clearCart yang lama (untuk checkout) mungkin perlu disesuaikan 
   agar tidak konflik atau bisa digunakan ulang.
   Di bawah ini saya modifikasi clearCart yang dipanggil saat checkout agar tidak pakai confirm.
*/

function clearCartAfterCheckout() {
    cart = [];
    saveCart();
    updateCartUI();
    document.getElementById('cart-modal').style.display = 'none';
}

/* Update processCheckout untuk pakai clearCartAfterCheckout */

function calculateTotal() {
    const subtotal = cart.reduce((acc, item) => acc + ((item.price || 0) * (item.qty || 0)), 0);
    const courierSelect = document.getElementById('courier');

    // Hitung total berat untuk display
    const totalWeightGrams = cart.reduce((acc, item) => acc + ((item.weight || 1000) * (item.qty || 0)), 0);
    const totalWeightKg = totalWeightGrams / 1000;
    
    const total = subtotal + currentShippingCost;

    document.getElementById('subtotal').innerText = `Rp ${subtotal.toLocaleString('id-ID')}`;
    document.getElementById('shipping-cost').innerText = `Rp ${currentShippingCost.toLocaleString('id-ID')}`;
    // Update display berat jika elemen ada
    const weightEl = document.getElementById('total-weight');
    if(weightEl) weightEl.innerText = `${totalWeightKg} Kg`;
    document.getElementById('grand-total').innerText = `Rp ${total.toLocaleString('id-ID')}`;
    
    return { subtotal, shippingCost: currentShippingCost, total };
}

async function processCheckout() {
    if (!currentUser) {
        showAlert("Silakan login terlebih dahulu untuk melanjutkan checkout agar pesanan tercatat di riwayat Anda.");
        document.getElementById('login-modal').style.display = 'block';
        return;
    }

    const name = document.getElementById('name').value;
    const phone = document.getElementById('phone').value;
    const address = document.getElementById('address').value;
    const prov = document.getElementById('provinsi').options[document.getElementById('provinsi').selectedIndex]?.text || '';
    const kab = document.getElementById('kabupaten').options[document.getElementById('kabupaten').selectedIndex]?.text || '';
    const kec = document.getElementById('kecamatan').options[document.getElementById('kecamatan').selectedIndex]?.text || '';
    const kel = document.getElementById('kelurahan').options[document.getElementById('kelurahan').selectedIndex]?.text || '';
    const courierSelect = document.getElementById('courier');
    const courier = courierSelect.options[courierSelect.selectedIndex]?.text || '';
    const orderMethod = document.getElementById('order-method').value;
    
    // Simpan data profil jika user login
    if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        setDoc(userRef, {
            name: name,
            phone: phone,
            address: address,
            provinsi_id: document.getElementById('provinsi').value,
            kabupaten_id: document.getElementById('kabupaten').value,
            kecamatan_id: document.getElementById('kecamatan').value,
            kelurahan_id: document.getElementById('kelurahan').value
        }, { merge: true });
    }

    const fullAddress = `${address}, ${kel}, ${kec}, ${kab}, ${prov}`;

    if (!name || !phone || !address || !prov || !kab || !kec) {
        showAlert("Mohon lengkapi data diri Anda!");
        return;
    }

    const { subtotal, shippingCost, total } = calculateTotal();
    
    // Hitung total berat untuk ditampilkan
    const totalWeightGrams = cart.reduce((acc, item) => acc + ((item.weight || 1000) * item.qty), 0);
    const totalWeightKg = totalWeightGrams / 1000;

    let productListText = cart.map((item, idx) => 
        `${idx + 1}. ${item.name} (${item.qty}x) - Rp ${(item.price * item.qty).toLocaleString('id-ID')}`
    ).join('\n');

    // Construct the detailed shipping line
    const shippingLine = `Ongkir (${courier}): Rp ${shippingCost.toLocaleString('id-ID')}`;

    // Pesan dasar untuk WhatsApp
    // Gunakan \n biasa, nanti di-encode total agar karakter khusus (&, +, dll) aman
    const messageWA = `*Halo Admin, Saya mau order!*

*Data Penerima:*
Nama: ${name}
No HP: ${phone}
Alamat: ${fullAddress}

*Pesanan:*
${productListText}
---------------------------
Subtotal: Rp ${subtotal.toLocaleString('id-ID')}
Total Berat: ${totalWeightKg} Kg
${shippingLine}
*Total Bayar: Rp ${total.toLocaleString('id-ID')}*

Silakan transfer ke:
BCA: 1010836642
BRI: 717901010257532
An. Indah Wahyuning Aprilia (Admin: ${storeConfig ? storeConfig.storeName : 'Service komputer Surabaya'})

Terima kasih!`;

    // Simpan data pesanan ke Firestore dengan Custom Invoice Number
    try {
        await runTransaction(db, async (transaction) => {
            // 1. Ambil counter terakhir
            const counterRef = doc(db, "settings", "order_counter");
            const counterDoc = await transaction.get(counterRef);
            
            const now = new Date();
            const currentMonth = now.getMonth() + 1;
            const currentYear = now.getFullYear();

            let newCount = 1;
            if (counterDoc.exists()) {
                const data = counterDoc.data();
                // Cek apakah bulan/tahun sama dengan yang tersimpan
                if (data.month === currentMonth && data.year === currentYear) {
                    newCount = (data.current || 0) + 1;
                } else {
                    newCount = 1; // Reset counter jika bulan/tahun berbeda
                }
            }

            // 2. Format Nomor Invoice: 004_BJ-SKSID_02-2026
            const padCount = String(newCount).padStart(3, '0');
            const monthStr = String(currentMonth).padStart(2, '0');
            const invoiceNumber = `${padCount}_BJ-SKSID_${monthStr}-${currentYear}`;

            // 3. Buat dokumen order baru
            const newOrderRef = doc(collection(db, "orders"));
            transaction.set(newOrderRef, {
                invoiceNumber: invoiceNumber, // Simpan nomor invoice kustom
                nama: name,
                hp: phone,
                alamat: fullAddress,
                kota: kab,
                cart: cart,
                subtotal: subtotal,
                ongkir: shippingCost,
                total: total,
                courier: courier, // Simpan detail kurir
                totalWeight: totalWeightKg, // Simpan total berat
                userId: currentUser ? currentUser.uid : null, // Simpan ID User
                status: "baru",
                createdAt: new Date()
            });

            // 4. Update counter dengan bulan & tahun
            transaction.set(counterRef, { 
                current: newCount,
                month: currentMonth,
                year: currentYear
            }, { merge: true });
        });
    } catch (e) {
        console.error("Gagal menyimpan pesanan ke database: ", e);
        showAlert("Gagal menyimpan pesanan ke database: " + e.message + "\nCek Security Rules di Firebase Console.");
    }

    if (orderMethod === 'whatsapp') {
        // Gunakan No HP dari config, atau fallback ke default
        const adminPhone = (storeConfig && storeConfig.adminPhone) ? storeConfig.adminPhone : "628994335111"; 
        window.open(`https://api.whatsapp.com/send/?phone=${adminPhone}&text=${encodeURIComponent(messageWA)}`, '_blank');
        clearCartAfterCheckout(); // Kosongkan keranjang setelah kirim WA
    } else if (orderMethod === 'print') {
        printInvoice({ name, phone, address: fullAddress, courier, subtotal, shippingCost, total, cart, totalWeightKg });
        clearCartAfterCheckout(); // Kosongkan keranjang setelah Print
    }
}

function printInvoice(data) {
    const date = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
    const itemsHtml = data.cart.map((item, i) => `
        <tr>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${i + 1}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${item.name}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.qty}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">Rp ${item.price.toLocaleString('id-ID')}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">Rp ${(item.price * item.qty).toLocaleString('id-ID')}</td>
        </tr>
    `).join('');

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Penawaran Harga - Service Komputer Surabaya ID</title>
        <style>
            body { font-family: sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .info { margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { background: #f4f4f4; padding: 10px; border: 1px solid #ddd; font-weight: bold; }
            .totals { text-align: right; margin-top: 20px; }
            .totals p { margin: 5px 0; }
            .footer { margin-top: 50px; text-align: center; font-size: 0.8rem; color: #666; border-top: 1px solid #eee; padding-top: 20px; }
            @media print { 
                .no-print { display: none; }
                @page { margin: 0; } /* Hilangkan header/footer browser (about:blank) */
                body { margin: 2cm; } /* Beri jarak margin halaman sendiri */
            }
        </style>
    </head>
    <body>
        <div class="header">
            <img src="assets/logo.png" alt="Service Komputer Surabaya" style="max-width: 250px; margin-bottom: 10px;">
            <p>Pusat Komputer & Aksesoris Terlengkap</p>
        </div>
        
        <div class="info">
            <p><strong>Tanggal:</strong> ${date}</p>
            <p><strong>Kepada Yth:</strong> ${data.name}</p>
            <p><strong>No HP:</strong> ${data.phone}</p>
            <p><strong>Alamat:</strong> ${data.address}</p>
        </div>

        <table>
            <thead>
                <tr>
                    <th>No</th>
                    <th>Produk</th>
                    <th>Qty</th>
                    <th>Harga Satuan</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
        </table>

        <div class="totals">
            <p>Subtotal: Rp ${data.subtotal.toLocaleString('id-ID')}</p>
            <p>Total Berat: ${data.totalWeightKg} Kg</p>
            <p>Ongkir (${data.courier}): Rp ${data.shippingCost.toLocaleString('id-ID')}</p>
            <h3>Total: Rp ${data.total.toLocaleString('id-ID')}</h3>
        </div>

        <div class="footer">
            <p>Dokumen ini adalah penawaran harga yang sah (Quotation).</p>
            
            <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
                <h3>Info Pembayaran</h3>
                <div style="display: flex; justify-content: center; gap: 40px; flex-wrap: wrap; text-align: center;">
                    <div>
                        <img src="assets/bank-bca.png" style="height: 40px; display: block; margin: 0 auto 5px;">
                        <p style="margin: 2px 0;"><strong>1010836642</strong></p>
                        <p style="margin: 0; font-size: 0.9em;">Indah Wahyuning Aprilia</p>
                    </div>
                    <div>
                        <img src="assets/bank-bri.png" style="height: 40px; display: block; margin: 0 auto 5px;">
                        <p style="margin: 2px 0;"><strong>717901010257532</strong></p>
                        <p style="margin: 0; font-size: 0.9em;">Indah Wahyuning Aprilia</p>
                    </div>
                    <div>
                        <img src="assets/qris.png" style="max-width: 70px; border: 1px solid #ddd; display: block; margin: 0 auto 5px;">
                        <p style="margin: 0;"><strong>QRIS</strong></p>
                    </div>
                </div>
            </div>
        </div>

        <div class="no-print" style="text-align: center; margin-top: 30px;">
            <button onclick="window.print()" style="padding: 12px 24px; cursor: pointer; background: #2c3e50; color: white; border: none; border-radius: 4px; font-size: 16px;">Cetak / Simpan PDF</button>
        </div>
    </body>
    </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
}

// --- INTEGRASI RAJAONGKIR ---

async function loadProvinsi() {
    try {
        const res = await fetch(`${BINDERBYTE_URL}?action=provinsi`);
        const data = await res.json();
        const select = document.getElementById('provinsi');
        select.innerHTML = '<option value="">Pilih Provinsi</option>';
        if(data.data) {
            data.data.forEach(item => {
                const option = document.createElement('option');
                option.value = item.code;
                option.text = item.name;
                select.appendChild(option);
            });
        }
    } catch (err) { console.error(err); }
}

async function loadKabupaten(id) {
    const select = document.getElementById('kabupaten');
    select.innerHTML = '<option value="">Loading...</option>';
    select.disabled = true;
    try {
        const res = await fetch(`${BINDERBYTE_URL}?action=kabupaten&id=${id}`);
        const data = await res.json();
        select.innerHTML = '<option value="">Pilih Kabupaten/Kota</option>';
        if(data.data) {
            data.data.forEach(item => {
                const option = document.createElement('option');
                option.value = item.code;
                option.text = item.name;
                select.appendChild(option);
            });
            select.disabled = false;
        }
    } catch (err) { console.error(err); }
}

async function loadKecamatan(id) {
    const select = document.getElementById('kecamatan');
    select.innerHTML = '<option value="">Loading...</option>';
    select.disabled = true;
    try {
        const res = await fetch(`${BINDERBYTE_URL}?action=kecamatan&id=${id}`);
        const data = await res.json();
        select.innerHTML = '<option value="">Pilih Kecamatan</option>';
        if(data.data) {
            data.data.forEach(item => {
                const option = document.createElement('option');
                option.value = item.code;
                option.text = item.name;
                select.appendChild(option);
            });
            select.disabled = false;
        }
    } catch (err) { console.error(err); }
}

async function loadKelurahan(id) {
    const select = document.getElementById('kelurahan');
    select.innerHTML = '<option value="">Loading...</option>';
    select.disabled = true;
    try {
        const res = await fetch(`${BINDERBYTE_URL}?action=kelurahan&id=${id}`);
        const data = await res.json();
        select.innerHTML = '<option value="">Pilih Kelurahan/Desa</option>';
        if(data.data) {
            data.data.forEach(item => {
                const option = document.createElement('option');
                option.value = item.code;
                option.text = item.name;
                select.appendChild(option);
            });
            select.disabled = false;
        }
    } catch (err) { console.error(err); }
}

// Fungsi Autofill Data User
async function fillCheckoutData() {
    if (!currentUser) return;

    try {
        const docRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            
            document.getElementById('name').value = data.name || '';
            document.getElementById('phone').value = data.phone || '';
            document.getElementById('address').value = data.address || '';

            // Chain loading dropdown wilayah
            if (data.provinsi_id) {
                document.getElementById('provinsi').value = data.provinsi_id;
                await loadKabupaten(data.provinsi_id);
                
                if (data.kabupaten_id) {
                    document.getElementById('kabupaten').value = data.kabupaten_id;
                    await loadKecamatan(data.kabupaten_id);

                    if (data.kecamatan_id) {
                        document.getElementById('kecamatan').value = data.kecamatan_id;
                        await loadKelurahan(data.kecamatan_id);

                        if (data.kelurahan_id) {
                            document.getElementById('kelurahan').value = data.kelurahan_id;
                            checkOngkir(); // Hitung ongkir otomatis
                        }
                    }
                }
            }
        }
    } catch (e) {
        console.error("Gagal load data user:", e);
    }
}

async function checkOngkir() {
    const kelSelect = document.getElementById('kelurahan');
    const courierSelect = document.getElementById('courier');
    
    // API.co.id endpoint baru butuh Village Code (Kelurahan ID)
    if(kelSelect.selectedIndex <= 0) return;
    
    const destination = kelSelect.value; 
    const courier = courierSelect.value;

    // Hitung total berat (Default 1000 gram jika data berat belum ada di database)
    const totalWeightGrams = cart.reduce((acc, item) => acc + ((item.weight || 1000) * item.qty), 0); 
    // Konversi ke Kg untuk API (Min 1 Kg jika < 1)
    const totalWeightKg = Math.max(1, totalWeightGrams / 1000);

    courierSelect.innerHTML = '<option value="">Memuat...</option>';
    courierSelect.disabled = true;

    document.getElementById('shipping-cost').innerText = "Loading...";
    currentShippingCost = 0;
    calculateTotal();

    try {
        const res = await fetch(`${BINDERBYTE_URL}?action=cost&destination=${destination}&weight=${totalWeightKg}&courier=${courier}`);
        
        const text = await res.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch(e) {
            console.error("Respon Ongkir Error:", text);
        }
        
        // Tampilkan daftar kurir dari API
        if(data && data.is_success && data.data && data.data.couriers) {
            availableCouriers = data.data.couriers;
            courierSelect.innerHTML = '<option value="">Pilih Kurir</option>';
            
            availableCouriers.forEach(c => {
                const option = document.createElement('option');
                option.value = c.courier_code;
                option.text = `${c.courier_name} - Rp ${parseInt(c.price).toLocaleString('id-ID')} (${c.estimation || '-'})`;
                courierSelect.appendChild(option);
            });
            courierSelect.disabled = false;
            document.getElementById('shipping-cost').innerText = "Silakan pilih kurir";
        } else {
            // Tampilkan pesan error dari API jika ada, atau default "Tidak tersedia"
            let msg = (data && data.message) ? data.message : "Tidak tersedia";
            if (msg === "Success") msg = "Tidak tersedia";
            document.getElementById('shipping-cost').innerText = msg;
            courierSelect.innerHTML = '<option value="">Tidak tersedia</option>';
            console.warn("Ongkir tidak ditemukan:", data);
        }
    } catch (err) {
        console.error("Gagal cek ongkir", err);
        document.getElementById('shipping-cost').innerText = "Error";
        courierSelect.innerHTML = '<option value="">Error</option>';
    }
}

function updateShippingCost() {
    const courierSelect = document.getElementById('courier');
    const selectedCode = courierSelect.value;
    
    const selected = availableCouriers.find(c => c.courier_code == selectedCode);
    
    if (selected) {
        currentShippingCost = parseInt(selected.price);
        document.getElementById('shipping-cost').innerText = `Rp ${currentShippingCost.toLocaleString('id-ID')}`;
    } else {
        currentShippingCost = 0;
        document.getElementById('shipping-cost').innerText = "Rp 0";
    }
    calculateTotal();
}

// --- FITUR CEK RESI (BINDERBYTE) ---
async function trackPackage() {
    const courier = document.getElementById('track-courier').value;
    const awb = document.getElementById('track-awb').value;
    const resultDiv = document.getElementById('track-result');

    if(!courier || !awb) {
        showAlert("Pilih kurir dan masukkan nomor resi");
        return;
    }

    resultDiv.innerHTML = "Sedang melacak...";

    try {
        const res = await fetch(`${BINDERBYTE_URL}?courier=${courier}&awb=${awb}`);
        const data = await res.json();

        if(data.status !== 200) {
            resultDiv.innerHTML = `<p style="color:red; text-align:center;">${data.message}</p>`;
            return;
        }

        const summary = data.data.summary;
        const history = data.data.history;

        let html = `
            <div style="background:#f9f9f9; padding:15px; border-radius:5px; margin-bottom:15px; font-size:0.9rem;">
                <p><strong>Status:</strong> ${summary.status}</p>
                <p><strong>Kurir:</strong> ${summary.courier} - ${summary.service}</p>
                <p><strong>Pengirim:</strong> ${data.data.detail.shipper || '-'}</p>
                <p><strong>Penerima:</strong> ${data.data.detail.receiver || '-'}</p>
            </div>
            <ul style="list-style:none; padding:0;">
        `;

        history.forEach(h => {
            html += `
                <li style="border-left: 2px solid #ddd; padding-left: 15px; margin-bottom: 15px; position:relative;">
                    <div style="position:absolute; left:-6px; top:0; width:10px; height:10px; background:#3498db; border-radius:50%;"></div>
                    <small style="color:#888;">${h.date}</small>
                    <p style="margin:5px 0;">${h.desc}</p>
                    <small style="color:#555;">${h.location}</small>
                </li>
            `;
        });

        html += `</ul>`;
        resultDiv.innerHTML = html;

    } catch(e) {
        console.error(e);
        resultDiv.innerHTML = `<p style="color:red;">Terjadi kesalahan sistem atau koneksi.</p>`;
    }
}

// Event Listeners
document.getElementById('cart-btn').addEventListener('click', () => {
    const modal = document.getElementById('cart-modal');
    modal.style.display = modal.style.display === 'block' ? 'none' : 'block';
    if(modal.style.display === 'block') fillCheckoutData(); // Autofill saat buka keranjang
});

document.getElementById('wishlist-btn').addEventListener('click', () => {
    document.getElementById('wishlist-modal').style.display = 'block';
});

document.getElementById('close-wishlist').addEventListener('click', () => {
    document.getElementById('wishlist-modal').style.display = 'none';
});

document.getElementById('close-modal').addEventListener('click', () => {
    document.getElementById('cart-modal').style.display = 'none';
});

document.getElementById('provinsi').addEventListener('change', (e) => loadKabupaten(e.target.value));
document.getElementById('kabupaten').addEventListener('change', (e) => loadKecamatan(e.target.value));
document.getElementById('kecamatan').addEventListener('change', (e) => { loadKelurahan(e.target.value); });
document.getElementById('kelurahan').addEventListener('change', checkOngkir);
document.getElementById('courier').addEventListener('change', updateShippingCost);

document.getElementById('btn-checkout').addEventListener('click', processCheckout);

// Event Listener Cek Resi
document.getElementById('track-btn').addEventListener('click', () => {
    document.getElementById('track-modal').style.display = 'block';
});
document.getElementById('close-track').addEventListener('click', () => {
    document.getElementById('track-modal').style.display = 'none';
});
document.getElementById('btn-track').addEventListener('click', trackPackage);

// --- MOBILE NAVIGATION LISTENERS ---
const mobileCartBtn = document.getElementById('mobile-cart-btn');
if(mobileCartBtn) {
    mobileCartBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const modal = document.getElementById('cart-modal');
        modal.style.display = modal.style.display === 'block' ? 'none' : 'block';
        if(modal.style.display === 'block') fillCheckoutData();
    });
}

const mobileWishlistBtn = document.getElementById('mobile-wishlist-btn');
if(mobileWishlistBtn) {
    mobileWishlistBtn.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('wishlist-modal').style.display = 'block';
    });
}

const mobileAccountBtn = document.getElementById('mobile-account-btn');
if(mobileAccountBtn) {
    mobileAccountBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if(currentUser) {
            document.getElementById('mobile-user-info').innerText = currentUser.email;
            document.getElementById('mobile-menu-modal').style.display = 'block';
        } else {
            document.getElementById('login-modal').style.display = 'block';
        }
    });
}

// Mobile Menu Actions
document.getElementById('btn-mobile-history')?.addEventListener('click', () => {
    document.getElementById('mobile-menu-modal').style.display = 'none';
    document.getElementById('btn-history-nav').click();
});
document.getElementById('btn-mobile-track')?.addEventListener('click', () => {
    document.getElementById('mobile-menu-modal').style.display = 'none';
    document.getElementById('track-modal').style.display = 'block';
});
document.getElementById('btn-mobile-logout')?.addEventListener('click', () => {
    document.getElementById('mobile-menu-modal').style.display = 'none';
    signOut(auth);
});

// --- AUTHENTICATION LOGIC ---

const loginModal = document.getElementById('login-modal');
const btnLoginNav = document.getElementById('btn-login-nav');
const btnLogoutNav = document.getElementById('btn-logout-nav');
const userNameDisplay = document.getElementById('user-name');
let isRegisterMode = false;

// Toggle Login Modal
btnLoginNav.addEventListener('click', () => {
    loginModal.style.display = 'block';
});
document.getElementById('close-login').addEventListener('click', () => {
    loginModal.style.display = 'none';
});

// Toggle Register/Login Mode
document.getElementById('toggle-register').addEventListener('click', (e) => {
    e.preventDefault();
    isRegisterMode = !isRegisterMode;
    const title = document.getElementById('login-title');
    const btn = document.getElementById('btn-submit-login');
    const toggle = document.getElementById('toggle-register');
    const forgotLink = document.getElementById('forgot-password').parentElement;
    
    if(isRegisterMode) {
        title.innerText = "Daftar Member Baru";
        btn.innerText = "Daftar";
        toggle.innerText = "Sudah punya akun? Login";
        forgotLink.style.display = 'none';
    } else {
        title.innerText = "Login Member";
        btn.innerText = "Login";
        toggle.innerText = "Belum punya akun? Daftar disini";
        forgotLink.style.display = 'block';
    }
});

// Handle Submit Login/Register
document.getElementById('btn-submit-login').addEventListener('click', async () => {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    
    try {
        if(isRegisterMode) {
            await createUserWithEmailAndPassword(auth, email, pass);
            showAlert("Pendaftaran berhasil! Silakan isi data pengiriman saat checkout.");
        } else {
            await signInWithEmailAndPassword(auth, email, pass);
            showAlert("Login berhasil!");
        }
        loginModal.style.display = 'none';
    } catch (error) {
        if (error.code === 'auth/operation-not-allowed') {
            showAlert("Error: Metode login ini belum diaktifkan di Firebase Console.");
        } else {
            showAlert("Error: " + error.message);
        }
    }
});

// Handle Forgot Password
document.getElementById('forgot-password').addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    if (!email) {
        showAlert("Silakan isi kolom Email terlebih dahulu untuk mereset password.");
        return;
    }
    try {
        await sendPasswordResetEmail(auth, email);
        showAlert(`Link reset password telah dikirim ke ${email}. Silakan cek email Anda.`);
    } catch (error) {
        showAlert("Gagal mengirim reset password: " + error.message);
    }
});

// --- ORDER HISTORY LOGIC ---

document.getElementById('btn-history-nav').addEventListener('click', async () => {
    if (!currentUser) return;
    
    const modal = document.getElementById('history-modal');
    const list = document.getElementById('history-list');
    modal.style.display = 'block';
    list.innerHTML = '<p>Memuat riwayat...</p>';

    try {
        // Query pesanan berdasarkan userId
        const q = query(collection(db, "orders"), where("userId", "==", currentUser.uid));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            list.innerHTML = '<p>Belum ada riwayat pesanan.</p>';
            return;
        }

        let html = '';
        querySnapshot.forEach((doc) => {
            const order = doc.data();
            const date = order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleDateString('id-ID') : '-';
            const statusColor = order.status === 'selesai' ? 'green' : (order.status === 'proses' ? 'orange' : 'grey');
            
            html += `
            <div style="border:1px solid #ddd; padding:10px; margin-bottom:10px; border-radius:5px;">
                <div style="display:flex; justify-content:space-between; font-weight:bold;">
                    <span>${order.invoiceNumber || 'Order #' + doc.id.substr(0,8)}</span>
                    <span style="color:${statusColor}">${order.status.toUpperCase()}</span>
                </div>
                <p style="margin:5px 0; font-size:0.9rem;">Tanggal: ${date} | Total: Rp ${order.total.toLocaleString('id-ID')}</p>
                <p style="margin:5px 0; font-size:0.9rem;"><strong>Resi:</strong> ${order.awb || '-'}</p>
            </div>`;
        });
        list.innerHTML = html;
    } catch (e) {
        console.error("Gagal load history:", e);
        list.innerHTML = '<p>Gagal memuat riwayat. Pastikan Anda login.</p>';
    }
});

document.getElementById('close-history').addEventListener('click', () => {
    document.getElementById('history-modal').style.display = 'none';
});

// Handle Logout
btnLogoutNav.addEventListener('click', () => signOut(auth));

// Auth State Listener
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        btnLoginNav.style.display = 'none';
        btnLogoutNav.style.display = 'block';
        document.getElementById('btn-history-nav').style.display = 'block';
        userNameDisplay.style.display = 'block';
        userNameDisplay.innerText = user.email.split('@')[0]; // Tampilkan nama dari email
    } else {
        btnLoginNav.style.display = 'block';
        btnLogoutNav.style.display = 'none';
        document.getElementById('btn-history-nav').style.display = 'none';
        userNameDisplay.style.display = 'none';
    }
});

// Toast Function
window.showToast = function(message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = message;
    container.appendChild(toast);
    
    setTimeout(() => { toast.classList.add('show'); }, 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => { toast.remove(); }, 300);
    }, 3000);
}

// Custom Alert Function
window.showAlert = function(message) {
    document.getElementById('custom-alert-message').innerText = message;
    document.getElementById('custom-alert-modal').style.display = 'block';
}

// Custom Confirm Function
window.showConfirm = function(message) {
    return new Promise((resolve) => {
        document.getElementById('custom-confirm-message').innerText = message;
        const modal = document.getElementById('custom-confirm-modal');
        modal.style.display = 'block';

        const yesBtn = document.getElementById('confirm-yes-btn');
        const noBtn = document.getElementById('confirm-no-btn');

        // Clone to clear listeners
        const newYes = yesBtn.cloneNode(true);
        const newNo = noBtn.cloneNode(true);
        yesBtn.parentNode.replaceChild(newYes, yesBtn);
        noBtn.parentNode.replaceChild(newNo, noBtn);

        newYes.addEventListener('click', () => { modal.style.display = 'none'; resolve(true); });
        newNo.addEventListener('click', () => { modal.style.display = 'none'; resolve(false); });
    });
}

// Init
loadProducts();
loadStoreConfig();
loadProvinsi();
updateWishlistUI();
updateCartUI(); // Pastikan UI keranjang selalu di-update saat awal load
