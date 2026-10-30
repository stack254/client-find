const socialDomains = ['facebook.com','fb.com','instagram.com','tiktok.com','wa.me','whatsapp.com','linktr.ee','linkedin.com','twitter.com','x.com'];
export function opportunity(place) {
  const website = place.websiteUri || '';
  let socialOnly = false;
  try { const host = new URL(website).hostname.toLowerCase(); socialOnly = socialDomains.some(d => host === d || host.endsWith('.' + d)); } catch {}
  const websiteStatus = !website ? 'No website listed' : socialOnly ? 'Social/profile link only' : 'Website listed';
  const reachable = Boolean(place.internationalPhoneNumber || place.nationalPhoneNumber);
  const reviews = Math.max(0, Number(place.userRatingCount) || 0);
  const websiteOpportunity = !website || socialOnly;
  const reasons = [];
  let score = 0;
  if (websiteOpportunity) { score += 45; reasons.push(websiteStatus + ' (+45)'); }
  if (reachable) { score += 30; reasons.push('Listed phone number (+30)'); }
  if (reviews >= 10) { score += 15; reasons.push('At least 10 reviews (+15)'); }
  else if (reviews > 0) { score += 5; reasons.push('Some review history (+5)'); }
  if (socialOnly) { score += 10; reasons.push('Existing social presence (+10)'); }
  const retail = (place.types || []).some(type => ['store','clothing_store','electronics_store','home_goods_store','shoe_store','furniture_store'].includes(type));
  const service = websiteOpportunity ? 'Website development' : retail ? 'Online store' : 'Digital marketing';
  const evidence = !website ? 'No website returned by Google. Verify whether one exists elsewhere.' : socialOnly ? 'Google lists a social/profile link. Verify whether a separate business website exists.' : 'Website listed. Inspect it before proposing changes or new features.';
  return {service,evidence,priority:websiteOpportunity && reachable ? 'Review first' : 'Research needed',score,scoreReasons:reasons,websiteStatus,websiteOpportunity,reachable,reviews};
}
export const countries = { KE: 'Kenya', BW: 'Botswana', ZM: 'Zambia' };
export async function discover({ location, category, country = 'KE', apiKey, fetcher = fetch }) {
  if (!Object.hasOwn(countries, country)) throw new Error('Choose Kenya, Botswana or Zambia.');
  const response = await fetcher('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.websiteUri,places.nationalPhoneNumber,places.internationalPhoneNumber,places.googleMapsUri,places.types,places.businessStatus,places.userRatingCount' },
    body: JSON.stringify({ textQuery: `${category} in ${location}, ${countries[country]}`, regionCode: country, pageSize: 20 }), signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) throw new Error(response.status === 403 ? 'Google Places denied access. Check API activation, billing and key restrictions.' : response.status === 429 ? 'Google Places quota exceeded. Check provider limits and billing.' : 'Google Places search failed. Please try again later.');
  const result = await response.json();
  return (result.places || []).filter(p => p.businessStatus !== 'CLOSED_PERMANENTLY').map(p => ({
    placeId: p.id, name: p.displayName?.text || 'Unnamed business', location: p.formattedAddress || '',
    contact: p.internationalPhoneNumber || p.nationalPhoneNumber || '', website: p.websiteUri || '', mapsUrl: p.googleMapsUri || '', ...opportunity(p)
  }));
}
