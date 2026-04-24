// ============================================
// Sunbelt Plumbing — Admin Panel Core JS
// ============================================
// Shared across all admin pages. Handles:
// - Auth guard (redirect to login if not signed in)
// - User info display
// - Logout
// - Common helpers (toast, modal, escape HTML)
// ============================================

window.Admin = {
  user: null,

  // ----- Auth guard: call on every protected page -----
  async requireAuth() {
    const sb = await window.supabaseReady();
    const { data: { session }, error } = await sb.auth.getSession();

    if (error || !session) {
      window.location.href = '/admin/';
      return null;
    }

    this.user = session.user;
    this.renderUserInfo();
    return session;
  },

  renderUserInfo() {
    const el = document.getElementById('admin-user-email');
    if (el && this.user) el.textContent = this.user.email;
  },

  async logout() {
    const sb = await window.supabaseReady();
    await sb.auth.signOut();
    window.location.href = '/admin/';
  },

  // ----- Toast notifications -----
  toast(message, type = 'success') {
    let el = document.getElementById('admin-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'admin-toast';
      el.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 18px;
        border-radius: 8px;
        color: #fff;
        font-weight: 500;
        z-index: 9999;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        max-width: 360px;
        opacity: 0;
        transform: translateY(10px);
        transition: opacity 0.2s, transform 0.2s;
        font-size: 14px;
      `;
      document.body.appendChild(el);
    }
    const colors = {
      success: '#16a34a',
      error: '#dc2626',
      info: '#0f4c81',
      warning: '#f59e0b'
    };
    el.style.background = colors[type] || colors.info;
    el.textContent = message;
    requestAnimationFrame(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });
    clearTimeout(el._hideTimeout);
    el._hideTimeout = setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(10px)';
    }, 3500);
  },

  // ----- Confirm modal -----
  confirm(message, title = 'Are you sure?') {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'admin-modal-backdrop open';
      modal.innerHTML = `
        <div class="admin-modal" style="max-width: 420px;">
          <h2>${this.escapeHtml(title)}</h2>
          <p style="color: #64748b; margin: 0 0 1rem 0;">${this.escapeHtml(message)}</p>
          <div class="admin-modal-actions">
            <button class="btn-admin btn-admin-secondary" data-action="cancel">Cancel</button>
            <button class="btn-admin btn-admin-danger" data-action="confirm">Confirm</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      modal.addEventListener('click', (e) => {
        if (e.target.dataset.action === 'confirm') {
          document.body.removeChild(modal);
          resolve(true);
        } else if (e.target.dataset.action === 'cancel' || e.target === modal) {
          document.body.removeChild(modal);
          resolve(false);
        }
      });
    });
  },

  // ----- Escape HTML for safe injection -----
  escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  // ----- Audit log helper (fire and forget) -----
  async logAction(table, recordId, action, oldData = null, newData = null) {
    try {
      const sb = await window.supabaseReady();
      await sb.from('audit_log').insert({
        user_email: this.user?.email || 'unknown',
        table_name: table,
        record_id: recordId,
        action: action,
        old_data: oldData,
        new_data: newData
      });
    } catch (err) {
      console.warn('[audit] log failed:', err);
    }
  },

  // ----- Image compression before upload (client-side resize) -----
  async compressImage(file, maxWidth = 1600, quality = 0.85) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target.result;
        img.onload = () => {
          const scale = Math.min(1, maxWidth / img.width);
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          canvas.toBlob((blob) => {
            if (!blob) return reject(new Error('Compression failed'));
            const ext = file.name.split('.').pop().toLowerCase();
            const finalName = file.name.replace(/\.[^.]+$/, '') + '-' + Date.now() + '.jpg';
            const compressed = new File([blob], finalName, { type: 'image/jpeg' });
            resolve(compressed);
          }, 'image/jpeg', quality);
        };
        img.onerror = () => reject(new Error('Could not load image'));
      };
      reader.onerror = () => reject(new Error('Could not read file'));
      reader.readAsDataURL(file);
    });
  },

  // ----- Upload image to Supabase Storage, return public URL -----
  async uploadImage(file, bucket = 'gallery') {
    const sb = await window.supabaseReady();

    // Reject HEIC (common iPhone format, unsupported by browsers)
    if (file.name.match(/\.(heic|heif)$/i) || file.type === 'image/heic') {
      throw new Error(
        'HEIC/HEIF images are not supported. On iPhone, go to Settings → Camera → Formats → Most Compatible, or convert the image to JPG/PNG first.'
      );
    }

    // Accept only JPG, PNG, WebP
    if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/i)) {
      throw new Error('Only JPG, PNG, and WebP images are allowed.');
    }

    // Max 5 MB BEFORE compression
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File is too large. Maximum size is 5 MB.');
    }

    // Compress client-side to cap at 1600px width
    const compressed = await this.compressImage(file);

    // Unique path: timestamp + sanitized name
    const safeName = compressed.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `${Date.now()}-${safeName}`;

    const { data, error } = await sb.storage
      .from(bucket)
      .upload(path, compressed, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'image/jpeg'
      });

    if (error) throw error;

    const { data: urlData } = sb.storage.from(bucket).getPublicUrl(data.path);
    return urlData.publicUrl;
  },

  // ----- Highlight current nav item based on URL -----
  markActiveNav() {
    const path = window.location.pathname;
    document.querySelectorAll('.admin-nav a').forEach(a => {
      if (a.getAttribute('href') === path) {
        a.classList.add('active');
      }
    });
  }
};

// Auto-wire logout button if present
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('admin-logout-btn');
  if (btn) btn.addEventListener('click', () => window.Admin.logout());
  window.Admin.markActiveNav();
});
