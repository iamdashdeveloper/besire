import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { SignInButton, UserButton, useAuth, useUser } from "@clerk/react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ArrowLeft, ArrowUpRight, BookOpen, BriefcaseBusiness, ChevronRight, CircleHelp, CreditCard, FileText, FileUser, FolderKanban, GraduationCap, LayoutDashboard, LockKeyhole, LogOut, Plus, RefreshCw, Search, Settings, Sparkles, Trash2, UserRound, type LucideIcon } from "lucide-react";
import { Link, NavLink, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import type { ChangeEvent, ReactNode } from "react";
import type { Profile, ProfileDocument } from "../backend/db/models/profile";
import { Button } from "./components/ui/button";
import { ProfileStepper } from "./features/jam/profile/ProfileStepper";
import { importProfileFromResume, ProfileImportError } from "./features/jam/profile/resume";
import { apiRequest, getWebAppUrl } from "./services/api";
import { deleteLocalProfile, deleteProfileDocument, getLocalProfile, getProfileDocumentUrl, listLocalProfiles, saveLocalProfile, uploadProfileDocument } from "./services/localProfiles";
import "./App.css";

type Entitlements = {
	plan: "free" | "pro";
	features: Record<string, boolean>;
	courses: { courseIds: string[] };
	billing: {
		paymentMode: "manual" | "subscription" | null;
		accessExpiresAt: string | null;
		subscriptionStatus: string | null;
	};
};

type EntitlementsContextValue = {
	value: Entitlements | null;
	error: string | null;
	refresh: () => Promise<void>;
};

const EntitlementsContext = createContext<EntitlementsContextValue | null>(null);
const featurePages = [
	{ path: "jam/jobs", title: "Find opportunities", description: "A workspace for discovering and organizing roles in the online job market.", feature: "jam.job_search", icon: Search },
	{ path: "jam/saved-jobs", title: "Saved opportunities", description: "Keep the roles you want to revisit organized.", feature: "jam.saved_jobs", icon: BriefcaseBusiness },
	{ path: "jam/job-details", title: "Opportunity details", description: "Review and understand the details of a job opportunity.", feature: "jam.job_details", icon: Search },
	{ path: "jam/applications", title: "Applications", description: "Keep applications, deadlines, progress, and next steps together.", feature: "jam.application_tracking", icon: FolderKanban },
	{ path: "jam/cv", title: "CV library", description: "Keep your professional documents organized for your search.", feature: "jam.cv_library", icon: FileUser },
	{ path: "jam/cv-match", title: "Basic CV match", description: "Compare your CV with a role's requirements.", feature: "jam.basic_cv_match", icon: FileUser },
	{ path: "ian", title: "IAN", description: "Besire's intelligent assistance layer for understanding opportunities and preparing your applications.", feature: "ian.companion", icon: Sparkles },
	{ path: "cv/ai", title: "AI CV tools", description: "AI-assisted CV matching and tailoring.", feature: "cv.ai_match", icon: FileUser },
	{ path: "applications/ai", title: "Application assistance", description: "AI assistance for cover letters and application answers.", feature: "applications.ai_cover_letters", icon: BriefcaseBusiness },
	{ path: "interview/prep", title: "Interview preparation", description: "Prepare for interviews with IAN.", feature: "interview.ai_prep", icon: CircleHelp },
	{ path: "tracking/email", title: "Email assistance", description: "Assistance with messages and follow-ups related to your search.", feature: "tracking.email_assistance", icon: BriefcaseBusiness },
	{ path: "research/ai", title: "Opportunity research", description: "Research assistance for evaluating opportunities.", feature: "research.ai_mode", icon: Search },
	{ path: "analytics", title: "Advanced analytics", description: "Additional insight into your job-search activity.", feature: "analytics.advanced", icon: LayoutDashboard },
];

function useEntitlements() {
	const context = useContext(EntitlementsContext);
	if (!context) throw new Error("Entitlements context is unavailable.");
	return context;
}

function AuthenticatedApp() {
	const { isLoaded, isSignedIn, getToken } = useAuth();
	const { user } = useUser();
	const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
	const [entitlementError, setEntitlementError] = useState<string | null>(null);
	const [entitlementOwnerId, setEntitlementOwnerId] = useState<string | null>(null);
	const [entitlementErrorOwnerId, setEntitlementErrorOwnerId] = useState<string | null>(null);
	const [loadingEntitlements, setLoadingEntitlements] = useState(false);

	const refreshEntitlements = useCallback(async () => {
		if (!isSignedIn || !user?.id) {
			setEntitlements(null);
			setEntitlementError(null);
			setEntitlementOwnerId(null);
			setEntitlementErrorOwnerId(null);
			return;
		}
		setLoadingEntitlements(true);
		setEntitlementOwnerId(null);
		setEntitlementError(null);
		try {
			const token = await getToken();
			if (!token) throw new Error("Your sign-in session could not be verified. Please sign in again.");
			const result = await apiRequest<Entitlements>("/api/me/entitlements", token);
			setEntitlements(result);
			setEntitlementOwnerId(user.id);
			setEntitlementErrorOwnerId(null);
		} catch (error) {
			setEntitlementError(error instanceof Error ? error.message : "Could not load account access.");
			setEntitlementErrorOwnerId(user.id);
		} finally {
			setLoadingEntitlements(false);
		}
	}, [getToken, isSignedIn, user?.id]);

	useEffect(() => {
		void refreshEntitlements();
	}, [refreshEntitlements]);

	const entitlementContext = useMemo<EntitlementsContextValue>(() => ({
		value: entitlementOwnerId === user?.id ? entitlements : null,
		error: entitlementErrorOwnerId === user?.id ? entitlementError : null,
		refresh: refreshEntitlements,
	}), [entitlements, entitlementError, entitlementErrorOwnerId, entitlementOwnerId, refreshEntitlements, user?.id]);

	if (!isLoaded) return <CenteredMessage title="Loading Besire" detail="Checking your sign-in session…" />;
	if (!isSignedIn) return <SignedOutLanding />;

	return (
		<EntitlementsContext.Provider value={entitlementContext}>
			<div className="desktop-app" key={user?.id}>
				<aside className="desktop-sidebar">
					<Link className="brand-mark" to="/dashboard" aria-label="Besire dashboard">
						<span className="brand-symbol">B</span>
						<span><strong>besire</strong><small>work, made navigable</small></span>
					</Link>
					<nav className="primary-nav" aria-label="Main navigation">
						<NavItem to="/dashboard" label="Dashboard" icon={LayoutDashboard} />
						<div className="nav-section-label">JOB SEARCH</div>
						<NavItem to="/profile" label="Career profiles" icon={UserRound} />
						<NavItem to="/jam/jobs" label="Find opportunities" icon={Search} />
						<NavItem to="/jam/saved-jobs" label="Saved opportunities" icon={BriefcaseBusiness} />
						<NavItem to="/jam/applications" label="Applications" icon={FolderKanban} />
						<NavItem to="/jam/cv" label="CV library" icon={FileUser} />
						<NavItem to="/jam/cv-match" label="Basic CV match" icon={Search} />
						<div className="nav-section-label">LEARNING</div>
						<NavItem to="/courses" label="My courses" icon={GraduationCap} />
						<NavItem to="/learning" label="Course catalogue" icon={BookOpen} />
						<div className="nav-section-label">BESIRE PRO</div>
						<NavItem to="/ian" label="IAN" icon={Sparkles} />
						<NavItem to="/applications/ai" label="Application assistance" icon={BriefcaseBusiness} />
						<NavItem to="/interview/prep" label="Interview preparation" icon={CircleHelp} />
						<NavItem to="/billing" label="Plan & billing" icon={CreditCard} />
					</nav>
					<div className="sidebar-bottom">
						<NavItem to="/settings" label="Settings" icon={Settings} />
						<div className="account-mini">
							<UserButton />
							<span className="account-mini-name">{user?.fullName || user?.primaryEmailAddress?.emailAddress || "Your account"}</span>
						</div>
					</div>
				</aside>
				<div className="desktop-main">
					<header className="desktop-topbar">
						<div className="breadcrumbs">Besire <ChevronRight size={14} /> <span>Workspace</span></div>
						<div className="topbar-actions">
							<span className={`plan-indicator ${entitlements?.plan === "pro" ? "is-pro" : ""}`}>
								{loadingEntitlements ? "Checking plan…" : entitlements?.plan === "pro" ? "PRO" : "FREE"}
							</span>
							<UserButton />
						</div>
					</header>
					<main className="page-content">
						<Routes>
							<Route index element={<Navigate to="/dashboard" replace />} />
							<Route path="/dashboard" element={<DashboardPage />} />
							<Route path="/profile" element={<ProfileLandingPage />} />
							<Route path="/profile/create" element={<CreateProfilePage />} />
							<Route path="/profile/:profileId/edit" element={<CreateProfilePage />} />
							<Route path="/profile/:profileId" element={<ProfileDetailsPage />} />
							<Route path="/courses" element={<MyCoursesPage />} />
							<Route path="/courses/:courseId" element={<CoursePage />} />
							<Route path="/learning" element={<LearningCataloguePage />} />
							<Route path="/billing" element={<BillingPage />} />
							<Route path="/settings" element={<SettingsPage />} />
							{featurePages.map((feature) => (
								<Route
									key={feature.path}
									path={`/${feature.path}`}
									element={<FeatureGate feature={feature.feature}><FeaturePlaceholder title={feature.title} description={feature.description} /></FeatureGate>}
								/>
							))}
							<Route path="*" element={<Navigate to="/dashboard" replace />} />
						</Routes>
					</main>
				</div>
			</div>
		</EntitlementsContext.Provider>
	);
}

function NavItem({ to, label, icon: Icon }: { to: string; label: string; icon: LucideIcon }) {
	return (
		<NavLink to={to} className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
			<Icon size={17} strokeWidth={1.8} />
			<span>{label}</span>
		</NavLink>
	);
}

function SignedOutLanding() {
	return (
		<main className="auth-screen">
			<section className="auth-card">
				<Link className="brand-mark auth-brand" to="/"><span className="brand-symbol">B</span><strong>besire</strong></Link>
				<p className="eyebrow">YOUR MODERN WORKSPACE</p>
				<h1>Navigate the world of work.</h1>
				<p className="muted-copy">Sign in to organize your job search, access your courses, and continue with Besire.</p>
				<SignInButton mode="modal">
					<Button className="wide-button">Sign in to Besire</Button>
				</SignInButton>
				<p className="fine-print">Your account and access are verified securely with Clerk.</p>
			</section>
		</main>
	);
}

function DashboardPage() {
	const { user } = useUser();
	const { value, error, refresh } = useEntitlements();
	const firstName = user?.firstName || "there";
	return (
		<section className="content-stack">
			<div className="welcome-panel">
				<p className="eyebrow">YOUR BESIRE WORKSPACE</p>
				<h1>Welcome back, {firstName}.</h1>
				<p className="muted-copy">A clear place to organize your next move in the modern world of work.</p>
			</div>
			{error && <InlineError message={error} action="Retry" onAction={() => void refresh()} />}
			<div className="dashboard-grid">
				<DashboardCard icon={BriefcaseBusiness} title="Job search" description="Keep your search and application next steps together." action="Explore workspace" to="/jam/jobs" />
				<DashboardCard icon={GraduationCap} title="Learning" description="Explore practical courses for online work and career growth." action="Browse courses" to="/learning" />
				<DashboardCard icon={Sparkles} title="IAN" description="Intelligent assistance within the Besire platform." action={value?.plan === "pro" ? "Open IAN" : "Explore Pro"} to={value?.plan === "pro" ? "/ian" : "/billing"} />
			</div>
			<section className="panel">
				<div className="panel-heading"><div><p className="eyebrow">GET STARTED</p><h2>Make this workspace yours</h2></div></div>
				<div className="next-step-row">
					<div className="step-icon"><UserRound size={19} /></div>
					<div className="step-copy"><strong>Create your career profile</strong><span>Add the experience and preferences that matter to your search.</span></div>
					<Link className="text-link" to="/profile">Explore profiles <ArrowUpRight size={15} /></Link>
				</div>
			</section>
			<section className="plan-summary">
				<div><p className="eyebrow">YOUR PLAN</p><h2>{value?.plan === "pro" ? "Besire Pro" : "Besire Free"}</h2><p>{value?.plan === "pro" && value.billing.accessExpiresAt ? `Access through ${new Date(value.billing.accessExpiresAt).toLocaleDateString()}` : "Your workspace for organizing the job search."}</p></div>
				<Link className="text-link" to="/billing">{value?.plan === "pro" ? "Manage plan" : "View Pro"} <ArrowUpRight size={15} /></Link>
			</section>
		</section>
	);
}

function DashboardCard({ icon: Icon, title, description, action, to }: { icon: LucideIcon; title: string; description: string; action: string; to: string }) {
	return <article className="dashboard-card"><div className="card-icon"><Icon size={20} /></div><h2>{title}</h2><p>{description}</p><Link className="text-link" to={to}>{action} <ArrowUpRight size={15} /></Link></article>;
}

function ProfileLandingPage() {
	const navigate = useNavigate();
	const [profiles, setProfiles] = useState<Profile[]>([]);
	const [loading, setLoading] = useState(true);
	const [importing, setImporting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const loadProfiles = useCallback(async () => {
		setLoading(true);
		try {
			setProfiles(await listLocalProfiles());
			setError(null);
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : "Could not load local profiles.");
		} finally {
			setLoading(false);
		}
	}, []);
	useEffect(() => { void loadProfiles(); }, [loadProfiles]);

	async function importResume() {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = ".docx,.pdf";
		input.onchange = async () => {
			const file = input.files?.[0];
			if (!file) return;
			setImporting(true);
			setError(null);
			try {
				const imported = await importProfileFromResume(file);
				const profile = await saveLocalProfile({
					...imported,
					name: imported.personal.fullName || file.name.replace(/\.[^.]+$/, ""),
					documents: [],
				});
				const result = await uploadProfileDocument(profile._id!, "resume", file);
				navigate(`/profile/${result.profile._id}/edit`);
			} catch (caught) {
				setError(caught instanceof ProfileImportError ? caught.message : caught instanceof Error ? caught.message : "Could not import the resume.");
			} finally {
				setImporting(false);
			}
		};
		input.click();
	}
	async function removeProfile(profile: Profile) {
		if (!profile._id || !window.confirm(`Delete "${profile.name}" and its attached files? This cannot be undone.`)) return;
		try {
			await deleteLocalProfile(profile._id);
			setProfiles((current) => current.filter((item) => item._id !== profile._id));
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : "Could not delete this profile.");
		}
	}

	return (
		<section className="content-stack">
			<PageHeading eyebrow="CAREER PROFILES" title="Your profile gallery" description="Create and explore multiple versions of your professional profile. Your profiles and documents stay on this device." />
			{error && <InlineError message={error} action="Retry" onAction={() => void loadProfiles()} />}
			<div className="profile-gallery-actions">
				<Button onClick={() => navigate("/profile/create")}><Plus size={16} /> Create profile</Button>
				<Button variant="outline" onClick={() => void importResume()} disabled={importing}><FileText size={16} /> {importing ? "Importing resume…" : "Create from resume"}</Button>
			</div>
			{loading ? <CenteredMessage title="Loading profiles" detail="Opening your local profile gallery…" /> : profiles.length === 0 ?
				<EmptyState icon={UserRound} title="Your gallery is ready" detail="Create a named profile or import a resume to start building your collection." action={<Button onClick={() => navigate("/profile/create")}><Plus size={16} /> Create your first profile</Button>} /> :
				<div className="profile-gallery">
					{profiles.map((profile) => (
						<article className="profile-card" key={profile._id}>
							<Link to={`/profile/${profile._id}`} className="profile-card-main">
								<div className="profile-card-avatar"><UserRound size={21} /></div>
								<p className="eyebrow">PROFILE</p>
								<h2>{profile.name}</h2>
								<p className="profile-card-person">{profile.personal?.fullName || "Add your name"}</p>
								<p className="muted-copy">{profile.professional?.headline || "Add a professional headline to describe this profile."}</p>
								<div className="profile-card-meta">
									<span><FileText size={14} /> {profile.documents?.length ?? 0} documents</span>
									<span>{profile.professional?.skills?.length ?? 0} skills</span>
								</div>
							</Link>
							<div className="profile-card-actions">
								<Link className="text-link" to={`/profile/${profile._id}`}>Explore <ArrowUpRight size={14} /></Link>
								<Link className="text-link" to={`/profile/${profile._id}/edit`}>Edit</Link>
								<button className="icon-button" type="button" aria-label={`Delete ${profile.name}`} onClick={() => void removeProfile(profile)}><Trash2 size={15} /></button>
							</div>
						</article>
					))}
				</div>
			}
		</section>
	);
}

