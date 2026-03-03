/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// Ganti dengan domain asli Anda
const YOUR_DOMAIN = "https://servicekomputersurabaya.id";

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
      .select("updatedAt", "status", "active") 
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

        // Tambahkan URL Detail Produk
        // Format URL sesuai detail.html?id=...
        sitemapStream.push(`
          <url>
            <loc>${YOUR_DOMAIN}/detail.html?id=${doc.id}</loc>
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
