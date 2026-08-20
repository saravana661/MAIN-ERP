import { useMemo, useState } from "react";
import { api, downloadInvoice } from "../api.js";
import { Button, Card, DataTable, ErrorMessage, Field, Loading, Notice, PageHeader, useAsync } from "../components.jsx";

const currency = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value || 0);
const dateValue = () => new Date().toISOString().slice(0, 10);
const unitOptions = ["GRAM", "KG", "ML", "LITER", "PIECE", "PACKET", "BOX", "BOTTLE"];

function LineEditor({ items, lines, setLines, sale = false }) {
  const [line, setLine] = useState({ item: "", packaging: "", quantity: 1, unit: "KG", rate: 0, discount: 0, tax: 0 });
  const packages = useAsync(() => api("/masters/packaging?limit=500").then((response) => response.data), []);
  const selectedItem = items.find((item) => item._id === line.item);
  const availablePackages = (packages.data || []).filter((packaging) => packaging.item?._id === line.item || packaging.item === line.item);
  function update(event) {
    const next = { ...line, [event.target.name]: event.target.value };
    if (event.target.name === "packaging") {
      const packaging = availablePackages.find((value) => value._id === event.target.value);
      if (packaging) { next.rate = packaging.sellingRate; next.unit = packaging.packageUnit; }
    }
    if (event.target.name === "item" && !sale) next.unit = items.find((item) => item._id === event.target.value)?.purchaseUnit || "KG";
    setLine(next);
  }
  function add() {
    if (!line.item || (sale && !line.packaging)) return;
    const item = items.find((value) => value._id === line.item);
    const packaging = availablePackages.find((value) => value._id === line.packaging);
    setLines([...lines, { ...line, quantity: Number(line.quantity), rate: Number(line.rate), discount: Number(line.discount || 0), tax: Number(line.tax || 0), label: sale ? `${item?.name} — ${packaging?.packageName}` : `${item?.name} (${line.unit})` }]);
    setLine({ item: "", packaging: "", quantity: 1, unit: "KG", rate: 0, discount: 0, tax: 0 });
  }
  return <><div className="line-editor"><Field label="Item" name="item" value={line.item} onChange={update} options={items.map((item) => ({ value: item._id, label: `${item.itemCode} — ${item.name}` }))} />{sale ? <Field label="Package" name="packaging" value={line.packaging} onChange={update} options={availablePackages.map((packaging) => ({ value: packaging._id, label: `${packaging.packageName} (${currency(packaging.sellingRate)})` }))} /> : <Field label="Unit" name="unit" value={line.unit} onChange={update} options={unitOptions} />}<Field label="Quantity" name="quantity" type="number" value={line.quantity} onChange={update} /><Field label="Rate" name="rate" type="number" value={line.rate} onChange={update} />{sale && <><Field label="Discount" name="discount" type="number" value={line.discount} onChange={update} /><Field label="Tax" name="tax" type="number" value={line.tax} onChange={update} /></>}<Button type="button" onClick={add}>Add line</Button></div><DataTable rows={lines} columns={[{ key: "label", label: "Item" }, { key: "quantity", label: "Qty" }, { key: "unit", label: "Unit" }, { key: "rate", label: "Rate", render: (row) => currency(row.rate) }, { key: "amount", label: "Amount", render: (row) => currency(row.quantity * row.rate - row.discount + row.tax) }, { key: "remove", label: "", render: (row) => <button className="danger-link" onClick={() => setLines(lines.filter((line) => line !== row))}>Remove</button> }]} empty="Add at least one item line." /></>;
}

