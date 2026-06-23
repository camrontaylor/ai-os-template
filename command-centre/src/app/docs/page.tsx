"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Legacy standalone /docs page. Docs now lives as a tab on the root
 * Command Centre (top-nav layout), so this just forwards any existing
 * links (old bookmarks, output-file clicks from older builds) to the
 * new URL while preserving ?file=.
 */
function DocsRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const file = searchParams.get("file");
    const target = file
      ? `/?tab=docs&file=${encodeURIComponent(file)}`
      : "/?tab=docs";
    router.replace(target);
  }, [router, searchParams]);

  return null;
}

export default function DocsPage() {
  return (
    <Suspense>
      <DocsRedirect />
    </Suspense>
  );
}
