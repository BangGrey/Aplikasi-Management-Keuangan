# Panduan konfigurasi sebelum deploy

Ikuti tahap sesuai urutan. Panduan ini tidak menjalankan deploy atau mengubah akun layanan secara otomatis. Nama menu dashboard bisa sedikit berbeda.

Pilihan bahasa tersedia di **ID / EN** pada kanan atas dan **Profil → Bahasa tampilan**. Bahasa tersimpan di browser; fitur ini tidak memerlukan konfigurasi layanan atau SQL tambahan.

## 1. Buat proyek Supabase

1. Masuk ke https://supabase.com/dashboard dan pilih New project.
2. Pilih organisasi, isi nama proyek (contoh: kantong), buat password database yang kuat dan simpan pribadi.
3. Pilih region dekat pengguna Indonesia, misalnya Singapore jika tersedia. Tunggu provisioning selesai.
4. Buka SQL Editor → New query. Buka file SQL lokal, salin seluruh isinya, paste ke editor, lalu Run.
5. Jalankan file **satu per satu**, tunggu sukses sebelum lanjut:

| Urutan | File | Kegunaan |
|---|---|---|
| 1 | `supabase/schema.sql` | Akun/trial, transaksi, tabungan, pesanan, kebijakan akses |
| 2 | `supabase/assistant.sql` | Nama asisten |
| 3 | `supabase/learning.sql` | Memori, saran, pengetahuan bersama, kuota AI |
| 4 | `supabase/review-learning.sql` | Publikasi pengetahuan oleh admin |
| 5 | `supabase/username.sql` | Username unik, login tambahan, pembatasan percobaan login |
| 6 | `supabase/premium.sql` | Pemeriksaan akses asisten, karakter, dan kuota Premium |
| 7 | `supabase/gold.sql` | Tabungan gram, cache harga, dan riwayat emas |
| 8 | `supabase/gold-reductions.sql` | Pengurangan gram terjual dan catatan pengurangan |
| 9 | `supabase/assistant-savings.sql` | Setoran ke target tabungan melalui asisten Premium, aman untuk retry |
| 10 | `supabase/assistant-goals.sql` | Membuat target beserta saldo awal melalui percakapan asisten Premium |
| 11 | `supabase/subscription-plans.sql` | Paket 30 hari/3 bulan/6 bulan/1 tahun dan perpanjangan tanpa menghapus sisa masa aktif |
| 12 | `supabase/trial-premium.sql` | Semua fitur Premium selama trial aktif, tanpa mereset tanggal trial |
| 13 | `supabase/profile-avatars.sql` | Bucket privat, RLS, dan pengaturan foto profil |

`schema.sql` untuk proyek baru dan **tidak boleh diulang sembarangan**. Jika muncul `already exists`, hentikan, simpan pesan error, dan periksa bagian yang sudah dibuat. File 2–13 dirancang bisa dijalankan ulang. Jangan menghapus tabel untuk mencoba memperbaiki error. Jika migrasi sebelumnya sudah sukses, cukup jalankan file baru yang belum diterapkan. **Jalankan premium.sql setelah assistant.sql/learning.sql**; jika mengulang keduanya, terapkan premium.sql dan trial-premium.sql lagi agar aturan akses dan kuota konsisten. gold.sql dan assistant-savings.sql boleh dijalankan setelah premium.sql.

6. Buka Table Editor, pastikan ada 16 tabel di schema public: `profiles`, `transactions`, `goals`, `orders`, `assistant_preferences`, `assistant_memories`, `assistant_suggestions`, `assistant_knowledge`, `assistant_usage`, `login_attempts`, `gold_holdings`, `gold_quotes`, `gold_quote_history`, `gold_reductions`, `assistant_goal_deposits`, `assistant_goal_creations`. Tabel `profiles` juga memiliki kolom `username` dan `avatar_path`. Migrasi profile-avatars.sql membuat bucket privat `keuanganmu-avatars` di Storage. Jalankan gold-reductions.sql setelah gold.sql; assistant-savings.sql dan assistant-goals.sql memerlukan premium.sql. Untuk proyek yang sudah terpasang, cukup jalankan migrasi baru yang belum diterapkan.
7. Di SQL Editor, jalankan pemeriksaan baca ini. Semua tabel tersebut harus menunjukkan `rls_enabled = true`:

