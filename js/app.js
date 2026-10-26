/* AEROVIA - GPS fitness tracker (PWA, tanpa backend)
   © 2026 Mujahadah Alfa. Hak cipta dilindungi. */
const $=s=>document.querySelector(s);
const LS=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}};
const S={view:'home',acts:[],cur:null,type:'running',f:'all',sort:'new',prof:LS('av_prof',{name:'Atlet',unit:'km',goal:20,theme:'dark',user:''})};
const TYPES={running:['Lari',12],walking:['Jalan kaki',5],cycling:['Bersepeda',25],hiking:['Hiking',5]};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const U=()=>S.prof.unit==='mi'?1609.344:1000, ul=()=>S.prof.unit;
const fd=m=>(m/U()).toFixed(2);
const ft=s=>{s=Math.max(0,Math.round(s));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return(h?h+':'+String(m).padStart(2,'0'):m)+':'+String(x).padStart(2,'0')};
const fp=(s,d)=>d<20?'--:--':ft(s/(d/U()));
const fs=(s,d)=>s?((d/1000)/(s/3600)*(1000/U())).toFixed(1):'0.0';
const fdate=i=>new Date(i).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'});
const sum=(a,k)=>a.reduce((n,x)=>n+x[k],0);
const hav=(a,b)=>{const r=Math.PI/180,p=(b.latitude-a.latitude)*r,q=(b.longitude-a.longitude)*r,x=Math.sin(p/2)**2+Math.cos(a.latitude*r)*Math.cos(b.latitude*r)*Math.sin(q/2)**2;return 12742000*Math.asin(Math.sqrt(x))};
const LVN=['Pemula','Pejalan','Pelari','Pendaki','Penjelajah','Elite','Legenda'];
const xp=()=>Math.round(S.acts.reduce((n,a)=>n+a.distanceMeters/1000*10+a.durationSeconds/60,0)),lv=x=>Math.floor(Math.sqrt(x/40))+1;
let AX=null;
function beep(kind){if(S.prof.sound===false)return;try{AX=AX||new(window.AudioContext||window.webkitAudioContext)();AX.resume?.();
  const P={tick:[[660,.12]],go:[[990,.35]],km:[[784,.12],[988,.12],[1175,.25]],up:[[880,.1],[1175,.18]],down:[[440,.15],[330,.22]],pause:[[520,.1],[390,.14]],resume:[[390,.1],[520,.14]],done:[[523,.14],[659,.14],[784,.14],[1047,.4]],lvl:[[523,.1],[659,.1],[784,.1],[1047,.1],[1319,.45]],met:[[1300,.045,.14]]}[kind];let t=AX.currentTime;
  for(const[f,d,v]of P){const o=AX.createOscillator(),g=AX.createGain();o.type='triangle';o.frequency.value=f;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v||.35,t+.008);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g).connect(AX.destination);o.start(t);o.stop(t+d+.02);t+=d*.9}}catch{}}
function ghostPrep(a){if(!a)return null;const r=a.route;let d=0;const g=r.map((p,i)=>{if(i)d+=hav(r[i-1],p);return{t:(p.timestamp-r[0].timestamp)/1000,d,la:p.latitude,lo:p.longitude}});return g.length>1?g:null}
function ghostAt(g,t){const i=g.findIndex(x=>x.t>=t);if(i<0)return{...g.at(-1),done:true};if(i===0)return g[0];const a=g[i-1],b=g[i],k=(t-a.t)/Math.max(b.t-a.t,1e-6);return{d:a.d+(b.d-a.d)*k,la:a.la+(b.la-a.la)*k,lo:a.lo+(b.lo-a.lo)*k}}
const streak=()=>{const ds=new Set(S.acts.map(a=>new Date(a.startedAt).toDateString()));let n=0,d=new Date();if(!ds.has(d.toDateString()))d.setDate(d.getDate()-1);while(ds.has(d.toDateString())){n++;d.setDate(d.getDate()-1)}return n};
const weekStart=()=>{const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-(d.getDay()+6)%7);return d};
const weekActs=()=>S.acts.filter(a=>new Date(a.startedAt)>=weekStart());
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('on'),2800)}
function dl(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000)}

