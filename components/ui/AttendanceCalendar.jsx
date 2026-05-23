"use client";

import { useState } from "react";

/**
 * AttendanceCalendar
 * @param {Array} attendance - List of attendance records for the month
 * @param {Array} holidays - List of company holidays
 * @param {Function} onDayClick - Optional callback when a day is clicked (for HR)
 */
export default function AttendanceCalendar({ 
  attendance = [], 
  holidays = [], 
  onDayClick,
}) {
  const [viewDate, setViewDate] = useState(new Date());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // Calendar logic
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay(); // 0 = Sun
  
  const monthName = viewDate.toLocaleString('default', { month: 'long' });

  function prevMonth() { setViewDate(new Date(year, month - 1, 1)); }
  function nextMonth() { setViewDate(new Date(year, month + 1, 1)); }

  const days = [];
  // Padding for start of month
  for (let i = 0; i < firstDay; i++) days.push(null);
  // Actual days
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  // Status mapping
  const attMap = {};
  attendance.forEach(a => {
    const day = new Date(a.date).getDate() + 1; // fix timezone shift if needed, but normally DB date is YYYY-MM-DD
    // Better: extract day from string
    const dPart = parseInt(a.date.split("-")[2]);
    attMap[dPart] = a;
  });

  const holMap = {};
  holidays.forEach(h => {
    const dPart = parseInt(h.date.split("-")[2]);
    holMap[dPart] = h;
  });

  function getDayStyle(day) {
    if (!day) return {};
    const att = attMap[day];
    const hol = holMap[day];
    const date = new Date(year, month, day);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    if (hol) return { border: "2px solid #3b82f6", background: "#3b82f615", color: "#60a5fa" };
    if (!att) {
        // If date is in future, or today, or weekend...
        if (date > new Date()) return { color: "var(--muted)" };
        if (isWeekend) return { color: "var(--muted)", fontStyle: "italic" };
        return { background: "#ef444415", color: "#f87171" }; // Absent
    }

    if (att.status === "P") return { background: "#10b98115", color: "#34d399", fontWeight: 700 };
    if (att.status === "L") return { background: "#f59e0b15", color: "#fbbf24" };
    if (att.status === "A") return { background: "#ef444415", color: "#f87171" };
    return { background: "var(--hover-bg)" };
  }

  return (
    <div className="calendar-container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h3 className="syne" style={{ fontSize: 18, fontWeight: 700 }}>{monthName} {year}</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-ghost" style={{ padding: "4px 10px" }} onClick={prevMonth}>←</button>
          <button className="btn-ghost" style={{ padding: "4px 10px" }} onClick={nextMonth}>→</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", paddingBottom: 8 }}>
            {d}
          </div>
        ))}

        {days.map((day, i) => (
          <div 
            key={i}
            onClick={() => day && onDayClick && onDayClick(new Date(year, month, day).toISOString().split("T")[0])}
            style={{
              height: 60, borderRadius: 10,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              fontSize: 14, cursor: day && onDayClick ? "pointer" : "default",
              transition: "0.2s",
              background: "var(--surface3)",
              border: "1px solid var(--border)",
              position: "relative",
              ...getDayStyle(day)
            }}
          >
            {day}
            {holMap[day] && <div style={{ fontSize: 8, marginTop: 2, textAlign: "center", width: "100%", overflow: "hidden" }}>{holMap[day].name}</div>}
            {attMap[day] && attMap[day].status === "P" && <div style={{ fontSize: 9, position: "absolute", bottom: 4 }}>{attMap[day].check_in?.substring(0, 5)}</div>}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 16, marginTop: 24, fontSize: 11, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#10b981" }}></div> Present
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444" }}></div> Absent
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b" }}></div> Late
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", border: "1px solid #3b82f6" }}></div> Holiday
        </div>
      </div>
    </div>
  );
}
