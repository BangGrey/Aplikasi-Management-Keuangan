# Tabungan emas dan pemantauan harga

Form catatan emas hanya meminta **jumlah gram**. Sumber buyback dipilih di halaman utama tabungan emas, di luar form. Semua catatan dihitung ulang otomatis dari sumber yang sedang dipilih; pilihan sumber tersimpan per akun/demo di browser. Nama catatan dibuat otomatis. Fitur ini mencatat kepemilikan emas, bukan membeli/menjual emas atau menghubungkan rekening emas asli. Buka **Tabungan → Tabungan emas**. Dukungan pencatatan mengikuti akses manual aplikasi: demo lokal atau trial/langganan aktif; asisten tetap khusus premium.

## Aktifkan di Supabase

1. Jika `schema.sql` dan migrasi sebelumnya sudah selesai, jalankan **hanya** `supabase/gold.sql` di SQL Editor. File ini bisa dijalankan ulang dan boleh dijalankan setelah `premium.sql`.
2. Pastikan ada tabel baru `gold_holdings`, `gold_quotes`, dan `gold_quote_history`. Total tabel menjadi 13 jika seluruh fitur sebelumnya terpasang.
3. RLS harus aktif di ketiganya. Pengguna hanya dapat mengakses catatan emas sendiri. Harga pasar dapat dibaca publik, tetapi hanya service-role/server dapat menulisnya. Akun kedaluwarsa tetap dapat membaca emas lama; penulisan mengikuti `has_access()`.
4. Environment Functions yang diperlukan: `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` seperti fitur server sebelumnya. Tidak ada API key tambahan untuk sumber Galeri24, Gold API dan Frankfurter yang digunakan saat ini.

## Mengurangi emas yang sudah dijual

Jalankan `supabase/gold-reductions.sql` setelah `gold.sql`. Jika database sudah terpasang, cukup jalankan file tambahan ini; tidak perlu mengulang schema awal. Migrasi bisa dijalankan ulang dan tidak menghapus catatan lama. Ada tabel baru `gold_reductions`, sehingga total menjadi 14 tabel bila semua fitur terpasang.

Klik **Catat emas**, lalu pilih **Tambah** atau **Kurang** dalam satu dialog. Tambah membuat catatan gram baru. Kurang meminta gram yang dijual dan menampilkan sisa saldo; jika ada beberapa catatan bersaldo, pilih catatan yang akan dikurangi. Tidak ada tombol pengurangan terpisah di kartu. Contoh: 3 g − 1 g = 2 g. Pengurangan mendukung 4 angka desimal, harus positif, dan tidak boleh melebihi saldo catatan yang dipilih. Jika seluruh saldo dijual, catatan disimpan pada 0 gram dengan label “Emas habis terjual”. Saat seluruh saldo kosong, mode Kurang menjelaskan bahwa belum ada emas yang dapat dikurangi. Jumlah sisa dan estimasi otomatis ikut diperbarui.

Untuk akun Supabase, `reduce_gold` memeriksa pemilik dan akses trial/langganan, mengunci baris saldo, serta menyimpan pengurangan dan sisa saldo dalam satu transaksi. Setiap permintaan memakai ID unik; pengulangan ID yang sama tidak mengurangi lagi. Jika respons terputus, klien mencoba memeriksa catatan pengurangan sebelum menyatakan gagal. Catatan pengurangan dapat dibaca pemiliknya saja; tidak ada input password/API key untuk fitur ini. Menghapus seluruh catatan emas juga menghapus riwayat pengurangan terkait melalui foreign key cascade.

Mode demo hanya mengurangi catatan browser, tanpa riwayat pengurangan server. Pemasukan rupiah **tidak** dibuat otomatis dari estimasi buyback: catat hasil penjualan yang benar-benar diterima secara terpisah. Ini mencegah estimasi dianggap sebagai uang penjualan riil. Saldo 0 dapat diisi kembali melalui tombol ubah jumlah gram.

Uji di Supabase sebelum produksi: pengurangan sebagian, seluruh saldo, 0, angka negatif, nominal melebihi saldo, akun lain, akun kedaluwarsa, dua pengurangan bersamaan, dan retry ID sama. Unit test lokal mencakup aritmetika gram serta penolakan nominal tidak valid; transaksi database/RLS belum diuji langsung tanpa koneksi layanan.

## Jalankan sinkronisasi harga

