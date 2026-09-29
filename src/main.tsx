import React, {useEffect, useMemo, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {AlertTriangle, CheckCircle2, ChevronRight, CircleDollarSign, Crown, Flag, Gavel, History, RotateCcw, ShieldCheck, Trophy, Users, XCircle} from 'lucide-react';
import {players, Player, Category} from './player-data';
import './styles.css';

const TEAMS = [
  ['Chennai Super Kings','CSK'],['Delhi Capitals','DC'],['Gujarat Titans','GT'],['Kolkata Knight Riders','KKR'],['Lucknow Super Giants','LSG'],['Mumbai Indians','MI'],['Punjab Kings','PBKS'],['Rajasthan Royals','RR'],['Royal Challengers Bengaluru','RCB'],['Sunrisers Hyderabad','SRH']
] as const;
const TEAM_CODES = TEAMS.map(x=>x[1]);
const PURSE=100;
const STORAGE='ipl-mock-auction-v1';

type SquadPlayer = Player & {price:number};
type TeamState = {purse:number; squad:SquadPlayer[]};
type Sale = {playerId:number; team:string|null; price:number; result:'SOLD'|'UNSOLD'};
type Phase = 'BAT'|'BOWL'|'WK'|'ALL'|'UC'|'DONE';

const phasePlayers=(phase:Phase)=>players.filter(p=> phase==='UC' ? p.status==='UC' : p.status==='C' && p.category===phase);
const shuffle=<T,>(a:T[])=>{const x=[...a]; for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [x[i],x[j]]=[x[j],x[i]];} return x;};
const emptyTeams=():Record<string,TeamState>=>Object.fromEntries(TEAM_CODES.map(t=>[t,{purse:PURSE,squad:[]}])) as Record<string,TeamState>;
const phaseLabel=(p:Phase)=>p==='BAT'?'Batsmen':p==='BOWL'?'Bowlers':p==='WK'?'Wicket Keepers':p==='ALL'?'All-Rounders':p==='UC'?'Uncapped':'Completed';
const isForeign=(p:Player)=>p.country!=='IND';

// Build a deterministic, valid 10-team sample so the final-results screen can be
// checked instantly without auctioning all 214 players by hand.
function buildSampleSimulation(){
 const used=new Set<number>();
 const simulatedTeams=emptyTeams();
 const simulatedSales:Sale[]=[];
 const pick=(predicate:(p:Player)=>boolean, code:string)=>{
   const candidates=players.filter(p=>!used.has(p.id)&&predicate(p));
   for(const p of candidates){
     const squad=simulatedTeams[code].squad;
     if(squad.length>=13) break;
     if(isForeign(p)&&squad.filter(isForeign).length>=4) continue;
     const price=Number((p.base/100 + 0.50 + ((p.id*7)%9)*0.10).toFixed(2));
     if(simulatedTeams[code].purse<price) continue;
     used.add(p.id);
     simulatedTeams[code]={purse:simulatedTeams[code].purse-price,squad:[...squad,{...p,price}]};
     simulatedSales.push({playerId:p.id,team:code,price,result:'SOLD'});
     return true;
   }
   return false;
 };
 const orderedCodes=[...TEAM_CODES];
 // Give every team the mandatory composition first.
 for(const code of orderedCodes){
   pick(p=>p.category==='BAT',code); pick(p=>p.category==='BAT',code); pick(p=>p.category==='BAT',code); pick(p=>p.category==='BAT',code);
   pick(p=>p.category==='BOWL',code); pick(p=>p.category==='BOWL',code); pick(p=>p.category==='BOWL',code);
   pick(p=>p.category==='WK',code);
   pick(p=>p.category==='ALL',code); pick(p=>p.category==='ALL',code);
   pick(p=>p.status==='UC',code);
   pick(p=>p.category==='BAT'||p.category==='BOWL'||p.category==='ALL'||p.category==='WK',code);
   pick(p=>p.category==='BAT'||p.category==='BOWL'||p.category==='ALL'||p.category==='WK',code);
 }
 // Safety fill if a category-specific greedy pass ever leaves a team short.
 for(const code of orderedCodes){
   while(simulatedTeams[code].squad.length<13){
     if(!pick(()=>true,code)) throw new Error(`Unable to build sample squad for ${code}`);
   }
 }
 return {simulatedTeams,simulatedSales};
}

