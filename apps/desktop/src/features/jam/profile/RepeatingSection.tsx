import { Button } from "../../../components/ui/button";

interface RepeatingSectionProps {
	title: string;
	description: string;
	children: React.ReactNode;
	onAdd: () => void;
	addLabel: string;
}

export function RepeatingSection({
	title,
	description,
	children,
	onAdd,
	addLabel,
}: RepeatingSectionProps) {
	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<h3 className="text-sm font-medium">{title}</h3>
					<p className="text-xs text-muted-foreground">{description}</p>
				</div>
				<Button type="button" variant="outline" size="sm" onClick={onAdd}>
					{addLabel}
				</Button>
			</div>
			{children}
		</div>
	);
}