export function Footer() {
  return (
    <footer className="border-t py-6">
      <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
        <p className="text-muted-foreground text-sm">
          © {new Date().getFullYear()} Generative Deep Neural Dungeon. All
          rights reserved.
        </p>
      </div>
    </footer>
  )
}