```sql
select tablename, rowsecurity as rls_enabled
from pg_tables
where schemaname = 'public'
order by tablename;
```

## 2. Auth dan email Supabase

1. Buka Authentication, cari konfigurasi provider/sign-in, aktifkan Email dan pendaftaran pengguna. Gunakan email + password, sesuai aplikasi saat ini.
2. Aktifkan Confirm email.
3. Di Authentication → URL Configuration, sementara isi Site URL `http://localhost:5173`. Tambahkan `http://localhost:5173` dan `http://localhost:5173/**` ke Redirect URLs. Jika server berjalan pada port lain, tambahkan URL port tersebut juga.
4. Atur SMTP di pengaturan email Authentication: sender email, sender name (misalnya Tabunganmu), host, port, username, dan password dari penyedia SMTP Anda. Ikuti pengaturan dan verifikasi domain milik penyedia; jangan menebak nilainya.
5. Email bawaan Supabase membatasi penerima ke email anggota tim proyek dan tidak cocok untuk pendaftaran publik. Untuk tes awal tanpa SMTP, gunakan alamat email anggota organisasi Supabase. Sebelum menerima pengguna lain, pastikan SMTP sudah berfungsi.
6. Setelah domain Netlify tersedia nanti, ubah Site URL ke URL HTTPS tersebut dan tambahkan URL domain itu beserta `/**` ke Redirect URLs. Pertahankan localhost untuk pengembangan bila masih diperlukan.

