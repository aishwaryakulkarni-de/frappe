frappe.ui.form.on("Sales Opportunity", {
	refresh(frm) {
		frm.dashboard.set_headline(__("Current Stage: {0}", [frm.doc.status || "Open"]));
		if (!frm.is_new() && !["Converted", "Lost", "Closed"].includes(frm.doc.status)) {
			frm.add_custom_button(__("Quotation"), () => {
				frappe.call({
					method: "sales_app.api.create_sales_quotation_from_opportunity",
					args: { source_name: frm.doc.name },
					callback(r) {
						if (r.message) {
							frappe.set_route("Form", "Sales Quotation", r.message);
						}
					},
				});
			}, __("Make"));
		}
	},
	sales_stage(frm) {
		const matrix = {
			Prospecting: 10,
			"Needs Analysis": 20,
			"Value Proposition": 40,
			"Identifying Decision Makers": 50,
			"Perception Analysis": 60,
			"Proposal / Price Quote": 70,
			"Negotiation / Review": 85,
			"Closed Won": 100,
			"Closed Lost": 0,
		};
		if (Object.prototype.hasOwnProperty.call(matrix, frm.doc.sales_stage)) {
			frm.set_value("probability", matrix[frm.doc.sales_stage]);
		}
	},
});

