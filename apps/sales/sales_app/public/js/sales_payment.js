frappe.ui.form.on("Sales Payment", {
	refresh(frm) {
		frm.dashboard.set_headline(__("Current Stage: {0}", [frm.doc.status || "Pending"]));
	},
	validate(frm) {
		if (frm.doc.paid_amount <= 0) {
			frappe.throw(__("Paid Amount must be greater than zero."));
		}
	},
});

