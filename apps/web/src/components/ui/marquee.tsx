import { cn } from "@/lib/utils";

interface MarqueeProps extends React.HTMLAttributes<HTMLDivElement> {
	repeat?: number;
	reverse?: boolean;
	vertical?: boolean;
}

function Marquee({
	className,
	repeat = 4,
	reverse = false,
	vertical = false,
	children,
	...props
}: MarqueeProps) {
	return (
		<div
			className={cn(
				"overflow-hidden",
				vertical && "[direction:ltr]",
				!vertical && "[direction:rtl]",
				"[--duration:60s]",
				"[--gap:1.5rem]",
				className,
			)}
			{...props}
		>
			<div
				className={cn(
					"flex gap-6",
					vertical && "flex-col",
					reverse && "flex-row-reverse",
				)}
			>
				{Array.from({ length: repeat }).map((_, i) => (
					<div
						key={i}
						className={cn(
							"flex shrink-0 items-center justify-center gap-6 [direction:ltr]",
							vertical
								? "animate-marquee-vertical"
								: "animate-marquee",
						)}
					>
						{children}
					</div>
				))}
			</div>
		</div>
	);
}

export { Marquee };
