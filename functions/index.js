/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// Ganti dengan domain asli Anda
const YOUR_DOMAIN = "https://toko.servicekomputersurabaya.id";

exports.sitemap = onRequest(async (req, res) => {
  try {
    const sitemapStream = [];
    
    // 1. Header XML
    sitemapStream.push('<?xml version="1.0" encoding="UTF-8"?>');
    sitemapStream.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');

    // 2. Tambahkan Halaman Statis Utama (Home, dll)
    sitemapStream.push(`
      <url>
        <loc>${YOUR_DOMAIN}/index.html</loc>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
      </url>
    `);

    // 3. Ambil Data Produk dari Firestore
    // Kita hanya ambil field yang diperlukan untuk hemat bandwidth
    const productsSnapshot = await db.collection("products")
      .select("updatedAt", "status", "active", "judul", "name") 
      .get();

    productsSnapshot.forEach((doc) => {
      const data = doc.data();
      
      // Cek status aktif (sesuai logika di frontend Anda)
      const isActive = data.status ? (data.status === 'active') : (data.active !== false);

      if (isActive) {
        // Tentukan Last Modified
        let lastMod = new Date().toISOString();
        if (data.updatedAt) {
            // Handle Firestore Timestamp
            lastMod = data.updatedAt.toDate().toISOString();
        }

        const name = data.judul || data.name || "produk";
        // Gunakan logika slug yang sama dengan detail.html (Canonical)
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

        // Tambahkan URL Detail Produk
        // Format URL sesuai detail.html?id=...&slug=...
        sitemapStream.push(`
          <url>
            <loc>${YOUR_DOMAIN}/detail.html?id=${doc.id}&amp;slug=${slug}</loc>
            <lastmod>${lastMod}</lastmod>
            <changefreq>weekly</changefreq>
            <priority>0.8</priority>
          </url>
        `);
      }
    });

    // 4. Tutup XML
    sitemapStream.push('</urlset>');

    // 5. Kirim Response
    const sitemapContent = sitemapStream.join("");
    
    // Set Header agar browser/Google tahu ini XML
    res.set("Content-Type", "application/xml");
    // Cache sitemap selama 24 jam agar tidak boros quota Firestore (opsional)
    res.set("Cache-Control", "public, max-age=86400, s-maxage=86400");
    
    res.status(200).send(sitemapContent);

  } catch (error) {
    logger.error("Sitemap Error", error);
    res.status(500).end();
  }
});

// Fungsi untuk memindahkan (rename) file langsung di server tanpa download
exports.renameStorageFile = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Akses ditolak. Anda belum login.');
  }

  const { oldPath, newPath } = request.data;
  if (!oldPath || !newPath) {
    throw new HttpsError('invalid-argument', 'Path asal dan tujuan wajib diisi.');
  }

  try {
    const bucket = admin.storage().bucket("servicekomputersurabaya.firebasestorage.app");
    const file = bucket.file(oldPath);
    
    // Perintah move() memindahkan file secara instan di sisi server (0 bandwidth)
    await file.move(newPath);
    return { success: true };
  } catch (error) {
    logger.error("Gagal rename file di Storage:", error);
    // Kembalikan error sebagai data JSON agar tidak disensor oleh Firebase Client SDK
    return { success: false, message: error.message };
  }
});
