"use client";

import { createContext, useContext } from "react";

/**
 * `compact` = render inside the editor's small live-preview pane: sections size to
 * their content instead of forcing full-screen slides.
 * `editing` = WYSIWYG mode (the embed makes [data-edit] text editable); some blocks
 * also reveal hidden bits (e.g. the scratch card auto-reveals the date) so everything
 * is editable. Both are false on the published invite / full preview.
 */
export const PreviewContext = createContext<{ compact: boolean; editing: boolean }>({
  compact: false,
  editing: false,
});

export const usePreview = () => useContext(PreviewContext);
