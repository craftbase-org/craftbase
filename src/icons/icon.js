import React, { Component } from 'react'
import PropTypes from 'prop-types'
import Icons from './icons'

class Icon extends Component {
    render() {
        return (
            <svg
                width={this.props.width ? this.props.width : 25}
                height={this.props.height ? this.props.height : 25}
                className={this.props.className || ''}
                viewBox={Icons[this.props.icon].viewBox}
                dangerouslySetInnerHTML={{
                    __html: Icons[this.props.icon].data,
                }}
            />
        )
    }

    shouldComponentUpdate() {
        return false
    }
}

Icon.propTypes = {
    width: PropTypes.number,
    height: PropTypes.number,
}

export default Icon