/* ---------- IndexedDB ---------- */
const DB=new Promise((res,rej)=>{const r=indexedDB.open('aerovia',1);r.onupgradeneeded=()=>r.result.createObjectStore('acts',{keyPath:'id'});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const tx=async(m,f)=>{const d=await DB;return new Promise((res,rej)=>{const t=d.transaction('acts',m),q=f(t.objectStore('acts'));t.oncomplete=()=>res(q.result);t.onerror=()=>rej(t.error)})};
const dbAll=()=>tx('readonly',s=>s.getAll()),dbPut=a=>tx('readwrite',s=>s.put(a)),dbDel=id=>tx('readwrite',s=>s.delete(id)),dbClr=()=>tx('readwrite',s=>s.clear());
async function load(){S.acts=(await dbAll()).sort((a,b)=>b.startedAt.localeCompare(a.startedAt))}
const saveProf=()=>{localStorage.setItem('av_prof',JSON.stringify(S.prof));document.documentElement.dataset.theme=S.prof.theme};

/* ---------- Peta ---------- */
let M=null,ME=null,AC=null,LASTP=null,FOLLOW=true,PW=null;
function me(p){LASTP=p;const c=p.coords,ll=[c.latitude,c.longitude],g=$('#p-gps');
  if(g)g.textContent=`Lokasi ditemukan. Akurasi GPS ${Math.round(c.accuracy)} m`;
  if(!M||S.view!=='track')return;
  if(!ME){ME=L.marker(ll,{icon:L.divIcon({className:'me',html:'<i></i>',iconSize:[22,22],iconAnchor:[11,11]}),zIndexOffset:1000,interactive:false}).addTo(M);AC=L.circle(ll,{radius:c.accuracy,color:'#F28C28',weight:1,fillOpacity:.1}).addTo(M)}
  else{ME.setLatLng(ll);AC.setLatLng(ll).setRadius(c.accuracy)}
  if(FOLLOW)M.setView(ll,Math.max(M.getZoom(),16),{animate:true})}
function startPreview(){if(PW!=null||!navigator.geolocation)return;PW=navigator.geolocation.watchPosition(me,e=>{const g=$('#p-gps');if(g)g.textContent=e.code===1?'Izin lokasi ditolak. Aktifkan lokasi di pengaturan browser.':'Sinyal GPS lemah, coba ke area terbuka.'},{enableHighAccuracy:true,maximumAge:0,timeout:20000})}
function stopPreview(){if(PW!=null){navigator.geolocation.clearWatch(PW);PW=null}}
function mkMap(id){
  const el=document.getElementById(id);if(!el)return null;
  if(typeof L==='undefined'){el.innerHTML='<p class="mu" style="padding:20px">Peta butuh internet untuk dimuat pertama kali.</p>';return null}
  M=L.map(id,{zoomControl:false}).setView([-6.9,107.1],14);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(M);return M}
function drawRoute(route,fit=true){
  if(!M||route.length<2)return;
  const ll=route.map(p=>[p.latitude,p.longitude]);
  const l=L.polyline(ll,{color:'#F28C28',weight:5}).addTo(M);
  L.circleMarker(ll[0],{radius:7,color:'#fff',fillColor:'#4cc38a',fillOpacity:1}).addTo(M);
  L.circleMarker(ll.at(-1),{radius:7,color:'#fff',fillColor:'#F28C28',fillOpacity:1}).addTo(M);
  if(fit)M.fitBounds(l.getBounds(),{padding:[24,24]})}

/* ---------- GPS tracker ---------- */
let T=null,wl=null;
const act=()=>{if(!T)return{sec:0,dist:0};const end=T.paused?T.pauseAt:Date.now();return{sec:(end-T.start-T.pausedMs)/1000,dist:T.dist}};
function startTrack(){
  if(!navigator.geolocation)return toast('Perangkat tidak mendukung GPS');
  T={type:S.type,pts:[],dist:0,start:Date.now(),paused:false,pauseAt:0,pausedMs:0,acc:null,skip:false};
  T.gh=ghostPrep(S.acts.find(a=>a.id===S.ghost));if(S.prof.bpm)T.met=setInterval(()=>!T?.paused&&beep('met'),60000/S.prof.bpm);
  T.wid=navigator.geolocation.watchPosition(onPos,e=>toast(e.code===1?'Izin lokasi ditolak. Aktifkan lokasi di pengaturan browser.':'Sinyal GPS lemah, coba ke area terbuka.'),{enableHighAccuracy:true,maximumAge:0,timeout:20000});
  T.iv=setInterval(tick,1000);
  navigator.wakeLock?.request('screen').then(w=>wl=w).catch(()=>{});
  go('track')}
function onPos(p){
  if(!T)return;const c=p.coords;T.acc=c.accuracy;me(p);if(T.paused||c.accuracy>30)return tick();
  const pt={latitude:c.latitude,longitude:c.longitude,timestamp:p.timestamp,accuracy:Math.round(c.accuracy)},l=T.pts.at(-1);
  if(l&&!T.skip){const d=hav(l,pt),dt=(pt.timestamp-l.timestamp)/1000;if(d<3||dt<=0||d/dt>TYPES[T.type][1])return;T.dist+=d}
  T.skip=false;T.pts.push(pt);
  const km=Math.floor(T.dist/U());if(km>(T.lastKm||0)){T.lastKm=km;beep('km');if(S.prof.voice!==false&&window.speechSynthesis){const q=act(),n=ul()==='km'?'kilometer':'mil';speechSynthesis.speak(Object.assign(new SpeechSynthesisUtterance(`${km} ${n}. Waktu ${ft(q.sec)}. Pace ${fp(q.sec,T.dist)} per ${n}.`),{lang:'id-ID'}))}}
  if(S.view==='track'&&M)T.line?.setLatLngs(T.pts.map(q=>[q.latitude,q.longitude]));
  tick()}
function tick(){if(!T||S.view!=='track')return;const a=act(),set=(i,v)=>{const e=document.getElementById(i);if(e)e.textContent=v};
  if(T.gh){const g=ghostAt(T.gh,a.sec),dd=a.dist-g.d;T.gm?.setLatLng([g.la,g.lo]);set('t-ghost',g.done&&dd<0?'Ghost sudah finis':dd>=0?`Di depan ${Math.round(dd)} m`:`Tertinggal ${Math.round(-dd)} m`);if(T.gs!==undefined&&(dd>=0)!==T.gs)beep(dd>=0?'up':'down');T.gs=dd>=0}
  set('t-time',ft(a.sec));set('t-dist',fd(a.dist));set('t-pace',fp(a.sec,a.dist));set('t-speed',fs(a.sec,a.dist));
  set('t-gps',T.acc==null?'Mencari sinyal GPS...':`Akurasi GPS ${Math.round(T.acc)} m${T.acc>30?' (lemah, titik diabaikan)':''}`)}
function countdown(){if(!navigator.geolocation)return toast('Perangkat tidak mendukung GPS');let n=3;const d=document.createElement('div');d.id='cd';document.body.append(d);const f=()=>{if(!n){d.remove();beep('go');navigator.vibrate?.(200);return startTrack()}d.innerHTML=`<span>${n}</span>`;navigator.vibrate?.(40);beep('tick');n--;setTimeout(f,900)};f()}
function splits(a){const r=a.route,u=U(),out=[];if(r.length<2)return out;let d=0,t0=r[0].timestamp,nx=u;for(let i=1;i<r.length;i++){d+=hav(r[i-1],r[i]);while(d>=nx){out.push((r[i].timestamp-t0)/1000);t0=r[i].timestamp;nx+=u}}return out}
function pauseTrack(){if(T.paused){T.pausedMs+=Date.now()-T.pauseAt;T.paused=false;T.skip=true}else{T.paused=true;T.pauseAt=Date.now()}beep(T.paused?'pause':'resume');render()}
function finishTrack(){
  const a=act();navigator.geolocation.clearWatch(T.wid);clearInterval(T.iv);clearInterval(T.met);beep('done');wl?.release();
  const d=new Date();S.cur={id:crypto.randomUUID(),type:T.type,startedAt:new Date(T.start).toISOString(),durationSeconds:Math.round(a.sec),pausedSeconds:Math.round(T.pausedMs/1000),distanceMeters:Math.round(a.dist),route:T.pts,title:`${TYPES[T.type][0]} ${d.getHours()<11?'pagi':d.getHours()<15?'siang':d.getHours()<18?'sore':'malam'}`,notes:'',createdAt:d.toISOString(),draft:true};
  T=null;go('detail')}
addEventListener('beforeunload',e=>{if(T){e.preventDefault();e.returnValue=''}});

/* ---------- Views ---------- */
const ic={home:'M3 11l9-8 9 8v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z',explore:'M12 2a10 10 0 100 20 10 10 0 000-20zm3.5 6.5l-2 5-5 2 2-5z',loc:'M12 2v4m0 12v4M2 12h4m12 0h4M12 8a4 4 0 100 8 4 4 0 000-8z',hist:'M4 6h16M4 12h16M4 18h10',prog:'M4 20V10m6 10V4m6 16v-8m4 8H2',play:'M8 5v14l11-7z'};
const svg=(k,w=24)=>`<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${ic[k]}"/></svg>`;
const st=(v,u,l)=>`<div class="st"><span class="num">${v}<em>${u}</em></span><small>${l}</small></div>`;
const mini=a=>{const r=a.route;if(r.length<2)return'';const k=Math.ceil(r.length/70),p=r.filter((_,i)=>i%k===0),la=p.map(q=>q.latitude),lo=p.map(q=>q.longitude),m=Math.cos(la[0]*Math.PI/180),a0=Math.min(...la),a1=Math.max(...la),o0=Math.min(...lo),o1=Math.max(...lo),s=Math.min(90/Math.max((o1-o0)*m,1e-6),50/Math.max(a1-a0,1e-6)),ox=5+(90-(o1-o0)*m*s)/2,oy=5+(50-(a1-a0)*s)/2;return`<svg viewBox="0 0 100 60" class="mini"><polyline points="${p.map(q=>((q.longitude-o0)*m*s+ox).toFixed(1)+','+((a1-q.latitude)*s+oy).toFixed(1)).join(' ')}" fill="none" stroke="#F28C28" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`};
const row=a=>`<button class="feed" data-act="open" data-id="${a.id}"><span><b>${esc(a.title)}</b><small>${TYPES[a.type]?.[0]||a.type} - ${fdate(a.startedAt)}</small></span><div class="fgrid"><div><span class="num">${fd(a.distanceMeters)}<em>${ul()}</em></span><small>Jarak</small></div><div><span class="num">${fp(a.durationSeconds,a.distanceMeters)}<em>/${ul()}</em></span><small>Pace</small></div><div><span class="num">${ft(a.durationSeconds)}</span><small>Waktu</small></div></div>${mini(a)}</button>`;
const empty='<div class="card"><b>Belum ada aktivitas</b><small>Tekan Mulai untuk merekam lari, jalan, sepeda, atau hiking pertamamu.</small></div>';

const V={
home(){const w=weekActs(),d=sum(w,'distanceMeters'),pc=Math.min(1,d/(S.prof.goal*U())),C=2*Math.PI*54;
  return `<div><small>Halo, ${esc(S.prof.name)}</small><h1>Move with purpose.</h1></div>
  <div class="card ringc"><svg viewBox="0 0 130 130" width="130" height="130" role="img" aria-label="Progres target mingguan"><circle cx="65" cy="65" r="54" fill="none" stroke="var(--s2)" stroke-width="12"/><circle cx="65" cy="65" r="54" fill="none" stroke="#F28C28" stroke-width="12" stroke-linecap="round" stroke-dasharray="${(C*pc).toFixed(1)} ${C}" transform="rotate(-90 65 65)"/><text x="65" y="73" text-anchor="middle" font-family="Barlow Condensed" font-weight="700" font-size="30" fill="var(--tx)">${Math.round(pc*100)}%</text></svg>
  <div class="grid2" style="flex:1">${st(fd(d),ul(),'Minggu ini')}${st(w.length,'','Sesi')}${st(ft(sum(w,'durationSeconds')),'','Waktu')}${st(streak(),'hari','Beruntun')}</div></div>
  ${(()=>{const x=xp(),L=lv(x),a=40*(L-1)**2,b=40*L*L;return`<div class="card"><div class="row"><b>Level ${L} - ${LVN[Math.min(L-1,6)]}</b><small>${x} / ${b} XP</small></div><div class="bar"><i style="width:${Math.round((x-a)/(b-a)*100)}%"></i></div></div>`})()}
  <button class="go" data-act="track">Mulai</button>
  <h3>Aktivitas terbaru</h3>${S.acts.slice(0,5).map(row).join('')||empty}
  <small class="copy">&copy; 2026 Mujahadah Alfa. Hak cipta dilindungi.</small>`},
track(){
  if(!T)return `<div id="pmap" class="map"></div><small id="p-gps">Mencari lokasi kamu...</small><h2>Pilih aktivitas</h2><div class="chips">${Object.entries(TYPES).map(([k,v])=>`<button class="pill ${S.type===k?'on':''}" data-act="type" data-v="${k}">${v[0]}</button>`).join('')}</div>
  <div class="card"><b>Sebelum mulai</b><small>Izinkan akses lokasi saat diminta dan biarkan layar tetap menyala. Pelacakan saat layar mati tidak dijamin di aplikasi web.</small></div>
  <div class="card"><label>Lawan ghost (lari lama di rute yang sama)<select id="gh"><option value="">Tanpa ghost</option>${S.acts.filter(a=>a.type===S.type&&a.route.length>1).slice(0,15).map(a=>`<option value="${a.id}" ${S.ghost===a.id?'selected':''}>${esc(a.title)} - ${fd(a.distanceMeters)} ${ul()}</option>`).join('')}</select></label>
  <label>Metronom langkah<select id="bpm">${[0,150,160,170,180].map(n=>`<option value="${n}" ${(S.prof.bpm||0)===n?'selected':''}>${n?n+' langkah/menit':'Mati'}</option>`).join('')}</select></label></div>
  <button class="go" data-act="begin">Mulai ${TYPES[S.type][0]}</button>`;
  return `<div id="tmap" class="fsmap"></div><button class="loc" data-act="loc" aria-label="Pusatkan ke lokasiku">${svg('loc',22)}</button><div class="glass gtop"><small id="t-gps" style="color:#cfd3d8">Mencari sinyal GPS...</small>${T.gh?'<b id="t-ghost"></b>':''}<small style="color:#F28C28">${TYPES[T.type][0]}${T.paused?' (jeda)':''}</small></div>
  <div class="glass gbot"><div><span class="num big" id="t-dist">0.00</span><small>Jarak (${ul()})</small></div>
  <div class="grid3"><div><span class="num" id="t-time">0:00</span><small>Waktu</small></div><div><span class="num" id="t-pace">--:--</span><small>Pace /${ul()}</small></div><div><span class="num" id="t-speed">0.0</span><small>${ul()==='km'?'km/j':'mph'}</small></div></div>
  <div class="btns"><button class="btn" data-act="pause">${T.paused?'Lanjutkan':'Jeda'}</button><button class="btn pri" data-act="finish">Selesai</button></div></div>`},
detail(){const a=S.cur;return `<h2>${a.draft?'Ringkasan aktivitas':'Detail aktivitas'}</h2><div id="dmap" class="map"></div>
  <div class="grid2">${st(fd(a.distanceMeters),ul(),'Jarak')}${st(ft(a.durationSeconds),'','Durasi aktif')}${st(fp(a.durationSeconds,a.distanceMeters),'/'+ul(),'Pace rata-rata')}${st(fs(a.durationSeconds,a.distanceMeters),ul()==='km'?'km/j':'mph','Kecepatan rata-rata')}</div>
  ${(()=>{const sp=splits(a);if(!sp.length)return'';const mn=Math.min(...sp);return`<div class="card"><b>Split per ${ul()}</b>${sp.map((s,i)=>`<div class="split"><small>${i+1}</small><i style="width:${40+60*(mn/s)}%" class="${s===mn?'fast':''}"></i><b>${ft(s)}</b></div>`).join('')}</div>`})()}
  <div class="card"><label>Nama aktivitas<input id="ttl" value="${esc(a.title)}" maxlength="60"></label><label>Catatan<textarea id="nts" maxlength="500">${esc(a.notes)}</textarea></label></div>
  <div class="btns"><button class="btn pri" data-act="save">${a.draft?'Simpan aktivitas':'Simpan perubahan'}</button>
  ${a.draft?'<button class="btn bad" data-act="discard">Buang</button>':'<button class="btn" data-act="share">Share Studio</button><button class="btn" data-act="gpx">Ekspor GPX</button><button class="btn bad" data-act="delete">Hapus</button>'}</div>`},
explore(){return `<h2>Peta rute</h2><div id="emap" class="map big"></div><small>${S.acts.filter(a=>a.route.length>1).length} rute tersimpan</small>`},
history(){let l=S.acts.filter(a=>S.f==='all'||a.type===S.f);const k={new:0,dist:'distanceMeters',time:'durationSeconds'}[S.sort];if(k)l=[...l].sort((a,b)=>b[k]-a[k]);
  return `<h2>Riwayat</h2><div class="chips">${[['all','Semua'],...Object.entries(TYPES).map(([k,v])=>[k,v[0]])].map(([k,n])=>`<button class="pill ${S.f===k?'on':''}" data-act="filter" data-v="${k}">${n}</button>`).join('')}</div>
  <select id="sort" aria-label="Urutkan"><option value="new">Terbaru</option><option value="dist">Jarak terjauh</option><option value="time">Durasi terlama</option></select>
  ${l.length?l.map(row).join(''):empty}`},
progress(){const days=[...Array(7)].map((_,i)=>{const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-6+i);return d}),
  vals=days.map(d=>sum(S.acts.filter(a=>{const x=new Date(a.startedAt);return x>=d&&x<new Date(+d+864e5)}),'distanceMeters')),mx=Math.max(...vals,1);
  const best=[...S.acts].sort((a,b)=>b.distanceMeters-a.distanceMeters)[0],long=[...S.acts].sort((a,b)=>b.durationSeconds-a.durationSeconds)[0];
  const runs=S.acts.filter(a=>a.type==='running'&&a.distanceMeters>=1000).map(a=>a.durationSeconds/a.distanceMeters*1000),bp=runs.length?Math.min(...runs):0;
  const dist=S.acts.map(a=>a.distanceMeters),days_=new Set(S.acts.map(a=>a.startedAt.slice(0,10))).size,wd=sum(weekActs(),'distanceMeters');
  const A=[['First Move','Selesaikan aktivitas pertama',S.acts.length>0],['First 5K','Tempuh minimal 5 km',Math.max(0,...dist)>=5000],['10K Club','Tempuh minimal 10 km',Math.max(0,...dist)>=1e4],['Consistency','Olahraga di 3 hari berbeda',days_>=3],['Distance Hunter','Pecahkan rekor jarak pribadi',S.acts.length>1&&S.acts[0].distanceMeters>=Math.max(...dist)],['Weekly Goal','Capai target mingguan',wd>=S.prof.goal*U()]];
  return `<h2>Progres</h2><div class="card"><b>7 hari terakhir (${ul()})</b><svg viewBox="0 0 280 120" role="img" aria-label="Grafik jarak 7 hari">${vals.map((v,i)=>`<rect x="${i*40+6}" y="${100-v/mx*90}" width="28" height="${Math.max(2,v/mx*90)}" rx="6" fill="${v?'#F28C28':'var(--s2)'}"/><text x="${i*40+20}" y="116" text-anchor="middle" font-size="10" fill="var(--mu)">${days[i].toLocaleDateString('id-ID',{weekday:'short'})}</text>`).join('')}</svg></div>
  <div class="grid2">${st(best?fd(best.distanceMeters):'0.00',ul(),'Jarak terjauh')}${st(long?ft(long.durationSeconds):'0:00','','Durasi terlama')}${st(bp?ft(bp*1000/U()):'--:--','/'+ul(),'Pace lari terbaik')}${st(fd(sum(S.acts,'distanceMeters')),ul(),'Total jarak')}</div>
  <h3>Pencapaian</h3>${A.map(([n,d,ok])=>`<div class="item ach ${ok?'done':''}"><span><b>${n}</b><small>${d}</small></span><small>${ok?'Tercapai':'Terkunci'}</small></div>`).join('')}`},
profile(){const p=S.prof;return `<h2>Profil</h2><div class="card"><label>Nama tampilan<input id="pn" value="${esc(p.name)}" maxlength="30"></label><label>Nama pengguna di gambar<input id="pu" value="${esc(p.user)}" maxlength="30" placeholder="@namamu"></label>
  <label>Satuan<select id="pun"><option value="km" ${p.unit==='km'?'selected':''}>Kilometer</option><option value="mi" ${p.unit==='mi'?'selected':''}>Mil</option></select></label>
  <label>Tema<select id="pth"><option value="dark" ${p.theme==='dark'?'selected':''}>Gelap</option><option value="light" ${p.theme==='light'?'selected':''}>Terang</option></select></label>
  <label>Efek suara<select id="pso"><option value="1" ${p.sound!==false?'selected':''}>Aktif</option><option value="0" ${p.sound===false?'selected':''}>Mati</option></select></label><label>Suara tiap kilometer<select id="pvo"><option value="1" ${p.voice!==false?'selected':''}>Aktif</option><option value="0" ${p.voice===false?'selected':''}>Mati</option></select></label><label>Target mingguan (${p.unit})<input id="pg" type="number" min="1" max="1000" value="${p.goal}"></label><button class="btn pri" data-act="saveprof">Simpan profil</button></div>
  <div class="card"><b>Data</b><small>Data hanya tersimpan di browser ini. Ekspor cadangan secara berkala; menghapus data browser akan menghapus aktivitasmu.</small>
  <button class="btn" data-act="export">Ekspor cadangan JSON</button><label class="btn">Impor JSON atau GPX<input id="imp" type="file" accept=".json,.gpx" hidden></label>
  <button class="btn" data-act="install" id="inst" hidden>Pasang aplikasi ke layar utama</button><button class="btn bad" data-act="reset">Hapus semua data</button></div>
  <div class="card"><b>Tentang AEROVIA</b><small>Move With Purpose. Versi 1.0</small><small>&copy; 2026 Mujahadah Alfa. Hak cipta dilindungi.</small></div>`},
share(){return `<h2>Share Studio</h2><canvas id="cv" aria-label="Pratinjau gambar"></canvas>
  <div class="chips">${[['story','Story 9:16'],['feed','Feed 4:5'],['sq','Persegi 1:1']].map(([k,n])=>`<button class="pill ${SH.fmt===k?'on':''}" data-act="fmt" data-v="${k}">${n}</button>`).join('')}</div>
  <div class="card"><label class="row">Tampilkan rute<input type="checkbox" id="shm" ${SH.map?'checked':''} style="width:auto"></label><label class="row">Sembunyikan titik awal dan akhir<input type="checkbox" id="shh" ${SH.hide?'checked':''} style="width:auto"></label>
  <label>Foto latar (dari galeri, tidak diunggah)<input type="file" id="shf" accept="image/*"></label></div>
  <div class="card"><b>Rute di gambar</b><small>Geser rute langsung di gambar untuk memindahkannya ke posisi yang kamu mau.</small>
  <label>Ukuran rute<input type="range" id="shs" min="30" max="160" value="${Math.round(SH.rs*100)}"></label><label>Tebal garis<input type="range" id="shw" min="4" max="30" value="${SH.lw}"></label>
  <div class="dots">${['#F28C28','#ffffff','#3fd0ff','#b6ff3b','#ff4d8d'].map(c=>`<button class="dot ${SH.col===c?'on':''}" data-act="col" data-v="${c}" style="background:${c}" aria-label="Warna ${c}"></button>`).join('')}</div>
  <button class="btn" data-act="rst">Atur ulang posisi</button></div>
  <div class="btns"><button class="btn pri" data-act="dlimg">Unduh PNG</button><button class="btn" data-act="shimg">Bagikan</button><button class="btn full" data-act="replay">Replay rute dan simpan video</button></div>`}};

/* ---------- Share Studio (Canvas) ---------- */
const LOGO=new Image();LOGO.src='assets/icons/icon-192.png';LOGO.onload=()=>S.view==='share'&&drawCard();
const SH={fmt:'story',map:true,hide:true,img:null,rs:1,dx:0,dy:0,lw:12,col:'#F28C28',prog:1};
function drawCard(){
  const a=S.cur,c=$('#cv');if(!c||!a)return;const[W,H]={story:[1080,1920],feed:[1080,1350],sq:[1080,1080]}[SH.fmt];if(c.width!==W)c.width=W;if(c.height!==H)c.height=H;const x=c.getContext('2d'),P=80,OR='#F28C28';x.globalAlpha=1;x.shadowBlur=0;x.textAlign='left';
  const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#23272b');g.addColorStop(1,'#101214');x.fillStyle=g;x.fillRect(0,0,W,H);x.strokeStyle='rgba(255,255,255,.05)';x.lineWidth=3;for(let i=0;i<9;i++){x.beginPath();for(let k=0;k<=W;k+=40){const y=H*(.1+i*.11)+Math.sin(k/170+i*1.3)*60+Math.sin(k/70+i)*18;k?x.lineTo(k,y):x.moveTo(k,y)}x.stroke()}
  if(SH.img){const i=SH.img,s=Math.max(W/i.width,H/i.height);x.drawImage(i,(W-i.width*s)/2,(H-i.height*s)/2,i.width*s,i.height*s);const o=x.createLinearGradient(0,0,0,H);o.addColorStop(0,'rgba(0,0,0,.55)');o.addColorStop(.45,'rgba(0,0,0,.15)');o.addColorStop(1,'rgba(0,0,0,.85)');x.fillStyle=o;x.fillRect(0,0,W,H)}
  if(LOGO.naturalWidth){x.save();x.beginPath();x.roundRect(P,P-8,76,76,18);x.clip();x.drawImage(LOGO,P,P-8,76,76);x.restore()}
  x.fillStyle='#fff';x.font='700 54px "Barlow Condensed",sans-serif';x.textBaseline='alphabetic';x.fillText('AEROVIA',P+96,P+50);
  x.textAlign='right';x.font='500 32px Barlow,sans-serif';x.fillStyle='rgba(255,255,255,.8)';x.fillText(fdate(a.startedAt),W-P,P+30);if(S.prof.user)x.fillText(S.prof.user,W-P,P+72);x.textAlign='left';
  const sb=H>1300?680:H>1200?620:540,top=250,bot=H-sb;
  if(SH.map&&a.route.length>1){let r=a.route;if(SH.hide){const k=Math.max(1,Math.floor(r.length*.08));r=r.slice(k,-k);if(r.length<2)r=a.route}
    const la=r.map(p=>p.latitude),lo=r.map(p=>p.longitude),m=Math.cos(la[0]*Math.PI/180),mnA=Math.min(...la),mxA=Math.max(...la),mnO=Math.min(...lo),mxO=Math.max(...lo);
    const w=W-2*P,h=bot-top,s=SH.rs*Math.min(w/Math.max((mxO-mnO)*m,1e-6),h/Math.max(mxA-mnA,1e-6)),ox=P+(w-(mxO-mnO)*m*s)/2+SH.dx,oy=top+(h-(mxA-mnA)*s)/2+SH.dy;
    const pt=p=>[ox+(p.longitude-mnO)*m*s,oy+(mxA-p.latitude)*s];
    x.lineJoin=x.lineCap='round';x.globalAlpha=.25;x.strokeStyle=SH.col;x.lineWidth=SH.lw*2.2;x.beginPath();r.slice(0,Math.max(2,Math.ceil(r.length*SH.prog))).forEach((p,i)=>x[i?'lineTo':'moveTo'](...pt(p)));x.stroke();x.globalAlpha=1;x.shadowColor=SH.col;x.shadowBlur=36;x.strokeStyle=SH.col;x.lineWidth=SH.lw;x.stroke();x.shadowBlur=0;if(SH.prog<1){x.fillStyle='#fff';x.beginPath();x.arc(...pt(r[Math.max(1,Math.ceil(r.length*SH.prog))-1]),SH.lw*1.6,0,7);x.fill()}
    if(!SH.hide)[[r[0],'#4cc38a'],[r.at(-1),'#fff']].forEach(([p,col])=>{x.fillStyle=col;x.beginPath();x.arc(...pt(p),16,0,7);x.fill()})}
  x.fillStyle='#fff';x.font=`700 ${H>1200?250:210}px "Barlow Condensed",sans-serif`;x.fillText(fd(a.distanceMeters*SH.prog),P,H-sb+(H>1200?250:210));
  x.font='600 52px Barlow,sans-serif';x.fillStyle=OR;x.fillText(ul()==='km'?'kilometer':'mil',P,H-sb+(H>1200?250:210)+70);
  const y=H-190,cols=[[ft(a.durationSeconds*SH.prog),'Durasi'],[fp(a.durationSeconds,a.distanceMeters),'Pace /'+ul()],[TYPES[a.type]?.[0]||'','Aktivitas']];
  cols.forEach(([v,l],i)=>{const cx=P+i*320;x.fillStyle='#fff';x.font='700 84px "Barlow Condensed",sans-serif';x.fillText(v,cx,y);x.fillStyle='rgba(255,255,255,.65)';x.font='500 30px Barlow,sans-serif';x.fillText(l,cx,y+44)});
  x.fillStyle=OR;x.font='600 34px Barlow,sans-serif';x.fillText('Move With Purpose.',P,H-50)}
function replay(){const c=$('#cv');if(!c||SH.busy)return;SH.busy=true;let rec=null;const ch=[];
  try{if(window.MediaRecorder){const mt=['video/mp4','video/webm;codecs=vp9','video/webm'].find(t=>MediaRecorder.isTypeSupported(t));rec=new MediaRecorder(c.captureStream(30),mt?{mimeType:mt,videoBitsPerSecond:6e6}:{});rec.ondataavailable=e=>e.data.size&&ch.push(e.data);rec.onstop=()=>{dl(new Blob(ch,{type:rec.mimeType}),'aerovia-replay.'+(rec.mimeType.includes('mp4')?'mp4':'webm'));toast('Video replay diunduh')};rec.start()}else toast('Perekaman video tidak didukung browser ini')}catch{rec=null}
  const t0=performance.now(),D=7000,f=now=>{const k=Math.min(1,(now-t0)/D);SH.prog=Math.max(.001,k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2);drawCard();if(k<1)requestAnimationFrame(f);else{SH.prog=1;drawCard();setTimeout(()=>{if(rec&&rec.state!=='inactive')rec.stop();SH.busy=false},400)}};requestAnimationFrame(f)}
const blobImg=()=>new Promise(r=>$('#cv').toBlob(r,'image/png'));

/* ---------- Ekspor / Impor ---------- */
const gpx=a=>`<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="AEROVIA" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>${esc(a.title)}</name><trkseg>${a.route.map(p=>`<trkpt lat="${p.latitude}" lon="${p.longitude}"><time>${new Date(p.timestamp).toISOString()}</time></trkpt>`).join('')}</trkseg></trk></gpx>`;
async function importFile(f){
  if(f.size>20*1048576)return toast('File terlalu besar (maks 20 MB)');
  try{const txt=await f.text();let list=[];
    if(f.name.toLowerCase().endsWith('.gpx')){const d=new DOMParser().parseFromString(txt,'application/xml');if(d.querySelector('parsererror'))throw 0;
      const pts=[...d.querySelectorAll('trkpt')].map(p=>({latitude:+p.getAttribute('lat'),longitude:+p.getAttribute('lon'),timestamp:Date.parse(p.querySelector('time')?.textContent)||0,accuracy:0}));if(pts.length<2)throw 0;
      let dist=0;pts.forEach((p,i)=>i&&(dist+=hav(pts[i-1],p)));const t0=pts[0].timestamp||Date.now(),sec=pts.at(-1).timestamp?Math.round((pts.at(-1).timestamp-t0)/1000):0;
      list=[{id:crypto.randomUUID(),type:'running',startedAt:new Date(t0).toISOString(),durationSeconds:sec,pausedSeconds:0,distanceMeters:Math.round(dist),route:pts,title:d.querySelector('trk>name')?.textContent||'Aktivitas impor GPX',notes:'',createdAt:new Date().toISOString()}]}
    else{const j=JSON.parse(txt);if(j.v!==1||!Array.isArray(j.acts))throw 0;
      list=j.acts.filter(a=>a&&typeof a.id==='string'&&typeof a.startedAt==='string'&&Array.isArray(a.route)&&isFinite(a.distanceMeters)&&isFinite(a.durationSeconds));if(j.profile)Object.assign(S.prof,{name:String(j.profile.name||S.prof.name).slice(0,30)})}
    if(!list.length||!confirm(`Impor ${list.length} aktivitas? Aktivitas dengan ID sama akan ditimpa.`))return;
    for(const a of list){delete a.draft;await dbPut(a)}await load();saveProf();toast(`${list.length} aktivitas diimpor`);go('history')}
  catch{toast('File rusak atau format tidak didukung')}}

/* ---------- Router & render ---------- */
const NAV=[['home','Beranda','home'],['explore','Jelajah','explore'],['track','','play'],['history','Riwayat','hist'],['progress','Progres','prog']];
function go(v){S.view=v;render();scrollTo(0,0)}
function render(){
  if(M){M.remove();M=null}ME=AC=null;
  document.body.classList.toggle('tracking',S.view==='track'&&!!T);
  $('#view').innerHTML=V[S.view]();if(render.l!==S.view){const e=$('#view');e.classList.remove('in');void e.offsetWidth;e.classList.add('in');render.l=S.view;FOLLOW=true}
  $('#nav').innerHTML=NAV.map(([k,l,i])=>`<button data-act="nav" data-v="${k}" class="${k==='track'?'fab':''} ${S.view===k?'on':''}" aria-label="${l||'Mulai aktivitas'}">${svg(i,k==='track'?28:24)}${l?`<span>${l}</span>`:''}</button>`).join('');
  $('#av').textContent=(S.prof.name||'A')[0].toUpperCase();
  const v=S.view;
  if(v==='track'&&T){stopPreview();mkMap('tmap');if(M){T.line=L.polyline(T.pts.map(p=>[p.latitude,p.longitude]),{color:'#F28C28',weight:5}).addTo(M);if(T.gh)T.gm=L.circleMarker([T.gh[0].la,T.gh[0].lo],{radius:8,color:'#fff',weight:3,fillColor:'#8ab4ff',fillOpacity:1}).addTo(M);M.on('dragstart',()=>{FOLLOW=false;$('.loc')?.classList.add('off')});if(LASTP)me(LASTP)}tick()}
  else if(v==='track'){mkMap('pmap');if(M&&LASTP)me(LASTP);startPreview()}else stopPreview()
  if(v==='detail'){mkMap('dmap');drawRoute(S.cur.route)}
  if(v==='explore'){mkMap('emap');S.acts.forEach(a=>drawRoute(a.route,false));const all=S.acts.flatMap(a=>a.route).map(p=>[p.latitude,p.longitude]);if(M&&all.length)M.fitBounds(all,{padding:[24,24]})}
  if(v==='history')$('#sort').value=S.sort;
  if(v==='share'){(document.fonts?.load('700 100px "Barlow Condensed"')||Promise.resolve()).finally(drawCard)}
  if(v==='profile'&&deferred)$('#inst').hidden=false}
let deferred=null;
addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e});

