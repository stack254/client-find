import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
export const markets={KE:['Nairobi','Mombasa','Kisumu','Nakuru'],BW:['Gaborone','Francistown','Maun','Kasane'],ZM:['Lusaka','Ndola','Kitwe','Livingstone']};
export const sectors=['hotels and guest houses','schools and training colleges','clinics and hospitals','tour operators and travel agencies','equipment suppliers','logistics companies'];
export class Campaigns {
 constructor(file,search){this.file=file;this.search=search;this.items=[];this.active=null;this.writes=Promise.resolve();}
 async init(){try{this.items=JSON.parse(await readFile(this.file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
 for(const c of this.items) if(c.status==='running'){c.status='paused';c.message='Server restarted. Resume to continue; an interrupted request may be retried.';} return this;}
 async save(){const snapshot=JSON.stringify(this.items);this.writes=this.writes.catch(()=>{}).then(async()=>{await mkdir(path.dirname(this.file),{recursive:true});await writeFile(this.file+'.tmp',snapshot);await rename(this.file+'.tmp',this.file);});return this.writes;}
 async create(input){
 const countries=[...new Set(input.countries||[])];const categories=[...new Set(input.sectors||[])];
 if(!countries.length||countries.some(c=>!Object.hasOwn(markets,c))||!categories.length||categories.some(c=>!sectors.includes(c)))throw Error('Select supported markets and sectors.');
 const budget=Number(input.budget);if(!Number.isInteger(budget)||budget<1||budget>30)throw Error('Search allowance must be 1–30.');
 const jobs=[];
 for(const country of countries){const towns=input.towns?.[country] || markets[country];if(!Array.isArray(towns)||!towns.length||towns.length>20||towns.some(t=>typeof t!=='string'||!t.trim()||t.length>100))throw Error('Provide 1–20 towns per market.');
 for(const location of [...new Set(towns.map(t=>t.trim()))])for(const category of categories)jobs.push({country,location,category,done:false});}
 const c={id:randomUUID(),name:String(input.name||'Prospecting campaign').slice(0,100),createdAt:new Date().toISOString(),status:'ready',budget,jobs,results:[],requests:0,runs:0,message:'Ready to start'};this.items.unshift(c);await this.save();return c;
 }
 get(id){const c=this.items.find(c=>c.id===id);if(!c)throw Error('Campaign not found');return c;}
 async start(id){if(this.active)throw Error('Another campaign is running. Pause it first.');const c=this.get(id);if(c.jobs.every(j=>j.done))throw Error('Campaign already complete');this.active=id;c.status='running';c.runs++;c.message='Starting';try{await this.save();}catch(e){c.status='paused';this.active=null;throw e;}this.task=this.run(c).catch(async()=>{c.status='paused';c.message='Storage error. Stop and restart the server before resuming.';this.active=null;});return c;}
 async pause(id){const c=this.get(id);if(c.status==='running'){c.status='paused';c.message='Pausing after the current request';await this.save();}return c;}
 async run(c){let used=0;try{
 for(const job of c.jobs){if(job.done)continue;if(c.status!=='running'||used>=c.budget)break;
 c.message=`Searching ${job.category} in ${job.location}, ${job.country}`;c.requests++;used++;await this.save();
 let results;try{results=await this.search(job);}catch(e){c.status='paused';c.message=e.message;await this.save();return;}
 const found=new Map(c.results.map(p=>[p.placeId||p.name+'|'+p.location,p]));
 for(const p of results){const key=p.placeId||p.name+'|'+p.location;if(!found.has(key))found.set(key,{...p,discoveredAt:new Date().toISOString(),searchCountry:job.country,searchCategory:job.category});}
 c.results=[...found.values()].sort((a,b)=>(b.score||0)-(a.score||0));job.done=true;job.count=results.length;await this.save();
 }
 c.status=c.jobs.every(j=>j.done)?'complete':'paused';c.message=c.status==='complete'?'All planned searches completed':used>=c.budget?'Search allowance reached. Resume when ready.':'Paused. Progress saved.';await this.save();
 }finally{this.active=null;}}
}
