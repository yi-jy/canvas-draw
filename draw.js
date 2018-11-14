; (function (root, doc) {

  var hasTouch = 'ontouchstart' in window ? true : false;
  var startEventType = hasTouch ? 'touchstart' : 'mousedown';
  var moveEventType = hasTouch ? 'touchmove' : 'mousemove';
  var endEventType = hasTouch ? 'touchend' : 'mouseup';

  var pos = {};

  var eraser = {
    radius: 20,
    borderWidth: 2,
    borderColor: '#000'
  };

  var defaults = {
    container: doc.body,
    canvasWidth: 300,
    canvasHeight: 300,
    sizeFit: true,
    border: '1px solid #000',
    backgroundColor: '#fff',
    toolbar: false,
    erasing: false,
    lineWidth: 1,
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

  function detectStringToFunction(name, config) {
    var configAttr = config[name];

    if (typeof configAttr !== 'function') {
      config[name] = function () {
        return configAttr;
      };
    }
  }

  function createElement(tagName) {
    return doc.createElement(tagName);
  }

  function convertCanvasToImg(canvas, callback) {
    var img = new Image();

    img.addEventListener('load', function () {
      typeof callback === 'function' && callback(img);
    })

    img.src = canvas.toDataURL('image/png', .5);
  }

  function getElementEventPos(element, eventX, eventY) {
    var elementRect = element.getBoundingClientRect();

    return {
      x: eventX - elementRect.left * (element.width / elementRect.width),
      y: eventY - elementRect.top * (element.height / elementRect.height)
    };
  }

  function Draw(config) {

    this.config = extend(config || {}, defaults);
    this.initConfig();

    // offscreen Canvas
    this.offscreenCanvas = createElement('canvas');

    // draw canvas
    this.canvas = config.canvas;
    this.initCanvas();
  }

  Draw.prototype.initConfig = function () {
    detectStringToFunction.bind(this, 'erasing', this.config)();
    detectStringToFunction.bind(this, 'lineWidth', this.config)();
    detectStringToFunction.bind(this, 'lineColor', this.config)();
  };

  Draw.prototype.initCanvas = function (callback) {
    // if no canvas is specified, then create a default canvas and insert it into the document
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
        this.canvas.style.backgroundRepeat = 'no-repeat';
      }

      // offscreen Canvas 
      this.drawOffscreenCanvas();

      // events
      this.canvas.addEventListener(startEventType, this.paintStart.bind(this));
      this.canvas.addEventListener('contextmenu', this.disabledContextmenu);
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

    // set the size and thickness of the brush
    this.setPaintAttr(this.config.lineWidth(), this.config.lineColor());

    if (!this.config.lineWidth() || !this.config.lineColor()) {
      throw new Error('If you specify the lineWidth or lineColor, you must give it a default value')
    }

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

      this.clearEraser(pos, eraser);
      this.drawEraser(pos, eraser);
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
    this.config.erasing() && this.clearEraser(pos, eraser);
  };

  Draw.prototype.repaint = function () {
    confirm('Did you want clear all of the canvas?') &&
      this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.width);
  };

  Draw.prototype.drawEraser = function (pos, eraser) {
    this.canvasCtx.save();

    // restore the eraser border width and color
    this.setPaintAttr(eraser.borderWidth, eraser.borderColor);

    this.canvasCtx.beginPath();
    this.canvasCtx.arc(pos.eraserX, pos.eraserY, eraser.radius, 0, Math.PI * 2, false);

    this.canvasCtx.clip();
    this.canvasCtx.stroke();
    this.canvasCtx.restore();
  };

  Draw.prototype.setEraserPath = function (pos, eraser) {
    this.canvasCtx.beginPath();
    this.canvasCtx.moveTo(pos.startX, pos.startY);
    this.canvasCtx.arc(pos.startX, pos.startY, eraser.radius + eraser.borderWidth, 0, Math.PI * 2, false);
    this.canvasCtx.closePath();
  };

  Draw.prototype.clearEraser = function (pos, eraser) {
    var x = pos.startX - eraser.radius,
      y = pos.startY - eraser.radius,
      w = eraser.radius * 2 + eraser.borderWidth * 2,
      h = w,
      canvasWidth = this.canvas.width,
      canvasHeight = this.canvas.height;

    this.canvasCtx.save();

    this.setEraserPath(pos, eraser);

    this.canvasCtx.clip();

    if (x + w > canvasWidth) w = canvasWidth - x;
    if (y + h > canvasHeight) h = canvasHeight - y;
    if (x < 0) x = 0;
    if (y < 0) y = 0;

    this.canvasCtx.drawImage(this.offscreenCanvas, x, y, w, h, x, y, w, h);

    this.canvasCtx.restore();
  }

  Draw.prototype.switchEraserStatus = function () {
    this.config.erasing = !this.config.erasing;
  };

  Draw.prototype.disabledContextmenu = function (event) {
    event.preventDefault();
  };

  Draw.prototype.convertImg = function () {
    var backgroundImg = new Image();

    backgroundImg.addEventListener('load', function () {
      this.canvasCtx.drawImage(backgroundImg, 0, 0);
    }.bind(this));

    backgroundImg.src = this.config.backgroundImage;

    convertCanvasToImg(this.canvas, function (paintImg) {
      this.canvasCtx.drawImage(paintImg, 0, 0);
    }.bind(this));
  };

  Draw.prototype.getPos = function (event) {
    var eventX = hasTouch ? event.touches[0].clientX : event.clientX;
    var eventY = hasTouch ? event.touches[0].clientY : event.clientY;
    var elementEventPos = getElementEventPos(this.canvas, eventX, eventY);

    return {
      x: Math.floor(elementEventPos.x),
      y: Math.floor(elementEventPos.y)
    };
  }

  root.Draw = Draw;

})(window, document);
