const footerLinks = [
  { title: "About", href: "#" },
  { title: "Help", href: "#" },
  { title: "Contact", href: "#" },
  { title: "Privacy Policy", href: "#" },
  { title: "Terms of Service", href: "#" },
] as const;

export function MinimalFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-auto w-full border-t border-border/60 bg-background/40 backdrop-blur-md">
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">
        <div className="flex flex-col items-center gap-4 text-center sm:items-start sm:text-left">
          <div>
            <p className="text-sm font-semibold tracking-tight text-foreground">
              SSG Payment System
            </p>
            <p className="mt-1 max-w-xl text-pretty text-xs leading-relaxed text-muted-foreground sm:text-sm">
              Unofficial fee collection and payment records portal for the Supreme
              Student Government.
            </p>
          </div>

          <nav
            className="flex w-full max-w-2xl flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:justify-start"
            aria-label="Footer"
          >
            {footerLinks.map(({ href, title }) => (
              <a
                key={title}
                href={href}
                className="text-sm text-foreground/90 underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {title}
              </a>
            ))}
          </nav>

          <p className="w-full border-t border-border/60 pt-4 text-center text-xs text-muted-foreground sm:text-left">
            © {year} SSG Payment System. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