function CreateProfilePage() {
	const { profileId } = useParams();
	const [profile, setProfile] = useState<Profile | null>(null);
	const [profileName, setProfileName] = useState("");
	const [loading, setLoading] = useState(Boolean(profileId));
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	useEffect(() => {
		let active = true;
		if (!profileId) {
			setProfile(null);
			setProfileName("");
			setLoading(false);
			return () => { active = false; };
		}
		setLoading(true);
		void getLocalProfile(profileId).then((result) => {
			if (active) {
				setProfile(result);
				setProfileName(result.name);
				setError(null);
			}
		}).catch((caught: unknown) => {
			if (active) setError(caught instanceof Error ? caught.message : "Could not load this profile.");
		}).finally(() => {
			if (active) setLoading(false);
		});
		return () => { active = false; };
	}, [profileId]);
	async function saveProfile(nextProfile: Profile) {
		if (!profileName.trim()) {
			setError("Give this profile a name before saving.");
			return;
		}
		setSaving(true);
		setError(null);
		try {
			const result = await saveLocalProfile({
				...nextProfile,
				name: profileName.trim(),
				documents: profile?.documents ?? nextProfile.documents ?? [],
			});
			setProfile(result);
			setProfileName(result.name);
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : "Could not save your profile.");
		} finally {
			setSaving(false);
		}
	}
	if (loading) return <CenteredMessage title="Loading profile" detail="Opening your saved profile…" />;
	if (profileId && !profile) return <section className="content-stack"><InlineError message={error || "Profile not found."} /><Link className="text-link" to="/profile"><ArrowLeft size={15} /> Back to profiles</Link></section>;
	return (
		<section className="content-stack">
			<PageHeading eyebrow="CAREER PROFILE" title={profile ? "Edit your profile" : "Create a profile"} description="Give each profile a name so you can keep different career versions and their documents organized." />
			{error && <InlineError message={error} />}
			<div className="profile-name-field">
				<label htmlFor="profile-name">Profile name</label>
				<input id="profile-name" value={profileName} onChange={(event) => setProfileName(event.target.value)} placeholder="e.g. Product designer, Graduate CV" maxLength={80} />
				<p className="muted-copy">This label is just for organizing your gallery; your personal name goes in the profile details.</p>
			</div>
			<div className="profile-editor">
				<ProfileStepper key={profile?._id ?? "new-profile"} onSave={(nextProfile) => void saveProfile(nextProfile)} initialProfile={profile ?? undefined} saving={saving} />
			</div>
			{profile?._id && <ProfileDocumentsEditor profile={profile} onChange={setProfile} />}
			<div className="profile-editor-footer">
				<Link className="text-link" to={profile?._id ? `/profile/${profile._id}` : "/profile"}><ArrowLeft size={15} /> {profile?._id ? "View profile" : "Back to gallery"}</Link>
				<Link className="text-link" to="/profile">All profiles <ArrowUpRight size={15} /></Link>
			</div>
		</section>
	);
}

