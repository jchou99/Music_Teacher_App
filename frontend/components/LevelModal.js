// components/LevelModal.js
const LevelModal = ({
  show,
  onClose,
  selectedStudent,
  onSave
}) => {
  const { useState, useEffect } = React;
  const [level, setLevel] = useState("");

  useEffect(() => {
    if (selectedStudent) {
      setLevel(selectedStudent.level || "Beginner");
    }
  }, [selectedStudent, show]);

  if (!show || !selectedStudent) return null;

  const handleSave = () => {
    onSave(selectedStudent.student_id, level);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 w-full max-w-md relative">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Change Student Level</h2>
            <p className="text-slate-100 text-sm mt-1 font-bold">{selectedStudent.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-100 hover:text-white">✕</button>
        </div>

        <div className="flex flex-col gap-5">
          <label className="text-xs font-bold text-slate-100 uppercase tracking-wider px-1">Select Level</label>
          <div className="relative">
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-4 pr-12 py-3 text-white appearance-none select-none"
            >
              <option value="Beginner">Beginner (30 mins)</option>
              <option value="Intermediate">Intermediate (45 mins)</option>
              <option value="Advanced">Advanced (60 mins)</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </div>
          </div>

          <button
            onClick={handleSave}
            className="bg-purple-600 hover:bg-purple-500 rounded-xl py-3 font-semibold text-white transition-all mt-4"
          >
            Save Level
          </button>
        </div>
      </div>
    </div>
  );
};

window.LevelModal = LevelModal;