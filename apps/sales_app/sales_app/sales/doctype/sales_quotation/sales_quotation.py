import frappe
from frappe.model.document import Document


class SalesQuotation(Document):
	def validate(self):
		if self.quoted_amount is not None and self.quoted_amount <= 0:
			frappe.throw("Quoted Amount must be greater than zero.")

	def on_submit(self):
		if self.status == "Draft":
			self.db_set("status", "Open")

