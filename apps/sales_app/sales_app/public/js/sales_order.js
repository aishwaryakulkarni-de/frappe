frappe.ui.form.on("Sales Lifecycle Order", {
	refresh(frm) {
		frm.dashboard.set_headline(__("Current Stage: {0}", [frm.doc.status || "Draft"]));
		if (!frm.is_new() && frm.doc.docstatus === 1) {
			frm.add_custom_button(__("Create Delivery Note"), () => {
				frappe.call({
					method: "sales_app.api.create_sales_delivery_from_order",
					args: { source_name: frm.doc.name },
					callback(r) {
						if (r.message) {
							frappe.set_route("Form", "Sales Delivery", r.message);
						}
					},
				});
			});
			frm.add_custom_button(__("Create Sales Invoice"), () => {
				frappe.call({
					method: "sales_app.api.create_sales_invoice_from_order",
					args: { source_name: frm.doc.name },
					callback(r) {
						if (r.message) {
							frappe.set_route("Form", "Sales Lifecycle Invoice", r.message);
						}
					},
				});
			});
		}
	},
});

