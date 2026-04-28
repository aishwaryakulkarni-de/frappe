import frappe
from frappe.model.document import Document


def _insert_doc(doctype: str, data: dict) -> Document:
	if doctype == "Sales Invoice" and "posting_date" not in data:
		data["posting_date"] = frappe.utils.nowdate()
	doc = frappe.get_doc({"doctype": doctype, **data})
	doc.insert(ignore_permissions=True)
	return doc


@frappe.whitelist()
def create_sales_opportunity_from_lead(source_name: str) -> str:
	lead = frappe.get_doc("Sales Lead", source_name)
	opportunity = _insert_doc(
		"Sales Opportunity",
		{
			"lead": lead.name,
			"party_name": lead.party_name,
			"company": lead.company,
			"contact_email": lead.contact_email,
			"contact_phone": lead.contact_phone,
			"expected_value": lead.expected_value,
			"status": "Open",
		},
	)
	lead.db_set("status", "Qualified")
	return opportunity.name


@frappe.whitelist()
def create_sales_quotation_from_opportunity(source_name: str) -> str:
	opportunity = frappe.get_doc("Sales Opportunity", source_name)
	quotation = _insert_doc(
		"Sales Quotation",
		{
			"opportunity": opportunity.name,
			"party_name": opportunity.party_name,
			"company": opportunity.company,
			"contact_email": opportunity.contact_email,
			"contact_phone": opportunity.contact_phone,
			"quoted_amount": opportunity.expected_value or 0,
			"status": "Draft",
		},
	)
	opportunity.db_set("status", "Proposal Sent")
	return quotation.name


@frappe.whitelist()
def create_sales_order_from_quotation(source_name: str) -> str:
	quotation = frappe.get_doc("Sales Quotation", source_name)
	order = _insert_doc(
		"Sales Order",
		{
			"quotation": quotation.name,
			"party_name": quotation.party_name,
			"company": quotation.company,
			"contact_email": quotation.contact_email,
			"contact_phone": quotation.contact_phone,
			"order_amount": quotation.quoted_amount or 0,
			"status": "Draft",
		},
	)
	quotation.db_set("status", "Accepted")
	return order.name


@frappe.whitelist()
def create_sales_invoice_from_order(source_name: str) -> str:
	order = frappe.get_doc("Sales Order", source_name)
	invoice = _insert_doc(
		"Sales Invoice",
		{
			"sales_order": order.name,
			"party_name": order.party_name,
			"company": order.company,
			"contact_email": order.contact_email,
			"contact_phone": order.contact_phone,
			"invoice_amount": order.order_amount or 0,
			"status": "Draft",
		},
	)
	order.db_set("status", "Delivered")
	return invoice.name


@frappe.whitelist()
def create_sales_payment_from_invoice(source_name: str) -> str:
	invoice = frappe.get_doc("Sales Invoice", source_name)
	payment = _insert_doc(
		"Sales Payment",
		{
			"sales_invoice": invoice.name,
			"party_name": invoice.party_name,
			"company": invoice.company,
			"paid_amount": invoice.invoice_amount or 0,
			"status": "Pending",
		},
	)
	invoice.db_set("status", "Unpaid")
	return payment.name


@frappe.whitelist()
def get_sales_dashboard_counts() -> dict:
	return {
		"leads": frappe.db.count("Sales Lead"),
		"opportunities": frappe.db.count("Sales Opportunity"),
		"quotations": frappe.db.count("Sales Quotation"),
		"orders": frappe.db.count("Sales Order"),
		"invoices": frappe.db.count("Sales Invoice"),
		"payments": frappe.db.count("Sales Payment"),
	}

