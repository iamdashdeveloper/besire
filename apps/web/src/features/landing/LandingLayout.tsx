import { Outlet } from "react-router-dom";
import Footer from "@/components/Footer";

const LandingLayout = () => {
	return (
		<div className="min-h-screen bg-background text-foreground">
			<Outlet />
			<Footer />
		</div>
	);
};

export default LandingLayout;