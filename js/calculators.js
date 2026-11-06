const $=(s,r=document)=>r.querySelector(s),n=id=>parseFloat($('#'+id).value);
function ne43(m){if(m<3.6)return['Wire break / fault','bad'];if(m<3.8)return['Under-range (NE43)','warn'];if(m<=20.5)return['Normal','ok'];if(m<=21)return['Over-range (NE43)','warn'];return['Fault (over 21 mA)','bad']}
function mAcalc(){const m=n('ma'),lo=n('lo'),hi=n('hi');const eu=lo+(m-4)/16*(hi-lo),[s,c]=ne43(m);
 $('#maOut').className='out '+c;$('#maOut').innerHTML=`<b>${s}</b><br>Value: ${eu.toFixed(2)} (${((m-4)/16*100).toFixed(1)}% of span)`}
function sgFromAPI(a){return 141.5/(a+131.5)}
function volCalc(){const t=$('#shape').value,D=n('dia'),h=n('lvl'),T=n('temp'),sg=n('sg'),a=n('alpha');let V;
 if(t==='cyl')V=Math.PI/4*D*D*h;else{const R=D/2;V=Math.PI*h*h*(3*R-h)/3}
 const vcf=1-a*(T-15),rho=sg*1000*vcf,V15=V*vcf,mt=V*rho/1000;
 $('#volOut').className='out';$('#volOut').innerHTML=`Gross volume: ${V.toFixed(2)} m³<br>Approx. standard volume @15°C: ${V15.toFixed(2)} m³<br>Density @${T}°C: ${rho.toFixed(1)} kg/m³<br>Mass: ${mt.toFixed(2)} t<br><small>Linear expansion estimate only. Use API MPMS 11.1 tables for custody transfer.</small>`}
function overfill(){const A=Math.PI/4*Math.pow(n('odia'),2),fill=n('rate'),gap=n('gap'),resp=n('resp');const tmin=gap*A/fill*60,margin=tmin-resp;
 $('#ofOut').className='out '+(margin<0?'bad':margin<5?'warn':'');$('#ofOut').innerHTML=`Time from HH to overflow: ${tmin.toFixed(1)} min<br>Required response: ${resp} min<br>Margin: <b>${margin.toFixed(1)} min</b>${margin<0?'<br>Insufficient margin: lower HH setpoint or fill rate.':''}`}
