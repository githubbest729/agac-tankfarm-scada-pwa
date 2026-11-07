const GUIDE={
overview:{t:'Overview & Architecture',c:[
['AGAC Dubai terminal context','Bulk liquid / hydrocarbon storage, UAE coastal environment: ambient above 50°C, high humidity, direct sun, saline atmosphere. Specify IP66/67, 316L tubing and fittings, sunshades, and UV-stable cable glands for field devices.'],
['Purdue model','L0 field: radar/servo gauges, MOV actuators, bund sensors. L1: PLC/SIS (S7-1500, ControlLogix). L2: SCADA/HMI (InTouch, iFIX, FactoryTalk). L3: terminal management, inventory, custody transfer. Keep the SIS independent from the BPCS and firewall L3 from L2.'],
['Network & protocols','Modbus RTU/TCP to tank gauging concentrators, Foundation Fieldbus/Profibus PA for instruments, OPC UA from PLC to SCADA. Use ring topology with redundant managed switches and fiber between tank farm and control room.'],
['Standards','API 2350 overfill protection, API 650/653 tanks, IEC 61508/61511 SIS (SIL-2/3), ISA-101 HMI, ISA-18.2 alarm management.']]},
design:{t:'Engineering & Design',c:[
['P&ID review','Check each tank for: independent HH switch, ATG radar, temperature averaging element, ESD inlet valve with position feedback, bund level, N2 blanketing PCV, PSV/vent.'],
['I/O assignment','Separate AI (ATG/4–20 mA HART), DI (HH switch, ZSO/ZSC), DO (MOV open/close), and safety I/O. Reserve 20% spare. Segregate IS and non-IS signals.'],
['API 2350 / SIL interlock','Category 3 terminals need automatic overfill prevention independent of the ATG. Define Alert, High-High, and Critical High levels; calculate required response time from maximum fill rate. Proof-test the HH sensor and final element per the SIL calculation.'],
['ESD logic check','HH trip closes inlet ESD valve and stops pump via hardwired path. Valve fails closed on air/power loss. Verify bypass is key-locked, alarmed, and time-limited.']]},
plc:{t:'PLC Programming & Logic',c:[
['S7-1500 / ControlLogix patterns','Use one typed FB/AOI per device class: AI scaling with NE43 diagnostics, MOV, pump, tank. Keep state machines explicit; no hidden latches.'],
['MOV control block','Inputs: ZSO, ZSC, torque trip, remote/local, thermal fault. Outputs: open, close. Alarms: travel-time timeout, both limits active, torque trip before limit. Interlock commands always override operator commands.'],
['Leak detection (SCL/FBD)','Bund level rate-of-change plus hydrocarbon sensor with 2-of-3 voting. Latch alarm; reset only from authorised HMI user after inspection.'],
['Fail-safe state table','Loss of comm: hold last position, raise alarm. Wire break (<3.6 mA): bad quality, trip to safe state if the signal is SIS-related. Power loss: valves fail closed, pumps stop.']]},
hmi:{t:'SCADA / HMI Development',c:[
['ISA-101 high-performance HMI','Grayscale process graphics; colour reserved for abnormal conditions. Show level as an analog bar with alarm limits, not just a number.'],
['ISA-18.2 alarm rationalization','Each alarm needs a consequence, an operator action, and a response time. Target under 6 alarms per operator per hour and avoid duplicate alarms; shelve with audit trail.'],
['Tank faceplate','Level bar, product, temperature, volume, HH/H/L/LL limits, valve states, mode, and interlock status. Include a drill-down to trends and bypass state.']]},
sat:{t:'Commissioning & SAT Checklist',c:[
['Loop testing','For each loop check: tag, range, 0/25/50/75/100% injection, HMI value, alarm setpoints, fail direction, and sign-off. Record as-found and as-left.'],
['Dry runs','Simulate fill with valve strokes and HH trip. Confirm ESD closure time, alarm timestamps, and fail-safe state on comm and power loss.'],
['Water batching','Run water transfers to confirm flow totals, level change, and volume reconciliation before introducing product.'],
['ATG calibration','Verify gauge reference height by hand dip, check radar against the dip at several levels, and confirm temperature element readings. Document tank table version and corrections.']]}
};

