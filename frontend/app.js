// app.js

function App() {
  const { useState, useEffect } = React;

  // Explicitly retrieve components and utility functions from the global window scope
  const {
    TeacherDashboard,
    StudentPage,
    CalendarPage,
    ScheduleModal,
    LevelModal,
    Icon,
    SettingsPage,
    BillingPage
  } = window;
  const { getTodayDateStr } = window.utils;

  const [activeTab, setActiveTab] = useState("teacher");
  const [backendStatus, setBackendStatus] = useState("checking");

  // State declarations
  const [lessons, setLessons] = useState([]);
  const [students, setStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [editingContact, setEditingContact] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  // Global / teacher studio reminders state
  const [globalReminders, setGlobalReminders] = useState([]);

  // Level modal state
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [selectedStudentForLevel, setSelectedStudentForLevel] = useState(null);

  // AI-assisted feature states

  // Dual-layer state initialization: Fallback immediately to local storage on boot
  const [aiSettings, setAiSettings] = useState(() => {
    const cachedSettings = localStorage.getItem("cadenza_ai_settings");
    if (cachedSettings) {
      try {
        return JSON.parse(cachedSettings);
      } catch (err) {
        console.warn("Failed to parse locally cached AI settings.", err);
      }
    }

    return {
      workingBlocks: [],
      breaks: [],
      specialDates: []
    };
  });

  // Shared state for Teacher/Studio contact profiles
  const [teacherContact, setTeacherContact] = useState(() => {
    const cached = localStorage.getItem("cadenza_teacher_contact");
    return cached ? JSON.parse(cached) : {
      studioName: "Cadenza Music Studio",
      teacherName: "Admin Teacher",
      teacherEmail: "",
      teacherPhone: ""
    };
  });

  // NEW ADMIN CONFIGURATIONS STATES WITH INDEPENDENT LOCAL STORAGE CACHING
  const [customEventTags, setCustomEventTags] = useState(() => {
    const cached = localStorage.getItem("cadenza_custom_event_tags");
    return cached ? JSON.parse(cached) : [
      { id: "recital", name: "Recital", bg: "#f3e8ff", text: "#6b21a8", border: "#d8b4fe", isMultiDay: false },
      { id: "festival", name: "Festival", bg: "#fee2e2", text: "#991b1b", border: "#fca5a5", isMultiDay: true },
      { id: "exam", name: "Exam", bg: "#fef3c7", text: "#92400e", border: "#fcd34d", isMultiDay: false },
      { id: "masterclass", name: "Masterclass", bg: "#d1fae5", text: "#065f46", border: "#6ee7b7", isMultiDay: false },
      { id: "vacation", name: "Vacation", bg: "#e0f2fe", text: "#0369a1", border: "#7dd3fc", isMultiDay: true }
    ];
  });

  const [customLevels, setCustomLevels] = useState(() => {
    const cached = localStorage.getItem("cadenza_custom_levels");
    return cached ? JSON.parse(cached) : [
      { name: "Beginner", duration: 30, letter: "B" },
      { name: "Intermediate", duration: 45, letter: "I" },
      { name: "Advanced", duration: 60, letter: "A" }
    ];
  });

  const [customWeekdays, setCustomWeekdays] = useState(() => {
    const cached = localStorage.getItem("cadenza_custom_weekdays");
    return cached ? JSON.parse(cached) : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  });

  // NEW CUSTOM PAYMENT PERIOD PLANS SCHEMAS
  const [customPaymentPeriodsConfig, setCustomPaymentPeriodsConfig] = useState(() => {
    const cached = localStorage.getItem("cadenza_custom_payment_periods_config");
    return cached ? JSON.parse(cached) : [
      { name: "Weekly", days: 7 },
      { name: "Bi-weekly", days: 14 },
      { name: "Monthly", days: 30 }
    ];
  });

  // NEW BILLING AND FINANCIAL TRACKING STATES
  const [studentRates, setStudentRates] = useState(() => {
    const cached = localStorage.getItem("cadenza_student_rates");
    return cached ? JSON.parse(cached) : {};
  });

  const [studentUnpaid, setStudentUnpaid] = useState(() => {
    const cached = localStorage.getItem("cadenza_student_unpaid");
    return cached ? JSON.parse(cached) : {};
  });

  const [studentPaymentPeriods, setStudentPaymentPeriods] = useState(() => {
    const cached = localStorage.getItem("cadenza_student_payment_periods");
    return cached ? JSON.parse(cached) : {};
  });

  const [totalEarnings, setTotalEarnings] = useState(() => {
    const cached = localStorage.getItem("cadenza_total_earnings");
    return cached ? parseFloat(cached) || 0 : 0;
  });

  const [paymentLog, setPaymentLog] = useState(() => {
    const cached = localStorage.getItem("cadenza_payment_log");
    return cached ? JSON.parse(cached) : [];
  });

  // NEW STUDIO PALETTE AND THEME SELECTION STATE
  const [theme, setTheme] = useState(() => {
    const cached = localStorage.getItem("cadenza_theme");
    const parsed = cached ? JSON.parse(cached) : null;
    return parsed ? {
      ...parsed,
      customPresets: parsed.customPresets || [] // Load custom themes from DB/cache
    } : {
      bg: "#eef8f8",
      text: "#132c2a",
      border: "#099c97",
      cardBg: "#ffffff",
      cardBgAlt: "#f0fbfb",
      brand: "#0abab5",
      brandHover: "#099c97",
      customPresets: [] // Fallback default
    };
  });

  const [contactInfo, setContactInfo] = useState({
    studentName: "",
    studentEmail: "",
    studentPhone: "",
    parentName: "",
    parentEmail: "",
    parentPhone: "",
    preferredDays: ""
  });

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const [newStudentFirstName, setNewStudentFirstName] = useState("");
  const [newStudentLastName, setNewStudentLastName] = useState("");
  const [newStudentLevel, setNewStudentLevel] = useState("");

  const [newStudentBaseWeekday, setNewStudentBaseWeekday] = useState("Monday");
  const [newStudentBaseTime, setNewStudentBaseTime] = useState("00:00");

  const [rescheduleWeekday, setRescheduleWeekday] = useState("Monday");
  const [rescheduleTime, setRescheduleTime] = useState("00:00");
  const [scheduleMode, setScheduleMode] = useState("reschedule");

  // Student detail storage states
  const [savedLessonNotes, setSavedLessonNotes] = useState({});
  const [studentContacts, setStudentContacts] = useState({});
  const [studentEvents, setStudentEvents] = useState({});
  const [studentReminders, setStudentReminders] = useState({});

  const [lessonNoteInput, setLessonNoteInput] = useState("");
  const [reminderInput, setReminderInput] = useState("");
  const [expandedNotes, setExpandedNotes] = useState({});

  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventTag, setNewEventTag] = useState("Festival");
  const [newEventDateTime, setNewEventDateTime] = useState(`${getTodayDateStr()}T00:00`);
  const [newEventLocation, setNewEventLocation] = useState("");

  const isAddDisabled = !newStudentFirstName.trim() || !newStudentLastName.trim() || !newStudentLevel;
  const currentStudent = students.find(s => String(s.student_id) === String(selectedStudentId));

  // -------------------------------------------------------------
  // Conflict Resolution Helpers & Heuristics (Dynamic Overrides)
  // -------------------------------------------------------------
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

  const minutesToTime12h = (mins) => {
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    const mStr = m.toString().padStart(2, '0');
    return `${h12}:${mStr} ${ampm}`;
  };

  // Dynamically resolve lesson duration based on the admin's level configurations
  const getDurationByLevel = (level) => {
    const found = customLevels.find(l => l.name === level);
    return found ? found.duration : 30;
  };

  // Helper utility to determine if a date falls in the current week (Sunday-Saturday) containing today
  const isSameWeekAsToday = (date) => {
    const today = new Date();
    const todayDay = today.getDay();
    const todaySunday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - todayDay);
    todaySunday.setHours(0, 0, 0, 0);

    const targetDay = date.getDay();
    const targetSunday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - targetDay);
    targetSunday.setHours(0, 0, 0, 0);

    return todaySunday.getTime() === targetSunday.getTime();
  };

  // Resolves the exact date of a weekday during the current week
  const getThisWeeksWeekdayDate = (weekdayName) => {
    const today = new Date();
    const todayDay = today.getDay();
    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const targetDay = weekdays.indexOf(weekdayName);

    const diff = targetDay - todayDay;
    const targetDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + diff);
    return targetDate.toDateString();
  };

  const findConflictingStudent = (targetStudentId, weekday, proposedRawTime, proposedLevel, studentsList, lessonsList) => {
    const proposedStart = timeToMinutes(proposedRawTime);
    const proposedDuration = getDurationByLevel(proposedLevel);
    const proposedEnd = proposedStart + proposedDuration;

    for (const student of studentsList) {
      if (String(student.student_id) === String(targetStudentId)) continue;

      const override = lessonsList.find(l => String(l.student_id) === String(student.student_id));
      let activeRawTime = null;
      let activeLevel = student.level;

      if (override) {
        if (override.weekday === weekday) {
          activeRawTime = override.rawTime;
        }
      } else {
        if (student.baseWeekday === weekday) {
          activeRawTime = student.baseRawTime;
        }
      }

      if (activeRawTime) {
        const activeStart = timeToMinutes(activeRawTime);
        const activeDuration = getDurationByLevel(activeLevel);
        const activeEnd = activeStart + activeDuration;

        if (proposedStart < activeEnd && activeStart < proposedEnd) {
          return student;
        }
      }
    }
    return null;
  };

  // Validates if an Event occurs on the same day as the student's active lesson
  const checkEventConflict = (studentId, eventDateTimeStr) => {
    const student = students.find(s => String(s.student_id) === String(studentId));
    if (!student) return null;

    const eventDate = new Date(eventDateTimeStr);
    if (isNaN(eventDate.getTime())) return null;

    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const eventWeekday = weekdays[eventDate.getDay()];
    const eventIsCurrentWeek = isSameWeekAsToday(eventDate);

    const rescheduled = lessons.find(l => String(l.student_id) === String(studentId));
    let activeRawTime = null;
    let activeLevel = student.level;

    if (eventIsCurrentWeek && rescheduled) {
      if (rescheduled.weekday === eventWeekday) {
        activeRawTime = rescheduled.rawTime;
      }
    } else {
      if (student.baseWeekday === eventWeekday) {
        activeRawTime = student.baseRawTime;
      }
    }

    if (!activeRawTime) return null;

    const lessonStart = timeToMinutes(activeRawTime);
    const lessonDuration = getDurationByLevel(activeLevel);
    const lessonEnd = lessonStart + lessonDuration;

    return {
      lessonStart: activeRawTime,
      lessonEnd: minutesToTime12h(lessonEnd)
    };
  };

  // Validates if a proposed lesson occurs on the same day as any of the student's existing events
  const findLessonEventConflict = (studentId, weekday, proposedRawTime, proposedLevel, isOverride = false) => {
    const studentEventsList = studentEvents[studentId] || [];
    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    for (const event of studentEventsList) {
      const eventDate = new Date(event.dateTime);
      if (isNaN(eventDate.getTime())) continue;

      const eventWeekday = weekdays[eventDate.getDay()];
      if (eventWeekday !== weekday) continue;

      if (isOverride) {
        const overrideDateString = getThisWeeksWeekdayDate(weekday);
        if (eventDate.toDateString() !== overrideDateString) {
          continue;
        }
      }

      return event;
    }
    return null;
  };

  // Computes active conflicts reactively across all weekdays
  const getSchedulesAndConflicts = () => {
    const activeStudents = students.filter(student => student.isActive !== false);
    const conflictsList = [];

    customWeekdays.forEach(day => {
      const dayLessons = activeStudents.map(student => {
        const rescheduled = lessons.find(l => String(l.student_id) === String(student.student_id));
        if (rescheduled) {
          if (rescheduled.weekday === day) {
            const sameFormattedTime = (rescheduled.time || "").trim().toLowerCase().replace(/\s+/g, "") ===
              (student.baseTime || "").trim().toLowerCase().replace(/\s+/g, "");
            const sameRawTime = rescheduled.rawTime && student.baseRawTime &&
              (rescheduled.rawTime.trim() === student.baseRawTime.trim());

            const isActualReschedule = !(sameFormattedTime || sameRawTime);
            return {
              student,
              time: rescheduled.time,
              rawTime: rescheduled.rawTime || student.baseRawTime,
              isRescheduled: isActualReschedule
            };
          }
        } else {
          if (student.baseWeekday === day) {
            return {
              student,
              time: student.baseTime,
              rawTime: student.baseRawTime,
              isRescheduled: false
            };
          }
        }
        return null;
      }).filter(Boolean);

      for (let i = 0; i < dayLessons.length; i++) {
        for (let j = i + 1; j < dayLessons.length; j++) {
          const lessonA = dayLessons[i];
          const lessonB = dayLessons[j];

          const startA = timeToMinutes(lessonA.rawTime);
          const durationA = getDurationByLevel(lessonA.student.level);
          const endA = startA + durationA;

          const startB = timeToMinutes(lessonB.rawTime);
          const durationB = getDurationByLevel(lessonB.student.level);
          const endB = startB + durationB;

          if (startA < endB && startB < endA) {
            conflictsList.push({
              type: "lesson",
              day,
              student1: lessonA.student,
              time1: lessonA.time,
              endTime1: minutesToTime12h(endA),
              student2: lessonB.student,
              time2: lessonB.time,
              endTime2: minutesToTime12h(endB)
            });
          }
        }
      }
    });

    activeStudents.forEach(student => {
      const studentId = student.student_id;
      const eventsList = studentEvents[studentId] || [];

      eventsList.forEach(event => {
        const eventDate = new Date(event.dateTime);
        if (isNaN(eventDate.getTime())) return;

        const eventWeekday = eventDate.toLocaleDateString([], { weekday: 'long' });

        if (!customWeekdays.includes(eventWeekday)) return;

        const rescheduled = lessons.find(l => String(l.student_id) === String(studentId));
        let activeRawTime = null;
        let activeFormattedTime = null;
        let activeLevel = student.level;

        const eventIsCurrentWeek = isSameWeekAsToday(eventDate);

        if (eventIsCurrentWeek && rescheduled) {
          if (rescheduled.weekday === eventWeekday) {
            activeRawTime = rescheduled.rawTime;
            activeFormattedTime = rescheduled.time;
          }
        } else {
          if (student.baseWeekday === eventWeekday) {
            activeRawTime = student.baseRawTime;
            activeFormattedTime = student.baseTime;
          }
        }

        if (activeRawTime) {
          const lessonStart = timeToMinutes(activeRawTime);
          const lessonDuration = getDurationByLevel(activeLevel);
          const lessonEnd = lessonStart + lessonDuration;

          const eventDateStr = eventDate.toLocaleDateString([], { month: 'short', day: 'numeric' });

          conflictsList.push({
            type: "event",
            day: `${eventDateStr} (${eventWeekday})`,
            student1: student,
            time1: activeFormattedTime,
            endTime1: minutesToTime12h(lessonEnd),
            eventName: event.title,
            time2: eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            endTime2: "Event Day Conflict"
          });
        }
      });
    });

    return conflictsList;
  };

  // Synced profile inputs helper
  useEffect(() => {
    if (selectedStudentId && currentStudent) {
      const savedContact = studentContacts[selectedStudentId];
      if (savedContact) {
        setContactInfo(savedContact);
      } else {
        setContactInfo({
          studentName: currentStudent.name,
          studentEmail: "",
          studentPhone: "",
          parentName: "",
          parentEmail: "",
          parentPhone: "",
          preferredDays: ""
        });
      }
    } else {
      setContactInfo({
        studentName: "",
        studentEmail: "",
        studentPhone: "",
        parentName: "",
        parentEmail: "",
        parentPhone: "",
        preferredDays: ""
      });
    }
  }, [selectedStudentId, students, studentContacts]);

  const formatTime12h = (timeStr) => {
    if (!timeStr) return "12:00 AM";
    const [hourStr, minStr] = timeStr.split(":");
    const hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minStr} ${ampm}`;
  };

  // -------------------------------------------------------------
  // Deterministic Rule-Based Scheduling Recommendations
  // -------------------------------------------------------------
  const generateSuggestions = (targetStudent, payload, limit = 3) => {
    const { days, range, expandMins = 0, stepMins = 15, allowEventDays = false } = payload;
    const duration = getDurationByLevel(targetStudent.level);

    const checkSlots = (targetDays, matchRangeOnly) => {
      const candidates = [];

      targetDays.forEach(day => {
        const dayBlocks = (aiSettings.workingBlocks || []).filter(b => b.day === day);

        if (dayBlocks.length === 0) {
          return;
        }

        const dayBreaks = (aiSettings.breaks || []).filter(b => b.day === "All Days" || b.day === day);

        const processedBlocks = dayBlocks.map(b => {
          const start = Math.max(0, timeToMinutes(b.start) - expandMins);
          const end = Math.min(1440, timeToMinutes(b.end) + expandMins);
          return { start, end };
        });

        const minStart = Math.min(...processedBlocks.map(b => b.start));
        const maxEnd = Math.max(...processedBlocks.map(b => b.end));

        let rangeStart = minStart;
        let rangeEnd = maxEnd;
        if (range === "morning") {
          rangeStart = Math.max(minStart, timeToMinutes("09:00"));
          rangeEnd = Math.min(maxEnd, timeToMinutes("12:00"));
        } else if (range === "afternoon") {
          rangeStart = Math.max(minStart, timeToMinutes("12:00"));
          rangeEnd = Math.min(maxEnd, timeToMinutes("17:00"));
        } else if (range === "evening") {
          rangeStart = Math.max(minStart, timeToMinutes("17:00"));
          rangeEnd = Math.min(maxEnd, timeToMinutes("21:00"));
        }

        const startBoundary = matchRangeOnly ? rangeStart : minStart;
        const endBoundary = matchRangeOnly ? rangeEnd : maxEnd;

        for (let currentMins = startBoundary; currentMins + duration <= endBoundary; currentMins += stepMins) {
          const proposedEnd = currentMins + duration;

          const fallsInBlock = processedBlocks.some(b => currentMins >= b.start && proposedEnd <= b.end);
          if (!fallsInBlock) {
            continue;
          }

          const overlapsBreak = dayBreaks.some(b => {
            const bStart = timeToMinutes(b.start);
            const bEnd = timeToMinutes(b.end);
            return currentMins < bEnd && proposedEnd > bStart;
          });

          if (overlapsBreak) {
            continue;
          }

          const rawTimeStr = `${Math.floor(currentMins / 60).toString().padStart(2, '0')}:${(currentMins % 60).toString().padStart(2, '0')}`;

          const activeStudentsOnly = students.filter(s => s.isActive !== false);
          const hasLessonConflict = findConflictingStudent(
            targetStudent.student_id,
            day,
            rawTimeStr,
            targetStudent.level,
            activeStudentsOnly,
            lessons
          );

          if (hasLessonConflict) continue;

          const hasEventConflict = findLessonEventConflict(
            targetStudent.student_id,
            day,
            rawTimeStr,
            targetStudent.level,
            false
          );

          if (hasEventConflict && !allowEventDays) continue;

          let score = 0;
          let reasons = [];

          let isBackToBack = false;
          activeStudentsOnly.forEach(otherStudent => {
            if (String(otherStudent.student_id) === String(targetStudent.student_id)) return;

            const override = lessons.find(l => String(l.student_id) === String(otherStudent.student_id));
            let otherRawTime = null;
            if (override && override.weekday === day) {
              otherRawTime = override.rawTime;
            } else if (otherStudent.baseWeekday === day) {
              otherRawTime = otherStudent.baseRawTime;
            }

            if (otherRawTime) {
              const otherStart = timeToMinutes(otherRawTime);
              const otherDuration = getDurationByLevel(otherStudent.level);
              const otherEnd = otherStart + otherDuration;

              if (currentMins === otherEnd || proposedEnd === otherStart) {
                isBackToBack = true;
              }
            }
          });

          if (isBackToBack) {
            score += 100;
            reasons.push("Minimizes scheduling gaps with back-to-back lessons");
          }

          if (targetStudent.baseRawTime && targetStudent.baseRawTime === rawTimeStr) {
            score += 50;
            reasons.push("Maintains consistency with current scheduled time");
          }

          if (day !== "Saturday" && day !== "Sunday") {
            score += 10;
          }

          if (hasEventConflict && allowEventDays) {
            score -= 30;
            reasons.push(`Overlaps with registered event "${hasEventConflict.title}"`);
          }

          if (reasons.length === 0) {
            reasons.push("Open, conflict-free slot matching your criteria");
          }

          candidates.push({
            day,
            rawTime: rawTimeStr,
            time: formatTime12h(rawTimeStr),
            score,
            reason: reasons.join(". ") + "."
          });
        }
      });

      return candidates;
    };

    let foundSlots = checkSlots(days, true);

    if (foundSlots.length === 0) {
      foundSlots = checkSlots(days, false);
    }

    if (foundSlots.length === 0) {
      foundSlots = checkSlots(customWeekdays, false);
    }

    foundSlots.sort((a, b) => b.score - a.score);

    return foundSlots.slice(0, limit).map((slot, index) => ({
      rank: index + 1,
      ...slot
    }));
  };

  // -------------------------------------------------------------
  // Dynamic Database Synchronized Event Actions
  // -------------------------------------------------------------
  const addStudent = async () => {
    if (isAddDisabled) return;

    const activeStudentsOnly = students.filter(s => s.isActive !== false);
    const conflict = findConflictingStudent(
      null,
      newStudentBaseWeekday,
      newStudentBaseTime,
      newStudentLevel,
      activeStudentsOnly,
      lessons
    );

    if (conflict) {
      const activeRawTime = lessons.find(l => String(l.student_id) === String(conflict.student_id))?.rawTime || conflict.baseRawTime;
      const activeStart = timeToMinutes(activeRawTime);
      const activeDuration = getDurationByLevel(conflict.level);
      const activeEnd = activeStart + activeDuration;

      alert(`Scheduling Conflict\n${conflict.name} has a lesson from ${minutesToTime12h(activeStart)} - ${minutesToTime12h(activeEnd)}`);
      return;
    }

    const fullName = `${newStudentFirstName.trim()} ${newStudentLastName.trim()}`;
    const baseFormattedTime = formatTime12h(newStudentBaseTime);

    const payload = {
      name: fullName,
      level: newStudentLevel || "Beginner",
      baseWeekday: newStudentBaseWeekday,
      baseTime: baseFormattedTime,
      baseRawTime: newStudentBaseTime,
      isActive: true
    };

    try {
      const savedStudent = await apiService.createStudent(payload);
      setStudents(prev => [...prev, savedStudent]);
    } catch (err) {
      console.error("Add student failed:", err);
      alert("Error adding student. Please ensure your backend server is active.");
    }

    setNewStudentFirstName("");
    setNewStudentLastName("");
    setNewStudentLevel("");
    setNewStudentBaseWeekday("Monday");
    setNewStudentBaseTime("00:00");
  };

  const removeStudent = async (studentId) => {
    try {
      await apiService.deleteStudent(studentId);
      setStudents(prev => prev.filter(s => String(s.student_id) !== String(studentId)));
      setLessons(prev => prev.filter(l => String(l.student_id) !== String(studentId)));
    } catch (err) {
      console.error("Remove student failed:", err);
      alert("Error deleting student profile.");
    }

    if (String(selectedStudentId) === String(studentId)) {
      setSelectedStudentId(null);
      setStudentSearch("");
    }
  };

  const openScheduleModal = (student) => {
    setSelectedStudent(student);
    setScheduleMode("reschedule");
    const existingLesson = lessons.find(l => String(l.student_id) === String(student.student_id));
    setRescheduleWeekday(existingLesson?.weekday || student.baseWeekday || "Monday");
    setRescheduleTime(existingLesson?.rawTime || student.baseRawTime || "00:00");
    setShowScheduleModal(true);
  };

  const openBaseScheduleModal = (student) => {
    setSelectedStudent(student);
    setScheduleMode("base");
    setRescheduleWeekday(student.baseWeekday || "Monday");
    setRescheduleTime(student.baseRawTime || "00:00");
    setShowScheduleModal(true);
  };

  const saveReschedule = async () => {
    if (!selectedStudent) return;

    const activeStudentsOnly = students.filter(s => s.isActive !== false);
    const conflict = findConflictingStudent(
      selectedStudent.student_id,
      rescheduleWeekday,
      rescheduleTime,
      selectedStudent.level,
      activeStudentsOnly,
      lessons
    );

    if (conflict) {
      const activeRawTime = lessons.find(l => String(l.student_id) === String(conflict.student_id))?.rawTime || conflict.baseRawTime;
      const activeStart = timeToMinutes(activeRawTime);
      const activeDuration = getDurationByLevel(conflict.level);
      const activeEnd = activeStart + activeDuration;

      alert(`Scheduling Conflict\n${conflict.name} has a lesson from ${minutesToTime12h(activeStart)} - ${minutesToTime12h(activeEnd)}`);
      return;
    }

    const isOverride = scheduleMode !== "base";
    const eventConflict = findLessonEventConflict(
      selectedStudent.student_id,
      rescheduleWeekday,
      rescheduleTime,
      selectedStudent.level,
      isOverride
    );

    if (eventConflict) {
      alert(`Event Scheduling Warning\nThis lesson is scheduled on the same day as this student's registered event "${eventConflict.title}" scheduled for ${new Date(eventConflict.dateTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}.`);
    }

    const formattedTime = formatTime12h(rescheduleTime);

    if (scheduleMode === "base") {
      const payload = {
        name: selectedStudent.name,
        level: selectedStudent.level,
        baseWeekday: rescheduleWeekday,
        baseTime: formattedTime,
        baseRawTime: rescheduleTime,
        isActive: selectedStudent.isActive !== false
      };

      try {
        const updatedStudent = await apiService.updateStudent(selectedStudent.student_id, payload);
        setStudents(prev => prev.map(s => String(s.student_id) === String(selectedStudent.student_id) ? updatedStudent : s));
      } catch (err) {
        console.error("Update base properties failed:", err);
        alert("Unable to adjust weekly lesson schedule.");
      }
    } else {
      const payload = {
        weekday: rescheduleWeekday,
        time: formattedTime,
        rawTime: rescheduleTime,
        status: "scheduled"
      };

      try {
        const savedLesson = await apiService.rescheduleLesson(selectedStudent.student_id, payload);
        setLessons(prev => {
          const idx = prev.findIndex(l => String(l.student_id) === String(selectedStudent.student_id));
          if (idx !== -1) {
            const next = [...prev];
            next[idx] = savedLesson;
            return next;
          }
          return [...prev, savedLesson];
        });
      } catch (err) {
        console.error("Rescheduling lesson failed:", err);
        alert("Unable to record reschedule override.");
      }
    }

    setShowScheduleModal(false);
    setRescheduleWeekday("Monday");
    setRescheduleTime("00:00");
  };

  const toggleActiveStatus = async (studentId) => {
    const student = students.find(s => String(s.student_id) === String(studentId));
    if (!student) return;

    const newActiveState = student.isActive === false ? true : false;

    if (newActiveState) {
      const activeStudentsOnly = students.filter(s => String(s.student_id) !== String(studentId) && s.isActive !== false);
      const conflict = findConflictingStudent(
        studentId,
        student.baseWeekday,
        student.baseRawTime,
        student.level,
        activeStudentsOnly,
        lessons
      );

      if (conflict) {
        const activeRawTime = lessons.find(l => String(l.student_id) === String(conflict.student_id))?.rawTime || conflict.baseRawTime;
        const activeStart = timeToMinutes(activeRawTime);
        const activeDuration = getDurationByLevel(conflict.level);
        const activeEnd = activeStart + activeDuration;

        alert(`Scheduling Conflict\n${conflict.name} has a lesson from ${minutesToTime12h(activeStart)} - ${minutesToTime12h(activeEnd)}`);
        return;
      }

      const eventConflict = findLessonEventConflict(
        studentId,
        student.baseWeekday,
        student.baseRawTime,
        student.level,
        false
      );

      if (eventConflict) {
        alert(`Event Scheduling Warning\nActivating this student places their lesson on the same day as their registered event "${eventConflict.title}" scheduled for ${new Date(eventConflict.dateTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}.`);
      }
    }

    setStudents(prev => prev.map(s => String(s.student_id) === String(studentId) ? { ...s, isActive: newActiveState } : s));

    const payload = {
      name: student.name,
      level: student.level,
      baseWeekday: student.baseWeekday,
      baseTime: student.baseTime,
      baseRawTime: student.baseRawTime,
      isActive: newActiveState
    };

    try {
      await apiService.updateStudent(studentId, payload);
    } catch (err) {
      console.warn("Backend active-toggle persistence failed. Status is preserved locally.", err);
    }
  };

  const saveStudentLevel = async (studentId, newLevel) => {
    const student = students.find(s => String(s.student_id) === String(studentId));
    if (!student) return;

    if (student.isActive !== false) {
      const activeStudentsOnly = students.filter(s => s.isActive !== false);
      const conflict = findConflictingStudent(
        studentId,
        student.baseWeekday,
        student.baseRawTime,
        newLevel,
        activeStudentsOnly,
        lessons
      );

      if (conflict) {
        const activeRawTime = lessons.find(l => String(l.student_id) === String(conflict.student_id))?.rawTime || conflict.baseRawTime;
        const activeStart = timeToMinutes(activeRawTime);
        const activeDuration = getDurationByLevel(conflict.level);
        const activeEnd = activeStart + activeDuration;

        alert(`Scheduling Conflict Warning\nChanging ${student.name}'s level to ${newLevel} creates a conflict with ${conflict.name} (${minutesToTime12h(activeStart)} - ${minutesToTime12h(activeEnd)}).\nThis conflict has been allowed and recorded.`);
      }

      const eventConflict = findLessonEventConflict(
        studentId,
        student.baseWeekday,
        student.baseRawTime,
        newLevel,
        false
      );

      if (eventConflict) {
        alert(`Event Scheduling Warning\nChanging this student's level places their lesson on the same day as their registered event "${eventConflict.title}" scheduled for ${new Date(eventConflict.dateTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}.`);
      }
    }

    setStudents(prev => prev.map(s => String(s.student_id) === String(studentId) ? { ...s, level: newLevel } : s));

    const payload = {
      name: student.name,
      level: newLevel,
      baseWeekday: student.baseWeekday,
      baseTime: student.baseTime,
      baseRawTime: student.baseRawTime,
      isActive: student.isActive !== false
    };

    try {
      await apiService.updateStudent(studentId, payload);
    } catch (err) {
      console.warn("Backend level sync failed. Saved to local memory.", err);
    }

    setShowLevelModal(false);
    setSelectedStudentForLevel(null);
  };

  const saveLessonNote = async () => {
    if (!lessonNoteInput.trim() || !selectedStudentId) return;
    const payload = {
      date: new Date().toLocaleDateString(),
      text: lessonNoteInput.trim()
    };

    try {
      const savedNote = await apiService.saveNote(selectedStudentId, payload);
      setSavedLessonNotes(prev => ({
        ...prev,
        [selectedStudentId]: [savedNote, ...(prev[selectedStudentId] || [])]
      }));
      setLessonNoteInput("");
    } catch (err) {
      console.error("Saving note failed:", err);
      alert("Error saving lesson notes.");
    }
  };

  const removeNote = async (noteId, idx) => {
    try {
      if (noteId) {
        await apiService.deleteNote(noteId);
      }
      setSavedLessonNotes(prev => ({
        ...prev,
        [selectedStudentId]: (prev[selectedStudentId] || []).filter((n, index) => noteId ? n.id !== noteId : index !== idx)
      }));
    } catch (err) {
      console.error("Delete note failed:", err);
      alert("Error removing lesson note.");
    }
  };

  const updateNote = async (noteId, text, date) => {
    const payload = { text, date };
    try {
      const updated = await apiService.updateNote(noteId, payload);
      setSavedLessonNotes(prev => {
        const updatedObj = { ...prev };
        Object.keys(updatedObj).forEach(sid => {
          updatedObj[sid] = (updatedObj[sid] || []).map(n => n.id === noteId ? updated : n);
        });
        return updatedObj;
      });
    } catch (err) {
      console.error("Failed to update note:", err);
      alert("Error saving note updates.");
    }
  };

  const addReminder = async () => {
    if (!reminderInput.trim() || !selectedStudentId) return;
    const payload = {
      text: reminderInput.trim(),
      date: new Date().toLocaleDateString()
    };

    try {
      const savedReminder = await apiService.saveReminder(selectedStudentId, payload);
      setStudentReminders(prev => ({
        ...prev,
        [selectedStudentId]: [savedReminder, ...(prev[selectedStudentId] || [])]
      }));
      setReminderInput("");
    } catch (err) {
      console.error("Adding reminder failed:", err);
      alert("Error adding reminder card.");
    }
  };

  const removeReminder = async (reminderId) => {
    try {
      await apiService.deleteReminder(reminderId);
      setStudentReminders(prev => ({
        ...prev,
        [selectedStudentId]: (prev[selectedStudentId] || []).filter(r => r.id !== reminderId)
      }));
    } catch (err) {
      console.error("Delete reminder failed:", err);
      alert("Error removing reminder.");
    }
  };

  const addGlobalReminder = async (text, date) => {
    const payload = { text, date: date || "" };
    try {
      const saved = await apiService.saveReminder("global", payload);
      setGlobalReminders(prev => [...prev, saved]);
    } catch (err) {
      console.error("Adding global reminder failed:", err);
      alert("Error adding global reminder.");
    }
  };

  const removeGlobalReminder = async (reminderId) => {
    try {
      await apiService.deleteReminder(reminderId);
      setGlobalReminders(prev => prev.filter(r => r.id !== reminderId));
    } catch (err) {
      console.error("Failed to delete global reminder:", err);
      alert("Error removing global reminder.");
    }
  };

  const updateReminder = async (reminderId, text, date) => {
    const payload = { text, date };
    try {
      const updated = await apiService.updateReminder(reminderId, payload);
      if (reminderId.startsWith("reminder_") && globalReminders.some(r => r.id === reminderId)) {
        setGlobalReminders(prev => prev.map(r => r.id === reminderId ? updated : r));
      } else {
        setStudentReminders(prev => {
          const updatedObj = { ...prev };
          Object.keys(updatedObj).forEach(sid => {
            updatedObj[sid] = (updatedObj[sid] || []).map(r => r.id === reminderId ? updated : r);
          });
          return updatedObj;
        });
      }
    } catch (err) {
      console.error("Failed to update reminder:", err);
      alert("Error saving reminder updates.");
    }
  };

  const toggleNoteExpand = (studentId, idx) => {
    const key = `${studentId}_${idx}`;
    setExpandedNotes(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveContact = async () => {
    if (!selectedStudentId) return;

    try {
      const savedContact = await apiService.saveContact(selectedStudentId, contactInfo);
      setStudentContacts(prev => ({ ...prev, [selectedStudentId]: savedContact }));
      setStudents(prev => prev.map(s => String(s.student_id) === String(selectedStudentId) ? { ...s, name: contactInfo.studentName } : s));
      setEditingContact(false);
    } catch (err) {
      console.error("Failed to save contact profiles:", err);
      alert("Error saving contact card.");
    }
  };

  const addEvent = async () => {
    if (!newEventTitle.trim() || !newEventDateTime || !newEventLocation.trim() || !selectedStudentId) return;

    const conflict = checkEventConflict(selectedStudentId, newEventDateTime);
    if (conflict) {
      alert(`Event Scheduling Warning\nThis event falls on the same day as this student's scheduled lesson.`);
    }

    const payload = {
      title: newEventTitle,
      tag: newEventTag,
      dateTime: newEventDateTime,
      location: newEventLocation
    };

    try {
      const savedEvent = await apiService.saveEvent(selectedStudentId, payload);
      setStudentEvents(prev => ({
        ...prev,
        [selectedStudentId]: [savedEvent, ...(prev[selectedStudentId] || [])]
      }));
      setNewEventTitle("");
      setNewEventDateTime(`${getTodayDateStr()}T00:00`);
      setNewEventLocation("");
      setNewEventTag("Festival");
    } catch (err) {
      console.error("Adding event failed:", err);
      alert("Error creating upcoming event block.");
    }
  };

  const updateStudentEvent = async (eventId, payload) => {
    try {
      const updated = await apiService.updateEvent(eventId, payload);
      setStudentEvents(prev => {
        const updatedObj = { ...prev };
        Object.keys(updatedObj).forEach(sid => {
          updatedObj[sid] = (updatedObj[sid] || []).map(e => e.id === eventId ? updated : e);
        });
        return updatedObj;
      });
    } catch (err) {
      console.error("Failed to update event:", err);
      alert("Error saving event updates.");
    }
  };

  const removeEvent = async (eventId) => {
    try {
      await apiService.deleteEvent(eventId);
      setStudentEvents(prev => ({
        ...prev,
        [selectedStudentId]: (prev[selectedStudentId] || []).filter(e => e.id !== eventId)
      }));
    } catch (err) {
      console.error("Delete event failed:", err);
      alert("Error removing event.");
    }
  };

  // Saves empty attendee arrays under the "global" identifier safely [3]
  const addStudioEvent = async (eventData, studentIds) => {
    const isGlobal = studentIds.length === 0;
    const targetIds = isGlobal ? ["global"] : studentIds;

    // Append invisible zero-width space indicator if it's a global empty attendee event [3]
    const finalLocation = isGlobal ? eventData.location.trim() + "\u200b" : eventData.location.trim();

    try {
      const savedEvents = await Promise.all(targetIds.map(async (sid) => {
        const payload = {
          title: eventData.title,
          tag: eventData.tag,
          dateTime: eventData.dateTime,
          location: finalLocation
        };
        return {
          studentId: sid,
          event: await apiService.saveEvent(sid, payload)
        };
      }));

      setStudentEvents(prev => {
        const updated = { ...prev };
        savedEvents.forEach(({ studentId, event }) => {
          updated[studentId] = [event, ...(updated[studentId] || [])];
        });
        return updated;
      });

      alert(studentIds.length > 0
        ? "Studio event successfully created and assigned to selected students."
        : "Studio event successfully created with no attendees."
      );
    } catch (err) {
      console.error("Failed to add studio event:", err);
      alert("Error adding studio event.");
    }
  };

  // Allow negative balance values to represent prepayments [3]
  const recordDirectPayment = (student, amount, lessonsCount) => {
    const currentUnpaidVal = studentUnpaid[student.student_id] || 0;
    const nextUnpaid = currentUnpaidVal - lessonsCount; // Removed Math.max(0, ...) limit to support credit [3]
    saveStudentUnpaid(student.student_id, nextUnpaid);

    const nextEarnings = totalEarnings + amount;
    setTotalEarnings(nextEarnings);
    localStorage.setItem("cadenza_total_earnings", nextEarnings.toString());

    const logEntry = {
      id: Date.now(),
      date: new Date().toLocaleDateString(),
      studentName: student.name,
      amount: amount,
      lessonsDeducted: lessonsCount
    };
    const nextLog = [logEntry, ...paymentLog];
    setPaymentLog(nextLog);
    localStorage.setItem("cadenza_payment_log", JSON.stringify(nextLog));
  };

  const deletePaymentLogEntry = (logId) => {
    const entry = paymentLog.find(log => log.id === logId);
    if (!entry) return;

    // Revert the total earnings
    const nextEarnings = Math.max(0, totalEarnings - (Number(entry.amount) || 0));
    setTotalEarnings(nextEarnings);
    localStorage.setItem("cadenza_total_earnings", nextEarnings.toString());

    // Revert the student's unpaid lessons count if we can find them in students
    const student = students.find(s => s.name === entry.studentName);
    if (student) {
      const currentUnpaidVal = studentUnpaid[student.student_id] || 0;
      const nextUnpaid = currentUnpaidVal + (parseInt(entry.lessonsDeducted, 10) || 0);
      saveStudentUnpaid(student.student_id, nextUnpaid);
    }

    // Filter the current entry out of the log list
    const nextLog = paymentLog.filter(log => log.id !== logId);
    setPaymentLog(nextLog);
    localStorage.setItem("cadenza_payment_log", JSON.stringify(nextLog));
  };

  // Saves empty attendee arrays under the "global" identifier safely [3]
  const updateStudioEvent = async (ids, eventData, studentIds) => {
    const isGlobal = studentIds.length === 0;
    const targetIds = isGlobal ? ["global"] : studentIds;

    const finalLocation = isGlobal ? eventData.location.trim() + "\u200b" : eventData.location.trim();

    try {
      await Promise.all(ids.map(id => apiService.deleteEvent(id)));

      const savedEvents = await Promise.all(targetIds.map(async (sid) => {
        const payload = {
          title: eventData.title,
          tag: eventData.tag,
          dateTime: eventData.dateTime,
          location: finalLocation
        };
        return {
          studentId: sid,
          event: await apiService.saveEvent(sid, payload)
        };
      }));

      setStudentEvents(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(sid => {
          updated[sid] = (updated[sid] || []).filter(e => !ids.includes(e.id));
        });
        savedEvents.forEach(({ studentId, event }) => {
          updated[studentId] = [event, ...(updated[studentId] || [])];
        });
        return updated;
      });

      alert("Studio event successfully updated.");
    } catch (err) {
      console.error("Failed to update studio event:", err);
      alert("Error updating studio event.");
    }
  };

  const removeStudioEvent = async (ids) => {
    if (confirm("Are you sure you want to cancel this studio event for all attendees?")) {
      try {
        await Promise.all(ids.map(id => apiService.deleteEvent(id)));
        setStudentEvents(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(sid => {
            updated[sid] = (updated[sid] || []).filter(e => !ids.includes(e.id));
          });
          return updated;
        });
      } catch (err) {
        console.error("Failed to delete event:", err);
        alert("Error deleting event.");
      }
    }
  };

  // HELPER METHODS TO UPSERT STUDENT RATES AND UNPAID LESSON COUNTS TO LOCAL STORAGE SECURELY
  const saveStudentRate = (studentId, rate) => {
    const nextRates = { ...studentRates, [studentId]: parseFloat(rate) || 0 };
    setStudentRates(nextRates);
    localStorage.setItem("cadenza_student_rates", JSON.stringify(nextRates));
  };

  const saveStudentUnpaid = (studentId, count) => {
    const nextUnpaid = { ...studentUnpaid, [studentId]: parseInt(count, 10) || 0 };
    setStudentUnpaid(nextUnpaid);
    localStorage.setItem("cadenza_student_unpaid", JSON.stringify(nextUnpaid));
  };

  const saveStudentPaymentPeriod = (studentId, period) => {
    const nextPeriods = { ...studentPaymentPeriods, [studentId]: period };
    setStudentPaymentPeriods(nextPeriods);
    localStorage.setItem("cadenza_student_payment_periods", JSON.stringify(nextPeriods));
  };

  const saveTheme = (nextTheme) => {
    // NEW: Explicitly preserve your custom presets so switching themes never wipes them out!
    const themeWithPresets = {
      ...nextTheme,
      customPresets: nextTheme.customPresets || theme.customPresets || []
    };

    setTheme(themeWithPresets);
    localStorage.setItem("cadenza_theme", JSON.stringify(themeWithPresets));

    // Apply dynamic property changes globally
    const root = document.documentElement;
    root.style.setProperty('--theme-bg', themeWithPresets.bg);
    root.style.setProperty('--theme-text', themeWithPresets.text);
    root.style.setProperty('--theme-border', themeWithPresets.border);
    root.style.setProperty('--theme-card-bg', themeWithPresets.cardBg);
    root.style.setProperty('--theme-card-bg-alt', themeWithPresets.cardBgAlt);
    root.style.setProperty('--theme-brand', themeWithPresets.brand);
    root.style.setProperty('--theme-brand-hover', themeWithPresets.brandHover || themeWithPresets.brand);

    // Sync in background to database
    syncSettingsToDatabase({ theme: themeWithPresets });
  };

  const resetFinances = () => {
    setTotalEarnings(0);
    localStorage.setItem("cadenza_total_earnings", "0");

    setPaymentLog([]);
    localStorage.setItem("cadenza_payment_log", "[]");

    const clearedUnpaid = {};
    students.forEach(s => {
      clearedUnpaid[s.student_id] = 0;
    });
    setStudentUnpaid(clearedUnpaid);
    localStorage.setItem("cadenza_student_unpaid", JSON.stringify(clearedUnpaid));

    const todayStr = new Date().toISOString().split("T")[0];
    const clearedBilledDates = {};
    students.forEach(s => {
      clearedBilledDates[s.student_id] = todayStr;
    });
    localStorage.setItem("cadenza_student_last_billed", JSON.stringify(clearedBilledDates));

    alert("Financial records and outstanding balances successfully reset for the new season!");
  };

  const syncSettingsToDatabase = async (updatedFields = {}) => {
    const payload = {
      workingBlocks: aiSettings.workingBlocks || [],
      breaks: aiSettings.breaks || [],
      specialDates: aiSettings.specialDates || [],
      customEventTags: customEventTags,
      customLevels: customLevels,
      customWeekdays: customWeekdays,
      customPaymentPeriods: customPaymentPeriodsConfig,
      theme: theme,
      teacherContact: teacherContact,
      ...updatedFields
    };

    try {
      await apiService.saveAISettings(payload);
    } catch (err) {
      console.warn("Could not sync settings to database:", err);
    }
  };

  // -------------------------------------------------------------
  // Unified Loading Side-Effects
  // -------------------------------------------------------------
  // Inside app.js, update the loadInitialData useEffect hook:
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setBackendStatus("checking");
        const studentsData = await apiService.getStudents();
        setStudents(studentsData);
        setBackendStatus("live");

        const lessonsData = await apiService.getLessons();
        setLessons(lessonsData);

        // Fetch ALL studio settings and configuration states from the database
        try {
          const settingsData = await apiService.getAISettings();
          if (settingsData) {
            setAiSettings(settingsData);
            localStorage.setItem("cadenza_ai_settings", JSON.stringify(settingsData));

            // Set other configurations dynamically from DB instead of localStorage!
            if (settingsData.teacherContact) setTeacherContact(settingsData.teacherContact);
            if (settingsData.customEventTags && settingsData.customEventTags.length > 0) setCustomEventTags(settingsData.customEventTags);
            if (settingsData.customLevels && settingsData.customLevels.length > 0) setCustomLevels(settingsData.customLevels);
            if (settingsData.customWeekdays && settingsData.customWeekdays.length > 0) setCustomWeekdays(settingsData.customWeekdays);
            if (settingsData.customPaymentPeriods && settingsData.customPaymentPeriods.length > 0) setCustomPaymentPeriodsConfig(settingsData.customPaymentPeriods);
            if (settingsData.theme && Object.keys(settingsData.theme).length > 0) saveTheme(settingsData.theme);
          }
        } catch (settingsErr) {
          console.warn("Could not fetch configurations from backend, falling back to local cached storage.");
        }

      } catch (err) {
        console.warn("Backend connection failed. Fallback triggered.", err);
        setBackendStatus("offline");
      }
    };

    loadInitialData();
  }, []);

  // Background loader executes global queries regardless of active student count [3]
  useEffect(() => {
    if (backendStatus === "live") {
      const fetchAllStudentDetails = async () => {
        try {
          const notesObj = {};
          const remindersObj = {};
          const eventsObj = {};
          const contactsObj = {};

          // Always query global empty-attendee events [3]
          try {
            const globalEvts = await apiService.getEvents("global");
            eventsObj["global"] = globalEvts || [];
          } catch (err) {
            console.warn("Could not load global events:", err);
          }

          if (students.length > 0) {
            await Promise.all(students.map(async (student) => {
              try {
                const [notes, reminders, events, contact] = await Promise.all([
                  apiService.getNotes(student.student_id),
                  apiService.getReminders(student.student_id),
                  apiService.getEvents(student.student_id),
                  apiService.getContact(student.student_id)
                ]);
                notesObj[student.student_id] = notes;
                remindersObj[student.student_id] = reminders;
                eventsObj[student.student_id] = events;
                contactsObj[student.student_id] = contact;
              } catch (err) {
                console.error(`Error background fetching data for ${student.name}:`, err);
              }
            }));
          }

          setSavedLessonNotes(notesObj);
          setStudentReminders(remindersObj);
          setStudentEvents(eventsObj);
          setStudentContacts(contactsObj);
        } catch (err) {
          console.error("Background data load failure:", err);
        }
      };

      fetchAllStudentDetails();
    }
  }, [students.length, backendStatus]);

  // Automated billing periods "catch-up" scheduler logic with Vacation Event bypass
  useEffect(() => {
    if (students.length > 0) {
      const lastBilledCached = localStorage.getItem("cadenza_student_last_billed");
      const lastBilledMap = lastBilledCached ? JSON.parse(lastBilledCached) : {};
      let updatedUnpaid = { ...studentUnpaid };
      let updatedBilledMap = { ...lastBilledMap };
      let hasChanges = false;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Helper to check if a specific calendar date is a Vacation day for a student
      const isVacationDay = (studentId, dateObj) => {
        const eventsList = studentEvents[studentId] || [];
        const targetTime = dateObj.getTime();

        return eventsList.some(event => {
          if (event.tag && event.tag.toLowerCase() === "vacation") {
            const dateTimeStr = event.dateTime;
            if (dateTimeStr.includes(" to ")) {
              const [startStr, endStr] = dateTimeStr.split(" to ");
              const startDate = new Date(startStr);
              startDate.setHours(0, 0, 0, 0);
              const endDate = new Date(endStr);
              endDate.setHours(23, 59, 59, 999);
              return targetTime >= startDate.getTime() && targetTime <= endDate.getTime();
            } else {
              const eventDate = new Date(dateTimeStr);
              return eventDate.toDateString() === dateObj.toDateString();
            }
          }
          return false;
        });
      };

      students.forEach(student => {
        const sid = student.student_id;
        const periodName = studentPaymentPeriods[sid] || "Weekly";
        const periodConfig = customPaymentPeriodsConfig.find(p => p.name === periodName) || { name: "Weekly", days: 7 };
        const periodDays = periodConfig.days;

        const lastBilledStr = lastBilledMap[sid];

        if (!lastBilledStr) {
          updatedBilledMap[sid] = today.toISOString().split("T")[0];
          hasChanges = true;
        } else {
          const lastBilledDate = new Date(lastBilledStr);
          lastBilledDate.setHours(0, 0, 0, 0);

          const diffTime = today.getTime() - lastBilledDate.getTime();
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays >= periodDays) {
            const periodsElapsed = Math.floor(diffDays / periodDays);
            if (periodsElapsed > 0) {
              // Find day of the week index (0-6)
              const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
              const targetDayIdx = weekdays.indexOf(student.baseWeekday);

              let completedLessons = 0;
              if (targetDayIdx !== -1) {
                let iter = new Date(lastBilledDate.getTime());
                iter.setDate(iter.getDate() + 1); // Start checking from next day

                while (iter <= today) {
                  if (iter.getDay() === targetDayIdx) {
                    // Only count lessons that were NOT during vacation
                    if (!isVacationDay(sid, iter)) {
                      completedLessons++;
                    }
                  }
                  iter.setDate(iter.getDate() + 1);
                }
              }

              if (completedLessons > 0) {
                const currentUnpaidVal = updatedUnpaid[sid] || 0;
                updatedUnpaid[sid] = currentUnpaidVal + completedLessons;
              }

              // Advance the billing anchor by elapsed periods
              const nextBilledDate = new Date(lastBilledDate.getTime() + periodsElapsed * periodDays * 24 * 60 * 60 * 1000);
              updatedBilledMap[sid] = nextBilledDate.toISOString().split("T")[0];
              hasChanges = true;
            }
          }
        }
      });

      if (hasChanges) {
        setStudentUnpaid(updatedUnpaid);
        localStorage.setItem("cadenza_student_unpaid", JSON.stringify(updatedUnpaid));
        localStorage.setItem("cadenza_student_last_billed", JSON.stringify(updatedBilledMap));
      }
    }
  }, [students, studentPaymentPeriods, customPaymentPeriodsConfig, studentEvents]);

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const currentEvents = studentEvents[selectedStudentId] || [];

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100 font-sans">

      {/* --- TOP HEADER --- */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-purple-600 text-white p-2 rounded-xl shadow-lg shadow-purple-500/20">
            <Icon name="music" className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight font-serif text-white">
              {teacherContact.studioName || "Cadenza"}
            </h1>
            <p className="text-xs text-slate-100 font-medium">
              {teacherContact.teacherName ? `Studio Portal — ${teacherContact.teacherName}` : "Music Studio Portal"}
            </p>
          </div>
        </div>

        {/* Page Option Tabs */}
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-slate-800/50 p-1.5 rounded-xl border border-slate-800 flex gap-2 w-max shadow-inner">
            <button
              onClick={() => setActiveTab("teacher")}
              className={`px-4 py-2 text-sm font-semibold rounded-lg tracking-wide transition flex items-center gap-2
                ${activeTab === 'teacher' ? 'bg-purple-600 text-white shadow-md shadow-purple-600/10' : 'text-slate-100 hover:text-indigo-900'}`}
            >
              <Icon name="user" className="w-4 h-4" /> Dashboard
            </button>
            <button
              onClick={() => setActiveTab("student")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold tracking-wide transition-all duration-200 
                ${activeTab === "student" ? 'bg-purple-600 text-white shadow-md shadow-purple-600/10' : 'text-slate-100 hover:text-indigo-900'}`}
            >
              <Icon name="user" className="w-4 h-4" /> Student Page
            </button>
            <button
              onClick={() => setActiveTab("calendar")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold tracking-wide transition-all duration-200 
                ${activeTab === "calendar" ? 'bg-purple-600 text-white shadow-md shadow-purple-600/10' : 'text-slate-100 hover:text-indigo-900'}`}
            >
              <Icon name="calendar" className="w-4 h-4" /> Calendar
            </button>
            <button
              onClick={() => setActiveTab("billing")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold tracking-wide transition-all duration-200 
                ${activeTab === "billing" ? 'bg-purple-600 text-white shadow-md shadow-purple-600/10' : 'text-slate-100 hover:text-indigo-900'}`}
            >
              <Icon name="timer" className="w-4 h-4" /> Billing
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold tracking-wide transition-all duration-200 
                ${activeTab === "settings" ? 'bg-purple-600 text-white shadow-md shadow-purple-600/10' : 'text-slate-100 hover:text-indigo-900'}`}
            >
              <Icon name="shield" className="w-4 h-4" /> Settings
            </button>
          </div>
        </div>

        {/* Connection Indicators */}
        <div className="flex items-center gap-4">
          {backendStatus === "checking" && (
            <span className="px-3 py-1 bg-amber-500/10 text-amber-800 border border-amber-500/20 text-xs rounded-full font-medium flex items-center gap-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span> Connecting Backend...
            </span>
          )}
          {backendStatus === "live" && (
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-800 border border-emerald-500/20 text-xs rounded-full font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Live Backend
            </span>
          )}
          {backendStatus === "offline" && (
            <span className="px-3 py-1 bg-indigo-500/10 text-indigo-800 border border-indigo-500/20 text-xs rounded-full font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400"></span> Offline Mode
            </span>
          )}
        </div>
      </header>

      {/* --- MAIN CORE PANELS --- */}
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-10 py-8">
        {activeTab === "teacher" && (
          <TeacherDashboard
            globalReminders={globalReminders}
            addGlobalReminder={addGlobalReminder}
            removeGlobalReminder={removeGlobalReminder}
            updateGlobalReminder={updateReminder}
            students={students}
            lessons={lessons}
            openScheduleModal={openScheduleModal}
            conflicts={getSchedulesAndConflicts()}
            studentEvents={studentEvents}
            addStudioEvent={addStudioEvent}
            removeStudioEvent={removeStudioEvent}
            updateStudioEvent={updateStudioEvent}
            customEventTags={customEventTags}
          />
        )}
        {activeTab === "student" && (
          <StudentPage
            students={students}
            lessons={lessons}
            studentSearch={studentSearch}
            setStudentSearch={setStudentSearch}
            showStudentDropdown={showStudentDropdown}
            setShowStudentDropdown={setShowStudentDropdown}
            selectedStudentId={selectedStudentId}
            setSelectedStudentId={setSelectedStudentId}
            currentStudent={currentStudent}
            openBaseScheduleModal={openBaseScheduleModal}
            reminderInput={reminderInput}
            setReminderInput={setReminderInput}
            addReminder={addReminder}
            removeReminder={removeReminder}
            updateReminder={updateReminder}
            removeEvent={removeEvent}
            removeNote={removeNote}
            updateNote={updateNote}
            studentReminders={studentReminders}
            newEventTitle={newEventTitle}
            setNewEventTitle={setNewEventTitle}
            newEventDateTime={newEventDateTime}
            setNewEventDateTime={setNewEventDateTime}
            newEventTag={newEventTag}
            setNewEventTag={setNewEventTag}
            newEventLocation={newEventLocation}
            setNewEventLocation={setNewEventLocation}
            addEvent={addEvent}
            studentEvents={studentEvents}
            lessonNoteInput={lessonNoteInput}
            setLessonNoteInput={setLessonNoteInput}
            saveLessonNote={saveLessonNote}
            savedLessonNotes={savedLessonNotes}
            expandedNotes={expandedNotes}
            toggleNoteExpand={toggleNoteExpand}
            filteredStudents={filteredStudents}
            currentEvents={currentEvents}
            toggleActiveStatus={toggleActiveStatus}
            onOpenLevelModal={(student) => {
              setSelectedStudentForLevel(student);
              setShowLevelModal(true);
            }}
            studentContacts={studentContacts}
            addStudent={addStudent}
            newStudentFirstName={newStudentFirstName}
            setNewStudentFirstName={setNewStudentFirstName}
            newStudentLastName={newStudentLastName}
            setNewStudentLastName={setNewStudentLastName}
            newStudentLevel={newStudentLevel}
            setNewStudentLevel={setNewStudentLevel}
            newStudentBaseWeekday={newStudentBaseWeekday}
            setNewStudentBaseWeekday={setNewStudentBaseWeekday}
            newStudentBaseTime={newStudentBaseTime}
            setNewStudentBaseTime={setNewStudentBaseTime}
            isAddDisabled={isAddDisabled}
            editingContact={editingContact}
            setEditingContact={setEditingContact}
            contactInfo={contactInfo}
            setContactInfo={setContactInfo}
            onSaveContact={handleSaveContact}
            openScheduleModal={openScheduleModal}
            removeStudent={removeStudent}
            updateStudentEvent={updateStudentEvent}
            customLevels={customLevels}
            customWeekdays={customWeekdays}
            customEventTags={customEventTags}
            studentRates={studentRates}
            saveStudentRate={saveStudentRate}
            studentUnpaid={studentUnpaid}
            saveStudentUnpaid={saveStudentUnpaid}
            studentPaymentPeriods={studentPaymentPeriods}
            saveStudentPaymentPeriod={saveStudentPaymentPeriod}
            recordDirectPayment={recordDirectPayment}
          />
        )}
        {activeTab === "calendar" && (
          <CalendarPage
            students={students}
            lessons={lessons}
            studentEvents={studentEvents}
            customEventTags={customEventTags}
          />
        )}
        {activeTab === "billing" && (
          <BillingPage
            students={students}
            studentRates={studentRates}
            saveStudentRate={saveStudentRate}
            studentUnpaid={studentUnpaid}
            saveStudentUnpaid={saveStudentUnpaid}
            studentPaymentPeriods={studentPaymentPeriods}
            saveStudentPaymentPeriod={saveStudentPaymentPeriod}
            recordDirectPayment={recordDirectPayment}
            customPaymentPeriodsConfig={customPaymentPeriodsConfig}
            resetFinances={resetFinances}
            deletePaymentLogEntry={deletePaymentLogEntry}
            customLevels={customLevels}
            totalEarnings={totalEarnings}
            setTotalEarnings={setTotalEarnings}
            paymentLog={paymentLog}
            setPaymentLog={setPaymentLog}
          />
        )}
        {activeTab === "settings" && (
          <SettingsPage
            customEventTags={customEventTags}
            saveCustomEventTags={(tags) => {
              setCustomEventTags(tags);
              localStorage.setItem("cadenza_custom_event_tags", JSON.stringify(tags));
              syncSettingsToDatabase({ customEventTags: tags });
            }}
            customLevels={customLevels}
            saveCustomLevels={(levels) => {
              setCustomLevels(levels);
              localStorage.setItem("cadenza_custom_levels", JSON.stringify(levels));
              syncSettingsToDatabase({ customLevels: levels });
            }}
            customWeekdays={customWeekdays}
            saveCustomWeekdays={(weekdays) => {
              setCustomWeekdays(weekdays);
              localStorage.setItem("cadenza_custom_weekdays", JSON.stringify(weekdays));
              syncSettingsToDatabase({ customWeekdays: weekdays });
            }}
            customPaymentPeriodsConfig={customPaymentPeriodsConfig}
            saveCustomPaymentPeriodsConfig={(periods) => {
              setCustomPaymentPeriodsConfig(periods);
              localStorage.setItem("cadenza_custom_payment_periods_config", JSON.stringify(periods));
              syncSettingsToDatabase({ customPaymentPeriods: periods });
            }}
            aiSettings={aiSettings}
            saveAiSettings={async (newSettings) => {
              setAiSettings(newSettings);
              localStorage.setItem("cadenza_ai_settings", JSON.stringify(newSettings));
              // Merge AI scheduler settings with existing database parameters
              const mergedPayload = {
                ...newSettings,
                customEventTags,
                customLevels,
                customWeekdays,
                customPaymentPeriods: customPaymentPeriodsConfig,
                theme,
                teacherContact
              };
              try {
                await apiService.saveAISettings(mergedPayload);
              } catch (err) {
                console.warn("Could not save AI settings to backend, caching locally.", err);
              }
            }}
            theme={theme}
            saveTheme={saveTheme}
            teacherContact={teacherContact}
            setTeacherContact={(contact) => {
              setTeacherContact(contact);
              localStorage.setItem("cadenza_teacher_contact", JSON.stringify(contact));
              syncSettingsToDatabase({ teacherContact: contact });
            }}
          />
        )}
      </main>

      {/* --- MODALS --- */}
      <ScheduleModal
        show={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        selectedStudent={selectedStudent}
        scheduleMode={scheduleMode}
        rescheduleWeekday={rescheduleWeekday}
        setRescheduleWeekday={setRescheduleWeekday}
        rescheduleTime={rescheduleTime}
        setRescheduleTime={setRescheduleTime}
        onSave={saveReschedule}
        generateSuggestions={generateSuggestions}
        preferredDays={(studentContacts && selectedStudent && studentContacts[selectedStudent.student_id]?.preferredDays) || ""}
      />

      <LevelModal
        show={showLevelModal}
        onClose={() => setShowLevelModal(false)}
        selectedStudent={selectedStudentForLevel}
        onSave={saveStudentLevel}
      />

      {/* --- APP FOOTER --- */}
      <footer className="bg-slate-900 border-t border-slate-800 py-6 text-center text-xs text-slate-100 font-semibold">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p>© 2026 {teacherContact.studioName || "Cadenza Music Studio"}.</p>
          <div className="flex items-center justify-center gap-4 text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-800"></span>
          </div>
        </div>
      </footer>

    </div>
  );
}

