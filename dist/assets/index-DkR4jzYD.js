import{initializeApp as be}from"https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";import{getFirestore as ke,doc as B,getDoc as ee,setDoc as Ee,runTransaction as Ie,collection as j,getDocs as te,query as ve,where as we}from"https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";import{getAuth as Be,signOut as ne,createUserWithEmailAndPassword as xe,signInWithEmailAndPassword as Le,sendPasswordResetEmail as $e,onAuthStateChanged as Te}from"https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))o(a);new MutationObserver(a=>{for(const i of a)if(i.type==="childList")for(const s of i.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&o(s)}).observe(document,{childList:!0,subtree:!0});function n(a){const i={};return a.integrity&&(i.integrity=a.integrity),a.referrerPolicy&&(i.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?i.credentials="include":a.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function o(a){if(a.ep)return;a.ep=!0;const i=n(a);fetch(a.href,i)}})();const Se={apiKey:"AIzaSyCK5nyqWkgD9WI0K9naso5KtHLFT9oNTXs",authDomain:"servicekomputersurabaya.firebaseapp.com",projectId:"servicekomputersurabaya",storageBucket:"servicekomputersurabaya.firebasestorage.app",messagingSenderId:"985678673202",appId:"1:985678673202:web:4ab14bfb82fc3dee4ad32b",measurementId:"G-12RJTSNG7S"},oe=be(Se),h=ke(oe),v=Be(oe);let g=[],l=JSON.parse(localStorage.getItem("cart"))||[],p=JSON.parse(localStorage.getItem("wishlist"))||[],E=0,q=[],u=null,I=null,f=1;const K=20,w="https://servicekomputersurabaya.id/binderbyte.php";async function Ce(){const e=document.getElementById("product-list");try{const t=await te(j(h,"products"));g=[],t.forEach(s=>{const r=s.data();g.push({id:s.id,name:r.judul||r.name||"Produk Tanpa Nama",price:parseInt(r.harga||r.price||0),weight:parseInt(r.berat||r.weight||1e3),category:r.kategori||"Umum",image:r.image_url||"https://via.placeholder.com/150"})});const n=[...new Set(g.map(s=>s.category))].sort();Pe(n);const a=new URLSearchParams(window.location.search).get("q"),i=document.getElementById("search-input");a&&i?(i.value=a,O(a)):b()}catch(t){console.error("Error loading products:",t),e.innerHTML="<p>Gagal memuat produk dari database.</p>"}}async function De(){try{const e=B(h,"settings","store_config"),t=await ee(e);t.exists()&&(I=t.data())}catch(e){console.error("Gagal load config:",e)}}function Pe(e){const t=document.getElementById("category-list");if(!t)return;let n=`<a href="#" onclick="filterCategory('all', this); return false;" class="cat-link active">Semua Produk</a>`;e.forEach(o=>{n+=`<a href="#" onclick="filterCategory('${o}', this); return false;" class="cat-link">${o}</a>`}),t.innerHTML=n}window.filterCategory=function(e,t){if(document.querySelectorAll(".cat-link").forEach(o=>o.classList.remove("active")),t&&t.classList.add("active"),e==="all")f=1,b(g,!0);else{const o=g.filter(a=>a.category===e);f=1,b(o,!0)}};function b(e=g,t=!1){t&&(f=1);const n=(f-1)*K,o=n+K,a=e.slice(n,o),i=document.getElementById("product-list");if(e.length===0){i.innerHTML='<p style="text-align:center; width:100%;">Produk tidak ditemukan.</p>';return}let s='<div class="product-grid">';s+=a.map(r=>`
        <div class="product-card">
            <button class="btn-wishlist ${p.some(y=>y.id===r.id)?"active":""}" data-id="${r.id}"><span class="material-icons">favorite</span></button>
            <div onclick="window.location.href='detail.html?id=${r.id}'" style="cursor:pointer">
                <img src="${r.image}" alt="${r.name}" class="product-img">
            </div>
            <div class="product-info">
                <h3 class="product-title" onclick="window.location.href='detail.html?id=${r.id}'" style="cursor:pointer">${r.name}</h3>
                <p class="product-price">Rp ${r.price.toLocaleString("id-ID")}</p>
                <button class="btn-add" data-id="${r.id}">+ Keranjang</button>
            </div>
        </div>`).join(""),s+="</div>",i.innerHTML=s,document.querySelectorAll(".btn-add").forEach(r=>{r.addEventListener("click",d=>{ae(d.target.dataset.id)})}),document.querySelectorAll(".btn-wishlist").forEach(r=>{r.addEventListener("click",d=>{toggleWishlist(d.currentTarget.dataset.id)})}),Ae(e)}function Ae(e){const t=document.getElementById("pagination");if(!t)return;t.innerHTML="";const n=Math.ceil(e.length/K);if(!(n<=1))for(let o=1;o<=n;o++){const a=document.createElement("button");a.innerText=o,a.classList.add("page-btn"),o===f&&a.classList.add("active"),a.addEventListener("click",()=>{f=o,b(e),window.scrollTo({top:0,behavior:"smooth"})}),t.appendChild(a)}}function O(e){const t=g.filter(n=>n.name.toLowerCase().includes(e.toLowerCase()));f=1,b(t,!0)}function Me(e){let t=[...g];switch(e){case"price-asc":t.sort((n,o)=>n.price-o.price);break;case"price-desc":t.sort((n,o)=>o.price-n.price);break;case"name-asc":t.sort((n,o)=>n.name.localeCompare(o.name));break;case"name-desc":t.sort((n,o)=>o.name.localeCompare(n.name));break}f=1,b(t,!0)}const J=document.getElementById("search-input");J&&J.addEventListener("input",e=>O(e.target.value));const Y=document.getElementById("sort-select");Y&&Y.addEventListener("change",e=>Me(e.target.value));function ae(e){const t=g.find(o=>o.id===e),n=l.find(o=>o.id===e);n?n.qty++:l.push({...t,qty:1}),T(),x(),showToast("Produk masuk keranjang!")}window.toggleWishlist=async function(e){const t=g.find(a=>a.id===e),n=p.findIndex(a=>a.id===e);if(n>-1){if(!await showConfirm("Hapus dari Wishlist?"))return;p.splice(n,1),showToast("Dihapus dari Wishlist")}else p.push(t),showToast("Ditambahkan ke Wishlist");ie(),G();const o=document.getElementById("search-input");o&&o.value?O(o.value):b()};function ie(){localStorage.setItem("wishlist",JSON.stringify(p))}function G(){const e=document.getElementById("wishlist-count");e&&(e.innerText=p.length);const t=document.getElementById("mobile-wishlist-count");t&&(t.innerText=p.length);const n=document.getElementById("wishlist-items");n&&(p.length===0?n.innerHTML="<p>Wishlist kosong.</p>":n.innerHTML=p.map(o=>`
                <div class="wishlist-item">
                    <div>
                        <h4>${o.name}</h4>
                        <small>Rp ${o.price.toLocaleString("id-ID")}</small>
                    </div>
                    <div style="display:flex; gap:5px; align-items:center;">
                        <button onclick="toggleWishlist('${o.id}')" class="btn-add" style="width:auto; padding:5px; font-size:0.8rem; background:#e74c3c; display:flex; align-items:center;" title="Hapus"><span class="material-icons" style="font-size:1.2rem;">delete</span></button>
                        <button onclick="moveFromWishlistToCart('${o.id}')" class="btn-add" style="width:auto; padding:5px 10px; font-size:0.8rem;">+ Keranjang</button>
                    </div>
                </div>
            `).join(""))}window.moveFromWishlistToCart=function(e){ae(e);const t=p.findIndex(n=>n.id===e);t>-1&&(p.splice(t,1),ie(),G(),b())};function T(){localStorage.setItem("cart",JSON.stringify(l))}function x(){l=l.filter(i=>i&&i.id);const e=l.reduce((i,s)=>i+(s.qty||0),0),t=document.getElementById("cart-count");t&&(t.innerText=e);const n=document.getElementById("mobile-cart-count");n&&(n.innerText=e);const o=document.getElementById("cart-items"),a=document.getElementById("checkout-form");!o||!a||(l.length===0?(o.innerHTML="<p>Keranjang masih kosong.</p>",a.style.display="none"):(o.innerHTML=l.map(i=>{const s=typeof i.price=="number"?i.price:0;return`
            <div class="cart-item">
                <div>
                    <h4>${i.name||"Produk"}</h4>
                    <small>Rp ${s.toLocaleString("id-ID")}</small>
                </div>
                <div class="qty-controls">
                    <button class="qty-btn" data-id="${i.id}" data-change="-1">-</button>
                    <span>${i.qty}</span>
                    <button class="qty-btn" data-id="${i.id}" data-change="1">+</button>
                </div>
            </div>
        `}).join(""),o.innerHTML+=`
            <button onclick="clearCart()" style="background: #e74c3c; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-top: 10px; font-size: 0.8rem;">Kosongkan Keranjang</button>
        `,document.querySelectorAll(".qty-btn").forEach(i=>{i.addEventListener("click",s=>{He(s.target.dataset.id,parseInt(s.target.dataset.change))})}),a.style.display="block",S()))}function He(e,t){const n=l.find(o=>o.id===e);n&&(n.qty+=t,n.qty<=0&&(l=l.filter(o=>o.id!==e))),T(),x()}window.clearCart=async function(){await showConfirm("Yakin ingin mengosongkan keranjang?")&&(l=[],T(),x())};function Q(){l=[],T(),x(),document.getElementById("cart-modal").style.display="none"}function S(){const e=l.reduce((i,s)=>i+(s.price||0)*(s.qty||0),0);document.getElementById("courier");const n=l.reduce((i,s)=>i+(s.weight||1e3)*(s.qty||0),0)/1e3,o=e+E;document.getElementById("subtotal").innerText=`Rp ${e.toLocaleString("id-ID")}`,document.getElementById("shipping-cost").innerText=`Rp ${E.toLocaleString("id-ID")}`;const a=document.getElementById("total-weight");return a&&(a.innerText=`${n} Kg`),document.getElementById("grand-total").innerText=`Rp ${o.toLocaleString("id-ID")}`,{subtotal:e,shippingCost:E,total:o}}async function Re(){if(!u){showAlert("Silakan login terlebih dahulu untuk melanjutkan checkout agar pesanan tercatat di riwayat Anda."),document.getElementById("login-modal").style.display="block";return}const e=document.getElementById("name").value,t=document.getElementById("phone").value,n=document.getElementById("address").value,o=document.getElementById("provinsi").options[document.getElementById("provinsi").selectedIndex]?.text||"",a=document.getElementById("kabupaten").options[document.getElementById("kabupaten").selectedIndex]?.text||"",i=document.getElementById("kecamatan").options[document.getElementById("kecamatan").selectedIndex]?.text||"",s=document.getElementById("kelurahan").options[document.getElementById("kelurahan").selectedIndex]?.text||"",r=document.getElementById("courier"),d=r.options[r.selectedIndex]?.text||"",m=document.getElementById("order-method").value;if(u){const c=B(h,"users",u.uid);Ee(c,{name:e,phone:t,address:n,provinsi_id:document.getElementById("provinsi").value,kabupaten_id:document.getElementById("kabupaten").value,kecamatan_id:document.getElementById("kecamatan").value,kelurahan_id:document.getElementById("kelurahan").value},{merge:!0})}const y=`${n}, ${s}, ${i}, ${a}, ${o}`;if(!e||!t||!n||!o||!a||!i){showAlert("Mohon lengkapi data diri Anda!");return}const{subtotal:C,shippingCost:D,total:P}=S(),A=l.reduce((c,k)=>c+(k.weight||1e3)*k.qty,0)/1e3;let me=l.map((c,k)=>`${k+1}. ${c.name} (${c.qty}x) - Rp ${(c.price*c.qty).toLocaleString("id-ID")}`).join(`
