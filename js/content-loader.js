// ============================================
// Sunbelt Plumbing — Public Content Loader
// ============================================
// Fetches live content from Supabase for public pages
// (gallery images, testimonials, service areas, etc).
// Gracefully falls back to hard-coded HTML if Supabase
// is unreachable, so the site never appears broken.
// ============================================

(async function() {
  try {
    const sb = await window.supabaseReady();

    // ===== GALLERY PAGE =====
    const galleryGrid = document.getElementById('gallery-grid');
    if (galleryGrid) {
      const { data, error } = await sb
        .from('gallery')
        .select('id, image_url, caption, category')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (!error && data && data.length > 0) {
        galleryGrid.innerHTML = data.map(item => `
          <figure class="gallery-item" data-category="${escapeHtml(item.category || 'all')}">
            <img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.caption || 'Sunbelt Plumbing work')}" loading="lazy">
            ${item.caption ? `<figcaption>${escapeHtml(item.caption)}</figcaption>` : ''}
          </figure>
        `).join('');
      }
      // If error or empty, leave existing placeholder content in place
    }

    // ===== TESTIMONIALS (homepage + contact) =====
    const testimonialsGrid = document.getElementById('testimonials-grid');
    if (testimonialsGrid) {
      const { data, error } = await sb
        .from('testimonials')
        .select('id, customer_name, customer_location, service_type, rating, quote, avatar_letter')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .limit(3);

      if (!error && data && data.length > 0) {
        testimonialsGrid.innerHTML = data.map(t => `
          <div class="testimonial">
            <div class="testimonial-stars">${'★'.repeat(Math.max(1, Math.min(5, t.rating || 5)))}</div>
            <p class="testimonial-quote">&ldquo;${escapeHtml(t.quote || '')}&rdquo;</p>
            <div class="testimonial-author">
              <div class="testimonial-avatar">${escapeHtml((t.avatar_letter || (t.customer_name || '?')[0] || '?').toUpperCase())}</div>
              <div>
                <div class="testimonial-name">${escapeHtml(t.customer_name || 'Happy customer')}</div>
                <div class="testimonial-meta">${escapeHtml(t.service_type || '')}${t.customer_location ? ' · ' + escapeHtml(t.customer_location) : ''}</div>
              </div>
            </div>
          </div>
        `).join('');
      }
    }

    // ===== SITE SETTINGS (phone, email, etc.) =====
    // Currently the public site uses hard-coded contact info, which is
    // totally fine for v1 of the admin panel. When settings editing is
    // enabled, we can wire this in. For now it's a no-op.

  } catch (err) {
    // Silent fail — public site falls back to static HTML
    console.warn('[content-loader] Using static content:', err.message);
  }
})();

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
