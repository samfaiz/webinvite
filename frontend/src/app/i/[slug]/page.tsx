import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTemplateComponent } from "@/templates/components";
import { getMotif } from "@/motifs";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

/** Personal invitation: rich title/description for social sharing, but noindex
 *  (each couple's page is private, not marketing content). */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const fallback: Metadata = { title: { absolute: "Wedding Invitation" }, robots: { index: false, follow: true } };
  try {
    const res = await fetch(`${API}/public/invitations/${slug}`, { cache: "no-store" });
    if (!res.ok) return fallback;
    const data = await res.json();
    const c = data?.content?.couple;
    const names =
      c?.partner1?.name && c?.partner2?.name ? `${c.partner1.name} & ${c.partner2.name}` : "Our Wedding";
    const tagline = data?.content?.envelope?.tagline || `You're invited to celebrate the wedding of ${names}.`;
    const title = `${names} — Wedding Invitation`;
    return {
      title: { absolute: title },
      description: tagline,
      robots: { index: false, follow: true },
      openGraph: { title, description: tagline, type: "website" },
      twitter: { card: "summary_large_image", title, description: tagline },
    };
  } catch {
    return fallback;
  }
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f1ea] px-6 text-center">
      <div>
        <h1 className="font-display text-2xl uppercase tracking-[0.12em] text-[#2b3a67]">
          {title}
        </h1>
        <p className="font-body mt-3 text-lg italic text-slate-500">{body}</p>
      </div>
    </div>
  );
}

/** Public, SSR-rendered invitation served from the backend by slug. */
export default async function PublicInvitePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let res: Response;
  try {
    res = await fetch(`${API}/public/invitations/${slug}`, { cache: "no-store" });
  } catch {
    return (
      <Notice
        title="Temporarily unavailable"
        body="We couldn't load this invitation. Please try again shortly."
      />
    );
  }

  if (res.status === 410) {
    return <Notice title="This invitation has ended" body="Thank you for celebrating with us." />;
  }
  if (!res.ok) notFound();

  const data = await res.json();
  const Template = getTemplateComponent(data.templateId);

  return (
    <Template
      content={data.content}
      theme={data.theme}
      motif={getMotif(data.motifId)}
      live
      snap
    />
  );
}