// Runtime check to identify blocked local loads or timing race conditions
const requiredGlobals = [
  "TeacherDashboard",
  "StudentPage",
  "CalendarPage",
  "ScheduleModal",
  "LevelModal",
  "Icon",
  "utils",
  "apiService",
  "SettingsPage",
  "BillingPage"
];
const missingGlobals = requiredGlobals.filter(key => !window[key]);

if (missingGlobals.length > 0) {
  const errMessage = `Initialization halted. Missing properties on window: ${missingGlobals.join(", ")}`;
  console.error(errMessage);

  document.getElementById("root").innerHTML = `
    <div style="max-width: 600px; margin: 50px auto; padding: 30px; border-radius: 12px; font-family: system-ui, sans-serif; background-color: #fee2e2; border: 1.5px solid #ef4444; color: #991b1b;">
      <h2 style="margin-top: 0; font-weight: 800;">Application Loading Error</h2>
      <p style="font-size: 14px; line-height: 1.6;">The browser was unable to load some of the module scripts required to run Cadenza.</p>
      <div style="background-color: #fca5a5; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 13px; margin: 15px 0;">
        ${errMessage}
      </div>
      <p style="font-size: 13px; margin-bottom: 0;">
        <strong>Troubleshooting Step:</strong> If you opened <code>index.html</code> directly via double-click, browsers block the script imports due to local CORS security (<code>file://</code> protocol). You must serve your files from a local web server (e.g., Python's <code>http.server</code>, Live Server in VS Code, or Node's <code>http-server</code>).
      </p>
    </div>
  `;
} else {
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(<App />);
  window.App = App;
}