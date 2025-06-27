import React, { useState } from "react";
import "./styles.css";

// --- Standard Equipment List (alphabetical) ---
const STANDARD_EQUIPMENT = [
  { name: "Computer", power: 200 },
  { name: "Compressor", power: 2200 },
  { name: "Dryer", power: 3000 },
  { name: "ERV Unit", power: 800 },
  { name: "Exhaust Fan", power: 250 },
  { name: "Freezer", power: 800 },
  { name: "Furnace", power: 1800 },
  { name: "Lights", power: 60 },
  { name: "Printer", power: 50 },
  { name: "Refrigerator", power: 750 },
  { name: "Rooftop AC", power: 4500 },
  { name: "Split AC Unit", power: 3500 },
  { name: "Washer", power: 500 },
];

const SORTED_EQUIPMENT = STANDARD_EQUIPMENT.slice().sort((a, b) =>
  a.name.localeCompare(b.name)
);

// --- Solar Irradiance Lookup Table (by ZIP) ---
const IRRADIANCE_BY_ZIP = {
  94016: 1700, // San Francisco
  95054: 1800, // Santa Clara
  99501: 1200, // Anchorage
  33101: 1700, // Miami
  80202: 1600, // Denver
  90001: 1850, // Los Angeles
  60601: 1450, // Chicago
  10001: 1450, // New York
  // Add more ZIPs as needed
};

function getAnnualIrradiance(zip) {
  // Only use the first 5 digits if user types more
  const shortZip = (zip || "").toString().substring(0, 5);
  if (IRRADIANCE_BY_ZIP[shortZip]) return IRRADIANCE_BY_ZIP[shortZip];
  return 1500; // fallback US average
}

function calcPVSize(annualLoadKWh, irradiance, percent) {
  return ((annualLoadKWh * percent) / irradiance) * 1.1;
}
function calcBatterySize(dailyLoadKWh, percent, backupHours = 4) {
  return ((dailyLoadKWh * percent) / 24) * backupHours;
}