function apiCalc(){const g=sgFromAPI(n('api'));$('#apiOut').className='out';$('#apiOut').innerHTML=`SG @60°F: ${g.toFixed(4)}<br>Density: ${(g*999.0).toFixed(1)} kg/m³ (approx.)`}
let proofT=null;
function proof(){clearInterval(proofT);let s=Math.round(n('pt')*60);const o=$('#ptOut');proofT=setInterval(()=>{o.textContent=`Proof test countdown: ${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;if(s--<=0){clearInterval(proofT);o.textContent='Time elapsed: record result'}},1000)}
function tankSvg(p){return `<svg class="tank" viewBox="0 0 100 130" role="img" aria-label="Tank level ${p}%"><rect x="15" y="10" width="70" height="110" rx="6" fill="none" stroke="currentColor" stroke-width="4"/><rect class="lvl" id="lv" x="19" y="${116-1.04*p}" width="62" height="${1.04*p}"/><text x="50" y="70" text-anchor="middle" fill="currentColor" font-size="16" font-weight="700" id="lvt">${p}%</text></svg>`}
function renderCalc(){const v=$('#view-calc');v.innerHTML=`<h2>Interactive Field Calculators</h2>
<div class="card"><h3>4–20 mA loop (NAMUR NE43)</h3><div class="grid"><div><label>mA</label><input id="ma" type="number" step="any" inputmode="decimal" value="12"></div><div><label>Range low</label><input id="lo" type="number" step="any" inputmode="decimal" value="0"></div></div><label>Range high</label><input id="hi" type="number" step="any" inputmode="decimal" value="20"><div id="maOut" class="out"></div></div>
<div class="card"><h3>Tank volume & mass</h3><label>Shape</label><select id="shape"><option value="cyl">Vertical cylinder</option><option value="sph">Sphere</option></select><div class="grid"><div><label>Diameter (m)</label><input id="dia" type="number" step="any" inputmode="decimal" value="30"></div><div><label>Level (m)</label><input id="lvl" type="number" step="any" inputmode="decimal" value="10"></div><div><label>Temp (°C)</label><input id="temp" type="number" step="any" inputmode="decimal" value="35"></div><div><label>SG @15°C</label><input id="sg" type="number" step="any" inputmode="decimal" value="0.85"></div></div><label>Expansion coefficient (1/°C)</label><input id="alpha" type="number" step="any" inputmode="decimal" value="0.0008"><label>Or API gravity to SG</label><input id="api" type="number" step="any" inputmode="decimal" value="35"><button id="apiBtn" style="margin-top:6px">Convert API</button><div id="apiOut" class="out"></div><div id="volOut" class="out"></div></div>
<div class="card"><h3>HH overfill response time</h3><div class="grid"><div><label>Diameter (m)</label><input id="odia" type="number" step="any" inputmode="decimal" value="30"></div><div><label>Max fill (m³/h)</label><input id="rate" type="number" step="any" inputmode="decimal" value="1500"></div><div><label>HH to overflow (m)</label><input id="gap" type="number" step="any" inputmode="decimal" value="0.6"></div><div><label>Required response (min)</label><input id="resp" type="number" step="any" inputmode="decimal" value="10"></div></div><div id="ofOut" class="out"></div></div>
<div class="card"><h3>Proof-test timer</h3><label>Minutes</label><input id="pt" type="number" step="any" inputmode="decimal" value="15"><button id="ptBtn" style="margin-top:6px">Start</button><div id="ptOut" class="out">Not started</div></div>
<div class="card"><h3>Tank faceplate</h3>${tankSvg(60)}<label>Level %</label><input id="lp" type="range" min="0" max="100" value="60"></div>`;
 v.addEventListener('input',e=>{const i=e.target.id;if(['ma','lo','hi'].includes(i))mAcalc();else if(i==='lp'){const p=+e.target.value;$('#lv').setAttribute('y',116-1.04*p);$('#lv').setAttribute('height',1.04*p);$('#lvt').textContent=p+'%'}else if(['shape','dia','lvl','temp','sg','alpha'].includes(i))volCalc();else if(['odia','rate','gap','resp'].includes(i))overfill()});
 $('#shape').onchange=volCalc;$('#apiBtn').onclick=()=>{apiCalc();$('#sg').value=sgFromAPI(n('api')).toFixed(4);volCalc()};$('#ptBtn').onclick=proof;mAcalc();volCalc();overfill();renderTools();renderSat();renderPt100()}

/* ---------- Field tools ---------- */
const NUM='type="number" step="any" inputmode="decimal"';
const store={get(){try{return JSON.parse(localStorage.getItem('calRecords')||'[]')}catch(_){return[]}},set(v){try{localStorage.setItem('calRecords',JSON.stringify(v));return true}catch(_){return false}}};
const PTS=[0,25,50,75,100];
function calRows(){const lo=n('clo'),hi=n('chi'),tol=n('ctol');return PTS.map((p,i)=>{const exp=4+16*p/100,m=parseFloat($('#m'+i).value),err=isNaN(m)?null:(m-exp)/16*100;
 $('#e'+i).textContent=err===null?'-':err.toFixed(3)+'%';$('#e'+i).style.fontWeight=700;$('#e'+i).style.color=err!==null&&Math.abs(err)>tol?'#ef4444':'';return{p,eu:+(lo+p/100*(hi-lo)).toFixed(3),exp:+exp.toFixed(3),meas:isNaN(m)?null:m,err}})}
function listRecords(){const r=store.get();$('#calList').innerHTML=r.length?r.slice().reverse().map(x=>`<div class="out ${x.pass?'':'bad'}"><b>${x.tag||'No tag'}</b> ${x.pass?'PASS':'FAIL'}<br>${new Date(x.ts).toLocaleString()} | max error ${x.maxErr.toFixed(3)}% (tol ${x.tol}%)</div>`).join(''):'<div class="out">No saved records</div>'}
function saveCal(){const rows=calRows();if(rows.some(r=>r.meas===null)){toast('Enter all 5 measured values');return}
 const tol=n('ctol'),maxErr=Math.max(...rows.map(r=>Math.abs(r.err))),rec={ts:Date.now(),tag:$('#ctag').value.trim(),lo:n('clo'),hi:n('chi'),unit:$('#cunit').value,tol,rows,maxErr,pass:maxErr<=tol};
 const all=store.get();all.push(rec);toast(store.set(all)?'Calibration saved':'Storage unavailable');listRecords()}
let swT0=null,swRaf=0,swEl=0;
function swTick(){swEl=performance.now()-swT0;$('#swOut').textContent=(swEl/1000).toFixed(3)+' s';swRaf=requestAnimationFrame(swTick)}
function swToggle(){if(swT0===null){swT0=performance.now();$('#swBtn').textContent='Stop';$('#swRes').textContent='Running…';$('#swRes').className='out';swTick()}
 else{cancelAnimationFrame(swRaf);swEl=performance.now()-swT0;swT0=null;$('#swBtn').textContent='Start';$('#swOut').textContent=(swEl/1000).toFixed(3)+' s';swCheck()}}
function swCheck(){const tg=n('swTarget')*1000;if(isNaN(tg)||!swEl)return;const ok=swEl<=tg;$('#swRes').className='out '+(ok?'':'bad');$('#swRes').innerHTML=`<b>${ok?'PASS':'FAIL'}</b>: ${Math.round(swEl)} ms vs target ${Math.round(tg)} ms (${ok?'-':'+'}${Math.abs(Math.round(swEl-tg))} ms)`}
function swReset(){cancelAnimationFrame(swRaf);swT0=null;swEl=0;$('#swBtn').textContent='Start';$('#swOut').textContent='0.000 s';$('#swRes').className='out';$('#swRes').textContent='Ready'}
function reg(id){let v=$('#'+id).value.trim(),f=$('#rfmt').value;if(!v)return NaN;const x=f==='hex'?(/^(0x)?[0-9a-f]{1,4}$/i.test(v)?parseInt(v.replace(/^0x/i,''),16):NaN):(/^\d{1,5}$/.test(v)?parseInt(v,10):NaN);return x>=0&&x<=65535?x:NaN}
function toFloat(a,b,bs,ws){let w=ws?[b,a]:[a,b];if(bs)w=w.map(x=>((x&255)<<8)|(x>>8));const dv=new DataView(new ArrayBuffer(4));dv.setUint16(0,w[0]);dv.setUint16(2,w[1]);return{f:dv.getFloat32(0),hex:'0x'+w.map(x=>x.toString(16).padStart(4,'0')).join('').toUpperCase()}}
function fpCalc(){const a=reg('r1'),b=reg('r2'),o=$('#fpOut');if(isNaN(a)||isNaN(b)){o.className='out bad';o.textContent='Enter two valid 16-bit values (0-65535 or 0000-FFFF)';$('#fpAll').innerHTML='';return}
 const r=toFloat(a,b,$('#bs').checked,$('#ws').checked);o.className='out';o.innerHTML=`<b>${Number.isFinite(r.f)?r.f.toPrecision(8):r.f}</b><br>Assembled bytes: ${r.hex}`;
 $('#fpAll').innerHTML='<table class="cal"><tr><th>Order</th><th>Value</th></tr>'+[['ABCD',0,0],['CDAB (word swap)',0,1],['BADC (byte swap)',1,0],['DCBA (both)',1,1]].map(([l,x,y])=>`<tr><td>${l}</td><td>${toFloat(a,b,!!x,!!y).f.toPrecision(7)}</td></tr>`).join('')+'</table>'}
function renderTools(){const v=$('#view-tools');
 v.innerHTML=`<h2>Field Tools</h2>
<div class="card"><h3>Loop calibrator (5-point)</h3><div class="grid"><div><label>Tag</label><input id="ctag" type="text" placeholder="LT-101"></div><div><label>Unit</label><input id="cunit" type="text" value="m"></div><div><label>Range low</label><input id="clo" ${NUM} value="0"></div><div><label>Range high</label><input id="chi" ${NUM} value="20"></div></div><label>Tolerance (% of span)</label><input id="ctol" ${NUM} value="0.25">
<table class="cal"><tr><th>%</th><th>EU</th><th>Exp mA</th><th>Measured</th><th>Error</th></tr>${PTS.map((p,i)=>`<tr><td>${p}</td><td id="u${i}"></td><td>${(4+16*p/100).toFixed(2)}</td><td><input id="m${i}" class="cm" ${NUM}></td><td id="e${i}">-</td></tr>`).join('')}</table>
<div class="row"><button id="calSave">Save record</button><button id="calClear">Clear records</button><button id="calCsv">Export to CSV</button></div><div id="calList"></div></div>
<div class="card"><h3>ESD valve stroke stopwatch</h3><div class="big" id="swOut">0.000 s</div><label>Target stroke time (s)</label><input id="swTarget" ${NUM} value="30"><div class="row"><button id="swBtn">Start</button><button id="swReset">Reset</button></div><div id="swRes" class="out">Ready</div></div>
<div class="card"><h3>Modbus register to IEEE 754 float</h3><label>Input format</label><select id="rfmt"><option value="hex">Hex</option><option value="dec">Decimal</option></select><div class="grid"><div><label>Register 1</label><input id="r1" type="text" inputmode="text" autocapitalize="characters" value="41C8"></div><div><label>Register 2</label><input id="r2" type="text" inputmode="text" autocapitalize="characters" value="0000"></div></div><label class="chk"><input id="bs" type="checkbox"> Byte swap</label><label class="chk"><input id="ws" type="checkbox"> Word swap</label><div id="fpOut" class="out"></div><div id="fpAll"></div></div>`;
 const ux=()=>{const lo=n('clo'),hi=n('chi');PTS.forEach((p,i)=>$('#u'+i).textContent=(lo+p/100*(hi-lo)).toFixed(2))};
 v.addEventListener('input',e=>{const i=e.target.id;if(['clo','chi'].includes(i))ux();if(e.target.classList.contains('cm')||['clo','chi','ctol'].includes(i))calRows();if(i==='swTarget'&&swT0===null)swCheck();if(['r1','r2','bs','ws'].includes(i))fpCalc()});
 $('#rfmt').onchange=()=>{const hex=$('#rfmt').value==='hex';[ 'r1','r2'].forEach(id=>{const e=$('#'+id),x=parseInt(e.value,hex?10:16);if(!isNaN(x))e.value=hex?x.toString(16).toUpperCase().padStart(4,'0'):parseInt(e.value,16)});fpCalc()};
 $('#calSave').onclick=saveCal;$('#calCsv').onclick=csvCal;$('#calClear').onclick=()=>{if(confirm('Delete all saved calibration records?')){store.set([]);listRecords()}};
 $('#swBtn').onclick=swToggle;$('#swReset').onclick=swReset;ux();listRecords();fpCalc()}

/* ---------- CSV export ---------- */
function csvCal(){const r=store.get();if(!r.length){toast('No records to export');return}
 const q=v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"';
 const head=['Timestamp','Tag','Unit','Range low','Range high','Tolerance %','Result','Max error %',...PTS.flatMap(p=>['Measured mA @'+p+'%','Error % @'+p+'%'])];
 const lines=[head.map(q).join(',')].concat(r.map(x=>[new Date(x.ts).toISOString(),x.tag,x.unit,x.lo,x.hi,x.tol,x.pass?'PASS':'FAIL',x.maxErr.toFixed(4),...x.rows.flatMap(w=>[w.meas,w.err===null?'':w.err.toFixed(4)])].map(q).join(',')));
 const b=new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='loop-calibration-'+new Date().toISOString().slice(0,10)+'.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000);toast('CSV exported')}

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
['Loop testing',['Tag, range and units match the loop sheet','0/25/50/75/100% injection recorded (as-found and as-left)','Alarm setpoints and fail direction verified','HART / fieldbus diagnostics clear']],
['Dry runs',['MOV open/close strokes and limit feedback confirmed','HH trip closes inlet ESD valve within target time','Comm loss and power loss drop to defined fail-safe state','Bypass is key-locked, alarmed and logged']],
['Water batching',['Flow totaliser matches level change','Volume reconciliation within tolerance','No leaks at flanges and instrument connections']],
['ATG calibration',['Reference height checked by hand dip','Radar compared to dip at three or more levels','Temperature element readings verified','Tank table version and corrections documented']]];
const satGet=()=>{try{return JSON.parse(localStorage.getItem('satChecks')||'{}')}catch(_){return{}}};
const satSet=o=>{try{localStorage.setItem('satChecks',JSON.stringify(o))}catch(_){}};
function satProgress(){const t=document.querySelectorAll('.satchk').length,c=document.querySelectorAll('.satchk:checked').length;$('#satProg').textContent=c+' of '+t+' complete';$('#satProg').className='out '+(c===t?'':'warn')}
function renderSat(){const s=satGet();let i=0;
 const body=SAT_ITEMS.map(([g,items])=>'<h3 style="margin-top:12px">'+g+'</h3>'+items.map(t=>{const id='s'+(i++);return '<label class="chk"><input type="checkbox" class="satchk" id="'+id+'"'+(s[id]?' checked':'')+'><span>'+t+'</span></label>'}).join('')).join('');
 $('#view-sat').insertAdjacentHTML('beforeend','<article class="card"><h3>Interactive SAT checklist</h3><div id="satProg" class="out"></div>'+body+'<div class="row"><button id="satReset">Reset Checklist</button></div></article>');
 $('#view-sat').addEventListener('change',e=>{if(!e.target.classList.contains('satchk'))return;const o=satGet();if(e.target.checked)o[e.target.id]=1;else delete o[e.target.id];satSet(o);satProgress()});
 $('#satReset').onclick=()=>{if(confirm('Reset the whole SAT checklist?')){satSet({});document.querySelectorAll('.satchk').forEach(c=>c.checked=false);satProgress()}};satProgress()}