1. Deploy pengujian/produksi ke Netlify dengan Functions. Jangan hanya mengunggah folder `dist`: backend serta scheduled function harus ikut dibangun dari repositori.
2. Di dashboard Functions, cari **gold-price-sync**, lalu **Run now**. Ini menginisialisasi snapshot; tanpa itu tabel harga akan kosong sampai jadwal pertama berjalan.
3. Buka tab emas dan tekan **Muat harga tersimpan**. Tombol ini membaca cache Supabase, bukan memaksa permintaan ke semua situs sumber.
4. Jadwal function adalah `0 2,7 * * *`: **09.00 dan 14.00 WIB setiap hari**. Netlify memakai UTC. Scheduler baru berjalan otomatis pada deploy yang dipublikasikan, bukan otomatis pada Deploy Preview/branch deploy. Di lingkungan uji, gunakan Run now sesuai dukungan dashboard atau panggil scheduled function melalui fasilitas pengujian Netlify Dev.
5. UI memuat cache setiap lima menit dan saat halaman kembali mendapat fokus. Data tetap memiliki tanggal sumber, waktu pengambilan, dan status keberhasilan.
6. Periksa log function setelah perubahan struktur situs sumber. Kegagalan satu sumber tidak menghapus harga baik terakhir dari sumber itu. Harga lama diberi label, bukan dianggap harga hari ini. Tanggal sumber yang mundur tidak menggantikan snapshot bertanggal lebih baru.

