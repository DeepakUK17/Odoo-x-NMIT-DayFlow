import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '../db/index.js';
import { attendance, employees, leaveRequests, leaveTypes, departments, payroll, leaveBalances } from '../db/schema.js';
import { eq, and, lt, lte, gte, desc } from 'drizzle-orm';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ─── Controlled Tool Functions ─────────────────────────────────────────────────
async function getAttendanceSummary() {
  const today = new Date().toISOString().split('T')[0];
  const allEmps = await db.select().from(employees).where(eq(employees.status, 'active'));
  const todayAtt = await db.select().from(attendance).where(eq(attendance.date, today));

  const present = todayAtt.filter(a => a.status === 'present').length;
  const absent = todayAtt.filter(a => a.status === 'absent').length;
  const onLeave = todayAtt.filter(a => a.status === 'on_leave').length;
  const pct = allEmps.length > 0 ? Math.round((present / allEmps.length) * 100) : 0;

  return { date: today, totalEmployees: allEmps.length, present, absent, onLeave, attendancePercentage: pct };
}

async function getEmployeesBelowAttendanceThreshold({ threshold = 80 }) {
  const allEmps = await db.select().from(employees).where(eq(employees.status, 'active'));
  const allAtt = await db.select().from(attendance);
  const result = [];

  for (const emp of allEmps) {
    const empAtt = allAtt.filter(a => a.employeeId === emp.id);
    const workdays = empAtt.filter(a => a.status !== 'weekend' && a.status !== 'holiday');
    if (workdays.length === 0) continue;
    const present = workdays.filter(a => a.status === 'present').length;
    const halfDay = workdays.filter(a => a.status === 'half_day').length;
    const pct = Math.round(((present + halfDay * 0.5) / workdays.length) * 100);
    if (pct < threshold) {
      result.push({ employeeId: emp.id, name: `${emp.firstName} ${emp.lastName}`, attendancePercentage: pct, totalWorkdays: workdays.length, presentDays: present });
    }
  }

  return result.sort((a, b) => a.attendancePercentage - b.attendancePercentage);
}

async function getPendingLeaveRequests() {
  const pending = await db
    .select({
      id: leaveRequests.id,
      startDate: leaveRequests.startDate,
      endDate: leaveRequests.endDate,
      daysCount: leaveRequests.daysCount,
      reason: leaveRequests.reason,
      createdAt: leaveRequests.createdAt,
      employeeName: employees.firstName,
      employeeLastName: employees.lastName,
      leaveTypeName: leaveTypes.name,
    })
    .from(leaveRequests)
    .leftJoin(employees, eq(leaveRequests.employeeId, employees.id))
    .leftJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
    .where(eq(leaveRequests.status, 'pending'))
    .orderBy(desc(leaveRequests.createdAt));

  return pending.map(p => ({ ...p, employeeName: `${p.employeeName} ${p.employeeLastName}` }));
}

async function getEmployeesOnLeaveToday() {
  const today = new Date().toISOString().split('T')[0];
  const onLeave = await db
    .select({
      date: attendance.date,
      firstName: employees.firstName,
      lastName: employees.lastName,
      designation: employees.designation,
    })
    .from(attendance)
    .leftJoin(employees, eq(attendance.employeeId, employees.id))
    .where(and(eq(attendance.date, today), eq(attendance.status, 'on_leave')));

  return onLeave.map(r => ({ name: `${r.firstName} ${r.lastName}`, designation: r.designation }));
}

async function getAbsenceCount({ employeeName, month, year }) {
  const allEmps = await db.select().from(employees);
  const emp = allEmps.find(e =>
    `${e.firstName} ${e.lastName}`.toLowerCase().includes(employeeName?.toLowerCase() || '')
  );
  if (!emp) return { error: 'Employee not found' };

  const m = month || new Date().getMonth() + 1;
  const y = year || new Date().getFullYear();
  const allAtt = await db.select().from(attendance).where(eq(attendance.employeeId, emp.id));

  const monthAtt = allAtt.filter(a => {
    const d = new Date(a.date);
    return d.getMonth() + 1 === m && d.getFullYear() === y;
  });

  const absences = monthAtt.filter(a => a.status === 'absent').length;
  const workdays = monthAtt.filter(a => a.status !== 'weekend' && a.status !== 'holiday').length;

  return { employee: `${emp.firstName} ${emp.lastName}`, month: m, year: y, absences, workdays };
}

