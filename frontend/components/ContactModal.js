// components/ContactModal.js
const ContactModal = ({
  show,
  onClose,
  currentStudent,
  editingContact,
  setEditingContact,
  contactInfo,
  setContactInfo,
  onSave
}) => {
  if (!show || !currentStudent) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 w-full max-w-md relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-100 hover:text-white font-bold">✕</button>

        <div className="flex items-center justify-between mb-6 pr-6">
          <h3 className="font-bold text-slate-100 text-base uppercase tracking-wider">Contact Information</h3>
          <button
            onClick={() => editingContact ? onSave() : setEditingContact(true)}
            className="text-xs px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
          >
            {editingContact ? "Save" : "Edit"}
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {/* Student details */}
          <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800 flex flex-col gap-2">
            <span className="text-[10px] uppercase text-slate-100 font-bold">Student Contact</span>
            {editingContact ? (
              <>
                <input
                  className="bg-slate-800 p-2 rounded text-sm text-slate-100"
                  value={contactInfo.studentName}
                  onChange={(e) => setContactInfo({ ...contactInfo, studentName: e.target.value })}
                />
                <input
                  className="bg-slate-800 p-2 rounded text-sm text-slate-100"
                  placeholder="student@email.com"
                  value={contactInfo.studentEmail}
                  onChange={(e) => setContactInfo({ ...contactInfo, studentEmail: e.target.value })}
                />
                <input
                  className="bg-slate-800 p-2 rounded text-sm text-slate-100"
                  placeholder="Phone Number"
                  value={contactInfo.studentPhone}
                  onChange={(e) => setContactInfo({ ...contactInfo, studentPhone: e.target.value })}
                />
              </>
            ) : (
              <>
                <p className="text-white font-semibold">{contactInfo.studentName || "No Student Name"}</p>
                <p className="text-xs text-slate-100 font-semibold">{contactInfo.studentEmail || "No Email Provided"}</p>
                <p className="text-xs text-slate-100 font-semibold">{contactInfo.studentPhone || "No Phone Provided"}</p>
              </>
            )}
          </div>

          {/* Parent details */}
          <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800 flex flex-col gap-2">
            <span className="text-[10px] uppercase text-slate-100 font-bold">Parent Contact</span>
            {editingContact ? (
              <>
                <input
                  className="bg-slate-800 p-2 rounded text-sm text-slate-100"
                  placeholder="Parent Name"
                  value={contactInfo.parentName}
                  onChange={(e) => setContactInfo({ ...contactInfo, parentName: e.target.value })}
                />
                <input
                  className="bg-slate-800 p-2 rounded text-sm text-slate-100"
                  placeholder="parent@email.com"
                  value={contactInfo.parentEmail}
                  onChange={(e) => setContactInfo({ ...contactInfo, parentEmail: e.target.value })}
                />
                <input
                  className="bg-slate-800 p-2 rounded text-sm text-slate-100"
                  placeholder="Parent Phone"
                  value={contactInfo.parentPhone}
                  onChange={(e) => setContactInfo({ ...contactInfo, parentPhone: e.target.value })}
                />
              </>
            ) : (
              <>
                <p className="text-white font-semibold">{contactInfo.parentName || "No Parent Added"}</p>
                <p className="text-xs text-slate-100 font-semibold">{contactInfo.parentEmail || "No Email Provided"}</p>
                <p className="text-xs text-slate-100 font-semibold">{contactInfo.parentPhone || "No Phone Provided"}</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

window.ContactModal = ContactModal;