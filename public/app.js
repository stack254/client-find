const $ = selector => document.querySelector(selector);
let prospects = [];
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function render() {
  const metrics = [['Total prospects', prospects.length], ['Ready to contact', prospects.filter(p => p.status === 'New').length], ['Interested', prospects.filter(p => p.status === 'Interested').length], ['Clients won', prospects.filter(p => p.status === 'Won').length]];
  $('#stats').innerHTML = metrics.map(([label, value]) => `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`).join('');
  const search = $('#search').value.toLowerCase();
  const filtered = prospects.filter(p => (!$('#filter').value || p.status === $('#filter').value) && [p.name,p.location,p.service,p.need].join(' ').toLowerCase().includes(search));
  $('#list').innerHTML = filtered.length ? filtered.map(p => `<article class="prospect"><div><h3>${escape(p.name)}</h3><p>${escape(p.location || 'Location not recorded')} · ${escape(p.contact || 'Contact not recorded')}</p><span class="tag">${escape(p.service)}</span><span class="tag">${escape(p.status)}</span><p>${escape(p.need || 'Add an observed need to make your outreach more relevant.')}</p></div><div class="actions"><button class="secondary" data-edit="${escape(p.id)}">Edit</button><button data-draft="${escape(p.id)}">Draft outreach</button></div></article>`).join('') : `<div class="empty"><strong>${prospects.length ? 'No matching prospects' : 'Your next client starts here.'}</strong>${prospects.length ? 'Try another search or stage.' : 'Add a business, record an opportunity, and prepare your first conversation.'}</div>`;
}
async function load() { try { const response = await fetch('/api/prospects'); if (!response.ok) throw Error('Unable to load prospects'); prospects = await response.json(); render(); } catch (error) { $('#notice').textContent = error.message; } }
function edit(prospect) {
  $('#form').reset(); $('#form-error').textContent = '';
  if (prospect) for (const [key,value] of Object.entries(prospect)) if ($('#form').elements.namedItem(key)) $('#form').elements.namedItem(key).value = value;
  $('#dialog-title').textContent = prospect ? 'Edit prospect' : 'Add a prospect'; $('#editor').showModal();
}
$('#add').onclick = () => edit(); $('#close').onclick = () => $('#editor').close();
$('#search').oninput = render; $('#filter').onchange = render;
$('#form').onsubmit = async event => {
  event.preventDefault(); const button = $('#form button[type="submit"]'); button.disabled = true;
  try {
    const response = await fetch('/api/prospects', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(Object.fromEntries(new FormData($('#form')))) });
    const result = await response.json(); if (!response.ok) throw Error(result.error);
    $('#editor').close(); await load();
  } catch (error) { $('#form-error').textContent = error.message; } finally { button.disabled = false; }
};
$('#list').onclick = event => {
  const editId = event.target.dataset.edit; const draftId = event.target.dataset.draft;
  if (editId) edit(prospects.find(p => p.id === editId));
  if (draftId) {
    const p = prospects.find(p => p.id === draftId);
    $('#draft').value = `Hello ${p.name} team,\n\nI'm reaching out from RetailHub PRO. We help businesses with websites, digital services and retail software.\n\n${p.need ? `I noticed: ${p.need}\n\n` : ''}Would you be open to a short conversation about whether our ${p.service.toLowerCase()} offering could be useful for your business? I'd like to understand your current setup and priorities first.\n\nIf this isn't relevant, please let me know and I won't follow up.\n\nBest,\n[Your name]\nRetailHub PRO\nsupport@retailhubpro.com`;
    $('#copy-status').textContent = ''; $('#outreach').showModal();
  }
};
$('#close-outreach').onclick = () => $('#outreach').close();
$('#copy').onclick = async () => { try { await navigator.clipboard.writeText($('#draft').value); $('#copy-status').textContent = 'Copied.'; } catch { $('#copy-status').textContent = 'Select the draft and copy it manually.'; } };
$('#export').onclick = () => { const url = URL.createObjectURL(new Blob([JSON.stringify(prospects,null,2)], {type:'application/json'})); const a = document.createElement('a'); a.href = url; a.download = 'client-find-prospects.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000); };
load();
let discoveryResults = [];
fetch('/api/discovery/status').then(r => r.json()).then(status => {
  $('#provider-status').textContent = status.configured ? 'Google Places key is configured. Search to check provider access.' : 'Discovery needs GOOGLE_MAPS_API_KEY in secure environment settings. Enable Places API (New) and billing, then restart.';
}).catch(() => { $('#provider-status').textContent = 'Unable to check provider configuration.'; });
$('#discovery-form').onsubmit = async event => {
  event.preventDefault(); $('#discover-button').disabled = true; $('#provider-status').textContent = 'Searching Google Places…'; $('#discovery-results').replaceChildren();
  try {
    const query = new URLSearchParams({ category: $('#category').value, location: $('#location').value });
    const response = await fetch('/api/discover?' + query); const result = await response.json();
    if (!response.ok) throw Error(result.error);
    discoveryResults = result;
    $('#provider-status').textContent = `${result.length} results · Source: Google Maps. Suggestions require your review.`;
    $('#discovery-results').innerHTML = result.map((p,i) => `<article class="prospect"><div><h3>${escape(p.name)}</h3><p>${escape(p.location)}</p><span class="tag">${escape(p.priority)}</span><span class="tag">${escape(p.service)}</span><p>${escape(p.evidence)}</p><p>${escape(p.contact)} ${escape(p.website)}</p></div><div class="actions"><button class="secondary" data-review="${i}">Review prospect</button></div></article>`).join('');
  } catch (error) { $('#provider-status').textContent = error.message; } finally { $('#discover-button').disabled = false; }
};
$('#discovery-results').onclick = event => {
  const index = event.target.dataset.review;
  if (index === undefined) return;
  const p = discoveryResults[Number(index)];
  edit({ name:p.name, location:p.location, contact:p.contact, website:p.website, service:p.service, status:'New', need:p.evidence, notes:'Discovered through Google Maps. Verify details and provider retention terms before saving.' });
};