/* ---- Expanded content ---- */
GUIDE.overview.c.push(
['High-ambient derating (50°C UAE)','Direct sun adds roughly 15–30°C to the surface of dark enclosures and transmitters, so plan for 65–80°C at the device. Check each instrument\'s rated ambient and display limit against that figure, not the 50°C air temperature. Electronics life drops sharply with heat (rule of thumb: halves per 10°C). Derate cable current for 50°C ambient (correction about 0.8 for XLPE, confirm with IEC 60364-5-52), and size panel cooling for internal heat load plus solar gain. Target under 40–45°C inside control cabinets.'],
['Sunshade installation best practices','<ul><li>Use a ventilated shade with a 150–300 mm air gap; a solid lid that traps hot air makes things worse.</li><li>Shade the south and west faces first and extend past the device to cover low-angle sun.</li><li>Keep displays readable and vents, drains and conduit seals unblocked.</li><li>Mount transmitters on the shaded side of the tank or pipe where the process allows.</li><li>Use light-coloured (white / RAL 9003) enclosures, 316 SS fasteners and UV-stable glands and cable ties.</li><li>Shade junction boxes and cable runs; fit breather-drains for condensation.</li></ul>']);
GUIDE.plc.c.push(
['SCL: FB_MOV_AGAC (MOV with torque/travel alarms and hardwired ESD override)',`<pre><code>FUNCTION_BLOCK "FB_MOV_AGAC"
VAR_INPUT
  cmdOpen, cmdClose, cmdStop, resetAlm : Bool;
  esdSoft : Bool;                 // ESD from logic solver
  hwEsd : Bool;                   // TRUE = hardwired ESD relay tripped
  zsOpen, zsClose : Bool;
  torqueOpen, torqueClose : Bool;
  remoteMode, motorFault : Bool;
  travelTime : Time := T#60s;
END_VAR
VAR_OUTPUT
  outOpen, outClose : Bool;
  almTravel, almTorque, almLimits, almMotor, esdActive : Bool;
END_VAR
VAR
  tTravel : TON_TIME;
  rqOpen, rqClose, fault : Bool;
END_VAR
BEGIN
  #esdActive := #hwEsd OR #esdSoft;
  #almLimits := #zsOpen AND #zsClose;
  #almMotor := #motorFault;
  // Torque trip before the end limit = mechanical problem, latched
  IF (#torqueOpen AND NOT #zsOpen) OR (#torqueClose AND NOT #zsClose) THEN
    #almTorque := TRUE;
  END_IF;
  IF #resetAlm THEN #almTorque := FALSE; #almTravel := FALSE; END_IF;
  #fault := #almLimits OR #almMotor OR #almTorque OR #almTravel;

  IF #esdActive AND NOT #almMotor THEN
    // ESD override: ignores mode, stop and latched alarms, always drives closed
    #rqOpen := FALSE; #rqClose := TRUE;
  ELSIF #fault OR #cmdStop THEN
    #rqOpen := FALSE; #rqClose := FALSE;
  ELSIF #remoteMode THEN
    IF #cmdOpen AND NOT #cmdClose THEN
      #rqOpen := TRUE; #rqClose := FALSE;
    ELSIF #cmdClose AND NOT #cmdOpen THEN
      #rqClose := TRUE; #rqOpen := FALSE;
    END_IF;
  ELSE
    #rqOpen := FALSE; #rqClose := FALSE;   // local mode: no PLC drive
  END_IF;

  IF #zsOpen THEN #rqOpen := FALSE; END_IF;
  IF #zsClose THEN #rqClose := FALSE; END_IF;
  #outOpen := #rqOpen AND NOT #hwEsd;      // never open while hardwired ESD is active
  #outClose := #rqClose;

  #tTravel(IN := #outOpen OR #outClose, PT := #travelTime);
  IF #tTravel.Q THEN #almTravel := TRUE; END_IF;
END_FUNCTION_BLOCK</code></pre>The hardwired ESD relay must remove the open contactor feed independently of this logic. This block mirrors that state and drives the valve closed. Confirm the valve fail action and SIS philosophy before use.`],
['SCL: FC_AI_NE43 (analog input conditioning with NAMUR flags)',`<pre><code>FUNCTION "FC_AI_NE43" : Real
VAR_INPUT
  mA, euLow, euHigh : Real;
END_VAR
VAR_OUTPUT
  good, underRange, overRange, wireBreak : Bool;
  quality : Int;   // 0 good, 1 under-range, 2 over-range, 3 wire break / fault
END_VAR
VAR_TEMP
  pct : Real;
END_VAR
BEGIN
  #wireBreak := #mA &lt; 3.6 OR #mA &gt; 21.0;
  #underRange := #mA &gt;= 3.6 AND #mA &lt; 3.8;
  #overRange := #mA &gt; 20.5 AND #mA &lt;= 21.0;
  #good := NOT (#wireBreak OR #underRange OR #overRange);
  IF #wireBreak THEN
    #quality := 3;
  ELSIF #overRange THEN
    #quality := 2;
  ELSIF #underRange THEN
    #quality := 1;
  ELSE
    #quality := 0;
  END_IF;
  #pct := (LIMIT(MN := 4.0, IN := #mA, MX := 20.0) - 4.0) / 16.0;
  "FC_AI_NE43" := #euLow + #pct * (#euHigh - #euLow);
END_FUNCTION</code></pre>Convert the raw module value to mA first (e.g. NORM_X / SCALE_X). Use wireBreak to drive the safe state for SIS signals and mark the value bad on the HMI.`]);
GUIDE.hmi.c.push(
['ISA-101 colour palette',`<div class="tw"><table class="cal"><tr><th>Role</th><th>Hex</th><th>Use</th></tr>
<tr><td><i class="sw" style="background:#D9D9D9"></i>Background</td><td>#D9D9D9</td><td>Graphic background (light-gray scheme)</td></tr>
<tr><td><i class="sw" style="background:#BFBFBF"></i>Panel / border</td><td>#BFBFBF</td><td>Panels, separators, disabled items</td></tr>
<tr><td><i class="sw" style="background:#808080"></i>Muted pipes</td><td>#808080</td><td>Process lines and equipment outlines</td></tr>
<tr><td><i class="sw" style="background:#A6A6A6"></i>Muted equipment</td><td>#A6A6A6</td><td>Tank, pump and valve fills in normal state</td></tr>
<tr><td><i class="sw" style="background:#000000"></i>Text / values</td><td>#000000</td><td>Normal process values and labels</td></tr>
<tr><td><i class="sw" style="background:#FF0000"></i>Critical alarm</td><td>#FF0000</td><td>Priority 1, immediate action</td></tr>
<tr><td><i class="sw" style="background:#FFC000"></i>High alarm</td><td>#FFC000</td><td>Priority 2</td></tr>
<tr><td><i class="sw" style="background:#FFFF00"></i>Medium alarm</td><td>#FFFF00</td><td>Priority 3, black text</td></tr>
<tr><td><i class="sw" style="background:#00B0F0"></i>Low / advisory</td><td>#00B0F0</td><td>Priority 4 or advisory</td></tr>
</table></div>Typical starting values. Match your site HMI standard, and pair colour with shape and text so alarms still read for colour-blind operators and in direct sunlight.`],
['ISA-18.2 alarm priority tiers','<ul><li><b>Critical</b>: immediate action, major safety or environmental consequence; keep to about 5% of alarms.</li><li><b>High</b>: action needed soon, serious equipment or product consequence; about 15%.</li><li><b>Medium / Low</b>: minor consequence, time to respond; about 80%.</li></ul>Each alarm needs a defined consequence, operator action and response time. Review priorities after commissioning using real alarm data.']);

