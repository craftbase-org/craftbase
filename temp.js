import Two from 'https://cdn.skypack.dev/two.js@latest'
// Reference to the drawing area div
var drawingArea = document.getElementById('drawing-area')

// Create a Two.js instance within the specific div
var params = {
    width: drawingArea.clientWidth,
    height: drawingArea.clientHeight,
}
var two = new Two(params).appendTo(drawingArea)

var isDrawing = false
var currentPath
var paths = []

// Handle drawing on the drawing area
drawingArea.addEventListener('mousedown', function (event) {
    isDrawing = true
    currentPath = new Two.Path()
    two.add(currentPath)
    paths.push(currentPath)
})

drawingArea.addEventListener('mousemove', function (event) {
    if (!isDrawing) return

    // Calculate the mouse position relative to the drawing area
    var rect = drawingArea.getBoundingClientRect()
    var x = event.clientX - rect.left
    var y = event.clientY - rect.top

    currentPath.vertices.push(new Two.Vector(x, y))
    currentPath.vertices[currentPath.vertices.length - 1].command = 'L'
    currentPath.noFill()
    currentPath.stroke = '#000'
    two.update()
})

drawingArea.addEventListener('mouseup', function (event) {
    isDrawing = false
})

// Save drawing to local storage
document.getElementById('save').addEventListener('click', function () {
    try {
        var drawingData = paths.map(function (path) {
            return path.vertices.map(function (vertex) {
                return { x: vertex.x, y: vertex.y }
            })
        })
        localStorage.setItem('drawing', JSON.stringify(drawingData))
        console.log('Drawing saved:', drawingData)
        alert('Drawing saved!')
    } catch (error) {
        console.error('Error saving drawing:', error)
        alert('Failed to save drawing.')
    }
})

// Load drawing from local storage
document.getElementById('load').addEventListener('click', function () {
    try {
        var drawingData = JSON.parse(localStorage.getItem('drawing'))
        if (!drawingData) {
            alert('No saved drawing found.')
            return
        }

        two.clear() // Clear existing paths
        paths = [] // Reset paths array

        drawingData.forEach(function (pathData) {
            var path = new Two.Path()
            pathData.forEach(function (point) {
                path.vertices.push(new Two.Vector(point.x, point.y))
            })
            path.noFill()
            path.stroke = '#000'
            two.add(path)
            paths.push(path)
        })

        two.update()
        console.log('Drawing loaded:', drawingData)
        alert('Drawing loaded!')
    } catch (error) {
        console.error('Error loading drawing:', error)
        alert('Failed to load drawing.')
    }
})