function ProfileDocumentsEditor({ profile, onChange }: { profile: Profile; onChange: (profile: Profile) => void }) {
	const [kind, setKind] = useState<ProfileDocument["kind"]>("resume");
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function uploadFiles(event: ChangeEvent<HTMLInputElement>) {
		const files = Array.from(event.target.files ?? []);
		event.target.value = "";
		if (!profile._id || files.length === 0) return;
		setUploading(true);
		setError(null);
		try {
			let latest = profile;
			for (const file of files) {
				const result = await uploadProfileDocument(profile._id, kind, file);
				latest = result.profile;
				onChange(latest);
			}
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : "Could not attach the selected file.");
		} finally {
			setUploading(false);
		}
	}

	async function removeDocument(document: ProfileDocument) {
		if (!profile._id || !window.confirm(`Remove "${document.name}" from this profile?`)) return;
		try {
			onChange(await deleteProfileDocument(profile._id, document._id));
			setError(null);
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : "Could not remove this document.");
		}
	}

	return (
		<section className="panel profile-documents">
			<div className="panel-heading"><div><p className="eyebrow">LOCAL FILES</p><h2>Resumes &amp; CVs</h2></div><span className="document-count">{profile.documents?.length ?? 0} attached</span></div>
			<p className="muted-copy">PDF and DOCX files are saved on this device and linked to this profile. Maximum 20 MB per file.</p>
			<div className="document-upload-row">
				<select aria-label="Document type" value={kind} onChange={(event) => setKind(event.target.value as ProfileDocument["kind"])}>
					<option value="resume">Resume</option><option value="cv">CV</option>
				</select>
				<label className={`document-upload-button${uploading ? " is-disabled" : ""}`}>
					<FileText size={15} /> {uploading ? "Uploading…" : "Attach files"}
					<input type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" multiple disabled={uploading} onChange={(event) => void uploadFiles(event)} />
				</label>
			</div>
			{error && <InlineError message={error} />}
			{profile.documents?.length ? <ul className="profile-document-list">{profile.documents.map((document) => (
				<li key={document._id}>
					<FileText size={17} />
					<span><strong>{document.name}</strong><small>{document.kind.toUpperCase()} · {(document.sizeBytes / (1024 * 1024)).toFixed(1)} MB</small></span>
					<a className="text-link" href={getProfileDocumentUrl(profile._id!, document._id)} target="_blank" rel="noreferrer">Open</a>
					<button className="icon-button" type="button" aria-label={`Remove ${document.name}`} onClick={() => void removeDocument(document)}><Trash2 size={15} /></button>
				</li>
			))}</ul> : <p className="document-empty">No resumes or CVs attached yet.</p>}
		</section>
	);
}