async function getDepartmentAbsenteeism() {
  const allDepts = await db.select().from(departments);
  const allEmps = await db.select().from(employees);
  const allAtt = await db.select().from(attendance);
  const result = [];

  for (const dept of allDepts) {
    const deptEmps = allEmps.filter(e => e.departmentId === dept.id);
    if (deptEmps.length === 0) continue;

    const deptAtt = allAtt.filter(a => deptEmps.some(e => e.id === a.employeeId));
    const workdays = deptAtt.filter(a => a.status !== 'weekend' && a.status !== 'holiday');
    const absent = workdays.filter(a => a.status === 'absent').length;
    const pct = workdays.length > 0 ? Math.round((absent / workdays.length) * 100) : 0;

    result.push({ department: dept.name, absenteeismRate: pct, absentDays: absent, employeeCount: deptEmps.length });
  }

  return result.sort((a, b) => b.absenteeismRate - a.absenteeismRate);
}

async function getAttendanceAnomalies() {
  const allEmps = await db.select().from(employees).where(eq(employees.status, 'active'));
  const allAtt = await db.select().from(attendance);
  const anomalies = [];

  for (const emp of allEmps) {
    const empAtt = allAtt.filter(a => a.employeeId === emp.id);
    const workdays = empAtt.filter(a => a.status !== 'weekend' && a.status !== 'holiday');
    const present = workdays.filter(a => a.status === 'present').length;
    const halfDays = workdays.filter(a => a.status === 'half_day').length;
    const absences = workdays.filter(a => a.status === 'absent').length;
    const lateCount = workdays.filter(a => a.isLate).length;
    const missingCheckouts = workdays.filter(a => a.missingCheckout).length;
    const pct = workdays.length > 0 ? Math.round(((present + halfDays * 0.5) / workdays.length) * 100) : 0;

    if (pct < 80 || absences >= 4 || lateCount >= 3 || missingCheckouts >= 2) {
      anomalies.push({
        name: `${emp.firstName} ${emp.lastName}`,
        attendancePct: pct,
        absences,
        lateCheckIns: lateCount,
        missingCheckouts,
      });
    }
  }

  return anomalies;
}

async function getLateCheckInsCount({ threshold = 3 }) {
  const allEmps = await db.select().from(employees).where(eq(employees.status, 'active'));
  const allAtt = await db.select().from(attendance);
  const result = [];

  for (const emp of allEmps) {
    const late = allAtt.filter(a => a.employeeId === emp.id && a.isLate).length;
    if (late >= threshold) {
      result.push({ name: `${emp.firstName} ${emp.lastName}`, lateCount: late });
    }
  }

  return result.sort((a, b) => b.lateCount - a.lateCount);
}

async function getMissingCheckouts() {
  const allEmps = await db.select().from(employees).where(eq(employees.status, 'active'));
  const allAtt = await db.select().from(attendance);
  const result = [];

  for (const emp of allEmps) {
    const missing = allAtt.filter(a => a.employeeId === emp.id && a.missingCheckout).length;
    if (missing > 0) {
      result.push({ name: `${emp.firstName} ${emp.lastName}`, missingCheckouts: missing });
    }
  }

  return result.sort((a, b) => b.missingCheckouts - a.missingCheckouts);
}

async function getPayrollSummary() {
  const month = new Date().getMonth() + 1;
  const year = new Date().getFullYear();
  const records = await db.select().from(payroll).where(and(eq(payroll.month, month), eq(payroll.year, year)));
  const total = records.reduce((s, r) => s + parseFloat(r.netSalary || 0), 0);
  const avg = records.length > 0 ? Math.round(total / records.length) : 0;
  return { month, year, totalNetSalary: total, averageSalary: avg, employeeCount: records.length };
}

// ─── Tool Definitions for Gemini ──────────────────────────────────────────────
const tools = [
  { name: 'getAttendanceSummary', description: 'Get today\'s attendance summary: total, present, absent, on leave, percentage', parameters: { type: 'OBJECT', properties: {}, required: [] } },
  { name: 'getEmployeesBelowAttendanceThreshold', description: 'Find employees with attendance percentage below a threshold (default 80%)', parameters: { type: 'OBJECT', properties: { threshold: { type: 'NUMBER', description: 'Attendance percentage threshold (default 80)' } }, required: [] } },
  { name: 'getPendingLeaveRequests', description: 'Get all pending leave requests with employee names and dates', parameters: { type: 'OBJECT', properties: {}, required: [] } },
  { name: 'getEmployeesOnLeaveToday', description: 'Get list of employees on leave today', parameters: { type: 'OBJECT', properties: {}, required: [] } },
  { name: 'getAbsenceCount', description: 'Get absence count for a specific employee in a given month', parameters: { type: 'OBJECT', properties: { employeeName: { type: 'STRING' }, month: { type: 'NUMBER' }, year: { type: 'NUMBER' } }, required: [] } },
  { name: 'getDepartmentAbsenteeism', description: 'Get absenteeism rate by department, sorted by highest rate', parameters: { type: 'OBJECT', properties: {}, required: [] } },
  { name: 'getAttendanceAnomalies', description: 'Get all employees with attendance anomalies (low attendance, frequent absences, late check-ins, missing checkouts)', parameters: { type: 'OBJECT', properties: {}, required: [] } },
  { name: 'getLateCheckInsCount', description: 'Get employees with frequent late check-ins above a threshold', parameters: { type: 'OBJECT', properties: { threshold: { type: 'NUMBER' } }, required: [] } },
  { name: 'getMissingCheckouts', description: 'Get employees with missing checkout instances', parameters: { type: 'OBJECT', properties: {}, required: [] } },
  { name: 'getPayrollSummary', description: 'Get payroll summary for the current month: total, average, count', parameters: { type: 'OBJECT', properties: {}, required: [] } },
];