/* ---- Terminal profile, hazardous areas, API 2350, IS segregation, ISA-18.2 targets ---- */
GUIDE.overview.c.push(
['AGAC terminal system profile (reference)','<ul><li><b>Controllers:</b> Siemens PCS 7 DCS with S7-400FH fault-tolerant / fail-safe CPUs for process and safety; S7-1500 (F) for package units and auxiliary systems.</li><li><b>Network:</b> Redundant fiber ring on Industrial Ethernet / PROFINET using MRP (Media Redundancy Protocol): one ring manager, all other nodes clients, typical recovery under 200 ms, up to about 50 devices per ring.</li><li><b>Field I/O:</b> ET 200 remote I/O in field junction boxes, HART on analog loops, Modbus gateways to tank gauging systems.</li></ul>Reference profile only. Confirm every item against the AGAC project documents.'],
['Hazardous area zones (Zone 0 / 1 / 2)','<div class="tw"><table class="cal"><tr><th>Zone</th><th>Gas present</th><th>Typical location</th><th>Protection</th></tr><tr><td>0</td><td>Continuously or long periods</td><td>Inside tank vapour space</td><td>Ex ia (intrinsically safe)</td></tr><tr><td>1</td><td>Likely in normal operation</td><td>Floating-roof rim, vents, pump seals, MOV actuators</td><td>Ex d, Ex e, Ex ib, Ex p</td></tr><tr><td>2</td><td>Not likely, short periods only</td><td>Bund area, outer pump station</td><td>Ex n / Ex ec or any Zone 1 method</td></tr></table></div><ul><li><b>Ex d (flameproof):</b> do not open when energised; never paint or damage flame paths; use certified glands and plugs.</li><li><b>Ex ia:</b> safe with two faults, usable in Zone 0; Ex ib is safe with one fault.</li><li>Check gas group (usually IIA for hydrocarbons) and temperature class on the hazardous-area drawings.</li></ul>']);
GUIDE.design.c.push(
['API 2350 overfill levels','<ol><li><b>MWL (Maximum Working Level):</b> highest level for normal operation.</li><li><b>HLA (High Level Alarm):</b> alerts the operator with enough time to stop the fill before the next level.</li><li><b>HHLA (High-High Level Alarm):</b> independent alarm that triggers the automatic overfill prevention action (ESD valve closure, pump trip).</li><li><b>Critical High:</b> level where overflow becomes unavoidable. Keep all alarm and trip levels safely below it.</li></ol>Set each gap from the calculated response time at the maximum fill rate (see the HH overfill calculator). Confirm against the current API 2350 edition and the site tank data sheet.'],
['Intrinsically safe (IS) blue terminal cheat sheet','<ul><li>Light-blue terminals, wiring and cable sheath mark IS circuits.</li><li>Keep at least 50 mm clearance (or a grounded partition) between IS and non-IS terminals.</li><li>Run IS and non-IS cables in separate ducts and trays; separate multicore cables where possible.</li><li>Entity check: Uo ≤ Ui, Io ≤ Ii, Po ≤ Pi, and Co ≥ Ci + cable, Lo ≥ Li + cable.</li><li>Barrier or isolator earth goes to the dedicated IS earth bar with a low-resistance connection.</li><li>Label IS junction boxes and never mix IS and non-IS in the same terminal row.</li></ul>']);
GUIDE.hmi.c.push(
['ISA-18.2 alarm system targets','<ul><li><b>Priority split:</b> about 80% medium/low, 15% high, 5% critical.</li><li><b>Average rate:</b> about 1 alarm per operator per 10 minutes is the target; 2 is the most an operator can manage.</li><li><b>Flood:</b> more than 10 alarms in 10 minutes. Review the cause.</li><li><b>Stale alarms:</b> keep fewer than 5 active for over 24 hours.</li><li><b>Chattering and repeats:</b> fix with deadband, delay or rationalization rather than shelving.</li></ul>Review the alarm log monthly and re-rationalize the worst offenders.']);