function PurchaseForm({ receipt, onSaved }) {
  const masterData = useAsync(() => Promise.all([api("/masters/items?limit=500"), api("/masters/vendors?limit=500")]).then(([items, vendors]) => ({ items: items.data, vendors: vendors.data })), []);
  const [vendor, setVendor] = useState(""); const [date, setDate] = useState(dateValue()); const [notes, setNotes] = useState(""); const [lines, setLines] = useState([]); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  if (masterData.loading) return <Loading />; if (masterData.error) return <ErrorMessage message={masterData.error} />;
  async function submit(event) {
    event.preventDefault(); setError(""); if (!vendor || !lines.length) return setError("Select a vendor and add at least one item."); setSaving(true);
    const body = receipt ? { vendor, grnDate: date, remarks: notes, items: lines } : { vendor, poDate: date, notes, items: lines };
    try { await api(receipt ? "/transactions/purchase-receipts" : "/transactions/purchase-orders", { method: "POST", body }); setLines([]); setNotes(""); onSaved(receipt ? "Goods received and stock has been updated." : "Purchase order created."); }
    catch (requestError) { setError(requestError.message); } finally { setSaving(false); }
  }
  return <form onSubmit={submit}><div className="form-grid"><Field label="Vendor" name="vendor" value={vendor} onChange={(event) => setVendor(event.target.value)} required options={masterData.data.vendors.map((supplier) => ({ value: supplier._id, label: `${supplier.vendorCode} — ${supplier.name}` }))} /><Field label={receipt ? "GRN date" : "PO date"} name="date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required /><label className="field span-2"><span>{receipt ? "Remarks" : "Notes"}</span><input value={notes} onChange={(event) => setNotes(event.target.value)} /></label></div>{error && <ErrorMessage message={error}/>}<h3>Items</h3><LineEditor items={masterData.data.items} lines={lines} setLines={setLines} /><div className="form-actions"><Button disabled={saving}>{saving ? "Saving…" : receipt ? "Receive goods & update stock" : "Create purchase order"}</Button></div></form>;
}

