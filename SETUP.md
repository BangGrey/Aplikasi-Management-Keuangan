# Panduan konfigurasi sebelum deploy

Ikuti tahap sesuai urutan. Panduan ini tidak menjalankan deploy atau mengubah akun layanan secara otomatis. Nama menu dashboard bisa sedikit berbeda.

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
| 6 | `supabase/premium.sql` | Kunci asisten dan tema karakter untuk langganan berbayar |
| 7 | `supabase/gold.sql` | Tabungan gram, cache harga, dan riwayat emas |
| 8 | `supabase/gold-reductions.sql` | Pengurangan gram terjual dan catatan pengurangan |

`schema.sql` untuk proyek baru dan **tidak boleh diulang sembarangan**. Jika muncul `already exists`, hentikan, simpan pesan error, dan periksa bagian yang sudah dibuat. File 2–7 dirancang bisa dijalankan ulang. Jangan menghapus tabel untuk mencoba memperbaiki error. Jika migrasi sebelumnya sudah sukses, cukup jalankan file baru yang belum diterapkan. **Jalankan premium.sql setelah assistant.sql/learning.sql**; jika mengulang keduanya, terapkan premium.sql lagi agar aturan lama tidak membuka akses trial. gold.sql boleh dijalankan setelah premium.sql.

6. Buka Table Editor, pastikan ada 14 tabel di schema public: `profiles`, `transactions`, `goals`, `orders`, `assistant_preferences`, `assistant_memories`, `assistant_suggestions`, `assistant_knowledge`, `assistant_usage`, `login_attempts`, `gold_holdings`, `gold_quotes`, `gold_quote_history`, `gold_reductions`. Tabel `profiles` juga memiliki kolom `username`. Jalankan gold-reductions.sql setelah gold.sql; untuk proyek yang sudah terpasang, cukup jalankan migrasi baru yang belum diterapkan.
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
4. Atur SMTP di pengaturan email Authentication: sender email, sender name (misalnya Keuanganmu), host, port, username, dan password dari penyedia SMTP Anda. Ikuti pengaturan dan verifikasi domain milik penyedia; jangan menebak nilainya.
5. Email bawaan Supabase membatasi penerima ke email anggota tim proyek dan tidak cocok untuk pendaftaran publik. Untuk tes awal tanpa SMTP, gunakan alamat email anggota organisasi Supabase. Sebelum menerima pengguna lain, pastikan SMTP sudah berfungsi.
6. Setelah domain Netlify tersedia nanti, ubah Site URL ke URL HTTPS tersebut dan tambahkan URL domain itu beserta `/**` ke Redirect URLs. Pertahankan localhost untuk pengembangan bila masih diperlukan.

