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
let currentShippingCost = 0; // Variabel global untuk menyimpan ongkir aktif
let availableCouriers = [];

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

        updateCartUI(); // Update UI cart saat load awal
    } catch (error) {
        console.error("Error loading products:", error);
        productList.innerHTML = "<p>Gagal memuat produk dari database.</p>";
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
        renderProducts(products);
    } else {
        const filtered = products.filter(p => p.category === category);
        renderProducts(filtered);
    }
}

function renderProducts(data = products) {
    const productList = document.getElementById('product-list');
    if (data.length === 0) {
        productList.innerHTML = '<p style="text-align:center; width:100%;">Produk tidak ditemukan.</p>';
        return;
    }

    let html = '<div class="product-grid">';
    html += data.map(product => `
        <div class="product-card">
            <div onclick="window.location.href='detail.html?id=${product.id}'" style="cursor:pointer">
                <img src="${product.image}" alt="${product.name}" class="product-img">
            </div>
            <div class="product-info">
                <h3 class="product-title" onclick="window.location.href='detail.html?id=${product.id}'" style="cursor:pointer">${product.name}</h3>
                <p class="product-price">Rp ${product.price.toLocaleString('id-ID')}</p>
                <button class="btn-add" data-id="${product.id}">+ Keranjang</button>
            </div>
        </div>`).join('');
    html += '</div>';
    
    productList.innerHTML = html;

    // Event Listener untuk tombol Tambah
    document.querySelectorAll('.btn-add').forEach(btn => {
        btn.addEventListener('click', (e) => {
            addToCart(e.target.dataset.id);
        });
    });
}

function handleSearch(keyword) {
    const filtered = products.filter(p => p.name.toLowerCase().includes(keyword.toLowerCase()));
    renderProducts(filtered);
}

// Event Listener Search
const searchInput = document.getElementById('search-input');
if (searchInput) {
    searchInput.addEventListener('input', (e) => handleSearch(e.target.value));
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

    // Hitung total berat untuk display
    const totalWeightGrams = cart.reduce((acc, item) => acc + ((item.weight || 1000) * item.qty), 0);
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

function processCheckout() {
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
    
    const fullAddress = `${address}, ${kel}, ${kec}, ${kab}, ${prov}`;

    if (!name || !phone || !address || !prov || !kab || !kec) {
        alert("Mohon lengkapi data diri Anda!");
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
An. Indah Wahyuning Aprilia

Terima kasih!`;

    if (orderMethod === 'whatsapp') {
        const adminPhone = "628994335111"; // Ganti dengan No WA Admin
        window.open(`https://api.whatsapp.com/send/?phone=${adminPhone}&text=${encodeURIComponent(messageWA)}`, '_blank');
    } else if (orderMethod === 'print') {
        printInvoice({ name, phone, address: fullAddress, courier, subtotal, shippingCost, total, cart, totalWeightKg });
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
        alert("Pilih kurir dan masukkan nomor resi");
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

// Init
loadProducts();
loadProvinsi();