Referensi: [Scheduled Functions Netlify](https://docs.netlify.com/build/functions/scheduled-functions/).

## Sumber yang terhubung

| Acuan di aplikasi | Implementasi | Jenis nilai |
|---|---|---|
| Galeri24 · merek Galeri24 | Membaca tabel publik Galeri24, baris 1 gram, kolom Harga Buyback | Estimasi prorata buyback |
| Antam · buyback di Galeri24 | Tabel Galeri24 bagian ANTAM, baris 1 gram | Buyback produk Antam oleh Galeri24, **bukan** langsung Antam |
| Referensi dunia | Gold API XAU/USD + Frankfurter USD/IDR | Referensi pasar; bukan buyback atau nilai pencairan |
| Antam · langsung Logam Mulia | Feed partner terkonfigurasi | Belum tersedia sebelum feed terhubung |
| Pegadaian · Tabungan Emas | Feed partner terkonfigurasi | Harga pembelian kembali emas nasabah, bukan harga beli emas oleh nasabah |
| Toko emas lain | Belum ditampilkan dalam pemilihan sumber otomatis | Memerlukan integrasi feed tambahan |

Saat implementasi diperiksa, halaman Galeri24 dapat dibaca dan sumber dunia/kurs dapat dipanggil. Situs Logam Mulia menolak akses otomatis (403); halaman Pegadaian belum menyediakan harga yang berhasil dibaca melalui jalur publik yang diperiksa. Sistem tidak mencoba melewati proteksi tersebut dan tidak mengarang harga untuk keduanya. Ketersediaan serta format sumber dapat berubah. Periksa ketentuan penggunaan/sindikasi sumber sebelum mengoperasikan layanan berbayar dalam skala besar; konektor bukan kontrak lisensi atau jaminan uptime dari penerbit harga.

Referensi: [Galeri24](https://galeri24.co.id/harga-emas), [Logam Mulia](https://www.logammulia.com/id/sell/gold), [Pegadaian](https://pegadaian.co.id/harga-emas), [Gold API](https://gold-api.com/faqs), [Frankfurter](https://frankfurter.dev/).

## Perhitungan

```text
estimasi buyback kotor = gram × buyback acuan pecahan 1 gram
referensi dunia/gram = XAU dalam USD per troy ounce × kurs USD/IDR ÷ 31.1034768
```

Untuk ilustrasi **bukan harga aktual**, jika saldo 3 gram dan buyback acuan Rp2.000.000/gram, estimasinya Rp6.000.000. Sistem tidak menampilkan contoh ini sebagai data pasar.

- Gram mendukung hingga 4 angka desimal. Jumlah gram dijumlahkan dalam satuan 1/10.000 gram untuk mengurangi galat floating point.
- Estimasi menggunakan acuan per 1 gram secara prorata, bukan janji tarif yang sama untuk pecahan fisik tertentu. Pecahan 3 gram, tiga keping 1 gram, merek, kondisi, dan outlet dapat memiliki nilai berbeda.
- Nilai ditampilkan sebelum pajak/biaya. Belum ada perhitungan pajak atau biaya otomatis dan tidak menjamin outlet menerima emas tersebut.
- Harga dunia tidak dimasukkan ke total buyback portofolio; ia hanya referensi. Kurs referensi harian juga bukan kurs eksekusi transaksi.
- Sumber tanpa harga tidak dihitung sebagai nol dan tidak diam-diam diganti sumber lain: kartu menampilkan Harga belum tersedia, sedangkan total menyebut jumlah catatan yang berhasil dihitung.
- Harga yang bertanggal sebelum hari ini diberi tanda Bukan harga hari ini, termasuk saat libur/weekend. Tanggal dunia menggunakan yang lebih lama antara tanggal emas dan tanggal kurs, dengan keduanya disimpan di metadata.
- Input nama, modal, harga manual, tanggal harga, dan mode harga tidak lagi ditampilkan dalam form. Metadata harga manual lama tetap kompatibel dengan schema, tetapi estimasi halaman selalu menggunakan snapshot otomatis dari sumber pilihan saat ini.
- Modal lama tidak dihapus dari database, tetapi tidak diminta atau ditampilkan pada alur sederhana ini.
- Saldo emas dipisahkan dari saldo rupiah dan progres tabungan rupiah; pencatatan tidak membuat pemasukan/pengeluaran otomatis.
- Riwayat grafik dikumpulkan setelah sinkronisasi pertama, satu snapshot terakhir per sumber/tanggal. Grafik butuh setidaknya dua tanggal. Riwayat sebelumnya tidak direkayasa.

## Feed partner untuk Antam/Pegadaian

Jika memperoleh akses resmi atau penyedia data yang berizin, siapkan endpoint HTTPS yang mengembalikan kontrak JSON berikut. Endpoint ini **harus benar-benar tersedia**; kode tidak menyediakan akses partner Antam/Pegadaian otomatis.

```json
{
  "quotes": [
    {
      "source": "antam",
      "kind": "buyback",
      "currency": "IDR",
      "unit": "gram",
      "price_per_gram": 2000000,
      "source_date": "2026-11-16"
    }
  ]
}
```

Angka di atas hanya contoh kontrak. `source` hanya boleh `antam` atau `pegadaian`. Pegadaian harus merujuk harga yang diterima nasabah saat menjual saldo emas, bukan harga toko menjual emas. Maksimal dua sumber tanpa duplikasi, harga numerik positif, dan tanggal sumber valid/tidak di masa depan. Partner perlu menormalkan unit harga, misalnya dari harga per 0,01 gram menjadi per gram.

Tambahkan environment **Functions**:

```dotenv
GOLD_PARTNER_FEED_URL=https://ENDPOINT-PARTNER-ANDA/quotes
GOLD_PARTNER_FEED_TOKEN=TOKEN_JIKA_DIPERLUKAN
```

Token opsional dikirim sebagai `Authorization: Bearer ...` dan tidak dikirim frontend. URL wajib HTTPS tanpa redirect, dan harus dapat dijangkau langsung. Jika belum memiliki endpoint, biarkan kedua variabel kosong; koneksi Galeri24 dan referensi dunia tetap bekerja.

## Pengujian sebelum publikasi

1. Pastikan migrasi sukses; uji dua akun dengan catatan emas berbeda agar RLS terverifikasi.
2. Catat 3 gram → pilih Galeri24 → cocokkan estimasi dengan kolom Buyback **1 gram** dari tanggal yang ditampilkan.
3. Ubah ke Antam lewat Galeri24, pastikan label sumber tidak berubah menjadi Antam langsung.
4. Pilih Antam/Pegadaian tanpa feed: nilai harus belum tersedia; tidak boleh meminta pengguna memasukkan harga atau memakai sumber lain diam-diam.
5. Referensi dunia tetap tersedia di pantauan harga/riwayat, tetapi bukan pilihan sumber buyback untuk catatan.
6. Ubah gram, ganti sumber, muat ulang, dan hapus catatan. Uji akun kedaluwarsa tidak dapat menulis.
7. Jalankan sinkronisasi pada dua tanggal berbeda untuk grafik; periksa harga lama, sumber gagal, dan catatan yang belum terhitung.

`npm run dev` hanya frontend: pencatatan gram demo dapat dipakai, tetapi harga otomatis memerlukan Netlify Functions dan Supabase. Unit test tidak memanggil API eksternal. Pembacaan langsung Galeri24/Gold API/Frankfurter sudah diuji dari lingkungan pengembangan; migrasi Supabase, scheduler produksi, browser, dan feed partner belum diuji tanpa konfigurasi layanan.
