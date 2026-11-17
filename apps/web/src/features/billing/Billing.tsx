import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@clerk/react";
import { AlertCircle, Check, LoaderCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CheckoutButton } from "@/features/billing/CheckoutButton";
import { billingApi, formatBillingDate, type BillingStatus } from "@/lib/billing";

const defaultStatus: BillingStatus = {
	plan: "free",
	paymentMode: null,
	accessStartsAt: null,
	accessExpiresAt: null,
	isExpired: false,
	subscriptionStatus: null,
	nextPaymentAt: null,
	cancelAtPeriodEnd: false,
	subscriptionAvailable: false,
};

export default function Billing() {
	const { isLoaded, isSignedIn, getToken } = useAuth();
	const [status, setStatus] = useState<BillingStatus>(defaultStatus);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [cancelling, setCancelling] = useState(false);

	const loadStatus = useCallback(async () => {
		if (!isLoaded) return;
		if (!isSignedIn) {
			setLoading(false);
			return;
		}
		setLoading(true);
		try {
			const current = await billingApi<BillingStatus>("/billing/status", getToken);
			setStatus(current);
			setError("");
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Could not load billing status.");
		} finally {
			setLoading(false);
		}
	}, [getToken, isLoaded, isSignedIn]);

	useEffect(() => {
		const timer = window.setTimeout(() => void loadStatus(), 0);
		return () => window.clearTimeout(timer);
	}, [loadStatus]);

	const cancelSubscription = async () => {
		setCancelling(true);
		setError("");
		try {
			await billingApi("/billing/subscription/cancel", getToken, { method: "POST" });
			await loadStatus();
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Could not cancel automatic renewal.");
		} finally {
			setCancelling(false);
		}
	};

	return (
		<main className="mx-auto max-w-5xl px-6 py-14 sm:py-20">
			<header>
				<p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Besire account</p>
				<h1 className="mt-2 text-3xl font-medium tracking-tight sm:text-4xl">Billing and plan</h1>
				<p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Manage your Besire Pro access. Payments are verified by Besire’s server before access changes.</p>
			</header>

			{!isLoaded || loading ? (
				<div className="grid min-h-56 place-items-center"><LoaderCircle className="size-6 animate-spin text-muted-foreground" aria-label="Loading billing status" /></div>
			) : !isSignedIn ? (
				<section className="mt-8 rounded-lg border border-border bg-background p-6">
					<AlertCircle className="size-6 text-muted-foreground" />
					<h2 className="mt-4 text-lg font-medium">Sign in to manage your plan</h2>
					<p className="mt-2 text-sm text-muted-foreground">Your billing details are linked to your Besire account.</p>
					<Link to="/login" className="mt-5 inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Sign in</Link>
				</section>
			) : (
				<>
					{error && <p role="alert" className="mt-6 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">{error}</p>}
					<section className="mt-8 rounded-lg border border-border bg-background p-6 sm:p-8">
						<div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
							<div>
								<p className="text-sm text-muted-foreground">Current plan</p>
								<h2 className="mt-1 text-2xl font-medium capitalize">{status.plan}</h2>
							</div>
							{status.plan === "pro" && <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-medium"><Check className="size-3.5" /> Pro access active</span>}
						</div>
						{status.plan === "pro" ? (
							<div className="mt-6 grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
								<div>
									<p className="text-xs uppercase tracking-wide text-muted-foreground">Payment method</p>
									<p className="mt-1 text-sm">{status.paymentMode === "subscription" ? "Automatic monthly subscription" : "Manual one-time payment"}</p>
								</div>
								<div>
									<p className="text-xs uppercase tracking-wide text-muted-foreground">Access expires</p>
									<p className="mt-1 text-sm">{formatBillingDate(status.accessExpiresAt)}</p>
								</div>
								{status.paymentMode === "subscription" && (
									<>
										<div>
											<p className="text-xs uppercase tracking-wide text-muted-foreground">Subscription status</p>
											<p className="mt-1 text-sm capitalize">{status.subscriptionStatus?.replaceAll("_", " ") ?? "Active"}</p>
										</div>
										<div>
											<p className="text-xs uppercase tracking-wide text-muted-foreground">Next payment</p>
											<p className="mt-1 text-sm">{formatBillingDate(status.nextPaymentAt)}</p>
										</div>
									</>
								)}
							</div>
						) : (
							<p className="mt-3 text-sm text-muted-foreground">
								{status.isExpired
									? `Your Pro access expired ${formatBillingDate(status.accessExpiresAt)}. Choose a payment option to restore access.`
									: "You are on the free Besire plan. Upgrade to Pro for 30 days of access."}
							</p>
						)}
						<Button variant="outline" size="sm" className="mt-5" onClick={() => void loadStatus()} disabled={loading}>
							<RefreshCw className="size-4" /> Refresh status
						</Button>
						{status.paymentMode === "subscription" && status.plan === "pro" && !status.cancelAtPeriodEnd && (
							<div className="mt-5 border-t border-border pt-5">
								<p className="text-sm text-muted-foreground">Automatic renewal is enabled for this subscription. Cancelling prevents the next renewal; Pro access remains until the current paid period ends.</p>
								<Button variant="outline" className="mt-3" onClick={() => void cancelSubscription()} disabled={cancelling}>
									{cancelling && <LoaderCircle className="size-4 animate-spin" />}
									Cancel automatic renewal
								</Button>
							</div>
						)}
						{status.cancelAtPeriodEnd && <p className="mt-5 text-sm text-muted-foreground">Automatic renewal is cancelled. Pro access remains available until {formatBillingDate(status.accessExpiresAt)}.</p>}
					</section>

					<section className="mt-10">
						<h2 className="text-xl font-medium">{status.plan === "pro" ? "Renew or change payment method" : "Choose how to get Pro"}</h2>
						<div className="mt-4 grid gap-4 md:grid-cols-2">
							<article className="rounded-lg border border-border bg-background p-5 sm:p-6">
								<p className="text-sm font-medium">Subscribe monthly</p>
								<p className="mt-3 text-2xl font-medium">KSh 2,000<span className="ml-1 text-sm font-normal text-muted-foreground">/ month</span></p>
								<p className="mt-3 min-h-12 text-sm leading-relaxed text-muted-foreground">Paystack automatically renews the monthly subscription until you cancel it.</p>
								{!status.subscriptionAvailable && (
									<p className="mt-3 text-sm text-muted-foreground">Automatic renewal is currently unavailable for this configuration.</p>
								)}
								<div className="mt-5">
									<CheckoutButton mode="subscription" disabled={!status.subscriptionAvailable} />
								</div>
							</article>
							<article className="rounded-lg border border-border bg-background p-5 sm:p-6">
								<p className="text-sm font-medium">Pay monthly, manually</p>
								<p className="mt-3 text-2xl font-medium">KSh 2,000<span className="ml-1 text-sm font-normal text-muted-foreground">/ 30 days</span></p>
								<p className="mt-3 min-h-12 text-sm leading-relaxed text-muted-foreground">One payment grants 30 days of Pro access. It does not create a subscription or renew automatically.</p>
								<div className="mt-5"><CheckoutButton mode="manual" /></div>
							</article>
						</div>
					</section>
				</>
			)}
		</main>
	);
}
