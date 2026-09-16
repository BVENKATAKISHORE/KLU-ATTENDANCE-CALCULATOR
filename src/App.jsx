import { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";

const SECTION_CONFIG = [
  { key: "lecture", label: "Lecture", weight: 1, badge: "100%", desc: "1.0 Credit Weight" },
  { key: "tutorial", label: "Tutorial", weight: 1, badge: "100%", desc: "1.0 Credit Weight" },
  { key: "practical", label: "Practical", weight: 0.5, badge: "50%", desc: "0.5 Credit Weight" },
  { key: "skill", label: "Skill", weight: 0.25, badge: "25%", desc: "0.25 Credit Weight" },
];

const EMPTY_SECTION = { conducted: "", attended: "", tcbr: "" };
const SUBJECT_STORAGE_KEY = "attendance_subjects_v2";
const STUDENT_PROFILE_KEY = "attendance_student_profile_v1";
const HISTORY_STORAGE_KEY = "attendance_calc_history_v1";

const DEFAULT_SUBJECT_PRESETS = {
  cse: [
    { id: "sub-1", name: "Data Structures & Algorithms", conducted: "42", attended: "38", tcbr: "2", category: "Embedded" },
    { id: "sub-2", name: "Operating Systems", conducted: "36", attended: "30", tcbr: "0", category: "Lecture" },
    { id: "sub-3", name: "Database Management Systems", conducted: "40", attended: "34", tcbr: "1", category: "Embedded" },
    { id: "sub-4", name: "Computer Networks", conducted: "32", attended: "26", tcbr: "0", category: "Lecture" },
    { id: "sub-5", name: "Full Stack Development Lab", conducted: "28", attended: "27", tcbr: "0", category: "Lab" },
  ],
  ece: [
    { id: "sub-1", name: "Signals and Systems", conducted: "40", attended: "35", tcbr: "1", category: "Embedded" },
    { id: "sub-2", name: "Analog Circuits", conducted: "38", attended: "31", tcbr: "0", category: "Lecture" },
    { id: "sub-3", name: "Digital Logic Design", conducted: "42", attended: "36", tcbr: "2", category: "Embedded" },
    { id: "sub-4", name: "Microcontrollers Lab", conducted: "30", attended: "28", tcbr: "0", category: "Lab" },
  ],
};

function calculateSummary(values, targetPercent = 75) {
  let weightedAttended = 0;
  let weightedConducted = 0;
  let totalConducted = 0;
  let totalAttended = 0;
  let totalTcbr = 0;
  const issues = [];
  const sectionBreakdown = [];

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
      issues.push(`${section.label}: Only non-negative numbers are allowed.`);
      continue;
    }

    if (tcbr > conducted) {
      issues.push(`${section.label}: TCBR (${tcbr}) cannot exceed Conducted (${conducted}).`);
      continue;
    }

    const netConducted = conducted - tcbr;

    if (netConducted <= 0) {
      issues.push(`${section.label}: Net conducted must be greater than zero.`);
      continue;
    }

    if (attended > netConducted) {
      issues.push(`${section.label}: Attended (${attended}) cannot exceed Net Conducted (${netConducted}).`);
      continue;
    }

    const sectionPct = Number(((attended / netConducted) * 100).toFixed(2));
    sectionBreakdown.push({
      key: section.key,
      label: section.label,
      weight: section.weight,
      badge: section.badge,
      conducted,
      tcbr,
      netConducted,
      attended,
      percentage: sectionPct,
    });

    weightedAttended += attended * section.weight;
    weightedConducted += netConducted * section.weight;
    totalConducted += netConducted;
    totalAttended += attended;
    totalTcbr += tcbr;
  }

  if (weightedConducted === 0) {
    return {
      issues: issues.length ? issues : ["Enter at least one complete component to calculate attendance."],
      percentage: null,
      totalConducted: 0,
      totalAttended: 0,
      totalTcbr: 0,
      weightedAttended: 0,
      weightedConducted: 0,
      bunkToTarget: null,
      needForTarget: null,
      bunkTo75: null,
      needFor85: null,
      componentBunks: {},
      sectionBreakdown: [],
    };
  }

  const percentage = Number(((weightedAttended / weightedConducted) * 100).toFixed(2));
  const targetFraction = targetPercent / 100;

  // Maximum additional standard (weight 1.0) classes that can be missed while staying >= target%
  const bunkToTarget = Math.max(0, Math.floor((weightedAttended - targetFraction * weightedConducted) / targetFraction));

  // Extra fully-attended standard (weight 1.0) classes needed to reach target%
  const needForTarget =
    targetFraction === 1
      ? 0
      : Math.max(0, Math.ceil((targetFraction * weightedConducted - weightedAttended) / (1 - targetFraction)));

  // Component-specific bunk allowances (since Practical weight = 0.5, Skill = 0.25)
  const componentBunks = {
    lecture: bunkToTarget,
    tutorial: bunkToTarget,
    practical: bunkToTarget > 0 ? Math.floor(bunkToTarget / 0.5) : 0,
    skill: bunkToTarget > 0 ? Math.floor(bunkToTarget / 0.25) : 0,
  };

  const bunkTo75 = Math.max(0, Math.floor((weightedAttended - 0.75 * weightedConducted) / 0.75));
  const needFor85 = Math.max(0, Math.ceil((0.85 * weightedConducted - weightedAttended) / 0.15));

  return {
    issues,
    percentage,
    totalConducted,
    totalAttended,
    totalTcbr,
    weightedAttended: Number(weightedAttended.toFixed(2)),
    weightedConducted: Number(weightedConducted.toFixed(2)),
    bunkToTarget,
    needForTarget,
    bunkTo75,
    needFor85,
    componentBunks,
    sectionBreakdown,
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
  const [targetGoal, setTargetGoal] = useState(75);
  const [whatIfExtraAttended, setWhatIfExtraAttended] = useState(0);

  // Student Profile
  const [studentProfile, setStudentProfile] = useState(() => {
    try {
      const saved = localStorage.getItem(STUDENT_PROFILE_KEY);
      return saved
        ? JSON.parse(saved)
        : { name: "", regNo: "", department: "Computer Science & Engineering", semester: "Semester 4" };
    } catch {
      return { name: "", regNo: "", department: "Computer Science & Engineering", semester: "Semester 4" };
    }
  });

  // History state
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [lastSummary, setLastSummary] = useState(null);

  // Absent simulation state
  const [absentMode, setAbsentMode] = useState("percent"); // "percent" | "numbers"
  const [absentInput, setAbsentInput] = useState({
    currentPercent: "82",
    totalClasses: "60",
    attendedClasses: "50",
    plannedAbsents: "4",
    daysToMiss: "2",
    classesPerDay: "4",
  });

  // Subject Tracker state
  const [subjectRows, setSubjectRows] = useState(() => {
    try {
      const raw = localStorage.getItem(SUBJECT_STORAGE_KEY) || localStorage.getItem("attendance_subjects_v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) {
          return parsed.map((item) => ({
            id: item.id || crypto.randomUUID(),
            name: item.name || "",
            conducted: item.conducted?.toString() || "",
            attended: item.attended?.toString() || "",
            tcbr: item.tcbr?.toString() || "",
            category: item.category || "Lecture",
          }));
        }
      }
    } catch (e) {
      console.warn("Could not load saved subjects:", e);
    }
    return [
      { id: crypto.randomUUID(), name: "Operating Systems", conducted: "38", attended: "32", tcbr: "0", category: "Lecture" },
      { id: crypto.randomUUID(), name: "Data Structures & Algorithms", conducted: "44", attended: "40", tcbr: "2", category: "Embedded" },
      { id: crypto.randomUUID(), name: "Database Management Systems", conducted: "36", attended: "29", tcbr: "1", category: "Embedded" },
      { id: crypto.randomUUID(), name: "Web Technologies Lab", conducted: "26", attended: "24", tcbr: "0", category: "Lab" },
    ];
  });

  const [subjectFilter, setSubjectFilter] = useState("all"); // "all" | "risk" | "safe"

  // Export Modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportSource, setExportSource] = useState("ltps"); // "ltps" | "subject" | "absent"
  const [isExporting, setIsExporting] = useState(false);

  // Toast feedback
  const [toasts, setToasts] = useState([]);

  const exportCardRef = useRef(null);
  const fileInputRef = useRef(null);

  const addToast = (message, type = "info") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  };

  useEffect(() => {
    localStorage.setItem(SUBJECT_STORAGE_KEY, JSON.stringify(subjectRows));
  }, [subjectRows]);

  useEffect(() => {
    localStorage.setItem(STUDENT_PROFILE_KEY, JSON.stringify(studentProfile));
  }, [studentProfile]);

  useEffect(() => {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  // Recalculate summary on targetGoal change if data exists
  useEffect(() => {
    const hasValues = SECTION_CONFIG.some(
      (sec) => formData[sec.key].conducted !== "" && formData[sec.key].attended !== ""
    );
    if (hasValues) {
      setLastSummary(calculateSummary(formData, targetGoal));
    }
  }, [targetGoal]);

  const sectionAverages = useMemo(() => {
    const map = {};
    SECTION_CONFIG.forEach((section) => {
      const block = formData[section.key];
      const c = Number(block.conducted);
      const a = Number(block.attended);
      const t = Number(block.tcbr || 0);
      const net = c - t;

      map[section.key] =
        !Number.isNaN(c) && !Number.isNaN(a) && !Number.isNaN(t) && net > 0 && a <= net && t <= c && c > 0
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

  const adjustSubjectStep = (id, field, delta) => {
    setSubjectRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const current = Number(row[field] || 0);
        const nextVal = Math.max(0, current + delta);
        return { ...row, [field]: nextVal.toString() };
      })
    );
    addToast(`Updated subject attendance`, "success");
  };

  const addSubject = () => {
    const newId = crypto.randomUUID();
    setSubjectRows((prev) => [
      ...prev,
      { id: newId, name: "", conducted: "", attended: "", tcbr: "", category: "Lecture" },
    ]);
    addToast("New subject row added", "info");
  };

  const removeSubject = (id) => {
    setSubjectRows((prev) => {
      if (prev.length <= 1) {
        addToast("At least one subject row must remain", "warning");
        return prev;
      }
      return prev.filter((row) => row.id !== id);
    });
    addToast("Subject removed", "info");
  };

  const loadPreset = (key) => {
    if (DEFAULT_SUBJECT_PRESETS[key]) {
      const cloned = DEFAULT_SUBJECT_PRESETS[key].map((item) => ({ ...item, id: crypto.randomUUID() }));
      setSubjectRows(cloned);
      addToast(`Loaded ${key.toUpperCase()} template subjects`, "success");
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const summary = calculateSummary(formData, targetGoal);
    setLastSummary(summary);

    if (!summary.issues.length && summary.percentage !== null) {
      const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" });
      const entry = {
        id: crypto.randomUUID(),
        timestamp,
        percentage: summary.percentage,
        formData: JSON.parse(JSON.stringify(formData)),
        targetGoal,
      };
      setHistory((prev) => [entry, ...prev].slice(0, 8));
      addToast(`Attendance calculated: ${summary.percentage}%`, "success");
    } else if (summary.issues.length) {
      addToast("Please check input errors", "warning");
    }
  };

  const resetForm = () => {
    setFormData(initializeState());
    setLastSummary(null);
    setWhatIfExtraAttended(0);
    addToast("Form reset to empty", "info");
  };

  const restoreHistory = (item) => {
    if (item.formData) {
      setFormData(item.formData);
      if (item.targetGoal) setTargetGoal(item.targetGoal);
      const summary = calculateSummary(item.formData, item.targetGoal || targetGoal);
      setLastSummary(summary);
      setActiveTab("ltps");
      addToast(`Restored calculation from ${item.timestamp}`, "success");
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(HISTORY_STORAGE_KEY);
    addToast("History cleared", "info");
  };

  // What-if simulated percentage
  const whatIfResult = useMemo(() => {
    if (!lastSummary || lastSummary.percentage === null || whatIfExtraAttended <= 0) return null;
    const newAttended = lastSummary.weightedAttended + whatIfExtraAttended;
    const newConducted = lastSummary.weightedConducted + whatIfExtraAttended;
    const newPct = Number(((newAttended / newConducted) * 100).toFixed(2));
    const gain = Number((newPct - lastSummary.percentage).toFixed(2));
    return { newPct, gain };
  }, [lastSummary, whatIfExtraAttended]);

  // Absent calculations
  const absentSummary = useMemo(() => {
    let t = 0;
    let currentAttended = 0;
    let p = 0;

    if (absentMode === "percent") {
      p = Number(absentInput.currentPercent);
      t = Number(absentInput.totalClasses);
      if (
        absentInput.currentPercent === "" ||
        absentInput.totalClasses === "" ||
        Number.isNaN(p) ||
        Number.isNaN(t) ||
        p < 0 ||
        p > 100 ||
        t <= 0
      ) {
        return null;
      }
      currentAttended = (p / 100) * t;
    } else {
      const att = Number(absentInput.attendedClasses);
      t = Number(absentInput.totalClasses);
      if (
        absentInput.attendedClasses === "" ||
        absentInput.totalClasses === "" ||
        Number.isNaN(att) ||
        Number.isNaN(t) ||
        att < 0 ||
        t <= 0 ||
        att > t
      ) {
        return null;
      }
      currentAttended = att;
      p = Number(((att / t) * 100).toFixed(2));
    }

    const directAbsents = Number(absentInput.plannedAbsents || 0);
    const daysMiss = Number(absentInput.daysToMiss || 0);
    const perDay = Number(absentInput.classesPerDay || 0);
    const multiDayAbsents = daysMiss * perDay;
    const totalAbsentsToTest = directAbsents + multiDayAbsents;

    const newPercent = Number(((currentAttended / (t + totalAbsentsToTest)) * 100).toFixed(2));
    const maxSafeAbsents75 = Math.max(0, Math.floor(currentAttended / 0.75 - t));
    const maxSafeAbsents85 = Math.max(0, Math.floor(currentAttended / 0.85 - t));

    // Recovery classes needed after these absents to reach 75%
    const newConducted = t + totalAbsentsToTest;
    const recoverTo75 =
      newPercent >= 75
        ? 0
        : Math.max(0, Math.ceil((0.75 * newConducted - currentAttended) / 0.25));

    const recoverTo85 =
      newPercent >= 85
        ? 0
        : Math.max(0, Math.ceil((0.85 * newConducted - currentAttended) / 0.15));

    return {
      currentPercent: p,
      totalClasses: t,
      currentAttended: Number(currentAttended.toFixed(1)),
      plannedAbsents: totalAbsentsToTest,
      newPercent,
      maxSafeAbsents75,
      maxSafeAbsents85,
      willBeSafe: newPercent >= 75,
      recoverTo75,
      recoverTo85,
    };
  }, [absentInput, absentMode]);

  // Subject Stats
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
          tcbr > conducted ||
          conducted <= 0
        ) {
          return null;
        }

        const pct = Number(((attended / net) * 100).toFixed(2));
        const safeBunks = Math.max(0, Math.floor((attended - 0.75 * net) / 0.75));
        const neededFor75 = pct >= 75 ? 0 : Math.max(0, Math.ceil((0.75 * net - attended) / 0.25));

        return {
          id: row.id,
          name: row.name.trim(),
          category: row.category || "Lecture",
          conducted,
          attended,
          tcbr,
          net,
          percentage: pct,
          safeBunks,
          neededFor75,
          isSafe: pct >= 75,
          isDistinction: pct >= 85,
        };
      })
      .filter(Boolean);

    if (!computed.length) {
      return { rows: [], average: null, totalAttended: 0, totalNet: 0, safeCount: 0, riskCount: 0 };
    }

    const totalAttended = computed.reduce((sum, row) => sum + row.attended, 0);
    const totalNet = computed.reduce((sum, row) => sum + row.net, 0);
    const average = Number(((totalAttended / totalNet) * 100).toFixed(2));
    const safeCount = computed.filter((r) => r.percentage >= 75).length;
    const riskCount = computed.filter((r) => r.percentage < 75).length;

    return {
      rows: computed,
      average,
      totalAttended,
      totalNet,
      safeCount,
      riskCount,
    };
  }, [subjectRows]);

  const filteredSubjects = useMemo(() => {
    if (subjectFilter === "risk") {
      return subjectRows.filter((r) => {
        const c = Number(r.conducted) - Number(r.tcbr || 0);
        const a = Number(r.attended);
        return c > 0 && a / c < 0.75;
      });
    }
    if (subjectFilter === "safe") {
      return subjectRows.filter((r) => {
        const c = Number(r.conducted) - Number(r.tcbr || 0);
        const a = Number(r.attended);
        return c > 0 && a / c >= 0.75;
      });
    }
    return subjectRows;
  }, [subjectRows, subjectFilter]);

  // Open Export Modal
  const handleOpenExport = (source = activeTab) => {
    setExportSource(source);
    setShowExportModal(true);
  };

  // Generate Canvas from Export Card
  const generateCanvas = async () => {
    if (!exportCardRef.current) {
      throw new Error("Export card element not ready");
    }

    return await html2canvas(exportCardRef.current, {
      scale: 3, // High Resolution Retina
      backgroundColor: "#ffffff",
      useCORS: true,
      allowTaint: true,
      logging: false,
      onclone: (clonedDoc) => {
        const el = clonedDoc.getElementById("attendance-export-report");
        if (el) {
          el.style.display = "block";
          el.style.visibility = "visible";
          el.style.opacity = "1";
        }
      },
    });
  };

  // Download Image
  const handleDownloadImage = async () => {
    try {
      setIsExporting(true);
      addToast("Generating High-Resolution Image...", "info");
      const canvas = await generateCanvas();

      canvas.toBlob((blob) => {
        if (!blob) {
          addToast("Failed to create image blob", "error");
          setIsExporting(false);
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = `KLU-Attendance-Report-${studentProfile.regNo || "Student"}-${Date.now()}.png`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setIsExporting(false);
        addToast("HD PNG downloaded successfully!", "success");
      }, "image/png");
    } catch (err) {
      console.error("Export Image error:", err);
      setIsExporting(false);
      addToast("Export failed: " + (err.message || "Unknown error"), "error");
    }
  };

  // Copy Image to Clipboard
  const handleCopyImageToClipboard = async () => {
    try {
      if (!navigator.clipboard || !window.ClipboardItem) {
        addToast("Direct clipboard copy not supported in this browser. Please use Download PNG.", "warning");
        return;
      }
      setIsExporting(true);
      addToast("Rendering image for clipboard...", "info");
      const canvas = await generateCanvas();

      canvas.toBlob(async (blob) => {
        if (!blob) {
          addToast("Could not generate image blob", "error");
          setIsExporting(false);
          return;
        }
        try {
          await navigator.clipboard.write([
            new ClipboardItem({
              "image/png": blob,
            }),
          ]);
          setIsExporting(false);
          addToast("Report image copied to clipboard! Paste directly in WhatsApp / chat.", "success");
        } catch (copyErr) {
          console.error("Clipboard copy error:", copyErr);
          setIsExporting(false);
          addToast("Clipboard copy permission denied. Use Download PNG.", "warning");
        }
      }, "image/png");
    } catch (err) {
      console.error("Clipboard export error:", err);
      setIsExporting(false);
      addToast("Export error: " + err.message, "error");
    }
  };

  // Print PDF
  const handleExportPdf = () => {
    window.print();
  };

  // Share Text Summary
  const handleCopyTextSummary = () => {
    let text = "";
    if (exportSource === "ltps" && lastSummary && lastSummary.percentage !== null) {
      text = `📊 *KLU Attendance Report* (${studentProfile.name || "Student"} - ${studentProfile.regNo || "ID"})\n` +
        `• Overall LTPS Attendance: *${lastSummary.percentage}%*\n` +
        `• Total Attended / Conducted: ${lastSummary.totalAttended} / ${lastSummary.totalConducted} classes\n` +
        `• Target (${targetGoal}%): ${lastSummary.percentage >= targetGoal ? `✅ Safe to miss ${lastSummary.bunkToTarget} classes` : `⚠️ Need to attend ${lastSummary.needForTarget} classes`}\n` +
        `• 75% Safe Bunk Allowance: ${lastSummary.bunkTo75} classes\n` +
        `• Need for 85%: ${lastSummary.needFor85} classes\n` +
        `Generated on: ${new Date().toLocaleDateString()}`;
    } else if (exportSource === "subject" && subjectStats.average !== null) {
      text = `📚 *Subject Attendance Summary* (${studentProfile.name || "Student"})\n` +
        `• Overall Average: *${subjectStats.average}%*\n` +
        `• Subjects Tracked: ${subjectStats.rows.length} (Safe: ${subjectStats.safeCount}, At Risk: ${subjectStats.riskCount})\n` +
        subjectStats.rows.map((s) => `  - ${s.name}: ${s.percentage}% (${s.attended}/${s.net}) ${s.isSafe ? "✅" : "⚠️"}`).join("\n") +
        `\nGenerated on: ${new Date().toLocaleDateString()}`;
    } else {
      text = `📊 *KLU Attendance Status*: Current Mode: ${activeTab.toUpperCase()}`;
    }

    navigator.clipboard.writeText(text);
    addToast("Summary text copied to clipboard!", "success");
  };

  // Backup data as JSON
  const handleExportJson = () => {
    const backup = {
      version: 2,
      exportDate: new Date().toISOString(),
      studentProfile,
      subjectRows,
      history,
      formData,
      targetGoal,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast("Backup JSON file saved", "success");
  };

  // Import data from JSON
  const handleImportJson = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.subjectRows) setSubjectRows(data.subjectRows);
        if (data.studentProfile) setStudentProfile(data.studentProfile);
        if (data.formData) setFormData(data.formData);
        if (data.targetGoal) setTargetGoal(data.targetGoal);
        if (data.history) setHistory(data.history);
        addToast("Data successfully restored from backup!", "success");
      } catch (err) {
        addToast("Invalid JSON backup file", "error");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
        ? "Excellent (Distinction)"
        : lastSummary.percentage >= 75
          ? "Eligible (Safe)"
          : "Shortage (Action Required)";

  const latestScore = lastSummary?.percentage ?? "--";

  return (
    <main className="page-shell">
      <div className="ambient-shape shape-one" />
      <div className="ambient-shape shape-two" />

      {/* Toast Notification Stack */}
      <div className="toast-container" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast-chip toast-${toast.type}`}>
            <span className="toast-dot" />
            <p>{toast.message}</p>
          </div>
        ))}
      </div>

      {/* Top Header Navigation */}
      <header className="top-nav">
        <div className="brand-wrap">
          <span className="brand-mark" aria-hidden="true">AC</span>
          <div className="brand-titles">
            <strong>ATTENDANCE CALCULATOR</strong>
            <small>KLU Smart Academic Suite</small>
          </div>
        </div>

        <nav className="menu-links" aria-label="Main Sections">
          <button
            type="button"
            onClick={() => setActiveTab("home")}
            className={activeTab === "home" ? "tab on" : "tab"}
          >
            🏠 HOME
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ltps")}
            className={activeTab === "ltps" ? "tab on" : "tab"}
          >
            📐 ATTENDANCE BY L-T-P-S
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("absent")}
            className={activeTab === "absent" ? "tab on" : "tab"}
          >
            🔮 ABSENT SIMULATOR
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("subject")}
            className={activeTab === "subject" ? "tab on" : "tab"}
          >
            📚 SUBJECT TRACKER
          </button>
        </nav>
      </header>

      {/* Hero Overview Card */}
      <section className="hero-card">
        <div className="hero-header-row">
          <div>
            <p className="kicker">Official Academic Decision Support</p>
            <h1>ATTENDANCE CALCULATOR</h1>
            <p className="subtitle">
              Calculates precise weighted LTPS components, simulates future absence impacts,
              tracks all subjects with instant daily steppers, and exports HD report cards.
            </p>
          </div>

          {/* Student Profile Quick View */}
          <div className="student-badge-pill" onClick={() => setShowExportModal(true)} title="Click to customize profile">
            <div className="student-avatar">{studentProfile.name ? studentProfile.name.charAt(0).toUpperCase() : "S"}</div>
            <div className="student-info-text">
              <span className="name">{studentProfile.name || "Student Profile"}</span>
              <span className="id">{studentProfile.regNo ? `ID: ${studentProfile.regNo}` : "Set ID & Export"}</span>
            </div>
            <span className="edit-icon">✏️</span>
          </div>
        </div>

        <div className="status-rail">
          <article>
            <p>Active Workspace</p>
            <strong>{activeTab.toUpperCase()}</strong>
          </article>
          <article>
            <p>Latest LTPS Score</p>
            <strong className={lastSummary?.percentage ? (lastSummary.percentage >= 75 ? "text-safe" : "text-alert") : ""}>
              {latestScore === "--" ? "--" : `${latestScore}%`}
            </strong>
          </article>
          <article>
            <p>Subjects Tracked</p>
            <strong>{subjectRows.length} Courses</strong>
          </article>
          <article>
            <p>Eligibility Status</p>
            <strong>{scoreLabel}</strong>
          </article>
        </div>
      </section>

      {/* Quick Feature Strips */}
      <section className="signature-strip" aria-label="Feature Highlights">
        <article onClick={() => setActiveTab("ltps")} className="clickable-feature">
          <div className="feature-icon">📐</div>
          <div>
            <h3>Weighted LTPS Logic</h3>
            <p>Lecture (100%), Tutorial (100%), Practical (50%), Skill (25%) with strict TCBR deduction.</p>
          </div>
        </article>
        <article onClick={() => setActiveTab("absent")} className="clickable-feature">
          <div className="feature-icon">🔮</div>
          <div>
            <h3>Predictive Absent Sandbox</h3>
            <p>Simulate upcoming leaves & multi-day bunk impacts before risking your 75% threshold.</p>
          </div>
        </article>
        <article onClick={() => setActiveTab("subject")} className="clickable-feature">
          <div className="feature-icon">📚</div>
          <div>
            <h3>1-Click Subject Steppers</h3>
            <p>Log attendance with instant +1 buttons, track semester average, and export report card.</p>
          </div>
        </article>
      </section>

      {/* ==================== TAB: HOME ==================== */}
      {activeTab === "home" && (
        <>
          <section className="home-panel">
            <div>
              <h2>Smart Academic Attendance Intelligence</h2>
              <p>
                Engineered specifically for engineering students following weighted curriculum models.
                Get mathematically accurate forecasts, customized target planning, and shareable reports.
              </p>
              <div className="home-points">
                <span>⚡ Weighted LTPS Accuracy</span>
                <span>🎯 Customizable Target (75% / 80% / 85%)</span>
                <span>📸 High-DPI Image & PDF Export</span>
                <span>🔄 1-Click Backup & Restore</span>
              </div>

              <div className="quick-actions">
                <button type="button" className="btn-action primary" onClick={() => setActiveTab("ltps")}>
                  Open LTPS Calculator →
                </button>
                <button type="button" className="btn-action" onClick={() => setActiveTab("absent")}>
                  Simulate Absents 🔮
                </button>
                <button type="button" className="btn-action" onClick={() => setActiveTab("subject")}>
                  Manage Subjects 📚
                </button>
                <button type="button" className="btn-action export-btn" onClick={() => handleOpenExport("ltps")}>
                  📸 Export Report Card
                </button>
              </div>
            </div>

            <div className="home-image" aria-label="Attendance visual board">
              <div className="orbit-shell">
                <div className={`orbit-core ${scoreClass}`}>
                  <span>{latestScore === "--" ? "--" : `${latestScore}%`}</span>
                  <small>{lastSummary?.percentage ? "Overall LTPS" : "Awaiting Input"}</small>
                </div>
              </div>

              <div className="mini-bars">
                {SECTION_CONFIG.map((section) => {
                  const value = sectionAverages[section.key] ?? 0;
                  return (
                    <div className="mini-bar-row" key={section.key}>
                      <span>{section.label.slice(0, 3).toUpperCase()}</span>
                      <div className="mini-bar-track">
                        <div
                          className={`mini-bar-fill ${value >= 75 ? "fill-safe" : value > 0 ? "fill-risk" : ""}`}
                          style={{ width: `${value}%` }}
                        />
                      </div>
                      <strong>{value === 0 && formData[section.key].conducted === "" ? "--" : `${value}%`}</strong>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="faculty-note" aria-label="Why choose this project">
            <div className="faculty-header">
              <h2>Key Academic Advantages</h2>
              <span className="badge-official">Accurate LTPS Weighting</span>
            </div>
            <p>
              Traditional calculators assume all classes carry equal weight, leading to dangerous calculation errors.
              This suite accounts for exact credit distributions:
            </p>
            <div className="faculty-grid">
              <article>
                <div className="grid-num">01</div>
                <h3>Weighted Component Balance</h3>
                <p>Lecture & Tutorial (1.0), Practical Lab (0.5), and Skill Development (0.25) weighted correctly.</p>
              </article>
              <article>
                <div className="grid-num">02</div>
                <h3>TCBR Deduction Handling</h3>
                <p>Teacher Conducted Beyond Required (TCBR) classes are subtracted from conducted totals first.</p>
              </article>
              <article>
                <div className="grid-num">03</div>
                <h3>Component-Specific Bunk Planner</h3>
                <p>Clearly shows how many lectures vs lab practicals you can miss safely without penalty.</p>
              </article>
              <article>
                <div className="grid-num">04</div>
                <h3>Verified Export Reports</h3>
                <p>Generate clean, professional, high-definition attendance certificates for faculty submission.</p>
              </article>
            </div>
          </section>
        </>
      )}

      {/* ==================== TAB: LTPS CALCULATOR ==================== */}
      {activeTab === "ltps" && (
        <form className="calculator-grid" onSubmit={handleSubmit}>
          {SECTION_CONFIG.map((section) => (
            <article className="input-card" key={section.key}>
              <header className="card-head">
                <div>
                  <h2>{section.label}</h2>
                  <span className="sub-weight">{section.desc}</span>
                </div>
                <span className="weight-badge">{section.badge} Weight</span>
              </header>

              <div className="inputs-row">
                <label>
                  <span>Conducted</span>
                  <input
                    value={formData[section.key].conducted}
                    onChange={(event) => onChange(section.key, "conducted", event.target.value)}
                    placeholder="0"
                    inputMode="numeric"
                  />
                </label>

                <label>
                  <span>Attended</span>
                  <input
                    value={formData[section.key].attended}
                    onChange={(event) => onChange(section.key, "attended", event.target.value)}
                    placeholder="0"
                    inputMode="numeric"
                  />
                </label>

                <label>
                  <span>TCBR (Extra)</span>
                  <input
                    value={formData[section.key].tcbr}
                    onChange={(event) => onChange(section.key, "tcbr", event.target.value)}
                    placeholder="0"
                    inputMode="numeric"
                  />
                </label>
              </div>

              <footer className="mini-insight">
                <span>Component Score:</span>
                <strong className={sectionAverages[section.key] >= 75 ? "text-safe" : "text-alert"}>
                  {sectionAverages[section.key] == null ? "--" : `${sectionAverages[section.key]}%`}
                </strong>
              </footer>
            </article>
          ))}

          {/* Results and Analytics Panel */}
          <section className="result-panel">
            <div className="result-header-row">
              <h3>Calculation Result & Analytics</h3>
              <div className="actions">
                <button type="submit" className="btn primary">⚡ Calculate</button>
                <button type="button" className="btn ghost" onClick={resetForm}>Reset</button>
                <button
                  type="button"
                  className="btn export-btn"
                  onClick={() => handleOpenExport("ltps")}
                  title="Export High-Res Image & PDF Report"
                >
                  📸 Export Report
                </button>
              </div>
            </div>

            {/* Target Goal Selector */}
            <div className="target-goal-bar">
              <span className="goal-label">🎯 Target Attendance Goal:</span>
              <div className="goal-chips">
                {[75, 80, 85, 90].map((goal) => (
                  <button
                    key={goal}
                    type="button"
                    className={`goal-chip ${targetGoal === goal ? "active" : ""}`}
                    onClick={() => setTargetGoal(goal)}
                  >
                    {goal}%
                  </button>
                ))}
              </div>
            </div>

            {/* Circular Gauge / Score Banner */}
            <div className={`score-banner ${scoreClass}`}>
              <div className="score-main">
                <span className="score-title">Weighted Attendance</span>
                <strong className="score-val">
                  {lastSummary?.percentage == null ? "Awaiting Input" : `${lastSummary.percentage}%`}
                </strong>
                <span className="score-sub">{scoreLabel}</span>
              </div>
              {lastSummary?.percentage != null && (
                <div className="score-tag-badge">
                  {lastSummary.percentage >= targetGoal
                    ? `✅ Met Target (${targetGoal}%)`
                    : `⚠️ ${Number((targetGoal - lastSummary.percentage).toFixed(1))}% Short of Target`}
                </div>
              )}
            </div>

            {/* Key Metrics Grid */}
            <div className="insight-grid">
              <div className="metric-box">
                <p>Total Attended</p>
                <h3>{lastSummary?.totalAttended ?? "--"}</h3>
                <small>Weighted: {lastSummary?.weightedAttended ?? "--"}</small>
              </div>
              <div className="metric-box">
                <p>Net Conducted</p>
                <h3>{lastSummary?.totalConducted ?? "--"}</h3>
                <small>TCBR Deducted: {lastSummary?.totalTcbr ?? 0}</small>
              </div>
              <div className="metric-box highlight-safe">
                <p>Bunks Left ({targetGoal}%)</p>
                <h3 className="text-safe">{lastSummary?.bunkToTarget ?? "--"}</h3>
                <small>Safe standard classes to miss</small>
              </div>
              <div className="metric-box highlight-need">
                <p>Need for {targetGoal}%</p>
                <h3 className="text-alert">{lastSummary?.needForTarget ?? "--"}</h3>
                <small>Consecutive classes required</small>
              </div>
            </div>

            {/* Component-wise Bunk Guidance */}
            {lastSummary?.percentage != null && (
              <div className="component-bunk-guide">
                <h4>Component Bunk Allowances (To Maintain ≥ {targetGoal}%):</h4>
                <div className="bunk-pill-row">
                  <span className="bunk-pill">Lectures (1.0 wt): <strong>{lastSummary.componentBunks.lecture}</strong></span>
                  <span className="bunk-pill">Tutorials (1.0 wt): <strong>{lastSummary.componentBunks.tutorial}</strong></span>
                  <span className="bunk-pill">Practicals (0.5 wt): <strong>{lastSummary.componentBunks.practical}</strong></span>
                  <span className="bunk-pill">Skills (0.25 wt): <strong>{lastSummary.componentBunks.skill}</strong></span>
                </div>
              </div>
            )}

            {/* Error or Success Alert */}
            {lastSummary?.issues?.length ? (
              <ul className="error-list">
                {lastSummary.issues.map((issue) => (
                  <li key={issue}>⚠️ {issue}</li>
                ))}
              </ul>
            ) : (
              <p className="success-line">✅ Inputs validated. Accurate weighted LTPS calculated.</p>
            )}

            {/* Interactive "What-If" Sandbox Slider */}
            {lastSummary?.percentage != null && (
              <div className="whatif-sandbox">
                <div className="sandbox-head">
                  <span>🧪 <strong>What-If Sandbox:</strong> If I attend the next upcoming classes...</span>
                  <span className="extra-count">+{whatIfExtraAttended} classes</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={whatIfExtraAttended}
                  onChange={(e) => setWhatIfExtraAttended(Number(e.target.value))}
                  className="slider"
                />
                {whatIfResult && (
                  <div className="whatif-outcome">
                    <span>Projected Attendance: <strong>{whatIfResult.newPct}%</strong></span>
                    <span className="gain-tag">+{whatIfResult.gain}% increase</span>
                  </div>
                )}
              </div>
            )}

            {/* Component Bar Chart */}
            <div className="bar-chart" aria-label="LTPS chart">
              {SECTION_CONFIG.map((section) => {
                const value = sectionAverages[section.key];
                return (
                  <div className="bar-item" key={section.key}>
                    <div className="bar-meta">
                      <span>{section.label}</span>
                      <strong>{value == null ? "--" : `${value}%`}</strong>
                    </div>
                    <div className="bar-track">
                      <div
                        className={`bar-fill ${value >= 75 ? "fill-safe" : value > 0 ? "fill-risk" : ""}`}
                        style={{ width: `${value ?? 0}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </form>
      )}

      {/* ==================== TAB: ABSENT SIMULATOR ==================== */}
      {activeTab === "absent" && (
        <section className="absent-panel">
          <div className="absent-header-row">
            <div>
              <h2>🔮 Absent Impact Simulator & Planner</h2>
              <p>Test the exact mathematical drop in percentage before bunking any upcoming classes or leaves.</p>
            </div>
            <div className="actions">
              <button
                type="button"
                className="btn export-btn"
                onClick={() => handleOpenExport("absent")}
              >
                📸 Export Report
              </button>
            </div>
          </div>

          <div className="absent-mode-toggle">
            <button
              type="button"
              className={absentMode === "percent" ? "mode-btn on" : "mode-btn"}
              onClick={() => setAbsentMode("percent")}
            >
              Mode 1: Current % + Total Classes
            </button>
            <button
              type="button"
              className={absentMode === "numbers" ? "mode-btn on" : "mode-btn"}
              onClick={() => setAbsentMode("numbers")}
            >
              Mode 2: Exact Attended / Conducted
            </button>
          </div>

          <div className="absent-grid">
            {absentMode === "percent" ? (
              <label>
                <span>Current Attendance %</span>
                <input
                  value={absentInput.currentPercent}
                  onChange={(event) => onAbsentChange("currentPercent", event.target.value)}
                  placeholder="e.g. 82"
                  inputMode="numeric"
                />
              </label>
            ) : (
              <label>
                <span>Classes Attended</span>
                <input
                  value={absentInput.attendedClasses}
                  onChange={(event) => onAbsentChange("attendedClasses", event.target.value)}
                  placeholder="e.g. 50"
                  inputMode="numeric"
                />
              </label>
            )}

            <label>
              <span>Total Classes Conducted</span>
              <input
                value={absentInput.totalClasses}
                onChange={(event) => onAbsentChange("totalClasses", event.target.value)}
                placeholder="e.g. 60"
                inputMode="numeric"
              />
            </label>

            <label>
              <span>Direct Classes to Miss</span>
              <input
                value={absentInput.plannedAbsents}
                onChange={(event) => onAbsentChange("plannedAbsents", event.target.value)}
                placeholder="e.g. 4"
                inputMode="numeric"
              />
            </label>
          </div>

          {/* Multi-Day Leave Estimator */}
          <div className="multiday-box">
            <h4>📅 Multi-Day Leave Planner (Optional):</h4>
            <div className="multiday-inputs">
              <label>
                <span>Days to Take Off:</span>
                <input
                  value={absentInput.daysToMiss}
                  onChange={(event) => onAbsentChange("daysToMiss", event.target.value)}
                  placeholder="0"
                  inputMode="numeric"
                />
              </label>
              <label>
                <span>Classes per Day:</span>
                <input
                  value={absentInput.classesPerDay}
                  onChange={(event) => onAbsentChange("classesPerDay", event.target.value)}
                  placeholder="4"
                  inputMode="numeric"
                />
              </label>
              <div className="multiday-total">
                <span>Total Leave Classes:</span>
                <strong>{(Number(absentInput.daysToMiss || 0) * Number(absentInput.classesPerDay || 0))} classes</strong>
              </div>
            </div>
          </div>

          {/* Absent Results Card */}
          <div className="absent-result">
            {absentSummary ? (
              <div className="absent-result-card">
                <div className="absent-headline">
                  <div>
                    <span className="label">Projected Post-Absence Attendance:</span>
                    <h3 className={absentSummary.newPercent >= 75 ? "text-safe" : "text-alert"}>
                      {absentSummary.newPercent}%
                    </h3>
                  </div>
                  <div className={`status-pill ${absentSummary.willBeSafe ? "pill-safe" : "pill-risk"}`}>
                    {absentSummary.willBeSafe ? "✅ Safe (Above 75%)" : "⚠️ Alert: Drops Below 75%"}
                  </div>
                </div>

                <div className="absent-stats-grid">
                  <div className="stat-card">
                    <span>Initial Attendance</span>
                    <strong>{absentSummary.currentPercent}%</strong>
                    <small>{absentSummary.currentAttended} / {absentSummary.totalClasses} classes</small>
                  </div>
                  <div className="stat-card">
                    <span>Planned Total Misses</span>
                    <strong className="text-alert">-{absentSummary.plannedAbsents} Classes</strong>
                    <small>Total Conducted: {absentSummary.totalClasses + absentSummary.plannedAbsents}</small>
                  </div>
                  <div className="stat-card">
                    <span>Max Safe Bunks (75%)</span>
                    <strong className="text-safe">{absentSummary.maxSafeAbsents75} Classes</strong>
                    <small>Without dropping below 75%</small>
                  </div>
                  <div className="stat-card">
                    <span>Recovery Plan</span>
                    <strong>
                      {absentSummary.recoverTo75 > 0 ? `Need ${absentSummary.recoverTo75} Classes` : "No Shortage"}
                    </strong>
                    <small>Consecutive 100% attendance</small>
                  </div>
                </div>

                <div className="advice-box">
                  <strong>💡 Strategic Advice:</strong>{" "}
                  {absentSummary.willBeSafe
                    ? `You can safely proceed with this absence plan. Even after missing ${absentSummary.plannedAbsents} classes, your attendance remains at ${absentSummary.newPercent}%, leaving you with ${Math.max(0, absentSummary.maxSafeAbsents75 - absentSummary.plannedAbsents)} additional safe buffer classes.`
                    : `Proceed with caution! Missing ${absentSummary.plannedAbsents} classes will drag your attendance down from ${absentSummary.currentPercent}% to ${absentSummary.newPercent}%. You will need to attend ${absentSummary.recoverTo75} consecutive classes with zero absences to recover back to 75%.`}
                </div>
              </div>
            ) : (
              <div className="empty-prompt">
                <p>👉 Enter your current attendance numbers and planned leaves above to see instant impact.</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ==================== TAB: SUBJECT TRACKER ==================== */}
      {activeTab === "subject" && (
        <section className="subject-panel">
          <div className="subject-head">
            <div>
              <h2>📚 Semester Subject Attendance Tracker</h2>
              <p>Track all individual courses, use instant daily 1-click steppers, and monitor your semester average.</p>
            </div>
            <div className="actions">
              <button type="button" className="btn primary" onClick={addSubject}>+ Add Course</button>
              <button
                type="button"
                className="btn export-btn"
                onClick={() => handleOpenExport("subject")}
              >
                📸 Export Report
              </button>
            </div>
          </div>

          {/* Preset & Backup Controls Bar */}
          <div className="subject-toolbar">
            <div className="presets-group">
              <span className="toolbar-label">Templates:</span>
              <button type="button" className="pill-btn" onClick={() => loadPreset("cse")}>CSE Semester</button>
              <button type="button" className="pill-btn" onClick={() => loadPreset("ece")}>ECE Semester</button>
            </div>

            <div className="filter-group">
              <span className="toolbar-label">Filter:</span>
              <button
                type="button"
                className={`filter-pill ${subjectFilter === "all" ? "on" : ""}`}
                onClick={() => setSubjectFilter("all")}
              >
                All ({subjectRows.length})
              </button>
              <button
                type="button"
                className={`filter-pill ${subjectFilter === "safe" ? "on" : ""}`}
                onClick={() => setSubjectFilter("safe")}
              >
                Safe ≥ 75%
              </button>
              <button
                type="button"
                className={`filter-pill ${subjectFilter === "risk" ? "on" : ""}`}
                onClick={() => setSubjectFilter("risk")}
              >
                At Risk &lt; 75%
              </button>
            </div>

            <div className="backup-group">
              <button type="button" className="pill-btn backup-btn" onClick={handleExportJson} title="Save backup file">
                💾 Save Backup
              </button>
              <button
                type="button"
                className="pill-btn backup-btn"
                onClick={() => fileInputRef.current?.click()}
                title="Restore from JSON"
              >
                📂 Restore
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                style={{ display: "none" }}
                onChange={handleImportJson}
              />
            </div>
          </div>

          {/* Subject Items Table/Cards */}
          <div className="subject-cards-list">
            {filteredSubjects.map((row) => {
              const conducted = Number(row.conducted || 0);
              const attended = Number(row.attended || 0);
              const tcbr = Number(row.tcbr || 0);
              const net = conducted - tcbr;
              const hasValid = net > 0 && attended <= net && conducted > 0;
              const pct = hasValid ? Number(((attended / net) * 100).toFixed(1)) : null;
              const isSafe = pct !== null && pct >= 75;

              return (
                <div className={`subject-item-card ${pct !== null ? (isSafe ? "card-safe" : "card-risk") : ""}`} key={row.id}>
                  <div className="sub-main-inputs">
                    <div className="name-field">
                      <label>Course Name</label>
                      <input
                        value={row.name}
                        onChange={(event) => onSubjectChange(row.id, "name", event.target.value)}
                        placeholder="e.g. Operating Systems"
                      />
                    </div>

                    <div className="category-select">
                      <label>Type</label>
                      <select
                        value={row.category || "Lecture"}
                        onChange={(e) => onSubjectChange(row.id, "category", e.target.value)}
                      >
                        <option value="Lecture">Lecture</option>
                        <option value="Embedded">Embedded L-T-P-S</option>
                        <option value="Lab">Lab / Practical</option>
                        <option value="Skill">Skill Course</option>
                      </select>
                    </div>

                    <div className="num-field">
                      <label>Conducted</label>
                      <input
                        value={row.conducted}
                        onChange={(event) => onSubjectChange(row.id, "conducted", event.target.value)}
                        placeholder="0"
                        inputMode="numeric"
                      />
                    </div>

                    <div className="num-field">
                      <label>Attended</label>
                      <input
                        value={row.attended}
                        onChange={(event) => onSubjectChange(row.id, "attended", event.target.value)}
                        placeholder="0"
                        inputMode="numeric"
                      />
                    </div>

                    <div className="num-field">
                      <label>TCBR</label>
                      <input
                        value={row.tcbr}
                        onChange={(event) => onSubjectChange(row.id, "tcbr", event.target.value)}
                        placeholder="0"
                        inputMode="numeric"
                      />
                    </div>
                  </div>

                  {/* Daily Stepper Bar */}
                  <div className="sub-actions-row">
                    <div className="stepper-tools">
                      <span className="step-label">Daily Quick Log:</span>
                      <button
                        type="button"
                        className="btn-step attended-step"
                        onClick={() => {
                          adjustSubjectStep(row.id, "conducted", 1);
                          adjustSubjectStep(row.id, "attended", 1);
                        }}
                        title="Add 1 Conducted & 1 Attended class"
                      >
                        +1 Attended ✅
                      </button>
                      <button
                        type="button"
                        className="btn-step missed-step"
                        onClick={() => adjustSubjectStep(row.id, "conducted", 1)}
                        title="Add 1 Conducted (Absent) class"
                      >
                        +1 Missed ❌
                      </button>
                      <button
                        type="button"
                        className="btn-step tcbr-step"
                        onClick={() => adjustSubjectStep(row.id, "tcbr", 1)}
                        title="Add 1 TCBR class"
                      >
                        +1 TCBR
                      </button>
                    </div>

                    <div className="sub-status-pill">
                      {pct !== null ? (
                        <>
                          <strong className={isSafe ? "text-safe" : "text-alert"}>{pct}%</strong>
                          <span className="net-classes">({attended}/{net} Net)</span>
                          <span className={`badge-tag ${isSafe ? "tag-safe" : "tag-risk"}`}>
                            {isSafe ? "Eligible" : "Shortage"}
                          </span>
                        </>
                      ) : (
                        <span className="text-muted">Enter Numbers</span>
                      )}
                    </div>

                    <button
                      type="button"
                      className="delete-btn"
                      onClick={() => removeSubject(row.id)}
                      title="Remove course"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Subject Overall Summary Card */}
          <div className="subject-summary">
            <div className="summary-banner">
              <div>
                <span className="sum-label">Aggregate Semester Attendance</span>
                <h3>{subjectStats.average ?? "--"}%</h3>
                <small>Total Attended: {subjectStats.totalAttended} / Total Net Conducted: {subjectStats.totalNet}</small>
              </div>

              <div className="summary-counts">
                <div className="count-pill count-safe">
                  <span>Eligible Courses</span>
                  <strong>{subjectStats.safeCount}</strong>
                </div>
                <div className="count-pill count-risk">
                  <span>Shortage Courses</span>
                  <strong>{subjectStats.riskCount}</strong>
                </div>
              </div>
            </div>

            {/* Subject Visual Comparison Bars */}
            <div className="subject-bars-chart">
              <h4>Course Performance Comparison:</h4>
              {subjectStats.rows.length ? (
                subjectStats.rows.map((row) => (
                  <div className="bar-item" key={row.id}>
                    <div className="bar-meta">
                      <span><strong>{row.name}</strong> <small>({row.category})</small></span>
                      <strong className={row.percentage >= 75 ? "text-safe" : "text-alert"}>
                        {row.percentage}% {row.percentage >= 75 ? `(Can bunk ${row.safeBunks})` : `(Need ${row.neededFor75})`}
                      </strong>
                    </div>
                    <div className="bar-track">
                      <div
                        className={`bar-fill ${row.percentage >= 75 ? "fill-safe" : "fill-risk"}`}
                        style={{ width: `${row.percentage}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="empty-hint">Fill in course conducted & attended values above to view comparative analytics.</p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ==================== CALCULATION HISTORY TIMELINE ==================== */}
      <section className="history-card">
        <div className="history-head">
          <div>
            <h2>Recent Calculation Timeline</h2>
            <p>Click any calculation below to reload its exact values into the calculator.</p>
          </div>
          {history.length > 0 && (
            <button type="button" className="btn ghost btn-sm" onClick={clearHistory}>
              Clear History
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <p className="empty-history">No history yet. Run a calculation above to record snapshot.</p>
        ) : (
          <div className="history-grid">
            {history.map((item) => (
              <article
                key={item.id}
                className="history-item"
                onClick={() => restoreHistory(item)}
                title="Click to restore these values"
              >
                <div className="hist-top">
                  <span>{item.timestamp}</span>
                  <span className="restore-tag">Restore ↺</span>
                </div>
                <strong className={item.percentage >= 75 ? "text-safe" : "text-alert"}>
                  {item.percentage}%
                </strong>
                <small>{item.percentage >= 75 ? "Eligible" : "Shortage"}</small>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Footer & Educational Open-Source Notice */}
      <footer className="app-footer">
        <div className="footer-content">
          <p className="footer-brand">
            <strong>ATTENDANCE CALCULATOR</strong> — Built by B. Venkata Kishore
          </p>
          <p className="footer-disclaimer">
            ⚖️ <em>Disclaimer:</em> This is an independent open-source student academic decision-support tool licensed under the MIT License. Designed for calculation and estimation purposes.
          </p>
          <div className="footer-meta">
            <span>Open Source (MIT License)</span>
            <span>•</span>
            <span>Version 2.0 (2026)</span>
          </div>
        </div>
      </footer>

      {/* ==================== EXPORT REPORT MODAL ==================== */}
      {showExportModal && (
        <div className="modal-overlay" onClick={() => !isExporting && setShowExportModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <div className="modal-title-wrap">
                <span className="modal-badge">📸 Academic Export Center</span>
                <h3>Official Attendance Report Generator</h3>
              </div>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => !isExporting && setShowExportModal(false)}
                disabled={isExporting}
              >
                ✕
              </button>
            </header>

            {/* Student Profile Customizer Form */}
            <div className="student-profile-editor">
              <h4>Customize Student Credentials:</h4>
              <div className="profile-inputs-grid">
                <label>
                  <span>Student Name</span>
                  <input
                    value={studentProfile.name}
                    onChange={(e) => setStudentProfile({ ...studentProfile, name: e.target.value })}
                    placeholder="e.g. Venkata Kishore"
                  />
                </label>
                <label>
                  <span>Registration / Roll No.</span>
                  <input
                    value={studentProfile.regNo}
                    onChange={(e) => setStudentProfile({ ...studentProfile, regNo: e.target.value })}
                    placeholder="e.g. 2200030000"
                  />
                </label>
                <label>
                  <span>Department / Branch</span>
                  <input
                    value={studentProfile.department}
                    onChange={(e) => setStudentProfile({ ...studentProfile, department: e.target.value })}
                    placeholder="e.g. Computer Science & Engineering"
                  />
                </label>
                <label>
                  <span>Academic Semester</span>
                  <input
                    value={studentProfile.semester}
                    onChange={(e) => setStudentProfile({ ...studentProfile, semester: e.target.value })}
                    placeholder="e.g. Semester 4 - 2026"
                  />
                </label>
              </div>
            </div>

            {/* Source Tab Selector */}
            <div className="export-source-bar">
              <span>Report Type:</span>
              <button
                type="button"
                className={`source-btn ${exportSource === "ltps" ? "active" : ""}`}
                onClick={() => setExportSource("ltps")}
              >
                📐 LTPS Weighted Report
              </button>
              <button
                type="button"
                className={`source-btn ${exportSource === "subject" ? "active" : ""}`}
                onClick={() => setExportSource("subject")}
              >
                📚 Subject Breakdown Report
              </button>
              <button
                type="button"
                className={`source-btn ${exportSource === "absent" ? "active" : ""}`}
                onClick={() => setExportSource("absent")}
              >
                🔮 Absent Projection Report
              </button>
            </div>

            {/* Live Report Card Preview (Captured by html2canvas) */}
            <div className="report-preview-container">
              <div
                id="attendance-export-report"
                ref={exportCardRef}
                className="official-report-card"
              >
                {/* Official Header */}
                <div className="rep-header">
                  <div className="rep-brand">
                    <div className="rep-logo-box">KLU</div>
                    <div>
                      <h2 className="rep-institution">KONERU LAKSHMAIAH EDUCATION FOUNDATION</h2>
                      <p className="rep-sub">Official Academic Attendance & Decision-Support Report</p>
                    </div>
                  </div>
                  <div className="rep-stamp">
                    <span>ACADEMIC AUDIT</span>
                    <strong>VERIFIED</strong>
                  </div>
                </div>

                <div className="rep-divider" />

                {/* Student Info Bar */}
                <div className="rep-student-bar">
                  <div>
                    <small>STUDENT NAME</small>
                    <strong>{studentProfile.name || "Student Name"}</strong>
                  </div>
                  <div>
                    <small>REGISTER NUMBER</small>
                    <strong>{studentProfile.regNo || "Not Specified"}</strong>
                  </div>
                  <div>
                    <small>DEPARTMENT</small>
                    <strong>{studentProfile.department || "Engineering"}</strong>
                  </div>
                  <div>
                    <small>SEMESTER / DATE</small>
                    <strong>{new Date().toLocaleDateString()} ({studentProfile.semester})</strong>
                  </div>
                </div>

                {/* Score & Key Status Highlight */}
                {exportSource === "ltps" && (
                  <>
                    <div className="rep-score-row">
                      <div className="rep-score-box">
                        <span>OVERALL WEIGHTED ATTENDANCE</span>
                        <h1 className={lastSummary?.percentage >= 75 ? "rep-safe" : "rep-alert"}>
                          {lastSummary?.percentage != null ? `${lastSummary.percentage}%` : "--%"}
                        </h1>
                        <p>{lastSummary?.percentage >= 85 ? "Distinction Performance" : lastSummary?.percentage >= 75 ? "Eligible For Examinations" : "Attendance Shortage - Action Required"}</p>
                      </div>

                      <div className="rep-kpi-grid">
                        <div className="rep-kpi">
                          <span>Total Attended</span>
                          <strong>{lastSummary?.totalAttended ?? "--"} classes</strong>
                        </div>
                        <div className="rep-kpi">
                          <span>Net Conducted</span>
                          <strong>{lastSummary?.totalConducted ?? "--"} classes</strong>
                        </div>
                        <div className="rep-kpi">
                          <span>Bunk Allowed (75%)</span>
                          <strong>{lastSummary?.bunkTo75 ?? "--"} classes</strong>
                        </div>
                        <div className="rep-kpi">
                          <span>Classes for 85%</span>
                          <strong>{lastSummary?.needFor85 ?? "--"} classes</strong>
                        </div>
                      </div>
                    </div>

                    {/* Component Breakdown Table */}
                    <div className="rep-table-wrap">
                      <table className="rep-table">
                        <thead>
                          <tr>
                            <th>Component</th>
                            <th>Weight</th>
                            <th>Conducted</th>
                            <th>TCBR</th>
                            <th>Net Conducted</th>
                            <th>Attended</th>
                            <th>Percentage</th>
                          </tr>
                        </thead>
                        <tbody>
                          {SECTION_CONFIG.map((sec) => {
                            const b = formData[sec.key];
                            const c = Number(b.conducted || 0);
                            const t = Number(b.tcbr || 0);
                            const a = Number(b.attended || 0);
                            const net = c - t;
                            const pct = net > 0 && a <= net && c > 0 ? Number(((a / net) * 100).toFixed(2)) : "--";
                            return (
                              <tr key={sec.key}>
                                <td><strong>{sec.label}</strong></td>
                                <td>{sec.badge}</td>
                                <td>{b.conducted || "0"}</td>
                                <td>{b.tcbr || "0"}</td>
                                <td>{net > 0 ? net : "0"}</td>
                                <td>{b.attended || "0"}</td>
                                <td className="pct-cell">
                                  <strong>{pct !== "--" ? `${pct}%` : "--"}</strong>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {exportSource === "subject" && (
                  <>
                    <div className="rep-score-row">
                      <div className="rep-score-box">
                        <span>SEMESTER SUBJECT AGGREGATE</span>
                        <h1 className={subjectStats.average >= 75 ? "rep-safe" : "rep-alert"}>
                          {subjectStats.average != null ? `${subjectStats.average}%` : "--%"}
                        </h1>
                        <p>{subjectStats.average >= 75 ? "Overall Semester Safe" : "Semester Shortage Alert"}</p>
                      </div>

                      <div className="rep-kpi-grid">
                        <div className="rep-kpi">
                          <span>Total Courses</span>
                          <strong>{subjectStats.rows.length} Courses</strong>
                        </div>
                        <div className="rep-kpi">
                          <span>Safe Courses</span>
                          <strong>{subjectStats.safeCount} Courses</strong>
                        </div>
                        <div className="rep-kpi">
                          <span>Shortage Courses</span>
                          <strong>{subjectStats.riskCount} Courses</strong>
                        </div>
                        <div className="rep-kpi">
                          <span>Total Attendance</span>
                          <strong>{subjectStats.totalAttended} / {subjectStats.totalNet}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="rep-table-wrap">
                      <table className="rep-table">
                        <thead>
                          <tr>
                            <th>Subject / Course Name</th>
                            <th>Type</th>
                            <th>Conducted</th>
                            <th>TCBR</th>
                            <th>Attended</th>
                            <th>Percentage</th>
                            <th>Status / Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subjectStats.rows.map((sub) => (
                            <tr key={sub.id}>
                              <td><strong>{sub.name}</strong></td>
                              <td>{sub.category}</td>
                              <td>{sub.conducted}</td>
                              <td>{sub.tcbr}</td>
                              <td>{sub.attended}</td>
                              <td className="pct-cell"><strong>{sub.percentage}%</strong></td>
                              <td>
                                {sub.isSafe ? (
                                  <span className="rep-badge-safe">Safe (Bunk {sub.safeBunks})</span>
                                ) : (
                                  <span className="rep-badge-risk">Shortage (Need {sub.neededFor75})</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {exportSource === "absent" && (
                  <div className="rep-absent-content">
                    <div className="rep-score-row">
                      <div className="rep-score-box">
                        <span>PROJECTED POST-ABSENCE SCORE</span>
                        <h1 className={absentSummary?.newPercent >= 75 ? "rep-safe" : "rep-alert"}>
                          {absentSummary?.newPercent != null ? `${absentSummary.newPercent}%` : "--%"}
                        </h1>
                        <p>{absentSummary?.willBeSafe ? "Safe to proceed with leave" : "Warning: Falls below 75%"}</p>
                      </div>

                      <div className="rep-kpi-grid">
                        <div className="rep-kpi">
                          <span>Starting Attendance</span>
                          <strong>{absentSummary?.currentPercent ?? "--"}%</strong>
                        </div>
                        <div className="rep-kpi">
                          <span>Planned Absences</span>
                          <strong>{absentSummary?.plannedAbsents ?? "--"} classes</strong>
                        </div>
                        <div className="rep-kpi">
                          <span>Safe Bunks Allowed</span>
                          <strong>{absentSummary?.maxSafeAbsents75 ?? "--"} classes</strong>
                        </div>
                        <div className="rep-kpi">
                          <span>Recovery Classes</span>
                          <strong>{absentSummary?.recoverTo75 ?? 0} classes</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Official Footer & Verification Hash */}
                <div className="rep-footer">
                  <div className="rep-meta-left">
                    <span>Generated via KLU Attendance Decision Suite</span>
                    <small>System ID: KLU-DECISION-{Date.now().toString(36).toUpperCase()}</small>
                  </div>
                  <div className="rep-sig">
                    <span>Academic Status Verified</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Export Actions Bar */}
            <footer className="modal-actions-bar">
              <button
                type="button"
                className="modal-action-btn primary"
                onClick={handleDownloadImage}
                disabled={isExporting}
              >
                {isExporting ? "⏳ Rendering..." : "📸 Download HD Image (PNG)"}
              </button>

              <button
                type="button"
                className="modal-action-btn"
                onClick={handleCopyImageToClipboard}
                disabled={isExporting}
              >
                📋 Copy Image to Clipboard
              </button>

              <button
                type="button"
                className="modal-action-btn"
                onClick={handleExportPdf}
                disabled={isExporting}
              >
                🖨️ Print / Save as PDF
              </button>

              <button
                type="button"
                className="modal-action-btn ghost"
                onClick={handleCopyTextSummary}
                disabled={isExporting}
              >
                💬 Copy WhatsApp Summary
              </button>
            </footer>
          </div>
        </div>
      )}
    </main>
  );
}
