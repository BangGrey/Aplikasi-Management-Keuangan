# Tabunganmu 🌱

Aplikasi manajemen keuangan dalam Bahasa Indonesia dan English: React + Vite, Supabase Auth/Postgres, Midtrans Snap, dan Netlify Functions.

Untuk pemasangan pertama, ikuti [panduan konfigurasi bertahap sebelum deploy](SETUP.md).

Identitas aplikasi adalah **Tabunganmu**. Footer halaman pengenalan dan aplikasi menampilkan copyright dengan tahun otomatis serta bantuan melalui **[tabunganmusupport@gmail.com](mailto:tabunganmusupport@gmail.com)**. Nama ini juga digunakan pada judul tab, nota, ekspor CSV, dan deskripsi pembayaran. Bucket avatar dan kunci preferensi yang sudah ada tetap dipertahankan agar foto serta pengaturan pengguna tetap terhubung. Penggantian nama tidak memerlukan migrasi SQL.

## Halaman pengenalan dan paket Premium

Pengunjung tanpa sesi membuka halaman pengenalan terlebih dahulu: fitur, pratinjau aplikasi, alasan membuat akun, perbedaan trial/Premium, harga, dan tanya jawab. Tombol **Masuk** membuka formulir login; **Daftar gratis** membuka registrasi. **Jelajahi demo** membuka dashboard dengan data contoh melalui `/demo`. Pengguna yang sudah masuk langsung membuka aplikasinya. Pilihan Bahasa Indonesia/English juga tersedia pada halaman pengenalan.

Navigasi menggunakan URL tanpa tanda `#`: `/beranda`, `/fitur`, `/cara-mulai`, `/paket`, dan `/pertanyaan` untuk pengenalan; `/ringkasan`, `/pemasukan`, `/pengeluaran`, `/tabungan`, `/tema`, `/langganan`, dan `/profil` untuk akun. Halaman demo memakai awalan `/demo`, misalnya `/demo/tabungan`. Halaman akun memerlukan login; setelah masuk, pengguna melanjutkan ke halaman yang diminta. URL bisa dibuka langsung, dimuat ulang, dan ditelusuri dengan tombol kembali/maju browser. Tautan lama seperti `/#beranda` atau `/#demo` otomatis diganti ke alamat baru. Redirect SPA `/* → /index.html` di `netlify.toml` sudah mendukung URL ini; tidak perlu mengubah konfigurasi Supabase atau database.

Di ponsel, tombol menu membuka panel kiri; tutup dengan tombol **×**, mengetuk area di luar panel, Escape, atau memilih menu. Layar belakang tidak bergulir saat panel terbuka. **Profil** kini berupa popup ringkas di atas halaman yang sedang dibuka; status akun dan langganan tetap terlihat, sementara pengaturan foto, username, dan password bisa dibuka satu per satu. Menutup popup mengembalikan halaman, filter, dan posisi scroll sebelumnya. URL `/profil` tetap bisa dibagikan atau dimuat ulang; akses langsung membuka popup di atas Ringkasan. Tombol kembali/maju browser juga membuka/menutup popup. Perubahan ini tidak memerlukan migrasi SQL atau konfigurasi layanan tambahan.

Ilustrasi utama berupa **slideshow enam gambar fitur**: ringkasan, transaksi, target tabungan, emas, asisten, dan tema. Gambar otomatis berganti setiap 6 detik serta dapat dipilih melalui tab, tombol sebelumnya/berikutnya, atau usapan horizontal di ponsel. Tombol jeda/putar mengontrol rotasi; rotasi juga berhenti sementara saat hover/fokus, tab browser tersembunyi, atau slideshow di luar layar. Preferensi reduced motion memulai slideshow dalam keadaan dijeda.

Gambar lokal di `public/previews/` tersedia dalam Bahasa Indonesia dan English, menggunakan **data ilustrasi, bukan data akun atau harga emas terkini**. Ubah sumber di `scripts/generate-feature-previews.mjs`, lalu jalankan `npm.cmd run generate:previews` untuk memperbarui kedua versi bahasa. Gambar yang sudah dihasilkan ikut build/deploy tanpa perlu API atau SQL tambahan.

Jalankan **`supabase/subscription-plans.sql` sebelum deploy checkout baru**. Migrasi menambahkan identitas/durasi paket pada `orders`, memperbarui constraint harga, dan mengubah RPC aktivasi agar mengikuti paket yang dibayar. Pesanan lama tetap menjadi paket 30 hari; status paid dan tanggal aktif yang ada tidak direset.

| Paket | Harga | Durasi ditambahkan |
|---|---:|---|
| 30 hari | Rp29.000 | 30 hari |
| 3 bulan | Rp60.000 | 3 bulan kalender |
| 6 bulan | Rp150.000 | 6 bulan kalender |
| 1 tahun | Rp299.000 | 12 bulan kalender |

