// components/ScheduleModal.js
const ScheduleModal = ({
  show,
  onClose,
  selectedStudent,
  scheduleMode,
  rescheduleWeekday,
  setRescheduleWeekday,
  rescheduleTime,
  setRescheduleTime,
  onSave,
  generateSuggestions
}) => {
  const { useState, useEffect, useRef } = React;

  // AI Chat States
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);

  // Auto-Scroll Reference
  const chatBottomRef = useRef(null);

  // Initialize and reset the chat session each time the modal opens
  useEffect(() => {
    if (show && selectedStudent) {
      setChatHistory([
        { 
          role: "model", 
          content: `Hi! I'm your AI assistant. Tell me a day, and I'll find open slots for ${selectedStudent.name}.` 
        }
      ]);
      setChatMessage("");
    }
  }, [show, selectedStudent]);

  // Auto-scroll to bottom of chat container on update
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory, chatLoading]);

  if (!show) return null;

  // Send conversational prompt to local FastAPI /api/ai-chat endpoint
  const handleSendChat = async () => {
    if (!chatMessage.trim() || chatLoading) return;

    const userMsg = chatMessage.trim();
    const updatedHistory = [...chatHistory, { role: "user", content: userMsg }];
    
    setChatHistory(updatedHistory);
    setChatMessage("");
    setChatLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/ai-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: userMsg,
          history: chatHistory.slice(1), // Exclude the greeting from API history
          studentId: selectedStudent?.student_id
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setChatHistory([...updatedHistory, { role: "model", content: data.response }]);
    } catch (err) {
      console.error("AI Chat communication failure:", err);
      setChatHistory([...updatedHistory, { role: "model", content: "Sorry, I am having trouble reaching the scheduling server right now." }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 w-full max-w-4xl relative max-h-[90vh] overflow-y-auto">
        
        {/* Header Container */}
        <div className="flex items-center justify-between mb-6 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {scheduleMode === "base" ? "Change Lesson Time" : "Reschedule Lesson This Week"}
            </h2>
            <p className="text-slate-100 text-sm mt-1 font-bold">{selectedStudent?.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-100 hover:text-white font-bold text-lg">✕</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* LEFT COLUMN: Manual Form Adjustment */}
          <div className="flex flex-col justify-between gap-5">
            <div className="flex flex-col gap-4">
              <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">Manual Adjustment</span>
              
              <div className="relative">
                <select
                  value={rescheduleWeekday}
                  onChange={(e) => setRescheduleWeekday(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-4 pr-12 py-3 text-white appearance-none select-none font-medium"
                >
                  <option value="Sunday">Sunday</option>
                  <option value="Monday">Monday</option>
                  <option value="Tuesday">Tuesday</option>
                  <option value="Wednesday">Wednesday</option>
                  <option value="Thursday">Thursday</option>
                  <option value="Friday">Friday</option>
                  <option value="Saturday">Saturday</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>

              <input
                type="time"
                value={rescheduleTime}
                onChange={(e) => setRescheduleTime(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-medium"
              />
            </div>

            <button onClick={onSave} className="w-full py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-semibold text-white transition mt-4">
              Save Schedule
            </button>
          </div>

          {/* RIGHT COLUMN: AI Chat Assistant */}
          <div className="flex flex-col gap-4 h-full">
            <span className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              <span className="text-purple-600">✦</span> AI Smart Assistant Chat
            </span>

            {/* Chat Box Log Container with Auto-scroll anchor - Changed bg-slate-950 to bg-transparent */}
            <div className="bg-transparent p-4 rounded-xl border border-slate-800 max-h-[300px] min-h-[260px] overflow-y-auto flex flex-col gap-3">
              {chatHistory.map((turn, index) => (
                <div key={index} className={`flex flex-col max-w-[85%] ${turn.role === 'user' ? 'self-end items-end' : 'self-start items-start'}`}>
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">{turn.role === 'user' ? 'You' : 'Scheduling Agent'}</span>
                  <div className={`p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${turn.role === 'user' ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700'}`}>
                    {turn.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="self-start flex items-center gap-1.5 text-xs text-slate-400 italic">
                  <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" /> Analyzing schedule datasets...
                </div>
              )}
              {/* Auto scroll element anchor */}
              <div ref={chatBottomRef} />
            </div>

            {/* Chat Input area */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ask: 'Find slots for Monday'..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSendChat(); }}
                disabled={chatLoading}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={handleSendChat}
                disabled={!chatMessage.trim() || chatLoading}
                className={`px-5 py-3 font-semibold text-xs rounded-xl transition ${!chatMessage.trim() || chatLoading ? 'bg-slate-800 text-slate-500 cursor-not-allowed border-none' : 'bg-purple-600 hover:bg-purple-500 text-white'}`}
              >
                Send
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

window.ScheduleModal = ScheduleModal;