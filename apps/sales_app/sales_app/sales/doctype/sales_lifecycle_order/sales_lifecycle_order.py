import frappe
from frappe.model.document import Document


class SalesLifecycleOrder(Document):
	def validate(self):
		if self.order_amount is not None and self.order_amount <= 0:
			frappe.throw("Order Amount must be greater than zero.")

	def on_submit(self):
		if self.status == "Draft":
			self.db_set("status", "To Deliver and Bill")

