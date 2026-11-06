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
['SCL: MOV control block (FB)',`<pre><code>FUNCTION_BLOCK "FB_MOV"
VAR_INPUT
  cmdOpen, cmdClose, cmdStop, esdClose : Bool;
  zsOpen, zsClose, torqueTrip, remoteMode, motorFault : Bool;
  travelTime : Time := T#60s;
END_VAR
VAR_OUTPUT
  outOpen, outClose, almTravel, almFault, almLimits : Bool;
END_VAR
VAR
  tTravel : TON_TIME;
  rqOpen, rqClose : Bool;
END_VAR
BEGIN
  #almLimits := #zsOpen AND #zsClose;
  #almFault := #torqueTrip OR #motorFault OR #almLimits OR #almTravel;
  // Priority: ESD, then faults/stop, then operator command
  IF #esdClose AND NOT (#torqueTrip OR #motorFault) THEN
    #rqClose := TRUE; #rqOpen := FALSE;
  ELSIF #almFault OR #cmdStop THEN
    #rqOpen := FALSE; #rqClose := FALSE;
  ELSIF #remoteMode THEN
    IF #cmdOpen AND NOT #cmdClose THEN
      #rqOpen := TRUE; #rqClose := FALSE;
    ELSIF #cmdClose AND NOT #cmdOpen THEN
      #rqClose := TRUE; #rqOpen := FALSE;
    END_IF;
  END_IF;
  IF #zsOpen THEN #rqOpen := FALSE; END_IF;
  IF #zsClose THEN #rqClose := FALSE; END_IF;
  #outOpen := #rqOpen;
  #outClose := #rqClose;
  #tTravel(IN := #outOpen OR #outClose, PT := #travelTime);
  IF #tTravel.Q THEN #almTravel := TRUE; END_IF;
  IF #cmdStop THEN #almTravel := FALSE; END_IF;  // stop acts as reset
END_FUNCTION_BLOCK</code></pre>Review ESD behaviour against your valve fail action and the site SIS philosophy before use.`],
['SCL: Analog input NE43 scaling (FC)',`<pre><code>FUNCTION "FC_AI_NE43" : Real
VAR_INPUT
  mA, euLow, euHigh : Real;
END_VAR
VAR_OUTPUT
  quality : Int;   // 0 good, 1 under-range, 2 over-range, 3 fault
  fault : Bool;
END_VAR
VAR_TEMP
  pct : Real;
END_VAR
BEGIN
  IF #mA &lt; 3.6 OR #mA &gt; 21.0 THEN
    #quality := 3; #fault := TRUE;      // wire break / short
  ELSIF #mA &lt; 3.8 THEN
    #quality := 1; #fault := FALSE;
  ELSIF #mA &gt; 20.5 THEN
    #quality := 2; #fault := FALSE;
  ELSE
    #quality := 0; #fault := FALSE;
  END_IF;
  #pct := (LIMIT(MN := 4.0, IN := #mA, MX := 20.0) - 4.0) / 16.0;
  "FC_AI_NE43" := #euLow + #pct * (#euHigh - #euLow);
END_FUNCTION</code></pre>Convert the raw module value to mA first (e.g. NORM_X / SCALE_X). Use quality 3 to trigger the safe state for SIS signals.`]);
GUIDE.hmi.c.push(
['ISA-101 colour codes (typical)','<ul><li><i class="sw" style="background:#D9D9D9"></i>Background, light gray #D9D9D9</li><li><i class="sw" style="background:#A6A6A6"></i>Normal equipment / pipes #A6A6A6</li><li><i class="sw" style="background:#000000"></i>Text and normal values #000000</li><li><i class="sw" style="background:#FF0000"></i>Critical alarm #FF0000</li><li><i class="sw" style="background:#FFC000"></i>High alarm #FFC000</li><li><i class="sw" style="background:#FFFF00"></i>Medium alarm #FFFF00</li><li><i class="sw" style="background:#00B0F0"></i>Low / advisory #00B0F0</li></ul>These are common starting values. Match your site HMI standard, and pair colour with shape and text so alarms still read for colour-blind operators.'],
['ISA-18.2 alarm priority tiers','<ul><li><b>Critical</b>: immediate action, major safety or environmental consequence; keep to about 5% of alarms.</li><li><b>High</b>: action needed soon, serious equipment or product consequence; about 15%.</li><li><b>Medium / Low</b>: minor consequence, time to respond; about 80%.</li></ul>Each alarm needs a defined consequence, operator action and response time. Review priorities after commissioning using real alarm data.']);
