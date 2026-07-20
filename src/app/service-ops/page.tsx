"use client";

import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { CustomSelect } from "@/components/custom-select";
import { EmptyState } from "@/components/empty-state";
import { useHotel } from "@/components/hotel-provider";
import { StatusBadge } from "@/components/status-badge";
import type { Priority } from "@/lib/hotel-data";

const priorities: Priority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export default function ServiceOpsPage() {
  const { state, createOperationalTask, updateOperationalTask, createIncident, updateIncident, createLostFoundItem, updateLostFoundItem } = useHotel();
  const [message, setMessage] = useState("");
  const [task, setTask] = useState({ department: "HOUSEKEEPING", title: "", description: "", priority: "MEDIUM" as Priority, assignee: "", dueAt: "" });
  const [incident, setIncident] = useState({ roomNumber: "", type: "SAFETY", title: "", description: "", severity: "HIGH" as Priority });
  const [found, setFound] = useState({ roomNumber: "", category: "PERSONAL", description: "", foundLocation: "", storageLocation: "" });
  const openTasks = state.operationalTasks.filter((item) => !["COMPLETED", "CANCELLED"].includes(item.status));
  const overdue = openTasks.filter((item) => item.dueAt && new Date(item.dueAt) < new Date());

  return (
    <AppShell activeHref="/service-ops" eyebrow="Service Ops" title="Cross-department operations control" description="Dispatch accountable work, escalate safety incidents, preserve lost-and-found custody, and monitor every department from one live queue.">
      <section className="grid gap-4 md:grid-cols-4">
        {[
          ["Open work", openTasks.length, `${overdue.length} overdue`],
          ["Incidents", state.incidents.filter((item) => !["RESOLVED", "CLOSED"].includes(item.status)).length, "Safety register"],
          ["Custody", state.lostFound.filter((item) => !["RETURNED", "DISPOSED"].includes(item.status)).length, "Items retained"],
          ["Priority", openTasks.filter((item) => ["HIGH", "URGENT"].includes(item.priority)).length, "Needs attention"],
        ].map(([label, value, helper]) => <div key={label} className="suite-card p-5"><p className="suite-label">{label}</p><p className="mt-3 font-mono text-3xl font-semibold">{value}</p><p className="mt-2 text-xs text-[var(--muted)]">{helper}</p></div>)}
      </section>

      <section className="mt-6 grid gap-6 2xl:grid-cols-3">
        <div className="suite-card p-6">
          <span className="suite-eyebrow">Dispatch</span><h2 className="mt-4 text-2xl font-semibold">Create work order</h2>
          <div className="mt-5 grid gap-3">
            <CustomSelect value={task.department} onChange={(value) => setTask((current) => ({ ...current, department: value }))} options={["FRONT_DESK", "HOUSEKEEPING", "MAINTENANCE", "SECURITY", "FOOD_BEVERAGE", "IT", "MANAGEMENT"].map((value) => ({ value, label: value.replaceAll("_", " ") }))} />
            <input className="suite-input" value={task.title} onChange={(event) => setTask((current) => ({ ...current, title: event.target.value }))} placeholder="Required outcome" />
            <textarea className="suite-input min-h-24" value={task.description} onChange={(event) => setTask((current) => ({ ...current, description: event.target.value }))} placeholder="Instructions and acceptance criteria" />
            <div className="grid grid-cols-2 gap-3"><CustomSelect value={task.priority} onChange={(value) => setTask((current) => ({ ...current, priority: value as Priority }))} options={priorities.map((value) => ({ value, label: value }))} /><input type="datetime-local" className="suite-input" value={task.dueAt} onChange={(event) => setTask((current) => ({ ...current, dueAt: event.target.value }))} /></div>
            <input className="suite-input" value={task.assignee} onChange={(event) => setTask((current) => ({ ...current, assignee: event.target.value }))} placeholder="Assignee or team" />
            <button className="suite-button suite-button-primary" onClick={async () => { const result = await createOperationalTask(task); setMessage(result.message); if (result.ok) setTask((current) => ({ ...current, title: "", description: "" })); }}>Dispatch task</button>
          </div>
        </div>

        <div className="suite-card p-6">
          <span className="suite-eyebrow">Safety</span><h2 className="mt-4 text-2xl font-semibold">Log incident</h2>
          <div className="mt-5 grid gap-3">
            <div className="grid grid-cols-2 gap-3"><input className="suite-input" value={incident.roomNumber} onChange={(event) => setIncident((current) => ({ ...current, roomNumber: event.target.value }))} placeholder="Room, optional" /><input className="suite-input" value={incident.type} onChange={(event) => setIncident((current) => ({ ...current, type: event.target.value }))} placeholder="Incident type" /></div>
            <input className="suite-input" value={incident.title} onChange={(event) => setIncident((current) => ({ ...current, title: event.target.value }))} placeholder="Incident title" />
            <textarea className="suite-input min-h-24" value={incident.description} onChange={(event) => setIncident((current) => ({ ...current, description: event.target.value }))} placeholder="Facts, people, and immediate action" />
            <CustomSelect value={incident.severity} onChange={(value) => setIncident((current) => ({ ...current, severity: value as Priority }))} options={priorities.map((value) => ({ value, label: value }))} />
            <button className="suite-button suite-button-primary" onClick={async () => { const result = await createIncident(incident); setMessage(result.message); if (result.ok) setIncident((current) => ({ ...current, title: "", description: "" })); }}>Secure incident record</button>
          </div>
        </div>

        <div className="suite-card p-6">
          <span className="suite-eyebrow">Custody</span><h2 className="mt-4 text-2xl font-semibold">Register found item</h2>
          <div className="mt-5 grid gap-3">
            <div className="grid grid-cols-2 gap-3"><input className="suite-input" value={found.roomNumber} onChange={(event) => setFound((current) => ({ ...current, roomNumber: event.target.value }))} placeholder="Room, optional" /><input className="suite-input" value={found.category} onChange={(event) => setFound((current) => ({ ...current, category: event.target.value }))} placeholder="Category" /></div>
            <textarea className="suite-input min-h-24" value={found.description} onChange={(event) => setFound((current) => ({ ...current, description: event.target.value }))} placeholder="Identifying description" />
            <input className="suite-input" value={found.foundLocation} onChange={(event) => setFound((current) => ({ ...current, foundLocation: event.target.value }))} placeholder="Found location" />
            <input className="suite-input" value={found.storageLocation} onChange={(event) => setFound((current) => ({ ...current, storageLocation: event.target.value }))} placeholder="Sealed storage location" />
            <button className="suite-button suite-button-primary" onClick={async () => { const result = await createLostFoundItem(found); setMessage(result.message); if (result.ok) setFound((current) => ({ ...current, description: "", foundLocation: "" })); }}>Create custody record</button>
          </div>
        </div>
      </section>

      {message ? <p className="mt-4 text-sm text-[var(--muted)]">{message}</p> : null}

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
        <div className="suite-card p-6"><span className="suite-eyebrow">Live queue</span><h2 className="mt-4 text-2xl font-semibold">Department work</h2>
          {openTasks.length === 0 ? <div className="mt-5"><EmptyState title="No open department work" description="Dispatched tasks will appear here with ownership, urgency, and due-time visibility." /></div> : <div className="mt-5 grid gap-3">{openTasks.map((item) => <article key={item.id} className="suite-subcard grid gap-3 p-4 lg:grid-cols-[1fr_auto] lg:items-center"><div><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{item.title}</p><StatusBadge value={item.priority} /><StatusBadge value={item.status} /></div><p className="mt-2 text-sm text-[var(--muted)]">{item.department.replaceAll("_", " ")} · {item.assignee}{item.dueAt ? ` · Due ${item.dueAt}` : ""}</p><p className="mt-2 text-sm text-[var(--ink-soft)]">{item.description}</p></div><div className="flex gap-2"><button className="suite-button suite-button-secondary" onClick={() => updateOperationalTask(item.id, "IN_PROGRESS")}>Start</button><button className="suite-button suite-button-primary" onClick={() => updateOperationalTask(item.id, "COMPLETED")}>Complete</button></div></article>)}</div>}
        </div>
        <div className="grid gap-6">
          <div className="suite-card p-6"><h2 className="text-xl font-semibold">Active incidents</h2><div className="mt-4 grid gap-3">{state.incidents.filter((item) => !["RESOLVED", "CLOSED"].includes(item.status)).map((item) => <article key={item.id} className="suite-subcard p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{item.title}</p><p className="mt-2 text-xs text-[var(--muted)]">{item.type}{item.roomNumber ? ` · Room ${item.roomNumber}` : ""}</p></div><StatusBadge value={item.severity} /></div><button className="suite-button suite-button-secondary mt-3" onClick={() => updateIncident(item.id, "INVESTIGATING")}>Mark investigating</button></article>)}</div></div>
          <div className="suite-card p-6"><h2 className="text-xl font-semibold">Found-item custody</h2><div className="mt-4 grid gap-3">{state.lostFound.filter((item) => !["RETURNED", "DISPOSED"].includes(item.status)).slice(0, 8).map((item) => <article key={item.id} className="suite-subcard p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-xs text-[var(--accent)]">{item.itemCode}</p><p className="mt-2 font-medium">{item.description}</p><p className="mt-1 text-xs text-[var(--muted)]">{item.storageLocation ?? item.foundLocation}</p></div><StatusBadge value={item.status} /></div><button className="suite-button suite-button-secondary mt-3" onClick={() => updateLostFoundItem(item.id, "RETURNED", item.storageLocation)}>Mark returned</button></article>)}</div></div>
        </div>
      </section>
    </AppShell>
  );
}
