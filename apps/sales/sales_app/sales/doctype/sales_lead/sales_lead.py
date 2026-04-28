import frappe
from frappe.model.document import Document


class SalesLead(Document):
	def validate(self):
		if self.expected_value and self.expected_value < 0:
			frappe.throw("Expected Value cannot be negative.")

