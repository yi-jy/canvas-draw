# canvas-draw

A Sketchpad based on canvas(Refactoring...), You can see an live demo [here](http://joy-yi0905.github.io/canvas-draw/demo.html).

## Usage

Include the JavaScript library into the page:

```
<script src="draw.js"></script>
```

Then create an instance of the `Draw`:

```
new Draw({
  container: document.getElementById('container'), // container of the canvas
  canvas: document.getElementById('canvas'), // canvas, if not specified, create a new canvas
  canvasWidth: 300, // width of the canvas, 300 by default, only for sizeFit: false
  canvasHeight: 300, // height of the canvas, 300 by default, only for sizeFit: false
  sizeFit: false, // whether the canvas size is adaptive to the backgroundImage, true by default
  border: '1px solid #000', // outline of the canvas, '1px solid #000' by default
  backgroundImage: 'home.png', // canvas backgroundImage, '' by default
  backgroundColor: 'red', // canvas backgroundColor, '#000' by default
  toolbar: false, // draw toolbar, false by default
  erasing: function () { // is erasing ?
    return document.querySelectorAll('.eraser-check')[0].checked;
  },
  lineWidth: function () { // lineWidth
    return document.querySelectorAll('.draw-width')[0].value;
  },
  lineColor: function () { // lineColor
    return document.querySelectorAll('.draw-color')[0].value;
  }
})
```