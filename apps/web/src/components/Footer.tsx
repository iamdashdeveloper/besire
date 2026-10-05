import { Link } from "react-router-dom";

const Footer = () => {
	return (
		<footer className="border-t border-border px-6 py-10 md:px-12">
			<div className="mx-auto flex max-w-6xl flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<Link to="/" className="text-lg font-medium text-foreground">
						Besire
					</Link>
					<p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
						Tools and practical learning for navigating the modern world of work.
					</p>
				</div>
				<nav aria-label="Footer navigation" className="flex gap-6 text-sm text-muted-foreground">
					<Link to="/" className="transition-colors hover:text-foreground">Home</Link>
					<Link to="/learning" className="transition-colors hover:text-foreground">Learning</Link>
					<Link to="/pricing" className="transition-colors hover:text-foreground">Pricing</Link>
				</nav>
			</div>
		</footer>
	);
};

export default Footer;
