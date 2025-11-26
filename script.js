// MIL-STD-704 Power Quality Compliance Checker (simplified/demo)

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("checker-form");
  const busTypeSelect = document.getElementById("busType");
  const resetBtn = document.getElementById("resetBtn");
  const printBtn = document.getElementById("printBtn");

  const steadyVoltageUnitLabel = document.getElementById("steadyVoltageUnit");
  const steadyVoltageHint = document.getElementById("steadyVoltageHint");

  const overallStatus = document.getElementById("overallStatus");
  const checklist = document.getElementById("checklist");
  const summaryBlock = document.getElementById("summaryBlock");

  const summaryBusType = document.getElementById("summaryBusType");
  const summaryNominal = document.getElementById("summaryNominal");
  const summarySteadyVoltage = document.getElementById("summarySteadyVoltage");
  const summaryFrequency = document.getElementById("summaryFrequency");
  const summaryRipple = document.getElementById("summaryRipple");
  const summaryUv = document.getElementById("summaryUv");
  const summaryOv = document.getElementById("summaryOv");

  // Simplified reference data (illustrative, not authoritative)
  const busProfiles = {
    "28vdc": {
      label: "28 VDC Main Bus (Illustrative)",
      nominalVoltage: 28,
      steadyVoltageRange: [22, 29], // V
      ripplePercentMax: 5, // %
      uvDipPercentMax: 20, // %
      uvDurationMaxMs: 50, // ms
      ovSurgePercentMax: 20, // %
      ovDurationMaxMs: 50, // ms
      hasFrequency: false,
      frequencyRange: null,
    },
    "115vac400": {
      label: "115 VAC, 400 Hz (Illustrative)",
      nominalVoltage: 115,
      steadyVoltageRange: [108, 118], // V
      ripplePercentMax: 5, // treat as THD %
      uvDipPercentMax: 20, // %
      uvDurationMaxMs: 50, // ms
      ovSurgePercentMax: 20, // %
      ovDurationMaxMs: 50, // ms
      hasFrequency: true,
      frequencyRange: [395, 405], // Hz
    },
  };

  function updateBusMode() {
    const busKey = busTypeSelect.value;
    const profile = busProfiles[busKey];

    // Toggle AC-only views
    if (profile.hasFrequency) {
      document.body.classList.add("ac-mode");
    } else {
      document.body.classList.remove("ac-mode");
    }

    // Update label & hint for steady-state voltage
    if (busKey === "28vdc") {
      steadyVoltageUnitLabel.textContent = "VDC";
      steadyVoltageHint.textContent = "Example: 27.8 VDC on a nominal 28 V bus.";
    } else {
      steadyVoltageUnitLabel.textContent = "VAC (RMS)";
      steadyVoltageHint.textContent = "Example: 113.5 VAC RMS on a 115 V, 400 Hz bus.";
    }
  }

  function parseNumber(id) {
    const el = document.getElementById(id);
    if (!el) return null;
    const val = el.value.trim();
    if (val === "") return null;
    const num = Number(val);
    return Number.isFinite(num) ? num : null;
  }

  function runComplianceCheck(event) {
    event.preventDefault();

    const busKey = busTypeSelect.value;
    const profile = busProfiles[busKey];

    const steadyVoltage = parseNumber("steadyVoltage");
    const steadyFrequency = parseNumber("steadyFrequency");
    const ripple = parseNumber("ripple");
    const uvDipPercent = parseNumber("uvDipPercent");
    const uvDipDuration = parseNumber("uvDipDuration");
    const ovSurgePercent = parseNumber("ovSurgePercent");
    const ovSurgeDuration = parseNumber("ovSurgeDuration");

    const checks = [];

    // --- Validation / Checks ---
    // 1) Steady-state voltage
    if (steadyVoltage != null) {
      const [vMin, vMax] = profile.steadyVoltageRange;
      const pass = steadyVoltage >= vMin && steadyVoltage <= vMax;
      const detail = `Measured: ${steadyVoltage.toFixed(
        2
      )} V, Allowed: ${vMin.toFixed(1)}–${vMax.toFixed(1)} V`;
      checks.push({
        label: "Steady-State Voltage",
        pass,
        detail,
      });
    } else {
      checks.push({
        label: "Steady-State Voltage",
        pass: false,
        detail: "No measured voltage provided.",
      });
    }

    // 2) Frequency (AC only)
    if (profile.hasFrequency) {
      if (steadyFrequency != null) {
        const [fMin, fMax] = profile.frequencyRange;
        const pass = steadyFrequency >= fMin && steadyFrequency <= fMax;
        const detail = `Measured: ${steadyFrequency.toFixed(
          2
        )} Hz, Allowed: ${fMin.toFixed(1)}–${fMax.toFixed(1)} Hz`;
        checks.push({
          label: "Steady-State Frequency",
          pass,
          detail,
        });
      } else {
        checks.push({
          label: "Steady-State Frequency",
          pass: false,
          detail: "No measured frequency provided for AC bus.",
        });
      }
    }

    // 3) Ripple / Distortion
    if (ripple != null) {
      const maxRipple = profile.ripplePercentMax;
      const pass = ripple <= maxRipple;
      const detail = `Measured: ${ripple.toFixed(
        2
      )} %, Allowed: ≤ ${maxRipple.toFixed(1)} %`;
      checks.push({
        label: profile.hasFrequency
          ? "AC Distortion / THD"
          : "DC Ripple Voltage",
        pass,
        detail,
      });
    } else {
      checks.push({
        label: profile.hasFrequency
          ? "AC Distortion / THD"
          : "DC Ripple Voltage",
        pass: false,
        detail: "No ripple / distortion value provided.",
      });
    }

    // 4) Undervoltage dip
    if (uvDipPercent != null && uvDipDuration != null) {
      const passPercent = uvDipPercent <= profile.uvDipPercentMax;
      const passDuration = uvDipDuration <= profile.uvDurationMaxMs;
      const pass = passPercent && passDuration;
      const detail = `Measured: ${uvDipPercent.toFixed(
        1
      )} % for ${uvDipDuration.toFixed(
        0
      )} ms, Allowed: ≤ ${profile.uvDipPercentMax.toFixed(
        1
      )} % for ≤ ${profile.uvDurationMaxMs.toFixed(0)} ms`;
      checks.push({
        label: "Transient Undervoltage",
        pass,
        detail,
      });
    } else {
      checks.push({
        label: "Transient Undervoltage",
        pass: false,
        detail: "Undervoltage dip percent and/or duration not provided.",
      });
    }

    // 5) Overvoltage surge
    if (ovSurgePercent != null && ovSurgeDuration != null) {
      const passPercent = ovSurgePercent <= profile.ovSurgePercentMax;
      const passDuration = ovSurgeDuration <= profile.ovDurationMaxMs;
      const pass = passPercent && passDuration;
      const detail = `Measured: ${ovSurgePercent.toFixed(
        1
      )} % for ${ovSurgeDuration.toFixed(
        0
      )} ms, Allowed: ≤ ${profile.ovSurgePercentMax.toFixed(
        1
      )} % for ≤ ${profile.ovDurationMaxMs.toFixed(0)} ms`;
      checks.push({
        label: "Transient Overvoltage",
        pass,
        detail,
      });
    } else {
      checks.push({
        label: "Transient Overvoltage",
        pass: false,
        detail: "Overvoltage surge percent and/or duration not provided.",
      });
    }

    // Determine overall pass/fail
    const overallPass = checks.every((c) => c.pass);

    // --- Render Results ---
    renderOverallStatus(overallPass);
    renderSummary(profile, {
      steadyVoltage,
      steadyFrequency,
      ripple,
      uvDipPercent,
      uvDipDuration,
      ovSurgePercent,
      ovSurgeDuration,
    });
    renderChecklist(checks);
  }

  function renderOverallStatus(overallPass) {
    overallStatus.classList.remove(
      "overall-status--idle",
      "overall-status--pass",
      "overall-status--fail"
    );

    const labelEl = overallStatus.querySelector(".overall-status__label");
    const pillEl = overallStatus.querySelector(".overall-status__pill");

    if (overallPass) {
      overallStatus.classList.add("overall-status--pass");
      labelEl.textContent =
        "Result: All checked parameters are within illustrative limits.";
      pillEl.textContent = "PASS (Demo)";
    } else {
      overallStatus.classList.add("overall-status--fail");
      labelEl.textContent =
        "Result: One or more parameters exceed illustrative limits.";
      pillEl.textContent = "NOT COMPLIANT (Demo)";
    }
  }

  function renderSummary(profile, values) {
    summaryBlock.classList.remove("summary-block--hidden");

    summaryBusType.textContent = profile.label;
    summaryNominal.textContent = `${profile.nominalVoltage} ${
      profile.hasFrequency ? "VAC" : "VDC"
    }`;

    summarySteadyVoltage.textContent =
      values.steadyVoltage != null
        ? `${values.steadyVoltage.toFixed(2)} ${
            profile.hasFrequency ? "VAC" : "VDC"
          }`
        : "–";

    summaryFrequency.textContent =
      profile.hasFrequency && values.steadyFrequency != null
        ? `${values.steadyFrequency.toFixed(2)} Hz`
        : profile.hasFrequency
        ? "Not provided"
        : "N/A";

    summaryRipple.textContent =
      values.ripple != null ? `${values.ripple.toFixed(2)} %` : "Not provided";

    summaryUv.textContent =
      values.uvDipPercent != null && values.uvDipDuration != null
        ? `${values.uvDipPercent.toFixed(1)} % for ${values.uvDipDuration.toFixed(
            0
          )} ms`
        : "Not provided";

    summaryOv.textContent =
      values.ovSurgePercent != null && values.ovSurgeDuration != null
        ? `${values.ovSurgePercent.toFixed(
            1
          )} % for ${values.ovSurgeDuration.toFixed(0)} ms`
        : "Not provided";
  }

  function renderChecklist(checks) {
    checklist.classList.remove("checklist--empty");
    checklist.innerHTML = "";

    checks.forEach((check) => {
      const row = document.createElement("div");
      row.className = "check-item";

      const left = document.createElement("div");
      left.className = "check-item__left";

      const label = document.createElement("span");
      label.className = "check-item__label";
      label.textContent = check.label;

      const detail = document.createElement("span");
      detail.className = "check-item__detail";
      detail.textContent = check.detail;

      left.appendChild(label);
      left.appendChild(detail);

      const pill = document.createElement("span");
      pill.className = "check-item__pill";
      pill.classList.add(
        check.pass ? "check-item__pill--pass" : "check-item__pill--fail"
      );
      pill.textContent = check.pass ? "Within limit" : "Out of limit";

      row.appendChild(left);
      row.appendChild(pill);

      checklist.appendChild(row);
    });
  }

  function resetForm() {
    form.reset();
    updateBusMode();

    overallStatus.classList.remove(
      "overall-status--pass",
      "overall-status--fail"
    );
    overallStatus.classList.add("overall-status--idle");

    const labelEl = overallStatus.querySelector(".overall-status__label");
    const pillEl = overallStatus.querySelector(".overall-status__pill");
    labelEl.textContent = "Awaiting input";
    pillEl.textContent = "No run yet";

    checklist.classList.add("checklist--empty");
    checklist.innerHTML =
      '<p class="checklist__placeholder">Run a compliance check to see individual requirement results.</p>';

    summaryBlock.classList.add("summary-block--hidden");
  }

  // Event bindings
  busTypeSelect.addEventListener("change", updateBusMode);
  form.addEventListener("submit", runComplianceCheck);
  resetBtn.addEventListener("click", resetForm);
  printBtn.addEventListener("click", () => window.print());

  // Initialize
  updateBusMode();
});
