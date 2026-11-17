import { assertMonthlyPlanConfigured, PaystackError } from "./paystack.js";

export async function monthlySubscriptionOption() {
	try {
		await assertMonthlyPlanConfigured();
		return { available: true, message: null };
	} catch (error) {
		if (!(error instanceof PaystackError)) throw error;
		return { available: false, message: error.message };
	}
}