document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act,v=b.dataset.v;
  switch(a){
    case 'nav':go(v);break;case 'track':go('track');break;case 'profile':go('profile');break;
    case 'loc':FOLLOW=true;$('.loc')?.classList.remove('off');if(LASTP)me(LASTP);break;case 'type':S.type=v;S.ghost='';render();break;case 'replay':replay();break;case 'begin':countdown();break;case 'pause':pauseTrack();break;
    case 'finish':if(confirm('Selesaikan aktivitas ini?'))finishTrack();break;
    case 'open':S.cur=S.acts.find(x=>x.id===b.dataset.id);go('detail');break;
    case 'filter':S.f=v;render();break;
    case 'save':{const c={...S.cur,title:$('#ttl').value.trim()||'Aktivitas',notes:$('#nts').value};delete c.draft;const l0=lv(xp());await dbPut(c);await load();S.cur=c;const l1=lv(xp());if(l1>l0){beep('lvl');toast(`Naik ke Level ${l1}! ${LVN[Math.min(l1-1,6)]}`)}else toast('Tersimpan');go('history');break}
    case 'discard':if(confirm('Buang aktivitas ini? Data tidak bisa dikembalikan.')){S.cur=null;go('home')}break;
    case 'delete':if(confirm('Hapus aktivitas ini?')){await dbDel(S.cur.id);await load();toast('Aktivitas dihapus');go('history')}break;
    case 'gpx':dl(new Blob([gpx(S.cur)],{type:'application/gpx+xml'}),`aerovia-${S.cur.startedAt.slice(0,10)}.gpx`);break;
    case 'share':go('share');break;
    case 'fmt':SH.fmt=v;render();break;case 'col':SH.col=v;render();break;case 'rst':SH.dx=SH.dy=0;SH.rs=1;render();break;
    case 'dlimg':dl(await blobImg(),`aerovia-${S.cur.startedAt.slice(0,10)}.png`);break;
    case 'shimg':{const f=new File([await blobImg()],'aerovia.png',{type:'image/png'});if(navigator.canShare?.({files:[f]}))navigator.share({files:[f],title:'AEROVIA'}).catch(()=>{});else{dl(f,'aerovia.png');toast('Berbagi tidak didukung, gambar diunduh')}break}
    case 'saveprof':{const p=S.prof;p.name=$('#pn').value.trim()||'Atlet';p.user=$('#pu').value.trim();p.unit=$('#pun').value;p.theme=$('#pth').value;p.voice=$('#pvo').value==='1';p.sound=$('#pso').value==='1';p.goal=Math.min(1000,Math.max(1,+$('#pg').value||20));saveProf();toast('Profil disimpan');go('home');break}
    case 'export':dl(new Blob([JSON.stringify({v:1,profile:{name:S.prof.name},acts:S.acts})],{type:'application/json'}),`aerovia-backup-${new Date().toISOString().slice(0,10)}.json`);break;
    case 'install':deferred?.prompt();break;
    case 'reset':if(confirm('Hapus SEMUA aktivitas dan pengaturan? Tindakan ini tidak bisa dibatalkan.')){await dbClr();localStorage.removeItem('av_prof');location.reload()}break}});
