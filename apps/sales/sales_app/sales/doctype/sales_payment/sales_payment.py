import frappe
from frappe.model.document import Document


class SalesPayment(Document):
	def validate(self):
		if self.paid_amount is not None and self.paid_amount <= 0:
			frappe.throw("Paid Amount must be greater than zero.")

	def on_submit(self):
		invoice_amount = frappe.db.get_value("Sales Invoice", self.sales_invoice, "invoice_amount") or 0
		total_paid = (
			frappe.db.sql(
				"""
				select ifnull(sum(paid_amount), 0)
				from `tabSales Payment`
				where sales_invoice = %s and docstatus = 1 and name != %s
				""",
				(self.sales_invoice, self.name),
			)[0][0]
			or 0
		)
		current_paid = total_paid + (self.paid_amount or 0)
		new_status = "Paid" if current_paid >= invoice_amount else "Partially Paid"
		frappe.db.set_value("Sales Invoice", self.sales_invoice, "status", new_status)

