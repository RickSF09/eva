import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Eva Cares — Daily peace of mind for your parents",
  description:
    "Trained callers check in, escalate when needed, and keep family caregivers in the loop.",
};

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      {children}
    </main>
  );
}


