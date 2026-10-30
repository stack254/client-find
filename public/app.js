const $ = selector => document.querySelector(selector);
let prospects = [];
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function qualification(p) {
  if (p.score === undefined) return '';
  return `<div class="tag">Research priority ${escape(p.score)}/100</div><div class="tag">${escape(p.websiteStatus)}</div><p>${escape(p.reviews)} Google reviews · ${p.reachable ? 'Phone listed' : 'No phone listed'}</p><details class="research-details"><summary>Why this score?</summary><small>${escape(p.scoreReasons.join(' · '))}. This score is not buying intent.</small></details>`;
}
function contactLinks(p) {
  const links = [];
  const raw = (p.contact || '').trim();
  const digits = raw.replace(/[\s().-]/g, '');
  if (/^\+[1-9]\d{7,14}$/.test(digits)) {
    const message = `Hello ${p.name} team, I'm [your name] from RetailHub PRO. We build business websites and booking tools. Are you the right person to ask about your website needs?`;
    links.push(`<a class="contact-link" target="_blank" rel="noopener noreferrer" href="https://wa.me/${digits.slice(1)}?text=${encodeURIComponent(message)}">Try WhatsApp ↗</a>`);
    links.push(`<a class="contact-link" href="tel:${digits}">Call</a>`);
  }
  try {
    const url = new URL(p.website);
    if (['https:', 'http:'].includes(url.protocol)) {
      const social = /(^|\.)(facebook\.com|instagram\.com|tiktok\.com|linkedin\.com)$/i.test(url.hostname);
      links.push(`<a class="contact-link" target="_blank" rel="noopener noreferrer" href="${escape(url.href)}">${social ? 'Open social profile' : 'Review website'} ↗</a>`);
    }
  } catch {}
  return `<div class="contact-links">${links.join(' ')}</div>${links.some(l => l.includes('wa.me')) ? '<small>WhatsApp availability unverified. Review and personalize the draft before sending.</small>' : '<small>Add a phone number with country code to enable WhatsApp.</small>'}`;
}
function render() {
  const metrics = [['Total prospects', prospects.length], ['Ready to contact', prospects.filter(p => p.status === 'New').length], ['Interested', prospects.filter(p => p.status === 'Interested').length], ['Clients won', prospects.filter(p => p.status === 'Won').length]];
  $('#stats').innerHTML = metrics.map(([label, value]) => `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`).join('');
  const search = $('#search').value.toLowerCase();
  const filtered = prospects.filter(p => (!$('#filter').value || p.status === $('#filter').value) && [p.name,p.location,p.service,p.need].join(' ').toLowerCase().includes(search));
  $('#list').innerHTML = filtered.length ? filtered.map(p => `<article class="prospect"><div><h3>${escape(p.name)}</h3><p>${escape(p.location || 'Location not recorded')} · ${escape(p.contact || 'Contact not recorded')}</p><span class="tag">${escape(p.service)}</span><span class="tag">${escape(p.status)}</span><p>${escape(p.need || 'Add an observed need to make your outreach more relevant.')}</p>${qualification(p)}${contactLinks(p)}</div><div class="actions"><button class="secondary" data-edit="${escape(p.id)}">Edit</button><button data-draft="${escape(p.id)}">Draft outreach</button></div></article>`).join('') : `<div class="empty"><strong>${prospects.length ? 'No matching prospects' : 'Your next client starts here.'}</strong>${prospects.length ? 'Try another search or stage.' : 'Add a business, record an opportunity, and prepare your first conversation.'}</div>`;
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
  event.preventDefault();
  if (!$('#category').value.trim()) { $('#run-campaign').click(); return; }
  $('#discover-button').disabled = true; $('#provider-status').textContent = 'Searching Google Places…'; $('#discovery-results').replaceChildren();
  try {
    const query = new URLSearchParams({ country: $('#country').value, category: $('#category').value, location: $('#location').value });
    const response = await fetch('/api/discover?' + query); const result = await response.json();
    if (!response.ok) throw Error(result.error);
    discoveryResults = result;
    $('#provider-status').textContent = `${result.length} results · Source: Google Maps. Suggestions require your review.`;
    $('#discovery-results').innerHTML = result.map((p,i) => `<article data-qualified="${Boolean(p.websiteOpportunity && p.reachable)}" class="prospect"><div><h3>${escape(p.name)}</h3><p>${escape(p.location)}</p><span class="tag">${escape(p.priority)}</span><span class="tag">${escape(p.service)}</span><p>${escape(p.evidence)}</p><p>${escape(p.contact)} ${escape(p.website)}</p>${qualification(p)}${contactLinks(p)}</div><div class="actions"><button data-ai="${i}">✦ AI brief</button><button class="secondary" data-review="${i}">Review prospect</button></div></article>`).join('');
  } catch (error) { $('#provider-status').textContent = error.message; } finally { $('#discover-button').disabled = false; }
};
$('#discovery-results').onclick = event => {
  const index = event.target.dataset.review;
  if (index === undefined) return;
  const p = discoveryResults[Number(index)];
  edit({ name:p.name, location:p.location, contact:p.contact, website:p.website, service:p.service, status:'New', need:p.evidence, notes:p.demo ? 'FICTIONAL DEMO — not a real business or sales lead.' : `Source: Google Maps. ${p.mapsUrl || ''}\nResearch priority: ${p.score ?? 'unscored'}/100. ${(p.scoreReasons || []).join('; ')}\n${p.reviews ?? 'Unknown'} reviews. Verify contact details and website need before outreach.` });
};

