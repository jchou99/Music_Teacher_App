// components/SettingsPage.js
const SettingsPage = ({
    customEventTags,
    saveCustomEventTags,
    customLevels,
    saveCustomLevels,
    customWeekdays,
    saveCustomWeekdays,
    customPaymentPeriodsConfig,
    saveCustomPaymentPeriodsConfig,
    aiSettings,
    saveAiSettings,
    theme,
    saveTheme,
    teacherContact,     // received as prop (if available)
    setTeacherContact   // received as prop (if available)
}) => {
    const { useState, useEffect } = React;
    const Icon = window.Icon;

    // Body-level safe fallbacks to prevent Babel Standalone compilation crashes
    const activePaymentPeriodsConfig = customPaymentPeriodsConfig || [];
    const activeAiSettings = aiSettings || { workingBlocks: [], breaks: [], specialDates: [] };
    const activeTheme = theme || {
        bg: "#eef8f8",
        text: "#132c2a",
        border: "#099c97",
        cardBg: "#ffffff",
        cardBgAlt: "#f0fbfb",
        brand: "#0abab5",
        brandHover: "#099c97",
        customPresets: []
    };

    // Resilient fallback: Uses prop if available, otherwise safely manages its own state
    const [localContact, setLocalContact] = useState(() => {
        if (teacherContact) return teacherContact;
        const cached = localStorage.getItem("cadenza_teacher_contact");
        return cached ? JSON.parse(cached) : {
            studioName: "Cadenza Music Studio",
            teacherName: "Admin Teacher",
            teacherEmail: "",
            teacherPhone: ""
        };
    });

    // Synchronize local state with App-level state when props load
    useEffect(() => {
        if (teacherContact) {
            setLocalContact(teacherContact);
        }
    }, [teacherContact]);

    // New Event Tag Form States
    const [newTagName, setNewTagName] = useState("");
    const [newTagBg, setNewTagBg] = useState("#fee2e2");
    const [newTagText, setNewTagText] = useState("#991b1b");
    const [newTagBorder, setNewTagBorder] = useState("#fca5a5");
    const [newTagIsMultiDay, setNewTagIsMultiDay] = useState(false);

    // Inline Event Tag Edit States
    const [editingTagId, setEditingTagId] = useState(null);
    const [editingTagName, setEditingTagName] = useState("");
    const [editingTagBg, setEditingTagBg] = useState("");
    const [editingTagText, setEditingTagText] = useState("");
    const [editingTagBorder, setEditingTagBorder] = useState("");
    const [editingTagIsMultiDay, setEditingTagIsMultiDay] = useState(false);

    // New Student Level Form States
    const [newLevelName, setNewLevelName] = useState("");
    const [newLevelDuration, setNewLevelDuration] = useState(30);
    const [newLevelLetter, setNewLevelLetter] = useState("B");

    // Inline Student Level Edit States
    const [editingLevelName, setEditingLevelName] = useState(null);
    const [editingLevelNewName, setEditingLevelNewName] = useState("");
    const [editingLevelDuration, setEditingLevelDuration] = useState(30);
    const [editingLevelLetter, setEditingLevelLetter] = useState("");

    // New Payment Plan Form States
    const [newPlanName, setNewPlanName] = useState("");
    const [newPlanDays, setNewPlanDays] = useState(7);

    // AI Scheduler Preference Form States
    const [newWorkDay, setNewWorkDay] = useState("Monday");
    const [newWorkStart, setNewWorkStart] = useState("09:00");
    const [newWorkEnd, setNewWorkEnd] = useState("17:00");

    const [newBreakTitle, setNewBreakTitle] = useState("");
    const [newBreakDay, setNewBreakDay] = useState("All Days");
    const [newBreakStart, setNewBreakStart] = useState("12:00");
    const [newBreakEnd, setNewBreakEnd] = useState("13:00");

    const [newSpecialStartDate, setNewSpecialStartDate] = useState("");
    const [newSpecialEndDate, setNewSpecialEndDate] = useState("");
    const [newSpecialReason, setNewSpecialReason] = useState("");

    // Local state for Custom Theme Presets
    const customThemes = activeTheme.customPresets || [];
    const [customThemeName, setCustomThemeName] = useState("");

    // Pre-designed Studio Palette Themes
    const defaultPresets = [
        {
            name: "Teal Mint",
            colors: {
                bg: "#eef8f8",
                text: "#132c2a",
                border: "#099c97",
                cardBg: "#ffffff",
                cardBgAlt: "#f0fbfb",
                brand: "#0abab5",
                brandHover: "#099c97"
            }
        },
        {
            name: "Royal Lavender",
            colors: {
                bg: "#f5f3ff",
                text: "#1e1b4b",
                border: "#c084fc",
                cardBg: "#ffffff",
                cardBgAlt: "#faf5ff",
                brand: "#7c3aed",
                brandHover: "#6d28d9"
            }
        },
        {
            name: "Midnight Slate",
            colors: {
                bg: "#0f172a",
                text: "#f8fafc",
                border: "#334155",
                cardBg: "#1e293b",
                cardBgAlt: "#0f172a",
                brand: "#38bdf8",
                brandHover: "#0ea5e9"
            }
        },
        {
            name: "Forest Sage",
            colors: {
                bg: "#f0f4f1",
                text: "#142918",
                border: "#7da887",
                cardBg: "#ffffff",
                cardBgAlt: "#e2ebe4",
                brand: "#2d6a4f",
                brandHover: "#1b4332"
            }
        },
        {
            name: "Terracotta",
            colors: {
                bg: "#fdf8f5",
                text: "#2d160f",
                border: "#fca5a5",
                cardBg: "#ffffff",
                cardBgAlt: "#fcefe9",
                brand: "#e15b3e",
                brandHover: "#c54228"
            }
        }
    ];

    // Combine default layouts with custom created presets
    const allPresets = [...defaultPresets, ...customThemes];

    // AI Scheduler Preference Event Handlers
    const handleAddWorkingBlock = () => {
        if (!newWorkStart || !newWorkEnd) return;
        const entry = {
            id: Date.now(),
            day: newWorkDay,
            start: newWorkStart,
            end: newWorkEnd
        };
        const nextBlocks = [...(activeAiSettings.workingBlocks || []), entry];
        saveAiSettings({
            ...activeAiSettings,
            workingBlocks: nextBlocks
        });
        setNewWorkDay("Monday");
        setNewWorkStart("09:00");
        setNewWorkEnd("17:00");
    };

    const handleRemoveWorkingBlock = (id) => {
        const nextBlocks = (activeAiSettings.workingBlocks || []).filter(w => w.id !== id);
        saveAiSettings({
            ...activeAiSettings,
            workingBlocks: nextBlocks
        });
    };

    const handleAddBreak = () => {
        if (!newBreakTitle.trim() || !newBreakStart || !newBreakEnd) return;
        const entry = {
            id: Date.now(),
            day: newBreakDay,
            start: newBreakStart,
            end: newBreakEnd,
            title: newBreakTitle.trim()
        };
        const nextBreaks = [...(activeAiSettings.breaks || []), entry];
        saveAiSettings({
            ...activeAiSettings,
            breaks: nextBreaks
        });
        setNewBreakTitle("");
        setNewBreakDay("All Days");
        setNewBreakStart("12:00");
        setNewBreakEnd("13:00");
    };

    const handleRemoveBreak = (id) => {
        const nextBreaks = (activeAiSettings.breaks || []).filter(b => b.id !== id);
        saveAiSettings({
            ...activeAiSettings,
            breaks: nextBreaks
        });
    };

    const handleAddSpecialDate = () => {
        if (!newSpecialStartDate) return;
        const dateString = newSpecialEndDate
            ? `${newSpecialStartDate} to ${newSpecialEndDate}`
            : newSpecialStartDate;

        const entry = {
            id: Date.now(),
            date: dateString,
            reason: newSpecialReason || "Personal Leave"
        };
        const nextSpecialDates = [...(activeAiSettings.specialDates || []), entry];
        saveAiSettings({
            ...activeAiSettings,
            specialDates: nextSpecialDates
        });
        setNewSpecialStartDate("");
        setNewSpecialEndDate("");
        setNewSpecialReason("");
    };

    const handleRemoveSpecialDate = (id) => {
        const nextSpecialDates = (activeAiSettings.specialDates || []).filter(d => d.id !== id);
        saveAiSettings({
            ...activeAiSettings,
            specialDates: nextSpecialDates
        });
    };

    // AI Scheduler Preference Local Helpers
    const formatTime12h = (timeStr) => {
        if (!timeStr) return "12:00 AM";
        const [hourStr, minStr] = timeStr.split(":");
        const hour = parseInt(hourStr, 10);
        const ampm = hour >= 12 ? "PM" : "AM";
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minStr} ${ampm}`;
    };

    const formatDisplayDate = (dateStr) => {
        if (!dateStr) return "";

        const formatSingle = (isoStr) => {
            if (/^\d{4}-\d{2}-\d{2}$/.test(isoStr)) {
                const [year, month, day] = isoStr.split("-").map(num => parseInt(num, 10));
                const d = new Date(year, month - 1, day);
                return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
            }
            const d = new Date(isoStr);
            if (isNaN(d.getTime())) return isoStr;
            return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
        };

        if (dateStr.includes(" to ")) {
            const [start, end] = dateStr.split(" to ");
            return `${formatSingle(start)} – ${formatSingle(end)}`;
        }
        return formatSingle(dateStr);
    };

    // Color Presets mapping
    const colorPresets = [
        { name: "Red", bg: "#fee2e2", text: "#991b1b", border: "#fca5a5" },
        { name: "Orange", bg: "#ffedd5", text: "#9a3412", border: "#fed7aa" },
        { name: "Yellow", bg: "#fef9c3", text: "#854d0e", border: "#fef08a" },
        { name: "Green", bg: "#d1fae5", text: "#065f46", border: "#6ee7b7" },
        { name: "Blue", bg: "#dbeafe", text: "#1e40af", border: "#bfdbfe" },
        { name: "Purple", bg: "#f3e8ff", text: "#6b21a8", border: "#d8b4fe" },
        { name: "Gray", bg: "#f3f4f6", text: "#374151", border: "#e5e7eb" },
        { name: "White", bg: "#ffffff", text: "#132c2a", border: "#cbd5e1" },
        { name: "Black", bg: "#132c2a", text: "#ffffff", border: "#47ded7" }
    ];

    // Add a new Custom Event Tag
    const handleAddTag = () => {
        if (!newTagName.trim()) return;
        const nextTags = [
            ...customEventTags,
            {
                id: newTagName.trim().toLowerCase().replace(/\s+/g, "-"),
                name: newTagName.trim(),
                bg: newTagBg,
                text: newTagText,
                border: newTagBorder,
                isMultiDay: newTagIsMultiDay
            }
        ];
        saveCustomEventTags(nextTags);
        setNewTagName("");
        setNewTagBg("#fee2e2");
        setNewTagText("#991b1b");
        setNewTagBorder("#fca5a5");
        setNewTagIsMultiDay(false);
    };

    const handleStartTagEdit = (tag) => {
        setEditingTagId(tag.id);
        setEditingTagName(tag.name);
        setEditingTagBg(tag.bg);
        setEditingTagText(tag.text);
        setEditingTagBorder(tag.border);
        setEditingTagIsMultiDay(!!tag.isMultiDay);
    };

    const handleSaveTagEdit = (id) => {
        if (!editingTagName.trim()) return;
        const updated = customEventTags.map(t => t.id === id ? {
            ...t,
            name: editingTagName.trim(),
            bg: editingTagBg,
            text: editingTagText,
            border: editingTagBorder,
            isMultiDay: editingTagIsMultiDay
        } : t);
        saveCustomEventTags(updated);
        setEditingTagId(null);
    };

    const handleRemoveTag = (id) => {
        if (confirm("Are you sure you want to delete this event tag?")) {
            const nextTags = customEventTags.filter(t => t.id !== id);
            saveCustomEventTags(nextTags);
        }
    };

    // Add a new Student Level
    const handleAddLevel = () => {
        if (!newLevelName.trim() || !newLevelLetter.trim()) return;
        const nextLevels = [
            ...customLevels,
            {
                name: newLevelName.trim(),
                duration: parseInt(newLevelDuration, 10) || 30,
                letter: newLevelLetter.trim().toUpperCase().slice(0, 2)
            }
        ];
        saveCustomLevels(nextLevels);
        setNewLevelName("");
        setNewLevelDuration(30);
        setNewLevelLetter("B");
    };

    const handleStartLevelEdit = (lvl) => {
        setEditingLevelName(lvl.name);
        setEditingLevelNewName(lvl.name);
        setEditingLevelDuration(lvl.duration);
        setEditingLevelLetter(lvl.letter);
    };

    const handleSaveLevelEdit = (name) => {
        if (!editingLevelNewName.trim() || !editingLevelLetter.trim()) return;
        const updated = customLevels.map(l => l.name === name ? {
            name: editingLevelNewName.trim(),
            duration: parseInt(editingLevelDuration, 10) || 30,
            letter: editingLevelLetter.trim().toUpperCase().slice(0, 2)
        } : l);
        saveCustomLevels(updated);
        setEditingLevelName(null);
    };

    const handleRemoveLevel = (name) => {
        if (confirm("Are you sure you want to delete this skill level?")) {
            const nextLevels = customLevels.filter(l => l.name !== name);
            saveCustomLevels(nextLevels);
        }
    };

    // Custom Payment Period Handlers
    const handleAddPaymentPeriod = () => {
        if (!newPlanName.trim()) return;
        const nextPeriods = [
            ...activePaymentPeriodsConfig,
            {
                name: newPlanName.trim(),
                days: parseInt(newPlanDays, 10) || 7
            }
        ];
        saveCustomPaymentPeriodsConfig(nextPeriods);
        setNewPlanName("");
        setNewPlanDays(7);
    };

    const handleRemovePaymentPeriod = (name) => {
        if (confirm(`Are you sure you want to remove the "${name}" payment plan?`)) {
            const nextPeriods = activePaymentPeriodsConfig.filter(p => p.name !== name);
            saveCustomPaymentPeriodsConfig(nextPeriods);
        }
    };

    // Toggle operational weekdays
    const handleWeekdayToggle = (day) => {
        let nextWeekdays = [];
        if (customWeekdays.includes(day)) {
            if (customWeekdays.length === 1) {
                alert("You must keep at least one active operational day configured.");
                return;
            }
            nextWeekdays = customWeekdays.filter(d => d !== day);
        } else {
            nextWeekdays = [...customWeekdays, day];
        }

        const standardOrder = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        nextWeekdays.sort((a, b) => standardOrder.indexOf(a) - standardOrder.indexOf(b));
        saveCustomWeekdays(nextWeekdays);
    };

    return (
        <div className="flex flex-col gap-8 max-w-5xl mx-auto">

            {/* Page Title */}
            <div>
                <h2 className="text-3xl font-bold text-white font-serif">Studio Configurations</h2>
                <p className="text-sm text-slate-100 mt-1">Admin settings to modify student levels, event colors, and operational structures.</p>
            </div>

            {/* STUDIO PROFILE & TEACHER CONTACT INFORMATION CARD */}
            <div className="bg-slate-800/40 rounded-2xl p-6 border border-slate-800 flex flex-col gap-5">
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Icon name="user" className="w-5 h-5 text-purple-400" />
                        Studio Profile & Teacher Contact
                    </h3>
                    <p className="text-xs text-slate-100 mt-1">Configure your public studio name, teaching profile, and default contact details.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-100 uppercase tracking-wider px-1">Studio Name</label>
                        <input
                            type="text"
                            placeholder="e.g. Cadenza Music Studio"
                            value={localContact.studioName}
                            onChange={(e) => setLocalContact({ ...localContact, studioName: e.target.value })}
                            className="w-full px-3 rounded-lg text-xs text-slate-950 border border-slate-700 bg-white h-10"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-100 uppercase tracking-wider px-1">Teacher Name</label>
                        <input
                            type="text"
                            placeholder="e.g. Ms. Jane Doe"
                            value={localContact.teacherName}
                            onChange={(e) => setLocalContact({ ...localContact, teacherName: e.target.value })}
                            className="w-full px-3 rounded-lg text-xs text-slate-950 border border-slate-700 bg-white h-10"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-100 uppercase tracking-wider px-1">Email Address</label>
                        <input
                            type="text"
                            placeholder="teacher@example.com"
                            value={localContact.teacherEmail}
                            onChange={(e) => setLocalContact({ ...localContact, teacherEmail: e.target.value })}
                            className="w-full px-3 rounded-lg text-xs text-slate-950 border border-slate-700 bg-white h-10"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-100 uppercase tracking-wider px-1">Phone Number</label>
                        <input
                            type="text"
                            placeholder="e.g. 555-0199"
                            value={localContact.teacherPhone}
                            onChange={(e) => setLocalContact({ ...localContact, teacherPhone: e.target.value })}
                            className="w-full px-3 rounded-lg text-xs text-slate-950 border border-slate-700 bg-white h-10"
                        />
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => {
                        localStorage.setItem("cadenza_teacher_contact", JSON.stringify(localContact));
                        if (setTeacherContact) {
                            setTeacherContact(localContact); // Update main app.js state dynamically
                        }
                        alert("Studio profile and teacher contact details saved successfully!");
                    }}
                    className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold uppercase rounded-xl transition cursor-pointer h-10 flex items-center justify-center"
                >
                    Save Profile Details
                </button>
            </div>

            {/* STUDIO THEME CUSTOMIZER */}
            <div className="bg-slate-800/40 rounded-2xl p-6 border border-slate-800 flex flex-col gap-5">
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Icon name="pencil" className="w-5 h-5 text-purple-400" />
                        Studio Palette Theme Customization
                    </h3>
                    <p className="text-xs text-slate-100 mt-1">Select a pre-designed palette or customize your own interface colors in real time.</p>
                </div>

                {/* Prebuilt Theme Palette Presets Grid */}
                <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-slate-100 uppercase tracking-wider px-1">Preset Themes</span>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-2.5 bg-slate-900/40 rounded-xl border border-slate-800">
                        {allPresets.map(preset => (
                            <div key={preset.name} className="relative group animate-fade-in">
                                <button
                                    onClick={() => saveTheme(preset.colors)}
                                    className="w-full py-3 px-3 rounded-lg text-xs font-bold transition-all border border-slate-700 bg-white hover:opacity-90 flex flex-col items-center gap-2 cursor-pointer"
                                    style={{ backgroundColor: preset.colors.bg, color: preset.colors.text, borderColor: preset.colors.border }}
                                >
                                    <span className="truncate max-w-full">{preset.name}</span>
                                    <div className="flex gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full border border-slate-700/30" style={{ backgroundColor: preset.colors.brand }} />
                                        <span className="w-2.5 h-2.5 rounded-full border border-slate-700/30" style={{ backgroundColor: preset.colors.border }} />
                                        <span className="w-2.5 h-2.5 rounded-full border border-slate-700/30" style={{ backgroundColor: preset.colors.cardBgAlt }} />
                                    </div>
                                </button>

                                {/* Delete button shown only for custom user themes */}
                                {preset.isCustom && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm(`Are you sure you want to delete the "${preset.name}" theme preset?`)) {
                                                const nextCustomThemes = customThemes.filter(t => t.name !== preset.name);
                                                saveTheme({
                                                    ...activeTheme,
                                                    customPresets: nextCustomThemes
                                                });
                                                alert(`Deleted custom theme "${preset.name}".`);
                                            }
                                        }}
                                        className="absolute -top-1.5 -right-1.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow-md border border-red-700 cursor-pointer select-none z-10"
                                        title="Delete this custom preset"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Real-time Custom Theme Color Pickers with Naming Options */}
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700 flex flex-col gap-4">
                    <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">Custom Theme Creator</span>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <div className="flex flex-col gap-1 items-center">
                            <span className="text-[9px] uppercase font-bold text-slate-100">Page Background</span>
                            <input
                                type="color"
                                value={activeTheme.bg || "#eef8f8"}
                                onChange={(e) => saveTheme({ ...activeTheme, bg: e.target.value })}
                                className="w-12 h-10 rounded cursor-pointer bg-transparent border border-slate-700"
                            />
                        </div>
                        <div className="flex flex-col gap-1 items-center">
                            <span className="text-[9px] uppercase font-bold text-slate-100">Text Color</span>
                            <input
                                type="color"
                                value={activeTheme.text || "#132c2a"}
                                onChange={(e) => saveTheme({ ...activeTheme, text: e.target.value })}
                                className="w-12 h-10 rounded cursor-pointer bg-transparent border border-slate-700"
                            />
                        </div>
                        <div className="flex flex-col gap-1 items-center">
                            <span className="text-[9px] uppercase font-bold text-slate-100">Accent Borders</span>
                            <input
                                type="color"
                                value={activeTheme.border || "#099c97"}
                                onChange={(e) => saveTheme({ ...activeTheme, border: e.target.value })}
                                className="w-12 h-10 rounded cursor-pointer bg-transparent border border-slate-700"
                            />
                        </div>
                        <div className="flex flex-col gap-1 items-center">
                            <span className="text-[9px] uppercase font-bold text-slate-100">Card Background</span>
                            <input
                                type="color"
                                value={activeTheme.cardBg || "#ffffff"}
                                onChange={(e) => saveTheme({ ...activeTheme, cardBg: e.target.value })}
                                className="w-12 h-10 rounded cursor-pointer bg-transparent border border-slate-700"
                            />
                        </div>
                        <div className="flex flex-col gap-1 items-center">
                            <span className="text-[9px] uppercase font-bold text-slate-100">Card Alt Background</span>
                            <input
                                type="color"
                                value={activeTheme.cardBgAlt || "#f0fbfb"}
                                onChange={(e) => saveTheme({ ...activeTheme, cardBgAlt: e.target.value })}
                                className="w-12 h-10 rounded cursor-pointer bg-transparent border border-slate-700"
                            />
                        </div>
                        <div className="flex flex-col gap-1 items-center">
                            <span className="text-[9px] uppercase font-bold text-slate-100">Brand Highlight</span>
                            <input
                                type="color"
                                value={activeTheme.brand || "#0abab5"}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    saveTheme({ ...activeTheme, brand: val, brandHover: val });
                                }}
                                className="w-12 h-10 rounded cursor-pointer bg-transparent border border-slate-700"
                            />
                        </div>
                    </div>

                    {/* Theme Saving controls */}
                    <div className="flex flex-col sm:flex-row gap-3 mt-4 border-t border-slate-700/50 pt-4">
                        <div className="flex-1 flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-slate-100 uppercase tracking-wider px-1">Theme Name</span>
                            <input
                                type="text"
                                placeholder="e.g. Autumn Gold, Bubblegum"
                                value={customThemeName}
                                onChange={(e) => setCustomThemeName(e.target.value)}
                                className="w-full px-3 rounded-lg text-xs bg-white text-slate-100 h-10 border border-slate-700 font-semibold shadow-sm"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                const nameClean = customThemeName.trim();
                                if (!nameClean) {
                                    alert("Please enter a name for your custom theme.");
                                    return;
                                }

                                if (allPresets.some(p => p.name.toLowerCase() === nameClean.toLowerCase())) {
                                    alert(`A theme named "${nameClean}" already exists. Please choose a different name.`);
                                    return;
                                }

                                const newPreset = {
                                    name: nameClean,
                                    isCustom: true,
                                    colors: {
                                        bg: activeTheme.bg,
                                        text: activeTheme.text,
                                        border: activeTheme.border,
                                        cardBg: activeTheme.cardBg,
                                        cardBgAlt: activeTheme.cardBgAlt,
                                        brand: activeTheme.brand,
                                        brandHover: activeTheme.brandHover || activeTheme.brand
                                    }
                                };

                                const nextCustomThemes = [...customThemes, newPreset];
                                saveTheme({
                                    ...activeTheme,
                                    customPresets: nextCustomThemes
                                });
                                setCustomThemeName("");
                                alert(`Theme "${nameClean}" successfully saved to database presets!`);
                            }}
                            disabled={!customThemeName.trim()}
                            className={`px-6 py-2.5 h-10 rounded-xl font-bold text-xs uppercase transition shrink-0 self-end flex items-center justify-center gap-1.5 ${!customThemeName.trim()
                                ? "bg-purple-600 text-white cursor-not-allowed opacity-40" // Matches theme but is lighter/translucent
                                : "bg-purple-600 hover:bg-purple-500 text-white cursor-pointer"
                                }`}
                        >
                            Save Custom Theme
                        </button>
                    </div>

                    <button
                        onClick={() => {
                            // Reset back to Teal Mint default
                            saveTheme({
                                bg: "#eef8f8",
                                text: "#132c2a",
                                border: "#099c97",
                                cardBg: "#ffffff",
                                cardBgAlt: "#f0fbfb",
                                brand: "#0abab5",
                                brandHover: "#099c97"
                            });
                        }}
                        className="w-full mt-2 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-xs font-bold uppercase rounded-xl transition cursor-pointer h-10 flex items-center justify-center"
                    >
                        Reset to Default Palette
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* 1. CUSTOM EVENT TYPES AND COLOR THEMES */}
                <div className="bg-slate-800/40 rounded-2xl p-6 border border-slate-800 flex flex-col gap-5">
                    <div>
                        <h3 className="text-lg font-bold text-white">Event Types & Color Coding</h3>
                        <p className="text-xs text-slate-100">Add custom event types and modify their aesthetic palettes.</p>
                    </div>

                    <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700 flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-bold text-slate-100 uppercase tracking-wider px-1">Event Type Name</label>
                            <input
                                type="text"
                                placeholder="e.g. Workshop, Jury"
                                value={newTagName}
                                onChange={(e) => setNewTagName(e.target.value)}
                                className="w-full p-2 rounded-lg text-xs text-slate-950 border border-slate-700 bg-white h-10"
                            />
                        </div>

                        {/* Event Duration Option Toggle (Single Day / Multi-Day) */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-100 uppercase tracking-wider px-1">Duration Type</label>
                            <div className="flex gap-4 p-2 bg-slate-900/40 rounded-xl border border-slate-800">
                                <label className="flex items-center gap-1.5 text-xs text-slate-100 font-bold cursor-pointer">
                                    <input
                                        type="radio"
                                        name="newTagDuration"
                                        checked={!newTagIsMultiDay}
                                        onChange={() => setNewTagIsMultiDay(false)}
                                        className="rounded-full border-slate-600 bg-slate-700 text-purple-600 focus:ring-purple-500 h-3.5 w-3.5 cursor-pointer"
                                    />
                                    <span>Single Day</span>
                                </label>
                                <label className="flex items-center gap-1.5 text-xs text-slate-100 font-bold cursor-pointer">
                                    <input
                                        type="radio"
                                        name="newTagDuration"
                                        checked={newTagIsMultiDay}
                                        onChange={() => setNewTagIsMultiDay(true)}
                                        className="rounded-full border-slate-600 bg-slate-700 text-purple-600 focus:ring-purple-500 h-3.5 w-3.5 cursor-pointer"
                                    />
                                    <span>Multi-Day</span>
                                </label>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-100 uppercase tracking-wider px-1">Quick Color Presets</label>
                            <div className="flex flex-wrap gap-1.5 p-2 bg-slate-900/40 rounded-xl border border-slate-800">
                                {colorPresets.map(preset => (
                                    <button
                                        key={preset.name}
                                        type="button"
                                        onClick={() => {
                                            setNewTagBg(preset.bg);
                                            setNewTagText(preset.text);
                                            setNewTagBorder(preset.border);
                                        }}
                                        style={{ backgroundColor: preset.bg, color: preset.text, borderColor: preset.border, borderWidth: "1px", borderStyle: "solid" }}
                                        className="px-2.5 py-1 rounded text-[9px] font-extrabold uppercase hover:opacity-85 transition-all select-none"
                                    >
                                        {preset.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <div className="flex flex-col gap-1 items-center">
                                <span className="text-[9px] uppercase font-bold text-slate-100">Background</span>
                                <input type="color" value={newTagBg} onChange={(e) => setNewTagBg(e.target.value)} className="w-10 h-8 rounded cursor-pointer bg-transparent border border-slate-700" />
                            </div>
                            <div className="flex flex-col gap-1 items-center">
                                <span className="text-[9px] uppercase font-bold text-slate-100">Text</span>
                                <input type="color" value={newTagText} onChange={(e) => setNewTagText(e.target.value)} className="w-10 h-8 rounded cursor-pointer bg-transparent border border-slate-700" />
                            </div>
                            <div className="flex flex-col gap-1 items-center">
                                <span className="text-[9px] uppercase font-bold text-slate-100">Border</span>
                                <input type="color" value={newTagBorder} onChange={(e) => setNewTagBorder(e.target.value)} className="w-10 h-8 rounded cursor-pointer bg-transparent border border-slate-700" />
                            </div>
                        </div>

                        <div className="flex flex-col items-center gap-1.5 p-2 bg-slate-900/40 rounded-xl border border-slate-800">
                            <span className="text-[9px] uppercase font-bold text-slate-400">Live Preview</span>
                            <span
                                style={{ backgroundColor: newTagBg, color: newTagText, borderColor: newTagBorder, borderWidth: "1.5px", borderStyle: "solid" }}
                                className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase"
                            >
                                {newTagName || "Preview tag"}
                            </span>
                        </div>

                        <button
                            onClick={handleAddTag}
                            disabled={!newTagName.trim()}
                            className={`w-full py-2 font-bold text-xs uppercase rounded-xl transition h-10 flex items-center justify-center ${!newTagName.trim()
                                ? "bg-purple-600 text-white cursor-not-allowed opacity-40"
                                : "bg-purple-600 hover:bg-purple-500 text-white cursor-pointer"
                                }`}
                        >
                            Add Event Type
                        </button>
                    </div>

                    <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto pr-1">
                        {customEventTags.map(tag => {
                            const isEditing = editingTagId === tag.id;
                            return (
                                <div key={tag.id} className="bg-slate-900/60 p-3 rounded-xl border border-slate-700 text-xs flex flex-col gap-3 relative">
                                    {isEditing ? (
                                        <div className="flex flex-col gap-3 w-full animate-fade-in">
                                            <div className="flex flex-col gap-1.5">
                                                <span className="text-[9px] font-bold text-slate-300 uppercase px-1">Edit Event Type Name</span>
                                                <input
                                                    type="text"
                                                    value={editingTagName}
                                                    onChange={(e) => setEditingTagName(e.target.value)}
                                                    className="w-full px-3 rounded-lg text-xs text-slate-950 border border-slate-700 bg-white h-10"
                                                />
                                            </div>

                                            {/* Edit Event Type Duration Option Toggle */}
                                            <div className="flex flex-col gap-1.5">
                                                <span className="text-[9px] font-bold text-slate-300 uppercase px-1">Edit Duration Type</span>
                                                <div className="flex gap-4 p-1.5 bg-slate-900/40 rounded-lg border border-slate-800">
                                                    <label className="flex items-center gap-1.5 text-xs text-slate-100 font-bold cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name={`editTagDuration-${tag.id}`}
                                                            checked={!editingTagIsMultiDay}
                                                            onChange={() => setEditingTagIsMultiDay(false)}
                                                            className="rounded-full border-slate-600 bg-slate-700 text-purple-600 focus:ring-purple-500 h-3.5 w-3.5 cursor-pointer"
                                                        />
                                                        <span>Single Day</span>
                                                    </label>
                                                    <label className="flex items-center gap-1.5 text-xs text-slate-100 font-bold cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name={`editTagDuration-${tag.id}`}
                                                            checked={editingTagIsMultiDay}
                                                            onChange={() => setEditingTagIsMultiDay(true)}
                                                            className="rounded-full border-slate-600 bg-slate-700 text-purple-600 focus:ring-purple-500 h-3.5 w-3.5 cursor-pointer"
                                                        />
                                                        <span>Multi-Day</span>
                                                    </label>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-1.5 p-1.5 bg-slate-900/40 rounded-lg border border-slate-800">
                                                {colorPresets.map(preset => (
                                                    <button
                                                        key={preset.name}
                                                        type="button"
                                                        onClick={() => {
                                                            setEditingTagBg(preset.bg);
                                                            setEditingTagText(preset.text);
                                                            setEditingTagBorder(preset.border);
                                                        }}
                                                        style={{ backgroundColor: preset.bg, color: preset.text, borderColor: preset.border, borderWidth: "1px", borderStyle: "solid" }}
                                                        className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase hover:opacity-85 transition-all"
                                                    >
                                                        {preset.name}
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="flex flex-col gap-1 items-center">
                                                    <span className="text-[9px] uppercase font-bold text-slate-100">Background</span>
                                                    <input type="color" value={editingTagBg} onChange={(e) => setEditingTagBg(e.target.value)} className="w-10 h-8 rounded cursor-pointer bg-transparent border border-slate-700" />
                                                </div>
                                                <div className="flex flex-col gap-1 items-center">
                                                    <span className="text-[9px] uppercase font-bold text-slate-100">Text</span>
                                                    <input type="color" value={editingTagText} onChange={(e) => setEditingTagText(e.target.value)} className="w-10 h-8 rounded cursor-pointer bg-transparent border border-slate-700" />
                                                </div>
                                                <div className="flex flex-col gap-1 items-center">
                                                    <span className="text-[9px] uppercase font-bold text-slate-100">Border</span>
                                                    <input type="color" value={editingTagBorder} onChange={(e) => setEditingTagBorder(e.target.value)} className="w-10 h-8 rounded cursor-pointer bg-transparent border border-slate-700" />
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleSaveTagEdit(tag.id)}
                                                    className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 border border-emerald-500/30 font-bold text-[10px] px-2.5 py-1.5 rounded transition-colors"
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    onClick={() => setEditingTagId(null)}
                                                    className="bg-slate-500/10 hover:bg-slate-500/20 text-slate-700 border border-slate-500/30 font-bold text-[10px] px-2.5 py-1.5 rounded transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex justify-between items-center w-full pr-16 animate-fade-in">
                                            <div className="flex items-center gap-3">
                                                <span
                                                    style={{ backgroundColor: tag.bg, color: tag.text, borderColor: tag.border, borderWidth: "1.5px", borderStyle: "solid" }}
                                                    className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase"
                                                >
                                                    {tag.name}
                                                </span>
                                                <span className="text-[9px] uppercase font-bold text-slate-300 tracking-wider">
                                                    {tag.isMultiDay ? "Multi-Day" : "Single Day"}
                                                </span>
                                            </div>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1.5">
                                                <button
                                                    onClick={() => handleStartTagEdit(tag)}
                                                    className="text-slate-300 hover:text-indigo-400 p-1"
                                                    title="Edit event tag"
                                                >
                                                    <Icon name="pencil" className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleRemoveTag(tag.id)}
                                                    className="text-red-500 hover:text-red-400 font-bold px-1"
                                                    title="Delete event tag"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 2. CUSTOM STUDENT LEVELS & LESSON DURATIONS */}
                <div className="bg-slate-800/40 rounded-2xl p-6 border border-slate-800 flex flex-col gap-5">
                    <div>
                        <h3 className="text-lg font-bold text-white">Student Levels & Durations</h3>
                        <p className="text-xs text-slate-100">Set active skill levels, lesson times, and profile badge letters.</p>
                    </div>

                    <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700 flex flex-col gap-4">
                        <div className="grid grid-cols-3 gap-2">
                            <div className="flex flex-col gap-1 col-span-2">
                                <label className="text-[9px] font-bold text-slate-100 uppercase">Level Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Prep-Beginner"
                                    value={newLevelName}
                                    onChange={(e) => setNewLevelName(e.target.value)}
                                    className="w-full px-3 rounded-lg text-xs text-slate-950 border border-slate-700 bg-white h-10"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-100 uppercase">Badge</label>
                                <input
                                    type="text"
                                    placeholder="PB"
                                    maxLength={2}
                                    value={newLevelLetter}
                                    onChange={(e) => setNewLevelLetter(e.target.value)}
                                    className="w-full px-3 rounded-lg text-xs text-slate-950 border border-slate-700 bg-white text-center font-bold h-10"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5 w-full">
                            <label className="text-[9px] font-bold text-slate-100 uppercase">Duration (Minutes)</label>
                            <input
                                type="number"
                                min={1}
                                value={newLevelDuration}
                                onChange={(e) => setNewLevelDuration(e.target.value)}
                                className="w-full px-3 rounded-lg text-xs text-slate-950 border border-slate-700 bg-white h-10"
                            />
                        </div>

                        <button
                            onClick={handleAddLevel}
                            disabled={!newLevelName.trim() || !newLevelLetter.trim()}
                            className={`w-full py-2 font-bold text-xs uppercase rounded-xl transition h-10 flex items-center justify-center ${(!newLevelName.trim() || !newLevelLetter.trim())
                                ? "bg-purple-600 text-white cursor-not-allowed opacity-40"
                                : "bg-purple-600 hover:bg-purple-500 text-white cursor-pointer"
                                }`}
                        >
                            Add Student Level
                        </button>
                    </div>

                    <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto pr-1">
                        {customLevels.map(lvl => {
                            const isEditing = editingLevelName === lvl.name;
                            return (
                                <div key={lvl.name} className="bg-slate-900/60 p-3 rounded-xl border border-slate-700 text-xs flex flex-col gap-3 relative">
                                    {isEditing ? (
                                        <div className="flex flex-col gap-3 w-full">
                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="flex flex-col gap-1 col-span-2">
                                                    <span className="text-[9px] uppercase font-bold text-slate-300 px-1">Level Name</span>
                                                    <input
                                                        type="text"
                                                        value={editingLevelNewName}
                                                        onChange={(e) => setEditingLevelNewName(e.target.value)}
                                                        className="w-full px-3 rounded-lg text-xs text-slate-950 border border-slate-700 bg-white h-10"
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[9px] uppercase font-bold text-slate-300 px-1">Badge</span>
                                                    <input
                                                        type="text"
                                                        maxLength={2}
                                                        value={editingLevelLetter}
                                                        onChange={(e) => setEditingLevelLetter(e.target.value)}
                                                        className="w-full px-3 rounded-lg text-xs text-slate-950 border border-slate-700 bg-white text-center font-bold h-10"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[9px] uppercase font-bold text-slate-300 px-1">Duration (Minutes)</span>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={240}
                                                    value={editingLevelDuration}
                                                    onChange={(e) => setEditingLevelDuration(e.target.value)}
                                                    className="w-full px-3 rounded-lg text-xs text-slate-950 border border-slate-700 bg-white h-10"
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleSaveLevelEdit(lvl.name)}
                                                    className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 border border-emerald-500/30 font-bold text-[10px] px-2.5 py-1.5 rounded transition-colors"
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    onClick={() => setEditingLevelName(null)}
                                                    className="bg-slate-500/10 hover:bg-slate-500/20 text-slate-700 border border-slate-500/30 font-bold text-[10px] px-2.5 py-1.5 rounded transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex justify-between items-center w-full pr-16">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-400 text-sm shrink-0">
                                                    {lvl.letter}
                                                </div>
                                                <span className="text-slate-100 font-semibold">{lvl.name} ({lvl.duration} mins)</span>
                                            </div>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1.5">
                                                <button
                                                    onClick={() => handleStartLevelEdit(lvl)}
                                                    className="text-slate-300 hover:text-indigo-400 p-1"
                                                    title="Edit student level"
                                                >
                                                    <Icon name="pencil" className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleRemoveLevel(lvl.name)}
                                                    className="text-red-500 hover:text-red-400 font-bold px-1"
                                                    title="Delete student level"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>

            {/* NEW 3. CUSTOM PAYMENT PLANS AND DURATIONS */}
            <div className="bg-slate-800/40 rounded-2xl p-6 border border-slate-800">
                <h3 className="font-bold text-white text-lg mb-2">Custom Payment Plans</h3>
                <p className="text-xs text-slate-100 mb-5">Define active billing frequencies and intervals in elapsed days.</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                    <div className="md:col-span-1 bg-slate-900/60 p-4 rounded-xl border border-slate-700 flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-slate-100 uppercase px-1">Plan Name</label>
                            <input
                                type="text"
                                placeholder="e.g. Bi-weekly"
                                value={newPlanName}
                                onChange={(e) => setNewPlanName(e.target.value)}
                                className="w-full px-3 rounded-lg text-xs text-slate-950 border border-slate-700 bg-white font-semibold h-10 font-medium"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-slate-100 uppercase px-1">Duration (Days)</label>
                            <input
                                type="number"
                                min={1}
                                value={newPlanDays}
                                onChange={(e) => setNewPlanDays(e.target.value)}
                                className="w-full px-3 rounded-lg text-xs text-slate-950 border border-slate-700 bg-white h-10"
                            />
                        </div>

                        <button
                            onClick={handleAddPaymentPeriod}
                            disabled={!newPlanName.trim()}
                            className={`w-full py-2 font-bold text-xs uppercase rounded-xl transition h-10 flex items-center justify-center ${!newPlanName.trim()
                                ? "bg-purple-600 text-white cursor-not-allowed opacity-40"
                                : "bg-purple-600 hover:bg-purple-500 text-white cursor-pointer"
                                }`}
                        >
                            Add Payment Plan
                        </button>
                    </div>

                    <div className="md:col-span-2 flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                        {activePaymentPeriodsConfig.map(plan => (
                            <div key={plan.name} className="flex justify-between items-center bg-slate-900/60 p-3 rounded-xl border border-slate-700 text-xs relative">
                                <div className="flex flex-col gap-0.5">
                                    <span className="font-bold text-white text-sm">{plan.name}</span>
                                    <span className="text-[10px] text-slate-300 font-medium">Auto-increments unpaid periods every {plan.days} days</span>
                                </div>
                                <button
                                    onClick={() => handleRemovePaymentPeriod(plan.name)}
                                    className="text-red-500 hover:text-red-400 font-bold px-2.5 py-1"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 4. STUDIO OPERATIONAL DAYS */}
            <div className="bg-slate-800/40 rounded-2xl p-6 border border-slate-800">
                <h3 className="font-bold text-white text-lg mb-2">Studio Operational Days</h3>
                <p className="text-xs text-slate-100 mb-5">Enable or disable days of the week when your studio teaches lessons.</p>

                <div className="flex flex-wrap gap-3">
                    {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(day => {
                        const isSelected = customWeekdays.includes(day);
                        return (
                            <label
                                key={day}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer select-none transition-all ${isSelected
                                    ? "bg-purple-600/10 border-purple-500 text-white font-bold"
                                    : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-600"
                                    }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleWeekdayToggle(day)}
                                    className="rounded border-slate-600 bg-slate-700 text-purple-600 focus:ring-purple-500 h-3.5 w-3.5 cursor-pointer"
                                />
                                <span>{day}</span>
                            </label>
                        );
                    })}
                </div>
            </div>

            {/* 5. AI SCHEDULER PREFERENCES */}
            <div className="bg-slate-800/40 rounded-2xl p-6 border border-slate-800 flex flex-col gap-5">
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Icon name="sparkles" className="w-5 h-5 text-purple-400" />
                        AI Scheduler Preferences
                    </h3>
                    <p className="text-xs text-slate-100 mt-1">Configure operating thresholds, working blocks, and custom breaks for scheduling recommendations.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

                    {/* Working Blocks Sub-section */}
                    <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700 flex flex-col gap-4">
                        <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">Configure Working Blocks</span>

                        <div className="flex flex-col gap-2">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] text-slate-300 uppercase font-bold">Day</label>
                                    <select
                                        value={newWorkDay}
                                        onChange={(e) => setNewWorkDay(e.target.value)}
                                        className="bg-slate-800 px-3 rounded text-xs text-white border border-slate-700 w-full appearance-none font-medium h-10"
                                    >
                                        <option value="Sunday">Sunday</option>
                                        <option value="Monday">Monday</option>
                                        <option value="Tuesday">Tuesday</option>
                                        <option value="Wednesday">Wednesday</option>
                                        <option value="Thursday">Thursday</option>
                                        <option value="Friday">Friday</option>
                                        <option value="Saturday">Saturday</option>
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] text-slate-300 uppercase font-bold">Start Time</label>
                                    <input
                                        type="time"
                                        value={newWorkStart}
                                        onChange={(e) => setNewWorkStart(e.target.value)}
                                        className="bg-slate-800 px-3 rounded text-xs text-white border border-slate-700 w-full h-10"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] text-slate-300 uppercase font-bold">End Time</label>
                                    <input
                                        type="time"
                                        value={newWorkEnd}
                                        onChange={(e) => setNewWorkEnd(e.target.value)}
                                        className="bg-slate-800 px-3 rounded text-xs text-white border border-slate-700 w-full h-10"
                                    />
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleAddWorkingBlock}
                                className="mt-2 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase rounded-xl transition h-10 flex items-center justify-center"
                            >
                                Add Working Block
                            </button>
                        </div>

                        <div className="flex flex-col gap-2 max-h-[180px] overflow-y-auto pr-1">
                            {(!activeAiSettings.workingBlocks || activeAiSettings.workingBlocks.length === 0) ? (
                                <span className="text-[10px] text-slate-400 italic">No working blocks configured. The AI scheduler won't find available times until blocks are added.</span>
                            ) : (
                                activeAiSettings.workingBlocks.map(w => (
                                    <div key={w.id} className="flex justify-between items-center bg-slate-800 p-2 rounded border border-slate-700 text-xs">
                                        <span className="text-white font-semibold">{w.day}: {formatTime12h(w.start)} - {formatTime12h(w.end)}</span>
                                        <button type="button" onClick={() => handleRemoveWorkingBlock(w.id)} className="text-red-500 hover:text-red-400 font-bold px-1">✕</button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Custom Operating Breaks Sub-section */}
                    <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700 flex flex-col gap-4">
                        <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">Custom Operating Breaks</span>

                        <div className="flex flex-col gap-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div className="flex flex-col gap-1 sm:col-span-2">
                                    <label className="text-[10px] text-slate-300 uppercase font-bold">Break Title</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Lunch"
                                        value={newBreakTitle}
                                        onChange={(e) => setNewBreakTitle(e.target.value)}
                                        className="bg-slate-800 px-3 rounded text-xs text-white border border-slate-700 w-full h-10"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] text-slate-300 uppercase font-bold">Day</label>
                                    <select
                                        value={newBreakDay}
                                        onChange={(e) => setNewBreakDay(e.target.value)}
                                        className="bg-slate-800 px-3 rounded text-xs text-white border border-slate-700 w-full appearance-none font-medium h-10"
                                    >
                                        <option value="All Days">All Days</option>
                                        <option value="Sunday">Sunday</option>
                                        <option value="Monday">Monday</option>
                                        <option value="Tuesday">Tuesday</option>
                                        <option value="Wednesday">Wednesday</option>
                                        <option value="Thursday">Thursday</option>
                                        <option value="Friday">Friday</option>
                                        <option value="Saturday">Saturday</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-2 sm:col-span-1">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] text-slate-300 uppercase font-bold">Start</label>
                                        <input
                                            type="time"
                                            value={newBreakStart}
                                            onChange={(e) => setNewBreakStart(e.target.value)}
                                            className="bg-slate-800 px-3 rounded text-xs text-white border border-slate-700 w-full h-10"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] text-slate-300 uppercase font-bold">End</label>
                                        <input
                                            type="time"
                                            value={newBreakEnd}
                                            onChange={(e) => setNewBreakEnd(e.target.value)}
                                            className="bg-slate-800 px-3 rounded text-xs text-white border border-slate-700 w-full h-10"
                                        />
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleAddBreak}
                                className="mt-2 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase rounded-xl transition h-10 flex items-center justify-center"
                            >
                                Add Custom Break
                            </button>
                        </div>

                        <div className="flex flex-col gap-2 max-h-[180px] overflow-y-auto pr-1">
                            {(!activeAiSettings.breaks || activeAiSettings.breaks.length === 0) ? (
                                <span className="text-[10px] text-slate-400 italic">No breaks configured</span>
                            ) : (
                                activeAiSettings.breaks.map(b => (
                                    <div key={b.id} className="flex justify-between items-center bg-slate-800 p-2 rounded border border-slate-700 text-xs">
                                        <span className="text-white font-semibold">{b.title} ({b.day}): {formatTime12h(b.start)} - {formatTime12h(b.end)}</span>
                                        <button type="button" onClick={() => handleRemoveBreak(b.id)} className="text-red-500 hover:text-red-400 font-bold px-1">✕</button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Special Circumstances & Dates Off Sub-section */}
                    <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700 flex flex-col gap-3">
                        <span className="text-[9px] uppercase font-bold text-slate-300">Special Circumstances & Dates Off</span>

                        <div className="flex flex-col gap-2">
                            <div className="grid grid-cols-1 gap-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] text-slate-300 uppercase font-bold">Start Date</label>
                                        <input
                                            type="date"
                                            value={newSpecialStartDate}
                                            onChange={(e) => setNewSpecialStartDate(e.target.value)}
                                            className="px-3 bg-slate-800 text-xs rounded border border-slate-700 text-white w-full font-medium h-10"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] text-slate-300 uppercase font-bold">End Date (Opt)</label>
                                        <input
                                            type="date"
                                            value={newSpecialEndDate}
                                            onChange={(e) => setNewSpecialEndDate(e.target.value)}
                                            className="px-3 bg-slate-800 text-xs rounded border border-slate-700 text-white w-full font-medium h-10"
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] text-slate-300 uppercase font-bold">Reason</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Holiday, Vacation"
                                        value={newSpecialReason}
                                        onChange={(e) => setNewSpecialReason(e.target.value)}
                                        className="px-3 bg-slate-800 text-xs rounded border border-slate-700 text-white w-full h-10"
                                    />
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleAddSpecialDate}
                                className="mt-1 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase rounded-xl transition h-10 flex items-center justify-center"
                            >
                                Add Date Range
                            </button>
                        </div>

                        <div className="flex flex-col gap-2 max-h-[180px] overflow-y-auto pr-1 mt-1">
                            {(!activeAiSettings.specialDates || activeAiSettings.specialDates.length === 0) ? (
                                <span className="text-[10px] text-slate-400 italic">No custom off-dates configured</span>
                            ) : (
                                activeAiSettings.specialDates.map(item => (
                                    <div key={item.id} className="flex justify-between items-center bg-slate-800 p-2 rounded border border-slate-700 text-xs">
                                        <span className="text-white font-semibold">{formatDisplayDate(item.date)} — {item.reason}</span>
                                        <button type="button" onClick={() => handleRemoveSpecialDate(item.id)} className="text-red-500 hover:text-red-400 font-bold">✕</button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                </div>
            </div>

        </div>
    );
};

window.SettingsPage = SettingsPage;