// components/CalendarPage.js
const CalendarPage = ({ students, lessons, studentEvents }) => {
  const { useState } = React;
  const Icon = window.Icon;

  // Manage internal month/year navigation state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null); // Tracks the active popup detail
  const [isEditingHeader, setIsEditingHeader] = useState(false); // Controls manual selection edit mode

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Updated to Sunday-to-Saturday order
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Generate Year option array relative to today's date (10 years back, 10 years forward)
  const baseYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 21 }, (_, idx) => baseYear - 10 + idx);

  // Helper utility to determine if a date falls in the current week (Sunday-Saturday) containing today
  const isSameWeekAsToday = (date) => {
    const today = new Date();
    
    // Get Sunday of today's week
    const todayDay = today.getDay();
    const todaySunday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - todayDay);
    todaySunday.setHours(0, 0, 0, 0);

    // Get Sunday of target date's week
    const targetDay = date.getDay();
    const targetSunday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - targetDay);
    targetSunday.setHours(0, 0, 0, 0);

    return todaySunday.getTime() === targetSunday.getTime();
  };

  // Navigate calendar step-by-step
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handlePrevYear = () => {
    setCurrentDate(new Date(year - 1, month, 1));
  };

  const handleNextYear = () => {
    setCurrentDate(new Date(year + 1, month, 1));
  };

  // Determine starting offset and total days in current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // Sunday=0, Monday=1, ...

  // Calculate grid padding cells (Sunday-first offset matches the first day's index exactly)
  const startOffset = firstDayOfWeek;

  // Map JS Date week indexes back to standard weekday names used in database models
  const dbWeekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const cells = [];

  // Generate leading padding cells
  for (let i = 0; i < startOffset; i++) {
    cells.push({ isPadding: true });
  }

  // Filter so that only active students' lessons and events appear on the monthly calendar grid
  const activeStudents = students.filter(student => student.isActive !== false);

  // UPDATED: Standardized timezone-insensitive "YYYY-MM-DD" local date matching
  const isDateInEventRange = (dateObj, eventDateTimeStr) => {
    if (!eventDateTimeStr) return false;
    
    // Helper to format any Javascript Date object to clean local "YYYY-MM-DD" string
    const formatToLocalDateString = (d) => {
      return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
    };

    const targetStr = formatToLocalDateString(dateObj); // "YYYY-MM-DD" in local time

    if (eventDateTimeStr.includes(" to ")) {
      // Range-based
      const [startStr, endStr] = eventDateTimeStr.split(" to ");
      return targetStr >= startStr && targetStr <= endStr;
    }
    
    // Single-day (e.g. "2026-05-31T15:30")
    const eventDayStr = eventDateTimeStr.split("T")[0]; // "YYYY-MM-DD"
    return targetStr === eventDayStr;
  };

  // UPDATED: Robust local component parsing prevents native Date UTC conversion displacement bugs
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
    return d.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
  };

  // Populate actual days with matching lessons & events
  for (let d = 1; d <= daysInMonth; d++) {
    const cellDate = new Date(year, month, d);
    const weekdayName = dbWeekdays[cellDate.getDay()];
    const cellIsCurrentWeek = isSameWeekAsToday(cellDate);

    // 1. Gather active lessons on this specific weekday for active students only
    const dayLessons = activeStudents.map(student => {
      const rescheduled = lessons.find(l => String(l.student_id) === String(student.student_id));
      
      if (cellIsCurrentWeek) {
        if (rescheduled) {
          // If rescheduled override is present, it applies to this weekday only
          if (rescheduled.weekday === weekdayName) {
            // Robust check: Compare normalized formatted clock times and raw 24h clock times only
            const sameFormattedTime = (rescheduled.time || "").trim().toLowerCase().replace(/\s+/g, "") === 
                                      (student.baseTime || "").trim().toLowerCase().replace(/\s+/g, "");
            const sameRawTime = rescheduled.rawTime && student.baseRawTime && 
                                (rescheduled.rawTime.trim() === student.baseRawTime.trim());

            // If rescheduled back to their regular base time, do not mark as makeup
            const isActualReschedule = !(sameFormattedTime || sameRawTime);
            return { student, time: rescheduled.time, isRescheduled: isActualReschedule };
          }
          // Do not render base schedule on base weekday for this week because they are rescheduled
        } else {
          // No reschedule this week, render standard base schedule
          if (student.baseWeekday === weekdayName) {
            return { student, time: student.baseTime, isRescheduled: false };
          }
        }
      } else {
        // For non-current weeks of the month, only display the recurring base weekly lesson
        if (student.baseWeekday === weekdayName) {
          return { student, time: student.baseTime, isRescheduled: false };
        }
      }
      return null;
    }).filter(Boolean);

    // Sort lessons chronologically
    dayLessons.sort((a, b) => a.time.localeCompare(b.time));

    // 2. Gather non-recurring events for active students and global studio-wide events
    const dayEvents = [];
    Object.keys(studentEvents || {}).forEach(studentId => {
      // Check for global empty-attendee events first [3]
      if (studentId === "global") {
        const eventsList = studentEvents[studentId] || [];
        eventsList.forEach(event => {
          if (isDateInEventRange(cellDate, event.dateTime)) {
            dayEvents.push({
              student: null, // No student associated
              title: event.title,
              tag: event.tag,
              dateTime: event.dateTime,
              location: event.location
            });
          }
        });
        return;
      }

      const student = activeStudents.find(s => String(s.student_id) === String(studentId));
      if (!student) return; // Ignores inactive students

      const eventsList = studentEvents[studentId] || [];
      eventsList.forEach(event => {
        if (isDateInEventRange(cellDate, event.dateTime)) {
          dayEvents.push({
            student,
            title: event.title,
            tag: event.tag,
            dateTime: event.dateTime,
            location: event.location
          });
        }
      });
    });

    // Consolidated grouping filter - Group identically configured events on this day
    const dayEventsGrouped = [];
    dayEvents.forEach(e => {
      const existing = dayEventsGrouped.find(ge => 
        ge.title === e.title && 
        ge.dateTime === e.dateTime && 
        ge.location === e.location && 
        ge.tag === e.tag
      );
      if (existing) {
        // Only append to the attendees list if it isn't an attendee-free event [3]
        if (!e.location.endsWith("\u200b") && e.student) {
          existing.students.push(e.student);
        }
      } else {
        dayEventsGrouped.push({
          title: e.title,
          tag: e.tag,
          dateTime: e.dateTime,
          location: e.location,
          students: (!e.location.endsWith("\u200b") && e.student) ? [e.student] : []
        });
      }
    });

    cells.push({
      isPadding: false,
      dayNum: d,
      dateObj: cellDate,
      lessons: dayLessons,
      events: dayEventsGrouped // Exposing the compiled consolidated group list to view
    });
  }

  return (
    <div className="bg-slate-800/40 rounded-2xl p-6 max-w-5xl mx-auto border border-slate-800">
      
      {/* Calendar Header Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Icon name="calendar" className="w-6 h-6 text-purple-900" />
            <span>Monthly Calendar</span>
          </h2>
        </div>

        {/* Balanced Pagination Controls with Center Aligned Options */}
        <div className="flex items-center justify-center bg-slate-900 rounded-xl p-1.5 gap-2 h-12 border border-slate-700">
          
          <button 
            onClick={handlePrevYear} 
            className="px-2.5 py-1 h-full text-slate-100 hover:text-white hover:bg-slate-800 rounded-lg text-xs font-bold transition-colors flex items-center justify-center select-none animate-fade-in"
            title="Previous Year"
          >
            « Year
          </button>
          
          <button 
            onClick={handlePrevMonth} 
            className="px-2.5 py-1 h-full text-slate-100 hover:text-white hover:bg-slate-800 rounded-lg text-xs font-bold transition-colors flex items-center justify-center select-none animate-fade-in"
            title="Previous Month"
          >
            ‹ Month
          </button>
          
          {/* Central month/year indicator */}
          <div className="px-4 py-1 flex items-center justify-center h-full min-w-[180px] text-center">
            {isEditingHeader ? (
              <div className="flex items-center gap-2">
                <select
                  value={month}
                  onChange={(e) => {
                    setCurrentDate(new Date(year, parseInt(e.target.value, 10), 1));
                  }}
                  className="bg-transparent text-white text-xs font-bold border-b-2 border-slate-500 px-1 py-0.5 focus:outline-none cursor-pointer appearance-none"
                >
                  {monthNames.map((name, idx) => (
                    <option key={idx} value={idx} className="bg-slate-900">{name}</option>
                  ))}
                </select>
                
                <select
                  value={year}
                  onChange={(e) => {
                    setCurrentDate(new Date(parseInt(e.target.value, 10), month, 1));
                  }}
                  className="bg-transparent text-white text-xs font-bold border-b-2 border-slate-500 px-1 py-0.5 focus:outline-none cursor-pointer appearance-none"
                >
                  {yearOptions.map(yr => (
                    <option key={yr} value={yr} className="bg-slate-900">{yr}</option>
                  ))}
                </select>
                
                <button
                  onClick={() => {
                    setIsEditingHeader(false);
                  }}
                  className="p-1 rounded bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-extrabold transition-colors flex items-center justify-center h-5 w-5"
                  title="Apply Selection"
                >
                  ✓
                </button>
              </div>
            ) : (
              <div 
                onClick={() => setIsEditingHeader(true)}
                className="cursor-pointer border-b-2 border-purple-500 font-bold text-sm text-white select-none flex items-center justify-center gap-1.5 transition-all h-8 pb-1.5"
                title="Click to manually choose Month/Year"
              >
                <span>{monthNames[month]} {year}</span>
              </div>
            )}
          </div>

          <button 
            onClick={handleNextMonth} 
            className="px-2.5 py-1 h-full text-slate-100 hover:text-white hover:bg-slate-800 rounded-lg text-xs font-bold transition-colors flex items-center justify-center select-none animate-fade-in"
            title="Next Month"
          >
            Month ›
          </button>
          
          <button 
            onClick={handleNextYear} 
            className="px-2.5 py-1 h-full text-slate-100 hover:text-white hover:bg-slate-800 rounded-lg text-xs font-bold transition-colors flex items-center justify-center select-none animate-fade-in"
            title="Next Year"
          >
            Year »
          </button>
          
        </div>
      </div>

      {/* Grid Layout Container */}
      <div className="grid grid-cols-7 gap-2">
        {/* Vertically and horizontally centered weekday labels */}
        {daysOfWeek.map(label => (
          <div 
            key={label} 
            className="flex items-center justify-center font-bold text-xs text-indigo-900 uppercase tracking-wider h-10 border-b border-slate-700/80 select-none"
          >
            {label}
          </div>
        ))}

        {/* Days of Month Grid */}
        {cells.map((cell, index) => {
          if (cell.isPadding) {
            return (
              <div 
                key={`pad-${index}`} 
                className="bg-slate-900/10 border border-slate-800/10 min-h-[115px] rounded-xl opacity-20"
              />
            );
          }

          const isToday = new Date().toDateString() === cell.dateObj.toDateString();
          const hasActivity = cell.lessons.length > 0 || cell.events.length > 0;

          return (
            <div
              key={`day-${cell.dayNum}`}
              onClick={() => setSelectedDay(cell)}
              className={`min-h-[115px] bg-slate-900/40 hover:bg-slate-800/60 p-3 rounded-xl border transition flex flex-col justify-between group cursor-pointer
                ${isToday 
                  ? 'border-purple-500 bg-purple-500/5 shadow-md shadow-purple-500/10' 
                  : 'border-slate-700/80 hover:border-indigo-500'
                }
              `}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isToday ? 'bg-purple-600 text-white' : 'text-slate-100 group-hover:text-white'}`}>
                  {cell.dayNum}
                </span>
                
                {/* Subtle indicator icon if any events or lessons exist on this day */}
                {hasActivity && (
                  <span className="w-2 h-2 rounded-full bg-purple-800 animate-pulse" />
                )}
              </div>
              <div className="flex-1" />
            </div>
          );
        })}
      </div>

      {/* Selected Day details modal */}
      {selectedDay && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          {/* Modal layout and elements enlarged proportionally by 1.5x */}
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-9 w-full max-w-2xl relative animate-fade-in">
            <button
              onClick={() => setSelectedDay(null)}
              className="absolute top-6 right-6 text-slate-100 hover:text-white text-2xl font-bold transition-colors"
              title="Close Schedule"
            >
              ✕
            </button>

            <div className="mb-6">
              <h3 className="font-bold text-white text-2xl">
                {monthNames[selectedDay.dateObj.getMonth()]} {selectedDay.dayNum}, {selectedDay.dateObj.getFullYear()}
              </h3>
              <p className="text-sm text-indigo-900 font-semibold uppercase tracking-wider mt-1">
                {dbWeekdays[selectedDay.dateObj.getDay()]} Schedule
              </p>
            </div>

            <div className="flex flex-col gap-8 max-h-[570px] overflow-y-auto pr-2">
              
              {/* --- LESSONS SECTION --- */}
              <div>
                <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-1">Lessons</h4>
                {/* Underline segment limited to 1/5th (20%) of the popup container width */}
                <div className="w-1/5 border-b-2 border-slate-500 mb-5" />
                
                {selectedDay.lessons.length === 0 ? (
                  <p className="text-xs text-slate-300 italic py-2">No lessons scheduled.</p>
                ) : (
                  <div className="flex flex-col">
                    {selectedDay.lessons.map((l, index) => (
                      <div
                        key={index}
                        className="py-4 flex flex-col gap-1.5 border-b border-slate-500 last:border-b-0"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="font-bold text-white text-base">{l.student.name}</h5>
                            <p className="text-xs text-slate-200">Level: {l.student.level}</p>
                          </div>
                          {/* Naming convention updated from 'Rescheduled' to 'Makeup' / 'Regular' */}
                          <span className={`text-xs uppercase font-bold px-2 py-0.5 rounded border ${
                            l.isRescheduled ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          }`}>
                            {l.isRescheduled ? 'Makeup' : 'Regular'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-sm text-slate-100">
                          <Icon name="clock" className="w-4 h-4 text-indigo-800" />
                          <span className="font-semibold">{l.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* --- EVENTS SECTION --- */}
              <div>
                <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-1">Events</h4>
                {/* Underline segment limited to 1/5th (20%) of the popup container width */}
                <div className="w-1/5 border-b-2 border-slate-500 mb-5" />
                
                {selectedDay.events.length === 0 ? (
                  <p className="text-xs text-slate-300 italic py-2">No single-day events scheduled.</p>
                ) : (
                  <div className="flex flex-col">
                    {selectedDay.events.map((e, index) => {
                      let tagClass = "tag-festival";
                      if (e.tag === "Recital") tagClass = "tag-recital";
                      if (e.tag === "Exam") tagClass = "tag-exam";
                      if (e.tag === "Masterclass") tagClass = "tag-masterclass";
                      if (e.tag === "Vacation") tagClass = "tag-vacation";

                      const isGlobal = e.location.endsWith("\u200b");
                      const displayLocation = isGlobal ? e.location.replace(/\u200b/g, "") : e.location;

                      return (
                        <div key={index} className="py-4 flex flex-col gap-1.5 border-b border-slate-500 last:border-b-0">
                          <div className="flex justify-between items-start gap-2">
                            <h5 className="font-bold text-white text-sm leading-tight">{e.title}</h5>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold tracking-wider uppercase ${tagClass}`}>{e.tag}</span>
                          </div>
                          
                          <p className="text-xs text-slate-200 mt-1">
                            {isGlobal 
                              ? "Attendees: (None)"
                              : `Students: ${e.students.map(s => s.name).join(", ")}`
                            }
                          </p>
                          
                          <div className="flex items-center gap-2 text-xs text-slate-200 mt-1.5">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-indigo-800">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                            </svg>
                            <span>{displayLocation}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

            <button
              onClick={() => setSelectedDay(null)}
              className="w-full mt-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-base transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

window.CalendarPage = CalendarPage;