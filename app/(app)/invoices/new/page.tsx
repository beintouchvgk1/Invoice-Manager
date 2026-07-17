import { Header } from "@/components/Layout/Header";
import { InvoiceForm } from "@/components/Invoice/InvoiceForm";

export default function NewInvoicePage() {
  return (
    <>
      <Header title="New Invoice" />
      <div id="ct">
        <InvoiceForm />
      </div>
    </>
  );
}
