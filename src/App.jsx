import { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";

const SECTION_CONFIG = [
  { key: "lecture", label: "Lecture", weight: 1, badge: "100%" },
  { key: "tutorial", label: "Tutorial", weight: 1, badge: "100%" },
  { key: "practical", label: "Practical", weight: 0.5, badge: "50%" },
  { key: "skill", label: "Skill", weight: 0.25, badge: "25%" },
];

const EMPTY_SECTION = { conducted: "", attended: "", tcbr: "" };
const SUBJECT_STORAGE_KEY = "attendance_subjects_v1";
const LEGACY_SUBJECT_STORAGE_KEY = "klu_subject_attendance_v1";

function calculateSummary(values) {
  let weightedAttended = 0;
  let weightedConducted = 0;
  let totalConducted = 0;
  let totalAttended = 0;
  const issues = [];

  for (const section of SECTION_CONFIG) {
    const block = values[section.key];
    const hasAnyInput = block.conducted !== "" || block.attended !== "" || block.tcbr !== "";

    if (!hasAnyInput) {
      continue;
    }

    const conducted = Number(block.conducted);
    const attended = Number(block.attended);
    const tcbr = Number(block.tcbr || 0);

    if (block.conducted === "" || block.attended === "") {
      issues.push(`${section.label}: Conducted and Attended are required.`);
      continue;
    }

    if ([conducted, attended, tcbr].some((v) => Number.isNaN(v) || v < 0)) {
      issues.push(`${section.label}: only non-negative numbers are allowed.`);
      continue;
    }

    if (tcbr > conducted) {
      issues.push(`${section.label}: TCBR cannot be greater than Conducted.`);
      continue;
    }

    const netConducted = conducted - tcbr;

    if (netConducted <= 0) {
      issues.push(`${section.label}: net conducted must be greater than zero.`);
      continue;
    }

    if (attended > netConducted) {
      issues.push(`${section.label}: Attended cannot exceed net conducted.`);
      continue;
    }

    weightedAttended += attended * section.weight;
    weightedConducted += netConducted * section.weight;
    totalConducted += netConducted;
    totalAttended += attended;
  }

  if (weightedConducted === 0) {
    return {
      issues: issues.length ? issues : ["Enter at least one complete component to calculate attendance."],
      percentage: null,
      totalConducted: 0,
      totalAttended: 0,
      bunkTo75: null,
      needFor85: null,
    };
  }

  const percentage = Number(((weightedAttended / weightedConducted) * 100).toFixed(2));

  // Maximum additional classes that can be missed while staying >= 75%.
  const bunkTo75 = Math.max(0, Math.floor((weightedAttended - 0.75 * weightedConducted) / 0.75));

  // Extra fully-attended classes needed to reach 85%.
  const requiredFor85 = Math.max(0, Math.ceil((0.85 * weightedConducted - weightedAttended) / 0.15));

  return {
    issues,
    percentage,
    totalConducted,
    totalAttended,
    bunkTo75,
    needFor85: requiredFor85,
  };
}

function initializeState() {
  return SECTION_CONFIG.reduce((acc, section) => {
    acc[section.key] = { ...EMPTY_SECTION };
    return acc;
  }, {});
}

export default function App() {
  const [activeTab, setActiveTab] = useState("ltps");
  const [formData, setFormData] = useState(() => initializeState());
  const [history, setHistory] = useState([]);
  const [lastSummary, setLastSummary] = useState(null);
  const [absentInput, setAbsentInput] = useState({ currentPercent: "", totalClasses: "", plannedAbsents: "" });
  const [subjectRows, setSubjectRows] = useState(() => {
    const raw = localStorage.getItem(SUBJECT_STORAGE_KEY) || localStorage.getItem(LEGACY_SUBJECT_STORAGE_KEY);
    if (!raw) {
      return [{ id: crypto.randomUUID(), name: "", conducted: "", attended: "", tcbr: "" }];
    }

    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length
        ? parsed
        : [{ id: crypto.randomUUID(), name: "", conducted: "", attended: "", tcbr: "" }];
    } catch {
      return [{ id: crypto.randomUUID(), name: "", conducted: "", attended: "", tcbr: "" }];
    }
  });
  const exportRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(SUBJECT_STORAGE_KEY, JSON.stringify(subjectRows));
  }, [subjectRows]);

  const sectionAverages = useMemo(() => {
    const map = {};

    SECTION_CONFIG.forEach((section) => {
      const block = formData[section.key];
      const c = Number(block.conducted);
      const a = Number(block.attended);
      const t = Number(block.tcbr || 0);
      const net = c - t;

      map[section.key] = !Number.isNaN(c) && !Number.isNaN(a) && !Number.isNaN(t) && net > 0
        ? Number(((a / net) * 100).toFixed(1))
        : null;
    });

    return map;
  }, [formData]);

  const onChange = (sectionKey, field, value) => {
    if (value !== "" && !/^\d+$/.test(value)) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        [field]: value,
      },
    }));
  };

  const onAbsentChange = (field, value) => {
    if (value !== "" && !/^\d+$/.test(value)) {
      return;
    }

    setAbsentInput((prev) => ({ ...prev, [field]: value }));
  };

  const onSubjectChange = (id, field, value) => {
    if ((field === "conducted" || field === "attended" || field === "tcbr") && value !== "" && !/^\d+$/.test(value)) {
      return;
    }

    setSubjectRows((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const addSubject = () => {
    setSubjectRows((prev) => [...prev, { id: crypto.randomUUID(), name: "", conducted: "", attended: "", tcbr: "" }]);
  };

  const removeSubject = (id) => {
    setSubjectRows((prev) => {
      if (prev.length === 1) {
        return prev;
      }

      return prev.filter((row) => row.id !== id);
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const summary = calculateSummary(formData);
    setLastSummary(summary);

    if (!summary.issues.length && summary.percentage !== null) {
      const timestamp = new Date().toLocaleString();
      const entry = {
        id: crypto.randomUUID(),
        timestamp,
        percentage: summary.percentage,
      };
      setHistory((prev) => [entry, ...prev].slice(0, 6));
    }
  };

  const resetForm = () => {
    setFormData(initializeState());
    setLastSummary(null);
  };

  const absentSummary = useMemo(() => {
    const p = Number(absentInput.currentPercent);
    const t = Number(absentInput.totalClasses);
    const a = Number(absentInput.plannedAbsents || 0);

    if (
      absentInput.currentPercent === "" ||
      absentInput.totalClasses === "" ||
      Number.isNaN(p) ||
      Number.isNaN(t) ||
      Number.isNaN(a) ||
      p < 0 ||
      p > 100 ||
      t <= 0 ||
      a < 0
    ) {
      return null;
    }

    const currentAttended = (p / 100) * t;
    const newPercent = Number(((currentAttended / (t + a)) * 100).toFixed(2));
    const maxSafeAbsents = Math.max(0, Math.floor(currentAttended / 0.75 - t));

    return {
      newPercent,
      maxSafeAbsents,
      willBeSafe: newPercent >= 75,
    };
  }, [absentInput]);

  const subjectStats = useMemo(() => {
    const computed = subjectRows
      .map((row) => {
        const conducted = Number(row.conducted);
        const attended = Number(row.attended);
        const tcbr = Number(row.tcbr || 0);
        const net = conducted - tcbr;

        if (
          row.name.trim() === "" ||
          Number.isNaN(conducted) ||
          Number.isNaN(attended) ||
          Number.isNaN(tcbr) ||
          net <= 0 ||
          attended > net ||
          tcbr > conducted
        ) {
          return null;
        }

        return {
          id: row.id,
          name: row.name.trim(),
          percentage: Number(((attended / net) * 100).toFixed(2)),
          attended,
          net,
        };
      })
      .filter(Boolean);

    if (!computed.length) {
      return { rows: [], average: null };
    }

    const weightedAttended = computed.reduce((sum, row) => sum + row.attended, 0);
    const weightedConducted = computed.reduce((sum, row) => sum + row.net, 0);

    return {
      rows: computed,
      average: Number(((weightedAttended / weightedConducted) * 100).toFixed(2)),
    };
  }, [subjectRows]);

  const handleExportImage = async () => {
    if (!exportRef.current) {
      return;
    }

    const canvas = await html2canvas(exportRef.current, { scale: 2, backgroundColor: "#fffdf9" });
    const link = document.createElement("a");
    link.download = `attendance-report-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleExportPdf = () => {
    window.print();
  };

  const scoreClass =
    lastSummary?.percentage == null
      ? "score-neutral"
      : lastSummary.percentage >= 85
        ? "score-strong"
        : lastSummary.percentage >= 75
          ? "score-mid"
          : "score-alert";

  const scoreLabel =
    lastSummary?.percentage == null
      ? "Not Calculated"
      : lastSummary.percentage >= 85
        ? "Excellent"
        : lastSummary.percentage >= 75
          ? "Stable"
          : "Needs Focus";

  const latestScore = lastSummary?.percentage ?? "--";

  return (
    <main className="page-shell">
      <div className="ambient-shape shape-one" />
      <div className="ambient-shape shape-two" />

      <header className="top-nav">
        <div className="brand-wrap">
          <span className="brand-mark" aria-hidden="true">AC</span>
          <strong>ATTENDANCE CALCULATOR</strong>
        </div>

        <nav className="menu-links" aria-label="Main Sections">
          <button type="button" onClick={() => setActiveTab("home")} className={activeTab === "home" ? "tab on" : "tab"}>HOME</button>
          <button type="button" onClick={() => setActiveTab("ltps")} className={activeTab === "ltps" ? "tab on" : "tab"}>ATTENDANCE BY L-T-P-S</button>
          <button type="button" onClick={() => setActiveTab("absent")} className={activeTab === "absent" ? "tab on" : "tab"}>ATTENDANCE WHEN ABSENT</button>
          <button type="button" onClick={() => setActiveTab("subject")} className={activeTab === "subject" ? "tab on" : "tab"}>SUBJECT ATTENDANCE</button>
        </nav>
      </header>

      <section className="hero-card">
        <p className="kicker">Personal Academic Suite</p>
        <h1>ATTENDANCE CALCULATOR</h1>
        <p className="subtitle">
          Built for real semester decisions. Calculate LTPS attendance, simulate absents,
          track subject-wise performance, and export clean reports in one place.
        </p>

        <div className="status-rail">
          <article>
            <p>Current Mode</p>
            <strong>{activeTab.toUpperCase()}</strong>
          </article>
          <article>
            <p>Latest Score</p>
            <strong>{latestScore === "--" ? "--" : `${latestScore}%`}</strong>
          </article>
          <article>
            <p>Subjects Tracked</p>
            <strong>{subjectRows.length}</strong>
          </article>
          <article>
            <p>Performance</p>
            <strong>{scoreLabel}</strong>
          </article>
        </div>
      </section>

      <section className="signature-strip" aria-label="Feature Highlights">
        <article>
          <h3>Precision LTPS</h3>
          <p>Weighted lecture, tutorial, practical, and skill analytics with strict validation.</p>
        </article>
        <article>
          <h3>Predictive Planner</h3>
          <p>Estimate attendance impact before absents and plan safely above 75%.</p>
        </article>
        <article>
          <h3>Subject Intelligence</h3>
          <p>Track multiple subjects, compare performance, and export your report quickly.</p>
        </article>
      </section>

      {activeTab === "home" && (
        <>
          <section className="home-panel">
            <div>
              <h2>Built For Real Attendance Decisions</h2>
              <p>
                Use LTPS weighted calculation, predict your safe absents, track subject-wise percentages,
                and export your report as image or PDF.
              </p>
              <div className="home-points">
                <span>Weighted LTPS Logic</span>
                <span>Absent Impact Predictor</span>
                <span>Subject Tracker + Mini Chart</span>
              </div>

              <div className="quick-actions">
                <button type="button" onClick={() => setActiveTab("ltps")}>Go To LTPS</button>
                <button type="button" onClick={() => setActiveTab("absent")}>Plan Absents</button>
                <button type="button" onClick={() => setActiveTab("subject")}>Open Subjects</button>
              </div>
            </div>
            <div className="home-image" aria-label="Attendance visual board">
              <div className="orbit-shell">
                <div className="orbit-core">
                  <span>{latestScore === "--" ? "--" : `${latestScore}%`}</span>
                  <small>Overall</small>
                </div>
              </div>

              <div className="mini-bars">
                {SECTION_CONFIG.map((section) => {
                  const value = sectionAverages[section.key] ?? 0;
                  return (
                    <div className="mini-bar-row" key={section.key}>
                      <span>{section.label.slice(0, 3).toUpperCase()}</span>
                      <div className="mini-bar-track">
                        <div className="mini-bar-fill" style={{ width: `${value}%` }} />
                      </div>
                      <strong>{value === 0 ? "--" : `${value}%`}</strong>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="faculty-note" aria-label="Why choose this project">
            <h2>Why Choose This Project</h2>
            <p>
              This is not just a normal attendance calculator. It is a decision-support tool that helps
              students and faculty plan attendance with clarity.
            </p>
            <div className="faculty-grid">
              <article>
                <h3>Weighted LTPS Accuracy</h3>
                <p>Uses L-T-P-S component weight logic instead of simple average percentage.</p>
              </article>
              <article>
                <h3>Absent Impact Prediction</h3>
                <p>Students can simulate absents before missing classes and avoid risk early.</p>
              </article>
              <article>
                <h3>Subject-wise Tracking</h3>
                <p>Tracks each subject independently with visual comparison and an overall summary.</p>
              </article>
              <article>
                <h3>Actionable Guidance</h3>
                <p>Shows bunk allowance and classes needed to recover to targets like 75% and 85%.</p>
              </article>
            </div>
            <blockquote>
              Faculty takeaway: this improves attendance decisions, not just attendance calculation.
            </blockquote>
          </section>
        </>
      )}

      {activeTab === "ltps" && (
      <form className="calculator-grid" onSubmit={handleSubmit}>
        {SECTION_CONFIG.map((section) => (
          <article className="input-card" key={section.key}>
            <header className="card-head">
              <h2>{section.label}</h2>
              <span>{section.badge}</span>
            </header>

            <div className="inputs-row">
              <label>
                Conducted
                <input
                  value={formData[section.key].conducted}
                  onChange={(event) => onChange(section.key, "conducted", event.target.value)}
                  placeholder="0"
                  inputMode="numeric"
                />
              </label>

              <label>
                Attended
                <input
                  value={formData[section.key].attended}
                  onChange={(event) => onChange(section.key, "attended", event.target.value)}
                  placeholder="0"
                  inputMode="numeric"
                />
              </label>

              <label>
                TCBR
                <input
                  value={formData[section.key].tcbr}
                  onChange={(event) => onChange(section.key, "tcbr", event.target.value)}
                  placeholder="0"
                  inputMode="numeric"
                />
              </label>
            </div>

            <footer className="mini-insight">
              <span>Component average</span>
              <strong>{sectionAverages[section.key] == null ? "--" : `${sectionAverages[section.key]}%`}</strong>
            </footer>
          </article>
        ))}

        <section className="result-panel" ref={exportRef}>
          <div className="actions">
            <button type="submit" className="btn primary">Calculate</button>
            <button type="button" className="btn ghost" onClick={resetForm}>Reset</button>
            <button type="button" className="btn ghost" onClick={handleExportImage}>Export PNG</button>
            <button type="button" className="btn ghost" onClick={handleExportPdf}>Export PDF</button>
          </div>

          <div className={`score-chip ${scoreClass}`}>
            {lastSummary?.percentage == null ? "Awaiting Calculation" : `${lastSummary.percentage}%`}
          </div>

          <div className="insight-grid">
            <div>
              <p>Total Attended</p>
              <h3>{lastSummary?.totalAttended ?? "--"}</h3>
            </div>
            <div>
              <p>Total Conducted</p>
              <h3>{lastSummary?.totalConducted ?? "--"}</h3>
            </div>
            <div>
              <p>Bunk Allowed (75%)</p>
              <h3>{lastSummary?.bunkTo75 ?? "--"}</h3>
            </div>
            <div>
              <p>Need For 85%</p>
              <h3>{lastSummary?.needFor85 ?? "--"}</h3>
            </div>
          </div>

          {lastSummary?.issues?.length ? (
            <ul className="error-list">
              {lastSummary.issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          ) : (
            <p className="success-line">Inputs look valid. You are seeing weighted LTPS result.</p>
          )}

          <div className="bar-chart" aria-label="LTPS chart">
            {SECTION_CONFIG.map((section) => {
              const value = sectionAverages[section.key];
              return (
                <div className="bar-item" key={section.key}>
                  <span>{section.label}</span>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${value ?? 0}%` }} />
                  </div>
                  <strong>{value == null ? "--" : `${value}%`}</strong>
                </div>
              );
            })}
          </div>
        </section>
      </form>
      )}

      {activeTab === "absent" && (
        <section className="absent-panel">
          <h2>Attendance When Absent</h2>
          <p>Find how your percentage changes if you miss upcoming classes.</p>

          <div className="absent-grid">
            <label>
              Current Attendance %
              <input
                value={absentInput.currentPercent}
                onChange={(event) => onAbsentChange("currentPercent", event.target.value)}
                placeholder="Example: 82"
                inputMode="numeric"
              />
            </label>
            <label>
              Total Classes Conducted
              <input
                value={absentInput.totalClasses}
                onChange={(event) => onAbsentChange("totalClasses", event.target.value)}
                placeholder="Example: 64"
                inputMode="numeric"
              />
            </label>
            <label>
              Planned Absents
              <input
                value={absentInput.plannedAbsents}
                onChange={(event) => onAbsentChange("plannedAbsents", event.target.value)}
                placeholder="Example: 3"
                inputMode="numeric"
              />
            </label>
          </div>

          <div className="absent-result">
            {absentSummary ? (
              <>
                <h3>Projected Attendance: {absentSummary.newPercent}%</h3>
                <p>Maximum safe absents before dropping below 75%: {absentSummary.maxSafeAbsents}</p>
                <p className={absentSummary.willBeSafe ? "ok-text" : "bad-text"}>
                  {absentSummary.willBeSafe ? "You are still above 75%." : "Warning: this plan drops you below 75%."}
                </p>
              </>
            ) : (
              <p>Enter valid values to predict your attendance after absents.</p>
            )}
          </div>
        </section>
      )}

      {activeTab === "subject" && (
        <section className="subject-panel" ref={exportRef}>
          <div className="subject-head">
            <h2>Subject Attendance</h2>
            <div className="actions">
              <button type="button" className="btn primary" onClick={addSubject}>Add Subject</button>
              <button type="button" className="btn ghost" onClick={handleExportImage}>Export PNG</button>
              <button type="button" className="btn ghost" onClick={handleExportPdf}>Export PDF</button>
            </div>
          </div>

          <div className="subject-table">
            {subjectRows.map((row) => (
              <div className="subject-row" key={row.id}>
                <input
                  value={row.name}
                  onChange={(event) => onSubjectChange(row.id, "name", event.target.value)}
                  placeholder="Subject name"
                />
                <input
                  value={row.conducted}
                  onChange={(event) => onSubjectChange(row.id, "conducted", event.target.value)}
                  placeholder="Conducted"
                  inputMode="numeric"
                />
                <input
                  value={row.attended}
                  onChange={(event) => onSubjectChange(row.id, "attended", event.target.value)}
                  placeholder="Attended"
                  inputMode="numeric"
                />
                <input
                  value={row.tcbr}
                  onChange={(event) => onSubjectChange(row.id, "tcbr", event.target.value)}
                  placeholder="TCBR"
                  inputMode="numeric"
                />
                <button type="button" className="delete-btn" onClick={() => removeSubject(row.id)}>Remove</button>
              </div>
            ))}
          </div>

          <div className="subject-summary">
            <h3>Overall Subject Attendance: {subjectStats.average ?? "--"}%</h3>
            <div className="bar-chart">
              {subjectStats.rows.length ? (
                subjectStats.rows.map((row) => (
                  <div className="bar-item" key={row.id}>
                    <span>{row.name}</span>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${row.percentage}%` }} />
                    </div>
                    <strong>{row.percentage}%</strong>
                  </div>
                ))
              ) : (
                <p>Add valid subject values to view chart.</p>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="history-card">
        <h2>Recent Calculation Timeline</h2>
        {history.length === 0 ? (
          <p>No history yet. Run your first calculation.</p>
        ) : (
          <ul>
            {history.map((item) => (
              <li key={item.id}>
                <span>{item.timestamp}</span>
                <strong>{item.percentage}%</strong>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
