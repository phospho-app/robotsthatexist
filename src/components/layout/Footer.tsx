export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="text-center text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            brought to you with <span className="text-primary">♥</span> by{" "}
            <a
              href="https://phospho.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 font-medium hover:underline"
            >
              phospho
            </a>
          </span>
          <br />
          <span className="mt-2 block">
            Edit the source{" "}
            <a
              href="https://github.com/phospho-app/robotsthatexist"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 font-medium hover:underline"
            >
              here
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