$('#try-demo').onclick = () => {
  discoveryResults = [
    {name:'Example furniture shop (DEMO)',location:'Nairobi · fictional example',service:'Online store',evidence:'Example scenario: products are advertised online, but buyers must phone to place orders.'},
    {name:'Example salon (DEMO)',location:'Nakuru · fictional example',service:'Website development',evidence:'Example scenario: the owner wants a dedicated page for services, prices and booking enquiries.'},
    {name:'Example cleaning company (DEMO)',location:'Mombasa · fictional example',service:'Digital marketing',evidence:'Example scenario: the owner wants more local enquiries and help planning campaigns.'}
  ].map(p => ({...p, demo:true, contact:'', website:''}));
  $('#provider-status').textContent = 'Demo examples — fictional businesses. No Google request or quota used.';
  $('#discovery-results').innerHTML = discoveryResults.map((p,i) => `<article data-qualified="${Boolean(p.websiteOpportunity && p.reachable)}" class="prospect"><div><h3>${escape(p.name)}</h3><p>${escape(p.location)}</p><span class="tag">Fictional example</span><span class="tag">${escape(p.service)}</span><p>${escape(p.evidence)}</p></div><div class="actions"><button data-ai="${i}">✦ AI brief</button><button class="secondary" data-review="${i}">Try reviewing</button></div></article>`).join('');
};

$('#country').onchange = () => { $('#location').value = ''; $('#location').placeholder = { KE:'e.g. Nairobi or Mombasa', BW:'e.g. Gaborone or Francistown', ZM:'e.g. Lusaka or Ndola' }[$('#country').value]; };