`);const ue=`Ongkir (${d}): Rp ${D.toLocaleString("id-ID")}`,pe=`*Halo Admin, Saya mau order!*

*Data Penerima:*
Nama: ${e}
No HP: ${t}
Alamat: ${y}

*Pesanan:*
${me}
---------------------------
Subtotal: Rp ${C.toLocaleString("id-ID")}
Total Berat: ${A} Kg
${ue}
*Total Bayar: Rp ${P.toLocaleString("id-ID")}*

Silakan transfer ke:
BCA: 1010836642
BRI: 717901010257532
An. Indah Wahyuning Aprilia (Admin: ${I?I.storeName:"Service komputer Surabaya"})

Terima kasih!`;try{await Ie(h,async c=>{const k=B(h,"settings","order_counter"),F=await c.get(k),U=new Date,M=U.getMonth()+1,H=U.getFullYear();let L=1;if(F.exists()){const R=F.data();R.month===M&&R.year===H?L=(R.current||0)+1:L=1}const ge=String(L).padStart(3,"0"),ye=String(M).padStart(2,"0"),he=`${ge}_BJ-SKSID_${ye}-${H}`,fe=B(j(h,"orders"));c.set(fe,{invoiceNumber:he,nama:e,hp:t,alamat:y,kota:a,cart:l,subtotal:C,ongkir:D,total:P,courier:d,totalWeight:A,userId:u?u.uid:null,status:"baru",createdAt:new Date}),c.set(k,{current:L,month:M,year:H},{merge:!0})})}catch(c){console.error("Gagal menyimpan pesanan ke database: ",c),showAlert("Gagal menyimpan pesanan ke database: "+c.message+`
Cek Security Rules di Firebase Console.`)}if(m==="whatsapp"){const c=I&&I.adminPhone?I.adminPhone:"628994335111";window.open(`https://api.whatsapp.com/send/?phone=${c}&text=${encodeURIComponent(pe)}`,"_blank"),Q()}else m==="print"&&(We({name:e,phone:t,address:y,courier:d,subtotal:C,shippingCost:D,total:P,cart:l,totalWeightKg:A}),Q())}function We(e){const t=new Date().toLocaleDateString("id-ID",{year:"numeric",month:"long",day:"numeric"}),n=e.cart.map((i,s)=>`
        <tr>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${s+1}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${i.name}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${i.qty}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">Rp ${i.price.toLocaleString("id-ID")}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">Rp ${(i.price*i.qty).toLocaleString("id-ID")}</td>
        </tr>
    `).join(""),o=`
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
            <p><strong>Tanggal:</strong> ${t}</p>
            <p><strong>Kepada Yth:</strong> ${e.name}</p>
            <p><strong>No HP:</strong> ${e.phone}</p>
            <p><strong>Alamat:</strong> ${e.address}</p>
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
                ${n}
            </tbody>
        </table>

        <div class="totals">
            <p>Subtotal: Rp ${e.subtotal.toLocaleString("id-ID")}</p>
            <p>Total Berat: ${e.totalWeightKg} Kg</p>
            <p>Ongkir (${e.courier}): Rp ${e.shippingCost.toLocaleString("id-ID")}</p>
            <h3>Total: Rp ${e.total.toLocaleString("id-ID")}</h3>
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
    `,a=window.open("","_blank");a.document.write(o),a.document.close()}async function qe(){try{const t=await(await fetch(`${w}?action=provinsi`)).json(),n=document.getElementById("provinsi");n.innerHTML='<option value="">Pilih Provinsi</option>',t.data&&t.data.forEach(o=>{const a=document.createElement("option");a.value=o.code,a.text=o.name,n.appendChild(a)})}catch(e){console.error(e)}}async function se(e){const t=document.getElementById("kabupaten");t.innerHTML='<option value="">Loading...</option>',t.disabled=!0;try{const o=await(await fetch(`${w}?action=kabupaten&id=${e}`)).json();t.innerHTML='<option value="">Pilih Kabupaten/Kota</option>',o.data&&(o.data.forEach(a=>{const i=document.createElement("option");i.value=a.code,i.text=a.name,t.appendChild(i)}),t.disabled=!1)}catch(n){console.error(n)}}async function re(e){const t=document.getElementById("kecamatan");t.innerHTML='<option value="">Loading...</option>',t.disabled=!0;try{const o=await(await fetch(`${w}?action=kecamatan&id=${e}`)).json();t.innerHTML='<option value="">Pilih Kecamatan</option>',o.data&&(o.data.forEach(a=>{const i=document.createElement("option");i.value=a.code,i.text=a.name,t.appendChild(i)}),t.disabled=!1)}catch(n){console.error(n)}}async function de(e){const t=document.getElementById("kelurahan");t.innerHTML='<option value="">Loading...</option>',t.disabled=!0;try{const o=await(await fetch(`${w}?action=kelurahan&id=${e}`)).json();t.innerHTML='<option value="">Pilih Kelurahan/Desa</option>',o.data&&(o.data.forEach(a=>{const i=document.createElement("option");i.value=a.code,i.text=a.name,t.appendChild(i)}),t.disabled=!1)}catch(n){console.error(n)}}async function le(){if(u)try{const e=B(h,"users",u.uid),t=await ee(e);if(t.exists()){const n=t.data();document.getElementById("name").value=n.name||"",document.getElementById("phone").value=n.phone||"",document.getElementById("address").value=n.address||"",n.provinsi_id&&(document.getElementById("provinsi").value=n.provinsi_id,await se(n.provinsi_id),n.kabupaten_id&&(document.getElementById("kabupaten").value=n.kabupaten_id,await re(n.kabupaten_id),n.kecamatan_id&&(document.getElementById("kecamatan").value=n.kecamatan_id,await de(n.kecamatan_id),n.kelurahan_id&&(document.getElementById("kelurahan").value=n.kelurahan_id,ce()))))}}catch(e){console.error("Gagal load data user:",e)}}async function ce(){const e=document.getElementById("kelurahan"),t=document.getElementById("courier");if(e.selectedIndex<=0)return;const n=e.value,o=t.value,a=l.reduce((s,r)=>s+(r.weight||1e3)*r.qty,0),i=Math.max(1,a/1e3);t.innerHTML='<option value="">Memuat...</option>',t.disabled=!0,document.getElementById("shipping-cost").innerText="Loading...",E=0,S();try{const r=await(await fetch(`${w}?action=cost&destination=${n}&weight=${i}&courier=${o}`)).text();let d;try{d=JSON.parse(r)}catch{console.error("Respon Ongkir Error:",r)}if(d&&d.is_success&&d.data&&d.data.couriers)q=d.data.couriers,t.innerHTML='<option value="">Pilih Kurir</option>',q.forEach(m=>{const y=document.createElement("option");y.value=m.courier_code,y.text=`${m.courier_name} - Rp ${parseInt(m.price).toLocaleString("id-ID")} (${m.estimation||"-"})`,t.appendChild(y)}),t.disabled=!1,document.getElementById("shipping-cost").innerText="Silakan pilih kurir";else{let m=d&&d.message?d.message:"Tidak tersedia";m==="Success"&&(m="Tidak tersedia"),document.getElementById("shipping-cost").innerText=m,t.innerHTML='<option value="">Tidak tersedia</option>',console.warn("Ongkir tidak ditemukan:",d)}}catch(s){console.error("Gagal cek ongkir",s),document.getElementById("shipping-cost").innerText="Error",t.innerHTML='<option value="">Error</option>'}}function Ke(){const t=document.getElementById("courier").value,n=q.find(o=>o.courier_code==t);n?(E=parseInt(n.price),document.getElementById("shipping-cost").innerText=`Rp ${E.toLocaleString("id-ID")}`):(E=0,document.getElementById("shipping-cost").innerText="Rp 0"),S()}async function Ne(){const e=document.getElementById("track-courier").value,t=document.getElementById("track-awb").value,n=document.getElementById("track-result");if(!e||!t){showAlert("Pilih kurir dan masukkan nomor resi");return}n.innerHTML="Sedang melacak...";try{const a=await(await fetch(`${w}?courier=${e}&awb=${t}`)).json();if(a.status!==200){n.innerHTML=`<p style="color:red; text-align:center;">${a.message}</p>`;return}const i=a.data.summary,s=a.data.history;let r=`
            <div style="background:#f9f9f9; padding:15px; border-radius:5px; margin-bottom:15px; font-size:0.9rem;">
                <p><strong>Status:</strong> ${i.status}</p>
                <p><strong>Kurir:</strong> ${i.courier} - ${i.service}</p>
                <p><strong>Pengirim:</strong> ${a.data.detail.shipper||"-"}</p>
                <p><strong>Penerima:</strong> ${a.data.detail.receiver||"-"}</p>
            </div>
            <ul style="list-style:none; padding:0;">
        `;s.forEach(d=>{r+=`
                <li style="border-left: 2px solid #ddd; padding-left: 15px; margin-bottom: 15px; position:relative;">
                    <div style="position:absolute; left:-6px; top:0; width:10px; height:10px; background:#3498db; border-radius:50%;"></div>
                    <small style="color:#888;">${d.date}</small>
                    <p style="margin:5px 0;">${d.desc}</p>
                    <small style="color:#555;">${d.location}</small>
                </li>
            `}),r+="</ul>",n.innerHTML=r}catch(o){console.error(o),n.innerHTML='<p style="color:red;">Terjadi kesalahan sistem atau koneksi.</p>'}}document.getElementById("cart-btn").addEventListener("click",()=>{const e=document.getElementById("cart-modal");e.style.display=e.style.display==="block"?"none":"block",e.style.display==="block"&&le()});document.getElementById("wishlist-btn").addEventListener("click",()=>{document.getElementById("wishlist-modal").style.display="block"});document.getElementById("close-wishlist").addEventListener("click",()=>{document.getElementById("wishlist-modal").style.display="none"});document.getElementById("close-modal").addEventListener("click",()=>{document.getElementById("cart-modal").style.display="none"});document.getElementById("provinsi").addEventListener("change",e=>se(e.target.value));document.getElementById("kabupaten").addEventListener("change",e=>re(e.target.value));document.getElementById("kecamatan").addEventListener("change",e=>{de(e.target.value)});document.getElementById("kelurahan").addEventListener("change",ce);document.getElementById("courier").addEventListener("change",Ke);document.getElementById("btn-checkout").addEventListener("click",Re);document.getElementById("track-btn").addEventListener("click",()=>{document.getElementById("track-modal").style.display="block"});document.getElementById("close-track").addEventListener("click",()=>{document.getElementById("track-modal").style.display="none"});document.getElementById("btn-track").addEventListener("click",Ne);const X=document.getElementById("mobile-cart-btn");X&&X.addEventListener("click",e=>{e.preventDefault();const t=document.getElementById("cart-modal");t.style.display=t.style.display==="block"?"none":"block",t.style.display==="block"&&le()});const V=document.getElementById("mobile-wishlist-btn");V&&V.addEventListener("click",e=>{e.preventDefault(),document.getElementById("wishlist-modal").style.display="block"});const Z=document.getElementById("mobile-account-btn");Z&&Z.addEventListener("click",e=>{e.preventDefault(),u?(document.getElementById("mobile-user-info").innerText=u.email,document.getElementById("mobile-menu-modal").style.display="block"):document.getElementById("login-modal").style.display="block"});document.getElementById("btn-mobile-history")?.addEventListener("click",()=>{document.getElementById("mobile-menu-modal").style.display="none",document.getElementById("btn-history-nav").click()});document.getElementById("btn-mobile-track")?.addEventListener("click",()=>{document.getElementById("mobile-menu-modal").style.display="none",document.getElementById("track-modal").style.display="block"});document.getElementById("btn-mobile-logout")?.addEventListener("click",()=>{document.getElementById("mobile-menu-modal").style.display="none",ne(v)});const z=document.getElementById("login-modal"),N=document.getElementById("btn-login-nav"),_=document.getElementById("btn-logout-nav"),W=document.getElementById("user-name");let $=!1;N.addEventListener("click",()=>{z.style.display="block"});document.getElementById("close-login").addEventListener("click",()=>{z.style.display="none"});document.getElementById("toggle-register").addEventListener("click",e=>{e.preventDefault(),$=!$;const t=document.getElementById("login-title"),n=document.getElementById("btn-submit-login"),o=document.getElementById("toggle-register"),a=document.getElementById("forgot-password").parentElement;$?(t.innerText="Daftar Member Baru",n.innerText="Daftar",o.innerText="Sudah punya akun? Login",a.style.display="none"):(t.innerText="Login Member",n.innerText="Login",o.innerText="Belum punya akun? Daftar disini",a.style.display="block")});document.getElementById("btn-submit-login").addEventListener("click",async()=>{const e=document.getElementById("login-email").value,t=document.getElementById("login-password").value;try{$?(await xe(v,e,t),showAlert("Pendaftaran berhasil! Silakan isi data pengiriman saat checkout.")):(await Le(v,e,t),showAlert("Login berhasil!")),z.style.display="none"}catch(n){n.code==="auth/operation-not-allowed"?showAlert("Error: Metode login ini belum diaktifkan di Firebase Console."):showAlert("Error: "+n.message)}});document.getElementById("forgot-password").addEventListener("click",async e=>{e.preventDefault();const t=document.getElementById("login-email").value;if(!t){showAlert("Silakan isi kolom Email terlebih dahulu untuk mereset password.");return}try{await $e(v,t),showAlert(`Link reset password telah dikirim ke ${t}. Silakan cek email Anda.`)}catch(n){showAlert("Gagal mengirim reset password: "+n.message)}});document.getElementById("btn-history-nav").addEventListener("click",async()=>{if(!u)return;const e=document.getElementById("history-modal"),t=document.getElementById("history-list");e.style.display="block",t.innerHTML="<p>Memuat riwayat...</p>";try{const n=ve(j(h,"orders"),we("userId","==",u.uid)),o=await te(n);if(o.empty){t.innerHTML="<p>Belum ada riwayat pesanan.</p>";return}let a="";o.forEach(i=>{const s=i.data(),r=s.createdAt?new Date(s.createdAt.seconds*1e3).toLocaleDateString("id-ID"):"-",d=s.status==="selesai"?"green":s.status==="proses"?"orange":"grey";a+=`
            <div style="border:1px solid #ddd; padding:10px; margin-bottom:10px; border-radius:5px;">
                <div style="display:flex; justify-content:space-between; font-weight:bold;">
                    <span>${s.invoiceNumber||"Order #"+i.id.substr(0,8)}</span>
                    <span style="color:${d}">${s.status.toUpperCase()}</span>
                </div>
                <p style="margin:5px 0; font-size:0.9rem;">Tanggal: ${r} | Total: Rp ${s.total.toLocaleString("id-ID")}</p>
                <p style="margin:5px 0; font-size:0.9rem;"><strong>Resi:</strong> ${s.awb||"-"}</p>
            </div>`}),t.innerHTML=a}catch(n){console.error("Gagal load history:",n),t.innerHTML="<p>Gagal memuat riwayat. Pastikan Anda login.</p>"}});document.getElementById("close-history").addEventListener("click",()=>{document.getElementById("history-modal").style.display="none"});_.addEventListener("click",()=>ne(v));Te(v,e=>{u=e,e?(N.style.display="none",_.style.display="block",document.getElementById("btn-history-nav").style.display="block",W.style.display="block",W.innerText=e.email.split("@")[0]):(N.style.display="block",_.style.display="none",document.getElementById("btn-history-nav").style.display="none",W.style.display="none")});window.showToast=function(e){const t=document.getElementById("toast-container"),n=document.createElement("div");n.className="toast",n.innerText=e,t.appendChild(n),setTimeout(()=>{n.classList.add("show")},100),setTimeout(()=>{n.classList.remove("show"),setTimeout(()=>{n.remove()},300)},3e3)};window.showAlert=function(e){document.getElementById("custom-alert-message").innerText=e,document.getElementById("custom-alert-modal").style.display="block"};window.showConfirm=function(e){return new Promise(t=>{document.getElementById("custom-confirm-message").innerText=e;const n=document.getElementById("custom-confirm-modal");n.style.display="block";const o=document.getElementById("confirm-yes-btn"),a=document.getElementById("confirm-no-btn"),i=o.cloneNode(!0),s=a.cloneNode(!0);o.parentNode.replaceChild(i,o),a.parentNode.replaceChild(s,a),i.addEventListener("click",()=>{n.style.display="none",t(!0)}),s.addEventListener("click",()=>{n.style.display="none",t(!1)})})};Ce();De();qe();G();x();