document.addEventListener('change',e=>{
  const t=e.target;
  if(t.id==='gh')S.ghost=t.value;if(t.id==='bpm'){S.prof.bpm=+t.value;saveProf()}
  if(t.id==='sort'){S.sort=t.value;render()}
  if(t.id==='shm'){SH.map=t.checked;drawCard()}if(t.id==='shh'){SH.hide=t.checked;drawCard()}
  if(t.id==='shf'&&t.files[0]){const i=new Image();i.onload=()=>{SH.img=i;drawCard()};i.src=URL.createObjectURL(t.files[0])}
  if(t.id==='imp'&&t.files[0])importFile(t.files[0])});
document.addEventListener('input',e=>{const t=e.target;if(t.id==='shs'){SH.rs=t.value/100;drawCard()}if(t.id==='shw'){SH.lw=+t.value;drawCard()}});
let drag=null;
document.addEventListener('pointerdown',e=>{if(e.target.id!=='cv')return;const c=e.target;drag={x:e.clientX,y:e.clientY,dx:SH.dx,dy:SH.dy,k:c.width/c.getBoundingClientRect().width};c.setPointerCapture(e.pointerId)});
document.addEventListener('pointermove',e=>{if(!drag)return;SH.dx=drag.dx+(e.clientX-drag.x)*drag.k;SH.dy=drag.dy+(e.clientY-drag.y)*drag.k;drawCard()});
document.addEventListener('pointerup',()=>{drag=null});
const net=()=>{$('#net').hidden=navigator.onLine};addEventListener('online',net);addEventListener('offline',net);

(async()=>{saveProf();net();await load();render();setTimeout(()=>{const s=$('#splash');s.classList.add('out');setTimeout(()=>s.remove(),600)},1400);if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{})})();
