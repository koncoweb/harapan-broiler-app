rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // --- FUNGSI PEMBANTU (HELPER FUNCTIONS) ---
    
    function isSignedIn() {
      return request.auth != null;
    }

    function isAdmin() {
      return isSignedIn() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    // --- ATURAN KOLEKSI ---

    // 1. Koleksi Users: Profil Pengguna & Role
    match /users/{userId} {
      // UPDATE: Batasi akses baca hanya untuk pemilik akun atau admin (Privacy)
      allow read: if isSignedIn() && (isOwner(userId) || isAdmin());
      
      // Saat daftar (create), paksa role menjadi 'user'
      allow create: if isSignedIn() && isOwner(userId) && 
        request.resource.data.role == 'user';
      
      // Saat update, user tidak boleh mengubah role-nya sendiri kecuali dia sudah admin
      allow update: if isSignedIn() && (
        (isOwner(userId) && request.resource.data.role == resource.data.role) || 
        isAdmin()
      );
      
      allow delete: if isAdmin();
    }

    // 2. Koleksi Weighing Sessions: Data Timbangan
    // Mendukung fitur: Input (Staff), Edit (Admin), Hapus (Admin), Ekspor Excel (Admin)
    match /weighing_sessions/{sessionId} {
      // Staff/Admin bisa melihat semua data (untuk HomeScreen) dan input data baru
      allow read, create: if isSignedIn();
      
      // Fitur Edit (termasuk update Status Pembayaran) dan Hapus HANYA untuk Admin
      allow update, delete: if isAdmin();
    }

    // 3. Koleksi Settings: Nama Farm & Alamat
    match /settings/{docId} {
      // Dibuka public agar bisa diakses di halaman Login/Print tanpa masalah
      allow read: if true;
      
      // Hanya Admin yang bisa mengubah pengaturan farm via Admin Panel
      allow write: if isAdmin();
    }
  }
}
