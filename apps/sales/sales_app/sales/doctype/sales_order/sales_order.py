import frappe
from frappe.model.document import Document


class SalesOrder(Document):
	def validate(self):
		if self.order_amount is not None and self.order_amount <= 0:
			frappe.throw("Order Amount must be greater than zero.")