function ProfileDetailsPage() {
	const { profileId = "" } = useParams();
	const [profile, setProfile] = useState<Profile | null>(null);
	const [error, setError] = useState<string | null>(null);
	useEffect(() => {
		let active = true;
		void getLocalProfile(profileId).then((result) => {
			if (active) setProfile(result);
		}).catch((caught: unknown) => {
			if (active) setError(caught instanceof Error ? caught.message : "Could not load this profile.");
		});
		return () => { active = false; };
	}, [profileId]);
	if (error) return <section className="content-stack"><InlineError message={error} /><Link className="text-link" to="/profile">Back to profiles</Link></section>;
	if (!profile) return <CenteredMessage title="Loading profile" detail="Opening the selected profile…" />;
	return (
		<section className="content-stack">
			<Link className="text-link" to="/profile"><ArrowLeft size={15} /> Profile gallery</Link>
			<PageHeading eyebrow="PROFILE PREVIEW" title={profile.name} description={profile.professional?.headline || "Explore this profile and its linked documents."} />
			<div className="profile-overview">
				<div className="panel"><p className="eyebrow">ABOUT</p><h2>{profile.personal?.fullName || "Name not added"}</h2><p className="muted-copy">{profile.professional?.summary || "No professional summary yet."}</p><div className="profile-overview-meta">{profile.personal?.email && <span>{profile.personal.email}</span>}{profile.personal?.location?.city && <span>{[profile.personal.location.city, profile.personal.location.country].filter(Boolean).join(", ")}</span>}</div></div>
				<div className="panel"><p className="eyebrow">PROFILE DETAILS</p><div className="profile-stat-row"><span>Experience</span><strong>{profile.professional?.workExperience?.length ?? 0} roles</strong></div><div className="profile-stat-row"><span>Education</span><strong>{profile.professional?.education?.length ?? 0} entries</strong></div><div className="profile-stat-row"><span>Skills</span><strong>{profile.professional?.skills?.length ?? 0}</strong></div></div>
			</div>
			{profile.professional?.workExperience?.length ? <section className="panel"><p className="eyebrow">EXPERIENCE</p><div className="profile-detail-list">{profile.professional.workExperience.map((experience, index) => <article key={`${experience.company}-${index}`}><div><h3>{experience.role}</h3><span>{experience.company}</span></div><small>{[experience.startDate, experience.endDate].filter(Boolean).join(" — ") || "Dates not added"}</small>{experience.description && <p className="muted-copy">{experience.description}</p>}</article>)}</div></section> : null}
			{profile.professional?.education?.length ? <section className="panel"><p className="eyebrow">EDUCATION</p><div className="profile-detail-list">{profile.professional.education.map((education, index) => <article key={`${education.institution}-${index}`}><div><h3>{education.qualification || education.field || "Education"}</h3><span>{education.institution}{education.field && education.qualification ? ` · ${education.field}` : ""}</span></div><small>{[education.startDate, education.endDate].filter(Boolean).join(" — ") || education.status || ""}</small>{education.description && <p className="muted-copy">{education.description}</p>}</article>)}</div></section> : null}
			{profile.professional?.skills?.length ? <section className="panel"><p className="eyebrow">SKILLS</p><div className="profile-skill-list">{profile.professional.skills.map((skill, index) => <span key={`${skill.name}-${index}`}>{skill.name}</span>)}</div></section> : null}
			<section className="panel profile-documents">
				<div className="panel-heading"><div><p className="eyebrow">ATTACHMENTS</p><h2>Resumes &amp; CVs</h2></div><span className="document-count">{profile.documents?.length ?? 0} files</span></div>
				{profile.documents?.length ? <ul className="profile-document-list">{profile.documents.map((document) => <li key={document._id}><FileText size={17} /><span><strong>{document.name}</strong><small>{document.kind.toUpperCase()} · {(document.sizeBytes / (1024 * 1024)).toFixed(1)} MB</small></span><a className="text-link" href={getProfileDocumentUrl(profile._id!, document._id)} target="_blank" rel="noreferrer">Open</a></li>)}</ul> : <p className="document-empty">No files are attached to this profile.</p>}
			</section>
			<div className="profile-editor-footer"><Link className="text-link" to={`/profile/${profile._id}/edit`}>Edit profile <ArrowUpRight size={15} /></Link><Link className="text-link" to="/profile">Explore other profiles</Link></div>
		</section>
	);
}

