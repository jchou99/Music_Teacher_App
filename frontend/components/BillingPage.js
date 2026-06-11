// components/BillingPage.js
const BillingPage = ({
  students,
  studentRates,
  saveStudentRate,
  studentUnpaid,
  saveStudentUnpaid,
  studentPaymentPeriods,
  saveStudentPaymentPeriod,
  recordDirectPayment,
  customPaymentPeriodsConfig,
  resetFinances,
  deletePaymentLogEntry,
  customLevels,
  totalEarnings,
  setTotalEarnings,
  paymentLog,
  setPaymentLog
}) => {
  const { useState } = React;
  const Icon = window.Icon;

  // Safe body-level defaults to bypass Babel Standalone compilation crashes
  const activeStudentsList = students || [];
  const activeRates = studentRates || {};
  const activeUnpaid = studentUnpaid || {};
  const activePeriods = studentPaymentPeriods || {};
  const activePeriodsConfig = customPaymentPeriodsConfig || [];
  const activeLevels = customLevels || [];
  const activePaymentLog = paymentLog || [];
  const activeEarnings = Number(totalEarnings) || 0;

  // Local state for recording custom student payments
  const [payingStudentId, setPayingStudentId] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentLessonsCount, setPaymentLessonsCount] = useState(1);

  // Filter out inactive students
  const activeStudents = activeStudentsList.filter(student => student.isActive !== false);

  // Helper: Retrieve student's base lesson duration in minutes
  const getDurationByLevel = (level) => {
    const found = activeLevels.find(l => l && l.name === level);
    return found ? found.duration : 30;
  };

  // Helper: Calculate amount owed by a single student
  const calculateOwed = (student) => {
    const rate = activeRates[student.student_id] || 0;
    const unpaidCount = activeUnpaid[student.student_id] || 0;
    const duration = getDurationByLevel(student.level);
    return unpaidCount * (rate * (duration / 60));
  };

  // Compile billing details for all active students
  const billingDirectory = activeStudents.map(student => {
    const rate = activeRates[student.student_id] || 0;
    const unpaidCount = activeUnpaid[student.student_id] || 0;
    const period = activePeriods[student.student_id] || "Weekly";
    const owed = calculateOwed(student);
    return {
      student,
      rate,
      unpaidCount,
      period,
      owed
    };
  });

  // Calculate high-level financial statistics (only summing positive debts so credits don't skew A/R)
  const totalOutstanding = billingDirectory
    .filter(item => item.owed > 0)
    .reduce((sum, item) => sum + item.owed, 0);

  const billedStudentsCount = billingDirectory.filter(item => item.rate > 0).length;

  // Identify active students who still need a payment plan
  const unbilledStudents = activeStudents.filter(student => !activeRates[student.student_id] || activeRates[student.student_id] <= 0);

  // Sort: prioritize students who owe the most
  const sortedDebtors = billingDirectory
    .filter(item => item.owed > 0)
    .sort((a, b) => b.owed - a.owed);

  // Handle Recording a Payment
  const handleRecordPayment = (item) => {
    const amount = parseFloat(paymentAmount) || 0;
    if (amount <= 0) {
      alert("Please enter a valid payment amount.");
      return;
    }

    const lessonsToDeduct = parseInt(paymentLessonsCount, 10) || 1;
    recordDirectPayment(item.student, amount, lessonsToDeduct);

    // Reset local form states
    setPayingStudentId(null);
    setPaymentAmount("");
    setPaymentLessonsCount(1);
    alert(`Successfully recorded payment of $${amount.toFixed(2)} from ${item.student.name}!`);
  };

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto animate-fade-in">
      
      {/* Page Header with Reset Season trigger */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
        <div>
          <h2 className="text-3xl font-bold text-white font-serif">Studio Billing & Finance</h2>
          <p className="text-sm text-slate-100 mt-1">Track custom hourly rates, manage outstanding balances, and record payment histories.</p>
        </div>
        
        <button
          onClick={() => {
            if (confirm("Are you absolutely sure you want to reset all finances? This will clear logs, reset earnings to $0.00, and clear outstanding unpaid balances to 0 for a new season/year.")) {
              resetFinances();
            }
          }}
          className="px-4 py-2.5 bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-500/30 font-bold text-xs uppercase rounded-xl transition shadow-sm shrink-0"
        >
          Reset Season
        </button>
      </div>

      {/* Financial Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-6 flex flex-col gap-1.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Outstanding Balance Owed</span>
          <span className="text-3xl font-extrabold text-red-500">${totalOutstanding.toFixed(2)}</span>
          <span className="text-[10px] text-slate-100 font-bold">Uncollected studio lesson fees</span>
        </div>
        
        <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-6 flex flex-col gap-1.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Recorded Earnings</span>
          <span className="text-3xl font-extrabold text-emerald-500">${activeEarnings.toFixed(2)}</span>
          <span className="text-[10px] text-slate-100 font-bold">Total collected payments logged</span>
        </div>

        {/* Billed Students KPI with lists of unbilled student names */}
        <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-6 flex flex-col gap-1.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Billed Students</span>
          <span className="text-3xl font-extrabold text-indigo-400">{billedStudentsCount} / {activeStudentsList.length}</span>
          <div className="text-[10px] text-slate-300 mt-1 truncate">
            {unbilledStudents.length > 0 ? (
              <span className="font-semibold text-red-400">Needs Plan: {unbilledStudents.map(s => s.name).join(", ")}</span>
            ) : (
              <span className="font-semibold text-emerald-400">All students configured!</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Directory list of people who still owe money (Left Column) */}
        <div className="lg:col-span-2 bg-slate-800/40 border border-slate-800 rounded-2xl p-6 flex flex-col gap-5">
          <div>
            <h3 className="text-lg font-bold text-white">Outstanding Balances</h3>
            <p className="text-xs text-slate-100">Chronological debtor tracking queue.</p>
          </div>

          <div className="flex flex-col gap-3 max-h-[465px] overflow-y-auto pr-1">
            {sortedDebtors.length === 0 ? (
              <div className="text-center text-slate-100 py-12 bg-slate-900/40 border border-dashed border-slate-700 rounded-2xl">
                <Icon name="check" className="w-8 h-8 mx-auto mb-3 text-emerald-500" />
                <p className="font-semibold text-sm">Perfect Balance Sheet!</p>
                <p className="text-xs text-slate-300 mt-1">All active lesson balances are paid up.</p>
              </div>
            ) : (
              sortedDebtors.map(item => (
                <div key={item.student.student_id} className="bg-slate-900/60 border border-slate-700 rounded-2xl p-4 flex flex-col gap-3 relative animate-fade-in">
                  
                  {/* Basic Info Row with dropdown selector */}
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0 pr-4">
                      <h4 className="font-bold text-white text-sm">{item.student.name}</h4>
                      <p className="text-[10px] text-slate-100 font-medium">
                        Rate: ${item.rate}/hr • Level: {item.student.level} • {item.unpaidCount} unpaid periods
                      </p>

                      {/* Dropdown to dynamically adjust student payment period [3] */}
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Plan:</span>
                        <select
                          value={activePeriods[item.student.student_id] || "Weekly"}
                          onChange={(e) => saveStudentPaymentPeriod(item.student.student_id, e.target.value)}
                          className="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-[10px] text-slate-100 font-semibold cursor-pointer select-none focus:outline-none"
                        >
                          {activePeriodsConfig.map(p => (
                            <option key={p.name} value={p.name} className="bg-slate-900">{p.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    <div className="text-right shrink-0">
                      <span className="text-sm font-extrabold text-red-500">${item.owed.toFixed(2)}</span>
                      <p className="text-[9px] uppercase font-bold text-slate-400">Balance Owed</p>
                    </div>
                  </div>

                  {/* Payment Processing Form (Conditionally rendered) */}
                  {payingStudentId === item.student.student_id ? (
                    <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-700 flex flex-col gap-3">
                      <span className="text-[9.5px] uppercase font-bold text-slate-300">Log Received Payment</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-1">
                          <span className="text-[8.5px] uppercase font-bold text-slate-100">Amount Paid ($)</span>
                          <input
                            type="number"
                            placeholder="e.g. 50.00"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            className="bg-slate-800 p-2 rounded text-xs text-slate-950 border border-slate-700 w-full font-semibold"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[8.5px] uppercase font-bold text-slate-100">Lessons to Deduct</span>
                          <input
                            type="number"
                            min={1}
                            max={item.unpaidCount}
                            value={paymentLessonsCount}
                            onChange={(e) => setPaymentLessonsCount(e.target.value)}
                            className="bg-slate-800 p-2 rounded text-xs text-slate-950 border border-slate-700 w-full text-center"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRecordPayment(item)}
                          className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 border border-emerald-500/30 font-bold text-[10px] px-3 py-1.5 rounded-xl transition-all"
                        >
                          Confirm Payment
                        </button>
                        <button
                          onClick={() => setPayingStudentId(null)}
                          className="bg-slate-500/10 hover:bg-slate-500/20 text-slate-700 border border-slate-500/30 font-bold text-[10px] px-3 py-1.5 rounded-xl transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setPayingStudentId(item.student.student_id);
                        setPaymentAmount(item.owed.toFixed(2));
                        setPaymentLessonsCount(item.unpaidCount);
                      }}
                      className="w-full sm:w-max px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 border border-emerald-500/30 text-[10px] font-bold rounded-xl transition-all"
                    >
                      ✓ Record Payment
                    </button>
                  )}

                </div>
              ))
            )}
          </div>
        </div>

        {/* Payment History Audit Log (Right Column) with Delete Log triggers */}
        <div className="lg:col-span-1 bg-slate-800/40 border border-slate-800 rounded-2xl p-6 flex flex-col gap-5">
          <div>
            <h3 className="text-lg font-bold text-white">Payment Log</h3>
            <p className="text-xs text-slate-100">Audit tracking of recorded transactions.</p>
          </div>

          <div className="flex flex-col gap-3 max-h-[465px] overflow-y-auto pr-1">
            {activePaymentLog.length === 0 ? (
              <p className="text-center text-xs text-slate-300 italic py-12 my-auto">No transaction records logged.</p>
            ) : (
              activePaymentLog.map(log => (
                <div key={log.id} className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-700 text-xs flex flex-col gap-1 relative shrink-0 animate-fade-in">
                  
                  {/* Delete individual payment log button */}
                  <button
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this payment log entry?")) {
                        deletePaymentLogEntry(log.id);
                      }
                    }}
                    className="absolute top-3 right-3 text-slate-300 hover:text-red-500 font-bold text-xs cursor-pointer select-none"
                    title="Delete log entry"
                  >
                    ✕
                  </button>

                  <div className="flex justify-between items-center pr-4">
                    <span className="font-bold text-slate-100">{log.studentName}</span>
                    <span className="font-extrabold text-emerald-500">+${(Number(log.amount) || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1 pr-4">
                    <span>{log.date}</span>
                    <span>Deducted {log.lessonsDeducted} periods</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

window.BillingPage = BillingPage;