Pengguna Premium melihat **Perpanjang**, tanggal berakhir, dan perkiraan masa aktif setelah pembayaran. Paket baru ditambahkan dari `max(paid_until, now())`; sisa masa aktif tidak hilang. Pada akhir bulan, tanggal mengikuti batas bulan tujuan (misalnya 31 Januari + 3 bulan = 30 April). Jika sudah kedaluwarsa, aktivasi dimulai ketika pembayaran diverifikasi. Pembayaran sekali, tanpa tagihan atau perpanjangan otomatis.

Frontend hanya mengirim `planId`; harga dan durasi ditentukan katalog server `src/subscription-plans.mjs` dan dibatasi lagi oleh SQL. Midtrans menerima nominal yang sama dengan pesanan. Webhook memverifikasi tanda tangan, mengambil status langsung dari Midtrans, mencocokkan nominal/order, lalu menjalankan RPC server. Klik tombol bayar atau kembali dari Midtrans tidak langsung mengaktifkan Premium. Memilih paket pada halaman pengenalan meminta pengguna mendaftar/masuk, kemudian memilih pembayaran dari akun.

Untuk uji pembelian, pasang Server Key Sandbox dan `MIDTRANS_IS_PRODUCTION=false` pada Netlify Functions, lalu redeploy. Halaman Langganan menampilkan mode dari server, kembali ke halaman yang sama setelah Snap, dan menyediakan **Periksa pembayaran** jika webhook terlambat. Settlement/capture yang terverifikasi mengaktifkan Premium pada akun Supabase sesuai paket, termasuk untuk transaksi Sandbox; tidak ada perpindahan dana nyata pada Sandbox. Baca [langkah uji pembelian Sandbox](SETUP.md#uji-pembelian-premium-di-sandbox-pada-website-netlify). Tidak memerlukan migrasi baru jika `subscription-plans.sql` sudah diterapkan.

## Pilihan bahasa

Pilih **ID / EN** di kanan atas atau **Profil → Bahasa tampilan**. Pilihan tersimpan di browser dan langsung berlaku pada navigasi, formulir, tabungan, tema, profil, nota, dan pesan baru dari asisten. Format angka dan tanggal mengikuti bahasa; mata uang tetap rupiah. Nama aplikasi, nama asisten, judul catatan pengguna, nilai kategori database, dan chat sebelumnya tetap tersimpan seperti semula. Tidak memerlukan migrasi Supabase atau environment variable baru.

Asisten premium menerima perintah sederhana dalam kedua bahasa, misalnya `add expense coffee 5000`, `record income salary 5 million`, `What is my current balance?`, dan `Total expenses last month`. Untuk AI lanjutan yang telah dikonfigurasi, pilihan bahasa turut dikirim agar balasan mengikuti bahasa tampilan. Penggunaan bahasa Inggris tidak mengaktifkan konversi valuta asing.

## Mengisi tabungan melalui asisten

Jalankan **`supabase/assistant-savings.sql` setelah `premium.sql`** di Supabase SQL Editor. Migrasi ini menambah catatan setoran dan RPC Premium yang memeriksa kepemilikan, menambah saldo secara atomik, serta memakai ID permintaan tetap agar retry tidak menggandakan setoran. Tidak memerlukan API key atau environment variable baru.

Contoh: target **Liburan ke Jepang** sudah tersedia, lalu pengguna berkata **“tambahkan tabungan ke Jepang 500000”**. Jika hanya satu target cocok, asisten langsung menambah Rp500.000 ke saldo terkumpul dan menampilkan total terbaru. Jika beberapa target cocok, asisten menampilkan pilihan; jika tidak ada yang cocok, pengguna diminta menyebutkan nama lebih lengkap atau membuat target lewat menu Tabungan. Pencocokan memakai kata utuh, tidak menerka target terdekat. Mendukung nominal seperti `500rb`, `500 ribu`, `Rp500.000`, serta `add savings to Japan 500000` untuk target bernama Japan.

Setoran hanya memperbarui progres target tabungan rupiah, sesuai tombol Sisihkan. Tidak otomatis mencatat pemasukan/pengeluaran, mengurangi saldo rupiah, membuat target baru, atau mengubah tabungan emas. Intent tabungan dari OpenAI selalu ditampilkan untuk diperiksa sebelum disimpan. Jika respons gagal setelah penyimpanan, gunakan tombol **Coba lagi** pada pesan yang sama; ID permintaan disimpan bersama chat di browser.

### Membuat target tabungan lewat percakapan

Jalankan tambahan **`supabase/assistant-goals.sql` setelah `premium.sql`**. Asisten kini membedakan pembuatan target dan setoran ke target yang sudah ada. Contoh percakapan:

1. **“Aku ingin membuat tabungan untuk membeli rumah impian.”** → asisten menyiapkan draf dan menanyakan total target dana.
2. **“Rumah impian tabungan awal 500000.”** → menyimpan saldo awal Rp500.000 di draf, lalu tetap menanyakan total target; nominal awal tidak dianggap harga rumah.
3. **“Target 500 juta.”** → menampilkan kartu Rumah impian, target Rp500.000.000, tabungan awal Rp500.000.
4. Pilih **Buat tabungan ini** → target dibuat di akun dan ringkasan/tabungan langsung diperbarui.

Draf tersimpan di browser sampai disimpan atau dibatalkan. Koreksi seperti `tabungan awal 750000` memperbarui pratinjau yang belum dikirim. Ketik `Batal` untuk membuang draf. Perintah lengkap `buat tabungan rumah impian target 500 juta, tabungan awal 500000` dan bahasa Inggris juga didukung. Jika tabungan awal tidak disebutkan, pratinjau menampilkan Rp0. Pembuatan selalu perlu tombol konfirmasi; hanya pesan berhasil dari server yang menyatakan target sudah dibuat. Retry memakai ID tetap, termasuk setelah reload, dan tidak membuat ulang target yang kemudian dihapus.

Untuk AI lanjutan, hanya pesan saat ini, memori kategori, serta nama/target/saldo awal dari draf aktif yang dikirim. Daftar transaksi, daftar target tabungan yang tersimpan, dan riwayat chat tidak dikirim. Parser lokal tetap menangani contoh di atas tanpa panggilan API.

## Tabungan emas

Menu **Tabungan → Tabungan emas** meminta jumlah gram saja. Pilih sumber buyback di halaman, lalu semua estimasi dihitung otomatis; tersedia juga riwayat harga harian. Jalankan `supabase/gold.sql` setelah migrasi sebelumnya. Harga otomatis memakai scheduled function `gold-price-sync` pada 09.00 dan 14.00 WIB, lalu frontend membaca cache Supabase.

Sumber terhubung: buyback merek Galeri24 dan Antam melalui situs Galeri24; referensi dunia memakai Gold API dan kurs Frankfurter. **Buyback Antam langsung/Pegadaian belum otomatis tersedia**: keduanya memerlukan endpoint partner yang sah; bila belum terhubung, nilai ditandai belum tersedia. Harga dunia tidak dianggap buyback toko. Panduan aktivasi, batas perhitungan, dan kontrak feed ada di [GOLD-SETUP.md](GOLD-SETUP.md).

Tombol **Catat emas** memiliki pilihan **Tambah** atau **Kurang**. Mode Kurang mencatat gram yang sudah dijual dan menghitung ulang sisa serta estimasi buyback; bila ada beberapa catatan bersaldo, pengguna memilih catatan yang dikurangi. Jalankan migrasi tambahan `supabase/gold-reductions.sql` setelah `gold.sql`. Pengurangan dibatasi saldo, diproses atomik dan tahan retry di server; saldo yang habis tetap tersimpan sebagai 0 gram. Hasil penjualan rupiah dicatat manual sesuai uang yang benar-benar diterima.

## Akses gratis dan premium

**Trial 7 hari membuka seluruh fitur Premium**, termasuk semua tema karakter, chat asisten, nama asisten, ringkasan, pembuatan/setoran target, pembelajaran kategori, dan AI lanjutan bila API telah dikonfigurasi. Akses berlaku jika `paid_until > now()` atau `trial_ends_at > now()`, dengan akun yang cocok dengan sesi. Demo tanpa akun tetap memakai tema pastel dan asisten terkunci.

Untuk database yang sudah terpasang, jalankan **`supabase/trial-premium.sql` setelah `premium.sql`**. Tanggal signup, trial, dan langganan yang ada tetap dipertahankan; migrasi tidak memulai ulang trial yang sudah habis. Untuk proyek baru, jalankan urutan di SETUP.md. Jika mengulang assistant.sql/learning.sql, terapkan premium.sql dan trial-premium.sql lagi agar aturan akses/kuota konsisten.

Tema karakter terbuka selama trial atau langganan aktif. Ketika kedua masa akses berakhir atau pengguna keluar, tampilan kembali ke pastel terakhir (fallback Sage Garden) dan asisten terkunci. Preferensi karakter dapat digunakan kembali saat akses aktif. Masa akses diperiksa saat halaman berjalan; profil diperbarui ketika fokus kembali atau setiap 60 detik. Status **Trial Premium** dibedakan dari **Premium** berbayar, sehingga trial tidak dianggap pembayaran dan tidak menampilkan tanggal paid_until yang kosong.

Database dan API memeriksa akses trial/Premium sebelum menjalankan fitur asisten. Kuota AI lanjutan tetap **50 permintaan per hari per akun** untuk trial maupun pelanggan berbayar. Parser lokal tidak memakai kuota API. Foto profil, username, password, dan hak penghapusan memori pribadi tetap tersedia setelah masa akses berakhir. Pembayaran/perpanjangan tetap berdasarkan paid_until; trial tidak membuat pesanan berbayar.

## Email atau username untuk login

Jalankan `supabase/username.sql` setelah `schema.sql` (bila file-file lain sudah sukses, cukup jalankan migrasi tambahan ini). Pendaftaran meminta email, username unik, dan password. Login menerima email atau username di kolom yang sama. Akun lama bisa masuk lewat email lalu memilih username melalui avatar kanan atas. Format username: 3–24 karakter, diawali huruf, hanya huruf/angka/underscore, tanpa membedakan huruf besar-kecil.

Tambahkan `SUPABASE_ANON_KEY` ke environment Functions dengan nilai publishable/anon key yang sama dengan frontend, bersama `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY`. Email tetap digunakan Supabase Auth untuk verifikasi dan identitas akun; username adalah alias yang dicocokkan di server. Password diverifikasi Supabase dan tidak disimpan di tabel aplikasi. Login username memerlukan Netlify Functions (Netlify Dev atau deploy pengujian); Vite saja hanya mendukung login email. Detail ada di [SETUP.md](SETUP.md#login-menggunakan-username).

## Profil dan pengaturan akun

Buka **Profil** di menu, avatar kanan atas, atau kartu akun sidebar. Label **Premium** mengikuti langganan berbayar aktif; **Trial Premium** mengikuti trial aktif tanpa langganan berbayar. Jika keduanya habis, label menjadi **Pengguna Biasa**. Profil, header, dan sidebar memakai status yang sama. Tanggal akses tetap dikelola server.

Form username menggunakan RPC `set_username` dari migrasi `username.sql`, memperbarui nama akun di tampilan, dan menangani username duplikat. Form password meminta password saat ini, password baru minimal 8 karakter, dan konfirmasi. Password saat ini diverifikasi melalui klien Supabase Auth sementara dengan penyimpanan sesi dimatikan; ID akun harus cocok sebelum memperbarui password. Klien verifikasi sementara dikeluarkan dengan scope lokal tanpa sengaja mengeluarkan sesi utama. Password tidak dicatat di tabel profil, log aplikasi, atau localStorage.

Jika Supabase meminta reautentikasi untuk **Secure password change**, form menampilkan pengiriman kode email dan kolom kode (`nonce`). Pengiriman email harus sudah berfungsi. Kebijakan password Supabase yang lebih ketat tetap berlaku. Pengaturan username/password tersedia untuk pengguna biasa maupun premium, termasuk setelah trial berakhir. Ini bukan alur lupa password; pengguna harus masih login dan mengetahui password saat ini.

Untuk foto profil, jalankan **`supabase/profile-avatars.sql`**. Menu Profil menyediakan Tambah/Ganti foto, pratinjau, Simpan foto, dan Hapus foto. Mendukung JPG/PNG/WebP maksimal 2 MB; browser memotong tengah menjadi 512×512 dan menyimpan JPEG. Foto tampil pada profil, sidebar, header, serta pesan pengguna dalam chat. Foto tidak dikirim ke OpenAI.

Bucket `keuanganmu-avatars` bersifat privat. RLS memisahkan folder per auth.uid(); RPC hanya mengubah avatar akun sendiri tanpa memberikan hak mengubah paid_until/trial. URL bertanda tangan berlaku 1 jam dan diperbarui selama halaman terbuka. Penggantian menautkan foto baru sebelum membersihkan file lama. Jika respons RPC terputus setelah commit, file baru tidak dihapus agar referensi profil tetap valid; unggahan yang belum terpakai dapat tertinggal privat sampai dibersihkan. Akses mengikuti [Supabase Storage RLS](https://supabase.com/docs/guides/storage/security/access-control) dan [signed URLs](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl).

Username/password tetap memakai username.sql dan Supabase Auth. Uji layanan nyata setelah konfigurasi; pengujian otomatis memakai DOM, mock Auth/Storage, serta PostgreSQL lokal untuk RPC/RLS.

## Koleksi tema

Menu **Tema tampilan** menyediakan **20 tema: 4 pastel dan 16 karakter**. Karakter mencakup Hello Kitty, Cinnamoroll, Kuromi, Lotso, My Melody, Pompompurin, Keroppi, Pochacco, **SpongeBob, Golden Pup, Mochi Cat, Ducky Days, Cozy Capybara, Bamboo Panda, Peach Axolotl, dan Snow Penguin**. Galeri dapat difilter, lalu pilihan mengubah palet, grafik, dekorasi, dan avatar asisten. Setiap pesan asisten memiliki avatar karakter tema aktif dan nama asisten; pesan pengguna memakai username dan foto profil.

Dekorasi karakter berupa ilustrasi vektor sederhana yang dibuat di kode, tanpa ketergantungan gambar eksternal. Katalog dan palet ada di `src/themes.mjs`, dekorasi di `src/ThemeCharacter.jsx`, dan galeri di `src/ThemePicker.jsx`. Tema tidak memerlukan migrasi Supabase atau biaya API. Pilihan berlaku di browser tersebut dan belum disinkronkan antar perangkat.

Saat memakai tema karakter, ilustrasinya juga muncul di seluruh halaman: banner sambutan dengan beberapa karakter, motif latar samar, kartu ringkasan, judul panel grafik/transaksi, kartu tabungan, header, langganan, form pencatatan, serta tombol dan avatar chat. Tata letak dekorasi ada di `src/CharacterDecorations.jsx` dan `src/characters.css`. Ukuran disesuaikan untuk ponsel, dekorasi tidak menerima klik dan disembunyikan dari pembaca layar serta hasil cetak. Empat tema pastel tetap tanpa dekorasi karakter tambahan.

## Menjalankan lokal

1. Install Node.js 22 atau lebih baru.
2. Jalankan `npm install` (PowerShell dengan pembatasan script: `npm.cmd install`).
3. Salin `.env.example` menjadi `.env`, isi variabel publik Supabase bila tersedia.
4. Jalankan `npm run dev`. Tanpa konfigurasi, aplikasi berjalan sebagai demo; data demo hanya disimpan di browser.
5. `npm run build` membangun `dist`, `npm test` menguji validasi notifikasi pembayaran.

## Supabase

1. Buat proyek Supabase dan jalankan `supabase/schema.sql` sekali di SQL Editor pada proyek baru.
2. Di Authentication → URL Configuration, atur Site URL ke domain Netlify. Tambahkan domain tersebut dan `http://localhost:5173` ke daftar redirect yang diizinkan.
3. Aktifkan konfirmasi email dan siapkan SMTP untuk email produksi. Pendaftaran memulai trial 7 hari pada server saat akun dibuat.
4. Isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` (publishable/anon key) untuk frontend; jangan pernah menaruh service-role key dalam variabel `VITE_`.

RLS membatasi setiap pengguna ke data sendiri. Pengguna trial/lunas dapat menulis, sedangkan akun kedaluwarsa dapat membaca/mengekspor data lama. Tanggal trial dan langganan serta pesanan hanya dapat diubah server. Setoran tabungan adalah progres target terpisah, bukan transaksi pengeluaran dan tidak mengurangi saldo secara otomatis. Saldo dashboard adalah selisih pemasukan dan pengeluaran pada bulan terpilih, bukan saldo rekening bank.

## Netlify & Midtrans

1. Push proyek ke repositori Git, lalu import repositori di Netlify. Konfigurasi build sudah tersedia di `netlify.toml`.
2. Atur environment variables di dashboard Netlify:
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` untuk build.
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `MIDTRANS_SERVER_KEY`, `MIDTRANS_IS_PRODUCTION=false` untuk Functions.
   - `URL` disediakan Netlify secara otomatis; digunakan sebagai URL kembali setelah pembayaran.
3. Redeploy sesudah mengubah environment variables.
4. Di dashboard Midtrans Sandbox → Settings → Configuration, atur Payment Notification URL ke `https://DOMAIN-ANDA.netlify.app/.netlify/functions/midtrans-webhook`.
5. Daftar akun, konfirmasi email, masuk, pilih Langganan. Pembayaran membuka hosted Snap Midtrans. Client key tidak diperlukan karena menggunakan redirect Snap.
6. Uji pembayaran Sandbox setiap paket sampai settlement dan kirim ulang notifikasi yang sama. Pastikan paid_until bertambah sesuai paket tepat sekali. Uji pula akun Premium aktif untuk memastikan sisa masa aktif tetap terhitung. Klik “Perbarui status pembayaran” atau muat ulang setelah kembali dari Midtrans.
7. Untuk produksi, gunakan server key produksi, ubah `MIDTRANS_IS_PRODUCTION=true`, dan atur webhook pada dashboard produksi. Uji ulang sebelum menerima pelanggan.

Pilihan harga mengikuti katalog pada bagian paket Premium. Jika mengubahnya, selaraskan `src/subscription-plans.mjs` dan constraint paket dalam SQL sambil mempertahankan kompatibilitas pesanan yang belum selesai. Detail request pembayaran mengikuti [objek Snap Midtrans](https://docs.midtrans.com/reference/json-objects); verifikasi akhir menggunakan [Get Transaction Status](https://docs.midtrans.com/reference/get-transaction-status). Aktivasi memakai transaksi database dan kunci baris untuk mencegah duplikasi.

## Batas verifikasi

Build dan unit test dapat dijalankan tanpa akun layanan. Auth, RLS, email, pembayaran Sandbox, dan deployment harus diuji dengan proyek Supabase, akun Midtrans, serta akun Netlify yang sudah dikonfigurasi. Belum mencakup pembatalan/refund otomatis, billing admin, atau reset kata sandi melalui email.

## Asisten keuangan & nota

Percakapan dasar dijawab otomatis di browser tanpa panggilan atau kuota API AI: “halo”, “hai Muchi”, “selamat pagi”, “apa kabar?”, “terima kasih”, “siapa namamu?”, “apa yang bisa kamu bantu?”, “oke”, dan “sampai jumpa”, beserta padanan English. Jawaban mengikuti bahasa tampilan, username, dan nama asisten terbaru. Sebelum diberi nama, asisten menjawab sapaan lalu mengingatkan pengguna untuk memilih nama; sapaan tidak disimpan sebagai nama asisten. Percakapan dasar tidak membuat transaksi, nota, atau mengubah draf tabungan. Fitur ini mengikuti akses asisten Premium/trial dan tidak memerlukan konfigurasi atau migrasi SQL tambahan.

Asisten dibuka melalui karakter di kanan atas bagian judul halaman. Bubble “Aku bisa bantu kamu” berada di atas karakter; karakter mengikuti tema aktif, sedangkan tema pastel memakai robot netral. Karakter memiliki animasi gerakan ringan dan melambaikan tangan; mode pengurangan gerakan perangkat menonaktifkan animasi. Klik karakter untuk membuka panel chat di bagian atas, terpisah dari badge hosting kanan bawah. Tombol Escape menutup panel dan mengembalikan fokus ke karakter. Akun nonpremium membuka informasi upgrade, sementara fungsi asisten tetap hanya untuk pelanggan premium. Perubahan ini tidak menghapus badge milik penyedia hosting.

Asisten mengambang memakai ilustrasi tubuh khusus untuk masing-masing dari 16 karakter di `src/CompanionCharacter.jsx`. Kepala dan tubuh berada dalam satu SVG: SpongeBob dengan celana kotak, dasi, kaus kaki dan sepatu; Hello Kitty dengan overall; Kuromi dengan tubuh hitam dan ekor; Cinnamoroll dengan tubuh putih dan ekor melingkar; serta anjing/kucing dengan kaki dan ekor, bebek dengan sayap/kaki berselaput, dan bentuk khas karakter lainnya. Wajah menggunakan gambar tema yang sama dengan avatar chat. Animasi bergerak bersama, dengan gerakan tambahan pada tangan, sayap, atau ekor; tema pastel memiliki robot utuh. Tidak memerlukan migrasi SQL atau gambar dari server lain.

Jalankan `supabase/assistant.sql` di SQL Editor setelah `schema.sql`, untuk proyek baru maupun yang sudah ada. Migrasi ini boleh dijalankan ulang. Nama asisten disimpan per akun dalam tabel `assistant_preferences` dengan RLS; akses asisten memerlukan trial Premium atau langganan aktif setelah premium.sql/trial-premium.sql diterapkan. Tanpa migrasi, chat akun menampilkan pemberitahuan konfigurasi dan tidak menerima perintah. Demo pencatatan manual dapat digunakan tanpa Supabase; asisten tersedia untuk trial Premium dan langganan aktif.

Klik tombol chat di kanan bawah:

1. Asisten bertanya ingin diberi nama apa. Jawab “aku akan memanggil kamu sebagai Muchi”, atau cukup “Muchi”. Nama bisa diganti melalui tombol pengaturan chat.
2. Ketik “tambahkan pengeluaran untuk membeli kopi 5000” atau “catat pemasukan gaji 5 juta”. Transaksi otomatis disimpan, jenis dan kategori ditentukan, ringkasan diperbarui, lalu chat menyediakan nota. Pemasukan gaji dikategorikan Gaji, proyek/freelance sebagai Freelance, dan pemasukan lainnya sebagai Lainnya.
3. Format nominal yang didukung: `5000`, `Rp5.000`, `5rb`, `5 ribu`, `1,5 juta`. Satu pesan mencatat satu transaksi untuk hari ini sesuai tanggal perangkat. Pesan ambigu, nominal kosong/negatif, tanggal lain, dan beberapa nominal ditolak. Gunakan formulir untuk pencatatan tanggal lain.
4. Klik nota di chat atau kolom Nota pada tabel transaksi. Pilih “Cetak / Simpan PDF”, lalu pilih tujuan PDF di dialog cetak browser. Nota memiliki nomor dari ID transaksi, nama, tanggal, kategori, dan nominal. Ini adalah nota pencatatan pribadi, bukan kuitansi resmi penjual.

Asisten premium menggunakan parser lokal untuk perintah dasar tanpa biaya API. Mode AI lanjutan opsional memakai OpenAI untuk pesan yang belum dipahami; lihat konfigurasi di bawah. Riwayat chat (maksimal 60 pesan tersimpan) hanya ada di browser, dipisahkan per ID akun/demo; tidak disinkronkan antar perangkat. Nama akun disimpan di Supabase, sedangkan nama demo hanya di browser. Nota di chat adalah snapshot saat pencatatan; catatan yang dihapus tetap bisa terlihat dalam riwayat chat lama. Pada mode lokal, chat tidak dikirim ke penyedia AI. Jika AI lanjutan diaktifkan, pesan yang belum dipahami dan memori kategori dikirim ke OpenAI, tanpa daftar transaksi atau riwayat chat. Pemeriksaan izin database tetap berlaku untuk transaksi dari chat. Pengiriman ganda saat proses berjalan dicegah; pengulangan pesan yang sama setelah kegagalan respons memakai ID transaksi yang sama selama sesi chat agar tidak tercatat dua kali.

Pemeriksaan manual setelah konfigurasi: beri nama asisten, muat ulang dan periksa nama; catat kopi Rp5.000 dan cocokkan tabel/grafik/nota; cetak PDF; masuk sebagai akun lain dan pastikan nama serta riwayat terpisah; coba akun kedaluwarsa dan pastikan penulisan ditolak. Pengujian otomatis mencakup parser nama/nominal, kategori, serta penolakan perintah ambigu. Alur browser dan penyimpanan Supabase masih perlu pengujian dengan akun layanan.

### Pertanyaan saldo dan periode

Contoh pesan ke asisten:

- “Berapa saldo saat ini?” — seluruh pemasukan dikurangi pengeluaran sampai tanggal hari ini, termasuk catatan sebelum bulan berjalan, tanpa transaksi bertanggal masa depan.
- “Total pemasukan saat ini” atau “total pengeluaran” — default bulan berjalan; periode selalu ditampilkan dalam jawaban.
- “Total pemasukan hari ini”, “total pengeluaran kemarin”, “ringkasan minggu lalu”. Minggu dihitung Senin–Minggu.
- “Total pemasukan bulan lalu”, “total pengeluaran tahun ini”, “total pengeluaran November 2026”. Nama bulan tanpa tahun memakai tahun berjalan.
- “Total pemasukan 2026-11-01 sampai 2026-11-15” — kedua batas tanggal termasuk perhitungan. Tanggal tunggal format ISO juga didukung.
- “Ringkasan semua transaksi” — pemasukan, pengeluaran, dan saldo seluruh catatan sampai hari ini.

Saldo adalah saldo **tercatat**, bukan saldo bank, dan tidak memasukkan progres target tabungan. Jika periode tertentu disebutkan untuk saldo/ringkasan, jawaban memakai istilah **selisih periode**, bukan saldo akumulatif. Periode kalender eksplisit mencakup seluruh hari dalam rentang yang ditampilkan. Periode yang belum didukung (misalnya “7 hari terakhir”) diminta untuk ditulis ulang; tidak ditebak. Pertanyaan tidak membuat transaksi atau nota.

Mode akun mengambil ulang data milik pengguna dari Supabase untuk tiap pertanyaan dan membaca secara bertahap agar tidak berhenti pada batas 1.000 baris default. Asisten tersedia selama trial Premium atau langganan aktif; mode demo tanpa akun tetap terkunci. Memori kategori dan AI lanjutan memerlukan learning.sql dan pemeriksaan akses/kuota terbaru. Pengujian otomatis mencakup pemasukan, rentang inklusif, batas tahun, Februari kabisat, saldo negatif, dan periode tanpa data; koneksi layanan nyata tetap diuji setelah konfigurasi akun.

### Pembelajaran pribadi, komunitas, dan OpenAI

1. Jalankan `supabase/learning.sql` setelah `schema.sql` dan `assistant.sql`. Jalankan juga `supabase/review-learning.sql` untuk fungsi publikasi admin. Keduanya dapat dijalankan ulang.
2. Atur `OPENAI_API_KEY` dan `OPENAI_MODEL=gpt-5-mini` di environment **Functions** Netlify, lalu redeploy. Jangan gunakan awalan `VITE_` untuk API key. Model dipilih sebagai titik awal untuk tugas terstruktur; bisa diganti dengan model Responses API yang kompatibel. Implementasi mengikuti [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) dan [GPT-5 mini](https://developers.openai.com/api/docs/models/gpt-5-mini).
3. Di chat, buka **Memori & AI lanjutan**, lalu aktifkan OpenAI. Perintah yang dipahami parser tetap lokal. Pesan lainnya dikirim melalui Netlify Function, memakai `store:false`, tanpa mengirim tabel transaksi, nominal historis, tanggal transaksi historis, atau seluruh riwayat chat. Pesan yang diketik pengguna sendiri dapat mengandung nominal/data pribadi; UI menjelaskan pengiriman ini sebelum fitur diaktifkan.
4. Untuk melatih kategori, catat transaksi lalu klik **Perbaiki kategori & ajari asisten**. Misalnya koreksi Ongkir menjadi Transportasi. Transaksi Ongkir berikutnya memakai kategori tersebut. Memori berupa pasangan nama transaksi + jenis yang cocok persis setelah huruf kecil/spasi dinormalisasi; bukan pencocokan semua sinonim. Preferensi pribadi mengalahkan pengetahuan bersama. Koreksi memperbarui catatan dan menyimpan memori dalam satu transaksi SQL; pengguna hanya dapat mengoreksi catatan sendiri.
5. Untuk membantu pengguna lain, centang pengajuan pembelajaran bersama dan tulis **istilah umum** terpisah. Hanya istilah, jenis, kategori dan ID akun internal disimpan untuk admin; tidak menyertakan chat, nominal, atau tanggal transaksi. Ini pseudonim, bukan anonimisasi penuh. Saran tidak langsung diterbitkan. Pengguna dapat menghapus memori dan saran sendiri dari panel chat. Aturan umum yang sudah diterbitkan tidak otomatis ditarik saat saran sumber dihapus.
6. Admin meninjau agregat dengan query contoh dalam `review-learning.sql`: cek salah kategori dan data pribadi, lalu panggil `publish_assistant_knowledge`. Publikasi memerlukan setidaknya **5 akun berbeda** dan **80% kesepakatan** kategori, selain tinjauan manusia. Jumlah akun bukan jaminan identitas unik; tinjauan admin tetap diperlukan. Fungsi ini hanya dapat dijalankan service-role/SQL Editor, bukan oleh pengguna biasa. Nomor versi bertambah saat aturan direvisi. Hapus baris pengetahuan untuk rollback. Klien memuat pengetahuan bersama saat chat dimuat; muat ulang untuk versi terbaru.
7. Hasil AI untuk transaksi ditampilkan sebagai usulan untuk diperiksa sebelum tombol Simpan ditekan. Saldo/ringkasan dihitung aplikasi dari database; model hanya menentukan maksud dan rentang tanggal. Respons API dibatasi skema dan validasi jumlah, jenis, kategori, tanggal; penolakan atau output tidak lengkap tidak membuat catatan.

**Cara sistem bertambah pintar:** koreksi pribadi langsung menjadi memori; saran banyak pengguna yang telah ditinjau menjadi pengetahuan bersama dan konteks API. Ini pembelajaran melalui memori/konteks, **bukan pelatihan ulang bobot model atau fine-tuning otomatis**. Sistem tidak otomatis lebih akurat hanya karena jumlah chat bertambah. Kemampuan percakapan bebas juga dibatasi satu pesan saat ini, tanpa riwayat percakapan penuh. Pelatihan bobot model berikutnya membutuhkan dataset berizin, evaluasi, dan proses terpisah yang belum diimplementasikan.

**Batas biaya:** 50 permintaan AI per akun per hari kalender UTC, disimpan atomik di database agar berlaku di semua instance Functions. Percobaan yang mencapai API namun gagal tetap menggunakan kuota. Parser lokal tidak memakai kuota. Batas ini bukan batas total tagihan semua akun; atur juga anggaran/pemantauan pada proyek OpenAI dan pantau jumlah pelanggan. API key, saldo API, dan akses model perlu disediakan pemilik proyek. `npm run dev` hanya menjalankan frontend; untuk menguji endpoint lokal gunakan Netlify Dev atau deploy preview Netlify dengan environment Functions yang sesuai.

**Verifikasi:** unit test memakai mock API (tidak menagih pemakaian) untuk memeriksa memori, prioritas pribadi, validasi output, isolasi data, kuota, dan penolakan model. Sebelum produksi uji migrasi/RLS dengan dua akun, koreksi dan muat ulang, penolakan akun kedaluwarsa, saran tanpa opt-in, publikasi lima akun, serta panggilan OpenAI nyata. Pengujian browser, migrasi SQL langsung dan API nyata belum dijalankan tanpa kredensial layanan.
