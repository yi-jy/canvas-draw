; (function (root, doc) {

  var hasTouch = 'ontouchstart' in window ? true : false;
  var startEventType = hasTouch ? 'touchstart' : 'mousedown';
  var moveEventType = hasTouch ? 'touchmove' : 'mousemove';
  var endEventType = hasTouch ? 'touchend' : 'mouseup';

  var pos = {};

  var defaults = {
    container: doc.body,
    offsetLeft: 0,
    offsetTop: 0,
    canvasWidth: 300,
    canvasHeight: 300,
    sizeFit: true,
    border: '1px solid #000',
    backgroundColor: '#fff',
    toolbar: false,
    erasing: false,
    lineWidth: 2,
    lineColor: '#000'
  };

  function extend(target, source) {
    for (var prop in source) {
      if (source.hasOwnProperty(prop)) {
        if (typeof target[prop] === 'undefined') {
          target[prop] = source[prop];
        }
      }
    }

    return target;
  }

  function createElement(tagName) {
    return doc.createElement(tagName);
  }

  function Draw(config) {

    this.config = extend(config || {}, defaults);

    // offscreen Canvas
    this.offscreenCanvas = createElement('canvas');

    // draw canvas
    this.canvas = config.canvas;
    this.initCanvas();

    // events
    // config.eraserBtn.addEventListener('click', this.switchEraserStatus.bind(this));
  }

  Draw.prototype.initCanvas = function (callback) {
    // Create a default canvas and insert it into the document
    if (!this.canvas) {
      this.canvas = createElement('canvas');
      this.config.container.appendChild(this.canvas);
      this.canvas.style.outline = this.config.border;
    }

    this.canvasCtx = this.canvas.getContext('2d');

    this.setCanvasSize(this.canvas, function () {
      this.canvasCtx.globalCompositeOperation = 'source-over';
      this.canvasCtx.lineJoin = 'round';
      this.canvasCtx.lineCap = 'round';

      if (this.config.backgroundImage) {
        this.canvas.style.backgroundImage = 'url(' + this.config.backgroundImage + ')';
      }

      // offscreen Canvas 
      this.drawOffscreenCanvas();

      // events
      this.canvas.addEventListener(startEventType, this.paintStart.bind(this));
    }.bind(this));
  };

  Draw.prototype.setCanvasSize = function (canvas, callback) {
    var width = this.config.canvasWidth;
    var height = this.config.canvasHeight;

    var img = new Image();

    if (this.config.backgroundImage && this.config.sizeFit) {
      img.addEventListener('load', (function () {
        canvas.width = img.width;
        canvas.height = img.height;

        typeof callback === 'function' && callback();
      }).bind(this));

      img.src = this.config.backgroundImage;
    } else {
      canvas.width = width;
      canvas.height = height;

      typeof callback === 'function' && callback();
    }
  };

  Draw.prototype.drawOffscreenCanvas = function () {
    var offscreenCanvasCtx = this.offscreenCanvas.getContext('2d');

    var img = new Image();

    this.setCanvasSize(this.offscreenCanvas);

    offscreenCanvasCtx.save();

    // Set the background color when erasure some region
    offscreenCanvasCtx.fillStyle = this.config.backgroundColor;
    offscreenCanvasCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    offscreenCanvasCtx.restore();

    // Set the background image when erasure some region(if any)
    if (this.config.backgroundImage) {
      img.addEventListener('load', function () {
        offscreenCanvasCtx.drawImage(img, 0, 0);
      });

      img.src = this.config.backgroundImage;
    }
  };

  Draw.prototype.setPaintAttr = function (paintWidth, paintColor) {
    this.canvasCtx.lineWidth = paintWidth;
    this.canvasCtx.strokeStyle = paintColor;
  };

  Draw.prototype.paintStart = function (event) {

    pos.startX = this.getPos(event).x;
    pos.startY = this.getPos(event).y;

    // set Eraser size
    nowEraserWidth = 20;

    // Set the size and thickness of the brush
    this.setPaintAttr(this.config.lineWidth(), this.config.lineColor());

    this.movingHandler = this.paintMoving.bind(this);
    this.endHandler = this.paintEnd.bind(this);

    this.canvas.addEventListener(moveEventType, this.movingHandler);

    // add 'endEventType' event to doc(document)
    // fixing the bug that events can't remove when moving out of the canvas and then mouseup
    doc.addEventListener(endEventType, this.endHandler);
  };

  Draw.prototype.paintMoving = function (event) {
    pos.endX = this.getPos(event).x;
    pos.endY = this.getPos(event).y;

    if (this.config.erasing()) {
      pos.eraserX = pos.endX;
      pos.eraserY = pos.endY;

      this.clearEraser(pos, nowEraserWidth);
      this.drawEraser(pos, nowEraserWidth);
    } else {
      this.canvasCtx.beginPath();
      this.canvasCtx.moveTo(pos.startX, pos.startY);
      this.canvasCtx.lineTo(pos.endX, pos.endY);
      this.canvasCtx.stroke();
      this.canvasCtx.closePath();
    }

    pos.startX = pos.endX;
    pos.startY = pos.endY;

    event.preventDefault();
  };

  Draw.prototype.paintEnd = function () {
    this.canvas.removeEventListener(moveEventType, this.movingHandler);
    doc.removeEventListener(endEventType, this.endHandler);
    this.config.erasing() && this.clearEraser(pos, nowEraserWidth);
  };

  Draw.prototype.repaint = function () {
    confirm('Did you want clear all of the canvas?') &&
      this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.width);
  };

  Draw.prototype.drawEraser = function (pos, eraserWidth) {
    // restore the eraser border width and color
    this.setPaintAttr(2, '#000');

    this.canvasCtx.save();
    this.canvasCtx.beginPath();
    this.canvasCtx.arc(pos.eraserX, pos.eraserY, eraserWidth, 0, Math.PI * 2, false);
    this.canvasCtx.clip();
    this.canvasCtx.stroke();
    this.canvasCtx.restore();
  };

  Draw.prototype.setEraserPath = function (pos, eraserWidth) {
    this.canvasCtx.beginPath();
    this.canvasCtx.moveTo(pos.startX, pos.startY);
    this.canvasCtx.arc(pos.startX, pos.startY, eraserWidth + 1, 0, Math.PI * 2, false);
    this.canvasCtx.closePath();
  };

  Draw.prototype.clearEraser = function (pos, eraserWidth) {
    var x = pos.startX - eraserWidth,
      y = pos.startY - eraserWidth,
      w = eraserWidth * 2 + 1 * 2,
      h = w,
      canvasWidth = this.canvas.width,
      canvasHeight = this.canvas.height;

    this.canvasCtx.save();

    this.setEraserPath(pos, eraserWidth);

    this.canvasCtx.clip();

    if (x + w > canvasWidth) w = canvasWidth - x;
    if (y + h > canvasHeight) h = canvasHeight - y;
    if (x < 0) { x = 0; }
    if (y < 0) { y = 0; }

    this.canvasCtx.drawImage(this.offscreenCanvas, x, y, w, h, x, y, w, h);

    this.canvasCtx.restore();
  }

  Draw.prototype.switchEraserStatus = function () {
    this.config.erasing = !this.config.erasing;
  };

  Draw.prototype.getPos = function (event) {
    return {
      x: hasTouch
        ? (event.targetTouches[0].pageX - this.canvas.offsetLeft)
        : (event.clientX - this.canvas.offsetLeft),
      y: hasTouch
        ? (event.targetTouches[0].pageY - this.canvas.offsetTop)
        : (event.clientY - this.canvas.offsetTop)
    }
  }

  root.Draw = Draw;

})(window, document);
