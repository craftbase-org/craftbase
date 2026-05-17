import ObjectSelector from './objectSelector'
import ToolBar from './toolbarConnector'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TwoLike = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GroupLike = any

const getEditComponents = (
    two: TwoLike,
    group: GroupLike,
    constant1: unknown
): { selector: ObjectSelector; toolbar: ToolBar } => {
    const selector = new ObjectSelector(two, group, 0, 0, 0, 0, constant1)
    selector.create()

    const toolbar = new ToolBar()
    toolbar.create()

    return { selector, toolbar }
}

export default getEditComponents