const toolFunctions = {
  getAttendanceSummary,
  getEmployeesBelowAttendanceThreshold,
  getPendingLeaveRequests,
  getEmployeesOnLeaveToday,
  getAbsenceCount,
  getDepartmentAbsenteeism,
  getAttendanceAnomalies,
  getLateCheckInsCount,
  getMissingCheckouts,
  getPayrollSummary,
};

// ─── Main AI Query Function ───────────────────────────────────────────────────
export async function processHRQuery(query, userRole) {
  if (userRole !== 'hr_admin') {
    throw new Error('HR Admin access required for AI queries');
  }

  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    tools: [{ functionDeclarations: tools }],
    systemInstruction: `You are DAYFLOW Intelligence, an AI HR assistant. You have access to tools that query real HR data.
    Always use the appropriate tool to answer questions. Never make up data.
    Respond concisely and professionally. Use bullet points for lists.
    Format salary amounts in Indian Rupee (₹) format. 
    If no matching data exists, clearly state that.`,
  });

  const chat = model.startChat();
  let response = await chat.sendMessage(query);
  const toolsUsed = [];

  // Handle tool calls
  while (response.response.candidates?.[0]?.content?.parts?.some(p => p.functionCall)) {
    const functionCalls = response.response.candidates[0].content.parts
      .filter(p => p.functionCall)
      .map(p => p.functionCall);

    const toolResults = [];
    for (const fc of functionCalls) {
      toolsUsed.push(fc.name);
      try {
        const fn = toolFunctions[fc.name];
        if (!fn) { toolResults.push({ functionResponse: { name: fc.name, response: { error: 'Unknown tool' } } }); continue; }
        const result = await fn(fc.args || {});
        toolResults.push({ functionResponse: { name: fc.name, response: { result } } });
      } catch (e) {
        toolResults.push({ functionResponse: { name: fc.name, response: { error: e.message } } });
      }
    }

    response = await chat.sendMessage(toolResults);
  }

  const text = response.response.text();
  return { response: text, toolsUsed };
}

// ─── Leave Assistant ──────────────────────────────────────────────────────────
export async function processLeaveAssist(naturalLanguageInput, employeeId) {
  const today = new Date();
  const balances = await db
    .select({ typeName: leaveTypes.name, remaining: leaveBalances.remaining, icon: leaveTypes.icon })
    .from(leaveBalances)
    .leftJoin(leaveTypes, eq(leaveBalances.leaveTypeId, leaveTypes.id))
    .where(and(eq(leaveBalances.employeeId, employeeId), eq(leaveBalances.year, today.getFullYear())));

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const prompt = `You are a leave assistant. Today is ${today.toDateString()}.
Employee's leave balances: ${JSON.stringify(balances)}.
Employee says: "${naturalLanguageInput}"

Extract and return a JSON object with these fields:
{
  "leaveType": "Casual Leave" | "Sick Leave" | "Personal Leave" | "Unpaid Leave",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "daysCount": number,
  "reason": "extracted reason",
  "suggestion": "friendly suggestion message"
}

Only return valid JSON, no other text.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().replace(/```json\n?|\n?```/g, '').trim();
  return JSON.parse(text);
}

// ─── Proactive Insights ───────────────────────────────────────────────────────
export async function generateProactiveInsights() {
  const today = new Date().toISOString().split('T')[0];
  const allEmps = await db.select().from(employees).where(eq(employees.status, 'active'));
  const todayAtt = await db.select().from(attendance).where(eq(attendance.date, today));
  const pendingLeaves = await db.select().from(leaveRequests).where(eq(leaveRequests.status, 'pending'));
  const anomalies = await getAttendanceAnomalies();

  const present = todayAtt.filter(a => a.status === 'present').length;
  const onLeave = todayAtt.filter(a => a.status === 'on_leave').length;
  const missingCheckout = todayAtt.filter(a => a.missingCheckout).length;

  return {
    present,
    total: allEmps.length,
    onLeave,
    pendingLeaves: pendingLeaves.length,
    anomalies: anomalies.length,
    missingCheckout,
    attendancePct: allEmps.length > 0 ? Math.round((present / allEmps.length) * 100) : 0,
  };
}
