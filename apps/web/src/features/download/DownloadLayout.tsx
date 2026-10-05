import { Outlet } from "react-router-dom";

const DownloadLayout = () => {
	return (
		<div className="min-h-screen bg-background text-foreground">
			<Outlet />
		</div>
	);
};

export default DownloadLayout;