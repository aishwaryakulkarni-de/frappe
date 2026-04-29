const paymentEntryFromInvoice = (frm) => {
	frm.dashboard.set_headline(__("Current Stage: {0}", [frm.doc.status || "Draft"]));

	if (!frm.is_new() && frm.doc.docstatus === 1 && frm.doc.status !== "Paid") {
		frm.add_custom_button(
			__("Payment Entry"),
			() => {
				frappe.call({
					method: "sales_app.api.create_sales_payment_from_invoice",
					args: { source_name: frm.doc.name, source_doctype: frm.doc.doctype },
					callback(r) {
						if (r.message) {
							frappe.set_route("Form", "Sales Payment", r.message);
						}
					},
				});
			},
			__("Make"),
		);
	}
};

frappe.ui.form.on("Sales Invoice", {
	refresh(frm) {
		paymentEntryFromInvoice(frm);
	},
});

frappe.ui.form.on("Sales Lifecycle Invoice", {
	refresh(frm) {
		paymentEntryFromInvoice(frm);
	},
});

