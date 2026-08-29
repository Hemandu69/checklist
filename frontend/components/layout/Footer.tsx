export function Footer() {
  return (
    <footer className="mx-auto w-full max-w-5xl px-4 pb-6 sm:px-6">
      <p className="text-center text-[11px] leading-relaxed text-[color:var(--text-tertiary)]">
        Movie data and artwork provided by{" "}
        <a
          href="https://www.themoviedb.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-dotted underline-offset-2 hover:text-[color:var(--text-secondary)]"
        >
          TMDB
        </a>
        . This product uses the TMDB API but is not endorsed or certified by TMDB.
      </p>
    </footer>
  );
}
