let savedCampaigns=[];
let campaignInitialized=false;
async function campaignRequest(url,body){const r=await fetch(url,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw Error(data.error||'Campaign request failed');return data;}
async function refreshCampaigns(){
 try{
 const data=await campaignRequest('/api/campaigns');savedCampaigns=data.campaigns;
 if(!campaignInitialized){
 $('#market-choices').innerHTML=Object.entries(data.markets).map(([code,towns])=>`<div><label><span><input type="checkbox" name="market" value="${code}" checked> ${{KE:'Kenya',BW:'Botswana',ZM:'Zambia'}[code]}</span></label><label>Towns, separated by commas<textarea data-towns="${code}" rows="3">${escape(towns.join(', '))}</textarea></label></div>`).join('');
 $('#sector-choices').innerHTML=data.sectors.map(s=>`<label><span><input name="sector" type="checkbox" value="${escape(s)}" checked> ${escape(s)}</span></label>`).join('');campaignInitialized=true;
 }
 $('#saved-campaigns').innerHTML=savedCampaigns.map(c=>{const done=c.jobs.filter(j=>j.done).length;return `<article class="prospect"><div><h3>${escape(c.name)}</h3><span class="tag">${escape(c.status)}</span><p>${done}/${c.jobs.length} searches completed · ${c.results.length} unique businesses · ${c.requests} requests attempted</p><progress value="${done}" max="${c.jobs.length}" aria-label="Campaign completion"></progress><p>${escape(c.message)}</p></div><div class="actions"><button data-campaign="${c.id}" data-action="start" ${c.status==='running'||c.status==='complete'?'disabled':''}>${done?'Resume':'Start'} · up to ${c.budget} searches</button><button class="secondary" data-campaign="${c.id}" data-action="pause" ${c.status!=='running'?'disabled':''}>Pause</button><button class="secondary" data-campaign="${c.id}" data-action="results">View saved results</button></div></article>`;}).join('')||'<p class="empty">Create your first campaign. No searches run until you press Start.</p>';
 }catch(e){$('#campaign-feedback').textContent=e.message;}
}
$('#campaign-builder').onsubmit=async event=>{
 event.preventDefault();const form=event.currentTarget;const button=form.querySelector('button');button.disabled=true;
 try{const countries=[...form.querySelectorAll('[name="market"]:checked')].map(e=>e.value);const sectors=[...form.querySelectorAll('[name="sector"]:checked')].map(e=>e.value);const towns=Object.fromEntries(countries.map(c=>[c,form.querySelector(`[data-towns="${c}"]`).value.split(',').map(t=>t.trim()).filter(Boolean)]));
 await campaignRequest('/api/campaigns',{name:form.elements.namedItem('name').value,budget:Number(form.elements.budget.value),countries,sectors,towns});$('#campaign-feedback').textContent='Campaign saved. Press Start when ready.';await refreshCampaigns();
 }catch(e){$('#campaign-feedback').textContent=e.message;}finally{button.disabled=false;}
};
$('#saved-campaigns').onclick=async event=>{
 const {campaign,action}=event.target.dataset;if(!campaign)return;
 if(action==='results'){
 const c=savedCampaigns.find(c=>c.id===campaign);discoveryResults=c.results;
 $('#discovery-results').innerHTML=discoveryResults.map((p,i)=>`<article class="prospect" data-qualified="${Boolean(p.websiteOpportunity&&p.reachable)}"><div><h3>${escape(p.name)}</h3><p>${escape(p.location)}</p><span class="tag">${escape(p.searchCategory)}</span><span class="tag">${escape(p.service)}</span><p>${escape(p.evidence)}</p>${qualification(p)}${contactLinks(p)}</div><div class="actions"><button data-ai="${i}">✦ AI brief</button><button class="secondary" data-review="${i}">Review prospect</button></div></article>`).join('');
 $('#provider-status').textContent=`Saved campaign: ${c.name}. Source: Google Maps. Verify listing details before outreach.`;$('#discovery-results').scrollIntoView({behavior:'smooth'});return;
 }
 event.target.disabled=true;try{await campaignRequest(`/api/campaigns/${campaign}/${action}`,{});$('#campaign-feedback').textContent=action==='start'?'Campaign running on your laptop. You may close this browser tab.':'Pause requested; the current request will finish.';await refreshCampaigns();}catch(e){$('#campaign-feedback').textContent=e.message;await refreshCampaigns();}
};
refreshCampaigns();setInterval(refreshCampaigns,4000);
