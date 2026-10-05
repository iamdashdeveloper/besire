import { useLocation } from "react-router-dom";
import { Link, NavLink } from "react-router-dom";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/react";

const Navbar = () => {
	const location = useLocation();
	const isAuthPage =
		location.pathname.startsWith("/login") ||
		location.pathname.startsWith("/signup");

	if (isAuthPage) {
		return null;
	}

	return (
		<header className='fixed inset-x-0 top-0 z-50 flex h-16 w-full items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-md md:px-12'>
			<Link to="/" className='flex items-center gap-2' aria-label="Besire home">
				<span className='text-lg font-medium text-foreground'>Besire</span>
			</Link>
			<nav aria-label="Main navigation" className='flex items-center gap-4 text-sm text-muted-foreground md:gap-8'>
				<NavLink
					to="/"
					end
					className={({ isActive }) => `transition-colors hover:text-foreground ${isActive ? "text-foreground" : ""}`}
				>
					Home
				</NavLink>
				<NavLink
					to="/learning"
					className={({ isActive }) => `transition-colors hover:text-foreground ${isActive ? "text-foreground" : ""}`}
				>
					Learning
				</NavLink>
				<NavLink
					to="/pricing"
					className={({ isActive }) => `transition-colors hover:text-foreground ${isActive ? "text-foreground" : ""}`}
				>
					Pricing
				</NavLink>
			</nav>
			<div className='flex items-center gap-3'>
				<Show when='signed-out'>
					<SignInButton mode="modal">
						<button className='hidden rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 sm:inline-flex'>
							Sign In
						</button>
					</SignInButton>
					<SignUpButton mode="modal">
						<button className='rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 sm:px-4'>
							Sign Up
						</button>
					</SignUpButton>
				</Show>
				<Show when='signed-in'>
					<UserButton />
				</Show>
			</div>
		</header>
	);
};

export default Navbar;
