/* ---------- Haptics ---------- */
function triggerHaptic(type = 'light') {
  if ('vibrate' in navigator) {
    if (type === 'light') navigator.vibrate(10);
    else if (type === 'success') navigator.vibrate([10, 30, 15]);
    else if (type === 'warning') navigator.vibrate([30, 50, 30]);
  } else if (!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
    // iOS Safari has no Vibration API; a hidden switch toggle gives a tick on iOS 17.4+
    iosTick();
    if (type !== 'light') setTimeout(iosTick, 70);
  }
}
let _hx;
function iosTick(){try{if(!_hx){_hx=document.createElement('label');_hx.setAttribute('aria-hidden','true');_hx.style.cssText='position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none';_hx.innerHTML='<input type="checkbox" switch>';document.body.appendChild(_hx)}_hx.click()}catch(_){}}
const $=(s,r=document)=>r.querySelector(s),n=id=>parseFloat($('#'+id).value);
function ne43(m){if(m<3.6)return['Wire break / fault','bad'];if(m<3.8)return['Under-range (NE43)','warn'];if(m<=20.5)return['Normal','ok'];if(m<=21)return['Over-range (NE43)','warn'];return['Fault (over 21 mA)','bad']}
function mAcalc(){const m=n('ma'),lo=n('lo'),hi=n('hi');const eu=lo+(m-4)/16*(hi-lo),[s,c]=ne43(m);
 $('#maOut').className='out '+c;if(c==='bad'&&window._ne!=='bad')triggerHaptic('warning');window._ne=c;$('#maOut').innerHTML=`<b>${s}</b><br>Value: ${eu.toFixed(2)} (${((m-4)/16*100).toFixed(1)}% of span)`}
function sgFromAPI(a){return 141.5/(a+131.5)}
const clampAlpha=v=>{let x=Math.abs(parseFloat(v));if(!isFinite(x))x=0.0008;return Math.min(0.0025,Math.max(0.0001,x))};
function volCalc(){const t=$('#shape').value,D=n('dia'),h=n('lvl'),T=n('temp'),sg=n('sg'),a=clampAlpha($('#alpha').value);let V;
 if(t==='cyl')V=Math.PI/4*D*D*h;else{const R=D/2;V=Math.PI*h*h*(3*R-h)/3}
 const vcf=1-a*(T-15),rho=sg*1000*vcf,V15=V*vcf,mt=V*rho/1000;
 $('#volOut').className='out';$('#volOut').innerHTML=`Gross volume: ${V.toFixed(2)} m³<br>Approx. standard volume @15°C: ${V15.toFixed(2)} m³<br>Density @${T}°C: ${rho.toFixed(1)} kg/m³<br>Mass: ${mt.toFixed(2)} t<br><small>Linear expansion estimate only. Use API MPMS 11.1 tables for custody transfer.</small>`}
function overfill(){const A=Math.PI/4*Math.pow(n('odia'),2),fill=n('rate'),gap=n('gap'),resp=n('resp');const tmin=gap*A/fill*60,margin=tmin-resp;
 $('#ofOut').className='out '+(margin<0?'bad':margin<5?'warn':'');$('#ofOut').innerHTML=`Time from HH to overflow: ${tmin.toFixed(1)} min<br>Required response: ${resp} min<br>Margin: <b>${margin.toFixed(1)} min</b>${margin<0?'<br>Insufficient margin: lower HH setpoint or fill rate.':''}`}
