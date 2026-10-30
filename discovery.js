export function opportunity(place) {
  const website = place.websiteUri || '';
  let socialOnly = false;
  try { socialOnly = /(^|\.)(facebook\.com|instagram\.com|tiktok\.com)$/i.test(new URL(website).hostname); } catch {}
  const retail = (place.types || []).some(type => ['store', 'clothing_store', 'electronics_store', 'home_goods_store', 'shoe_store', 'furniture_store'].includes(type));
  const service = !website || socialOnly ? 'Website development' : retail ? 'Online store' : 'Digital marketing';
  const evidence = !website ? 'Google Places did not return a website. Check whether the business already has one.' : socialOnly ? 'The listed website is a social profile. Check whether the business also has a dedicated website.' : retail ? 'A retail business with a listed website. Check whether customers can order online.' : 'A listed website is available. Review the business’s online presence and marketing needs before outreach.';
  return { service, evidence, priority: !website || socialOnly ? 'Review first' : 'Research needed' };
}
export const countries = { KE: 'Kenya', BW: 'Botswana', ZM: 'Zambia' };
export async function discover({ location, category, country = 'KE', apiKey, fetcher = fetch }) {
  if (!Object.hasOwn(countries, country)) throw new Error('Choose Kenya, Botswana or Zambia.');
  const response = await fetcher('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.websiteUri,places.nationalPhoneNumber,places.internationalPhoneNumber,places.googleMapsUri,places.types,places.businessStatus' },
    body: JSON.stringify({ textQuery: `${category} in ${location}, ${countries[country]}`, regionCode: country, pageSize: 20 }), signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) throw new Error(response.status === 403 ? 'Google Places denied access. Check API activation, billing and key restrictions.' : response.status === 429 ? 'Google Places quota exceeded. Check provider limits and billing.' : 'Google Places search failed. Please try again later.');
  const result = await response.json();
  return (result.places || []).filter(p => p.businessStatus !== 'CLOSED_PERMANENTLY').map(p => ({
    placeId: p.id, name: p.displayName?.text || 'Unnamed business', location: p.formattedAddress || '',
    contact: p.internationalPhoneNumber || p.nationalPhoneNumber || '', website: p.websiteUri || '', mapsUrl: p.googleMapsUri || '', ...opportunity(p)
  }));
}
