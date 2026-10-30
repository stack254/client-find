import test from 'node:test';
import assert from 'node:assert/strict';
import { opportunity, discover } from './discovery.js';

test('missing websites are explicitly uncertain and social domains are checked by hostname', () => {
  assert.equal(opportunity({}).service, 'Website development');
  assert.match(opportunity({}).evidence, /Verify whether/);
  assert.equal(opportunity({websiteUri:'https://facebook.com/shop'}).service, 'Website development');
  assert.equal(opportunity({websiteUri:'https://facebook.com.example.org'}).service, 'Digital marketing');
  assert.equal(opportunity({websiteUri:'https://shop.example',types:['store']}).service, 'Online store');
});
test('discovery uses server header auth, Kenya query and filters permanently closed businesses', async () => {
  const results = await discover({location:'Nairobi',category:'furniture stores',apiKey:'test-key',fetcher:async (url, options) => {
    assert.equal(url, 'https://places.googleapis.com/v1/places:searchText');
    assert.equal(options.headers['X-Goog-Api-Key'], 'test-key');
    assert.equal(JSON.parse(options.body).textQuery, 'furniture stores in Nairobi, Kenya');
    return {ok:true,json:async () => ({places:[{id:'open',displayName:{text:'Example'},types:['store']},{id:'closed',businessStatus:'CLOSED_PERMANENTLY'}]})};
  }});
  assert.equal(results.length,1); assert.equal(results[0].name,'Example'); assert.equal(results[0].placeId,'open');
});
test('provider denial gives an actionable error', async () => {
  await assert.rejects(discover({location:'Nairobi',category:'shops',apiKey:'test',fetcher:async () => ({ok:false,status:403})}), /billing and key restrictions/);
});

test('each target country reaches the provider and unsupported countries do not', async () => {
  for (const [country, name] of [['KE','Kenya'],['BW','Botswana'],['ZM','Zambia']]) {
    await discover({location:'City',category:'shops',country,apiKey:'test',fetcher:async (_,options) => {
      const body = JSON.parse(options.body);
      assert.equal(body.regionCode,country);
      assert.equal(body.textQuery,`shops in City, ${name}`);
      return {ok:true,json:async () => ({places:[]})};
    }});
  }
  await assert.rejects(discover({country:'XX',fetcher:() => {throw Error('must not call provider');}}), /Choose Kenya/);
});

test('qualification favors reachable social-only businesses without confusing lookalike domains', () => {
 const strong = opportunity({websiteUri:'https://www.facebook.com/example',internationalPhoneNumber:'+2671234567',userRatingCount:12});
 assert.equal(strong.score,100); assert.equal(strong.websiteOpportunity,true);
 assert.equal(opportunity({websiteUri:'https://facebook.com.example.org',userRatingCount:12}).websiteOpportunity,false);
 assert.equal(opportunity({}).score,45);
 assert.equal(opportunity({websiteUri:'https://example.org',internationalPhoneNumber:'+260123456789'}).score,30);
});
