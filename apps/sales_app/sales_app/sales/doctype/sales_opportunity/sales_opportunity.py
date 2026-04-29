import frappe
from frappe.model.document import Document

SALES_STAGE_PROBABILITY_MAP = {
	"Prospecting": 10,
	"Needs Analysis": 20,
	"Value Proposition": 40,
	"Identifying Decision Makers": 50,
	"Perception Analysis": 60,
	"Proposal / Price Quote": 70,
	"Negotiation / Review": 85,
	"Closed Won": 100,
	"Closed Lost": 0,
}


class SalesOpportunity(Document):
	def validate(self):
		if not self.lead:
			frappe.throw("Lead is required for opportunity.")
		if self.expected_value and self.expected_value < 0:
			frappe.throw("Expected Value cannot be negative.")
		if self.sales_stage in SALES_STAGE_PROBABILITY_MAP:
			self.probability = SALES_STAGE_PROBABILITY_MAP[self.sales_stage]

