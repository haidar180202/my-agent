# 📝 Daily Activity & Git Push Engineering Log

Dokumen ini mencatat seluruh riwayat pengembangan, perbaikan bug, dan penambahan fitur secara kronologis berdasarkan **Tanggal** dan **Setiap Kali Melakukan Git Push ke Branch Main / Branch Fitur**.

---

## 📅 2026-09-01 (Selasa)

### 🚀 Push #5 (Pending Push to main) — Repository `my-agent` — 21:40 WIB
* **Judul & Fitur**: Minimalist Glassmorphism Kanban Card Redesign, Zero ATS Overflow Fix, 3-Dot Quick Options Menu, & Horizontal Scroll Container.
* **Commit Target**: `main` (`my-agent`)
* **File Diubah**: `src/app/history/page.tsx`, `docs/logs/DAILY_LOG.md`
* **Penjelasan & Dampak**:
  * **Perbaikan Total ATS Badge Overflow (0% Overflow Guarantee)**: Memperbaiki bug di mana badge `92% ATS` meluap ke luar garis border kanan kartu. Mengunci badge di dalam flex header dengan `shrink-0 min-w-0 truncate` sehingga 100% aman dan rapi di dalam padding kartu.
  * **Eliminasi Noise & Dropdown Redundan**: Menghapus dropdown `Stage: Applied` berulang dari dalam kartu untuk memberikan ruang visual bernapas (*breathing room*).
  * **Kartu Minimalis Glassmorphism (3 Baris Bersih)**: Kartu kini menampilkan avatar perusahaan (`🏢`), judul/nama perusahaan terpotong 1 baris, sub-baris role + gaji, dan badge portofolio domain (`⚡ Elektro` / `💻 IT`).
  * **Toolbar Ringkas: 1 Main Button + Menu 3-Titik (`⋯`)**: Disediakan tombol menonjol `[ 👁️ Preview Detail ]` untuk membuka Modal Rekap Markdown, serta menu 3-titik (`⋯`) yang menyembunyikan opsi sekunder (ZIP Export, Notes, Load in Generator, Pindah Stage, Hapus) agar UI kartu tetap 100% bersih, elegan, dan profesional.
  * **Kontainer Kolom Kanban Smooth Horizontal Scroll**: Menambahkan horizontal flex container pada papan Kanban dengan min-width kolom konsisten (`w-[320px] shrink-0`), mencegah kolom terhimpit di layar kecil.

---

### 🚀 Push #4 (`2061097`) — Repository `my-agent` — 21:18 WIB
* **Judul & Fitur**: Editable Free-Text Save Title Template (`NAMA-COMPANY_ROLE_INFO-LAINNYA_SALARY-RANGE`) & Dynamic Salary Range Extraction.
* **Commit Target**: `main` (`my-agent`)
* **File Diubah**: `src/app/ats-generate/page.tsx`, `src/app/history/page.tsx`, `src/utils/zipExporter.ts`, `docs/logs/DAILY_LOG.md`
* **Penjelasan & Dampak**:
  * **Pola Penamaan Otomatis Free-Text Input**: Saat mengeklik *Save to History*, modal simpan secara otomatis mengisi kolom judul dengan sampel teks bebas sesuai pola `NAMA-COMPANY_ROLE_INFO-LAINNYA_SALARY-RANGE` (misal: `PT Bukit Asam Tbk_Lead Systems Analyst_Hybrid_IDR 25M-35M`).
  * **Bisa Di-custom 100% Bebas oleh Candidate**: Kolom judul berupa input teks bebas yang bisa diubah, ditambah, atau dikustomisasi sepuasnya oleh candidate sebelum mengonfirmasi penyimpanan.
  * **Integrasi Judul di Backlog `/history` & File `.md`**: Judul kustom buatan candidate ditampilkan sebagai nama utama pada kartu riwayat di `/history` dan dipakai sebagai nama file saat diunduh (`<Judul_Kustom>_Recap.md`).

---

