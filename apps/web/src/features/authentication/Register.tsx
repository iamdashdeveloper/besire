import { useAuth } from "@clerk/react";
import { SignUpButton } from "@clerk/react";

const Register = () => {
	const { isLoaded, isSignedIn } = useAuth();

	if (isLoaded && isSignedIn) {
		return null;
	}

	return (
		<div className='min-h-screen flex items-center justify-center bg-muted p-6'>
			<div className='w-full max-w-md space-y-6'>
				<h2 className='font-cormorant text-2xl font-medium text-foreground text-center'>
					Sign Up
				</h2>
				<SignUpButton mode="modal"
					appearance={{
						elements: {
							primaryButton: 'w-full rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
						}
					}}
				>
					Sign up with Clerk
				</SignUpButton>
			</div>
		</div>
	);
};

export default Register;