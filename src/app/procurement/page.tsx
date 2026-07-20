"use client";

import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { CustomSelect } from "@/components/custom-select";
import { EmptyState } from "@/components/empty-state";
import { useHotel } from "@/components/hotel-provider";
import { StatusBadge } from "@/components/status-badge";

export default function ProcurementPage() {
  const { state, currentUser, createPurchaseOrder, updatePurchaseOrderStatus, receivePurchaseOrder } = useHotel();
  const [vendorId, setVendorId] = useState(state.vendors[0]?.id ?? "");
  const [inventoryItemId, setInventoryItemId] = useState(state.inventory[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState(0);
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const canApprove = currentUser?.role === "HOTEL_ADMIN" || currentUser?.role === "MANAGER";

  return (
    <AppShell activeHref="/procurement" eyebrow="Procurement" title="Purchase orders and stock receiving" description="Request, approve, order, and receive hotel supplies with a complete custody trail from vendor commitment to on-hand inventory.">
      <section className="grid gap-6 2xl:grid-cols-[.72fr_1.28fr]">
        <div className="suite-card p-6">
          <span className="suite-eyebrow">New request</span><h2 className="mt-4 text-2xl font-semibold">Build purchase order</h2>
          <div className="mt-5 grid gap-3">
            <label><span className="suite-label">Approved vendor</span><CustomSelect value={vendorId || state.vendors[0]?.id || ""} onChange={setVendorId} options={state.vendors.map((vendor) => ({ value: vendor.id, label: `${vendor.name} · ${vendor.category}` }))} /></label>
            <label><span className="suite-label">Stock item</span><CustomSelect value={inventoryItemId || state.inventory[0]?.id || ""} onChange={setInventoryItemId} options={state.inventory.map((item) => ({ value: item.id, label: `${item.name} · ${item.stockOnHand} on hand` }))} /></label>
            <div className="grid grid-cols-2 gap-3"><label><span className="suite-label">Quantity</span><input type="number" min="1" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} className="suite-input font-mono" /></label><label><span className="suite-label">Unit cost</span><input type="number" min="0" step="0.01" value={unitCost} onChange={(event) => setUnitCost(Number(event.target.value))} className="suite-input font-mono" /></label></div>
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="suite-input min-h-24" placeholder="Commercial terms or request reason" />
            <div className="suite-subcard flex items-center justify-between p-4"><span className="text-sm text-[var(--muted)]">Order value</span><strong className="font-mono">AED {(quantity * unitCost).toFixed(2)}</strong></div>
            <button className="suite-button suite-button-primary" onClick={async () => { const result = await createPurchaseOrder(vendorId || state.vendors[0]?.id || "", [{ inventoryItemId: inventoryItemId || state.inventory[0]?.id || "", quantity, unitCost }], notes); setMessage(result.message); if (result.ok) setNotes(""); }}>Submit purchase request</button>
            {message ? <p className="text-sm text-[var(--muted)]">{message}</p> : null}
          </div>
        </div>

        <div className="suite-card p-6">
          <div className="flex items-end justify-between gap-4"><div><span className="suite-eyebrow">Control queue</span><h2 className="mt-4 text-2xl font-semibold">Purchase orders</h2></div><p className="text-xs text-[var(--muted)]">{state.purchaseOrders.length} total</p></div>
          {state.purchaseOrders.length === 0 ? <div className="mt-6"><EmptyState title="No purchase orders" description="Submitted supply requests will enter the approval and receiving workflow here." /></div> : <div className="mt-6 grid gap-4">{state.purchaseOrders.map((order) => {
            const outstanding = order.lines.map((line) => ({ lineId: line.id, quantity: line.quantityOrdered - line.quantityReceived })).filter((line) => line.quantity > 0);
            return <article key={order.id} className="suite-subcard p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-mono text-xs text-[var(--accent)]">{order.poNumber}</p><h3 className="mt-2 text-lg font-semibold">{order.vendorName}</h3><p className="mt-2 text-sm text-[var(--muted)]">Requested by {order.requestedBy} · AED {order.totalAmount.toFixed(2)}</p></div><StatusBadge value={order.status} /></div><div className="mt-4 grid gap-2">{order.lines.map((line) => <div key={line.id} className="flex items-center justify-between border-t border-[var(--line)] pt-3 text-sm"><span>{line.itemName}</span><span className="font-mono">{line.quantityReceived}/{line.quantityOrdered} · AED {line.unitCost.toFixed(2)}</span></div>)}</div><div className="mt-4 flex flex-wrap gap-2">{order.status === "SUBMITTED" && canApprove ? <button className="suite-button suite-button-primary" onClick={() => updatePurchaseOrderStatus(order.id, "APPROVED")}>Approve</button> : null}{order.status === "APPROVED" ? <button className="suite-button suite-button-primary" onClick={() => updatePurchaseOrderStatus(order.id, "ORDERED")}>Mark ordered</button> : null}{["ORDERED", "PARTIALLY_RECEIVED"].includes(order.status) && outstanding.length ? <button className="suite-button suite-button-primary" onClick={() => receivePurchaseOrder(order.id, outstanding)}>Receive outstanding</button> : null}{!["RECEIVED", "CANCELLED"].includes(order.status) ? <button className="suite-button suite-button-secondary" onClick={() => updatePurchaseOrderStatus(order.id, "CANCELLED")}>Cancel</button> : null}</div></article>;
          })}</div>}
        </div>
      </section>
    </AppShell>
  );
}