type CourseSummary = { id: string; title: string; description: string; price: number; creatorName?: string; thumbnailAsset?: { url?: string } | null };

function MyCoursesPage() {
	const { getToken } = useAuth();
	const [courses, setCourses] = useState<CourseSummary[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const load = useCallback(async () => {
		setLoading(true);
		try {
			const token = await getToken();
			if (!token) throw new Error("Your session expired. Sign in again to continue.");
			setCourses(await apiRequest<CourseSummary[]>("/api/me/courses", token));
			setError(null);
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : "Could not load your courses.");
		} finally {
			setLoading(false);
		}
	}, [getToken]);
	useEffect(() => { void load(); }, [load]);
	return <section className="content-stack"><PageHeading eyebrow="LEARNING" title="My courses" description="Courses you are enrolled in are available here." />{error && <InlineError message={error} action="Retry" onAction={() => void load()} />}{loading ? <CenteredMessage title="Loading courses" detail="Checking your course access…" /> : courses.length === 0 ? <EmptyState icon={GraduationCap} title="No courses yet" detail="Browse the course catalogue and your enrolled courses will appear here." action={<a className="text-link" href={getWebAppUrl("/learning")} onClick={(event) => { event.preventDefault(); void openUrl(getWebAppUrl("/learning")); }}>Browse catalogue <ArrowUpRight size={15} /></a>} /> : <div className="course-grid">{courses.map((course) => <Link key={course.id} to={`/courses/${course.id}`} className="course-card">{course.thumbnailAsset?.url ? <img src={course.thumbnailAsset.url} alt="" /> : <div className="course-placeholder"><GraduationCap size={24} /></div>}<div className="course-card-body"><span className="eyebrow">{course.creatorName || "BESIRE LEARNING"}</span><h2>{course.title}</h2><p>{course.description}</p><span className="text-link">Continue learning <ArrowUpRight size={15} /></span></div></Link>)}</div>}</section>;
}

