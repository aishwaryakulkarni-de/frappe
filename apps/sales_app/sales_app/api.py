import frappe
from frappe.model.document import Document
from frappe.utils import add_days, get_first_day, get_last_day, getdate, nowdate


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
	opportunity.db_set("status", "Quotation")
	return quotation.name


@frappe.whitelist()
def create_sales_order_from_quotation(source_name: str) -> str:
	quotation = frappe.get_doc("Sales Quotation", source_name)
	order = _insert_doc(
		"Sales Lifecycle Order",
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
	quotation.db_set("status", "Ordered")
	return order.name


@frappe.whitelist()
def create_sales_delivery_from_order(source_name: str) -> str:
	order = frappe.get_doc("Sales Lifecycle Order", source_name)
	delivery = _insert_doc(
		"Sales Delivery",
		{
			"sales_order": order.name,
			"party_name": order.party_name,
			"company": order.company,
			"contact_email": order.contact_email,
			"contact_phone": order.contact_phone,
			"delivered_amount": order.order_amount or 0,
			"status": "Draft",
		},
	)
	order.db_set("status", "To Bill")
	return delivery.name


@frappe.whitelist()
def create_sales_invoice_from_order(source_name: str, source_doctype: str = "Sales Lifecycle Order") -> str:
	if source_doctype == "Sales Delivery":
		delivery = frappe.get_doc("Sales Delivery", source_name)
		order = frappe.get_doc("Sales Lifecycle Order", delivery.sales_order)
		party_name = delivery.party_name
		company = delivery.company
		contact_email = delivery.contact_email
		contact_phone = delivery.contact_phone
		invoice_amount = delivery.delivered_amount or order.order_amount or 0
		sales_order = order.name
		delivery.db_set("status", "To Bill")
	else:
		order = frappe.get_doc("Sales Lifecycle Order", source_name)
		party_name = order.party_name
		company = order.company
		contact_email = order.contact_email
		contact_phone = order.contact_phone
		invoice_amount = order.order_amount or 0
		sales_order = order.name

	invoice = _insert_doc(
		"Sales Invoice",
		{
			"sales_order": sales_order,
			"party_name": party_name,
			"company": company,
			"contact_email": contact_email,
			"contact_phone": contact_phone,
			"invoice_amount": invoice_amount,
			"status": "Draft",
		},
	)
	order.db_set("status", "Completed")
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
def get_sales_dashboard_counts(period: str = "month") -> dict:
	from_date, to_date = _get_period_range(period)

	leads_filter = {"creation": ["between", [from_date, to_date]]}
	opportunity_filter = {"transaction_date": ["between", [from_date, to_date]]}
	quotation_filter = {"transaction_date": ["between", [from_date, to_date]]}
	# ERPNext core Sales Order uses `transaction_date` (not `order_date`).
	order_filter = {"transaction_date": ["between", [from_date, to_date]]}
	delivery_filter = {"posting_date": ["between", [from_date, to_date]]}
	invoice_filter = {"posting_date": ["between", [from_date, to_date]]}
	payment_filter = {"payment_date": ["between", [from_date, to_date]]}

	return {
		"period": period,
		"from_date": str(from_date),
		"to_date": str(to_date),
		"leads": frappe.db.count("Lead", filters=leads_filter),
		"opportunities": frappe.db.count("Opportunity", filters=opportunity_filter),
		"quotations": frappe.db.count("Quotation", filters=quotation_filter),
		"orders": frappe.db.count("Sales Order", filters=order_filter),
		"deliveries": frappe.db.count("Delivery Note", filters=delivery_filter),
		"invoices": frappe.db.count("Sales Invoice", filters=invoice_filter),
		"payments": frappe.db.count("Sales Payment", filters=payment_filter),
		"totals": {
			"leads": 0,
			"opportunities": _sum_field("Opportunity", "opportunity_amount", opportunity_filter),
			"quotations": _sum_field("Quotation", "grand_total", quotation_filter),
			"orders": _sum_field("Sales Order", "grand_total", order_filter),
			"deliveries": _sum_field("Delivery Note", "grand_total", delivery_filter),
			"invoices": _sum_field("Sales Invoice", "invoice_amount", invoice_filter),
			"payments": _sum_field("Sales Payment", "paid_amount", payment_filter),
		},
	}


def _sum_field(doctype: str, fieldname: str, filters: dict) -> float:
	# Using SQL aggregate for faster KPI calculations.
	result = frappe.get_all(doctype, filters=filters, fields=[f"sum({fieldname}) as total"])
	return float((result and result[0].get("total")) or 0)


def _get_period_range(period: str):
	today = getdate(nowdate())

	if period == "quarter":
		quarter = ((today.month - 1) // 3) + 1
		start_month = (quarter - 1) * 3 + 1
		from_date = today.replace(month=start_month, day=1)
		to_month = start_month + 2
		month_end_date = today.replace(month=to_month, day=1)
		to_date = get_last_day(month_end_date)
	elif period == "year":
		from_date = today.replace(month=1, day=1)
		to_date = today.replace(month=12, day=31)
	else:
		first_day = get_first_day(today)
		from_date = getdate(first_day)
		to_date = getdate(get_last_day(today))

	return from_date, to_date

