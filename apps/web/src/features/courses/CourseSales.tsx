import { useEffect, useState } from "react";
import { ArrowDownUp, ChevronLeft, ChevronRight, CircleDollarSign, LoaderCircle, Search, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { courseApi } from "@/lib/courses";

type CourseSalesOverview = {
	purchaseCount: number;
	grossSubunits: number;
	refundSubunits: number;
	netSubunits: number;
	uniqueLearners: number;
	currency: "KES";
	byCourse: Array<{
		courseId: string;
		title: string;
		publishedPrice: number;
		purchaseCount: number;
		grossSubunits: number;
		refundSubunits: number;
		netSubunits: number;
		currency: string;
	}>;
};

type PurchaseRow = {
	id: string;
	learnerEmail: string;
	courseTitle: string;
	amountSubunits: number;
	refundedSubunits: number;
	currency: string;
	status: string;
	paystackReference: string;
	paidAt: string | null;
	createdAt: string;
};

type PurchaseDetail = PurchaseRow & {
	courseId: string;
	userId: string;
	updatedAt: string;
};

type SalesPage = {
	overview: CourseSalesOverview;
	purchases: PurchaseRow[];
	total: number;
	page: number;
	limit: number;
};

const money = (subunits: number, currency = "KES") =>
	`${currency} ${(subunits / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const dateLabel = (value: string | null) =>
	value ? new Date(value).toLocaleString() : "—";

export default function CourseSales() {
	const [data, setData] = useState<SalesPage | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [search, setSearch] = useState("");
	const [status, setStatus] = useState("");
	const [courseId, setCourseId] = useState("");
	const [sort, setSort] = useState("newest");
	const [page, setPage] = useState(1);
	const [selected, setSelected] = useState<PurchaseDetail | null>(null);
	const [detailLoading, setDetailLoading] = useState(false);

	useEffect(() => {
		let active = true;
		const params = new URLSearchParams({ page: String(page), limit: "25", sort });
		if (search.trim()) params.set("search", search.trim());
		if (status) params.set("status", status);
		if (courseId) params.set("courseId", courseId);
		const timer = window.setTimeout(() => {
			setLoading(true);
			courseApi<SalesPage>(`/admin/course-sales?${params.toString()}`, null)
				.then((result) => {
					if (active) {
						setData(result);
						setError("");
					}
				})
				.catch((cause: unknown) => {
					if (active) setError(cause instanceof Error ? cause.message : "Course sales could not be loaded.");
				})
				.finally(() => {
					if (active) setLoading(false);
				});
		}, 0);
		return () => {
			active = false;
			window.clearTimeout(timer);
		};
	}, [courseId, page, search, sort, status]);

	const inspect = async (purchase: PurchaseRow) => {
		if (selected?.id === purchase.id) {
			setSelected(null);
			return;
		}
		setDetailLoading(true);
		setError("");
		try {
			const detail = await courseApi<PurchaseDetail>(`/admin/course-sales/${purchase.id}`, null);
			setSelected(detail);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Transaction details could not be loaded.");
		} finally {
			setDetailLoading(false);
		}
	};

	const overview = data?.overview;
	return (
		<section className="mx-auto w-full max-w-6xl">
			<header>
				<p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Courses</p>
				<h1 className="mt-2 text-3xl font-medium tracking-tight sm:text-4xl">Course sales</h1>
				<p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
					Verified Paystack course purchases. Gross and net values are transaction totals, not confirmed settlement amounts.
				</p>
			</header>

			{error && <p role="alert" className="mt-6 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">{error}</p>}

			<div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				{[
					{ label: "Successful purchases", value: loading ? "—" : overview?.purchaseCount ?? 0, icon: CircleDollarSign },
					{ label: "Gross sales", value: loading ? "—" : money(overview?.grossSubunits ?? 0), icon: ArrowDownUp },
					{ label: "Refunds", value: loading ? "—" : money(overview?.refundSubunits ?? 0), icon: CircleDollarSign },
					{ label: "Unique purchasing learners", value: loading ? "—" : overview?.uniqueLearners ?? 0, icon: UsersRound },
				].map(({ label, value, icon: Icon }) => (
					<article key={label} className="rounded-lg border border-border bg-background p-5">
						<p className="flex items-center justify-between gap-3 text-sm text-muted-foreground">{label}<Icon className="size-4" /></p>
						<p className="mt-4 text-2xl font-medium tabular-nums">{value}</p>
					</article>
				))}
			</div>
			<div className="mt-4 rounded-lg border border-border bg-background p-5">
				<p className="text-sm text-muted-foreground">Net sales after recorded refunds</p>
				<p className="mt-2 text-xl font-medium tabular-nums">{loading ? "—" : money(overview?.netSubunits ?? 0)}</p>
				<p className="mt-2 text-xs text-muted-foreground">Payment-provider fees, settlement timing, and funds available in Paystack or M-PESA are not represented here.</p>
			</div>

			<section aria-labelledby="course-sales-by-course" className="mt-10">
				<h2 id="course-sales-by-course" className="text-xl font-medium">Sales by course</h2>
				<div className="mt-4 overflow-x-auto rounded-lg border border-border bg-background">
					<table className="w-full min-w-[700px] text-left text-sm">
						<thead className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
							<tr>
								<th className="px-4 py-3 font-medium">Course</th><th className="px-4 py-3 font-medium">Published price</th>
								<th className="px-4 py-3 font-medium">Purchases</th><th className="px-4 py-3 font-medium">Gross</th>
								<th className="px-4 py-3 font-medium">Refunds</th><th className="px-4 py-3 font-medium">Net</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{overview?.byCourse.map((course) => (
								<tr key={course.courseId}>
									<td className="px-4 py-3 font-medium">{course.title || "Untitled course"}</td>
									<td className="px-4 py-3">{course.publishedPrice ? `KSh ${course.publishedPrice.toLocaleString()}` : "Free"}</td>
									<td className="px-4 py-3 tabular-nums">{course.purchaseCount}</td>
									<td className="px-4 py-3 tabular-nums">{money(course.grossSubunits)}</td>
									<td className="px-4 py-3 tabular-nums">{money(course.refundSubunits)}</td>
									<td className="px-4 py-3 tabular-nums">{money(course.netSubunits)}</td>
								</tr>
							))}
							{!loading && overview?.byCourse.length === 0 && (
								<tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No courses found.</td></tr>
							)}
						</tbody>
					</table>
				</div>
			</section>

			<section aria-labelledby="course-purchases" className="mt-10">
				<div className="flex flex-wrap items-end justify-between gap-4">
					<div>
						<h2 id="course-purchases" className="text-xl font-medium">Purchases</h2>
						<p className="mt-1 text-sm text-muted-foreground">Search and inspect course payment transactions.</p>
					</div>
				</div>
				<div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
					<label className="relative block">
						<Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
						<Input className="pl-9" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search learner, course, reference" aria-label="Search course purchases" />
					</label>
					<select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={courseId} onChange={(event) => { setCourseId(event.target.value); setPage(1); }} aria-label="Filter by course">
						<option value="">All courses</option>
						{overview?.byCourse.map((course) => <option key={course.courseId} value={course.courseId}>{course.title}</option>)}
					</select>
					<select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} aria-label="Filter by payment status">
						<option value="">All payment statuses</option>
						{["pending", "success", "failed", "cancelled", "partially_refunded", "refunded", "reversed"].map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}
					</select>
					<select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }} aria-label="Sort purchases">
						<option value="newest">Newest first</option><option value="oldest">Oldest first</option>
						<option value="highest">Highest amount</option><option value="lowest">Lowest amount</option>
					</select>
				</div>

				{selected && (
					<article className="mt-4 rounded-lg border border-border bg-muted/20 p-5">
						<div className="flex flex-wrap items-start justify-between gap-4">
							<div>
								<p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Transaction details</p>
								<h3 className="mt-2 font-medium">{selected.courseTitle}</h3>
							</div>
							<Button size="sm" variant="outline" onClick={() => setSelected(null)}>Close details</Button>
						</div>
						<dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
							<div><dt className="text-muted-foreground">Learner</dt><dd className="mt-1 break-all">{selected.learnerEmail}</dd></div>
							<div><dt className="text-muted-foreground">User ID</dt><dd className="mt-1 break-all">{selected.userId}</dd></div>
							<div><dt className="text-muted-foreground">Paystack reference</dt><dd className="mt-1 break-all font-mono text-xs">{selected.paystackReference}</dd></div>
							<div><dt className="text-muted-foreground">Payment</dt><dd className="mt-1">{money(selected.amountSubunits, selected.currency)} · {selected.status.replaceAll("_", " ")}</dd></div>
							<div><dt className="text-muted-foreground">Refunded</dt><dd className="mt-1">{money(selected.refundedSubunits, selected.currency)}</dd></div>
							<div><dt className="text-muted-foreground">Recorded</dt><dd className="mt-1">{dateLabel(selected.paidAt ?? selected.createdAt)}</dd></div>
						</dl>
					</article>
				)}

				<div className="mt-4 overflow-x-auto rounded-lg border border-border bg-background">
					<table className="w-full min-w-[850px] text-left text-sm">
						<thead className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
							<tr>
								<th className="px-4 py-3 font-medium">Learner</th><th className="px-4 py-3 font-medium">Course</th>
								<th className="px-4 py-3 font-medium">Amount</th><th className="px-4 py-3 font-medium">Date</th>
								<th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Reference</th>
								<th className="px-4 py-3 font-medium"><span className="sr-only">Inspect</span></th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{data?.purchases.map((purchase) => (
								<tr key={purchase.id}>
									<td className="px-4 py-3">{purchase.learnerEmail}</td><td className="px-4 py-3">{purchase.courseTitle}</td>
									<td className="px-4 py-3 tabular-nums">{money(purchase.amountSubunits, purchase.currency)}</td>
									<td className="px-4 py-3 whitespace-nowrap">{dateLabel(purchase.paidAt ?? purchase.createdAt)}</td>
									<td className="px-4 py-3 capitalize">{purchase.status.replaceAll("_", " ")}</td>
									<td className="max-w-48 truncate px-4 py-3 font-mono text-xs" title={purchase.paystackReference}>{purchase.paystackReference}</td>
									<td className="px-4 py-3">
										<Button size="sm" variant="outline" onClick={() => void inspect(purchase)} disabled={detailLoading}>
											{detailLoading ? <LoaderCircle className="size-4 animate-spin" /> : "Inspect"}
										</Button>
									</td>
								</tr>
							))}
							{loading && <tr><td colSpan={7} className="px-4 py-10 text-center"><LoaderCircle className="mx-auto size-5 animate-spin text-muted-foreground" /></td></tr>}
							{!loading && !data?.purchases.length && <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No purchases match these filters.</td></tr>}
						</tbody>
					</table>
				</div>
				<div className="mt-4 flex items-center justify-between gap-3 text-sm text-muted-foreground">
					<span>{data ? `${data.total.toLocaleString()} transactions · page ${data.page}` : "Loading transactions"}</span>
					<div className="flex gap-2">
						<Button size="sm" variant="outline" disabled={loading || page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft className="size-4" /> Previous</Button>
						<Button size="sm" variant="outline" disabled={loading || !data || page * data.limit >= data.total} onClick={() => setPage((value) => value + 1)}>Next <ChevronRight className="size-4" /></Button>
					</div>
				</div>
			</section>
		</section>
	);
}
