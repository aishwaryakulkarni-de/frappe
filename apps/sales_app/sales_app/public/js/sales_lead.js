frappe.ui.form.on("Sales Lead", {
	refresh(frm) {
		frm.dashboard.set_headline(__("Current Stage: {0}", [frm.doc.status || "Open"]));
		if (!frm.is_new() && frm.doc.status !== "Lost") {
			frm.add_custom_button(__("Create Opportunity"), () => {
				frappe.call({
					method: "sales_app.api.create_sales_opportunity_from_lead",
					args: { source_name: frm.doc.name },
					callback(r) {
						if (r.message) {
							frappe.set_route("Form", "Sales Opportunity", r.message);
						}
					},
				});
			});
		}
	},
});

