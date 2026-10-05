import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "@/components/Navbar";
import LandingLayout from "@/features/landing/LandingLayout";
import Home from "@/features/landing/Home";
import ProductsHome from "@/features/landing/ProductsHome";
import Pricing from "@/features/landing/Pricing";
import Learning from "@/features/landing/Learning";
import AuthLayout from "@/features/authentication/AuthLayout";
import Login from "@/features/authentication/Login";
import Register from "@/features/authentication/Register";
import BillingLayout from "@/features/billing/BillingLayout";
import Billing from "@/features/billing/Billing";
import DownloadLayout from "@/features/download/DownloadLayout";
import Download from "@/features/download/Download";
import AccountLayout from "@/features/account/AccountLayout";
import Account from "@/features/account/Account";

function App() {
	return (
		<BrowserRouter>
			<Navbar />
			<Routes>
				<Route element={<LandingLayout />}>
					<Route index element={<Home />} />
					<Route path="products" element={<ProductsHome />} />
					<Route path="pricing" element={<Pricing />} />
					<Route path="learning" element={<Learning />} />
				</Route>

				<Route element={<AuthLayout />}>
					<Route path="login" element={<Login />} />
					<Route path="signup" element={<Register />} />
				</Route>

				<Route element={<BillingLayout />}>
					<Route path="billing" element={<Billing />} />
				</Route>

				<Route element={<DownloadLayout />}>
					<Route path="download" element={<Download />} />
				</Route>

				<Route element={<AccountLayout />}>
					<Route path="account" element={<Account />} />
				</Route>
			</Routes>
		</BrowserRouter>
	);
}

export default App;