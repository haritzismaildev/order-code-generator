require('dotenv').config();
const mysql = require('mysql2/promise');

// Ambil konfigurasi dari .env
const {
  DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
} = process.env;

// Hubungkan Pool ke MySQL
const pool = mysql.createPool({
  host    : DB_HOST,
  port    : DB_PORT,
  user    : DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10
});

/**
 * Generate kode unik numeric string dengan panjang acak 1–10
 * Cek di DB & Set lokal untuk pastikan unik
 */
async function generateUniqueCode(existingCodes) {
  while (true) {
    // Random panjang 1–10
    const len = Math.floor(Math.random() * 10) + 1;
    let code = '';
    for (let i = 0; i < len; i++) {
      code += Math.floor(Math.random() * 10);
    }
    // Hindari duplikat dalam satu sesi
    if (existingCodes.has(code)) continue;

    // Cek di DB
    const [rows] = await pool.query(
      'SELECT 1 FROM orders WHERE kode_unik = ? LIMIT 1',
      [code]
    );
    if (rows.length === 0) {
      existingCodes.add(code);
      return code;
    }
  }
}

/**
 * Generate & Insert 50 transaksi dummy
 */
async function seedOrders() {
  const existingCodes = new Set();

  for (let i = 1; i <= 50; i++) {
    const kodeUnik = await generateUniqueCode(existingCodes);

    // Dummy data produk
    const produkId   = i; // pakai i sebagai produk_id
    const namaProduk = `Produk-${i}`;

    // Insert ke DB
    await pool.query(
      `INSERT INTO orders
       (produk_id, nama_produk, harga, kode_unik, status)
       VALUES (?, ?, 299000, ?, 'pending')`,
      [produkId, namaProduk, kodeUnik]
    );

    console.log(`Inserted Order #${i} → kode_unik=${kodeUnik}`);
  }

  console.log('✅ 50 transaksi berhasil di-insert');
}

/**
 * Jalankan proses
 */
async function main() {
  try {
    console.log('🔌 Menghubungkan ke database...');
    await pool.getConnection();  // test koneksi

    console.log('📝 Mulai generate data...');
    await seedOrders();

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
    console.log('🔒 Koneksi ditutup');
  }
}

main();