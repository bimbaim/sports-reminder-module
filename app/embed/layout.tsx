export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-transparent">
      <style dangerouslySetInnerHTML={{ __html: `
        html, body { 
          background-color: transparent !important;
          background: transparent !important;
        }
      ` }} />
      {children}
    </div>
  );
}
