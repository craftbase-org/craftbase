import { Component } from 'react'
import type { ReactElement } from 'react'
import Icons from './icons'

interface IconProps {
    icon: string
    width?: number
    height?: number
    className?: string
}

class Icon extends Component<IconProps> {
    override render(): ReactElement {
        const entry = Icons[this.props.icon]
        return (
            <svg
                width={this.props.width ?? 25}
                height={this.props.height ?? 25}
                className={this.props.className ?? ''}
                viewBox={entry?.viewBox}
                dangerouslySetInnerHTML={{
                    __html: entry?.data ?? '',
                }}
            />
        )
    }

    override shouldComponentUpdate(): boolean {
        return false
    }
}

export default Icon
