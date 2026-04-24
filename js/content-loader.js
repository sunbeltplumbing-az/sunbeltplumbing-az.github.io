// ============================================
// Sunbelt Plumbing — Public Content Loader
// ============================================
// Populates public pages with live content from Supabase.
// Gracefully falls back to hard-coded HTML if Supabase is unreachable.
// ============================================

(async function() {
  try {
    const sb = await window.supabaseReady();

    // ===== Gallery page =====
    const galleryGrid = document.getElementById('gallery-grid');
    if (galleryGrid) {
      const { data, error } = await sb
        .from('gallery').select('id, image_url, caption, category')
        .eq('is_active', true).order('display_order', { ascending: true });
      if (!error && data && data.length > 0) {
        galleryGrid.innerHTML = data.map(item => `
          <div class="gallery-item" data-category="${escapeHtml(item.category || 'other')}">
            <img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.caption || 'Sunbelt Plumbing work')}" loading="lazy" />
            ${item.caption ? `<div class="gallery-caption"><h4>${escapeHtml(item.caption)}</h4></div>` : ''}
          </div>`).join('');
      }
    }

    // ===== Testimonials (homepage + contact) =====
    const testimonialsGrid = document.getElementById('testimonials-grid');
    if (testimonialsGrid) {
      const { data, error } = await sb
        .from('testimonials').select('*')
        .eq('is_active', true).order('display_order', { ascending: true }).limit(3);
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
          </div>`).join('');
      }
    }

    // ===== Homepage Services (dynamic replacement) =====
    const servicesGrid = document.getElementById('services-grid');
    if (servicesGrid) {
      const { data, error } = await sb
        .from('services').select('*')
        .eq('is_active', true).eq('is_featured_on_home', true)
        .order('display_order', { ascending: true });
      if (!error && data && data.length > 0) {
        servicesGrid.innerHTML = data.map(s => `
          <div class="service-card service-card-image">
            ${s.image_url ? `<div class="service-card-img" style="background-image:url('${escapeAttr(s.image_url)}');" aria-hidden="true"></div>` : ''}
            <div class="service-card-body">
              <div class="service-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h2m14 0h2M5.6 5.6l1.4 1.4m10 10l1.4 1.4M12 3v2m0 14v2M5.6 18.4l1.4-1.4m10-10l1.4-1.4"/><circle cx="12" cy="12" r="4"/></svg>
              </div>
              <h3>${escapeHtml(s.title)}</h3>
              <p>${escapeHtml(s.description || '')}</p>
            </div>
          </div>`).join('');
      }
    }

    // ===== Pricing page (grouped by category) =====
    const pricingContainer = document.getElementById('pricing-dynamic');
    if (pricingContainer) {
      const { data, error } = await sb
        .from('prices').select('*')
        .eq('is_active', true).order('display_order', { ascending: true });
      if (!error && data && data.length > 0) {
        const CATEGORY_LABELS = {
          'drain-sewer': 'Drain Clearing & Sewer Services',
          'fixture-install': 'Fixture & Appliance Installation',
          'ball-valves': 'Ball Valves (Above Ground)',
          'fan-coil': 'HBC Fan Coil Systems',
          'other': 'Other Services'
        };
        const CATEGORY_ICONS = {
          'drain-sewer': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L4 7v10l8 5 8-5V7l-8-5z"/><path d="M12 22V12M4 7l8 5 8-5"/></svg>',
          'fixture-install': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M5 21V7l7-4 7 4v14"/></svg>',
          'ball-valves': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>',
          'fan-coil': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4"/></svg>',
          'other': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
        };
        const groups = {};
        for (const item of data) {
          const cat = item.category || 'other';
          if (!groups[cat]) groups[cat] = [];
          groups[cat].push(item);
        }
        const ordered = ['drain-sewer', 'fixture-install', 'ball-valves', 'fan-coil', 'other'];
        const catsToRender = ordered.filter(c => groups[c]).concat(Object.keys(groups).filter(c => !ordered.includes(c)));

        pricingContainer.innerHTML = catsToRender.map(cat => `
          <div class="pricing-category">
            <div class="pricing-category-header">
              <div class="pricing-category-icon">${CATEGORY_ICONS[cat] || CATEGORY_ICONS['other']}</div>
              <h3>${escapeHtml(CATEGORY_LABELS[cat] || cat)}</h3>
            </div>
            <div class="pricing-items">
              ${groups[cat].map(p => `
                <div class="pricing-item">
                  <span class="pricing-item-name">${escapeHtml(p.item_name)}${p.notes ? ` <span class="pricing-item-note">${escapeHtml(p.notes)}</span>` : ''}</span>
                </div>`).join('')}
            </div>
          </div>`).join('');

        // Update "last updated" timestamp if the span exists
        const lastUpdatedEl = document.getElementById('pricing-last-updated');
        if (lastUpdatedEl) {
          // Find the most recent updated_at across all rows
          const latest = data.reduce((max, p) => {
            const t = new Date(p.updated_at || p.created_at || 0).getTime();
            return t > max ? t : max;
          }, 0);
          if (latest > 0) {
            const d = new Date(latest);
            lastUpdatedEl.textContent = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
          }
        }
      }
    }

    // ===== Service Areas (homepage) =====
    const areasContainer = document.getElementById('areas-grid');
    if (areasContainer) {
      const { data, error } = await sb
        .from('service_areas').select('*')
        .eq('is_active', true).order('display_order', { ascending: true });
      if (!error && data && data.length > 0) {
        areasContainer.innerHTML = data.map(a => `
          <div class="area-chip${a.is_primary ? ' area-chip-primary' : ''}"><span class="area-dot"></span> ${escapeHtml(a.city_name)}</div>
        `).join('');
      }
    }

    // ===== Site Settings (phone, email, etc. — optional v2 feature) =====
    // Currently public pages use hardcoded contact info. When settings editing
    // matters more, we can wire this to update header/footer dynamically.

  } catch (err) {
    console.warn('[content-loader] Using static content:', err.message);
  }
})();

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function escapeAttr(str) {
  // For attribute values inside single-quoted contexts (like url('...'))
  if (str == null) return '';
  return String(str).replace(/'/g, "\\'").replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
