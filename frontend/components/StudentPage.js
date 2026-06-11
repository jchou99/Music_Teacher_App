// components/StudentPage.js
const StudentPage = ({
  students,
  lessons,
  studentSearch,
  setStudentSearch,
  showStudentDropdown,
  setShowStudentDropdown,
  selectedStudentId,
  setSelectedStudentId,
  currentStudent,
  openBaseScheduleModal,
  reminderInput,
  setReminderInput,
  addReminder,
  removeReminder,
  updateReminder,
  removeEvent,
  removeNote,
  updateNote,
  studentReminders,
  newEventTitle,
  setNewEventTitle,
  newEventDateTime,
  setNewEventDateTime,
  newEventTag,
  setNewEventTag,
  newEventLocation,
  setNewEventLocation,
  addEvent,
  studentEvents,
  lessonNoteInput,
  setLessonNoteInput,
  saveLessonNote,
  savedLessonNotes,
  expandedNotes,
  toggleNoteExpand,
  filteredStudents,
  currentEvents,
  toggleActiveStatus,
  onOpenLevelModal,
  studentContacts,
  addStudent,
  newStudentFirstName,
  setNewStudentFirstName,
  newStudentLastName,
  setNewStudentLastName,
  newStudentLevel,
  setNewStudentLevel,
  newStudentBaseWeekday,
  setNewStudentBaseWeekday,
  newStudentBaseTime,
  setNewStudentBaseTime,
  isAddDisabled,
  editingContact,
  setEditingContact,
  contactInfo,
  setContactInfo,
  onSaveContact,
  openScheduleModal,
  removeStudent,
  updateStudentEvent,
  customLevels = [],
  customWeekdays = [],
  customEventTags = [],
  studentRates = {},
  saveStudentRate,
  studentUnpaid = {},
  saveStudentUnpaid,
  studentPaymentPeriods = {},
  saveStudentPaymentPeriod,
  recordDirectPayment
}) => {
  const { useState, useEffect, useRef } = React;
  const Icon = window.Icon;

  const landingSearchRef = useRef(null);
  const detailsSearchRef = useRef(null);
  const fileInputRef = useRef(null); // Reference for file uploads

  const [editingReminderId, setEditingReminderId] = useState(null);
  const [editingReminderText, setEditingReminderText] = useState("");

  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingNoteText, setEditingNoteText] = useState("");

  const [editingEventId, setEditingEventId] = useState(null);
  const [editingEventTitle, setEditingEventTitle] = useState("");
  const [editingEventDateTime, setEditingEventDateTime] = useState("");
  const [editingEventTag, setEditingEventTag] = useState("Festival");
  const [editingEventLocation, setEditingEventLocation] = useState("");
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [isEditingMultiDay, setIsEditingMultiDay] = useState(false);

  // Local inline billing edit states
  const [editingBilling, setEditingBilling] = useState(false);
  const [billingRate, setBillingRate] = useState("");
  const [customPayAmount, setCustomPayAmount] = useState("");

  // Local state for Vacation date ranges
  const [vacStartDate, setVacStartDate] = useState(window.utils.getTodayDateStr());
  const [vacEndDate, setVacEndDate] = useState(window.utils.getTodayDateStr());

  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [sortBy, setSortBy] = useState("name");

  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState([]);

  // Bind Vacation dates directly to event trigger state when Multi-day is enabled
  useEffect(() => {
    if (isMultiDay) {
      setNewEventDateTime(`${vacStartDate} to ${vacEndDate}`);
    }
  }, [vacStartDate, vacEndDate, isMultiDay]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedInsideLanding = landingSearchRef.current && landingSearchRef.current.contains(event.target);
      const clickedInsideDetails = detailsSearchRef.current && detailsSearchRef.current.contains(event.target);

      if (!clickedInsideLanding && !clickedInsideDetails) {
        setShowStudentDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [setShowStudentDropdown]);

  // -------------------------------------------------------------
  // Forgiving Parsing and Import/Export Utilities
  // -------------------------------------------------------------
  const parseImportedTime = (timeStr) => {
    if (!timeStr) return { baseTime: "12:00 PM", baseRawTime: "12:00" };
    let clean = timeStr.trim().toLowerCase();

    // Match 12h formats (e.g. "3:30 pm" or "03:30am")
    const match12h = clean.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/);
    if (match12h) {
      let h = parseInt(match12h[1], 10);
      const m = match12h[2];
      const ampm = match12h[3].toUpperCase();
      let rawH = h;
      if (ampm === "PM" && h < 12) rawH += 12;
      if (ampm === "AM" && h === 12) rawH = 0;
      return {
        baseTime: `${h}:${m} ${ampm}`,
        baseRawTime: `${rawH.toString().padStart(2, '0')}:${m}`
      };
    }

    // Match 24h/simple formats (e.g. "15:30" or "3:30")
    const match24h = clean.match(/^(\d{1,2}):(\d{2})$/);
    if (match24h) {
      let h = parseInt(match24h[1], 10);
      const m = match24h[2];
      let ampm = "AM";

      if (h >= 12) {
        ampm = "PM";
        if (h > 12) h -= 12;
      } else if (h === 0) {
        h = 12;
      } else if (h > 0 && h < 8) {
        // Safe Heuristic: Assume morning times under 8:00 are intended as PM lessons
        ampm = "PM";
      }

      let rawH = h;
      if (ampm === "PM" && h < 12) rawH = h + 12;
      return {
        baseTime: `${h}:${m} ${ampm}`,
        baseRawTime: `${rawH.toString().padStart(2, '0')}:${m}`
      };
    }

    return { baseTime: "12:00 PM", baseRawTime: "12:00" };
  };

  const capitalize = (str) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  // Forgiving value cleaner to handle blanks, "none", "null", or dashes
  const cleanImportValue = (val, defaultValue) => {
    if (!val) return defaultValue;
    const clean = val.trim().toLowerCase();
    if (clean === "" || clean === "none" || clean === "null" || clean === "-") {
      return defaultValue;
    }
    return capitalize(val.trim());
  };

  const handleExport = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(students, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "cadenza_students_backup.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      alert("Failed to export students: " + err.message);
    }
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImportFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      try {
        let importedData = [];

        if (file.name.endsWith(".json")) {
          // Parse native JSON backup
          importedData = JSON.parse(text);
          if (!Array.isArray(importedData)) {
            alert("Invalid JSON format. Backup data must be an array of student objects.");
            return;
          }
        } else {
          // Parse plain text list / CSV line-by-line
          const lines = text.split(/\r?\n/);
          for (const line of lines) {
            if (!line.trim() || line.trim().startsWith("#")) continue; // Skip comments/blanks

            const parts = line.split(",").map(p => p.trim());
            // Ensure the line has some content before processing
            const hasAnyContent = parts.some(p => p !== "");
            if (hasAnyContent) {
              const namePart = parts[0];
              const name = (namePart && namePart.trim() !== "") ? namePart.trim() : "Unnamed Student";

              // Clean values and apply intelligent defaults if empty or marked "none"
              const level = cleanImportValue(parts[1], "Beginner");
              const baseWeekday = cleanImportValue(parts[2], "Monday");

              const rawTime = parts[3];
              const timeData = (rawTime && rawTime.toLowerCase() !== "none" && rawTime.toLowerCase() !== "null" && rawTime.trim() !== "")
                ? parseImportedTime(rawTime)
                : { baseTime: "12:00 PM", baseRawTime: "12:00" };

              importedData.push({
                name,
                level,
                baseWeekday,
                baseTime: timeData.baseTime,
                baseRawTime: timeData.baseRawTime,
                isActive: true
              });
            }
          }
        }

        if (importedData.length === 0) {
          alert("No valid student profiles were found in the uploaded file.");
          return;
        }

        if (!confirm(`Are you sure you want to import ${importedData.length} students into your database?`)) {
          return;
        }

        let successCount = 0;
        for (const s of importedData) {
          // Double check the string name is populated defensively on payload submission
          const finalName = s.name && s.name.trim() !== "" ? s.name.trim() : "Unnamed Student";
          const payload = {
            name: finalName,
            level: s.level,
            baseWeekday: s.baseWeekday,
            baseTime: s.baseTime,
            baseRawTime: s.baseRawTime,
            isActive: s.isActive !== false
          };
          await window.apiService.createStudent(payload);
          successCount++;
        }

        alert(`Successfully imported ${successCount} student profiles. Refreshing studio database...`);
        window.location.reload();
      } catch (err) {
        alert("Failed to parse and import file: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleClearStudents = async () => {
    if (students.length === 0) {
      alert("There are no student profiles to clear.");
      return;
    }

    if (!confirm("Are you absolutely sure you want to delete ALL students from your database? This will also wipe out their associated lesson histories, notes, and events. This action CANNOT be undone.")) {
      return;
    }

    try {
      let clearedCount = 0;
      for (const student of students) {
        await window.apiService.deleteStudent(student.student_id);
        clearedCount++;
      }
      alert(`Successfully deleted ${clearedCount} student records. Reloading database...`);
      window.location.reload();
    } catch (err) {
      alert("Failed to clear students: " + err.message);
    }
  };

  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    let cleanStr = timeStr.trim().toLowerCase();
    const isPM = cleanStr.includes("pm");
    const isAM = cleanStr.includes("am");
    cleanStr = cleanStr.replace(/(am|pm)/g, "").trim();
    const parts = cleanStr.split(":");
    let h = parseInt(parts[0], 10) || 0;
    let m = parts[1] ? parseInt(parts[1], 10) || 0 : 0;
    if (!isPM && !isAM && h >= 1 && h <= 5) {
      h += 12;
    } else if (isPM && h < 12) {
      h += 12;
    } else if (isAM && h === 12) {
      h = 0;
    }
    return h * 60 + m;
  };

  const parseDateString = (dateStr) => {
    if (!dateStr) return 0;
    const parsed = Date.parse(dateStr);
    if (!isNaN(parsed)) return parsed;

    const parts = dateStr.split(/[\/\-\.]/);
    if (parts.length === 3) {
      const part0 = parseInt(parts[0], 10);
      const part1 = parseInt(parts[1], 10);
      const part2 = parseInt(parts[2], 10);

      if (parts[2].length === 4) {
        if (part0 > 12) {
          return new Date(part2, part1 - 1, part0).getTime() || 0;
        } else {
          return new Date(part2, part0 - 1, part1).getTime() || 0;
        }
      } else if (parts[0].length === 4) {
        return new Date(part0, part1 - 1, part2).getTime() || 0;
      }
    }
    return 0;
  };

  const sortedNotes = [...(savedLessonNotes[selectedStudentId] || [])]
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const timeA = parseDateString(a.item.date);
      const timeB = parseDateString(b.item.date);
      if (timeB !== timeA) return timeB - timeA;

      if (a.item.id && b.item.id) {
        const idA = typeof a.item.id === 'number' ? a.item.id : parseInt(a.item.id, 10);
        const idB = typeof b.item.id === 'number' ? b.item.id : parseInt(b.item.id, 10);
        if (!isNaN(idA) && !isNaN(idB) && idA !== idB) {
          return idB - idA;
        }
      }
      return b.index - a.index;
    })
    .map(x => x.item);

  // Safeguard: Falls back cleanly to prevent undefined mapping crashes on load
  const rawEvents = (studentEvents && studentEvents[selectedStudentId]) || [];
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  const sortedEvents = [...rawEvents]
    .filter(event => {
      if (!event.dateTime) return false;
      if (event.dateTime.includes(" to ")) {
        // Range-based events: keep if end date is today or future
        const [, endStr] = event.dateTime.split(" to ");
        const endTime = new Date(endStr).getTime();
        return !isNaN(endTime) && endTime >= todayMidnight.getTime();
      }
      const eventTime = new Date(event.dateTime).getTime();
      return !isNaN(eventTime) && eventTime >= todayMidnight.getTime();
    })
    .sort((a, b) => {
      const getCompareTime = (dtStr) => {
        if (dtStr.includes(" to ")) return new Date(dtStr.split(" to ")[0]).getTime() || 0;
        return new Date(dtStr).getTime() || 0;
      };
      return getCompareTime(a.dateTime) - getCompareTime(b.dateTime);
    });

  const getLevelScore = (level) => {
    if (level === "Beginner") return 1;
    if (level === "Intermediate") return 2;
    if (level === "Advanced") return 3;
    return 0;
  };

  const weekdayOrder = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const getLessonTimeScore = (student) => {
    const dayIndex = weekdayOrder.indexOf(student.baseWeekday);
    const minutes = timeToMinutes(student.baseRawTime || "00:00");
    return dayIndex * 1440 + minutes;
  };

  const getLevelLetter = (level) => {
    if (!level) return "B";
    const found = Array.isArray(customLevels) ? customLevels.find(l => l && l.name === level) : null;
    return found ? found.letter : "B";
  };

  const getTagStyle = (tagName) => {
    if (!tagName) return {};
    const tag = Array.isArray(customEventTags) ? customEventTags.find(t => t && t.name.toLowerCase() === tagName.toLowerCase()) : null;
    if (tag) {
      return {
        backgroundColor: tag.bg,
        color: tag.text,
        borderColor: tag.border,
        borderWidth: "1.5px",
        borderStyle: "solid"
      };
    }
    return {
      backgroundColor: "#fee2e2",
      color: "#991b1b",
      borderColor: "#fca5a5",
      borderWidth: "1.5px",
      borderStyle: "solid"
    };
  };

  const handleStartEventEdit = (event) => {
    setEditingEventId(event.id);
    setEditingEventTitle(event.title);
    setEditingEventDateTime(event.dateTime);
    setEditingEventTag(event.tag);
    setEditingEventLocation(event.location);
    setIsEditingMultiDay(event.dateTime && event.dateTime.includes(" to "));
  };

  const handleSaveEventEdit = async (id) => {
    if (!editingEventTitle.trim() || !editingEventDateTime || !editingEventLocation.trim()) return;

    await updateStudentEvent(id, {
      title: editingEventTitle.trim(),
      tag: editingEventTag,
      dateTime: editingEventDateTime,
      location: editingEventLocation.trim()
    });
    setEditingEventId(null);
  };

  // Standardized timezone-insensitive "YYYY-MM-DD" local date formatting inside Student Panel
  const formatEventDate = (dateTimeStr) => {
    if (!dateTimeStr) return "";
    if (dateTimeStr.includes(" to ")) {
      const [start, end] = dateTimeStr.split(" to ");
      const formatSingle = (isoStr) => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(isoStr)) {
          const [yr, mn, dy] = isoStr.split("-").map(num => parseInt(num, 10));
          const localDate = new Date(yr, mn - 1, dy);
          return localDate.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
        }
        const d = new Date(isoStr);
        if (isNaN(d.getTime())) return isoStr;
        return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
      };
      return `${formatSingle(start)} – ${formatSingle(end)}`;
    }
    const d = new Date(dateTimeStr);
    if (isNaN(d.getTime())) return dateTimeStr;
    return d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  };

  const filterOptions = [
    { key: "active", label: "Active Only", category: "status" },
    { key: "inactive", label: "Inactive Only", category: "status" },
    { key: "level-Beginner", label: "Beginner Level", category: "level" },
    { key: "level-Intermediate", label: "Intermediate Level", category: "level" },
    { key: "level-Advanced", label: "Advanced Level", category: "level" },
    { key: "day-Sunday", label: "Sunday", category: "day", value: "Sunday" },
    { key: "day-Monday", label: "Monday", category: "day", value: "Monday" },
    { key: "day-Tuesday", label: "Tuesday", category: "day", value: "Tuesday" },
    { key: "day-Wednesday", label: "Wednesday", category: "day", value: "Wednesday" },
    { key: "day-Thursday", label: "Thursday", category: "day", value: "Thursday" },
    { key: "day-Friday", label: "Friday", category: "day", value: "Friday" },
    { key: "day-Saturday", label: "Saturday", category: "day", value: "Saturday" }
  ];

  const handleCheckboxToggle = (key) => {
    if (selectedFilters.includes(key)) {
      setSelectedFilters(selectedFilters.filter(f => f !== key));
    } else {
      setSelectedFilters([...selectedFilters, key]);
    }
  };

  const filteredDirectoryList = students.filter(student => {
    if (studentSearch && studentSearch.trim() !== "") {
      const searchVal = studentSearch.toLowerCase();
      const matchesSearch =
        (student.name && student.name.toLowerCase().includes(searchVal)) ||
        (student.level && student.level.toLowerCase().includes(searchVal)) ||
        (student.baseWeekday && student.baseWeekday.toLowerCase().includes(searchVal));

      const isViewingActiveStudentWithoutModal = selectedStudentId;

      if (!isViewingActiveStudentWithoutModal && !matchesSearch) {
        return false;
      }
    }

    const activeStatusFilters = selectedFilters.filter(f => f === "active" || f === "inactive");
    const activeLevelFilters = selectedFilters.filter(f => f.startsWith("level-")).map(f => f.replace("level-", ""));
    const activeDayFilters = selectedFilters.filter(f => f.startsWith("day-")).map(f => f.replace("day-", ""));

    if (activeStatusFilters.length > 0) {
      const isActive = student.isActive !== false;
      const matchesActive = activeStatusFilters.includes("active") && isActive;
      const matchesInactive = activeStatusFilters.includes("inactive") && !isActive;
      if (!matchesActive && !matchesInactive) return false;
    }

    if (activeLevelFilters.length > 0) {
      if (!activeLevelFilters.includes(student.level)) return false;
    }

    if (activeDayFilters.length > 0) {
      if (!activeDayFilters.includes(student.baseWeekday)) return false;
    }

    return true;
  });

  const sortedDirectoryList = [...filteredDirectoryList].sort((a, b) => {
    if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    }
    if (sortBy === "level") {
      const scoreA = getLevelScore(a.level);
      const scoreB = getLevelScore(b.level);
      if (scoreA !== scoreB) return scoreA - scoreB;
      return a.name.localeCompare(b.name);
    }
    if (sortBy === "lessonTime") {
      const scoreA = getLessonTimeScore(a);
      const scoreB = getLessonTimeScore(b);
      if (scoreA !== scoreB) return scoreA - scoreB;
      return a.name.localeCompare(b.name);
    }
    return 0;
  });

  if (!selectedStudentId) {
    return (
      <div className="w-full max-w-3xl mx-auto flex flex-col gap-6">
        <div className="flex justify-between items-center w-full animate-fade-in">
          <h2 className="text-3xl font-bold text-white font-serif">Student List</h2>
          <div className="flex items-center gap-2">
            {/* Hidden Input for handling JSON and TXT/CSV Uploads */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportFile}
              accept=".json,.txt,.csv"
              className="hidden"
            />
            <button
              onClick={handleImportClick}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-slate-100 transition shadow-sm btn-align cursor-pointer"
              title="Import students from plain text, CSV, or JSON backup"
            >
              Import
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-slate-100 transition shadow-sm btn-align cursor-pointer"
              title="Export students to JSON backup"
            >
              Export
            </button>
            <button
              onClick={handleClearStudents}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-500/30 font-bold text-xs rounded-xl transition shadow-sm btn-align cursor-pointer"
              title="Delete all students permanently"
            >
              Clear List
            </button>
            <button
              onClick={() => setShowAddStudentModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 border border-slate-700 rounded-xl text-xs font-bold text-white transition shadow-sm btn-align cursor-pointer"
              title="Add New Student"
            >
              <Icon name="plus" className="w-4 h-4 text-white" /> Add
            </button>
          </div>
        </div>

        <div ref={landingSearchRef} className={`relative w-full shrink-0 ${showStudentDropdown ? "search-container-active" : ""}`}>
          <input
            type="text"
            placeholder="Search students..."
            value={studentSearch}
            onChange={(e) => {
              setStudentSearch(e.target.value);
              setShowStudentDropdown(e.target.value.trim() !== "");
            }}
            onFocus={() => {
              if (studentSearch && studentSearch.trim() !== "") {
                setShowStudentDropdown(true);
              }
            }}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />

          {showStudentDropdown && (
            <div className="dropdown-box absolute mt-2 w-full bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
              {filteredStudents.length > 0 ? (
                filteredStudents.slice(0, 5).map(student => (
                  <button
                    key={student.student_id}
                    onClick={() => {
                      setSelectedStudentId(student.student_id);
                      setStudentSearch("");
                      setShowStudentDropdown(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-slate-700 border-b border-slate-700 last:border-none text-white text-sm"
                  >
                    <div className="font-semibold text-white">{student.name}</div>
                    <div className="text-xs text-slate-100">{student.level}</div>
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-sm text-slate-100">No students found</div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2 bg-transparent p-4 rounded-xl border border-slate-800 overflow-visible relative">
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] uppercase text-slate-300 font-bold tracking-wider px-1">Sort Directory</label>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-3 pr-10 py-2.5 text-xs text-white appearance-none select-none font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer h-10"
              >
                <option value="name">Name</option>
                <option value="level">Level</option>
                <option value="lessonTime">Lesson Time</option>
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 relative">
            <label className="text-[9px] uppercase text-slate-300 font-bold tracking-wider px-1">Filter Students</label>
            <div className="relative">
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className={`w-full bg-slate-800 border border-slate-700 pl-3 pr-10 py-2.5 text-xs text-white select-none font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500 text-left truncate flex items-center justify-between h-10 cursor-pointer transition-all ${showFilterDropdown ? "rounded-t-xl rounded-b-none border-b-0" : "rounded-xl"
                  }`}
              >
                <span>
                  {selectedFilters.length === 0
                    ? "All Students (No Filters)"
                    : `${selectedFilters.length} Filters Active`}
                </span>
                <span className="text-slate-400 shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </span>
              </button>

              {showFilterDropdown && (
                <div className="absolute left-0 right-0 z-50 mt-0 bg-slate-900 border border-slate-700 border-t-0 rounded-b-xl max-h-64 overflow-y-auto shadow-2xl p-2.5 flex flex-col gap-1 font-semibold">
                  {selectedFilters.length > 0 && (
                    <button
                      onClick={() => setSelectedFilters([])}
                      className="text-left text-[10px] text-indigo-900 hover:text-indigo-950 font-bold px-2 py-1 border-b border-slate-700 pb-1.5 mb-1.5 cursor-pointer"
                    >
                      ✕ Clear All Filters
                    </button>
                  )}

                  <div className="px-2 py-0.5 text-[8.5px] uppercase font-bold text-slate-400">General</div>
                  {filterOptions.filter(o => o.category === "status").map(opt => (
                    <label key={opt.key} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800 rounded-lg cursor-pointer text-xs text-white select-none">
                      <input
                        type="checkbox"
                        checked={selectedFilters.includes(opt.key)}
                        onChange={() => handleCheckboxToggle(opt.key)}
                        className="rounded border-slate-600 bg-slate-700 text-purple-600 focus:ring-purple-500 h-3.5 w-3.5 cursor-pointer"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}

                  <div className="px-2 py-0.5 text-[8.5px] uppercase font-bold text-slate-400 mt-2">Levels</div>
                  {filterOptions.filter(o => o.category === "level").map(opt => (
                    <label key={opt.key} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800 rounded-lg cursor-pointer text-xs text-white select-none">
                      <input
                        type="checkbox"
                        checked={selectedFilters.includes(opt.key)}
                        onChange={() => handleCheckboxToggle(opt.key)}
                        className="rounded border-slate-600 bg-slate-700 text-purple-600 focus:ring-purple-500 h-3.5 w-3.5 cursor-pointer"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}

                  <div className="px-2 py-0.5 text-[8.5px] uppercase font-bold text-slate-400 mt-2">Weekdays</div>
                  {filterOptions.filter(o => o.category === "day").map(opt => (
                    <label key={opt.key} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800 rounded-lg cursor-pointer text-xs text-white select-none">
                      <input
                        type="checkbox"
                        checked={selectedFilters.includes(opt.key)}
                        onChange={() => handleCheckboxToggle(opt.key)}
                        className="rounded border-slate-600 bg-slate-700 text-purple-600 focus:ring-purple-500 h-3.5 w-3.5 cursor-pointer"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 pr-1 animate-fade-in">
          {sortedDirectoryList.length === 0 ? (
            <div className="text-center text-xs text-slate-300 italic py-8">No students found.</div>
          ) : (
            sortedDirectoryList.map(student => {
              const isActive = student.isActive !== false;
              return (
                <div
                  key={student.student_id}
                  onClick={() => {
                    setSelectedStudentId(student.student_id);
                    setStudentSearch("");
                  }}
                  className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 hover:border-purple-500/40 cursor-pointer flex justify-between items-center transition"
                >
                  <div className="min-w-0 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm truncate">{student.name}</span>
                      <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                        }`}>
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-100 mt-1">
                      Level: {student.level} • {student.baseWeekday} at {student.baseTime}
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => openScheduleModal(student)}
                      className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition"
                    >
                      Reschedule
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to remove ${student.name}?`)) {
                          removeStudent(student.student_id);
                        }
                      }}
                      className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {showAddStudentModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 w-full max-w-md relative">
              <button
                onClick={() => setShowAddStudentModal(false)}
                className="absolute top-4 right-4 text-slate-100 hover:text-white font-bold"
              >
                ✕
              </button>

              <div className="mb-6">
                <h3 className="text-2xl font-bold text-white">Add Student</h3>
                <p className="text-xs text-slate-100 mt-1">Quickly register a new student profile</p>
              </div>

              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-100 uppercase tracking-wider px-1">Name</label>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="First Name"
                      value={newStudentFirstName}
                      onChange={(e) => setNewStudentFirstName(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white h-12"
                    />
                    <input
                      type="text"
                      placeholder="Last Name"
                      value={newStudentLastName}
                      onChange={(e) => setNewStudentLastName(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white h-12"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-100 uppercase tracking-wider px-1">Level</label>
                  <div className="relative">
                    <select
                      value={newStudentLevel}
                      onChange={(e) => setNewStudentLevel(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-4 pr-12 py-3 text-white appearance-none select-none h-12"
                    >
                      <option value="">Select Level</option>
                      {customLevels.map(level => (
                        <option key={level.name} value={level.name}>{level.name}</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-100 uppercase tracking-wider px-1">Lesson Time</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <select
                        value={newStudentBaseWeekday}
                        onChange={(e) => setNewStudentBaseWeekday(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-4 pr-12 py-3 text-white appearance-none select-none h-12"
                      >
                        {customWeekdays.map(day => (
                          <option key={day} value={day}>{day}</option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    <input
                      type="time"
                      value={newStudentBaseTime}
                      onChange={(e) => setNewStudentBaseTime(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white h-12"
                    />
                  </div>
                </div>

                <button
                  onClick={async () => {
                    await addStudent();
                    setShowAddStudentModal(false);
                  }}
                  disabled={isAddDisabled}
                  className={`w-full py-3 font-semibold rounded-xl transition-all duration-200 mt-4 h-12 flex items-center justify-center ${isAddDisabled
                    ? "bg-purple-600 text-white cursor-not-allowed opacity-40"
                    : "bg-purple-600 hover:bg-purple-500 text-white cursor-pointer"
                    }`}
                >
                  Add Student
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  // Billing derived values — must be declared before the detail view return
  const getDurationByLevel = (level) => {
    if (!level) return 30;
    const custom = Array.isArray(customLevels) ? customLevels.find(l => l && l.name === level) : null;
    if (custom && custom.duration) return custom.duration;
    if (level === "Beginner") return 30;
    if (level === "Intermediate") return 45;
    if (level === "Advanced") return 60;
    return 30;
  };
  const durationInMinutes = getDurationByLevel(currentStudent?.level);
  const currentRate = (studentRates && currentStudent) ? (studentRates[currentStudent.student_id] || 0) : 0;
  const unpaidLessons = (studentUnpaid && currentStudent) ? (studentUnpaid[currentStudent.student_id] || 0) : 0;
  const lessonPrice = (parseFloat(currentRate) || 0) * (durationInMinutes / 60);
  const balanceOwed = unpaidLessons * lessonPrice;

  return (
    <div className="flex flex-col items-center gap-6">

      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-14 mb-2 shrink-0">
        <div className="flex items-center justify-start">
          <button
            onClick={() => {
              setSelectedStudentId(null);
              setStudentSearch("");
            }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-slate-100 transition shadow-sm shrink-0"
            title="Back to Student List"
          >
            ← Back to List
          </button>
        </div>

        <div className="flex gap-2 items-center w-full justify-center">
          <div ref={detailsSearchRef} className={`relative flex-1 ${showStudentDropdown ? "search-container-active" : ""}`}>
            <input
              type="text"
              placeholder="Quick switch student..."
              value={studentSearch}
              onChange={(e) => {
                setStudentSearch(e.target.value);
                setShowStudentDropdown(e.target.value.trim() !== "");
              }}
              onFocus={() => {
                if (studentSearch && studentSearch.trim() !== "") {
                  setShowStudentDropdown(true);
                }
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />

            {showStudentDropdown && (
              <div className="dropdown-box absolute mt-2 w-full bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
                {filteredStudents.length > 0 ? (
                  filteredStudents.slice(0, 5).map(student => (
                    <button
                      key={student.student_id}
                      onClick={() => {
                        setSelectedStudentId(student.student_id);
                        setStudentSearch("");
                        setShowStudentDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2.5 hover:bg-slate-700 border-b border-slate-700 last:border-none text-white text-xs"
                    >
                      <div className="font-semibold text-white">{student.name}</div>
                      <div className="text-[10px] text-slate-100">{student.level}</div>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2.5 text-xs text-slate-100">No students found</div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="hidden lg:block"></div>
      </div>

      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-14">

        {/* COLUMN 1: Profile and Contacts */}
        <div className="flex flex-col gap-6 lg:col-span-1 lg:h-[720px]">
          {/* Profile Card */}
          <div className="bg-slate-800/40 rounded-2xl p-6 border border-slate-800 flex flex-col gap-5 relative shrink-0">
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <button
                onClick={() => toggleActiveStatus(currentStudent.student_id)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold tracking-wide transition-all ${currentStudent.isActive === false
                  ? 'border-red-500/30 text-red-500 bg-red-500/5 hover:bg-red-500/10'
                  : 'border-emerald-500/30 text-emerald-600 bg-emerald-500/5 hover:bg-emerald-500/10'
                  }`}
                title={currentStudent.isActive === false ? "Click to Activate" : "Click to Deactivate"}
              >
                {currentStudent.isActive === false ? "Inactive" : "Active"}
              </button>
            </div>

            <div className="flex items-center gap-3 pr-32">
              <div
                onClick={() => onOpenLevelModal(currentStudent)}
                className="w-10 h-10 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-400 text-sm shrink-0 cursor-pointer hover:bg-indigo-600/35 transition"
                title="Click to change student level"
              >
                {getLevelLetter(currentStudent?.level)}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-white text-base truncate">{currentStudent?.name}</h3>
                <p className="text-xs text-indigo-800 font-semibold">{currentStudent?.level}</p>
              </div>
            </div>

            <div
              onClick={() => openBaseScheduleModal(currentStudent)}
              className="bg-slate-900/80 p-4 rounded-xl text-center border border-slate-700 cursor-pointer hover:bg-slate-900 transition select-none relative group"
            >
              <div className="text-[10px] uppercase tracking-wider font-bold text-slate-100 mb-2 group-hover:text-indigo-500 transition">Lesson Time</div>
              {currentStudent?.baseWeekday ? (
                <div>
                  <div className="text-lg font-bold text-indigo-800 mb-0.5">{currentStudent.baseWeekday}</div>
                  <div className="text-xl font-bold text-white">{currentStudent.baseTime}</div>
                  <span className="text-[9px] text-slate-100 group-hover:text-slate-100 mt-2 block font-medium">Click to Change Time ✎</span>
                </div>
              ) : (
                <div>
                  <div className="text-sm font-semibold text-slate-100 py-1">No schedule configured</div>
                  <span className="text-[9px] text-slate-100 mt-1 block">Click to Schedule ✎</span>
                </div>
              )}
            </div>
          </div>

          {/* Contact Details Card */}
          <div className="bg-slate-800/40 rounded-2xl p-6 border border-slate-800 flex flex-col gap-4 flex-1 min-h-0">
            <div className="flex items-center justify-between shrink-0">
              <h4 className="font-bold text-white text-sm uppercase tracking-wider">Contacts</h4>
              <button
                onClick={() => editingContact ? onSaveContact() : setEditingContact(true)}
                className="text-xs px-3 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 border border-indigo-500/30 font-semibold transition animate-fade-in"
              >
                {editingContact ? "Save" : "Edit"}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-1 mt-1 min-h-0">
              <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-700 flex flex-col gap-2.5 shrink-0">
                <span className="text-[10px] uppercase text-indigo-400 font-bold tracking-wider">Student Contact</span>
                {editingContact ? (
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      placeholder="Student Name"
                      className="bg-slate-800 p-2 rounded text-xs text-white border border-slate-700 w-full h-[38px]"
                      value={contactInfo.studentName || ""}
                      onChange={(e) => setContactInfo({ ...contactInfo, studentName: e.target.value })}
                    />
                    <input
                      type="text"
                      placeholder="student@email.com"
                      className="bg-slate-800 p-2 rounded text-xs text-white border border-slate-700 w-full h-[38px]"
                      value={contactInfo.studentEmail || ""}
                      onChange={(e) => setContactInfo({ ...contactInfo, studentEmail: e.target.value })}
                    />
                    <input
                      type="text"
                      placeholder="Phone Number"
                      className="bg-slate-800 p-2 rounded text-xs text-white border border-slate-700 w-full h-[38px]"
                      value={contactInfo.studentPhone || ""}
                      onChange={(e) => setContactInfo({ ...contactInfo, studentPhone: e.target.value })}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <p className="text-white font-semibold text-sm">{contactInfo.studentName || "No Student Name"}</p>
                    {contactInfo.studentEmail && (
                      <p className="text-xs text-slate-100 font-medium flex items-center gap-1.5">
                        <Icon name="mail" className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{contactInfo.studentEmail}</span>
                      </p>
                    )}
                    {contactInfo.studentPhone && (
                      <p className="text-xs text-slate-100 font-medium flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 text-slate-400 shrink-0">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.387a12.017 12.017 0 0 1-4.5-4.5c-.155-.44.01-1.047.387-1.328l1.293-.97a1.125 1.125 0 0 0 .417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                        </svg>
                        <span>{contactInfo.studentPhone}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-700 flex flex-col gap-2.5 shrink-0">
                <span className="text-[10px] uppercase text-indigo-400 font-bold tracking-wider">Parent Contact</span>
                {editingContact ? (
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      placeholder="Parent Name"
                      className="bg-slate-800 p-2 rounded text-xs text-white border border-slate-700 w-full h-[38px]"
                      value={contactInfo.parentName || ""}
                      onChange={(e) => setContactInfo({ ...contactInfo, parentName: e.target.value })}
                    />
                    <input
                      type="text"
                      placeholder="parent@email.com"
                      className="bg-slate-800 p-2 rounded text-xs text-white border border-slate-700 w-full h-[38px]"
                      value={contactInfo.parentEmail || ""}
                      onChange={(e) => setContactInfo({ ...contactInfo, parentEmail: e.target.value })}
                    />
                    <input
                      type="text"
                      placeholder="Parent Phone"
                      className="bg-slate-800 p-2 rounded text-xs text-white border border-slate-700 w-full h-[38px]"
                      value={contactInfo.parentPhone || ""}
                      onChange={(e) => setContactInfo({ ...contactInfo, parentPhone: e.target.value })}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <p className="text-white font-semibold text-sm">{contactInfo.parentName || "No Parent Added"}</p>
                    {contactInfo.parentEmail && (
                      <p className="text-xs text-slate-100 font-medium flex items-center gap-1.5">
                        <Icon name="mail" className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{contactInfo.parentEmail}</span>
                      </p>
                    )}
                    {contactInfo.parentPhone && (
                      <p className="text-xs text-slate-100 font-medium flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 text-slate-400 shrink-0">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.387a12.017 12.017 0 0 1-4.5-4.5c-.155-.44.01-1.047.387-1.328l1.293-.97a1.125 1.125 0 0 0 .417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                        </svg>
                        <span>{contactInfo.parentPhone}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* COLUMN 2: Upcoming Events */}
        <div className="bg-slate-800/40 rounded-2xl p-6 border border-slate-800 flex flex-col gap-4 lg:h-[720px]">
          <div className="flex items-center justify-between shrink-0">
            <h4 className="font-bold text-white text-sm uppercase tracking-wider">Upcoming Events</h4>
            <span className="text-[10px] text-indigo-900 font-bold bg-indigo-100 px-2 py-0.5 rounded-full border border-indigo-300">
              {sortedEvents.length} Scheduled
            </span>
          </div>
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700 flex flex-col gap-3.5 shrink-0">
            <div className="text-[10px] font-bold text-slate-100 uppercase tracking-wider border-b border-slate-700/50 pb-1.5 mb-0.5">Add New Event</div>

            {/* Event Title with Label */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-100 uppercase tracking-wider px-1">Event Title</label>
              <input
                type="text"
                placeholder="Event Title"
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
                className="w-full px-3 rounded-lg text-xs text-slate-100 border border-slate-700 bg-white h-10"
              />
            </div>

            {/* Custom Tag Selector container with Conditional Date/Time input options */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1 w-full">
                <span className="text-[10px] font-bold text-slate-100 uppercase tracking-wider px-1">Event Tag</span>
                <select
                  value={newEventTag}
                  onChange={(e) => setNewEventTag(e.target.value)}
                  className="p-2.5 rounded-lg text-xs appearance-none text-slate-100 border border-slate-700 bg-white w-full cursor-pointer h-10"
                >
                  {customEventTags.map(tag => (
                    <option key={tag.id} value={tag.name}>{tag.name}</option>
                  ))}
                </select>
              </div>

              {/* Optional Multi-day selector checkbox inside Student Panel */}
              <div className="flex items-center gap-2 pt-1">
                <label className="flex items-center gap-1.5 text-[10px] text-slate-100 font-bold uppercase cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isMultiDay}
                    onChange={(e) => {
                      setIsMultiDay(e.target.checked);
                      if (e.target.checked) {
                        setNewEventDateTime(`${vacStartDate} to ${vacEndDate}`);
                      } else {
                        setNewEventDateTime("");
                      }
                    }}
                    className="rounded border-slate-600 bg-slate-700 text-purple-600 focus:ring-purple-500 h-3.5 w-3.5"
                  />
                  <span>Multi-day Event / Date Range</span>
                </label>
              </div>

              {isMultiDay ? (
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-100 uppercase tracking-wider px-1">Start Date</span>
                    <input
                      type="date"
                      value={vacStartDate}
                      onChange={(e) => setVacStartDate(e.target.value)}
                      className="p-2.5 rounded-lg text-xs text-slate-100 border border-slate-700 bg-white h-10"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-100 uppercase tracking-wider px-1">End Date</span>
                    <input
                      type="date"
                      value={vacEndDate}
                      onChange={(e) => setVacEndDate(e.target.value)}
                      className="p-2.5 rounded-lg text-xs text-slate-100 border border-slate-700 bg-white h-10"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1 col-span-2">
                  <span className="text-[10px] font-bold text-slate-100 uppercase tracking-wider px-1">Date & Time</span>
                  <input
                    type="datetime-local"
                    value={newEventDateTime}
                    onChange={(e) => setNewEventDateTime(e.target.value)}
                    className="p-2.5 rounded-lg text-xs text-slate-100 border border-slate-700 bg-white w-full h-10"
                  />
                </div>
              )}
            </div>

            {/* Location with Label */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-100 uppercase tracking-wider px-1">Location</label>
              <input
                type="text"
                placeholder="Location"
                value={newEventLocation}
                onChange={(e) => setNewEventLocation(e.target.value)}
                className="w-full px-3 rounded-lg text-xs text-slate-100 border border-slate-700 bg-white h-10"
              />
            </div>

            <button
              onClick={addEvent}
              disabled={!newEventTitle.trim() || !newEventDateTime || !newEventLocation.trim()}
              className={`w-full py-2.5 font-bold text-xs uppercase rounded-xl transition flex items-center justify-center gap-2 h-10 ${(!newEventTitle.trim() || !newEventDateTime || !newEventLocation.trim())
                  ? "bg-purple-600 text-white cursor-not-allowed opacity-40"
                  : "bg-purple-600 hover:bg-purple-500 text-white cursor-pointer"
                }`}
            >
              Create Event
            </button>
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1 mt-3 min-h-0">
            {sortedEvents.length === 0 ? (
              <div className="text-center text-xs text-slate-100 py-12 my-auto font-medium">No upcoming events scheduled.</div>
            ) : (
              sortedEvents.map(event => {
                const isGlobal = event.location && event.location.endsWith("\u200b");
                const displayLocation = isGlobal ? event.location.replace(/\u200b/g, "") : (event.location || "");

                return (
                  <div key={event.id} className="bg-slate-900/40 p-3 rounded-xl border border-slate-700 text-xs flex flex-col gap-2 relative shrink-0 text-slate-100 font-semibold h-auto pr-10 min-h-[56px]">
                    {editingEventId === event.id ? (
                      <div className="flex flex-col gap-2.5 w-full">
                        <span className="text-[10px] uppercase font-bold text-slate-300">Edit Event</span>
                        <input
                          type="text"
                          value={editingEventTitle}
                          onChange={(e) => setEditingEventTitle(e.target.value)}
                          className="bg-slate-800 p-2 rounded text-xs text-white border border-slate-700 w-full h-10"
                          placeholder="Event Title"
                        />

                        <div className="flex items-center gap-2 pb-1">
                          <label className="flex items-center gap-1 text-[9px] text-slate-300 font-bold uppercase cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isEditingMultiDay}
                              onChange={(e) => {
                                setIsEditingMultiDay(e.target.checked);
                                if (e.target.checked) {
                                  setEditingEventDateTime(`${window.utils.getTodayDateStr()} to ${window.utils.getTodayDateStr()}`);
                                } else {
                                  setEditingEventDateTime("");
                                }
                              }}
                              className="rounded border-slate-600 bg-slate-700 text-purple-600 focus:ring-purple-500 h-3 w-3"
                            />
                            <span>Multi-day Range</span>
                          </label>
                        </div>

                        {isEditingMultiDay ? (
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="date"
                              value={editingEventDateTime.split(" to ")[0] || window.utils.getTodayDateStr()}
                              onChange={(e) => {
                                const endPart = editingEventDateTime.split(" to ")[1] || window.utils.getTodayDateStr();
                                setEditingEventDateTime(`${e.target.value} to ${endPart}`);
                              }}
                              className="bg-slate-800 p-2 rounded text-xs text-white border border-slate-700 w-full h-10"
                            />
                            <input
                              type="date"
                              value={editingEventDateTime.split(" to ")[1] || window.utils.getTodayDateStr()}
                              onChange={(e) => {
                                const startPart = editingEventDateTime.split(" to ")[0] || window.utils.getTodayDateStr();
                                setEditingEventDateTime(`${startPart} to ${e.target.value}`);
                              }}
                              className="bg-slate-800 p-2 rounded text-xs text-white border border-slate-700 w-full h-10"
                            />
                          </div>
                        ) : (
                          <input
                            type="datetime-local"
                            value={editingEventDateTime}
                            onChange={(e) => setEditingEventDateTime(e.target.value)}
                            className="bg-slate-800 p-2 rounded text-xs text-white border border-slate-700 w-full h-10"
                          />
                        )}

                        <select
                          value={editingEventTag}
                          onChange={(e) => setEditingEventTag(e.target.value)}
                          className="bg-slate-800 p-2 rounded text-xs text-white border border-slate-700 h-10"
                        >
                          {customEventTags.map(tag => (
                            <option key={tag.id} value={tag.name}>{tag.name}</option>
                          ))}
                        </select>

                        <input
                          type="text"
                          value={editingEventLocation}
                          onChange={(e) => setEditingEventLocation(e.target.value)}
                          className="bg-slate-800 p-2 rounded text-xs text-white border border-slate-700 w-full h-10"
                          placeholder="Location"
                        />

                        <div className="flex gap-2 mt-1">
                          <button
                            onClick={() => handleSaveEventEdit(event.id)}
                            disabled={!editingEventTitle.trim() || !editingEventDateTime || !editingEventLocation.trim()}
                            className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 border border-emerald-500/30 font-bold text-[10px] px-2.5 py-1.5 rounded transition disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingEventId(null)}
                            className="bg-slate-500/10 hover:bg-slate-500/20 text-slate-700 border border-slate-500/30 font-bold text-[10px] px-2.5 py-1.5 rounded transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start gap-2 pr-6">
                          <h5 className="font-bold text-white text-sm leading-tight">{event.title}</h5>
                          <span
                            style={getTagStyle(event.tag)}
                            className="px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase shrink-0 transition-all"
                          >
                            {event.tag}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1 text-slate-100 text-[11px] pr-6 font-semibold">
                          <div className="flex items-center gap-1.5">
                            <Icon name="calendar" className="w-3.5 h-3.5 text-indigo-800" />
                            <span>{formatEventDate(event.dateTime)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 text-indigo-800 shrink-0">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                            </svg>
                            <span>{displayLocation}</span>
                          </div>
                        </div>

                        <div className="absolute right-3 top-0 bottom-0 flex flex-col justify-center gap-2 z-10">
                          <button
                            onClick={() => removeEvent(event.id)}
                            className="text-slate-100 hover:text-red-500 transition font-bold p-0.5 text-xs"
                            title="Delete event"
                          >
                            ✕
                          </button>
                          <button
                            onClick={() => handleStartEventEdit(event)}
                            className="text-slate-100 hover:text-indigo-400 p-0.5 transition"
                            title="Edit event"
                          >
                            <Icon name="pencil" className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLUMN 3: Lesson Notes Log and Billing Section */}
        <div className="flex flex-col gap-6 lg:col-span-1 lg:h-[720px]">

          {/* Card 1: Lesson Notes Log */}
          <div className="bg-slate-800/40 rounded-2xl p-6 border border-slate-800 flex flex-col gap-4 flex-1 min-h-0">
            <h4 className="font-bold text-white text-sm uppercase tracking-wider shrink-0">Lesson Notes</h4>
            <div className="flex flex-col gap-3 shrink-0">
              <textarea
                value={lessonNoteInput}
                onChange={(e) => setLessonNoteInput(e.target.value)}
                placeholder="Type lesson progress, practice instructions, or target milestones here..."
                style={{ backgroundColor: '#ffffff', color: '#1e293b' }}
                className="w-full min-h-[120px] p-3 rounded-xl border border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={saveLessonNote}
                disabled={!lessonNoteInput.trim()}
                className={`w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm rounded-xl transition flex items-center justify-center gap-2 ${!lessonNoteInput.trim()
                  ? "bg-slate-600 text-slate-400 cursor-not-allowed opacity-50 border-none"
                  : "bg-purple-600 hover:bg-purple-500 text-white cursor-pointer"
                  }`}
              >
                Save Lesson Note
              </button>
            </div>

            <div className="flex-1 mt-1 pt-2 overflow-y-auto flex flex-col gap-3 pr-1 border-0 min-h-0 font-medium">
              {sortedNotes.length === 0 ? (
                <div className="text-center text-xs text-slate-100 py-12 my-auto font-normal">No lesson notes log.</div>
              ) : (
                sortedNotes.map((note, idx) => {
                  const noteKey = note.id ? `${selectedStudentId}_${note.id}` : `${selectedStudentId}_${idx}`;
                  const isExpanded = !!expandedNotes[noteKey];
                  return (
                    <div
                      key={note.id || idx}
                      onClick={() => toggleNoteExpand(selectedStudentId, note.id || idx)}
                      className="bg-slate-900/40 p-3 rounded-xl border border-slate-700 text-xs text-slate-100 flex flex-col gap-1.5 relative cursor-pointer hover:border-indigo-500 transition select-none shrink-0 h-auto pr-10 min-h-[56px]"
                    >
                      {editingNoteId === note.id ? (
                        <div className="flex flex-col gap-2 w-full" onClick={(e) => e.stopPropagation()}>
                          <textarea
                            value={editingNoteText}
                            onChange={(e) => setEditingNoteText(e.target.value)}
                            className="bg-slate-800 p-2 rounded text-xs text-white border border-slate-700 w-full min-h-[60px]"
                          />
                          <div className="flex gap-2">
                            <button onClick={async () => { await updateNote(note.id, editingNoteText, note.date); setEditingNoteId(null); }} className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 border border-emerald-500/30 font-bold text-[10px] px-2.5 py-1 rounded transition">Save</button>
                            <button onClick={() => setEditingNoteId(null)} className="bg-slate-500/10 hover:bg-slate-500/20 text-slate-700 border border-emerald-500/30 font-bold text-[10px] px-2.5 py-1 rounded transition">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-center pr-2">
                            <span className="text-[10px] text-slate-300 font-bold">{note.date}</span>
                            <span className="text-[9px] text-indigo-800 font-bold">{isExpanded ? "Collapse ▴" : "Expand ▾"}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`italic text-slate-100 leading-relaxed break-words whitespace-pre-wrap ${isExpanded ? "" : "line-clamp-1"}`}>"{note.text}"</p>
                          </div>
                        </>
                      )}
                      {editingNoteId !== note.id && (
                        <div className="absolute right-3 top-0 bottom-0 flex flex-col justify-center gap-1.5 z-10" onClick={(e) => e.stopPropagation()}>
                          <button onClick={(e) => { e.stopPropagation(); removeNote(note.id || null, idx); }} className="text-slate-100 hover:text-red-500 transition font-bold p-0.5 text-xs">✕</button>
                          <button onClick={(e) => { e.stopPropagation(); setEditingNoteId(note.id); setEditingNoteText(note.text); }} className="text-slate-100 hover:text-indigo-400 transition p-0.5"><Icon name="pencil" className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Card 2: Billing & Rates */}
          <div className="bg-slate-800/40 rounded-2xl p-6 border border-slate-800 flex flex-col gap-4 shrink-0">
            <div className="flex items-center justify-between shrink-0">
              <h4 className="font-bold text-white text-sm uppercase tracking-wider">Billing & Rates</h4>
              <button
                onClick={() => {
                  if (editingBilling) {
                    saveStudentRate(currentStudent.student_id, billingRate);
                    setEditingBilling(false);
                  } else {
                    setEditingBilling(true);
                    setBillingRate(currentRate);
                  }
                }}
                className="text-xs px-3 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 border border-indigo-500/30 font-semibold transition animate-fade-in"
              >
                {editingBilling ? "Save" : "Edit"}
              </button>
            </div>

            <div className="flex flex-col gap-3.5 px-1 mt-1">
              {editingBilling ? (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] text-slate-100 font-bold uppercase px-1">Monthly / Hourly Rate</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-100 font-bold">$</span>
                    <input
                      type="number"
                      value={billingRate}
                      onChange={(e) => setBillingRate(e.target.value)}
                      className="p-1 rounded text-xs text-slate-950 border border-slate-700 bg-white w-full text-center h-10"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-100 font-bold">Hourly Rate</span>
                    <span className="text-xs font-semibold text-slate-100">
                      ${(parseFloat(currentRate) || 0).toFixed(2)}/hr
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-100 font-bold">Money Owed</span>
                    <span className={`text-sm font-extrabold ${balanceOwed > 0 ? "text-red-500" : "text-emerald-500"}`}>
                      ${balanceOwed.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-700/30 gap-2">
                    <span className="text-xs text-slate-100 font-bold">Payment Amount</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        placeholder="0.00"
                        value={customPayAmount}
                        onChange={(e) => setCustomPayAmount(e.target.value)}
                        className="bg-white px-3 rounded text-xs text-slate-950 border border-slate-700 w-20 font-semibold text-center focus:outline-none focus:ring-1 focus:ring-purple-500 h-10"
                      />
                      <button
                        onClick={() => {
                          const payAmount = parseFloat(customPayAmount) || 0;
                          if (payAmount <= 0) {
                            alert("Please enter a valid payment amount.");
                            return;
                          }
                          const rate = parseFloat(currentRate) || 0;
                          const lessonPrice = rate * (durationInMinutes / 60);
                          const lessonsDeducted = lessonPrice > 0 ? Math.round(payAmount / lessonPrice) : 1;

                          recordDirectPayment(currentStudent, payAmount, lessonsDeducted);
                          setCustomPayAmount("");
                          alert(`Recorded payment of $${payAmount.toFixed(2)}!`);
                        }}
                        className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 border border-emerald-500/30 text-xs font-bold rounded-xl transition cursor-pointer btn-align px-4"
                      >
                        received
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

window.StudentPage = StudentPage;