const photoSlug=(name:string)=>name.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
const teamLogoCandidates=(code:string)=>[`/teams/${code}.webp`,`/teams/${code}.svg`,`/team-logos/${code}.webp`,`/team-logos/${code}.svg`];

function TeamLogo({code,className='' }:{code:string;className?:string}){
 const candidates=useMemo(()=>teamLogoCandidates(code),[code]);
 const [src,setSrc]=useState(candidates[0]);
 const [i,setI]=useState(0);
 useEffect(()=>{setSrc(candidates[0]);setI(0);},[candidates]);
 const next=()=>{const n=i+1;if(n<candidates.length){setI(n);setSrc(candidates[n]);}};
 return <div className={`team-logo ${className}`}>
   <img src={src} alt={`${code} logo`} onError={next}/>
 </div>;
}

const photoCandidates=(player:Player)=>{
 const n=String(player.id).padStart(3,'0');
 const slug=photoSlug(player.name);
 return [
   `/players/${n}-${slug}.webp`,
   `/players/${n}-${player.name.trim().replace(/[^A-Za-z0-9]+/g,'-').replace(/^-+|-+$/g,'')}.webp`
 ];
};

function PlayerPhoto({player}:{player:Player}){
 const candidates=useMemo(()=>photoCandidates(player),[player.id,player.name]);
 const [src,setSrc]=useState(candidates[0]);
 const [state,setState]=useState<'loading'|'ready'|'error'>('loading');
 useEffect(()=>{
   let active=true;
   setState('loading');
   setSrc(candidates[0]);
   const tryImage=(i:number)=>{
     if(i>=candidates.length){if(active)setState('error');return;}
     const img=new Image();
     img.decoding='async';
     img.onload=()=>{if(active){setSrc(candidates[i]);setState('ready');}};
     img.onerror=()=>tryImage(i+1);
     img.src=candidates[i];
   };
   tryImage(0);
   return()=>{active=false;};
 },[candidates]);
 return <div className="player-photo-wrap">
   {state==='ready' && <img key={src} src={src} alt={player.name} decoding="async" fetchPriority="high" />}
   {state!=='ready' && <div className="photo-fallback"><span>{player.name.split(' ').map(x=>x[0]).slice(0,2).join('')}</span><small>{state==='loading'?'LOADING PHOTO…':'PHOTO NOT FOUND'}</small></div>}
   <div className="player-no">#{player.id}</div>
 </div>;
}