type CourseBlock = { type: "text" | "image" | "video"; data?: Record<string, string>; asset?: { url?: string; fileName?: string } | null };
type CourseLesson = { id: string; title: string; blocks?: CourseBlock[] };
type CourseModule = { id: string; title: string; lessons?: CourseLesson[] };
type CourseDetail = { id: string; title: string; description: string; modules?: CourseModule[]; accessGranted?: boolean };

function CoursePage() {
	const { courseId = "" } = useParams();
	const { getToken } = useAuth();
	const [course, setCourse] = useState<CourseDetail | null>(null);
	const [error, setError] = useState<string | null>(null);
	useEffect(() => {
		let active = true;
		void (async () => {
			try {
				const token = await getToken();
				if (!token) throw new Error("Your session expired. Sign in again to continue.");
				const result = await apiRequest<CourseDetail>(`/api/courses/${encodeURIComponent(courseId)}`, token);
				if (active) setCourse(result);
			} catch (caught) {
				if (active) setError(caught instanceof Error ? caught.message : "Could not load this course.");
			}
		})();
		return () => { active = false; };
	}, [courseId, getToken]);
	if (error) return <InlineError message={error} />;
	if (!course) return <CenteredMessage title="Loading course" detail="Retrieving course content…" />;
	if (!course.accessGranted) return <EmptyState icon={LockKeyhole} title="Course access required" detail="You need to enroll in this course to view its lessons." action={<a className="text-link" href={getWebAppUrl(`/learning/${course.id}`)} onClick={(event) => { event.preventDefault(); void openUrl(getWebAppUrl(`/learning/${course.id}`)); }}>View course options <ArrowUpRight size={15} /></a>} />;
	return <section className="content-stack"><PageHeading eyebrow="MY COURSES" title={course.title} description={course.description} />{course.modules?.map((module) => <article className="panel lesson-module" key={module.id}><h2>{module.title}</h2>{module.lessons?.map((lesson) => <section className="lesson-content" key={lesson.id}><h3>{lesson.title}</h3>{lesson.blocks?.map((block, index) => <CourseBlockView block={block} key={`${lesson.id}-${index}`} />)}</section>)}</article>)}</section>;
}

