import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@clerk/react";
import { AlertCircle, CheckCircle2, LoaderCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { billingApi, formatBillingDate } from "@/lib/billing";

interface CheckoutResult {
	paymentStatus: "success" | "pending" | "failed" | "reversed";
	plan: "free" | "pro";
	paymentMode: "manual" | "subscription" | null;
	accessStartsAt: string | null;
	accessExpiresAt: string | null;
	isExpired: boolean;
	subscriptionStatus: string | null;
}

export default function BillingReturn() {
	const [searchParams] = useSearchParams();
	const reference = searchParams.get("reference") ?? searchParams.get("trxref");
	const { isLoaded, isSignedIn, getToken } = useAuth();
	const [result, setResult] = useState<CheckoutResult | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [attempt, setAttempt] = useState(0);

	const checkPayment = useCallback(async () => {
		if (!reference) {
			setError("The payment return URL did not include a transaction reference.");
			setLoading(false);
			return;
		}
		if (!isLoaded) return;
		if (!isSignedIn) {
			setError("Sign in to check the payment associated with your Besire account.");
			setLoading(false);
			return;
		}
		setLoading(true);
		setError("");
		try {
			const verified = await billingApi<CheckoutResult>(
				`/billing/checkout/status?reference=${encodeURIComponent(reference)}`,
				getToken,
			);
			setResult(verified);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Could not verify this payment.");
		} finally {
			setLoading(false);
		}
	}, [getToken, isLoaded, isSignedIn, reference]);

	useEffect(() => {
		const timer = window.setTimeout(() => void checkPayment(), 0);
		return () => window.clearTimeout(timer);
	}, [checkPayment, attempt]);

	const pending = result?.paymentStatus === "pending";
	return (
		<main className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-6 py-16">
			<section className="w-full rounded-lg border border-border bg-background p-6 sm:p-9" aria-live="polite">
				<p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Payment status</p>
				{loading ? (
					<div className="py-10 text-center">
						<LoaderCircle className="mx-auto size-7 animate-spin text-muted-foreground" />
						<h1 className="mt-4 text-2xl font-medium">Verifying with Paystack</h1>
						<p className="mt-2 text-sm text-muted-foreground">Besire checks the transaction with Paystack before updating your access.</p>
					</div>
				) : error ? (
					<div className="py-8">
						<AlertCircle className="size-7 text-destructive" />
						<h1 className="mt-4 text-2xl font-medium">We could not confirm this payment</h1>
						<p role="alert" className="mt-2 text-sm text-destructive">{error}</p>
						<p className="mt-3 text-sm text-muted-foreground">A return from Paystack alone does not activate Pro. You can check again or contact support if you were charged.</p>
					</div>
				) : result?.paymentStatus === "success" && result.plan === "pro" ? (
					<div className="py-8">
						<CheckCircle2 className="size-8 text-primary" />
						<h1 className="mt-4 text-2xl font-medium">Besire Pro is active</h1>
						<p className="mt-2 text-sm text-muted-foreground">
							{result.paymentMode === "subscription" ? "Your monthly subscription payment is verified." : "Your one-time payment is verified; it will not renew automatically."}
						</p>
						<p className="mt-4 text-sm">Access expires {formatBillingDate(result.accessExpiresAt)}.</p>
					</div>
				) : pending ? (
					<div className="py-8">
						<RefreshCw className="size-7 text-muted-foreground" />
						<h1 className="mt-4 text-2xl font-medium">Payment is still pending</h1>
						<p className="mt-2 text-sm text-muted-foreground">Your Pro access will update after Paystack confirms the transaction.</p>
					</div>
				) : result?.paymentStatus === "success" && result.isExpired ? (
					<div className="py-8">
						<AlertCircle className="size-7 text-muted-foreground" />
						<h1 className="mt-4 text-2xl font-medium">This Pro access period has expired</h1>
						<p className="mt-2 text-sm text-muted-foreground">The transaction was verified, but its access period has ended. Start a new payment to restore Pro.</p>
					</div>
				) : (
					<div className="py-8">
						<AlertCircle className="size-7 text-muted-foreground" />
						<h1 className="mt-4 text-2xl font-medium">{result?.paymentStatus === "reversed" ? "Payment was reversed" : "Payment was not completed"}</h1>
						<p className="mt-2 text-sm text-muted-foreground">No Pro access was granted for this transaction.</p>
					</div>
				)}
				<div className="flex flex-wrap gap-3">
					{(pending || error) && (
						<Button variant="outline" onClick={() => setAttempt((value) => value + 1)}>
							<RefreshCw className="size-4" /> Check again
						</Button>
					)}
					<Link to="/billing" className="inline-flex min-h-10 items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted">Go to billing</Link>
				</div>
			</section>
		</main>
	);
}
