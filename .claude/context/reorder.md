## Reorder/Positioning of elements

In 2d space, we need to adjust how elements behave on z-axis. For that we need to reorder children of two group to achieve such expectations.

In craftbase, we have four options

- Bring to front (Brings it to the foremost top of the order, at [N])
- Bring forward (Brings 1 order up , at[current+1])
- Send Backward (Sends 1 order down, at [current-1])
- Send to Back (Sends to last of the order, at [0])

This is being triggered by three inputs from user

- Keyboard shortcuts
- Context Menu (opens on right click)
- Element Properties Toolbar or edit toolbar

Shortcuts are

```
`]` = Bring Forward, `[` = Send Backward, `⌘` + `]` = Bring to Front, `⌘` + `[` = Send to Back (and Ctrl+… on Windows/Linux)
```

## Business logic

We attach a property to each component called `position` which determines its position in Z-Axis or two's scene. The core logic is implemented at `reorderSelected` fn of newCanvas.tsx file .
