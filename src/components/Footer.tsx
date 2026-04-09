"use client";

export function Footer() {
  return (
    <footer className="bg-[#1a1a2e] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-white tracking-tight">
              Anthology
            </span>
            <span className="text-xs text-gray-500">
              &copy;2026 Anthology Inc.
            </span>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="https://www.anthology.com/trust-center/terms-of-use"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-500 hover:text-white transition-colors"
            >
              Terms of Use
            </a>
            <a
              href="https://www.anthology.com/trust-center/privacy-statement"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-500 hover:text-white transition-colors"
            >
              Privacy Policy
            </a>
            <a
              href="https://www.anthology.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-500 hover:text-white transition-colors"
            >
              About Anthology
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
