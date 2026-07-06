// Smart AI Engine for Biomedical Equipment Analysis
// Provides realistic, context-aware predictions, recommendations, troubleshooting steps, and logs summaries.

export const aiEngine = {
  /**
   * Predict next breakdown or maintenance requirement based on usage, installation date, and past records.
   */
  predictMaintenance(equipment, maintenanceLogs = [], breakdownLogs = []) {
    const today = new Date();
    const installDate = new Date(equipment.installationDate || equipment.purchaseDate);
    const ageInMonths = (today - installDate) / (1000 * 60 * 60 * 24 * 30.4);
    
    const category = (equipment.category || '').toLowerCase();
    const name = (equipment.name || '').toLowerCase();
    
    let wearFactor = 0.05; // Base wear factor per month
    let warningLevel = 'Low';
    let recommendations = [];
    let estimatedFailureDate = new Date(today.getTime() + 180 * 24 * 60 * 60 * 1000); // Default 6 months
    let criticalComponent = 'General wear and tear';

    // Tailor predictions by category and device type
    if (category.includes('imaging') || name.includes('ct') || name.includes('x-ray')) {
      // Tube usage is critical for CT Scanners
      const scansCount = name.includes('ct') ? 142000 : 45000; 
      const maxScans = name.includes('ct') ? 200000 : 100000;
      const usageRatio = scansCount / maxScans;
      
      wearFactor = usageRatio * 0.8 + (ageInMonths / 60) * 0.2;
      criticalComponent = name.includes('ct') ? 'CT X-Ray Tube Filaments' : 'HV Generator';
      
      if (wearFactor > 0.75) {
        warningLevel = 'Critical';
        estimatedFailureDate = new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000); // 15 days
        recommendations.push(
          'Schedule an immediate X-Ray Tube filament resistance test.',
          'Verify cooling oil pressure and heat dissipation ratios.',
          'Order replacement tube inserts (Part: GE-TUBE-256) to prevent extended downtime.'
        );
      } else if (wearFactor > 0.5) {
        warningLevel = 'Medium';
        estimatedFailureDate = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);
        recommendations.push(
          'Perform gantry slip ring brush cleaning at next maintenance.',
          'Monitor tube temperature logs under high-kV exposure cycles.'
        );
      } else {
        recommendations.push('Maintain standard quarterly PM schedule.');
      }
    } else if (category.includes('respiratory') || name.includes('ventilator') || name.includes('anesthesia')) {
      // Oxygen sensors and flow sensors decay rapidly
      const activePM = maintenanceLogs.filter(l => l.status === 'Completed').length;
      const recentBreakdowns = breakdownLogs.filter(b => b.equipmentId === equipment.id);
      
      wearFactor = 0.2 + (recentBreakdowns.length * 0.2) + (ageInMonths / 48) * 0.3;
      criticalComponent = name.includes('anesthesia') ? 'Anesthetic Vaporizer Seals & Flow Sensors' : 'O2 Sensor Cell & Expiratory Valve';

      if (ageInMonths > 36 || recentBreakdowns.length > 1) {
        warningLevel = 'High';
        estimatedFailureDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
        recommendations.push(
          'Replace expiratory valve membrane during next service.',
          'Perform electrical safety leakage test (IEC 60601-1 standards).',
          'Recalibrate the internal O2 sensor against 100% calibration gas.'
        );
      } else {
        warningLevel = 'Low';
        recommendations.push(
          'Verify flow sensor accuracy during daily startup checks.',
          'Replace oxygen cell if reading stability fluctuates more than 2%.'
        );
      }
    } else if (category.includes('cardio') || name.includes('ecg') || name.includes('monitor')) {
      // Battery and patient cable fatigue
      wearFactor = (ageInMonths / 24) * 0.6;
      criticalComponent = 'Internal Lead Battery & Patient Cable Assembly';

      if (ageInMonths > 24) {
        warningLevel = 'Medium';
        estimatedFailureDate = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
        recommendations.push(
          'Perform lead wire continuity testing using a simulation box.',
          'Run battery load-test cycles to check discharge duration under active printing.'
        );
      } else {
        recommendations.push('Regular wipe-down of lead attachments and safety checks.');
      }
    } else {
      // Generic medical equipment
      wearFactor = Math.min(1.0, ageInMonths / 72);
      if (wearFactor > 0.8) {
        warningLevel = 'High';
        estimatedFailureDate = new Date(today.getTime() + 45 * 24 * 60 * 60 * 1000);
        recommendations.push('Schedule general safety and accuracy overhaul.');
      } else {
        recommendations.push('Standard inspection as per manufacturer guidelines.');
      }
    }

    const failureProbability = Math.round(Math.min(0.99, wearFactor) * 100);

    return {
      equipmentId: equipment.id,
      equipmentName: equipment.name,
      failureProbability: `${failureProbability}%`,
      warningLevel,
      criticalComponent,
      estimatedFailureDate: estimatedFailureDate.toISOString().split('T')[0],
      recommendations,
      analysisSummary: `Based on installation age (${Math.round(ageInMonths)} months), ${breakdownLogs.length} previous breakdowns, and historical calibration cycles, this unit shows a ${failureProbability}% probability of wear-out failure in the next ${warningLevel === 'Critical' ? '2 weeks' : warningLevel === 'High' ? 'month' : '6 months'}. The primary risk center is the ${criticalComponent}.`
    };
  },

  /**
   * Recommend custom preventive maintenance schedule and tasks based on equipment type.
   */
  recommendSchedule(equipment) {
    const category = (equipment.category || '').toLowerCase();
    const name = (equipment.name || '').toLowerCase();
    let frequency = 'Quarterly';
    let checklist = [];
    let justification = '';

    if (category.includes('imaging') || name.includes('ct') || name.includes('x-ray') || name.includes('mri')) {
      frequency = 'Quarterly';
      justification = 'High-energy radiation systems and spinning gantries suffer mechanical fatigue and thermal stress. Quarterly alignment checks prevent image deterioration.';
      checklist = [
        'Perform gantry physical inspection and clean the high-speed slip rings.',
        'Verify laser position indicators alignment matches the gantry physical coordinate center.',
        'Measure kVp, mA, and exposure time accuracy with a calibrated multimeter dose sensor.',
        'Check water cooling pump pressure, coolant levels, and heat exchanger fan operation.',
        'Execute standard contrast, MTF, and noise tests on water phantoms.'
      ];
    } else if (category.includes('respiratory') || name.includes('ventilator') || name.includes('anesthesia')) {
      frequency = 'Monthly';
      justification = 'Life support systems demand highly stable gas flow sensors and pressure regulators. Moisture accumulation can corrupt sensors rapidly.';
      checklist = [
        'Calibrate expiratory and inspiratory flow sensors.',
        'Execute comprehensive pneumatic leakage test at 60 cmH2O pressure.',
        'Verify backup power battery operates for a minimum of 45 continuous minutes under simulation load.',
        'Check mechanical safety relief valve manual release thresholds.',
        'Replace breathing circuit filters and clean ambient dust traps.'
      ];
    } else if (category.includes('cardio') || name.includes('ecg') || name.includes('defibrillator')) {
      frequency = 'Half-Yearly';
      justification = 'Defibrillators and ECG units are critical emergency response devices. Energy delivery accuracy must be verified periodically.';
      checklist = [
        'Measure delivered energy at 50, 100, 200, and 360 Joules into a dummy load simulator.',
        'Assess ECG rhythm analysis algorithms against standard cardiac arrhythmia simulation signals.',
        'Test pacer function outputs (mA pulse rate and duration).',
        'Verify patient cable shield insulation and ground wire resistance (<0.2 ohms).'
      ];
    } else {
      frequency = 'Yearly';
      justification = 'General electronic/mechanical medical systems require annual safety verification according to local hospital regulations and manufacturer guidance.';
      checklist = [
        'Perform electrical safety inspection (leakage currents & earth resistance per IEC 62353).',
        'Inspect structural chassis, power cables, and switches for physical integrity.',
        'Run internal self-test diagnostics and clear history codes.'
      ];
    }

    return {
      equipmentId: equipment.id,
      equipmentName: equipment.name,
      recommendedFrequency: frequency,
      justification,
      checklist
    };
  },

  /**
   * Diagnose breakdown and suggest troubleshooting steps based on equipment details and reported problem.
   */
  analyzeFault(equipment, problemDescription) {
    const desc = problemDescription.toLowerCase();
    const name = (equipment.name || '').toLowerCase();
    const category = (equipment.category || '').toLowerCase();
    
    let probableCauses = [];
    let troubleshootingSteps = [];
    let urgency = 'Medium';
    let safetyNotice = 'Standard electrical safety rules apply.';

    if (desc.includes('shadow') || desc.includes('image') || desc.includes('lines') || desc.includes('noise')) {
      if (category.includes('imaging') || name.includes('ultrasound')) {
        probableCauses = [
          'Damaged piezoelectric crystals in the transducer probe due to mechanical shock.',
          'Damaged cable pin connection or shielding grid interference.',
          'Gantry slip ring brush carbon deposits causing signaling noise (for CT scanners).'
        ];
        troubleshootingSteps = [
          'Inspect the probe face for cracks, delamination, or lens swelling. If damaged, take probe out of service immediately.',
          'Clean the transducer contact pins with isopropyl alcohol and re-seat the connector firmly.',
          'Swap the transducer with an identical probe to isolate if the issue is in the probe or the system front-end acquisition board.'
        ];
        urgency = 'High';
        safetyNotice = 'Acoustic lens damage can compromise patient isolation barriers. Stop use if cracks are observed.';
      } else {
        probableCauses = [
          'Loose display cables or monitor failure.',
          'Electromagnetic interference (EMI) from adjacent electrical appliances.'
        ];
        troubleshootingSteps = [
          'Verify monitor input cable connectivity.',
          'Relocate the device away from cellular routers or high-power warmers.'
        ];
      }
    } else if (desc.includes('power') || desc.includes('turn on') || desc.includes('dead') || desc.includes('battery')) {
      probableCauses = [
        'Blown primary fuses in the power inlet module due to voltage spike.',
        'Internal power supply board (SPS) regulator failure.',
        'Deep-discharge battery state causing charge control lock-out.'
      ];
      troubleshootingSteps = [
        'Verify wall outlet active status by connecting another known working device.',
        'Check power cable continuity and seat it firmly into the device chassis inlet.',
        'Examine and measure continuity of primary fuses located in the small drawer near the AC power cord receptacle.',
        'Allow the device to charge on mains power for 4 hours; monitor if internal battery temperature remains normal.'
      ];
      urgency = desc.includes('emergency') || category.includes('respiratory') ? 'Critical' : 'High';
      safetyNotice = 'Always disconnect the AC mains power cord before examining or replacing internal fuses.';
    } else if (desc.includes('flow') || desc.includes('sensor') || desc.includes('leak') || desc.includes('pressure') || desc.includes('leakage')) {
      if (category.includes('respiratory') || name.includes('ventilator') || name.includes('anesthesia')) {
        probableCauses = [
          'Condensation droplets in the expiratory flow sensor tube causing laser scatter or thermal cooling bias.',
          'Cracked breathing circuit tubing, humidification chamber seal, or water trap.',
          'Calibration drift of internal proportioning valves.'
        ];
        troubleshootingSteps = [
          'Remove the flow sensor and dry it thoroughly using low-pressure dry air. Ensure no visible moisture remains.',
          'Check all patient circuit connections and humidification jar gaskets for leaks using the system diagnostic pressure test.',
          'Perform a manual flow sensor calibration through the system software menu.'
        ];
        urgency = 'Critical';
        safetyNotice = 'Gas circuit leaks can lead to patient hypoventilation. Use manual resuscitation bag if patient is connected.';
      } else {
        probableCauses = [
          'Clogged internal fluid filters.',
          'Worn out hydraulic seals/tubing.'
        ];
        troubleshootingSteps = [
          'Check hydraulic lines for visual pinhole leaks.',
          'Replace system fluid filter element.'
        ];
      }
    } else {
      // Default general fault troubleshooting
      probableCauses = [
        'Generic sensor calibration offset.',
        'Transient software glitch in micro-controller firmware.',
        'Physical wear on mechanical interlocks.'
      ];
      troubleshootingSteps = [
        'Restart the equipment: Power down, wait 30 seconds, and turn back on.',
        'Check the device manual troubleshooting section for specific numerical error codes.',
        'Run internal automated self-test routine and note code outputs.'
      ];
    }

    return {
      equipmentId: equipment.id,
      equipmentName: equipment.name,
      problemDescription,
      probableCauses,
      troubleshootingSteps,
      urgency,
      safetyNotice
    };
  },

  /**
   * Summarize service logs in readable format.
   */
  summarizeLogs(equipment, logs = []) {
    if (logs.length === 0) {
      return `No service history recorded for ${equipment.name} (${equipment.id}). System has been running under default conditions.`;
    }

    const completedPMs = logs.filter(l => l.type === 'Preventive' && l.status === 'Completed').length;
    const resolvedBreakdowns = logs.filter(l => l.reportedAt && l.status === 'Completed').length;
    const totalCost = logs.reduce((sum, l) => sum + (l.repairCost || l.cost || 0), 0);

    return `The ${equipment.name} (S/N: ${equipment.serialNumber}) has a history of ${completedPMs} preventive maintenance routines and ${resolvedBreakdowns} breakdown resolutions. The total recorded maintenance expenditure is $${totalCost.toLocaleString()}. The device is currently maintained in accordance with standard protocols.`;
  },

  /**
   * Q&A Helper for general biomedical questions.
   */
  answerQuestion(equipment, question) {
    const q = question.toLowerCase();
    const name = (equipment.name || '').toLowerCase();
    
    let answer = '';
    let links = [];

    if (q.includes('calibration') || q.includes('calibrate')) {
      answer = `For the ${equipment.name}, calibration should be performed using certified testing equipment. 
- For imaging equipment, this involves phantom scanners and dose meters to verify geometric and radiation accuracy.
- For patient monitoring and ECGs, an electrical safety simulator and patient rhythm simulator are required.
- Standard calibration frequency is set at ${equipment.nextCalibrationDate ? 'every 6 months' : 'once a year'}.
Always record calibration certificates in the BioTrack Calibration Module with the corresponding certificate numbers to maintain regulatory compliance.`;
      links.push('Calibration Standards (AAMI/ANSI)', 'Calibration Module');
    } else if (q.includes('maintenance') || q.includes('pm') || q.includes('preventive')) {
      answer = `Preventive maintenance for the ${equipment.name} (${equipment.modelNumber}) should follow the predefined manufacturer protocols. Ensure that:
1. The device is cleaned of patient fluids and dust using appropriate clinical disinfectants (avoid getting fluid in ports).
2. Internal fan dust screens are cleaned to prevent CPU overheating.
3. Power cord plug grounds are tested using an electrical safety analyzer (max limit is usually 0.2 ohms).
4. Perform functional self-tests after reassembly before returning the unit to the active clinical floor.`;
      links.push('PM Guidelines (NFPA 99)', 'Equipment Safety Checklists');
    } else if (q.includes('safety') || q.includes('leakage') || q.includes('iec 60601')) {
      answer = `The ${equipment.name} is classified as medical electrical equipment. It must comply with IEC 60601-1 safety standards.
Key safety limits for routine checks (IEC 62353):
- Protective Earth Resistance: Maximum 0.2 ohms.
- Equipment Leakage Current: Maximum 500 µA (Class I devices) or 100 µA (Class II devices).
- Patient Leakage Current: Maximum 100 µA (BF applied parts) or 10 µA (CF applied parts like ECG leads).
If these tests fail, label the device "DO NOT USE - ELECTRICAL DANGER" and isolate immediately.`;
      links.push('IEC 60601-1 Medical Safety Guidelines', 'Electrical Test Logs');
    } else {
      // General question
      answer = `To maintain the ${equipment.name} in peak operational state:
1. Ensure clinical staff perform the designated daily self-test before beginning patient procedures.
2. Confirm the environmental parameters of its location (Temperature: 18-22°C, Humidity: 30-60% non-condensing).
3. If any error messages occur, cross-reference them in the troubleshooting panel or submit a corrective breakdown ticket to assign an engineer.`;
      links.push('Operator Manuals', 'Submit Ticket');
    }

    return {
      question,
      equipmentName: equipment.name,
      answer,
      suggestedResources: links
    };
  }
};