function apiCalc(){const g=sgFromAPI(n('api'));$('#apiOut').className='out';$('#apiOut').innerHTML=`SG @60°F: ${g.toFixed(4)}<br>Density: ${(g*999.0).toFixed(1)} kg/m³ (approx.)`}
let proofT=null;
let proofEnd=0;
function proofTick(){const o=$('#ptOut'),s=Math.max(0,Math.ceil((proofEnd-Date.now())/1000));o.textContent=`Proof test countdown: ${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;if(s<=0){clearInterval(proofT);proofT=null;o.textContent='Time elapsed: record result';if(navigator.vibrate)navigator.vibrate([300,100,300])}}
function proof(){clearInterval(proofT);const m=n('pt');if(!(m>0)){toast('Enter minutes above 0');return}triggerHaptic('light');proofEnd=Date.now()+m*60000;proofTick();proofT=setInterval(proofTick,250)}
document.addEventListener('visibilitychange',()=>{if(proofT&&!document.hidden)proofTick()});addEventListener('pageshow',()=>{if(proofT)proofTick()});
function tankSvg(p){return `<svg class="tank" viewBox="0 0 100 130" role="img" aria-label="Tank level ${p}%"><rect x="15" y="10" width="70" height="110" rx="6" fill="none" stroke="currentColor" stroke-width="4"/><rect class="lvl" id="lv" x="19" y="${116-1.04*p}" width="62" height="${1.04*p}"/><text x="50" y="70" text-anchor="middle" fill="currentColor" font-size="16" font-weight="700" id="lvt">${p}%</text></svg>`}
function renderCalc(){const v=$('#view-calc');v.innerHTML=`<h2>Interactive Field Calculators</h2>
<div class="card"><h3>4–20 mA loop (NAMUR NE43)</h3><div class="grid"><div><label>mA</label><input id="ma" type="number" step="any" inputmode="decimal" value="12"></div><div><label>Range low</label><input id="lo" type="number" step="any" inputmode="decimal" value="0"></div></div><label>Range high</label><input id="hi" type="number" step="any" inputmode="decimal" value="20"><div id="maOut" class="out"></div></div>
<div class="card"><h3>Tank volume & mass</h3><label>Shape</label><select id="shape"><option value="cyl">Vertical cylinder</option><option value="sph">Sphere</option></select><div class="grid"><div><label>Diameter (m)</label><input id="dia" type="number" step="any" inputmode="decimal" value="30"></div><div><label>Level (m)</label><input id="lvl" type="number" step="any" inputmode="decimal" value="10"></div><div><label>Temp (°C)</label><input id="temp" type="number" step="any" inputmode="decimal" value="35"></div><div><label>SG @15°C</label><input id="sg" type="number" step="any" inputmode="decimal" value="0.85"></div><div><label>Tank height (m, cylinder)</label><input id="thgt" type="number" step="any" inputmode="decimal" value="14"></div></div><div id="tankBox"></div><div id="tankInfo" class="out"></div><details class="alarmset"><summary>Tank alarm levels (LL, L, H, HH %)</summary><div class="grid"><div><label>LL (%)</label><input id="aLL" type="number" step="any" inputmode="decimal" value="5"></div><div><label>L (%)</label><input id="aL" type="number" step="any" inputmode="decimal" value="10"></div><div><label>H (%)</label><input id="aH" type="number" step="any" inputmode="decimal" value="85"></div><div><label>HH (%)</label><input id="aHH" type="number" step="any" inputmode="decimal" value="92"></div></div></details><label>Expansion coefficient (1/°C, 0.0001 to 0.0025)</label><input id="alpha" type="number" step="any" inputmode="decimal" min="0.0001" max="0.0025" value="0.0008"><label>Or API gravity to SG</label><input id="api" type="number" step="any" inputmode="decimal" value="35"><button id="apiBtn" style="margin-top:6px">Convert API</button><div id="apiOut" class="out"></div><div id="volOut" class="out"></div></div>
<div class="card"><h3>HH overfill response time</h3><div class="grid"><div><label>Diameter (m)</label><input id="odia" type="number" step="any" inputmode="decimal" value="30"></div><div><label>Max fill (m³/h)</label><input id="rate" type="number" step="any" inputmode="decimal" value="1500"></div><div><label>HH to overflow (m)</label><input id="gap" type="number" step="any" inputmode="decimal" value="0.6"></div><div><label>Required response (min)</label><input id="resp" type="number" step="any" inputmode="decimal" value="10"></div></div><div id="ofOut" class="out"></div></div>
<div class="card"><h3>Proof-test timer</h3><label>Minutes</label><input id="pt" type="number" step="any" inputmode="decimal" value="15"><button id="ptBtn" style="margin-top:6px">Start</button><div id="ptOut" class="out">Not started</div></div>`;
 v.addEventListener('input',e=>{const i=e.target.id;if(['ma','lo','hi'].includes(i))mAcalc();else if(['thgt','aLL','aL','aH','aHH'].includes(i)){drawTank()}else if(['shape','dia','lvl','temp','sg','alpha'].includes(i)){volCalc();drawTank()}else if(['odia','rate','gap','resp'].includes(i))overfill()});
 v.addEventListener('change',e=>{if(e.target.id==='alpha'){e.target.value=clampAlpha(e.target.value);volCalc();drawTank()}});
 $('#shape').onchange=()=>{volCalc();drawTank()};$('#apiBtn').onclick=()=>{apiCalc();$('#sg').value=sgFromAPI(n('api')).toFixed(4);volCalc()};$('#ptBtn').onclick=proof;mAcalc();volCalc();drawTank();overfill();renderTools();renderSat();renderPt100();renderModbus();pRestore()}

/* ---------- Field tools ---------- */
const NUM='type="number" step="any" inputmode="decimal"';
const store={get(){try{return JSON.parse(localStorage.getItem('calRecords')||'[]')}catch(_){return[]}},set(v){try{localStorage.setItem('calRecords',JSON.stringify(v));return true}catch(_){return false}}};
const PTS=[0,25,50,75,100];
function calRows(){const lo=n('clo'),hi=n('chi'),tol=n('ctol');return PTS.map((p,i)=>{const exp=4+16*p/100,m=Math.min(25,Math.max(0,parseFloat($('#m'+i).value))),err=isNaN(m)?null:(m-exp)/16*100;
 $('#e'+i).textContent=err===null?'-':err.toFixed(3)+'%';$('#e'+i).style.fontWeight=700;$('#e'+i).style.color=err!==null&&Math.abs(err)>tol?'#ef4444':'';return{p,eu:+(lo+p/100*(hi-lo)).toFixed(3),exp:+exp.toFixed(3),meas:isNaN(m)?null:m,err}})}
function listRecords(){const r=store.get();$('#calList').innerHTML=r.length?r.map((x,i)=>({x,i})).reverse().map(({x,i})=>`<div class="out rec ${x.pass?'':'bad'}"><div><b>${x.tag||'No tag'}</b> ${x.pass?'PASS':'FAIL'}<br>${new Date(x.ts).toLocaleString()} | max error ${x.maxErr.toFixed(3)}% (tol ${x.tol}%)</div><button class="del" data-i="${i}" aria-label="Delete record ${x.tag||''}">✕</button></div>`).join(''):'<div class="out">No saved records</div>'}
function saveCal(){const rows=calRows();const tagV=$('#ctag').value.trim();if(!tagV){triggerHaptic('warning');dlg('<h3>Instrument Tag required</h3><p>Please enter an Instrument Tag (e.g. LT-101) before saving.</p>');return}
 if(rows.some(r=>r.meas===null)){toast('Enter all 5 measured values');return}
 const tg=tagV;
 const tol=n('ctol'),maxErr=Math.max(...rows.map(r=>Math.abs(r.err))),rec={ts:Date.now(),tag:tg,lo:n('clo'),hi:n('chi'),unit:$('#cunit').value,tol,rows,maxErr,pass:maxErr<=tol};
 const all=store.get();all.push(rec);toast(store.set(all)?'Calibration saved':'Storage unavailable');triggerHaptic(rec.pass?'success':'warning');listRecords()}
let swT0=null,swRaf=0,swEl=0;
function swTick(){swEl=performance.now()-swT0;$('#swOut').textContent=(swEl/1000).toFixed(3)+' s';swRaf=requestAnimationFrame(swTick)}
function swToggle(){if(swT0===null){triggerHaptic('light');swT0=performance.now();$('#swBtn').textContent='Stop';$('#swRes').textContent='Running…';$('#swRes').className='out';swTick()}
 else{cancelAnimationFrame(swRaf);swEl=performance.now()-swT0;swT0=null;$('#swBtn').textContent='Start';$('#swOut').textContent=(swEl/1000).toFixed(3)+' s';swCheck()}}
function swCheck(){const tg=n('swTarget')*1000;if(isNaN(tg)||!swEl)return;const ok=swEl<=tg;triggerHaptic(ok?'success':'warning');$('#swRes').className='out '+(ok?'':'bad');$('#swRes').innerHTML=`<b>${ok?'PASS':'FAIL'}</b>: ${Math.round(swEl)} ms vs target ${Math.round(tg)} ms (${ok?'-':'+'}${Math.abs(Math.round(swEl-tg))} ms)`}
function swReset(){cancelAnimationFrame(swRaf);swT0=null;swEl=0;$('#swBtn').textContent='Start';$('#swOut').textContent='0.000 s';$('#swRes').className='out';$('#swRes').textContent='Ready'}
function reg(id){let v=$('#'+id).value.trim(),f=$('#rfmt').value;if(!v)return NaN;const x=f==='hex'?(/^(0x)?[0-9a-f]{1,4}$/i.test(v)?parseInt(v.replace(/^0x/i,''),16):NaN):(/^\d{1,5}$/.test(v)?parseInt(v,10):NaN);return x>=0&&x<=65535?x:NaN}
function toFloat(a,b,bs,ws){let w=ws?[b,a]:[a,b];if(bs)w=w.map(x=>((x&255)<<8)|(x>>8));const dv=new DataView(new ArrayBuffer(4));dv.setUint16(0,w[0]);dv.setUint16(2,w[1]);return{f:dv.getFloat32(0),hex:'0x'+w.map(x=>x.toString(16).padStart(4,'0')).join('').toUpperCase()}}
function fpCalc(){const a=reg('r1'),b=reg('r2'),o=$('#fpOut');if(isNaN(a)||isNaN(b)){o.className='out bad';o.textContent='Enter two valid 16-bit values (0-65535 or 0000-FFFF)';$('#fpAll').innerHTML='';return}
 const r=toFloat(a,b,$('#bs').checked,$('#ws').checked);o.className='out';o.innerHTML=`<b>${Number.isFinite(r.f)?r.f.toPrecision(8):r.f}</b><br>Assembled bytes: ${r.hex}`;
 $('#fpAll').innerHTML='<table class="cal"><tr><th>Order</th><th>Value</th></tr>'+[['ABCD',0,0],['CDAB (word swap)',0,1],['BADC (byte swap)',1,0],['DCBA (both)',1,1]].map(([l,x,y])=>`<tr><td>${l}</td><td>${toFloat(a,b,!!x,!!y).f.toPrecision(7)}</td></tr>`).join('')+'</table>'}
function renderTools(){const v=$('#view-tools');
 v.innerHTML=`<h2>Field Tools</h2>
<div class="card"><h3>Loop calibrator (5-point)</h3><div class="grid"><div><label>Tag</label><input id="ctag" type="text" placeholder="LT-101"></div><div><label>Unit</label><input id="cunit" type="text" value="m"></div><div><label>Range low</label><input id="clo" ${NUM} value="0"></div><div><label>Range high</label><input id="chi" ${NUM} value="20"></div></div><label>Tolerance (% of span)</label><input id="ctol" ${NUM} value="0.25">
<table class="cal"><tr><th>%</th><th>EU</th><th>Exp mA</th><th>Measured</th><th>Error</th></tr>${PTS.map((p,i)=>`<tr><td>${p}</td><td id="u${i}"></td><td>${(4+16*p/100).toFixed(2)}</td><td><input id="m${i}" class="cm" ${NUM} min="0" max="25"></td><td id="e${i}">-</td></tr>`).join('')}</table>
<div class="row"><button id="calSave">Save record</button><button id="calClear">Clear records</button><button id="calCsv">Export to CSV</button></div><div id="calList"></div></div>
<div class="card"><h3>ESD valve stroke stopwatch</h3><div class="big" id="swOut">0.000 s</div><label>Target stroke time (s)</label><input id="swTarget" ${NUM} value="30"><div class="row"><button id="swBtn">Start</button><button id="swReset">Reset</button></div><div id="swRes" class="out">Ready</div></div>
<div class="card"><h3>Modbus register to IEEE 754 float</h3><label>Input format</label><select id="rfmt"><option value="hex">Hex</option><option value="dec">Decimal</option></select><div class="grid"><div><label>Register 1</label><input id="r1" type="text" inputmode="text" autocapitalize="characters" value="41C8"></div><div><label>Register 2</label><input id="r2" type="text" inputmode="text" autocapitalize="characters" value="0000"></div></div><label class="chk"><input id="bs" type="checkbox"> Byte swap</label><label class="chk"><input id="ws" type="checkbox"> Word swap</label><div id="fpOut" class="out"></div><div id="fpAll"></div></div>`;
 const ux=()=>{const lo=n('clo'),hi=n('chi');PTS.forEach((p,i)=>$('#u'+i).textContent=(lo+p/100*(hi-lo)).toFixed(2))};
 v.addEventListener('input',e=>{const i=e.target.id;if(e.target.classList.contains('cm')){let x=e.target.value;if(x.indexOf('-')>=0)x=x.replace(/-/g,'');if(x!==''&&parseFloat(x)>25)x='25';if(x!==e.target.value)e.target.value=x}if(['clo','chi'].includes(i))ux();if(e.target.classList.contains('cm')||['clo','chi','ctol'].includes(i))calRows();if(i==='swTarget'&&swT0===null)swCheck();if((i==='r1'||i==='r2')&&$('#rfmt').value==='hex'){const c=e.target.value.replace(/\s+/g,'').replace(/^0x/i,'').replace(/[^0-9a-f]/gi,'').toUpperCase().slice(0,4);if(c!==e.target.value)e.target.value=c}if(['r1','r2','bs','ws'].includes(i))fpCalc()});
 v.addEventListener('focusout',e=>{const i=e.target.id;if((i==='r1'||i==='r2')&&$('#rfmt').value==='hex'){const x=e.target.value;if(x.length>=1&&x.length<4)e.target.value=x.padStart(4,'0');fpCalc()}});
 v.addEventListener('change',e=>{if(e.target.classList.contains('cm')&&e.target.value!==''){e.target.value=Math.min(25,Math.max(0,Math.abs(parseFloat(e.target.value)||0))).toFixed(2);calRows()}});
 $('#rfmt').onchange=()=>{const hex=$('#rfmt').value==='hex';[ 'r1','r2'].forEach(id=>{const e=$('#'+id),x=parseInt(e.value,hex?10:16);if(!isNaN(x))e.value=hex?x.toString(16).toUpperCase().padStart(4,'0'):parseInt(e.value,16)});fpCalc()};
 $('#calSave').onclick=saveCal;$('#calList').onclick=e=>{const b=e.target.closest('.del');if(!b||!confirm('Delete this record?'))return;triggerHaptic('warning');const a=store.get();a.splice(+b.dataset.i,1);store.set(a);listRecords()};$('#calCsv').onclick=csvCal;$('#calClear').onclick=()=>{if(confirm('Delete all saved calibration records?')){triggerHaptic('warning');store.set([]);listRecords()}};
 $('#swBtn').onclick=swToggle;$('#swReset').onclick=swReset;ux();listRecords();fpCalc()}

/* ---------- CSV export ---------- */
function csvCal(){const r=store.get();if(!r.length){toast('No records to export');return}
 const q=v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"';
 const head=['Timestamp','Tag','Unit','Range low','Range high','Tolerance %','Result','Max error %',...PTS.flatMap(p=>['Measured mA @'+p+'%','Error % @'+p+'%'])];
 const lines=[head.map(q).join(',')].concat(r.map(x=>[new Date(x.ts).toISOString(),x.tag,x.unit,x.lo,x.hi,x.tol,x.pass?'PASS':'FAIL',x.maxErr.toFixed(4),...x.rows.flatMap(w=>[w.meas,w.err===null?'':w.err.toFixed(4)])].map(q).join(',')));
 const b=new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='loop-calibration-'+new Date().toISOString().slice(0,10)+'.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000);toast('CSV exported');triggerHaptic('success')}

/* ---------- Pt100 (IEC 60751) ---------- */
function rtdT(R,R0){const A=3.9083e-3,B=-5.775e-7,C=-4.183e-12;let t=(R/R0-1)/A;
 for(let i=0;i<40;i++){const f=t<0?R0*(1+A*t+B*t*t+C*(t-100)*t*t*t):R0*(1+A*t+B*t*t),d=t<0?R0*(A+2*B*t+C*(4*t*t*t-300*t*t)):R0*(A+2*B*t),nt=t-(f-R)/d;if(Math.abs(nt-t)<1e-9){t=nt;break}t=nt}return t}
function rtdCalc(){const R=n('rtdR'),R0=n('rtdR0'),o=$('#rtdOut');if(!(R>0)||!(R0>0)){o.className='out bad';o.textContent='Enter resistance and R0 above 0 ohm';return}
 const t=rtdT(R,R0);if(!isFinite(t)||t<-200.5||t>850.5){o.className='out bad';o.innerHTML=`Outside IEC 60751 range (-200 to 850 °C).<br>Check for open sensor (very high ohms) or short (very low ohms).`;return}
 o.className='out';o.innerHTML=`<b>${t.toFixed(2)} °C</b> (${(t*9/5+32).toFixed(2)} °F)<br>Sensitivity near 0 °C: ${(R0*3.9083e-3).toFixed(3)} ohm/°C`}
function renderPt100(){$('#view-tools').insertAdjacentHTML('beforeend',`<div class="card"><h3>Pt100 RTD ohms to °C (IEC 60751)</h3><div class="grid"><div><label>Resistance (ohm)</label><input id="rtdR" ${NUM} value="138.51"></div><div><label>R0 at 0 °C (ohm)</label><input id="rtdR0" ${NUM} value="100"></div></div><div id="rtdOut" class="out"></div><small>Callendar-Van Dusen, alpha 0.00385. Use R0 = 1000 for Pt1000. Subtract lead resistance for 2-wire sensors first.</small></div>`);
 $('#view-tools').addEventListener('input',e=>{if(e.target.id==='rtdR'||e.target.id==='rtdR0')rtdCalc()});rtdCalc()}

/* ---------- Interactive SAT checklist ---------- */
const SAT_ITEMS=[
['Cold Loop',['Tag, range, units and loop sheet match the as-built P&ID','Cable continuity, insulation resistance and shield earthing checked','IS barrier parameters (Uo/Io/Po vs Ui/Ii/Pi) and earth verified','Loop supply voltage and loop resistance within device limits','HART / fieldbus communication and configuration read back OK']],
['Hot Loop (0-100%)',['Inject or simulate 0, 25, 50, 75 and 100% and record as-found / as-left','HMI value and units match the field reading at all five points','LL, L, H and HH alarm setpoints and deadbands tested','NE43 under-range, over-range and wire-break faults annunciate with bad quality','Trend, historian and tag naming verified in SCADA']],
['Safety Interlock / ESD',['Independent HH switch trips with no PLC or SCADA involvement','ESD valve closes on HH trip and stroke time is recorded against target','Hardwired ESD overrides local and remote MOV commands','Bypass is key-locked, alarmed, logged and time-limited','Fail-safe state confirmed on loss of power, air and communications']],
['ATG Dip Verification',['Reference (datum) height confirmed with a calibrated dip tape','Radar / servo reading compared to manual dip at 3 or more levels','Water dip and free-water check recorded','Average temperature compared to a spot / thief reading','Tank table version, corrections and density configuration documented']]];
const satGet=()=>{try{return JSON.parse(localStorage.getItem('satChecks2')||'{}')}catch(_){return{}}};
const satSet=o=>{try{localStorage.setItem('satChecks2',JSON.stringify(o))}catch(_){}};
function satProgress(){const t=document.querySelectorAll('.satchk').length,c=document.querySelectorAll('.satchk:checked').length;$('#satProg').textContent=c+' of '+t+' complete';$('#satProg').className='out '+(c===t?'':'warn')}
function renderSat(){const s=satGet();let i=0;
 const sv=$('#view-sat'),old=Array.from(sv.children).filter(c=>c.classList&&c.classList.contains('card'));
 if(old.length&&!sv.querySelector('details.guide-acc')){const det=document.createElement('details');det.className='card guide-acc';det.innerHTML='<summary>SAT Guidelines</summary>';old.forEach(c=>{c.classList.remove('card');c.classList.add('sub');det.appendChild(c)});const h2=sv.querySelector('h2');if(h2)h2.after(det);else sv.prepend(det)}
 const body=SAT_ITEMS.map(([g,items])=>'<h3 style="margin-top:12px">'+g+'</h3>'+items.map(t=>{const id='s'+(i++);return '<label class="chk"><input type="checkbox" class="satchk" id="'+id+'"'+(s[id]?' checked':'')+'><span>'+t+'</span></label>'}).join('')).join('');
 $('#view-sat').insertAdjacentHTML('beforeend','<article class="card"><h3>Interactive SAT checklist (20 steps)</h3><div class="satmeta"><div><label>Tank / loop reference</label><input id="satRef" type="text" placeholder="TK-101 / LT-101"></div><div><label>Engineer</label><input id="satEng" type="text"></div></div><div id="satProg" class="out"></div>'+body+'<div class="row"><button id="satReset">Reset Checklist</button><button id="satExp">Export SAT Report</button></div></article>');
 $('#view-sat').addEventListener('change',e=>{if(!e.target.classList.contains('satchk'))return;const o=satGet();if(e.target.checked)o[e.target.id]=1;else delete o[e.target.id];satSet(o);satProgress();triggerHaptic(document.querySelectorAll('.satchk').length===document.querySelectorAll('.satchk:checked').length?'success':'light')});
 $('#satExp').onclick=satExport;$('#satReset').onclick=()=>{if(confirm('Reset the whole SAT checklist?')){triggerHaptic('warning');satSet({});document.querySelectorAll('.satchk').forEach(c=>c.checked=false);satProgress()}};satProgress()}

/* ---------- Modbus exception decoder & RS-485 guide ---------- */
const MBX={
'01':['Illegal Function','The slave does not support this function code (for example FC04 on a holding-only map, or a write to a read-only device).','Check the vendor register map for supported FCs. Try FC03 instead of FC04 (or the reverse); use FC16 instead of FC06 if the device requires it.'],
'02':['Illegal Data Address','The register or coil is outside the slave map. Most common cause is 0-based vs 1-based addressing (offset of +1 or -1), or including the 4xxxx prefix in the address.','Try the address minus 1, then plus 1. Strip the 4xxxx prefix (40001 = offset 0). Make sure a block read does not run past the last valid register.'],
'03':['Illegal Data Value','The quantity or value is invalid: too many registers in one request (over 125 for FC03/04, over 123 for FC16), a write value out of range, or a bad coil value.','Reduce the read count. Match the data type and range in the manual. Write 32-bit values with one FC16 request covering both registers.'],
'04':['Slave Device Failure','An unrecoverable error occurred inside the slave while handling a valid request (device fault, sensor failure, internal gateway error).','Check device diagnostics and LEDs, the sensor and configuration. Power-cycle if allowed, then escalate to the vendor.'],
'05':['Acknowledge','The slave accepted the request but needs a long time to process it.','Poll later for completion. Do not resend the request repeatedly.'],
'06':['Slave Device Busy','The slave is busy with a long-running command.','Retry after a delay, lower the poll rate and lengthen the inter-request gap.'],
'0A':['Gateway Path Unavailable','The gateway cannot route to the target (routing table, serial port or unit ID mapping is wrong).','Check gateway port settings and the unit ID mapping.'],
'0B':['Gateway Target Failed to Respond','The gateway forwarded the request but nothing answered on the serial side.','Check slave ID, baud/parity/stop bits, wiring and power at the target device.']};
function mbxShow(){const x=MBX[$('#mbx').value];$('#mbxOut').className='out warn';$('#mbxOut').innerHTML='<b>'+x[0]+'</b><br><b>Likely cause:</b> '+x[1]+'<br><b>Fix:</b> '+x[2]}
function renderModbus(){$('#view-tools').insertAdjacentHTML('beforeend',`<div class="card"><h3>Modbus exception decoder</h3><label>Exception code</label><select id="mbx">${Object.keys(MBX).map(k=>`<option value="${k}">${k} - ${MBX[k][0]}</option>`).join('')}</select><div id="mbxOut" class="out"></div></div>
<div class="card"><h3>RS-485 diagnostic guide</h3><p>No response at all (timeout) is not an exception code. Work through the wiring and settings first:</p><ul><li>A/B polarity: swap the pair if nothing answers (labels differ between vendors).</li><li>120 ohm termination at the two ends of the bus only, with bias resistors at one point.</li><li>Match baud rate, parity and stop bits exactly (8E1 vs 8N2 is a common slip).</li><li>Unique slave ID per device; confirm the unit ID on gateways.</li><li>Daisy-chain topology, no stars; keep within 1200 m and 32 unit loads (fewer with long cable).</li><li>Shield grounded at one end, plus a common reference wire on long runs.</li><li>Address check: try offset -1 / +1 (0-based vs 1-based), and confirm word and byte order for 32-bit values.</li><li>Raise the response timeout and add an inter-request gap for slow devices.</li></ul></div>`);
 $('#mbx').onchange=mbxShow;mbxShow()}

/* ---------- Live tank faceplate ---------- */
function drawTank(){const box=$('#tankBox');if(!box)return;const sph=$('#shape').value==='sph',D=n('dia'),H=sph?D:n('thgt');let h=n('lvl');
 if(!(H>0)||!(D>0)||isNaN(h)){$('#tankInfo').className='out warn';$('#tankInfo').textContent='Enter diameter, height and level';return}
 h=Math.max(0,Math.min(h,H));const pct=h/H*100,al={HH:n('aHH'),H:n('aH'),L:n('aL'),LL:n('aLL')},top=20,bot=240,y=p=>bot-(bot-top)*p/100,x0=sph?20:60,ty=220*(1-pct/100),sig=[sph,al.HH,al.H,al.L,al.LL].join('|');
 const setL=()=>{const e=document.getElementById('tliq');if(e)e.style.transform='translateY('+ty+'px)'};
 if(box.dataset.sig!==sig){
  const clip=sph?'<circle cx="130" cy="130" r="110"/>':'<rect x="62" y="20" width="136" height="220"/>',frame=sph?'<circle cx="130" cy="130" r="110" fill="none" stroke="currentColor" stroke-width="3"/>':'<rect x="60" y="20" width="140" height="220" rx="6" fill="none" stroke="currentColor" stroke-width="3"/>';
  const lines=Object.entries(al).filter(([k,v])=>v>=0&&v<=100).map(([k,v])=>`<line class="al ${k==='HH'||k==='LL'?'crit':'warn'}" x1="${x0}" x2="246" y1="${y(v)}" y2="${y(v)}"/><text x="250" y="${y(v)+4}" font-size="11" fill="currentColor">${k} ${v}%</text>`).join('');
  box.innerHTML=`<svg class="tank2" viewBox="0 0 320 260" role="img"><defs><clipPath id="tclip">${clip}</clipPath></defs><g clip-path="url(#tclip)"><rect id="tliq" class="lvl" x="20" y="20" width="220" height="220" style="transform:translateY(220px)"/></g>${frame}${lines}</svg>`;
  box.dataset.sig=sig;(window.requestAnimationFrame||setTimeout)(()=>(window.requestAnimationFrame||setTimeout)(setL))}else setL();
 box.firstChild.setAttribute('aria-label','Tank level '+pct.toFixed(0)+' percent');
 const R=D/2,V=sph?Math.PI*h*h*(3*R-h)/3:Math.PI/4*D*D*h;
 const st=pct>=al.HH?['HH alarm','bad']:pct>=al.H?['H alarm','warn']:pct<=al.LL?['LL alarm','bad']:pct<=al.L?['L alarm','warn']:['Normal',''];
 $('#tankInfo').className='out '+st[1];if(window._tk!==undefined&&window._tk!==st[0]&&st[1]==='bad')triggerHaptic('warning');window._tk=st[0];$('#tankInfo').innerHTML=`<b>${st[0]}</b><br>Level ${h.toFixed(2)} m of ${H.toFixed(2)} m (${pct.toFixed(1)}%)<br>Gross volume ${V.toFixed(1)} m³`}

/* ---------- Input persistence ---------- */
const PKEY='agacInputs';
const pGet=()=>{try{return JSON.parse(localStorage.getItem(PKEY)||'{}')}catch(_){return{}}};
function pSave(e){const t=e.target;if(!t.id||!t.closest||t.classList.contains('satchk')||!t.closest('#view-calc,#view-tools,#view-sat'))return;const o=pGet();o[t.id]=t.type==='checkbox'?t.checked:t.value;try{localStorage.setItem(PKEY,JSON.stringify(o))}catch(_){}}
document.addEventListener('input',pSave);document.addEventListener('change',pSave);
function pRestore(){const o=pGet();
 for(const id in o){const el=document.getElementById(id);if(!el||!el.closest('#view-calc,#view-tools,#view-sat'))continue;if(el.type==='checkbox')el.checked=!!o[id];else el.value=o[id]}
 document.querySelectorAll('#view-calc input,#view-tools input,#view-sat input').forEach(el=>{if(el.id&&o[el.id]!==undefined&&el.type!=='checkbox')el.dispatchEvent(new Event('input',{bubbles:true}))});
 {const al=$('#alpha');if(al)al.value=clampAlpha(al.value)}
 [volCalc,drawTank,mbxShow,fpCalc,mAcalc,overfill].forEach(f=>{try{f()}catch(_){}})}

/* ---------- SAT report export ---------- */
function satReport(){const s=satGet(),L=['AGAC TANK FARM SCADA - SAT REPORT','Reference: '+($('#satRef').value||'-'),'Engineer: '+($('#satEng').value||'-'),'Date: '+new Date().toLocaleString(),'Progress: '+document.querySelectorAll('.satchk:checked').length+' of '+document.querySelectorAll('.satchk').length,''];let i=0;
 SAT_ITEMS.forEach(([g,items])=>{L.push(g.toUpperCase());items.forEach(x=>{L.push((s['s'+i]?'[x] ':'[ ] ')+x);i++});L.push('')});L.push('Signature: ______________________');return L.join('\n')}
function satExport(){const txt=satReport();
 dlg('<h3>SAT report</h3><textarea id="satTxt" readonly style="min-height:240px;font-size:12px">'+txt.replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</textarea><div class="row"><button id="satCp">Copy</button><button id="satDl">Download .txt</button><button id="satSh">Share</button></div>');
 $('#satCp').onclick=async()=>{try{await navigator.clipboard.writeText(txt)}catch(_){$('#satTxt').select();document.execCommand('copy')}toast('Copied')};
 $('#satDl').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([txt],{type:'text/plain'}));a.download='SAT-report-'+new Date().toISOString().slice(0,10)+'.txt';document.body.appendChild(a);a.click();a.remove()};
 $('#satSh').onclick=()=>{if(navigator.share)navigator.share({title:'SAT report',text:txt}).catch(()=>{});else toast('Share not supported, use Copy')}}