Referensi: [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

### Jika email konfirmasi membuka localhost atau muncul otp_expired

Untuk website produksi saat ini, buka **Authentication → URL Configuration** di proyek Supabase yang digunakan Netlify:

- **Site URL**: `https://ruangkeuanganmu.netlify.app`
- **Redirect URLs**: tambahkan `https://ruangkeuanganmu.netlify.app` dan `https://ruangkeuanganmu.netlify.app/`, lalu simpan. Kedua bentuk ini mencakup origin yang dikirim aplikasi dan alamat root website. Jika memakai domain sendiri nanti, ganti/tambahkan domain tersebut juga.
- Localhost boleh tetap menjadi redirect tambahan untuk pengembangan; Site URL produksi harus domain publik.

Pendaftaran dan pengiriman ulang menggunakan `emailRedirectTo` dari origin website yang dibuka. Jika pengalihan yang diminta tidak ada dalam allowlist, Supabase dapat memakai Site URL. Jika template email pernah diubah, periksa **Authentication → Email Templates → Confirm signup**: tautan konfirmasi harus memuat verifikasi, misalnya `<a href="{{ .ConfirmationURL }}">Konfirmasi email</a>`. Tautan yang hanya menuju Site URL tidak memverifikasi akun.

Setelah menyimpan konfigurasi, buka website Netlify → **Masuk → Belum menerima email konfirmasi?**, masukkan email pendaftaran, lalu tekan **Kirim ulang konfirmasi**. Buka tautan dari email terbaru. Tautan yang tidak valid, kedaluwarsa, atau telah dipakai tidak menjadi valid hanya dengan mengganti alamat localhost di browser. Jika akun sudah dikonfirmasi, cukup masuk dengan email/username dan password. Mengubah Site URL/Redirect URLs tidak memerlukan migrasi SQL atau deploy; tombol pengiriman ulang tersedia setelah kode aplikasi terbaru di-deploy.

Jika tautan baru langsung kedaluwarsa sebelum dipakai, periksa Auth Logs, pengaturan masa berlaku email OTP, dan kemungkinan pemindai keamanan email yang membuka tautan lebih dahulu. Referensi: [Email templates dan email prefetching](https://supabase.com/docs/guides/auth/auth-email-templates), [resend](https://supabase.com/docs/reference/javascript/auth-resend), [Auth error codes](https://supabase.com/docs/guides/auth/debugging/error-codes).

## 3. Ambil URL dan kunci Supabase

Cari **Connect** / Project Settings → Data API untuk Project URL, serta Project Settings → API Keys untuk kunci. Project URL berbentuk `https://PROJECT-ID.supabase.co`, bukan URL halaman dashboard dan bukan connection string Postgres.

| Nilai Supabase | Nama variabel aplikasi | Penggunaan |
|---|---|---|
| Project URL | `VITE_SUPABASE_URL`, `SUPABASE_URL` | Isi URL sama di kedua variabel |
| Publishable key (`sb_publishable_...`) atau legacy `anon` | `VITE_SUPABASE_ANON_KEY`, `SUPABASE_ANON_KEY` | Nilai sama; frontend dan klien Auth server untuk login username |
| Secret key (`sb_secret_...`) atau legacy `service_role` | `SUPABASE_SERVICE_ROLE_KEY` | Server saja; nama variabel tetap meskipun memakai secret key |

Password database bukan API key. Secret/service-role key tidak boleh dimasukkan ke variabel `VITE_`, chat, screenshot, atau repositori. Referensi: [API keys Supabase](https://supabase.com/docs/guides/getting-started/api-keys).

## 4. Sambungkan frontend lokal

Di terminal PowerShell proyek, buat `.env` jika belum ada tanpa menimpa file lama:

```powershell
if (!(Test-Path -LiteralPath '.env')) {
    Copy-Item -LiteralPath '.env.example' -Destination '.env'
}
```

Buka `.env` di editor, isi dulu dua nilai ini:

```dotenv
VITE_SUPABASE_URL=https://PROJECT-ID.supabase.co
VITE_SUPABASE_ANON_KEY=ISI_PUBLISHABLE_ATAU_ANON_KEY
```

Simpan, kemudian jalankan:

```powershell
npm.cmd install
npm.cmd run dev
```

Buka URL yang tercetak di terminal. Restart server setelah mengubah `.env`.

Tes: daftar → konfirmasi email → masuk → catat pemasukan dan pengeluaran secara manual → muat ulang. Pastikan data tetap ada. Di Supabase, akun harus muncul di Authentication → Users, sedangkan `profiles` otomatis berisi trial 7 hari. Data demo browser tidak otomatis dipindahkan ke akun. Uji akun kedua di browser/profil terpisah dan pastikan tidak melihat transaksi akun pertama. Akun trial aktif harus dapat memilih semua tema karakter dan memakai asisten. Setelah trial serta langganan habis, tema kembali ke pastel dan asisten terkunci.

## 5. Midtrans Sandbox

1. Buat/masuk akun https://dashboard.midtrans.com dan pilih mode **Sandbox**.
2. Buka Settings → Access Keys, salin Server Key Sandbox ke tempat pribadi. Kode menggunakan hosted Snap redirect sehingga tidak membutuhkan Client Key.
3. Siapkan nilai server:

```dotenv
MIDTRANS_SERVER_KEY=ISI_SERVER_KEY_SANDBOX
MIDTRANS_SIGNATURE_SECRET_KEY=ISI_SIGNATURE_SECRET_KEY_SANDBOX
MIDTRANS_IS_PRODUCTION=false
```

4. Payment Notification URL baru dapat diverifikasi setelah ada endpoint publik yang berjalan. Siapkan alamat berikut untuk nanti, jangan menganggap webhook sudah aktif hanya karena kolom dashboard terisi:

```text
https://DOMAIN-ANDA.netlify.app/.netlify/functions/midtrans-webhook
```

5. Nanti isi alamat tersebut di Settings → Configuration → Payment Notification URL pada mode Sandbox. Finish Redirect URL adalah beranda domain aplikasi, berbeda dari webhook.
6. Pengujian lokal `npm run dev` tidak menjalankan Netlify Functions. Pengujian lengkap sebelum produksi dapat dilakukan lewat Netlify Dev + tunnel HTTPS publik yang sesuai atau deployment pengujian Netlify. Midtrans tidak dapat menghubungi `localhost` komputer Anda.
7. Jalankan `supabase/subscription-plans.sql` sebelum deploy checkout baru. Paket tersedia: 30 hari Rp29.000, 3 bulan Rp60.000, 6 bulan Rp150.000, dan 1 tahun Rp299.000. Durasi 3/6/12 bulan mengikuti bulan kalender. Pesanan lama tetap berlaku sebagai 30 hari.
8. Tetap gunakan Sandbox sampai alur pembayaran dan aktivasi sudah teruji. Uji setiap paket hingga settlement, kirim ulang notifikasi yang sama, dan pastikan durasi hanya ditambahkan sekali. Untuk akun Premium, pastikan halaman Langganan menampilkan **Perpanjang**, dan tanggal akhirnya bertambah dari masa aktif yang ada. Akun kedaluwarsa dimulai dari waktu aktivasi pembayaran.

Referensi: [Dashboard Midtrans](https://docs.midtrans.com/docs/dashboard-basics), [webhook](https://docs.midtrans.com/docs/https-notification-webhooks).

### Uji pembelian Premium di Sandbox pada website Netlify

Pembayaran uji yang telah diverifikasi mengaktifkan Premium pada akun Supabase yang melakukan checkout, sesuai durasi paket. Transaksinya tetap transaksi **Sandbox tanpa perpindahan uang nyata**. Sandbox menjadi mode bawaan jika `MIDTRANS_IS_PRODUCTION` belum diisi; agar pasti, isi eksplisit `false`.

1. Buka dashboard Midtrans, pilih **Sandbox** pada pilihan environment. Buka **Settings → Access Keys**, salin **Server Key** dan **Signature Secret Key**. Untuk Server Key baru, pilih **Snap Checkout: Write**, **Core API: Read**, serta produk/capability lain **None**. Client Key tidak dibutuhkan untuk hosted Snap redirect yang dipakai aplikasi. Server Key baru dapat memiliki format berbeda dari kunci lama; environment dipilih lewat pengaturan Sandbox/Production, bukan ditentukan dari awalan key.
2. Di **Netlify → Project configuration → Environment variables**, pasang `MIDTRANS_SERVER_KEY` menggunakan Server Key tersebut, `MIDTRANS_SIGNATURE_SECRET_KEY` menggunakan Signature Secret Key, dan `MIDTRANS_IS_PRODUCTION=false`. Semua harus tersedia pada scope **Functions** (atau **All scopes**) dan konteks **Production** Netlify karena domain utama merupakan production deploy Netlify walaupun Midtrans memakai Sandbox. Jika tidak membedakan konteks, gunakan nilai sama untuk semua deploy contexts. Pastikan `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` juga terpasang pada Functions. Simpan kunci langsung di dashboard, tidak di GitHub atau variabel `VITE_`.
3. Redeploy Netlify agar Functions memakai nilai terbaru. Setelah Published, buka `https://ruangkeuanganmu.netlify.app/.netlify/functions/payment-config`. Pastikan `environment` bernilai `sandbox`, `ready` dan `serverKeyConfigured` bernilai `true`, serta `signatureSecretConfigured` bernilai `true`. Jika `configurationIssue` bernilai `missing_server_key`, Function belum menerima nilai `MIDTRANS_SERVER_KEY`: periksa nama variabel, scope, konteks Production, dan apakah sudah redeploy. `ready` hanya memeriksa keberadaan kunci; validitas dan izin kredensial sesungguhnya diperiksa Midtrans saat API dipanggil. Endpoint ini tidak mengembalikan isi, awalan, atau panjang kunci.
4. Di dashboard Midtrans mode Sandbox, isi **Payment Notification URL**: `https://ruangkeuanganmu.netlify.app/.netlify/functions/midtrans-webhook`. Isi **Finish Redirect URL**: `https://ruangkeuanganmu.netlify.app/langganan`. Checkout baru juga memasang `X-Override-Notification` menuju webhook domain Netlify dan finish callback menuju halaman Langganan dengan identitas pesanan.
5. Masuk ke **akun pengguna** di website, buka **Langganan**, pastikan tampil **Mode Sandbox · pembayaran uji**, pilih paket, lalu klik Berlangganan/Perpanjang. Halaman pembayaran harus berada di `app.sandbox.midtrans.com`.
6. Untuk pengujian sederhana, pilih transfer bank Virtual Account yang tersedia, catat bank dan nomor VA yang ditampilkan, lalu buka [simulator Sandbox resmi](https://simulator.sandbox.midtrans.com/). Pilih simulator yang sesuai dan simulasikan pembayaran berhasil. Ikuti [panduan pengujian Midtrans](https://docs.midtrans.com/docs/testing-payment-on-sandbox) untuk metode lain; tidak perlu transfer uang sungguhan.
7. Kembali ke website melalui tombol kembali ke merchant pada halaman pembayaran. Halaman Langganan memeriksa status ke server dan melakukan beberapa pemeriksaan ulang untuk status menunggu. Tombol **Periksa pembayaran** dapat dipakai jika notifikasi terlambat atau jendela pembayaran sudah ditutup. Server hanya membaca pesanan milik pengguna tersebut, meminta status terbaru ke Midtrans, lalu memanggil `activate_subscription` setelah status/nominal/mata uang sesuai. Parameter status dari browser tidak bisa mengaktifkan Premium.
8. Pastikan muncul pesan pembayaran terverifikasi, tombol menjadi **Perpanjang**, dan akun mendapat akses Premium. Di Supabase, `orders.status` berubah menjadi `paid`, `paid_at` terisi, dan `profiles.paid_until` bertambah. Pesanan baru Sandbox memakai awalan `KT-SB-`; Production memakai `KT-LIVE-`. Kirim ulang webhook atau periksa ulang pesanan yang sama tidak menambah durasi lagi.

Jika gagal membuat checkout: periksa Server Key dan environment, Functions log, serta apakah `supabase/subscription-plans.sql` sudah diterapkan. Jika simulasi sudah berhasil tetapi Premium belum aktif: periksa transaksi dan Notification Log Midtrans, lalu gunakan Periksa pembayaran. Tidak perlu migrasi SQL baru untuk perubahan alur Sandbox ini jika subscription-plans.sql sebelumnya sudah berhasil dijalankan. Jangan berganti environment sebelum menyelesaikan transaksi uji yang tertunda; server menolak verifikasi pesanan baru pada environment yang berbeda.

Pengujian otomatis mencakup checkout Sandbox → status menunggu → settlement terverifikasi → aktivasi nyata pada PostgreSQL lokal → webhook terlambat/duplikat tanpa penambahan durasi ganda. Kredensial dan pengujian transaksi Midtrans online tetap harus dijalankan di akun merchant setelah environment dikonfigurasi. Untuk produksi nanti, gunakan Server Key dan Signature Secret Key dari mode Production, set `MIDTRANS_IS_PRODUCTION=true`, periksa notification URL pada dashboard Production, lalu redeploy.

Sejak perubahan Access Keys Midtrans pada 28 Oktober 2026, **Server Key** digunakan untuk otorisasi API, sedangkan **Signature Secret Key** digunakan untuk verifikasi tanda tangan webhook. Handler memakai `MIDTRANS_SIGNATURE_SECRET_KEY` jika diisi. Fallback ke Server Key dipertahankan hanya saat secret terpisah belum diisi agar integrasi lama (yang kedua nilainya sama) tetap berjalan. Untuk Server Key hasil Generate baru, isi secret terpisah tersebut. Jangan mengganti Signature Secret Key dengan nilai `signature_key` dari payload transaksi. Referensi: [Access Keys Midtrans](https://docs.midtrans.com/docs/access-keys).

## 6. OpenAI

1. Masuk https://platform.openai.com, pilih/buat project untuk aplikasi.
2. Atur billing/kredit API yang diperlukan dan akses model. Pantau penggunaan dan atur anggaran/notifikasi; jangan menganggap notifikasi anggaran sebagai pemutus tagihan otomatis.
3. Buat project API key di bagian API Keys, simpan pribadi.
4. Siapkan variabel server:

```dotenv
OPENAI_API_KEY=ISI_API_KEY
OPENAI_MODEL=gpt-5-mini
```

5. Jangan gunakan `VITE_OPENAI_API_KEY`. Di aplikasi nanti, masuk dengan trial Premium atau langganan aktif → buka chat → Memori & AI lanjutan → aktifkan OpenAI. Pesan sederhana tetap lokal; pesan yang belum dipahami memakai API. Kuota aplikasi 50 request/hari/akun premium bukan batas total biaya semua pengguna. Trial aktif mendapat seluruh fitur asisten dan kuota yang sama. Akun tanpa trial/langganan aktif dan demo tetap terkunci.
6. Uji panggilan nyata lewat Netlify Functions, bukan Vite saja. Tidak perlu mengirim API key melalui chat.

Referensi: [OpenAI quickstart](https://developers.openai.com/api/docs/quickstart).

## 7. Persiapan Netlify — belum deploy

Simpan source ke repositori Git. `.env` sudah diabaikan `.gitignore`; pastikan tidak ikut commit. File contoh `.env.example` boleh masuk Git karena tidak berisi kunci asli.

Konfigurasi proyek sudah ada di `netlify.toml`:

| Pengaturan | Nilai |
|---|---|
| Base directory | Root proyek, kecuali repo Anda menaruh aplikasi dalam subfolder |
| Build command | `npm run build` |
| Publish directory | `dist` |
| Functions directory | `netlify/functions` |
| Node.js | `22` |

Siapkan variabel berikut di Netlify saat membuat/import project. Jika tersedia pemilihan scope, gunakan pembagian berikut; jika tidak, pastikan nilai tersedia pada konteks build/runtime yang diperlukan.

| Variabel | Isi | Scope |
|---|---|---|
| `VITE_SUPABASE_URL` | Project URL Supabase | Builds |
| `VITE_SUPABASE_ANON_KEY` | Publishable/anon key | Builds; nilai publik |
| `SUPABASE_URL` | Project URL yang sama | Functions |
| `SUPABASE_ANON_KEY` | Publishable/anon key yang sama dengan frontend | Functions; nilai publik |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret/service-role key | Functions; rahasia |
| `MIDTRANS_SERVER_KEY` | Server key Sandbox | Functions; rahasia |
| `MIDTRANS_SIGNATURE_SECRET_KEY` | Signature Secret Key dari Access Keys Sandbox | Functions; rahasia |
| `MIDTRANS_IS_PRODUCTION` | `false` | Functions |
| `OPENAI_API_KEY` | Project API key | Functions; rahasia |
| `OPENAI_MODEL` | `gpt-5-mini` | Functions |

`URL` disediakan otomatis oleh Netlify, jadi tidak perlu menebak/mengisinya sekarang. Aplikasi memakai nilai itu untuk URL kembali pembayaran. Jangan menandai publishable/anon key sebagai secret bila dashboard meminta klasifikasi: nilai frontend memang masuk bundle; perlindungan data dijalankan melalui RLS. Perubahan environment memerlukan build/deploy baru agar diterapkan.

Referensi: [Environment Netlify](https://docs.netlify.com/build/environment-variables/overview/).

## 8. Titik pemeriksaan sebelum lanjut

- Seluruh migrasi yang diperlukan sukses: trial-premium.sql setelah premium.sql, profile-avatars.sql membuat bucket privat, dan 16 tabel public memiliki RLS aktif.
- Daftar, email konfirmasi, login, serta simpan/muat ulang transaksi berhasil di lokal.
- Data dua akun terpisah; trial muncul otomatis.
- Trial aktif dan akun berbayar membuka asisten serta tema karakter. Saat keduanya habis, fitur terkunci kembali. Nama asisten dan koreksi kategori bertahan setelah muat ulang.
- Kunci Sandbox Midtrans dan project API OpenAI sudah siap pribadi.
- `.env` tidak ikut Git.
- `npm.cmd run build` dan `npm.cmd test` lulus.

Webhook pembayaran dan AI nyata baru bisa dinyatakan berhasil setelah endpoint server dijalankan dan dites. Setelah URL deployment pengujian tersedia, lengkapi URL Auth Supabase serta webhook Midtrans, lalu uji pembayaran dan AI sebelum membuka aplikasi untuk pelanggan.

## Login menggunakan username

Pendaftaran memakai email, username, dan password; email tetap diperlukan untuk konfirmasi akun. Username terdiri dari 3–24 karakter, diawali huruf, sisanya huruf/angka/underscore. Contoh: `muchi_01`. Username disimpan huruf kecil dan harus unik.

Saat masuk, pilih “Masuk ke akun saya”, lalu isi kolom Email atau username. Login email tetap langsung melalui Supabase Auth. Login username melalui `/.netlify/functions/login-username`: server mencari ID akun, mengambil email di server, memverifikasi password lewat klien Auth publik terpisah, lalu mengirim token sesi ke browser. Tidak tersedia endpoint publik untuk mengambil email dari username. Password tidak disimpan di tabel aplikasi.

Akun yang sudah ada: masuk dengan email, klik avatar kanan atas atau menu Profil, lalu simpan username baru. Penggantian username tidak mengubah email, password, atau tanggal trial. Username lama tidak lagi bisa digunakan untuk akun itu dan dapat dipilih akun lain.

Di halaman Profil, label Premium menandakan paid_until aktif; trial aktif berlabel Trial Premium. Akun tanpa keduanya berlabel Pengguna Biasa. Password bisa diubah dengan password lama, password baru, dan konfirmasi. Jika Secure password change memerlukan kode email, gunakan Kirim kode ke email dan masukkan kode yang diterima. Profil juga menyediakan tombol Keluar. Username/password tetap memakai username.sql. Untuk foto profil, jalankan profile-avatars.sql, lalu gunakan Tambah/Ganti foto, pratinjau, dan Simpan foto. Foto JPG/PNG/WebP maksimal 2 MB; fitur profil tetap tersedia saat trial/langganan berakhir.

Uji login username memakai Netlify Dev atau deployment pengujian dengan `SUPABASE_URL`, `SUPABASE_ANON_KEY`, dan `SUPABASE_SERVICE_ROLE_KEY` tersedia di Functions. `npm run dev` hanya melayani frontend, sehingga login email bisa diuji di sana tetapi login username tidak. Tidak perlu memasukkan secret key ke variabel Vite. Login username dibatasi 20 percobaan per jendela 15 menit untuk IP dan username; informasi bucket disimpan sebagai HMAC, tanpa password. SQL Editor dapat membersihkan data `login_attempts` lama dengan query pemeliharaan yang ada di `username.sql`.

Sebelum produksi, uji username huruf besar/kecil, username duplikat, password salah, email belum dikonfirmasi, akun lama, dan login ulang setelah refresh. Build/unit test tidak menggantikan pengujian migrasi serta Auth langsung.
