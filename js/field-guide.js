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
