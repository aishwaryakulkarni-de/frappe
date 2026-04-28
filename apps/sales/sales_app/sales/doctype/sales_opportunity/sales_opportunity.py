import frappe
from frappe.model.document import Document


class SalesOpportunity(Document):
	def validate(self):
		if not self.lead:
			frappe.throw("Lead is required for opportunity.")
		if self.expected_value and self.expected_value < 0:
			frappe.throw("Expected Value cannot be negative.")

