import frappe
from frappe.model.document import Document


class SalesInvoice(Document):
	def validate(self):
		if self.invoice_amount is not None and self.invoice_amount <= 0:
			frappe.throw("Invoice Amount must be greater than zero.")

