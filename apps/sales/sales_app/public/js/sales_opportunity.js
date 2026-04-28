frappe.ui.form.on("Sales Opportunity", {
	refresh(frm) {
		frm.dashboard.set_headline(__("Current Stage: {0}", [frm.doc.status || "Open"]));
		if (!frm.is_new() && !["Won", "Lost"].includes(frm.doc.status)) {
			frm.add_custom_button(__("Create Quotation"), () => {
				frappe.call({
					method: "sales_app.api.create_sales_quotation_from_opportunity",
					args: { source_name: frm.doc.name },
					callback(r) {
						if (r.message) {
							frappe.set_route("Form", "Sales Quotation", r.message);
						}
					},
				});
			});
		}
	},
});