### 🚀 Push #3 (`27495f1`) — Repository `my-agent` — 21:02 WIB
* **Judul & Fitur**: Live Markdown Preview First Workflow, Application History Backlog Integration, 1-Click Copy & Download (.md).
* **Commit Target**: `main` (`my-agent`)
* **File Diubah**: `src/app/history/page.tsx`, `src/app/ats-generate/page.tsx`, `src/utils/zipExporter.ts`, `docs/logs/DAILY_LOG.md`
* **Penjelasan & Dampak**:
  * **Penyimpanan Rekap Markdown Otomatis**: Saat pengguna mengeklik *Save to History* di generator CV, sistem memformat seluruh data lamaran (Info Perusahaan, Role, Tanggal, ATS Match Score %, Link Portofolio Elektro/IT yang disetujui, Strategi AI, Tailored Resume, Cover Letter, dan Cold Email) menjadi dokumen Markdown terstruktur (`.md`).
  * **Modal Live Preview Terlebih Dahulu (Preview First)**: Di menu *Application History (`/history`)*, mengeklik kartu riwayat atau tombol *👁️ Preview* akan **langsung membuka Modal Live Preview Terlebih Dahulu**. Pengguna dapat meninjau riwayat historis secara utuh dengan nyaman di layar tanpa harus mengunduh file.
  * **Aksi Akomodatif di Dalam Modal**: Menyediakan tombol *📋 1-Click Copy Markdown* untuk Notion/Obsidian dan tombol *📥 Download .md File* di dalam modal preview.

---

### 🚀 Push #2 (`20f3b45`) — Repository `my-agent` — 12:01 WIB
* **Judul & Fitur**: Pre-Generation Gemini Domain Classifier, Directive #13 Portfolio Auto-Selection, & Candidate Approval Gate Modal.
* **Commit Target**: `main` (`my-agent`)
* **File Diubah**: `src/app/api/generate-ats/route.ts`, `src/app/ats-generate/page.tsx`, `docs/logs/DAILY_LOG.md`
* **Penjelasan & Dampak**:
  * **Analisis & Alasan Otomatis Gemini (`classify-domain`)**: AI Gemini menganalisis JD secara *pre-check* untuk merekomendasikan apakah URL `https://profile-mhaidarshahab-electrical.netlify.app/` (Elektro) atau `https://haidarshahab.vercel.app/` (IT) yang paling pas + memberikan alasan teknis 1-2 kalimat dalam Bahasa Indonesia.
  * **Modal Konfirmasi & Approval Candidate**: Menampilkan modal konfirmasi interaktif di mana pengguna melihat rekomendasi & alasan Gemini, serta dapat mengeklik tombol *"✅ Oke, Setuju & Lanjutkan Generate PDF"* atau tombol *"🔄 Switch Portofolio"* sebelum PDF benar-benar diproses.
  * **Penerapan Mandat Directive #13**: Jika domain Elektro disetujui, CV & Cover Letter dibingkai dengan gelar formal S1 Teknik Elektro, CISEA v2.0.0 Super-App PT Bukit Asam Tbk, dan interlock PLC PT Pupuk Sriwidjaja. Jika domain IT disetujui, CV dibingkai dengan Senior Full-Stack Software Engineer & Lead Systems Architect.

---

### 🚀 Push #1 (`8fcd8b1`) — Repository `profile` — 11:45 WIB
* **Judul & Fitur**: Sync Latest Portfolio Data, Components, and My Agent AI Suite to `electrical-engineer` Branch while Preserving Electrical Engineering Narrative for Home and About.
* **Commit ID**: `8fcd8b1` (Pushed to `origin/electrical-engineer` in `https://github.com/haidar180202/profile.git`)
* **File Diubah**: 30+ komponen (`portfolioData.js`, `executiveProjectsData.js`, `public/documents/`, `App.js`, `App.css`, `index.js`, `index.css`, `tailwind.config.js`, `ExecutiveShowcase.jsx`, `Portfolio.jsx`, `ProjectModal.jsx`, `Navbar.jsx`, `Footer.jsx`, `Client.jsx`, `Blog.jsx`, `Contact.jsx`, `public/favicon.svg`).
* **Penjelasan & Dampak**:
  * **Integrasi Narasi Berpisah**: Branch `main` difokuskan untuk **Senior Full-Stack Software Engineer (IT)**, sedangkan branch `electrical-engineer` difokuskan untuk **S1 Teknik Elektro (GPA > 3.5) & Lead Systems Analyst / Operations Monitoring**.
  * **Komponen Home & About Mempertahankan Narasi Elektro**: Komponen `Home.jsx` dan `About.jsx` pada branch `electrical-engineer` **100% dipertahankan utuh** dengan narasi gelar formal S1 Teknik Elektro, CISEA v2.0.0 Super-App PT Bukit Asam Tbk (100+ modul), dan interlock PLC PT Pupuk Sriwidjaja.
  * **Sinkronisasi Seluruh Komponen Baru**: Seluruh 30+ komponen, styling modern, logo SVG monogram, dan proyek baru **My Agent — Autonomous Career & Personal Brand OS** (URL Vercel: `https://my-agent-mauve-omega.vercel.app/`) berhasil disinkronkan sempurna dari branch `main` ke `electrical-engineer`.
