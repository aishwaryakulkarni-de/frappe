frappe.ui.form.on("Sales Invoice", {
	refresh(frm) {
		frm.dashboard.set_headline(__("Current Stage: {0}", [frm.doc.status || "Draft"]));
		if (!frm.is_new() && frm.doc.docstatus === 1 && frm.doc.status !== "Paid") {
			frm.add_custom_button(__("Record Payment"), () => {
				frappe.call({
					method: "sales_app.api.create_sales_payment_from_invoice",
					args: { source_name: frm.doc.name },
					callback(r) {
						if (r.message) {
							frappe.set_route("Form", "Sales Payment", r.message);
						}
					},
				});
			});
		}
	},
});

