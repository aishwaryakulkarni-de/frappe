frappe.ui.form.on("Sales Quotation", {
	refresh(frm) {
		frm.dashboard.set_headline(__("Current Stage: {0}", [frm.doc.status || "Draft"]));
		if (!frm.is_new() && frm.doc.docstatus === 1) {
			frm.add_custom_button(__("Sales Lifecycle Order"), () => {
				frappe.call({
					method: "sales_app.api.create_sales_order_from_quotation",
					args: { source_name: frm.doc.name },
					callback(r) {
						if (r.message) {
							frappe.set_route("Form", "Sales Lifecycle Order", r.message);
						}
					},
				});
			}, __("Make"));
		}
	},
});

