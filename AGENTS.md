# Architecture rules
- Configure the document viewport in the TanStack root head, not an index.html file, because the root shell owns the rendered document.
- Keep intrinsic-size safeguards in global CSS and horizontal table scrolling inside page content, so shared layouts cannot expand to table or form minimum widths.