const sectors = [
  ['hotels and guest houses', 'Direct bookings and room enquiries'],
  ['schools and training colleges', 'Admissions enquiries and course information'],
  ['clinics and hospitals', 'Appointment requests and service information'],
  ['tour operators and travel agencies', 'Tour enquiries and booking requests'],
  ['salons and spas', 'Appointment booking'],
  ['restaurants and catering businesses', 'Reservations and catering enquiries']
];
let stopCampaign = false;
$('#stop-campaign').onclick = () => { stopCampaign = true; $('#campaign-status').textContent = 'Stopping after the current search…'; };
$('#run-campaign').onclick = async () => {
  const location = $('#location').value.trim();
  const country = $('#country').value;
  if (!location) { $('#campaign-status').textContent = 'Enter a town or area above first.'; $('#location').focus(); return; }
  stopCampaign = false;
  $('#run-campaign').disabled = true; $('#stop-campaign').disabled = false;
  $('#discover-button').disabled = true; $('#try-demo').disabled = true;
  const found = new Map(); let completed = 0; let failure = '';
  try {
    for (const [category, useCase] of sectors) {
      if (stopCampaign) break;
      $('#campaign-status').textContent = `Searching ${category} (${completed + 1}/${sectors.length})… ${found.size} unique businesses found.`;
      const response = await fetch('/api/discover?' + new URLSearchParams({country,location,category}));
      const result = await response.json();
      if (!response.ok) throw Error(result.error || 'Search failed');
      for (const p of result) {
        const id = p.placeId || [p.name,p.location].join('|');
        if (!found.has(id)) found.set(id, {...p, service:p.websiteOpportunity ? 'Website development' : 'Custom software', evidence:`${p.evidence} Potential project: ${useCase.toLowerCase()}. Verify whether this is already supported and whether the business needs it.`});
      }
      completed++;
    }
  } catch (error) { failure = error.message; }
  finally {
    discoveryResults = [...found.values()].sort((a,b) => (b.score || 0) - (a.score || 0));
    $('#discovery-results').innerHTML = discoveryResults.map((p,i) => `<article data-qualified="${Boolean(p.websiteOpportunity && p.reachable)}" class="prospect"><div><h3>${escape(p.name)}</h3><p>${escape(p.location)}</p><span class="tag">${escape(p.priority)}</span><span class="tag">${escape(p.service)}</span><p>${escape(p.evidence)}</p><p>${escape(p.contact)} ${escape(p.website)}</p>${qualification(p)}${contactLinks(p)}</div><div class="actions"><button data-ai="${i}">✦ AI brief</button><button class="secondary" data-review="${i}">Review prospect</button></div></article>`).join('');
    $('#provider-status').textContent = 'Source: Google Maps. Ranked by available listing evidence, not confirmed buying intent.';
    $('#campaign-status').textContent = `${failure ? 'Run interrupted: ' + failure : stopCampaign ? 'Run stopped.' : 'Run complete.'} ${completed} searches completed; ${found.size} unique businesses available for review.`;
    $('#run-campaign').disabled = false; $('#stop-campaign').disabled = true;
    $('#discover-button').disabled = false; $('#try-demo').disabled = false;
  }
};

$('#qualified-only').onchange = () => $('#discovery-results').classList.toggle('qualified-only', $('#qualified-only').checked);

function updateResultSummary() {
  const cards = [...$('#discovery-results').querySelectorAll('article')];
  const visible = cards.filter(card => !$('#qualified-only').checked || card.dataset.qualified === 'true');
  $('#result-count').textContent = cards.length ? `${visible.length} of ${cards.length} businesses shown` : 'Run a search to discover opportunities';
  $('#filtered-empty').hidden = !cards.length || visible.length > 0;
}
new MutationObserver(updateResultSummary).observe($('#discovery-results'), {childList:true});
$('#qualified-only').addEventListener('change', updateResultSummary);

$('#discovery-results').addEventListener('click', async event => {
  const index = event.target.dataset.ai;
  if (index === undefined) return;
  const p = discoveryResults[Number(index)];
  const button = event.target;
  $('#ai-dialog').showModal(); $('#ai-content').textContent = 'Preparing an evidence-based brief…';
  button.disabled = true;
  try {
    if (!p.aiBrief) {
      const response = await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:p.name,location:p.location,website:p.website,evidence:p.evidence,websiteStatus:p.websiteStatus,service:p.service})});
      const data = await response.json(); if (!response.ok) throw Error(data.error); p.aiBrief = data;
    }
    const brief = p.aiBrief;
    $('#ai-content').innerHTML = `<p class="footnote">AI suggestion based on listing data. No website audit has been performed. Verify before using.</p><h3>Potential offer</h3><p>${escape(brief.opportunity)}</p><h3>Evidence</h3><p>${escape(brief.evidence)}</p><h3>What to check</h3><p>${escape(brief.verify)}</p><h3>Your message</h3><textarea id="ai-message" rows="7" aria-label="Editable AI draft">${escape(brief.message)}</textarea><button id="use-ai-message">Use in outreach editor</button>`;
    $('#use-ai-message').onclick = () => { $('#draft').value = $('#ai-message').value; $('#copy-status').textContent = ''; $('#ai-dialog').close(); $('#outreach').showModal(); };
  } catch(error) { $('#ai-content').textContent = error.message; }
  finally { button.disabled = false; }
});
$('#close-ai').onclick = () => $('#ai-dialog').close();
