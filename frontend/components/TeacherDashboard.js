// components/TeacherDashboard.js
const TeacherDashboard = ({
  globalReminders = [],
  addGlobalReminder,
  removeGlobalReminder,
  updateGlobalReminder,
  students,
  lessons,
  openScheduleModal,
  conflicts = [],
  studentEvents = {},
  addStudioEvent,
  removeStudioEvent,
  updateStudioEvent
}) => {
  const { useState, useEffect } = React;
  const Icon = window.Icon;

  // Modal display toggler
  const [showAddEventModal, setShowAddEventModal] = useState(false);

  // Local form states for creating a new user reminder
  const [reminderText, setReminderText] = useState("");
  const [reminderDate, setReminderDate] = useState("");

  // Local state for editing inline
  const [editingReminderId, setEditingReminderId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [editingDate, setEditingDate] = useState("");

  // Form states for creating a new Studio Event
  const [eventTitle, setEventTitle] = useState("");
  const [eventDateTime, setEventDateTime] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventTag, setEventTag] = useState("Festival");
  const [selectedAttendees, setSelectedAttendees] = useState([]);
  const [isMultiDay, setIsMultiDay] = useState(false);

  // Local state for Vacation date ranges
  const [vacStartDate, setVacStartDate] = useState(window.utils.getTodayDateStr());
  const [vacEndDate, setVacEndDate] = useState(window.utils.getTodayDateStr());

  // New state for searching attendees inside the Event creator
  const [attendeeQuery, setAttendeeQuery] = useState("");

  // Local state for editing Studio Events inline
  const [editingStudioEventIds, setEditingStudioEventIds] = useState(null);
  const [editingEventTitle, setEditingEventTitle] = useState("");
  const [editingEventDateTime, setEditingEventDateTime] = useState("");
  const [editingEventLocation, setEditingEventLocation] = useState("");
  const [editingEventTag, setEditingEventTag] = useState("Festival");
  const [editingSelectedAttendees, setEditingSelectedAttendees] = useState([]);
  const [editingAttendeeQuery, setEditingAttendeeQuery] = useState("");
  const [isEditingMultiDay, setIsEditingMultiDay] = useState(false);

  // Auto-serialize start and end dates when Multi-day is active
  useEffect(() => {
    if (isMultiDay) {
      setEventDateTime(`${vacStartDate} to ${vacEndDate}`);
    }
  }, [vacStartDate, vacEndDate, isMultiDay]);

  const activeStudents = students.filter(student => student.isActive !== false);

  const handleAddReminder = () => {
    if (!reminderText.trim()) return;
    addGlobalReminder(reminderText.trim(), reminderDate);
    setReminderText("");
    setReminderDate("");
  };

  const handleStartEdit = (reminder) => {
    setEditingReminderId(reminder.id);
    setEditingText(reminder.text);
    setEditingDate(reminder.date || "");
  };

  const handleSaveEdit = async (id) => {
    await updateGlobalReminder(id, editingText, editingDate);
    setEditingReminderId(null);
  };

  const handleCreateStudioEvent = async () => {
    if (!eventTitle.trim() || !eventDateTime || !eventLocation.trim()) return;
    
    await addStudioEvent({
      title: eventTitle.trim(),
      dateTime: eventDateTime,
      location: eventLocation.trim(),
      tag: eventTag
    }, selectedAttendees);

    setEventTitle("");
    setEventDateTime("");
    setEventLocation("");
    setEventTag("Festival");
    setSelectedAttendees([]);
    setAttendeeQuery("");
    setIsMultiDay(false);
    setShowAddEventModal(false); // Close the modal upon success
  };

  const handleStartStudioEdit = (evt) => {
    setEditingStudioEventIds(evt.ids);
    setEditingEventTitle(evt.title);
    setEditingEventDateTime(evt.dateTime);
    setEditingEventLocation(evt.location);
    setEditingEventTag(evt.tag);
    setEditingSelectedAttendees(evt.attendees.map(a => a.student_id));
    setEditingAttendeeQuery("");
    setIsEditingMultiDay(evt.dateTime.includes(" to "));
  };

  const handleSaveStudioEdit = async () => {
    if (!editingEventTitle.trim() || !editingEventDateTime || !editingEventLocation.trim()) return;
    
    await updateStudioEvent(editingStudioEventIds, {
      title: editingEventTitle.trim(),
      dateTime: editingEventDateTime,
      location: editingEventLocation.trim(),
      tag: editingEventTag
    }, editingSelectedAttendees);
    
    setEditingStudioEventIds(null);
  };

  // Sort global reminders
  const sortedReminders = [...globalReminders].sort((a, b) => {
    const hasA = !!a.date;
    const hasB = !!b.date;
    if (hasA && hasB) {
      return new Date(a.date) - new Date(b.date);
    }
    if (hasA && !hasB) return -1;
    if (!hasA && hasB) return 1;
    return 0;
  });

  const formatDateStr = (dateStr) => {
    if (!dateStr) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split("-").map(num => parseInt(num, 10));
      const d = new Date(year, month - 1, day);
      return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  };

  // Standardized timezone-insensitive "YYYY-MM-DD" local date formatting inside Dashboard Panel
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

  const allStudentEvents = [];

  // Load global studio-wide events
  const globalEventsList = studentEvents["global"] || [];
  globalEventsList.forEach(event => {
    allStudentEvents.push({ ...event, student: null });
  });

  // Load student-specific events
  activeStudents.forEach(student => {
    const eventsList = studentEvents[student.student_id] || [];
    eventsList.forEach(event => {
      allStudentEvents.push({ ...event, student });
    });
  });

  const groupedStudioEvents = [];
  allStudentEvents.forEach(e => {
    const existing = groupedStudioEvents.find(g => 
      g.title === e.title && 
      g.dateTime === e.dateTime && 
      g.location === e.location && 
      g.tag === e.tag
    );
    if (existing) {
      if (e.student) {
        existing.attendees.push(e.student);
      }
      existing.ids.push(e.id);
    } else {
      groupedStudioEvents.push({
        title: e.title,
        tag: e.tag,
        dateTime: e.dateTime,
        location: e.location,
        attendees: e.student ? [e.student] : [],
        ids: [e.id]
      });
    }
  });

  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  const sortedStudioEvents = groupedStudioEvents
    .filter(e => {
      if (e.dateTime.includes(" to ")) {
        const [, endStr] = e.dateTime.split(" to ");
        return new Date(endStr).getTime() >= todayMidnight.getTime();
      }
      return new Date(e.dateTime).getTime() >= todayMidnight.getTime();
    })
    .sort((a, b) => {
      const getCompareTime = (dtStr) => {
        if (dtStr.includes(" to ")) return new Date(dtStr.split(" to ")[0]).getTime() || 0;
        return new Date(dtStr).getTime() || 0;
      };
      return getCompareTime(a.dateTime) - getCompareTime(b.dateTime);
    });

  const filteredAttendees = activeStudents.filter(student =>
    student.name.toLowerCase().includes(attendeeQuery.toLowerCase())
  );

  const filteredEditingAttendees = activeStudents.filter(student =>
    student.name.toLowerCase().includes(editingAttendeeQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* LEFT COLUMN: Studio Reminders */}
        <div className="lg:col-span-2 bg-slate-800/40 rounded-2xl p-6 border border-slate-800 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Studio Reminders</h2>
              <p className="text-slate-100 text-sm">General reminders and schedule tasks</p>
            </div>
          </div>

          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700 flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 flex flex-col gap-1.5 w-full">
              <label className="text-[10px] font-bold text-slate-100 uppercase tracking-wider px-1">Reminder Text</label>
              <input
                type="text"
                placeholder="e.g. Prepare recital sheets, order books..."
                value={reminderText}
                onChange={(e) => setReminderText(e.target.value)}
                className="w-full px-3 rounded-xl border border-slate-700 text-xs bg-white text-slate-100 h-10"
              />
            </div>

            <div className="w-full sm:w-48 flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-100 uppercase tracking-wider px-1">Date (Optional)</label>
              <input
                type="date"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                className="w-full px-3 rounded-xl border border-slate-700 text-xs bg-white text-slate-100 text-center h-10"
              />
            </div>

            <button
              onClick={handleAddReminder}
              disabled={!reminderText.trim()}
              className={`font-bold text-xs rounded-xl transition shrink-0 w-full sm:w-auto btn-align px-6 ${
                !reminderText.trim()
                  ? "bg-purple-600 text-white cursor-not-allowed opacity-40"
                  : "bg-purple-600 hover:bg-purple-500 text-white"
              }`}
            >
              <Icon name="plus" className="w-3.5 h-3.5 mr-1" /> Add
            </button>
          </div>

          <div className="flex flex-col gap-3 max-h-[365px] overflow-y-auto pr-2 mt-2">
            {sortedReminders.length === 0 ? (
              <div className="text-center text-slate-100 py-12 bg-slate-900/40 border border-dashed border-slate-700 rounded-2xl">
                <Icon name="message" className="w-8 h-8 mx-auto mb-3 text-slate-100" />
                <p className="font-normal text-sm">No studio reminders</p>
                <p className="text-xs text-slate-300 mt-1">Use the form above to add your first reminder card</p>
              </div>
            ) : (
              sortedReminders.map(reminder => (
                <div
                  key={reminder.id}
                  className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 hover:border-purple-500/40 transition shrink-0 relative pr-12 min-h-[72px]"
                >
                  {editingReminderId === reminder.id ? (
                    <div className="flex-1 flex flex-col gap-2 w-full">
                      <input
                        type="text"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="bg-slate-800 px-3 rounded text-xs text-white border border-slate-700 w-full h-10"
                      />
                      <div className="flex gap-2 items-center">
                        <input
                          type="date"
                          value={editingDate}
                          onChange={(e) => setEditingDate(e.target.value)}
                          className="bg-slate-800 px-3 rounded text-[11px] text-white border border-slate-700 h-10"
                        />
                        <button
                          onClick={() => handleSaveEdit(reminder.id)}
                          className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 border border-emerald-500/30 font-bold text-[10px] px-2.5 py-1 rounded transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingReminderId(null)}
                          className="bg-slate-500/10 hover:bg-slate-500/20 text-slate-700 border border-slate-500/30 font-bold text-[10px] px-2.5 py-1 rounded transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-normal text-slate-100 break-words whitespace-pre-wrap">
                        {reminder.text}
                      </p>
                      {reminder.date && (
                        <span className="inline-flex items-center gap-1.5 text-[10px] text-indigo-900 font-bold bg-indigo-100 px-2 py-0.5 rounded-full mt-2 border border-indigo-200">
                          <Icon name="calendar" className="w-3 h-3 text-indigo-800" />
                          {formatDateStr(reminder.date)}
                        </span>
                      )}
                    </div>
                  )}

                  {editingReminderId !== reminder.id && (
                    <div className="absolute right-4 top-0 bottom-0 flex flex-col justify-center gap-2">
                      <button
                        onClick={() => removeGlobalReminder(reminder.id)}
                        className="text-slate-300 hover:text-red-500 transition font-bold p-1 text-xs"
                        title="Remove reminder"
                      >
                        ✕
                      </button>
                      <button
                        onClick={() => handleStartEdit(reminder)}
                        className="text-slate-300 hover:text-indigo-400 transition p-1"
                        title="Edit reminder"
                      >
                        <Icon name="pencil" className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Studio Events */}
        <div className="lg:col-span-1 bg-slate-800/40 rounded-2xl p-6 border border-slate-800 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Studio Events</h2>
              <p className="text-slate-100 text-sm">Organize group events and recitals</p>
            </div>
            
            <button
              onClick={() => setShowAddEventModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 border border-slate-700 rounded-xl text-xs font-bold text-white transition shadow-sm shrink-0"
              title="Add Studio Event"
            >
              <Icon name="plus" className="w-3.5 h-3.5 text-white" /> Add
            </button>
          </div>

          <div className="flex flex-col gap-3 max-h-[460px] overflow-y-auto pr-1">
            {sortedStudioEvents.length === 0 ? (
              <p className="text-center text-xs text-slate-300 italic py-6">No upcoming studio events</p>
            ) : (
              sortedStudioEvents.map((evt, idx) => {
                let tagClass = "tag-festival";
                if (evt.tag === "Recital") tagClass = "tag-recital";
                if (evt.tag === "Exam") tagClass = "tag-exam";
                if (evt.tag === "Masterclass") tagClass = "tag-masterclass";
                if (evt.tag === "Vacation") tagClass = "tag-vacation";

                const isEditingThisGroup = editingStudioEventIds && editingStudioEventIds[0] === evt.ids[0];
                const isGlobal = evt.location.endsWith("\u200b");
                const displayLocation = isGlobal ? evt.location.replace(/\u200b/g, "") : evt.location;

                return (
                  <div key={idx} className="bg-slate-900/60 p-3 rounded-xl border border-slate-700 text-xs flex flex-col gap-1.5 relative animate-fade-in">
                    {isEditingThisGroup ? (
                      <div className="flex flex-col gap-2.5 w-full">
                        <span className="text-[9.5px] uppercase font-bold text-slate-300">Edit Studio Event</span>
                        <input
                          type="text"
                          value={editingEventTitle}
                          onChange={(e) => setEditingEventTitle(e.target.value)}
                          className="bg-slate-800 p-2 rounded text-xs text-white border border-slate-700 w-full h-10"
                          placeholder="Event Title"
                        />
                        
                        {/* Inline editor's dynamic date/range selectors */}
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
                          className="bg-slate-800 p-2 rounded text-xs text-white border border-slate-700 w-full appearance-none h-10"
                        >
                          <option value="Festival">Festival</option>
                          <option value="Recital">Recital</option>
                          <option value="Exam">Exam</option>
                          <option value="Masterclass">Masterclass</option>
                          <option value="Vacation">Vacation</option>
                        </select>
                        
                        <input
                          type="text"
                          value={editingEventLocation}
                          onChange={(e) => setEditingEventLocation(e.target.value)}
                          className="bg-slate-800 p-2 rounded text-xs text-white border border-slate-700 w-full h-10"
                          placeholder="Location"
                        />

                        <div className="flex flex-col gap-1 w-full mt-1">
                          <span className="text-[8.5px] uppercase font-bold text-slate-300 px-1">Attendees</span>
                          
                          {/* Inline search bar with Select All Toggle */}
                          <div className="flex gap-2 w-full">
                            <input
                              type="text"
                              placeholder="Filter students..."
                              value={editingAttendeeQuery}
                              onChange={(e) => setEditingAttendeeQuery(e.target.value)}
                              className="flex-1 p-1.5 rounded text-[10px] text-slate-100 border border-slate-700 bg-white h-10"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const allActiveIds = activeStudents.map(s => s.student_id);
                                if (editingSelectedAttendees.length === allActiveIds.length) {
                                  setEditingSelectedAttendees([]);
                                } else {
                                  setEditingSelectedAttendees(allActiveIds);
                                }
                              }}
                              className="px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-[10px] font-bold rounded h-10 shrink-0 cursor-pointer"
                            >
                              {editingSelectedAttendees.length === activeStudents.length ? "Deselect" : "Select All"}
                            </button>
                          </div>

                          <div className="bg-slate-800 p-2 rounded border border-slate-700 max-h-[90px] overflow-y-auto flex flex-col gap-1.5 mt-1">
                            {filteredEditingAttendees.map(student => (
                              <label key={student.student_id} className="flex items-center gap-2 px-1 py-0.5 hover:bg-slate-700 rounded cursor-pointer text-[10px] text-slate-100">
                                <input
                                  type="checkbox"
                                  checked={editingSelectedAttendees.includes(student.student_id)}
                                  onChange={() => {
                                    if (editingSelectedAttendees.includes(student.student_id)) {
                                      setEditingSelectedAttendees(editingSelectedAttendees.filter(id => id !== student.student_id));
                                    } else {
                                      setEditingSelectedAttendees([...editingSelectedAttendees, student.student_id]);
                                    }
                                  }}
                                  className="rounded border-slate-600 bg-slate-700 text-purple-600 focus:ring-purple-500 h-3 w-3 cursor-pointer"
                                />
                                <span className="truncate">{student.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-2 mt-1">
                          <button
                            onClick={handleSaveStudioEdit}
                            disabled={!editingEventTitle.trim() || !editingEventDateTime || !editingEventLocation.trim()}
                            className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 border border-emerald-500/30 font-bold text-[10px] px-2.5 py-1.5 rounded transition-colors disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingStudioEventIds(null)}
                            className="bg-slate-500/10 hover:bg-slate-500/20 text-slate-700 border border-slate-500/30 font-bold text-[10px] px-2.5 py-1.5 rounded transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start gap-2 pr-6">
                          <h5 className="font-bold text-white text-xs leading-tight truncate">{evt.title}</h5>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${tagClass}`}>{evt.tag}</span>
                        </div>

                        <div className="flex flex-col gap-1 text-slate-100 text-[10px] pr-6 font-normal">
                          <div>Date: {formatEventDate(evt.dateTime)}</div>
                          <div className="truncate">Where: {displayLocation}</div>
                          {isGlobal ? (
                            <div className="text-indigo-800 font-bold">Attendees: (None)</div>
                          ) : (
                            <div className="text-indigo-800 font-bold">Attendees ({evt.attendees.length}): {evt.attendees.map(a => a.name).join(", ")}</div>
                          )}
                        </div>

                        <div className="absolute right-3 top-0 bottom-0 flex flex-col justify-center gap-2">
                          <button
                            onClick={() => removeStudioEvent(evt.ids)}
                            className="text-slate-300 hover:text-red-500 font-bold p-0.5 text-xs transition"
                            title="Cancel Event"
                          >
                            ✕
                          </button>
                          <button
                            onClick={() => handleStartStudioEdit(evt)}
                            className="text-slate-300 hover:text-indigo-400 p-0.5 transition"
                            title="Edit Event"
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

      </div>

      {/* --- WEEKLY HORIZONTAL GRID --- */}
      <div className="bg-slate-800/40 rounded-2xl p-6 border border-slate-800">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-5">
          <div>
            <h3 className="font-bold text-white text-base uppercase tracking-wider">Weekly Schedule</h3>
            <p className="text-xs text-slate-400 mt-1 font-medium">Click on any lesson block to reschedule that student instantly.</p>
          </div>
        </div>
        
        {/* Expanded vertically (min-h-[320px] and max-h-[250px]) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(day => {
            const dayLessons = activeStudents.map(student => {
              const rescheduled = lessons.find(l => String(l.student_id) === String(student.student_id));
              if (rescheduled) {
                if (rescheduled.weekday === day) {
                  const sameFormattedTime = (rescheduled.time || "").trim().toLowerCase().replace(/\s+/g, "") === 
                                            (student.baseTime || "").trim().toLowerCase().replace(/\s+/g, "");
                  const sameRawTime = rescheduled.rawTime && student.baseRawTime && 
                                      (rescheduled.rawTime.trim() === student.baseRawTime.trim());

                  const isActualReschedule = !(sameFormattedTime || sameRawTime);
                  return { student, time: rescheduled.time, isRescheduled: isActualReschedule };
                }
              } else {
                if (student.baseWeekday === day) {
                  return { student, time: student.baseTime, isRescheduled: false };
                }
              }
              return null;
            }).filter(Boolean);

            dayLessons.sort((a, b) => a.time.localeCompare(b.time));

            return (
              <div key={day} className="bg-slate-900/60 rounded-xl p-4 border border-slate-700 min-h-[320px] flex flex-col gap-2">
                <span className="font-bold text-xs text-indigo-900 uppercase tracking-wider weekly-day-header pb-2 mb-1 block">
                  {day}
                </span>

                <div className="flex-1 flex flex-col gap-2 overflow-y-auto max-h-[250px] pr-1">
                  {dayLessons.length === 0 ? (
                    <span className="text-[10px] text-slate-300 italic block py-6 text-center my-auto">No lessons</span>
                  ) : (
                    dayLessons.map(({ student, time, isRescheduled }, idx) => (
                      <div
                        key={idx}
                        onClick={() => openScheduleModal(student)}
                        className={`p-2.5 rounded-xl text-[11px] border leading-tight shrink-0 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all select-none ${isRescheduled
                            ? "bg-red-500/10 border-red-500/30 text-red-700 hover:bg-red-500/15"
                            : "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/15"
                          }`}
                        title={`Click to reschedule ${student.name}`}
                      >
                        <div className="font-bold truncate text-slate-100">{student.name}</div>
                        <div className="text-slate-100 mt-1 font-medium">{time}</div>
                        {isRescheduled ? (
                          <span className="text-[9px] uppercase tracking-wider font-extrabold text-red-500 mt-1 block">Makeup</span>
                        ) : (
                          <span className="text-[9px] uppercase tracking-wider font-extrabold text-emerald-500 mt-1 block">Regular</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* --- CONFLICTS SECTION --- */}
      <div className="bg-slate-800/40 rounded-2xl p-6 border border-slate-800">
        <div className="flex items-center gap-2 mb-5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          <h3 className="font-bold text-white text-base uppercase tracking-wider">Schedule Conflicts</h3>
        </div>

        {conflicts.length === 0 ? (
          <p className="text-xs text-slate-300 italic py-2">No active lesson lesson conflicts detected.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {conflicts.map((conflict, idx) => (
              <div 
                key={idx} 
                className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
              >
                {conflict.type === "event" ? (
                  <>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-white text-base">{conflict.student1.name}: (Lesson)</div>
                      <div className="text-xs text-slate-100 mt-1">
                        {conflict.day}: {conflict.time1} - {conflict.endTime1}
                      </div>
                    </div>

                    <div className="hidden sm:block text-red-500 font-bold px-4 text-xs uppercase tracking-widest">
                      vs
                    </div>

                    <div className="flex-1 min-w-0 sm:text-right w-full">
                      <div className="font-bold text-white text-base">{conflict.student1.name}: {conflict.eventName} (Event)</div>
                      <div className="text-xs text-slate-100 mt-1">
                        {conflict.day}: {conflict.time2} - {conflict.endTime2}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-white text-base">{conflict.student1.name}</div>
                      <div className="text-xs text-slate-100 mt-1">
                        {conflict.day}: {conflict.time1} - {conflict.endTime1}
                      </div>
                    </div>

                    <div className="hidden sm:block text-slate-400 font-bold px-4 text-xs uppercase tracking-widest">
                      vs
                    </div>

                    <div className="flex-1 min-w-0 sm:text-right w-full">
                      <div className="font-bold text-white text-base">{conflict.student2.name}</div>
                      <div className="text-xs text-slate-100 mt-1">
                        {conflict.day}: {conflict.time2} - {conflict.endTime2}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- ADD STUDIO EVENT DIALOG MODAL --- */}
      {showAddEventModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 w-full max-w-md relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowAddEventModal(false)}
              className="absolute top-4 right-4 text-slate-100 hover:text-white font-bold"
            >
              ✕
            </button>

            <div className="mb-6">
              <h3 className="text-2xl font-bold text-white">Add Studio Event</h3>
              <p className="text-xs text-slate-100 mt-1">Organize a new group event or studio recital</p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-100 uppercase tracking-wider px-1">Event Title</label>
                <input
                  type="text"
                  placeholder="Event Title"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="w-full p-2.5 rounded-lg text-xs text-slate-100 border border-slate-700 bg-white font-normal h-10"
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1 w-full">
                  <span className="text-[9px] uppercase font-bold text-slate-300">Event Tag</span>
                  <select
                    value={eventTag}
                    onChange={(e) => setEventTag(e.target.value)}
                    className="p-2 rounded-lg text-xs appearance-none text-slate-100 border border-slate-700 bg-white w-full h-10"
                  >
                    <option value="Festival">Festival</option>
                    <option value="Recital">Recital</option>
                    <option value="Exam">Exam</option>
                    <option value="Masterclass">Masterclass</option>
                    <option value="Vacation">Vacation</option>
                  </select>
                </div>

                {/* Optional Multi-day selector checkbox */}
                <div className="flex items-center gap-2 pt-1">
                  <label className="flex items-center gap-1.5 text-[10px] text-slate-100 font-bold uppercase cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isMultiDay}
                      onChange={(e) => {
                        setIsMultiDay(e.target.checked);
                        if (e.target.checked) {
                          setEventDateTime(`${vacStartDate} to ${vacEndDate}`);
                        } else {
                          setEventDateTime("");
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
                      <span className="text-[9px] uppercase font-bold text-slate-300">Start Date</span>
                      <input
                        type="date"
                        value={vacStartDate}
                        onChange={(e) => setVacStartDate(e.target.value)}
                        className="p-2 rounded-lg text-xs text-slate-100 border border-slate-700 bg-white w-full h-10"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] uppercase font-bold text-slate-300">End Date</span>
                      <input
                        type="date"
                        value={vacEndDate}
                        onChange={(e) => setVacEndDate(e.target.value)}
                        className="p-2 rounded-lg text-xs text-slate-100 border border-slate-700 bg-white h-10"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] uppercase font-bold text-slate-300">Date & Time</span>
                    <input
                      type="datetime-local"
                      value={eventDateTime}
                      onChange={(e) => setEventDateTime(e.target.value)}
                      className="p-2 rounded-lg text-xs text-slate-100 border border-slate-700 bg-white w-full h-10"
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-100 uppercase tracking-wider px-1">Location</label>
                <input
                  type="text"
                  placeholder="Location"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  className="w-full p-2.5 rounded-lg text-xs text-slate-100 border border-slate-700 bg-white font-normal h-10"
                />
              </div>

              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-[9px] font-bold text-slate-100 uppercase tracking-wider px-1">Select Attendees (Optional)</label>
                
                {/* Search bar with matching Select All button alignment */}
                <div className="flex gap-2 w-full">
                  <input
                    type="text"
                    placeholder="Filter students..."
                    value={attendeeQuery}
                    onChange={(e) => setAttendeeQuery(e.target.value)}
                    className="flex-1 p-2 rounded-lg text-[11px] text-slate-100 border border-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 h-10"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const allActiveIds = activeStudents.map(s => s.student_id);
                      if (selectedAttendees.length === allActiveIds.length) {
                        setSelectedAttendees([]);
                      } else {
                        setSelectedAttendees(allActiveIds);
                      }
                    }}
                    className="px-3 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-xs font-bold rounded-lg h-10 btn-align shrink-0 cursor-pointer"
                  >
                    {selectedAttendees.length === allActiveIds.length ? "Deselect All" : "Select All"}
                  </button>
                </div>

                <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-700 max-h-[105px] overflow-y-auto flex flex-col gap-2">
                  {filteredAttendees.length === 0 ? (
                    <span className="text-[9px] text-slate-300 italic text-center py-2">
                      {activeStudents.length === 0 ? "No active students" : "No matching students"}
                    </span>
                  ) : (
                    filteredAttendees.map(student => (
                      <label key={student.student_id} className="flex items-center gap-2 px-1 py-0.5 hover:bg-slate-800 rounded cursor-pointer text-[11px] text-slate-100">
                        <input
                          type="checkbox"
                          checked={selectedAttendees.includes(student.student_id)}
                          onChange={() => {
                            if (selectedAttendees.includes(student.student_id)) {
                              setSelectedAttendees(selectedAttendees.filter(id => id !== student.student_id));
                            } else {
                              setSelectedAttendees([...selectedAttendees, student.student_id]);
                            }
                          }}
                          className="rounded border-slate-600 bg-slate-700 text-purple-600 focus:ring-purple-500 h-3.5 w-3.5 cursor-pointer"
                        />
                        <span className="truncate">{student.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* REMOVED: selected attendees validation so clicking create works even with 0 selections */}
              <button
                onClick={handleCreateStudioEvent}
                disabled={!eventTitle.trim() || !eventDateTime || !eventLocation.trim()}
                className={`w-full py-3 font-bold text-xs uppercase rounded-xl transition ${
                  (!eventTitle.trim() || !eventDateTime || !eventLocation.trim())
                    ? "bg-purple-600 text-white cursor-not-allowed opacity-40"
                    : "bg-purple-600 hover:bg-purple-500 text-white cursor-pointer"
                }`}
              >
                Create Studio Event
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

window.TeacherDashboard = TeacherDashboard;