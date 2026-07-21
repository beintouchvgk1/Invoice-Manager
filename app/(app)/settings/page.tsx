"use client";
import { ChangeEvent, useEffect, useState } from "react";
import { Header } from "@/components/Layout/Header";
import { Loader } from "@/components/Common/Loader";
import { Toast } from "@/components/Common/Toast";
import { useSettings } from "@/hooks/useSettings";
import { settingsService } from "@/services/settings.service";

export default function SettingsPage() {
  const { settings, loading, refresh } = useSettings();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [mobile, setMobile] = useState("");
  const [termsAndConditions, setTermsAndConditions] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [branch, setBranch] = useState("");
  const [upiId, setUpiId] = useState("");
  const [signature, setSignature] = useState("");
  const [prefix, setPrefix] = useState("VGK");
  const [financialYear, setFinancialYear] = useState("2024-25");
  const [nextInvoiceCounter, setNextInvoiceCounter] = useState(1);
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setName(settings.firmDetails.name || "");
    setEmail(settings.firmDetails.email || "");
    setAddress(settings.firmDetails.address || "");
    setCity(settings.firmDetails.city || "");
    setPincode(settings.firmDetails.pincode || "");
    setMobile(settings.firmDetails.mobile || "");
    setTermsAndConditions(settings.firmDetails.termsAndConditions || "");
    setBankName(settings.bankAccount.bankName || "");
    setAccountName(settings.bankAccount.accountName || "");
    setAccountNumber(settings.bankAccount.accountNumber || "");
    setIfscCode(settings.bankAccount.ifscCode || "");
    setBranch(settings.bankAccount.branch || "");
    setUpiId(settings.bankAccount.upiId || "");
    setSignature(settings.signature || "");
    setPrefix(settings.invoiceNumbering.prefix || "VGK");
    setFinancialYear(settings.invoiceNumbering.financialYear || "2024-25");
    setNextInvoiceCounter(settings.invoiceNumbering.nextInvoiceCounter || 1);
    setCategories(settings.categories || []);
  }, [settings]);

  function handleSignatureChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSignature(String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  function removeSignature() {
    setSignature("");
  }

  async function addCategory() {
    const v = newCategory.trim();
    if (!v) return;
    const updated = [...categories, v];
    setCategories(updated);
    setNewCategory("");
    await settingsService.update({ categories: updated });
  }

  async function deleteCategory(i: number) {
    const updated = categories.filter((_, idx) => idx !== i);
    setCategories(updated);
    await settingsService.update({ categories: updated });
  }

  async function handleSave() {
    setBusy(true);
    try {
      await settingsService.update({
        firmDetails: { name, email, address, city, pincode, mobile, termsAndConditions },
        bankAccount: { bankName, accountName, accountNumber, ifscCode, branch, upiId },
        signature,
        invoiceNumbering: { prefix: prefix.toUpperCase(), financialYear, nextInvoiceCounter, nextReceiptCounter: settings?.invoiceNumbering.nextReceiptCounter ?? 1 },
        categories,
      });
      await refresh();
      setToast("Settings saved.");
      setTimeout(() => setToast(""), 2500);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Header title="Settings" />
      <div id="ct">
        {loading ? (
          <Loader />
        ) : (
          <>
            <div className="fc">
              <h3>Firm Details</h3>
              <div className="g2">
                <div className="fg"><label>Firm Name</label><input value={name} onChange={(e) => setName(e.target.value)} /></div>
                <div className="fg"><label>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div className="fg fl"><label>Address (press Enter for each line)</label><textarea rows={4} value={address} onChange={(e) => setAddress(e.target.value)} /></div>
                <div className="fg"><label>City</label><input value={city} onChange={(e) => setCity(e.target.value)} /></div>
                <div className="fg"><label>Pincode</label><input value={pincode} onChange={(e) => setPincode(e.target.value)} /></div>
                <div className="fg"><label>Mobile no.</label><input value={mobile} onChange={(e) => setMobile(e.target.value)} /></div>
                <div className="fg fl"><label>Terms &amp; Conditions</label><textarea rows={2} value={termsAndConditions} onChange={(e) => setTermsAndConditions(e.target.value)} /></div>
              </div>
            </div>

            <div className="fc">
              <h3>Bank Account</h3>
              <div className="g2">
                <div className="fg"><label>Bank Name</label><input value={bankName} onChange={(e) => setBankName(e.target.value)} /></div>
                <div className="fg"><label>Account Name</label><input value={accountName} onChange={(e) => setAccountName(e.target.value)} /></div>
                <div className="fg"><label>Account No.</label><input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} /></div>
                <div className="fg"><label>IFSC Code</label><input value={ifscCode} onChange={(e) => setIfscCode(e.target.value)} /></div>
                <div className="fg"><label>Branch</label><input value={branch} onChange={(e) => setBranch(e.target.value)} /></div>
                <div className="fg"><label>UPI ID</label><input value={upiId} onChange={(e) => setUpiId(e.target.value)} /></div>
              </div>
            </div>

            <div className="fc">
              <h3>Signature</h3>
              <div className="sig-upload">
                <div>
                  <label style={{ fontSize: 11, color: "#475569", fontWeight: 600, display: "block", marginBottom: 4 }}>
                    Upload / Change Signature (PNG/JPG)
                  </label>
                  <input type="file" accept="image/png,image/jpeg" onChange={handleSignatureChange} />
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img id="sig-prev" alt="Signature" src={signature || undefined} style={{ display: signature ? "block" : "none" }} />
                <button className="btn brd sm" type="button" onClick={removeSignature}>Remove Signature</button>
              </div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}>Appears on invoice and receipt PDF above Authorised Signatory</div>
            </div>

            <div className="fc">
              <h3>Service Categories</h3>
              <div style={{ marginBottom: 10 }}>
                {categories.length ? (
                  categories.map((c, i) => (
                    <div className="cat-item" key={`${c}-${i}`}>
                      {c}
                      <button onClick={() => deleteCategory(i)} style={{ float: "right", background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 14 }}>×</button>
                    </div>
                  ))
                ) : (
                  <div style={{ color: "#94a3b8", fontSize: 12 }}>No categories</div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  style={{ flex: 1, padding: "7px 9px", border: "1px solid #cbd5e1", borderRadius: 4, fontSize: 12, outline: "none" }}
                  placeholder="Add new category"
                />
                <button className="btn bp sm" onClick={addCategory}>Add</button>
              </div>
            </div>

            <div className="fc">
              <h3>Invoice Numbering</h3>
              <div className="g3">
                <div className="fg"><label>Prefix</label><input value={prefix} onChange={(e) => setPrefix(e.target.value)} /></div>
                <div className="fg"><label>Financial Year</label><input value={financialYear} onChange={(e) => setFinancialYear(e.target.value)} /></div>
                <div className="fg"><label>Next Invoice Counter</label><input type="number" min="1" value={nextInvoiceCounter} onChange={(e) => setNextInvoiceCounter(parseInt(e.target.value) || 1)} /></div>
              </div>
            </div>

            <div>{toast && <Toast kind="ok" message={toast} />}</div>
            <button className="btn bp" disabled={busy} onClick={handleSave}>Save Settings</button>
          </>
        )}
      </div>
    </>
  );
}