function App(){
 const [teams,setTeams]=useState<Record<string,TeamState>>(emptyTeams);
 const [sales,setSales]=useState<Sale[]>([]);
 const [order,setOrder]=useState<Player[]>([]);
 const [index,setIndex]=useState(0);
 const [phase,setPhase]=useState<Phase>('BAT');
 const [bid,setBid]=useState('');
 const [team,setTeam]=useState('CSK');
 const [unsoldMode,setUnsoldMode]=useState(false);
 const [started,setStarted]=useState(false);
 const [ended,setEnded]=useState(false);
 const [showTeams,setShowTeams]=useState(false);
 const [selectedXI,setSelectedXI]=useState<Record<string,number[]>>({});
 const [captains,setCaptains]=useState<Record<string,number|null>>({});
 const [vice,setVice]=useState<Record<string,number|null>>({});
 const [message,setMessage]=useState('Ready to start the auction.');
 const [saleAnimation,setSaleAnimation]=useState<{team:string;player:string;price:number}|null>(null);

 useEffect(()=>{const raw=localStorage.getItem(STORAGE); if(raw){try{const s=JSON.parse(raw); setTeams(s.teams);setSales(s.sales);setOrder(s.order);setIndex(s.index);setPhase(s.phase);setStarted(s.started);setEnded(s.ended);setUnsoldMode(s.unsoldMode);setSelectedXI(s.selectedXI||{});setCaptains(s.captains||{});setVice(s.vice||{});}catch{}}},[]);
 useEffect(()=>{if(started)localStorage.setItem(STORAGE,JSON.stringify({teams,sales,order,index,phase,started,ended,unsoldMode,selectedXI,captains,vice}));},[teams,sales,order,index,phase,started,ended,unsoldMode,selectedXI,captains,vice]);

 const current=order[index];
 useEffect(()=>{
   const upcoming=order.slice(index, index+4);
   upcoming.forEach(p=>{const img=new Image(); img.src=photoCandidates(p)[0];});
 },[order,index]);
 const soldIds=new Set(sales.filter(s=>s.result==='SOLD').map(s=>s.playerId));
 const latestSale=new Map<number,Sale>(); sales.forEach(s=>latestSale.set(s.playerId,s)); const unsoldIds=new Set([...latestSale.values()].filter(s=>s.result==='UNSOLD').map(s=>s.playerId));
 const soldCount=sales.filter(s=>s.result==='SOLD').length;
 const currentTeam=teams[team];
 const currentBid=Number(bid);
 const maxBid=currentTeam?.purse ?? 0;
 const phaseDone=!!current && index>=order.length;

 const start=()=>{const first=shuffle(phasePlayers('BAT')); setOrder(first);setIndex(0);setPhase('BAT');setStarted(true);setEnded(false);setMessage('Auction started — Batsmen are up first.');};
 const simulate=()=>{
   const {simulatedTeams,simulatedSales}=buildSampleSimulation();
   const finalXI:Record<string,number[]>={};
   const finalCaptains:Record<string,number|null>={};
   const finalVice:Record<string,number|null>={};
   TEAM_CODES.forEach((code,i)=>{
     const squad=simulatedTeams[code].squad;
     finalXI[code]=squad.slice(0,11).map(p=>p.id);
     finalCaptains[code]=squad[0]?.id??null;
     finalVice[code]=squad[1]?.id??null;
   });
   setTeams(simulatedTeams); setSales(simulatedSales); setOrder([]); setIndex(0); setPhase('DONE');
   setBid(''); setUnsoldMode(false); setStarted(true); setEnded(true); setShowTeams(true);
   setSelectedXI(finalXI); setCaptains(finalCaptains); setVice(finalVice);
   setTeam('CSK'); setMessage('Sample simulation loaded — review the final Top 3, XI, captain and vice-captain screens.');
 };
 const restart=()=>{if(!confirm('Reset the entire auction? All sales and team squads will be cleared.'))return; localStorage.removeItem(STORAGE); setTeams(emptyTeams());setSales([]);setOrder([]);setIndex(0);setPhase('BAT');setStarted(false);setEnded(false);setUnsoldMode(false);setSelectedXI({});setCaptains({});setVice({});setBid('');setMessage('Auction reset.');};
 const nextPhase=()=>{
   const phases:Phase[]=['BAT','BOWL','WK','ALL','UC']; const i=phases.indexOf(phase); if(i<phases.length-1){const np=phases[i+1]; setPhase(np);setOrder(shuffle(phasePlayers(np)));setIndex(0);setBid('');setMessage(`${phaseLabel(np)} phase started.`);} else {setPhase('DONE');setOrder([]);setIndex(0);setBid('');setMessage('Initial auction complete. You can re-auction unsold players or end the auction.');}
 };
 const mark=(result:'SOLD'|'UNSOLD')=>{
   if(!current)return;
   if(result==='SOLD'){
     if(!TEAM_CODES.includes(team as any))return setMessage('Select a valid team.');
     if(!Number.isFinite(currentBid)||currentBid<current.base/100||currentBid<=0)return setMessage(`Enter a valid bid of at least ${current.base/100} Cr.`);
     if(currentBid>maxBid)return setMessage(`${team} has only ₹${maxBid.toFixed(2)} Cr remaining.`);
     if(currentTeam.squad.length>=15)return setMessage(`${team} already has the maximum 15 players.`);
     if(isForeign(current) && currentTeam.squad.filter(isForeign).length>=4)return setMessage(`${team} already has 4 foreign players.`);
     setTeams(t=>({...t,[team]:{purse:t[team].purse-currentBid,squad:[...t[team].squad,{...current,price:currentBid}]}}));
     setSales(s=>[...s,{playerId:current.id,team,price:currentBid,result}]);
     setSaleAnimation({team,player:current.name,price:currentBid});
     setTimeout(()=>setSaleAnimation(null),2400);
     setMessage(`${current.name} sold to ${team} for ₹${currentBid.toFixed(2)} Cr.`);
   } else {setSales(s=>[...s,{playerId:current.id,team:null,price:0,result}]); setMessage(`${current.name} marked UNSOLD.`);}
   setBid(''); setTimeout(()=>advance(),0);
 };
 const advance=()=>{if(index+1<order.length){setIndex(i=>i+1);return;} nextPhase();};
 const beginUnsold=()=>{
   const unsold=players.filter(p=>unsoldIds.has(p.id));
   if(!unsold.length)return setMessage('There are no unsold players to re-auction.');
   setUnsoldMode(true);setPhase('DONE');setOrder(shuffle(unsold));setIndex(0);setMessage('Unsold re-auction started.');
 };
 const advanceUnsold=()=>{if(index+1<order.length){setIndex(i=>i+1);}else{setOrder([]);setIndex(0);setUnsoldMode(false);setMessage('Unsold re-auction complete.');}};
 const markUnsoldPhase=(result:'SOLD'|'UNSOLD')=>{
   if(!current)return;
   if(result==='SOLD'){
    if(!Number.isFinite(currentBid)||currentBid<current.base/100||currentBid<=0)return setMessage(`Enter a valid bid of at least ${current.base/100} Cr.`);
    if(currentBid>teams[team].purse)return setMessage(`${team} does not have enough purse.`);
    if(teams[team].squad.length>=15)return setMessage(`${team} already has 15 players.`);
    if(isForeign(current)&&teams[team].squad.filter(isForeign).length>=4)return setMessage(`${team} already has 4 foreign players.`);
    setTeams(t=>({...t,[team]:{purse:t[team].purse-currentBid,squad:[...t[team].squad,{...current,price:currentBid}]}}));
   }
   setSales(s=>[...s,{playerId:current.id,team:result==='SOLD'?team:null,price:result==='SOLD'?currentBid:0,result}]);setBid('');setMessage(result==='SOLD'?`${current.name} sold in re-auction.`:`${current.name} remains unsold.`);setTimeout(()=>advanceUnsold(),0);
 };
 const doMark=(r:'SOLD'|'UNSOLD')=>unsoldMode?markUnsoldPhase(r):mark(r);

 const validation=useMemo(()=>TEAM_CODES.map(code=>{const s=teams[code].squad;const bats=s.filter(p=>p.category==='BAT').length;const bowls=s.filter(p=>p.category==='BOWL').length;const wk=s.filter(p=>p.category==='WK').length;const all=s.filter(p=>p.category==='ALL').length;const uc=s.filter(p=>p.status==='UC').length;const foreign=s.filter(isForeign).length;return {code,size:s.length,bats,bowls,wk,all,uc,foreign,valid:s.length>=13&&s.length<=15&&bats>=4&&bowls>=3&&wk>=1&&all>=2&&uc>=1&&foreign<=4};}),[teams]);
 const finalTeams=useMemo(()=>TEAM_CODES.map(code=>{const t=teams[code];const xi=selectedXI[code]||[];const s=t.squad.filter(p=>xi.includes(p.id));const captain=captains[code]??null;const viceCaptain=vice[code]??null;let score=0; for(const p of s){score+=p.credits; if(captain===p.id)score+=p.credits*.5; if(viceCaptain===p.id)score+=p.credits*.25;} return {...validation.find(x=>x.code===code)!,purse:t.purse,score,xi,captain,viceCaptain};}).filter(x=>x.valid&&x.xi.length===11&&x.captain!==null&&x.viceCaptain!==null&&x.captain!==x.viceCaptain).sort((a,b)=>b.score-a.score||b.purse-a.purse),[teams,selectedXI,captains,vice,validation]);
 const progress=started?Math.min(100,(sales.length/players.length)*100):0;
 const canEnd=phase==='DONE'&&!unsoldMode;
 const toggleXI=(code:string,id:number)=>{setSelectedXI(x=>{const a=x[code]||[];if(a.includes(id))return {...x,[code]:a.filter(v=>v!==id)};if(a.length>=11)return x;return {...x,[code]:[...a,id]};});};
 const finish=()=>{if(validation.some(v=>!v.valid)){setShowTeams(true);setMessage('Some teams do not satisfy the minimum squad rules. Fix them before ending the auction.');return;} setEnded(true);setShowTeams(true);setMessage('Auction ended. Select each team’s XI, captain and vice-captain, then view the final results.');};
 const resetXI=()=>{setSelectedXI({});setCaptains({});setVice({});};

 return <div className="app">
  <header className="topbar"><div><div className="eyebrow">MOCK AUCTION • 2026</div><h1>IPL AUCTION</h1></div><div className="header-actions"><div className="stat"><span>Players sold</span><b>{soldCount}</b></div><div className="stat"><span>Phase</span><b>{phaseLabel(phase)}</b></div><button className="ghost" onClick={restart}><RotateCcw size={16}/> Reset</button></div></header>
  <div className="progress"><span style={{width:`${progress}%`}}/></div>
  {!started ? <section className="start-screen"><div className="start-card"><div className="gavel"><Gavel size={40}/></div><h2>Ready for the hammer?</h2><p>214 players • 10 teams • ₹100 Cr purse per team</p><button className="primary big" onClick={start}>Start Auction <ChevronRight size={20}/></button><button className="secondary big" onClick={simulate}><Trophy size={18}/> Simulate Sample Auction</button><div className="rules-mini"><span><ShieldCheck size={16}/> 13–15 squad size</span><span><Flag size={16}/> Max 4 overseas</span><span><Trophy size={16}/> Hidden credits</span></div></div></section> : <>
   <main className="auction-grid">
    <section className="player-panel">
      {current ? <><PlayerPhoto player={current}/><div className="player-info"><div className="tags"><span>{current.category}</span><span className={current.status==='UC'?'uncapped':''}>{current.status==='C'?'CAPPED':'UNCAPPED'}</span><span>{current.country}</span></div><h2>{current.name}</h2><div className="details"><div><small>Nationality</small><strong>{current.country}</strong></div><div><small>Base Price</small><strong>₹{(current.base/100).toFixed(2)} Cr</strong></div><div><small>Credit</small><strong className="secret">HIDDEN</strong></div></div></div></> : <div className="empty-player"><Trophy size={42}/><h2>{unsoldMode?'Re-auction complete':'Initial auction complete'}</h2><p>{unsoldMode?'No more unsold players remain.':'Choose re-auction for unsold players or end the auction.'}</p></div>}
    </section>
    <aside className="log-panel"><div className="panel-title"><div><span className="eyebrow">LIVE LEDGER</span><h3>Auction Log</h3></div><History size={19}/></div><div className="log-head"><span>PLAYER</span><span>TEAM</span><span>PRICE</span></div><div className="log-body">{sales.slice().reverse().map((s,i)=>{const p=players.find(x=>x.id===s.playerId)!;return <div className="log-row" key={i}><span title={p.name}>{p.name}</span><b className={s.result==='UNSOLD'?'unsold-text':''}>{s.team||'—'}</b><strong>{s.result==='SOLD'?`₹${s.price.toFixed(2)}`:'UNSOLD'}</strong></div>})}{sales.length===0&&<div className="no-log">No sales yet.</div>}</div></aside>
   </main>
   <section className="controlbar">
    {current ? <><div className="bid-box"><label>Current bid / price (Cr)</label><div className="bid-input"><CircleDollarSign size={18}/><input type="number" min="0" step="0.05" value={bid} onChange={e=>setBid(e.target.value)} placeholder={(current.base/100).toFixed(2)}/></div></div><div className="team-select"><label>Winning team</label><select value={team} onChange={e=>setTeam(e.target.value)}>{TEAM_CODES.map(t=><option key={t} value={t}>{t} • ₹{teams[t].purse.toFixed(2)} Cr</option>)}</select></div><button className="sold" onClick={()=>doMark('SOLD')}><CheckCircle2 size={19}/> SOLD</button><button className="unsold" onClick={()=>doMark('UNSOLD')}><XCircle size={19}/> UNSOLD</button></> : <div className="post-controls">{canEnd&&<><button className="secondary" onClick={beginUnsold}>Re-auction Unsold</button><button className="primary" onClick={finish}><Trophy size={18}/> End Auction</button></>}{ended&&<button className="secondary" onClick={()=>{setEnded(false);setShowTeams(true)}}>Edit Final XI</button>}</div>}
   </section>
   <div className="message"><span className="dot"/>{message}</div>
   <section className="team-strip">{TEAM_CODES.map(t=><button key={t} className="team-chip" onClick={()=>{setTeam(t);setShowTeams(true)}}><TeamLogo code={t}/><div><b>{t}</b><span>{teams[t].squad.length}/15</span><em>₹{teams[t].purse.toFixed(1)} Cr</em></div></button>)}</section>
   {showTeams&&<section className="teams-section"><div className="section-heading"><div><span className="eyebrow">TEAM MANAGEMENT</span><h2>{ended?'Final XI & Results':'Squads'}</h2></div><button className="ghost" onClick={()=>setShowTeams(false)}>Close</button></div>
    <div className="team-cards">{TEAM_CODES.map(code=>{const t=teams[code];const v=validation.find(x=>x.code===code)!;const xi=selectedXI[code]||[];return <div className={`team-card ${v.valid?'valid':'invalid'}`} key={code}><div className="team-card-head"><div className="team-card-identity"><TeamLogo code={code} className="large"/><div><h3>{code}</h3><small>{TEAMS.find(x=>x[1]===code)?.[0]}</small></div></div><div className="purse">₹{t.purse.toFixed(2)} Cr</div></div><div className="requirements"><span className={v.size>=13&&v.size<=15?'ok':''}>Squad {v.size}/15</span><span className={v.bats>=4?'ok':''}>BAT {v.bats}/4</span><span className={v.bowls>=3?'ok':''}>BOWL {v.bowls}/3</span><span className={v.wk>=1?'ok':''}>WK {v.wk}/1</span><span className={v.all>=2?'ok':''}>ALL {v.all}/2</span><span className={v.uc>=1?'ok':''}>UC {v.uc}/1</span><span className={v.foreign<=4?'ok':''}>OS {v.foreign}/4</span></div><div className="squad-list">{t.squad.map(p=><label key={p.id} className={ended?'xi-player':''}><input type={ended?'checkbox':'hidden'} checked={xi.includes(p.id)} onChange={()=>ended&&toggleXI(code,p.id)}/><span>{p.name}</span><small>{p.category} • ₹{p.price.toFixed(2)}</small>{ended&&xi.includes(p.id)&&<span className="selected-mark">XI</span>}</label>)}{t.squad.length===0&&<div className="no-squad">No players purchased.</div>}</div>{ended&&<div className="leadership"><select value={captains[code]??''} onChange={e=>setCaptains(c=>({...c,[code]:e.target.value?Number(e.target.value):null}))}><option value="">Captain</option>{t.squad.filter(p=>xi.includes(p.id)).map(p=><option key={p.id} value={p.id} disabled={vice[code]===p.id}>{p.name}</option>)}</select><select value={vice[code]??''} onChange={e=>setVice(c=>({...c,[code]:e.target.value?Number(e.target.value):null}))}><option value="">Vice-Captain</option>{t.squad.filter(p=>xi.includes(p.id)).map(p=><option key={p.id} value={p.id} disabled={captains[code]===p.id}>{p.name}</option>)}</select></div>}</div>})}</div>
    {ended&&<div className="results"><div className="results-head"><div><span className="eyebrow">FINAL RESULTS</span><h2>Top 3 Teams</h2></div><button className="ghost" onClick={resetXI}>Reset XI</button></div>{finalTeams.length?finalTeams.slice(0,3).map((x,i)=><div className="result-row" key={x.code}><div className="rank">{i+1}</div><TeamLogo code={x.code} className="result-logo"/><div><h3>{x.code}</h3><span>{x.xi.length} XI players • ₹{x.purse.toFixed(2)} Cr remaining</span></div><strong>{x.score.toFixed(2)} credits</strong></div>):<div className="warning"><AlertTriangle size={20}/> No team currently satisfies all squad rules and has an 11-player XI.</div>}</div>}
   </section>}
  </>}
  {saleAnimation&&<div className="sale-overlay" role="status" aria-live="polite"><div className="sale-burst"><div className="sale-ring ring-one"/><div className="sale-ring ring-two"/><div className="sale-confetti">✦</div><TeamLogo code={saleAnimation.team} className="sale-logo"/><div className="sale-label">SOLD!</div><div className="sale-team">{TEAMS.find(x=>x[1]===saleAnimation.team)?.[0]||saleAnimation.team}</div><div className="sale-player">{saleAnimation.player}</div><div className="sale-price">₹{saleAnimation.price.toFixed(2)} Cr</div></div></div>}
  <footer><span>IPL Mock Auction</span><span>Player credits are hidden during bidding and used only after the auction.</span></footer>
 </div>
}
createRoot(document.getElementById('root')!).render(<App/>);
