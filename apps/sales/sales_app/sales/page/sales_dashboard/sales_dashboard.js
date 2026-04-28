frappe.pages["sales-dashboard"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Sales Dashboard"),
		single_column: true,
	});

	const sections = [
		{ key: "leads", label: "Leads", doctype: "Sales Lead", color: "#2563eb" },
		{ key: "opportunities", label: "Opportunities", doctype: "Sales Opportunity", color: "#7c3aed" },
		{ key: "quotations", label: "Quotations", doctype: "Sales Quotation", color: "#0891b2" },
		{ key: "orders", label: "Orders", doctype: "Sales Order", color: "#ea580c" },
		{ key: "invoices", label: "Invoices", doctype: "Sales Invoice", color: "#dc2626" },
		{ key: "payments", label: "Payments", doctype: "Sales Payment", color: "#16a34a" },
	];

	const style = $(`
		<style>
			.sales-dash-wrap { padding: 12px 8px 20px; max-width: 1300px; margin: 0 auto; }
			.sales-dash-actions { display: flex; gap: 10px; flex-wrap: wrap; margin: 8px 0 16px; }
			.sales-dash-actions .btn { border-radius: 10px; padding: 6px 12px; font-weight: 600; }
			.sales-dash-root { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; }
			.sales-re-card {
				border-radius: 16px;
				border: 1px solid var(--border-color);
				background: linear-gradient(180deg, var(--card-bg) 0%, rgba(148, 163, 184, 0.08) 100%);
				padding: 14px;
			}
			.sales-re-card h6 {
				margin: 0 0 8px 4px;
				font-size: 13px;
				font-weight: 700;
				color: var(--text-muted);
				text-transform: uppercase;
				letter-spacing: .04em;
			}
			.sales-re-grid-2 {
				display: grid;
				grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr);
				gap: 16px;
			}
			.sales-kpi-grid {
				display: grid;
				grid-template-columns: repeat(6, minmax(0, 1fr));
				gap: 12px;
			}
			.sales-kpi {
				border-radius: 14px;
				border: 1px solid var(--border-color);
				padding: 14px;
				cursor: pointer;
				background: var(--card-bg);
				transition: .15s ease;
			}
			.sales-kpi:hover { transform: translateY(-2px); box-shadow: 0 10px 22px rgba(15, 23, 42, .10); }
			.sales-kpi .k-label { font-size: 12px; color: var(--text-muted); text-transform: uppercase; letter-spacing: .04em; font-weight: 700; }
			.sales-kpi .k-value { font-size: 34px; line-height: 1.05; font-weight: 800; margin: 10px 0 8px; }
			.sales-kpi .k-meta { font-size: 12px; color: var(--text-muted); display: flex; justify-content: space-between; }
			.sales-kpi .k-top { display: flex; align-items: center; justify-content: space-between; }
			.sales-kpi .k-top i, .sales-re-card h6 i {
				width: 16px;
				height: 16px;
				color: var(--text-muted);
				vertical-align: middle;
			}
			.sales-re-card h6 { display: flex; align-items: center; gap: 6px; }
			.sales-chart-box { width: 100%; height: 320px; }
			.sales-empty { color: var(--text-muted); padding: 20px 4px; }
			@media (max-width: 1199px) { .sales-kpi-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
			@media (max-width: 991px) {
				.sales-re-grid-2 { grid-template-columns: 1fr; }
				.sales-kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
			}
			@media (max-width: 640px) {
				.sales-dash-wrap { padding: 8px 2px 14px; }
				.sales-dash-actions .btn { flex: 1 1 auto; text-align: center; }
				.sales-kpi-grid { grid-template-columns: 1fr; }
				.sales-chart-box { height: 280px; }
			}
		</style>
	`);

	const body = $(`
		<div class="sales-dash-wrap">
			<div class="sales-dash-actions">
				<button class="btn btn-primary btn-sm" id="sales-new-lead">${__("New Lead")}</button>
				<button class="btn btn-default btn-sm" id="sales-new-opportunity">${__("New Opportunity")}</button>
				<button class="btn btn-default btn-sm" id="sales-refresh">${__("Refresh")}</button>
			</div>
			<div id="sales-recharts-root" class="sales-dash-root"></div>
		</div>
	`);

	$(page.body).empty().append(style).append(body);
	const rootEl = body.find("#sales-recharts-root")[0];

	const toInt = (value) => Number.parseInt(value, 10) || 0;

	const loadScript = (url) =>
		new Promise((resolve, reject) => {
			if ([...document.scripts].some((s) => s.src === url)) {
				resolve();
				return;
			}
			const script = document.createElement("script");
			script.src = url;
			script.async = true;
			script.onload = resolve;
			script.onerror = reject;
			document.head.appendChild(script);
		});

	const ensureRecharts = async () => {
		if (!window.React) await loadScript("/assets/sales_app/js/vendor/react.production.min.js");
		if (!window.PropTypes) await loadScript("/assets/sales_app/js/vendor/prop-types.min.js");
		if (!window.ReactDOM) await loadScript("/assets/sales_app/js/vendor/react-dom.production.min.js");
		if (!window.Recharts) await loadScript("/assets/sales_app/js/vendor/recharts.min.js");
		if (!window.lucide) await loadScript("/assets/sales_app/js/vendor/lucide.min.js");
	};

	const activateLucideIcons = () => {
		if (window.lucide && typeof window.lucide.createIcons === "function") {
			window.lucide.createIcons({ attrs: { "stroke-width": 1.8 } });
		}
	};

	const renderWithRecharts = (counts) => {
		const React = window.React;
		const ReactDOM = window.ReactDOM;
		const R = window.Recharts;
		if (!React || !ReactDOM || !R) {
			rootEl.innerHTML = `<div class="sales-empty">${__("Unable to load Recharts in browser. Check internet/CSP and try again.")}</div>`;
			return;
		}

		const totalPipeline = sections.reduce((sum, s) => sum + toInt(counts[s.key]), 0);
		const data = sections.map((s) => ({
			name: __(s.label),
			value: toInt(counts[s.key]),
			doctype: s.doctype,
			color: s.color,
		}));

		const e = React.createElement;
		const kpiNode = e(
			"div",
			{ className: "sales-kpi-grid" },
			data.map((item) =>
				e(
					"div",
					{
						key: item.name,
						className: "sales-kpi",
						style: { borderLeft: `4px solid ${item.color}` },
						onClick: () => frappe.set_route("List", item.doctype),
					},
					e("div", { className: "k-label" }, item.name),
					e("div", { className: "k-top" }, e("div"), e("i", { "data-lucide": "bar-chart-3" })),
					e("div", { className: "k-value" }, String(item.value)),
					e(
						"div",
						{ className: "k-meta" },
						e("span", null, `${__("Share")}: ${totalPipeline ? Math.round((item.value / totalPipeline) * 100) : 0}%`),
						e("span", null, `${__("Open List")} →`)
					)
				)
			)
		);

		const barChartNode = e(
			"div",
			{ className: "sales-re-card" },
			e("h6", null, e("i", { "data-lucide": "chart-column-big" }), __("Pipeline Volume")),
			e(
				"div",
				{ className: "sales-chart-box" },
				e(
					R.ResponsiveContainer,
					{ width: "100%", height: "100%" },
					e(
						R.BarChart,
						{ data, margin: { top: 8, right: 8, left: 0, bottom: 8 } },
						e(R.CartesianGrid, { strokeDasharray: "3 3", opacity: 0.25 }),
						e(R.XAxis, { dataKey: "name", tick: { fontSize: 12 } }),
						e(R.YAxis, { allowDecimals: false, tick: { fontSize: 12 } }),
						e(R.Tooltip, null),
						e(
							R.Bar,
							{ dataKey: "value", radius: [8, 8, 0, 0] },
							data.map((item) => e(R.Cell, { key: item.name, fill: item.color }))
						)
					)
				)
			)
		);

		const pieChartNode = e(
			"div",
			{ className: "sales-re-card" },
			e("h6", null, e("i", { "data-lucide": "pie-chart" }), __("Mix by Stage")),
			e(
				"div",
				{ className: "sales-chart-box" },
				e(
					R.ResponsiveContainer,
					{ width: "100%", height: "100%" },
					e(
						R.PieChart,
						null,
						e(
							R.Pie,
							{
								data,
								dataKey: "value",
								nameKey: "name",
								cx: "50%",
								cy: "48%",
								outerRadius: 95,
								innerRadius: 58,
								paddingAngle: 2,
							},
							data.map((item) => e(R.Cell, { key: item.name, fill: item.color }))
						),
						e(R.Tooltip, null),
						e(R.Legend, { verticalAlign: "bottom", height: 36 })
					)
				)
			)
		);

		const root = ReactDOM.createRoot(rootEl);
		root.render(e("div", null, e("div", { className: "sales-re-grid-2" }, barChartNode, pieChartNode), kpiNode));
		setTimeout(() => activateLucideIcons(), 0);
	};

	const renderWithFrappeCharts = (counts) => {
		const data = sections.map((s) => ({
			name: __(s.label),
			value: toInt(counts[s.key]),
			doctype: s.doctype,
			color: s.color,
		}));
		const totalPipeline = data.reduce((sum, d) => sum + d.value, 0);

		rootEl.innerHTML = `
			<div class="sales-empty">${__("Recharts CDN blocked. Showing fallback charts.")}</div>
			<div class="sales-re-grid-2">
			<div class="sales-re-card"><h6><i data-lucide="chart-column-big"></i>${__("Pipeline Volume")}</h6><div id="sales-fallback-bar" class="sales-chart-box"></div></div>
			<div class="sales-re-card"><h6><i data-lucide="pie-chart"></i>${__("Mix by Stage")}</h6><div id="sales-fallback-donut" class="sales-chart-box"></div></div>
			</div>
			<div class="sales-kpi-grid" id="sales-fallback-kpi"></div>
		`;

		const labels = data.map((d) => d.name);
		const values = data.map((d) => d.value);
		const colors = data.map((d) => d.color);
		const chartData = { labels, datasets: [{ name: __("Documents"), values }] };

		if (typeof frappe.Chart === "function") {
			new frappe.Chart(document.getElementById("sales-fallback-bar"), {
				title: "",
				data: chartData,
				type: "bar",
				height: 300,
				colors,
				barOptions: { spaceRatio: 0.45 },
				axisOptions: {
					xIsSeries: 0,
					shortenYAxisNumbers: 1,
					numberFormatter: frappe.utils.format_chart_axis_number,
				},
			});
			new frappe.Chart(document.getElementById("sales-fallback-donut"), {
				title: "",
				data: chartData,
				type: "donut",
				height: 300,
				colors,
				truncateLegends: 0,
			});
		}

		const kpiHtml = data
			.map((item) => {
				const share = totalPipeline ? Math.round((item.value / totalPipeline) * 100) : 0;
				return `
					<div class="sales-kpi" data-doctype="${frappe.utils.escape_html(item.doctype)}" style="border-left: 4px solid ${item.color};">
						<div class="k-label">${item.name}</div>
						<div class="k-top"><div></div><i data-lucide="bar-chart-3"></i></div>
						<div class="k-value">${item.value}</div>
						<div class="k-meta"><span>${__("Share")}: ${share}%</span><span>${__("Open List")} →</span></div>
					</div>
				`;
			})
			.join("");

		const kpiEl = rootEl.querySelector("#sales-fallback-kpi");
		kpiEl.innerHTML = kpiHtml;
		kpiEl.querySelectorAll(".sales-kpi").forEach((card) => {
			card.addEventListener("click", () => {
				frappe.set_route("List", card.dataset.doctype);
			});
		});
		activateLucideIcons();
	};

	const loadDashboard = async () => {
		rootEl.innerHTML = `<div class="sales-empty">${__("Loading dashboard...")}</div>`;
		try {
			const r = await frappe.call("sales_app.api.get_sales_dashboard_counts");
			const counts = r.message || {};
			try {
				await ensureRecharts();
				renderWithRecharts(counts);
			} catch (rechartsError) {
				console.warn("Recharts unavailable, switching to fallback charts.", rechartsError);
				renderWithFrappeCharts(counts);
			}
		} catch (error) {
			console.error(error);
			rootEl.innerHTML = `<div class="sales-empty">${__("Failed to load dashboard data. Please refresh and try again.")}</div>`;
		}
	};

	body.find("#sales-new-lead").on("click", () => frappe.new_doc("Sales Lead"));
	body.find("#sales-new-opportunity").on("click", () => frappe.new_doc("Sales Opportunity"));
	body.find("#sales-refresh").on("click", () => loadDashboard());

	page.set_primary_action(__("Refresh"), () => loadDashboard());
	loadDashboard();
};