export default function ElectricLoadCalculator() {
  // --- Facility State ---
  const [facility, setFacility] = useState({
    address: "",
    zip: "",
    desiredSolarPct: "",
  });

  // --- Equipment Form State ---
  const [equipmentForm, setEquipmentForm] = useState({
    name: "",
    qty: 1,
    power: "",
    dailyHours: "",
  });
  const [selectedStd, setSelectedStd] = useState("");
  const [equipmentList, setEquipmentList] = useState([]);

  // --- Input Handlers ---
  const handleFacilityChange = (e) => {
    setFacility({ ...facility, [e.target.name]: e.target.value });
  };
  const handleEquipmentChange = (e) => {
    let val = e.target.value;
    if (e.target.name === "dailyHours") {
      val = Math.min(Number(val), 24);
    }
    setEquipmentForm({ ...equipmentForm, [e.target.name]: val });
  };
  const handleStdSelect = (e) => {
    const val = e.target.value;
    setSelectedStd(val);
    const std = SORTED_EQUIPMENT.find((eq) => eq.name === val);
    if (std) {
      setEquipmentForm({
        ...equipmentForm,
        name: std.name,
        power: std.power,
      });
    }
  };
  const addEquipment = () => {
    if (
      equipmentForm.name &&
      equipmentForm.qty > 0 &&
      equipmentForm.power > 0 &&
      equipmentForm.dailyHours > 0
    ) {
      setEquipmentList([
        ...equipmentList,
        {
          ...equipmentForm,
          qty: Number(equipmentForm.qty),
          power: Number(equipmentForm.power),
          dailyHours: Number(equipmentForm.dailyHours),
        },
      ]);
      setEquipmentForm({
        name: "",
        qty: 1,
        power: "",
        dailyHours: "",
      });
      setSelectedStd("");
    }
  };
  const removeEquipment = (idx) => {
    setEquipmentList(equipmentList.filter((_, i) => i !== idx));
  };

  // --- Calculations ---
  const calcRowLoad = (eq) =>
    ((eq.qty * eq.power * eq.dailyHours) / 1000).toFixed(2);

  const dailyLoad = equipmentList.reduce(
    (sum, eq) => sum + (eq.qty * eq.power * eq.dailyHours) / 1000,
    0
  );

  const monthlyLoad = dailyLoad * 30;
  const annualLoad = dailyLoad * 365;

  // If desiredSolarPct is blank or not valid, treat as 0
  const solarPct =
    Math.max(0, Math.min(100, Number(facility.desiredSolarPct || 0))) / 100;

  const irradiance = getAnnualIrradiance(facility.zip);
  const pvSize = calcPVSize(annualLoad, irradiance, solarPct);
  const annualPV = pvSize * irradiance;
  const batterySize = calcBatterySize(dailyLoad, solarPct, 4);

  const handlePrint = () => {
    window.print();
  };

  // ZIP code is mandatory (ignore address)
  const hasLocation = facility.zip && facility.zip.trim() !== "";

  return (
    <div className="elec-calc-root">
      {/* HEADER */}
      <div className="elec-calc-header">
        <img src="/logo-maktinta.png" alt="Logo" className="elec-calc-logo" />
        <div className="elec-calc-title">Electric Load Calculator</div>
      </div>
      {/* Facility Information */}
      <div className="elec-calc-section">
        <div className="elec-calc-sec-header">Facility Information</div>
        <input
          className="elec-calc-input"
          placeholder="Street Address"
          name="address"
          value={facility.address}
          onChange={handleFacilityChange}
        />
        <label style={{ fontWeight: "bold" }}>
          Zip Code <span style={{ color: "#b91c1c" }}>*</span>
        </label>
        <input
          className="elec-calc-input"
          placeholder="Zip Code"
          name="zip"
          value={facility.zip}
          onChange={handleFacilityChange}
          required
          style={{ borderColor: !facility.zip ? "#b91c1c" : "#b4bcd0" }}
        />
        <input
          className="elec-calc-input"
          placeholder="Desired Solar Contribution (%)"
          name="desiredSolarPct"
          type="number"
          min={0}
          max={100}
          value={facility.desiredSolarPct}
          onChange={handleFacilityChange}
          title="Percent of your facility's total annual load you want solar to supply"
        />
      </div>

      {!hasLocation && (
        <div
          className="elec-calc-section"
          style={{
            opacity: 0.95,
            background: "#fffbe7",
            color: "#b45309",
            fontWeight: 500,
            textAlign: "center",
            border: "1.5px solid #f5dd60",
          }}
        >
          Please enter your{" "}
          <span style={{ color: "#b91c1c", fontWeight: 600 }}>ZIP code</span> to
          continue.
          <br />
          <span style={{ fontWeight: 400, fontSize: "1.01em" }}>
            ZIP code is required to determine solar system size.
          </span>
        </div>
      )}

      {hasLocation && (
        <>
          {/* Equipment Load Entry */}
          <div className="elec-calc-section">
            <div className="elec-calc-sec-header">Equipment Load Entry</div>
            <select
              className="elec-calc-select"
              value={selectedStd}
              onChange={handleStdSelect}
            >
              <option value="">Select Standard Equipment</option>
              {SORTED_EQUIPMENT.map((eq, i) => (
                <option key={i} value={eq.name}>
                  {eq.name}
                </option>
              ))}
            </select>
            <input
              className="elec-calc-input"
              placeholder="Equipment Name"
              name="name"
              value={equipmentForm.name}
              onChange={handleEquipmentChange}
            />
            <input
              className="elec-calc-input"
              placeholder="Qty"
              name="qty"
              value={equipmentForm.qty}
              onChange={handleEquipmentChange}
              type="number"
              min={1}
            />
            <input
              className="elec-calc-input"
              placeholder="Power (W)"
              name="power"
              value={equipmentForm.power}
              onChange={handleEquipmentChange}
              type="number"
              min={1}
            />
            <input
              className="elec-calc-input"
              placeholder="Daily Operating Hours (max 24)"
              name="dailyHours"
              value={equipmentForm.dailyHours}
              onChange={handleEquipmentChange}
              type="number"
              min={1}
              max={24}
            />
            <button
              className="elec-calc-btn"
              onClick={addEquipment}
              type="button"
            >
              Add Equipment to List
            </button>
            {/* Equipment List Table */}
            {equipmentList.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <table className="elec-calc-table">
                  <thead>
                    <tr>
                      <th>Equipment</th>
                      <th>Qty</th>
                      <th>Power (W)</th>
                      <th>Daily Hrs</th>
                      <th>Daily Load (kWh)</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {equipmentList.map((eq, idx) => (
                      <tr key={idx}>
                        <td>{eq.name}</td>
                        <td>{eq.qty}</td>
                        <td>{eq.power}</td>
                        <td>{eq.dailyHours}</td>
                        <td>{calcRowLoad(eq)}</td>
                        <td>
                          <button
                            onClick={() => removeEquipment(idx)}
                            className="elec-calc-remove-btn"
                            title="Remove"
                          >
                            x
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Summary & Results */}
          <div className="elec-calc-section">
            <div className="elec-calc-sec-header">Summary & Results</div>
            <div
              style={{
                marginBottom: "10px",
                color: "#14532d",
                fontWeight: 500,
              }}
            >
              Solar calculations use average irradiance for ZIP code{" "}
              <span style={{ fontWeight: 700 }}>{facility.zip}</span>:{" "}
              <span style={{ fontWeight: 700 }}>{irradiance}</span> kWh/kW/year.
            </div>
            <table className="elec-calc-summary-table">
              <tbody>
                <tr>
                  <td>
                    <b>Total Daily Load:</b>
                  </td>
                  <td>{dailyLoad.toFixed(2)} kWh</td>
                </tr>
                <tr>
                  <td>
                    <b>Monthly Load:</b>
                  </td>
                  <td>{monthlyLoad.toFixed(2)} kWh</td>
                </tr>
                <tr>
                  <td>
                    <b>Annual Load:</b>
                  </td>
                  <td>{annualLoad.toFixed(2)} kWh</td>
                </tr>
                <tr>
                  <td colSpan={2} style={{ paddingTop: 10 }}>
                    <b>Solar & Battery Recommendation</b>
                  </td>
                </tr>
                <tr>
                  <td>Solar PV Size ({facility.desiredSolarPct || 0}%):</td>
                  <td>{isNaN(pvSize) ? "—" : pvSize.toFixed(2) + " kW"}</td>
                </tr>
                <tr>
                  <td>Annual PV Output:</td>
                  <td>
                    {isNaN(annualPV) ? "—" : annualPV.toFixed(0) + " kWh"}
                  </td>
                </tr>
                <tr>
                  <td>Battery Storage:</td>
                  <td>
                    {isNaN(batterySize) ? "—" : batterySize.toFixed(1) + " kWh"}{" "}
                    <span style={{ color: "#888" }}>
                      (~4hr backup, matches solar contribution)
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
            <button className="elec-calc-btn" onClick={handlePrint}>
              Download PDF / Print
            </button>
            <div className="elec-calc-disclaimer">
              Disclaimer: This calculator provides preliminary estimates for
              informational purposes only. For a detailed proposal, contact
              Maktinta Energy or your local solar provider.
            </div>
            <div className="elec-calc-contact">
              Maktinta Energy &nbsp; | &nbsp; www.maktinta.com &nbsp; | &nbsp;
              Tel: (408) 432-9900
            </div>
          </div>
        </>
      )}
    </div>
  );
}