function CourseBlockView({ block }: { block: CourseBlock }) {
	if (block.type === "text") return <p className="lesson-text">{block.data?.text || ""}</p>;
	if (!block.asset?.url) return null;
	if (block.type === "video") return <video className="lesson-media" src={block.asset.url} controls aria-label={block.data?.title || block.asset.fileName} />;
	return <figure className="lesson-figure"><img className="lesson-media" src={block.asset.url} alt={block.data?.caption || block.asset.fileName || ""} />{block.data?.caption && <figcaption>{block.data.caption}</figcaption>}</figure>;
}

function LearningCataloguePage() {
	return <section className="content-stack"><PageHeading eyebrow="LEARNING" title="Course catalogue" description="Explore practical learning for navigating online work and building your career." /><div className="panel"><div className="card-icon"><BookOpen size={21} /></div><h2>Learning at Besire</h2><p className="muted-copy">The public course catalogue and enrolment flow are part of Besire Web. Open the catalogue to browse published courses and enrol. Your access will sync to this account.</p><Button onClick={() => void openUrl(getWebAppUrl("/learning"))}>Open course catalogue <ArrowUpRight size={15} /></Button></div></section>;
}

function BillingPage() {
	const { getToken } = useAuth();
	const { value, refresh } = useEntitlements();
	const [status, setStatus] = useState<Record<string, unknown> | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [checkoutMode, setCheckoutMode] = useState<"manual" | "subscription" | null>(null);
	const loadStatus = useCallback(async () => {
		setLoading(true);
		try {
			const token = await getToken();
			if (!token) throw new Error("Your session expired. Sign in again to continue.");
			setStatus(await apiRequest<Record<string, unknown>>("/api/billing/status", token));
			await refresh();
			setError(null);
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : "Could not load billing status.");
		} finally {
			setLoading(false);
		}
	}, [getToken, refresh]);
	useEffect(() => { void loadStatus(); }, [loadStatus]);
	async function beginCheckout(mode: "manual" | "subscription") {
		setCheckoutMode(mode);
		setError(null);
		try {
			const token = await getToken();
			if (!token) throw new Error("Your session expired. Sign in again to continue.");
			const response = await apiRequest<{ checkoutUrl: string }>("/api/billing/checkout", token, {
				method: "POST",
				headers: { "Idempotency-Key": crypto.randomUUID() },
				body: JSON.stringify({ mode }),
			});
			await openUrl(response.checkoutUrl);
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : "Could not start checkout.");
		} finally {
			setCheckoutMode(null);
		}
	}
	const subscriptionAvailable = status?.subscriptionAvailable === true;
	return <section className="content-stack"><PageHeading eyebrow="BESIRE PRO" title="Plan & billing" description="Manage your platform plan. Pro adds IAN and supported premium assistance." />{error && <InlineError message={error} action="Retry" onAction={() => void loadStatus()} />}<section className="plan-summary"><div><p className="eyebrow">CURRENT PLAN</p><h2>{value?.plan === "pro" ? "Besire Pro" : "Besire Free"}</h2><p>{value?.billing.accessExpiresAt ? `Access expires ${new Date(value.billing.accessExpiresAt).toLocaleString()}` : "Your free job-search workspace is available."}</p></div><Button variant="outline" onClick={() => void loadStatus()} disabled={loading}><RefreshCw size={15} /> Refresh status</Button></section><div className="billing-grid"><article className="panel"><p className="eyebrow">MANUAL PAYMENT</p><h2>KSh 2,000 for 30 days</h2><p className="muted-copy">One-time payment. It does not renew automatically.</p><Button onClick={() => void beginCheckout("manual")} disabled={checkoutMode !== null || value?.plan === "pro"}>{checkoutMode === "manual" ? "Opening checkout…" : "Pay manually"}</Button></article><article className="panel"><p className="eyebrow">AUTOMATIC RENEWAL</p><h2>KSh 2,000 / month</h2><p className="muted-copy">{subscriptionAvailable ? "Subscription renews automatically. Manage cancellation in Besire Web." : "Subscription checkout is not currently enabled for this account."}</p><Button variant="outline" onClick={() => void beginCheckout("subscription")} disabled={!subscriptionAvailable || checkoutMode !== null || value?.plan === "pro"}>{checkoutMode === "subscription" ? "Opening checkout…" : "Subscribe monthly"}</Button></article></div><p className="fine-print">Checkout opens securely through Paystack. Your plan updates only after the backend verifies payment. For receipts, cancellations, and payment history, continue in Besire Web.</p></section>;
}

