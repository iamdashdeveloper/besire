import { Outlet } from "react-router-dom";

const AccountLayout = () => {
	return (
		<div className="min-h-screen bg-background text-foreground">
			<Outlet />
		</div>
	);
};

export default AccountLayout;