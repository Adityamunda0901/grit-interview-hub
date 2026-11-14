export const initialState = {
  students: [
    { id: "s1", studentBadgeId: "sb-s1-product-novice", name: "Aarav Sharma", email: "aarav@niat.edu", cohort: "2026", eligible: true, badge: "AI Product Mastery · Novice", skills: "5/5", attendance: "94%" },
    { id: "s2", studentBadgeId: "sb-s2-systems-novice", name: "Diya Patel", email: "diya@niat.edu", cohort: "2026", eligible: true, badge: "AI Systems Mastery · Novice", skills: "6/6", attendance: "91%" },
    { id: "s3", studentBadgeId: "sb-s3-product-novice", name: "Kabir Rao", email: "kabir@niat.edu", cohort: "2027", eligible: true, badge: "AI Product Mastery · Novice", skills: "5/5", attendance: "97%" },
    { id: "s4", studentBadgeId: "sb-s4-models-novice", name: "Meera Nair", email: "meera@niat.edu", cohort: "2026", eligible: false, badge: "AI Models Mastery · Novice", skills: "3/5", attendance: "88%" },
    { id: "s5", studentBadgeId: "sb-s5-models-novice", name: "Ishaan Das", email: "ishaan@niat.edu", cohort: "2027", eligible: true, badge: "AI Models Mastery · Novice", skills: "5/5", attendance: "96%" }
  ],
  interviewers: [
    { id: "u1", name: "Ananya Rao", role: "Senior Interviewer", active: true },
    { id: "u2", name: "Rohan Mehta", role: "Technical Interviewer", active: true },
    { id: "u3", name: "Priya Menon", role: "Technical Interviewer", active: true }
  ],
  slots: [
    { id: "sl1", interviewerId: "u1", date: "2026-11-16", time: "10:00", duration: 30, active: true, bookedBy: null },
    { id: "sl2", interviewerId: "u1", date: "2026-11-16", time: "11:00", duration: 30, active: true, bookedBy: "s1" },
    { id: "sl3", interviewerId: "u2", date: "2026-11-16", time: "12:00", duration: 30, active: true, bookedBy: null },
    { id: "sl4", interviewerId: "u2", date: "2026-11-17", time: "14:00", duration: 30, active: true, bookedBy: "s3" },
    { id: "sl5", interviewerId: "u3", date: "2026-11-17", time: "11:00", duration: 30, active: true, bookedBy: null },
    { id: "sl6", interviewerId: "u1", date: "2026-11-18", time: "15:00", duration: 30, active: true, bookedBy: null },
    { id: "sl7", interviewerId: "u3", date: "2026-11-18", time: "10:00", duration: 30, active: true, bookedBy: null }
  ],
  interviews: [
    { id: "i1", studentId: "s1", studentBadgeId: "sb-s1-product-novice", slotId: "sl2", status: "scheduled", outcome: null, feedback: "", attempt: 1, createdAt: "2026-11-13" },
    { id: "i2", studentId: "s3", studentBadgeId: "sb-s3-product-novice", slotId: "sl4", status: "scheduled", outcome: null, feedback: "", attempt: 1, createdAt: "2026-11-13" }
  ],
  malpractice: []
};

export const navItems = {
  Student: [{ id: "overview", label: "Overview", icon: "LayoutDashboard" }, { id: "book", label: "Book interview", icon: "CalendarPlus" }, { id: "journey", label: "Badge journey", icon: "Award" }],
  Interviewer: [{ id: "schedule", label: "My schedule", icon: "CalendarDays" }, { id: "availability", label: "Availability", icon: "Clock3" }],
  Admin: [{ id: "admin", label: "Operations overview", icon: "ChartNoAxesCombined" }, { id: "students", label: "Eligible students", icon: "Users" }, { id: "interviews", label: "All interviews", icon: "ClipboardList" }]
};
