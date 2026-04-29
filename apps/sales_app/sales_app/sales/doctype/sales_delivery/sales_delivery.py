import frappe
from frappe.model.document import Document


class SalesDelivery(Document):
	def validate(self):
		if self.delivered_amount is not None and self.delivered_amount <= 0:
			frappe.throw("Delivered Amount must be greater than zero.")

	def on_submit(self):
		if self.sales_order:
			frappe.db.set_value("Sales Lifecycle Order", self.sales_order, "status", "To Bill")
