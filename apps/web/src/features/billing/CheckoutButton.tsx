import { useState } from "react";
import { useAuth } from "@clerk/react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { billingApi } from "@/lib/billing";

export type CheckoutMode = "manual" | "subscription";

export function CheckoutButton({
	mode,
	disabled = false,
	className,
}: {
	mode: CheckoutMode;
	disabled?: boolean;
	className?: string;
}) {
	const { isLoaded, isSignedIn, getToken } = useAuth();
	const navigate = useNavigate();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const startCheckout = async () => {
		setError("");
		if (!isLoaded) return;
		if (!isSignedIn) {
			navigate("/login");
			return;
		}
		setLoading(true);
		try {
			const session = await billingApi<{ checkoutUrl: string }>(
				"/billing/checkout",
				getToken,
				{
					method: "POST",
					headers: { "Idempotency-Key": crypto.randomUUID() },
					body: JSON.stringify({ mode }),
				},
			);
			window.location.assign(session.checkoutUrl);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Could not start checkout.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="space-y-2">
			<Button
				type="button"
				onClick={() => void startCheckout()}
				disabled={disabled || loading || !isLoaded}
				className={className}
			>
				{loading ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
				{loading ? "Connecting to Paystack..." : mode === "subscription" ? "Subscribe monthly" : "Pay for 30 days"}
			</Button>
			{error && <p role="alert" className="text-sm text-destructive">{error}</p>}
		</div>
	);
}
