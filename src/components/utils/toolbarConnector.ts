// Placeholder toolbar class — almost all methods are stubs in the original
// JS. Kept as-is during the TS migration; cleanup can prune unused stubs
// later if they're confirmed dead code.
export default class ToolBar {
    toolBarDOM: HTMLElement | null
    constructor() {
        this.toolBarDOM = document.getElementById('floating-toolbar')
    }
    create_color_bg(): void {}
    create_color_text(): void {}
    create_color_icon(): void {}
    create_font_size(): void {}
    create_font_weight(): void {}
    create_alignment(): void {}
    create_border_color(): void {}
    create_border_width(): void {}
    create_link_url(): void {}
    create_opacity(): void {}
    create(): void {}
    hide(): void {}
    forceHide(_callback?: () => void): void {}
    show(): void {}
    shift(_pageX: number, _pageY: number): void {}
}