function SettingsPage() {
	const { user } = useUser();
	const { signOut } = useAuth();
	return <section className="content-stack"><PageHeading eyebrow="ACCOUNT" title="Settings" description="Your signed-in Besire account." /><section className="panel settings-profile"><UserButton /><div><h2>{user?.fullName || "Besire user"}</h2><p className="muted-copy">{user?.primaryEmailAddress?.emailAddress}</p></div></section><Button variant="outline" onClick={() => void signOut({ redirectUrl: "/" })}><LogOut size={15} /> Sign out</Button></section>;
}

function FeatureGate({ feature, children }: { feature: string; children: ReactNode }) {
	const { value, error } = useEntitlements();
	if (error || !value) return <InlineError message={error || "Your account access is still being verified."} />;
	if (!value.features[feature]) return <EmptyState icon={LockKeyhole} title="Available with Besire Pro" detail="This area is reserved for Pro accounts. Your free job-search workspace remains available." action={<Link to="/billing" className="text-link">Explore Besire Pro <ArrowUpRight size={15} /></Link>} />;
	return children;
}

function FeaturePlaceholder({ title, description }: { title: string; description: string }) {
	return <section className="content-stack"><PageHeading eyebrow="BESIRE WORKSPACE" title={title} description={description} /><div className="panel placeholder-panel"><div className="card-icon"><Sparkles size={20} /></div><h2>Workspace preview</h2><p className="muted-copy">This part of the Besire experience is planned but is not available in this desktop build yet.</p></div></section>;
}

function PageHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
	return <header className="page-heading"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="muted-copy">{description}</p></header>;
}

function EmptyState({ icon: Icon, title, detail, action }: { icon: LucideIcon; title: string; detail: string; action?: ReactNode }) {
	return <div className="empty-state"><div className="card-icon"><Icon size={21} /></div><h2>{title}</h2><p className="muted-copy">{detail}</p>{action}</div>;
}

function InlineError({ message, action, onAction }: { message: string; action?: string; onAction?: () => void }) {
	return <div className="inline-error" role="alert"><span>{message}</span>{action && onAction && <Button variant="outline" size="sm" onClick={onAction}>{action}</Button>}</div>;
}

function CenteredMessage({ title, detail }: { title: string; detail: string }) {
	return <div className="centered-message"><strong>{title}</strong><span>{detail}</span></div>;
}

export default function App() {
	const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
	if (!publishableKey) {
		return <main className="auth-screen"><section className="auth-card"><p className="eyebrow">SETUP REQUIRED</p><h1>Connect Besire sign-in</h1><p className="muted-copy">Set <code>VITE_CLERK_PUBLISHABLE_KEY</code> in the desktop app environment, then restart the app.</p></section></main>;
	}
	return <AuthenticatedApp />;
}
