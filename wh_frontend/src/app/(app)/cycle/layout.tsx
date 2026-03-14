export default function CycleLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-w-0 flex-1 overflow-x-hidden">{children}</div>;
}