Referensi: [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

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

Tes: daftar → konfirmasi email → masuk → catat pemasukan dan pengeluaran secara manual → muat ulang. Pastikan data tetap ada. Di Supabase, akun harus muncul di Authentication → Users, sedangkan `profiles` otomatis berisi trial 7 hari. Data demo browser tidak otomatis dipindahkan ke akun. Uji akun kedua di browser/profil terpisah dan pastikan tidak melihat transaksi akun pertama. Akun trial harus melihat tema karakter dan asisten terkunci.

## 5. Midtrans Sandbox

1. Buat/masuk akun https://dashboard.midtrans.com dan pilih mode **Sandbox**.
2. Buka Settings → Access Keys, salin Server Key Sandbox ke tempat pribadi. Kode menggunakan hosted Snap redirect sehingga tidak membutuhkan Client Key.
3. Siapkan nilai server:

```dotenv
MIDTRANS_SERVER_KEY=ISI_SERVER_KEY_SANDBOX
MIDTRANS_IS_PRODUCTION=false
```

4. Payment Notification URL baru dapat diverifikasi setelah ada endpoint publik yang berjalan. Siapkan alamat berikut untuk nanti, jangan menganggap webhook sudah aktif hanya karena kolom dashboard terisi:

```text
https://DOMAIN-ANDA.netlify.app/.netlify/functions/midtrans-webhook
```

5. Nanti isi alamat tersebut di Settings → Configuration → Payment Notification URL pada mode Sandbox. Finish Redirect URL adalah beranda domain aplikasi, berbeda dari webhook.
6. Pengujian lokal `npm run dev` tidak menjalankan Netlify Functions. Pengujian lengkap sebelum produksi dapat dilakukan lewat Netlify Dev + tunnel HTTPS publik yang sesuai atau deployment pengujian Netlify. Midtrans tidak dapat menghubungi `localhost` komputer Anda.
7. Tetap gunakan Sandbox sampai alur pembayaran dan aktivasi sudah teruji. Setelah pembayaran sukses, webhook yang memverifikasi status mengaktifkan 30 hari. Uji ulang notifikasi yang sama dan pastikan tidak menambah masa aktif dua kali.

Referensi: [Dashboard Midtrans](https://docs.midtrans.com/docs/dashboard-basics), [webhook](https://docs.midtrans.com/docs/https-notification-webhooks).

## 6. OpenAI

1. Masuk https://platform.openai.com, pilih/buat project untuk aplikasi.
2. Atur billing/kredit API yang diperlukan dan akses model. Pantau penggunaan dan atur anggaran/notifikasi; jangan menganggap notifikasi anggaran sebagai pemutus tagihan otomatis.
3. Buat project API key di bagian API Keys, simpan pribadi.
4. Siapkan variabel server:

```dotenv
OPENAI_API_KEY=ISI_API_KEY
OPENAI_MODEL=gpt-5-mini
```

5. Jangan gunakan `VITE_OPENAI_API_KEY`. Di aplikasi nanti, masuk dengan langganan berbayar aktif → buka chat → Memori & AI lanjutan → aktifkan OpenAI. Pesan sederhana tetap lokal; pesan yang belum dipahami memakai API. Kuota aplikasi 50 request/hari/akun premium bukan batas total biaya semua pengguna. Akun gratis/trial tidak dapat memakai asisten, termasuk parser lokal.
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
| `MIDTRANS_IS_PRODUCTION` | `false` | Functions |
| `OPENAI_API_KEY` | Project API key | Functions; rahasia |
| `OPENAI_MODEL` | `gpt-5-mini` | Functions |

`URL` disediakan otomatis oleh Netlify, jadi tidak perlu menebak/mengisinya sekarang. Aplikasi memakai nilai itu untuk URL kembali pembayaran. Jangan menandai publishable/anon key sebagai secret bila dashboard meminta klasifikasi: nilai frontend memang masuk bundle; perlindungan data dijalankan melalui RLS. Perubahan environment memerlukan build/deploy baru agar diterapkan.

Referensi: [Environment Netlify](https://docs.netlify.com/build/environment-variables/overview/).

## 8. Titik pemeriksaan sebelum lanjut

- Delapan file SQL sukses, premium.sql dijalankan setelah migrasi asisten, gold-reductions.sql setelah gold.sql, dan 14 tabel memiliki RLS aktif.
- Daftar, email konfirmasi, login, serta simpan/muat ulang transaksi berhasil di lokal.
- Data dua akun terpisah; trial muncul otomatis.
- Asisten dan tema karakter terkunci pada akun gratis/trial. Pada akun premium, nama asisten dan koreksi kategori bertahan setelah muat ulang.
- Kunci Sandbox Midtrans dan project API OpenAI sudah siap pribadi.
- `.env` tidak ikut Git.
- `npm.cmd run build` dan `npm.cmd test` lulus.

Webhook pembayaran dan AI nyata baru bisa dinyatakan berhasil setelah endpoint server dijalankan dan dites. Setelah URL deployment pengujian tersedia, lengkapi URL Auth Supabase serta webhook Midtrans, lalu uji pembayaran dan AI sebelum membuka aplikasi untuk pelanggan.

## Login menggunakan username

Pendaftaran memakai email, username, dan password; email tetap diperlukan untuk konfirmasi akun. Username terdiri dari 3–24 karakter, diawali huruf, sisanya huruf/angka/underscore. Contoh: `muchi_01`. Username disimpan huruf kecil dan harus unik.

Saat masuk, pilih “Masuk ke akun saya”, lalu isi kolom Email atau username. Login email tetap langsung melalui Supabase Auth. Login username melalui `/.netlify/functions/login-username`: server mencari ID akun, mengambil email di server, memverifikasi password lewat klien Auth publik terpisah, lalu mengirim token sesi ke browser. Tidak tersedia endpoint publik untuk mengambil email dari username. Password tidak disimpan di tabel aplikasi.

Akun yang sudah ada: masuk dengan email, klik avatar kanan atas, pilih/simpan username. Penggantian username tidak mengubah email, password, atau tanggal trial. Username lama tidak lagi bisa digunakan untuk akun itu dan dapat dipilih akun lain.

Uji login username memakai Netlify Dev atau deployment pengujian dengan `SUPABASE_URL`, `SUPABASE_ANON_KEY`, dan `SUPABASE_SERVICE_ROLE_KEY` tersedia di Functions. `npm run dev` hanya melayani frontend, sehingga login email bisa diuji di sana tetapi login username tidak. Tidak perlu memasukkan secret key ke variabel Vite. Login username dibatasi 20 percobaan per jendela 15 menit untuk IP dan username; informasi bucket disimpan sebagai HMAC, tanpa password. SQL Editor dapat membersihkan data `login_attempts` lama dengan query pemeliharaan yang ada di `username.sql`.

Sebelum produksi, uji username huruf besar/kecil, username duplikat, password salah, email belum dikonfirmasi, akun lama, dan login ulang setelah refresh. Build/unit test tidak menggantikan pengujian migrasi serta Auth langsung.