export function BillingPage({ history = false }) {
  const [customer, setCustomer] = useState({
    name: "Walk-in Customer",
    mobile: "",
  });

  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [lines, setLines] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const masterData = useAsync(
    () =>
      Promise.all([
        api("/masters/items?limit=500"),
        api("/settings"),
      ]).then(([items, settings]) => ({
        items: items.data,
        paymentMethods:
          settings.data.paymentMethods || [
            "CASH",
            "UPI",
            "CARD",
            "CREDIT",
            "OTHER",
          ],
      })),
    []
  );

  const invoiceData = useAsync(
    () =>
      api("/transactions/invoices").then(
        (response) => response.data
      ),
    [history, message]
  );

  const total = useMemo(
    () =>
      lines.reduce(
        (sum, line) =>
          sum +
          line.quantity * line.rate -
          line.discount +
          line.tax,
        0
      ),
    [lines]
  );

  async function save() {
    setError("");

    if (!lines.length) {
      return setError("Add at least one item to the bill.");
    }

    setSaving(true);

    try {
      const result = await api("/transactions/invoices", {
        method: "POST",
        body: {
          customer,
          paymentMethod,
          items: lines,
        },
      });

      setLines([]);

      setMessage(
        `Invoice ${result.data.invoiceNumber} was saved and stock was deducted.`
      );

      await downloadInvoice(
        result.data._id,
        result.data.invoiceNumber
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function cancel(invoice) {
    if (
      !window.confirm(
        `Cancel ${invoice.invoiceNumber}? Its stock will be restored.`
      )
    ) {
      return;
    }

    try {
      await api(
        `/transactions/invoices/${invoice._id}/cancel`,
        {
          method: "POST",
          body: {
            reason: "Cancelled from bill history",
          },
        }
      );

      setMessage(
        `${invoice.invoiceNumber} cancelled and stock restored.`
      );
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  if (masterData.loading || invoiceData.loading) {
    return <Loading />;
  }

  if (masterData.error) {
    return <ErrorMessage message={masterData.error} />;
  }

  if (invoiceData.error) {
    return <ErrorMessage message={invoiceData.error} />;
  }

  if (history) {
    return (
      <>
        <PageHeader
          title="Bill History"
          description="View, reprint, and cancel completed invoices safely."
        />

        {message && <Notice>{message}</Notice>}
        {error && <ErrorMessage message={error} />}

        <Card title="Invoices">
          <DataTable
            rows={invoiceData.data || []}
            columns={[
              {
                key: "invoiceNumber",
                label: "Invoice",
              },
              {
                key: "invoiceDate",
                label: "Date",
                render: (row) =>
                  new Date(row.invoiceDate).toLocaleDateString("en-IN"),
              },
              {
                key: "customer.name",
                label: "Customer",
              },
              {
                key: "paymentMethod",
                label: "Payment",
              },
              {
                key: "grandTotal",
                label: "Total",
                render: (row) => currency(row.grandTotal),
              },
              {
                key: "status",
                label: "Status",
                render: (row) => (
                  <span className="badge">{row.status}</span>
                ),
              },
              {
                key: "action",
                label: "",
                render: (row) => (
                  <div className="row-actions">
                    <button
                      onClick={() =>
                        downloadInvoice(
                          row._id,
                          row.invoiceNumber
                        )
                      }
                    >
                      PDF
                    </button>

                    {row.status === "COMPLETED" && (
                      <button
                        className="danger-link"
                        onClick={() => cancel(row)}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="New Bill"
        description="Pack quantities are converted to base units and checked against live stock before saving."
      />

      {message && <Notice>{message}</Notice>}
      {error && <ErrorMessage message={error} />}

      <div className="two-column wide-left">
        <Card title="Customer & payment">
          <div className="form-grid">
            <Field
              label="Customer name"
              name="name"
              value={customer.name}
              onChange={(event) =>
                setCustomer({
                  ...customer,
                  name: event.target.value,
                })
              }
            />

            <Field
              label="Mobile"
              name="mobile"
              value={customer.mobile}
              onChange={(event) =>
                setCustomer({
                  ...customer,
                  mobile: event.target.value,
                })
              }
            />

            <Field
              label="Payment method"
              name="payment"
              value={paymentMethod}
              onChange={(event) =>
                setPaymentMethod(event.target.value)
              }
              options={masterData.data.paymentMethods}
            />
          </div>

          <h3>Bill items</h3>

          <LineEditor
            items={masterData.data.items || []}
            lines={lines}
            setLines={setLines}
            sale
          />

          <div className="form-actions">
            <strong className="grand-total">
              Grand total: {currency(total)}
            </strong>

            <Button disabled={saving} onClick={save}>
              {saving
                ? "Saving…"
                : "Save bill & download PDF"}
            </Button>
          </div>
        </Card>

        <Card title="Billing checklist">
          <ol className="check-list">
            <li>
              Choose a product and its sellable package.
            </li>
            <li>
              Stock is validated by the server before the bill is saved.
            </li>
            <li>
              The transaction writes one stock-ledger entry per line.
            </li>
            <li>
              Download or reprint the generated invoice PDF.
            </li>
          </ol>
        </Card>
      </div>
    </>
  );
}
export function PurchasePage({ receipt = false }) {
  const [message, setMessage] = useState(""); const endpoint = receipt ? "/transactions/purchase-receipts" : "/transactions/purchase-orders";
  const history = useAsync(() => api(endpoint).then((response) => response.data), [endpoint, message]);
return (
  <>
    <PageHeader
      title={receipt ? "Goods Receiving" : "Purchase Orders"}
      description={
        receipt
          ? "Confirm goods received. Stock increases only after this step."
          : "Plan purchases from your wholesale vendors."
      }
    />

    {message && <Notice>{message}</Notice>}

    <div className="two-column wide-left">
      <Card
        title={
          receipt ? "Create purchase receipt" : "Create purchase order"
        }
      >
        <PurchaseForm receipt={receipt} onSaved={setMessage} />
      </Card>

      <Card
        title={receipt ? "Recent receipts" : "Recent purchase orders"}
      >
        {history.loading ? (
          <Loading />
        ) : (
          <DataTable
            rows={history.data || []}
            columns={
              receipt
                ? [
                    {
                      key: "grnNumber",
                      label: "GRN",
                    },
                    {
                      key: "grnDate",
                      label: "Date",
                      render: (row) =>
                        new Date(row.grnDate).toLocaleDateString("en-IN"),
                    },
                    {
                      key: "vendor.name",
                      label: "Vendor",
                    },
                    {
                      key: "grandTotal",
                      label: "Total",
                      render: (row) => currency(row.grandTotal),
                    },
                  ]
                : [
                    {
                      key: "poNumber",
                      label: "PO number",
                    },
                    {
                      key: "poDate",
                      label: "Date",
                      render: (row) =>
                        new Date(row.poDate).toLocaleDateString("en-IN"),
                    },
                    {
                      key: "vendor.name",
                      label: "Vendor",
                    },
                    {
                      key: "status",
                      label: "Status",
                      render: (row) => (
                        <span className="badge">{row.status}</span>
                      ),
                    },
                    {
                      key: "grandTotal",
                      label: "Total",
                      render: (row) => currency(row.grandTotal),
                    },
                  ]
            }
          />
        )}
      </Card>
    </div>
  </>
);

}

