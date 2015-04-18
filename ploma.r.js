/*
Ploma - High-fidelity ballpoint pen rendering for tablets with pressure-sensitive styluses
v0.4

Evelyn Eastmond
Dan Amelang
Viewpoints Research Institute

(c) 2014-2015

TODO: License
*/

"use strict"; // for strict mode

// ------------------------------------------
// Ploma
//
// Constructor for Ploma instances. Accepts
// an HTML <canvas> Element element to render
// strokes onto.
//
var Ploma = function(canvas) {

  // TESTING
  this.setA_SHADE = function(n) {
    A_SHADE = n;
    this.rerender();
  }

  this.setSTEP_VALUE = function(n) {
    STEP_VALUE = n;
    stepInterval = n;
    this.rerender();
  }

  this.setSLOPE_VALUE = function(n) {
    SLOPE_VALUE = n;
    this.rerender();
  }

  this.setSHIFT_VALUE = function(n) {
    SHIFT_VALUE = n;
    this.rerender();
  }

  this.setWIDTH_TO_USE = function(n) {
    WIDTH_TO_USE = n;
    this.rerender();
  }

  this.rerender = function(){
    // Deep copy the raw strokes
    var originalStrokes = this.strokes();
    var capturedRawStrokes = [];
    for(var i = 0; i < originalStrokes.length; i++) {
      capturedRawStrokes.push(originalStrokes[i]);
    }

    // Clear and set rendering to false
    this.clear();
    //applyRendering = !applyRendering;

    // Redraw all the strokes
    for(var i = 0; i < capturedRawStrokes.length; i++) {
      var stroke = capturedRawStrokes[i];
      this.beginStroke(
        stroke[0].x,
        stroke[0].y,
        stroke[0].p
      );
      for(var j = 1; j < stroke.length-1; j++) {
        this.extendStroke(
          stroke[j].x,
          stroke[j].y,
          stroke[j].p
        );
      }
      this.endStroke(
        stroke[stroke.length-1].x,
        stroke[stroke.length-1].y,
        stroke[stroke.length-1].p
      );
    }
  }
  // END TESTING

  //////////////////////////////////////////////
  // PUBLIC
  //////////////////////////////////////////////

  // ------------------------------------------
  // clear
  //
  // Clears the canvas.
  //
  this.clear = function() {
    // Clear canvas
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = paperColor;
    ctx.globalAlpha = 1;
    ctx.fillRect(0, 0, w, h);
    imageData = ctx.getImageData(0, 0, w, h);
    imageDataData = imageData.data;

    // Reset data
    rawStrokes = [];
    curRawStroke = [];
    curRawSampledStroke = [];
    filteredStrokes = [];
    curFilteredStroke = [];
    minx = 0.0;
    maxx = 0.0;
    miny = 0.0;
    maxy = 0.0;
    lastControlPoint = null;
    stepOffset = 0.0;
    pointCounter = 0;
  };

  // ------------------------------------------
  // beginStroke
  //
  // Begins a new stroke containing the given
  // point x, y and p (pressure ranging from
  // 0-1) values.
  //
  this.beginStroke = function(x, y, p) {
    
    var point = new Point(x,y,p);
    pointCounter++;

    curRawStroke = [point];
    rawStrokes.push(curRawStroke);
    curFilteredStroke = [point]
    filteredStrokes.push(curFilteredStroke);
    curRawSampledStroke = [point];

    // Get the latest canvas pixels in case
    // they've changed since the last stroke
    imageData = ctx.getImageData(0, 0, w, h);
    imageDataData = imageData.data;

    // Reset step offset for new stroke
    stepOffset = stepInterval;
    
  }

  // ------------------------------------------
  // extendStroke
  //
  // Extends the current stroke with the given
  // point and renders the new stroke segment
  // to the canvas.
  //
  this.extendStroke = function(x, y, p) {
    pointCounter++;
    
    var point = new Point(x,y,p);

    //
    // Raw
    //
    //if(curRawStroke.last().equals(point)) {
      //return; // ignore dupes TODO: ??
    //}
    curRawStroke.push(point);

    //
    // Sampled and filtered
    //
    if (pointCounter % sample === 0) {

      // Push sampled point
      //if(curRawSampledStroke.last().equals(point)) {
        //return; // ignore dupes TODO: ??
      //}
      curRawSampledStroke.push(point);

      // Filter next-to-last input point
      var len = curRawSampledStroke.length;
      if(len >= 3) {
        var fpoint = calculateFilteredPoint(
          curRawSampledStroke[len - 3],
          curRawSampledStroke[len - 2],
          curRawSampledStroke[len - 1]
        );
        //if(fpoint) {
          // Push sampled, filtered, point
          curFilteredStroke.push(fpoint);
        //}
      }

      // Redraw sampled and filtered
      redraw();
    }
    

  }

  // ------------------------------------------
  // endStroke
  //
  // Ends the current stroke with the given
  // point and renders the final stroke segment
  // to the canvas.
  //
  this.endStroke = function(x, y, p) {
    
    var point = new Point(x,y,p);

    // Keep the last point as is for now
    // TODO: Try to address the "tapering on mouseup" issue
    curRawStroke.push(point);
    curRawSampledStroke.push(point);
    curFilteredStroke.push(point);

    redraw();
    lastControlPoint = null;
    
  }

  // ------------------------------------------
  // strokes
  //
  // Returns an array of all strokes that have
  // been recorded, each stroke itself is an
  // array of point JSON objects.
  //
  // [
  //   [{x, y, p}, {x, y, p}, ...],
  //   [{x, y, p}, {x, y, p}, ...],
  //   ...
  // ]
  //
  this.strokes = function() {
    var strokes = [];
    for(var i = 0; i < rawStrokes.length; i++){
      var stroke = [];
      strokes.push(stroke);
      for(var j = 0; j < rawStrokes[i].length; j++) {
        stroke.push(rawStrokes[i][j].asObj());
      }
    }
    return strokes;
  };

  // ------------------------------------------
  // curStroke
  //
  // Returns the current stroke of points that
  // have been stored since the last mouse down
  // as an array of point JSON objects.
  //
  // [{x, y, p}, {x, y, p}, ...]
  //
  this.curStroke = function() {
    var curStroke = [];
    for(var i = 0; i < curRawStroke.length; i++) {
      curStroke.push(curRawStroke[i].asObj());
    }
    return curStroke;
  };

  // ------------------------------------------
  // setSample
  //
  // Sets the input sampling rate.
  //
  this.setSample = function(n) {
    sample = n;
  }

  // ------------------------------------------
  // resize
  //
  // Resize the Ploma instance to a new width
  // and height.
  //
  this.resize = function(a, b) {
    canvas.setAttribute('width', a);
    canvas.setAttribute('height', b);
    w = canvas.getAttribute('width');
    h = canvas.getAttribute('height');
    w_4 = w*4;
    this.clear();
  }

  // ------------------------------------------
  // toggleTexture
  //
  // Set texture on or off, and redraw all the
  // strokes.
  //
  this.toggleTexture = function() {
    // Deep copy the raw strokes
    /*var originalStrokes = this.strokes();
    var capturedRawStrokes = [];
    for(var i = 0; i < originalStrokes.length; i++) {
      capturedRawStrokes.push(originalStrokes[i]);
    }*/

    // Clear and set rendering to false
    //this.clear();
    applyRendering = !applyRendering;

    // Redraw all the strokes
    /*for(var i = 0; i < capturedRawStrokes.length; i++) {
      var stroke = capturedRawStrokes[i];
      this.beginStroke(
        stroke[0].x,
        stroke[0].y,
        stroke[0].p
      );
      for(var j = 1; j < stroke.length-1; j++) {
        this.extendStroke(
          stroke[j].x,
          stroke[j].y,
          stroke[j].p
        );
      }
      this.endStroke(
        stroke[stroke.length-1].x,
        stroke[stroke.length-1].y,
        stroke[stroke.length-1].p
      );
    }*/

  }

  //////////////////////////////////////////////
  // PRIVATE
  //////////////////////////////////////////////

  // DOM
  var canvas = canvas;
  var w = 0;
  var h = 0;
  var w_4 = 0;
  var ctx = canvas.getContext('2d');
  var imageData = null;
  var imageDataData = new Uint8ClampedArray(w * h);
  var paperColor = 'rgb(240, 238, 220)';
  //var paperColor = 'rgb(250, 240, 230)';
  //var paperColor = 'rgb(245, 230, 218)';
  w = canvas.getAttribute('width');
  h = canvas.getAttribute('height');
  w_4 = w * 4;
  ctx.imageSmoothingEnabled = false;
  imageData = ctx.getImageData(0, 0, w, h);
  imageDataData = imageData.data;

  // TESTING
  var STEP_VALUE = 2;
  var SLOPE_VALUE = 0.56;
  var SHIFT_VALUE = 0.26;
  var A_SHADE = 0.85;
  var WIDTH_TO_USE = 0.57;
  // END TESTING

  // State
  var rawStrokes = [];
  var curRawStroke = [];
  var curRawSampledStroke = [];
  var filteredStrokes = [];
  var curFilteredStroke = [];
  var minx = 0.0;
  var maxx = 0.0;
  var miny = 0.0;
  var maxy = 0.0;
  var textureSampleStep = 0;
  var textureSamplesLength = 1e5;
  var lastControlPoint = null;
  var filterWeight = 0.5;
  var filterWeightInverse = 1 - filterWeight;
  var stepOffset = 0.0;
  var stepInterval = STEP_VALUE;
  var penR = 17;
  var penG = 3;
  var penB = 37;
  var pointCounter = 0;
  var sample = 2;
  var applyRendering = true;

  // Generate Texture Samples
  var textureSampleLocations = [];
  var inkTextureImageDataGrays = [];
  var inkTextureImage = getImageFromBase64(inkTextureBase64(), "jpeg")
  var inkTextureSamples = new Float32Array(textureSamplesLength);
  getSamplesFromImage(inkTextureImage, inkTextureSamples);

  // ------------------------------------------
  // redraw
  //
  // Calls the curve drawing function if there
  // are enough points for a bezier.
  //
  function redraw() {
    // TODO:
    // - Handle single point and double point strokes

    // 3 points needed for a look-ahead bezier
    var len = curFilteredStroke.length;
    if(len >= 3) {
      createAndDrawBezier(
        curFilteredStroke[len - 3],
        curFilteredStroke[len - 2],
        curFilteredStroke[len - 1]
      );
    }
  };

  // ------------------------------------------
  // createAndDrawBezier
  //
  // Draw a look-ahead cubic bezier based on 3
  // input points.
  //
  function createAndDrawBezier(pt0, pt1, pt2) {
    // Endpoints and control points
    var p0 = pt0;
    var p1 = 0.0;
    var p2 = 0.0;
    var p3 = pt1;

    // Value access
    var p0_x = p0.x;
    var p0_y = p0.y;
    var p0_p = p0.p;
    var p3_x = p3.x;
    var p3_y = p3.y;
    var p3_p = p3.p;

    // Calculate p1
    if(!lastControlPoint) {
      p1 = new Point(
        p0_x + (p3_x - p0_x) * 0.33,
        p0_y + (p3_y - p0_y) * 0.33,
        p0_p + (p3_p - p0_p) * 0.33
      );
    } else {
      p1 = lastControlPoint.getMirroredPt(p0);
    }

    // Calculate p2
    if (pt2) {
      p2 = new Point(
        //p3_x - (((p3_x - p0_x) + (pt2.x - p3_x)) / 6),
        //p3_y - (((p3_y - p0_y) + (pt2.y - p3_y)) / 6),
        //p3_p - (((p3_p - p0_p) + (pt2.p - p3_p)) / 6)
        p3_x - (((p3_x - p0_x) + (pt2.x - p3_x)) * 0.1666),
        p3_y - (((p3_y - p0_y) + (pt2.y - p3_y)) * 0.1666),
        p3_p - (((p3_p - p0_p) + (pt2.p - p3_p)) * 0.1666)
      );
    } else {
      p2 = new Point(
        p0_x + (p3_x - p0_x) * 0.66,
        p0_y + (p3_y - p0_y) * 0.66,
        p0_p + (p3_p - p0_p) * 0.66
      );
    }

    // Set last control point
    lastControlPoint = p2;

    // Step along curve and draw step
    var stepPoints = calculateStepPoints(p0, p1, p2, p3);
    for(var i = 0; i < stepPoints.length; i++) {
      drawStep(imageDataData, stepPoints[i]);
    }

    // Calculate redraw bounds
    // TODO:
    // - Math.min = x <= y ? x : y; INLINE
    var p1_x = p1.x;
    var p1_y = p1.y;
    var p2_x = p2.x;
    var p2_y = p2.y;
    minx = Math.min(p0_x, p1_x, p2_x, p3_x);
    miny = Math.min(p0_y, p1_y, p2_y, p3_y);
    maxx = Math.max(p0_x, p1_x, p2_x, p3_x);
    maxy = Math.max(p0_y, p1_y, p2_y, p3_y);

    // Put image using a crude dirty rect
    //elapsed = Date.now() - elapsed;
    //console.log(elapsed);
    ctx.putImageData(
      imageData,
      0,
      0,
      minx - 5,
      miny - 5,
      (maxx - minx) + 10,
      (maxy - miny) + 10
    );
  }

  // ------------------------------------------
  // calculateStepPoints
  //
  // Calculates even steps along a bezier with
  // control points (p0, p1, p2, p3).
  //
  function calculateStepPoints(p0, p1, p2, p3) {
    var stepPoints = [];
    var i = stepInterval;

    // Value access
    var p0_x = p0.x;
    var p0_y = p0.y;
    var p0_p = p0.p;

    // Algebraic conveniences, not geometric
    var A_x = p3.x - 3 * p2.x + 3 * p1.x - p0_x;
    var A_y = p3.y - 3 * p2.y + 3 * p1.y - p0_y;
    var A_p = p3.p - 3 * p2.p + 3 * p1.p - p0_p;
    var B_x = 3 * p2.x - 6 * p1.x + 3 * p0_x;
    var B_y = 3 * p2.y - 6 * p1.y + 3 * p0_y;
    var B_p = 3 * p2.p - 6 * p1.p + 3 * p0_p;
    var C_x = 3 * p1.x - 3 * p0_x;
    var C_y = 3 * p1.y - 3 * p0_y;
    var C_p = 3 * p1.p - 3 * p0_p;

    var t = (i - stepOffset) / Math.sqrt(C_x * C_x + C_y * C_y);

    while (t <= 1.0) {
      // Point
      var step_x = t * (t * (t * A_x + B_x) + C_x) + p0_x;
      var step_y = t * (t * (t * A_y + B_y) + C_y) + p0_y;
      var step_p = t * (t * (t * A_p + B_p) + C_p) + p0_p;
      stepPoints.push(new Point(
        step_x,
        step_y,
        step_p
      ));

      // Step distance until next one
      var s_x = t * (t * 3 * A_x + 2 * B_x) + C_x; // dx/dt
      var s_y = t * (t * 3 * A_y + 2 * B_y) + C_y; // dy/dt
      var s = Math.sqrt(s_x * s_x + s_y * s_y); // s = derivative in 2D space
      var dt = i / s; // i = interval / derivative in 2D
      t = t + dt;
    }

    // TODO: Maybe use a better approximation for distance along the bezier?
    if (stepPoints.length == 0) // We didn't step at all along this Bezier
      stepOffset = stepOffset + p0.getDistance(p3);
    else
      stepOffset = stepPoints.last().getDistance(p3);

    return stepPoints;
  }

  // ------------------------------------------
  // calculateFilteredPoint
  //
  // Returns a filtered, sanitized version of 
  // point p2 between points p1 and p3.
  //
  function calculateFilteredPoint(p1, p2, p3) {
    //if (p1 == null || p2 == null || p3 == null)
    //  return null; // Not enough points yet to filter

    var m = p1.getMidPt(p3);

    return new Point(
      filterWeight * p2.x + filterWeightInverse * m.x,
      filterWeight * p2.y + filterWeightInverse * m.y,
      filterWeight * p2.p + filterWeightInverse * m.p
    );
  }

  // ------------------------------------------
  // calculateWidth
  //
  // Calculates a non-linear width offset in
  // the range [-2, 1] based on pressure.
  //
  function calculateWidth(p) {
    var width = 0.0;
    //console.log(p);

    if(p < 0) { // Possible output from bezier
      width = -50.00;
    }
    if(p < 0.2) {
      width = map(p, 0, 0.2, -50.00, -3.00);
    } 
    if((p >= 0.2) && (p < 0.45)) {
      width = map(p, 0.2, 0.45, -3.00, -1.00);
    }
    if((p >= 0.45) && (p < 0.8)) {
      width = map(p, 0.45, 0.8, -1.00, 0.10);
    }
    if((p >= 0.8) && (p < 0.95)) {
      width = map(p, 0.8, 0.95,  0.10, 0.55);
    }
    if((p >= 0.95) && (p <= 1)) {
      width = map(p, 0.95, 1, 0.55, 0.80);
    }
    if(p > 1) { // Possible output from bezier
      width = 0.80;
    }

    return width;
  }

  // ------------------------------------------
  // drawStep
  //
  // Draws a 5x5 pixel grid at a step point
  // with proper antialiasing and texture.
  //
  function drawStep(id, point) {

    /////////////////////
    // PRE-LOOP
    /////////////////////

    var width = 0.0;
    width = calculateWidth(point.p);
    width = WIDTH_TO_USE;

    /////////////////////
    // LOOP
    /////////////////////

    var p_x = 0.0;
    var p_y = 0.0;
    var p_p = 0.0;
    var centerX = 0.0;
    var centerY = 0.0;
    var i = 0;
    var j = 0;
    var left = 0;
    var right = 0;
    var top = 0;
    var bottom = 0; 
    var dx = 0.0;
    var dy = 0.0;
    var dist = 0.0;
    var t = 0.0;
    var a = 0.0;
    var invA = 0.0;
    var idx_0 = 0;
    var idx_1 = 0;
    var idx_2 = 0;
    var idx_3 = 0;
    var idx_0_i = 0;
    var oldR = 0.0;
    var oldG = 0.0;
    var oldB = 0.0;
    var oldA = 0.0;
    var newR = 0.0;
    var newG = 0.0;
    var newB = 0.0;
    var newA = 0.0;

    p_x = point.x;
    p_y = point.y;
    p_p = point.p;
    centerX = Math.round(p_x);
    centerY = Math.round(p_y);
    left = centerX - 2;
    right = centerX + 3;
    top = centerY - 2;
    bottom = centerY + 3;

    // Step around inside the texture before the loop
    textureSampleStep = (textureSampleStep === textureSampleLocations.length - 1) ? 0 : (textureSampleStep + 1);

    //////////////
    // Horizontal
    //////////////
    for(i = left; i < right; i++) {

      // Distance
      dx = p_x - i;

      // Byte-index
      idx_0_i = i * 4;

      ////////////
      // Vertical
      ////////////
      for(j = top; j < bottom; j++) {

        // Distance
        dy = p_y - j;
        dist = Math.sqrt(dx * dx + dy * dy);

        // Byte-index
        idx_0 = idx_0_i + j * w_4;

        // Antialiasing
        //var test = 0.11 + 0.045*(p_p*p_p);
        //a = applyRendering ? (0.55 / (dist - width)) - 0.39 : (0.40 / (dist - width)) - 0.3;
        a = applyRendering ? (0.55 / (dist - width)) - 0.39 : (SLOPE_VALUE / (dist - width)) - SHIFT_VALUE;
        //a = 1 - (dist/2);
        //a = width*dist*dist+1;
        //a = -0.05*(dist+3)*(dist+3)+1.2
        //a = 0.05*(dist-5)*(dist-5)-0.4
        //a = 0.05*(dist-5.2)*(dist-5.2)-0.45
        a = SLOPE_VALUE*(dist-5.4)*(dist-5.2)-SHIFT_VALUE

        // Spike
        //if(dist < width) {
        //  a = 1;
        //}
        if(dist > 2.17) {
          a = 0;
        }
        
        // Clamp alpha
        if (a < 0) a = 0;
        if (a >= 1) a = 1;

        // Get new texture sample offset at center
        var textureX = textureSampleLocations[textureSampleStep].x + (i - centerX);
        var textureY = textureSampleLocations[textureSampleStep].y + (j - centerY);
        // Get normalized pixel within texture
        var T_s = textureX / (inkTextureImage.width - 1);
        var T_t = textureY / (inkTextureImage.height - 1);
        var s = Math.abs(Math.abs(T_s - 1) % 2 - 1);
        var t = Math.abs(Math.abs(T_t - 1) % 2 - 1);
        var x = Math.floor(s * (inkTextureImage.width - 1));
        var y = Math.floor(t * (inkTextureImage.height - 1));
        var textureValue = inkTextureImageDataGrays[x + y * inkTextureImage.width];

        // Apply texture
        //textureValue *= 0.8;
        if(a > A_SHADE) {
          a *= applyRendering ? 0.9 : A_SHADE;
        }
        //a *= textureValue;

        // Grain
        //var g = map(p_p, 0, 1, 0.7, 0.3);
        //var prob = 1-(p_p*p_p*p_p*p_p*p_p); // 1 - x^4
        //g = Math.floor(Math.random()*prob*2) === 1 ? 0 : g;
        //a *= applyRendering ? g : 1;

        // Blending vars
        invA = 1 - a;
        idx_1 = idx_0 + 1;
        idx_2 = idx_0 + 2;
        idx_3 = idx_0 + 3;
        oldR = id[idx_0];
        oldG = id[idx_1];
        oldB = id[idx_2];
        oldA = id[idx_3] / 255;

        // Transparent vs. opaque background
        if(oldA === 1) {
          newR = penR * a + oldR * invA;
          newG = penG * a + oldG * invA;
          newB = penB * a + oldB * invA;
        } else {
          newA = a + oldA * invA;
          newR = (penR * a + oldR * oldA * invA) / newA;
          newG = (penG * a + oldG * oldA * invA) / newA;
          newB = (penB * a + oldB * oldA * invA) / newA;
          newA = newA * 255;
          // Set new A
          id[idx_3] = newA;
        }

        // Set new RGB
        id[idx_0] = newR;
        id[idx_1] = newG;
        id[idx_2] = newB;

      }
    }
  }

  // ------------------------------------------
  // POINT
  //
  function Point(x, y, p) {
    this.x = x; // x-coordinate
    this.y = y; // y-coordinate
    this.p = p; // pressure
  }

  Point.prototype.equals = function(pt) {
    return pt && this.x === pt.x && this.y === pt.y && this.p === pt.p;
  }

  Point.prototype.getMidPt = function(pt) {
    return new Point(
      (this.x + pt.x) / 2,
      (this.y + pt.y) / 2,
      (this.p + pt.p) / 2
    );
  }

  Point.prototype.getMirroredPt = function(pt) {
    return new Point(
      this.x + 2 * (pt.x - this.x),
      this.y + 2 * (pt.y - this.y),
      this.p + 2 * (pt.p - this.p)
    );
  }

  Point.prototype.getDistance = function(pt) {
    // TODO: use Manhattan distance?
    var dx = this.x - pt.x;
    var dy = this.y - pt.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  Point.prototype.asArray = function() {
    return [this.x, this.y, this.p];
  }

  Point.prototype.asObj = function() {
    return {
      x: this.x,
      y: this.y,
      p: this.p
    };
  }

  // ------------------------------------------
  // UTILS
  //
  Array.prototype.last = function(){
    return this[this.length - 1];
  }

  function map(value, valueMin, valueMax, from, to) {
    var ratio = (value - valueMin) / (valueMax - valueMin);
    return from + ratio * (to - from);
  }

  // ------------------------------------------
  // TEXTURE
  //

  function inkTextureBase64() {
    // texturelight
    //return "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"; 
    // texturelight9
    //return "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AAAAAAAAC2Nyb3BSZWN0VG9wbG9uZwAAAAAAOEJJTQPtAAAAAAAQAEgAAAABAAEASAAAAAEAAThCSU0EJgAAAAAADgAAAAAAAAAAAAA/gAAAOEJJTQQNAAAAAAAEAAAAHjhCSU0EGQAAAAAABAAAAB44QklNA/MAAAAAAAkAAAAAAAAAAAEAOEJJTScQAAAAAAAKAAEAAAAAAAAAAThCSU0D9QAAAAAASAAvZmYAAQBsZmYABgAAAAAAAQAvZmYAAQChmZoABgAAAAAAAQAyAAAAAQBaAAAABgAAAAAAAQA1AAAAAQAtAAAABgAAAAAAAThCSU0D+AAAAAAAcAAA/////////////////////////////wPoAAAAAP////////////////////////////8D6AAAAAD/////////////////////////////A+gAAAAA/////////////////////////////wPoAAA4QklNBAgAAAAAABAAAAABAAACQAAAAkAAAAAAOEJJTQQeAAAAAAAEAAAAADhCSU0EGgAAAAADTwAAAAYAAAAAAAAAAAAAAIsAAAAsAAAADQB0AGUAeAB0AHUAcgBlAGwAaQBnAGgAdAA4AAAAAQAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAsAAAAiwAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAABAAAAABAAAAAAAAbnVsbAAAAAIAAAAGYm91bmRzT2JqYwAAAAEAAAAAAABSY3QxAAAABAAAAABUb3AgbG9uZwAAAAAAAAAATGVmdGxvbmcAAAAAAAAAAEJ0b21sb25nAAAAiwAAAABSZ2h0bG9uZwAAACwAAAAGc2xpY2VzVmxMcwAAAAFPYmpjAAAAAQAAAAAABXNsaWNlAAAAEgAAAAdzbGljZUlEbG9uZwAAAAAAAAAHZ3JvdXBJRGxvbmcAAAAAAAAABm9yaWdpbmVudW0AAAAMRVNsaWNlT3JpZ2luAAAADWF1dG9HZW5lcmF0ZWQAAAAAVHlwZWVudW0AAAAKRVNsaWNlVHlwZQAAAABJbWcgAAAABmJvdW5kc09iamMAAAABAAAAAAAAUmN0MQAAAAQAAAAAVG9wIGxvbmcAAAAAAAAAAExlZnRsb25nAAAAAAAAAABCdG9tbG9uZwAA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b9J/28kpWGzIufdZWZrdtLd0bXmY9vqO3sexrf8Ai971pfZx6XpemPS/ej3x9D0v63+D3+p/NLJG33/zU7hP2zd6P0h/Y9T9zYtn37e/H8nw/wDbfd/r6aSn/9kAOEJJTQQhAAAAAABdAAAAAQEAAAAPAEEAZABvAGIAZQAgAFAAaABvAHQAbwBzAGgAbwBwAAAAFwBBAGQAbwBiAGUAIABQAGgAbwB0AG8AcwBoAG8AcAAgAEMAQwAgADIAMAAxADQAAAABADhCSU0EBgAAAAAABwAIAAAAAQEA/+EN2Gh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8APD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS42LWMwMTQgNzkuMTU2Nzk3LCAyMDE0LzA4LzIwLTA5OjUzOjAyICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIiB4bWxuczpwaG90b3Nob3A9Imh0dHA6Ly9ucy5hZG9iZS5jb20vcGhvdG9zaG9wLzEuMC8iIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIgeG1wTU06RG9jdW1lbnRJRD0iYWRvYmU6ZG9jaWQ6cGhvdG9zaG9wOjY1YWEwNTI0LTI0YTEtMTE3OC1iMGQ2LWExMWNmNjE1OTFkOCIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDowODYzZGVkYy05M2ZhLTRmNmMtYWVmMC0wMmI1MWZkZWNlYjYiIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0iQ0U5N0M4QjFGQTkzQzYzQzcxRUNEN0VGODk1MjRBM0EiIGRjOmZvcm1hdD0iaW1hZ2UvanBlZyIgcGhvdG9zaG9wOkNvbG9yTW9kZT0iMyIgcGhvdG9zaG9wOklDQ1Byb2ZpbGU9InNSR0IgSUVDNjE5NjYtMi4xIiB4bXA6Q3JlYXRlRGF0ZT0iMjAxNS0wMy0yNlQxNToyMzoyNy0wNDowMCIgeG1wOk1vZGlmeURhdGU9IjIwMTUtMDQtMTZUMTU6MDI6MTUtMDQ6MDAiIHhtcDpNZXRhZGF0YURhdGU9IjIwMTUtMDQtMTZUMTU6MDI6MTUtMDQ6MDAiPiA8eG1wTU06SGlzdG9yeT4gPHJkZjpTZXE+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJzYXZlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDo2ZjA0N2M2Yi0yOWU0LTRjODUtOWQ3Yi00OTI3ZDJkNjczNDQiIHN0RXZ0OndoZW49IjIwMTUtMDQtMTZUMTU6MDI6MTUtMDQ6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCBDQyAyMDE0IChNYWNpbnRvc2gpIiBzdEV2dDpjaGFuZ2VkPSIvIi8+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJzYXZlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDowODYzZGVkYy05M2ZhLTRmNmMtYWVmMC0wMmI1MWZkZWNlYjYiIHN0RXZ0OndoZW49IjIwMTUtMDQtMTZUMTU6MDI6MTUtMDQ6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCBDQyAyMDE0IChNYWNpbnRvc2gpIiBzdEV2dDpjaGFuZ2VkPSIvIi8+IDwvcmRmOlNlcT4gPC94bXBNTTpIaXN0b3J5PiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8P3hwYWNrZXQgZW5kPSJ3Ij8+/+IMWElDQ19QUk9GSUxFAAEBAAAMSExpbm8CEAAAbW50clJHQiBYWVogB84AAgAJAAYAMQAAYWNzcE1TRlQAAAAASUVDIHNSR0IAAAAAAAAAAAAAAAAAAPbWAAEAAAAA0y1IUCAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAARY3BydAAAAVAAAAAzZGVzYwAAAYQAAABsd3RwdAAAAfAAAAAUYmtwdAAAAgQAAAAUclhZWgAAAhgAAAAUZ1hZWgAAAiwAAAAUYlhZWgAAAkAAAAAUZG1uZAAAAlQAAABwZG1kZAAAAsQAAACIdnVlZAAAA0wAAACGdmlldwAAA9QAAAAkbHVtaQAAA/gAAAAUbWVhcwAABAwAAAAkdGVjaAAABDAAAAAMclRSQwAABDwAAAgMZ1RSQwAABDwAAAgMYlRSQwAABDwAAAgMdGV4dAAAAABDb3B5cmlnaHQgKGMpIDE5OTggSGV3bGV0dC1QYWNrYXJkIENvbXBhbnkAAGRlc2MAAAAAAAAAEnNSR0IgSUVDNjE5NjYtMi4xAAAAAAAAAAAAAAASc1JHQiBJRUM2MTk2Ni0yLjEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFhZWiAAAAAAAADzUQABAAAAARbMWFlaIAAAAAAAAAAAAAAAAAAAAABYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9kZXNjAAAAAAAAABZJRUMgaHR0cDovL3d3dy5pZWMuY2gAAAAAAAAAAAAAABZJRUMgaHR0cDovL3d3dy5pZWMuY2gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAZGVzYwAAAAAAAAAuSUVDIDYxOTY2LTIuMSBEZWZhdWx0IFJHQiBjb2xvdXIgc3BhY2UgLSBzUkdCAAAAAAAAAAAAAAAuSUVDIDYxOTY2LTIuMSBEZWZhdWx0IFJHQiBjb2xvdXIgc3BhY2UgLSBzUkdCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGRlc2MAAAAAAAAALFJlZmVyZW5jZSBWaWV3aW5nIENvbmRpdGlvbiBpbiBJRUM2MTk2Ni0yLjEAAAAAAAAAAAAAACxSZWZlcmVuY2UgVmlld2luZyBDb25kaXRpb24gaW4gSUVDNjE5NjYtMi4xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB2aWV3AAAAAAATpP4AFF8uABDPFAAD7cwABBMLAANcngAAAAFYWVogAAAAAABMCVYAUAAAAFcf521lYXMAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAKPAAAAAnNpZyAAAAAAQ1JUIGN1cnYAAAAAAAAEAAAAAAUACgAPABQAGQAeACMAKAAtADIANwA7AEAARQBKAE8AVABZAF4AYwBoAG0AcgB3AHwAgQCGAIsAkACVAJoAnwCkAKkArgCyALcAvADBAMYAywDQANUA2wDgAOUA6wDwAPYA+wEBAQcBDQETARkBHwElASsBMgE4AT4BRQFMAVIBWQFgAWcBbgF1AXwBgwGLAZIBmgGhAakBsQG5AcEByQHRAdkB4QHpAfIB+gIDAgwCFAIdAiYCLwI4AkECSwJUAl0CZwJxAnoChAKOApgCogKsArYCwQLLAtUC4ALrAvUDAAMLAxYDIQMtAzgDQwNPA1oDZgNyA34DigOWA6IDrgO6A8cD0wPgA+wD+QQGBBMEIAQtBDsESARVBGMEcQR+BIwEmgSoBLYExATTBOEE8AT+BQ0FHAUrBToFSQVYBWcFdwWGBZYFpgW1BcUF1QXlBfYGBgYWBicGNwZIBlkGagZ7BowGnQavBsAG0QbjBvUHBwcZBysHPQdPB2EHdAeGB5kHrAe/B9IH5Qf4CAsIHwgyCEYIWghuCIIIlgiqCL4I0gjnCPsJEAklCToJTwlkCXkJjwmkCboJzwnlCfsKEQonCj0KVApqCoEKmAquCsUK3ArzCwsLIgs5C1ELaQuAC5gLsAvIC+EL+QwSDCoMQwxcDHUMjgynDMAM2QzzDQ0NJg1ADVoNdA2ODakNww3eDfgOEw4uDkkOZA5/DpsOtg7SDu4PCQ8lD0EPXg96D5YPsw/PD+wQCRAmEEMQYRB+EJsQuRDXEPURExExEU8RbRGMEaoRyRHoEgcSJhJFEmQShBKjEsMS4xMDEyMTQxNjE4MTpBPFE+UUBhQnFEkUahSLFK0UzhTwFRIVNBVWFXgVmxW9FeAWAxYmFkkWbBaPFrIW1hb6Fx0XQRdlF4kXrhfSF/cYGxhAGGUYihivGNUY+hkgGUUZaxmRGbcZ3RoEGioaURp3Gp4axRrsGxQbOxtjG4obshvaHAIcKhxSHHscoxzMHPUdHh1HHXAdmR3DHeweFh5AHmoelB6+HukfEx8+H2kflB+/H+ogFSBBIGwgmCDEIPAhHCFIIXUhoSHOIfsiJyJVIoIiryLdIwojOCNmI5QjwiPwJB8kTSR8JKsk2iUJJTglaCWXJccl9yYnJlcmhya3JugnGCdJJ3onqyfcKA0oPyhxKKIo1CkGKTgpaymdKdAqAio1KmgqmyrPKwIrNitpK50r0SwFLDksbiyiLNctDC1BLXYtqy3hLhYuTC6CLrcu7i8kL1ovkS/HL/4wNTBsMKQw2zESMUoxgjG6MfIyKjJjMpsy1DMNM0YzfzO4M/E0KzRlNJ402DUTNU01hzXCNf02NzZyNq426TckN2A3nDfXOBQ4UDiMOMg5BTlCOX85vDn5OjY6dDqyOu87LTtrO6o76DwnPGU8pDzjPSI9YT2hPeA+ID5gPqA+4D8hP2E/oj/iQCNAZECmQOdBKUFqQaxB7kIwQnJCtUL3QzpDfUPARANER0SKRM5FEkVVRZpF3kYiRmdGq0bwRzVHe0fASAVIS0iRSNdJHUljSalJ8Eo3Sn1KxEsMS1NLmkviTCpMcky6TQJNSk2TTdxOJU5uTrdPAE9JT5NP3VAnUHFQu1EGUVBRm1HmUjFSfFLHUxNTX1OqU/ZUQlSPVNtVKFV1VcJWD1ZcVqlW91dEV5JX4FgvWH1Yy1kaWWlZuFoHWlZaplr1W0VblVvlXDVchlzWXSddeF3JXhpebF69Xw9fYV+zYAVgV2CqYPxhT2GiYfViSWKcYvBjQ2OXY+tkQGSUZOllPWWSZedmPWaSZuhnPWeTZ+loP2iWaOxpQ2maafFqSGqfavdrT2una/9sV2yvbQhtYG25bhJua27Ebx5veG/RcCtwhnDgcTpxlXHwcktypnMBc11zuHQUdHB0zHUodYV14XY+dpt2+HdWd7N4EXhueMx5KnmJeed6RnqlewR7Y3vCfCF8gXzhfUF9oX4BfmJ+wn8jf4R/5YBHgKiBCoFrgc2CMIKSgvSDV4O6hB2EgITjhUeFq4YOhnKG14c7h5+IBIhpiM6JM4mZif6KZIrKizCLlov8jGOMyo0xjZiN/45mjs6PNo+ekAaQbpDWkT+RqJIRknqS45NNk7aUIJSKlPSVX5XJljSWn5cKl3WX4JhMmLiZJJmQmfyaaJrVm0Kbr5wcnImc951kndKeQJ6unx2fi5/6oGmg2KFHobaiJqKWowajdqPmpFakx6U4pammGqaLpv2nbqfgqFKoxKk3qamqHKqPqwKrdavprFys0K1ErbiuLa6hrxavi7AAsHWw6rFgsdayS7LCszizrrQltJy1E7WKtgG2ebbwt2i34LhZuNG5SrnCuju6tbsuu6e8IbybvRW9j74KvoS+/796v/XAcMDswWfB48JfwtvDWMPUxFHEzsVLxcjGRsbDx0HHv8g9yLzJOsm5yjjKt8s2y7bMNcy1zTXNtc42zrbPN8+40DnQutE80b7SP9LB00TTxtRJ1MvVTtXR1lXW2Ndc1+DYZNjo2WzZ8dp22vvbgNwF3IrdEN2W3hzeot8p36/gNuC94UThzOJT4tvjY+Pr5HPk/OWE5g3mlucf56noMui86Ubp0Opb6uXrcOv77IbtEe2c7ijutO9A78zwWPDl8XLx//KM8xnzp/Q09ML1UPXe9m32+/eK+Bn4qPk4+cf6V/rn+3f8B/yY/Sn9uv5L/tz/bf///+4ADkFkb2JlAGRAAAAAAf/bAIQAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQICAgICAgICAgICAwMDAwMDAwMDAwEBAQEBAQEBAQEBAgIBAgIDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMD/8AAEQgAiwAsAwERAAIRAQMRAf/dAAQABv/EAaIAAAAGAgMBAAAAAAAAAAAAAAcIBgUECQMKAgEACwEAAAYDAQEBAAAAAAAAAAAABgUEAwcCCAEJAAoLEAACAQMEAQMDAgMDAwIGCXUBAgMEEQUSBiEHEyIACDEUQTIjFQlRQhZhJDMXUnGBGGKRJUOhsfAmNHIKGcHRNSfhUzaC8ZKiRFRzRUY3R2MoVVZXGrLC0uLyZIN0k4Rlo7PD0+MpOGbzdSo5OkhJSlhZWmdoaWp2d3h5eoWGh4iJipSVlpeYmZqkpaanqKmqtLW2t7i5usTFxsfIycrU1dbX2Nna5OXm5+jp6vT19vf4+foRAAIBAwIEBAMFBAQEBgYFbQECAxEEIRIFMQYAIhNBUQcyYRRxCEKBI5EVUqFiFjMJsSTB0UNy8BfhgjQlklMYY0TxorImNRlUNkVkJwpzg5NGdMLS4vJVZXVWN4SFo7PD0+PzKRqUpLTE1OT0laW1xdXl9ShHV2Y4doaWprbG1ub2Z3eHl6e3x9fn90hYaHiImKi4yNjo+DlJWWl5iZmpucnZ6fkqOkpaanqKmqq6ytrq+v/aAAwDAQACEQMRAD8ANP3Di9n47fTbEoesN09wU+UzkeSyu7tuff8AYdPkjQUYpNibHosjUClze1cRR1cK1GRpYXpsVX/eRKHNDNPr917pqxfT1LteLcnY3VeS6s3tQ5fbsQ3Dsj5BUG74d+0Yqhmshl917cwdbk6iKklrq+aI0NFRY9KcxxMaeeCEKT7r3ULca7J29trITYbtCTaeBQVVTL1ZFgK7rbd+PMZhp93ZLHQ0dRkcx/cjK5KKZccw21UZTzLLEz0qk2917qDgNk5CoyOwE6t27uzcW89w7K1ZLaVZJ2PszZke4KavFJDg6vc2epcxRk0mGkE1PPB/D62nTyVGmnDJF7917oSaLL7sxUlL3DUdPbX6ozm1c3kIM7LtnI767HzpyWUT7aRkkrcSlH15javI4WSm8eMrKqKo1VE1SPK8sPv3XujLf7MDuX/RH/e3/ZZMr/om1af7/wD98tg/dfa/bfxP+/f8A+w+x/ud9p/uJ8Ov+J/xL/IPsvsf8v8Afuvdf//QPz8i/kl2fitgb5i2jsjb2UxsL7Hizu/tqbao5trbLiy+Peio3pU3BX4HemR3l/E6WF6iGKhyK4OClandnqFKj3XuqpKyu3VldzQ57tPcctbmuzMtV1Oxs7S7Uxu78/2DkRJi8NRQ0+QoZdr7ww1BWyVVFDAHqcQsUk8DtTFNRb3Xuh96tffHVNfhcLvvb/V/ScW8K+qqanvfs/DY3cG5crtLFZ9YpP7ubPzmaytHsuo25nVo40qaSPK0+tUqqqBkjd3917pT5ndncGVZa/Abp7S31sPE7wp8XXYTMb9qNw7H7RTE56V8p2eu+tn4qDIbSo6yT7gSYHbtTR0eGo6FUhiSn84k917oy+yclvncUbYPq2Ts2TelBNuKgodl74iw+0+s6GihNXl6na1H3Ju/a+b7QTbwys8LUeQSirqh46lzCq6Xih917o2X+hjtT/RJ/cPw7I8X94/7y/3R/wBLvZnk/vx/FP7z/wB1f9Knk/vP/Av47+5b+H/dfb+j/Nfte/de6//Rsq3vvD5IdmwZzYOO6yw3WNJunO5HJ7jzk9Znc7ndwUWGnp8bQZjYrZXF1u3spS5qrlo5kxCuWhVZqWUwGoWp9+690U//AEQd+vkN14pu0f8AR3T5GsyVBtuOigpcxDv7EbKocVRL2HjN4PkZMRt54oqmdaykbMU01ZUU8n2+mSEiT3Xusm7Pi52xu7buMxmH3/113Lius5ttfb4PcOSkrxs/K0OJnzUdXQZTAbfwe26zbFVhM5U+TD5WtIkycq08eQkl8Rg917oMJsfuaGvxtb8bqukgwW5pNw19U9FsTcCEVVfSrU4yvoKLH7Sz7QbaaD7mKnGWSSlMdAFimT9tl917oUNhwbM7SwW8E747gTs3G9Rbgml2X2nJkaLEbh2Rmo6aHKRnEUUG4cJDQbxo9ywQNS46dK4iD7WeF4VWpX37r3VnH+lfo/8A0B/6Vv8AZgdz/wCj6/h/vd/e+b+8Xk838C/u/wDY+HX/ABf+Meu3g8/k9Xl+09+691//0rZN8YDdu7sDNsrtLvfs/q2kGGkyuOr5sJs6vzlVTUC1Mdfkoc1TbOxRqVglrFjpI4kbKvAyvURR1iU88XuvdVw1E/VNPvyXrvA/IfBduLgzgYNp4zG7Azm18NtrEoYYcJh9iZnEVn9x89XSz5OmrWxFBhp4sxlESkJLxyTRe691gp+yu9cDV7n2DiOltjb0yWI3ZJn967exfX/YfSmLpIaXK09BtHdNRhf7x5mhrJdwbmx0mbaqjopamjkRYKr7kOs7e691OzW2d4763ecZjMXvah7fzNXi9/bs652H2XvTau6NydZZPHVeMUUWT2juCWow+0Zq2qjqo56Gshq5ZIampp6VFkliPuvdH7g6j6p320Oa7Z6p3Fkd1yU22aGr3PRTUO7940gp81lDhMY+Ryu0dtbyxIxeUoJVmxddR/fPNlpKeNammLavde6X3+g/ZX91/wC+n8W2B/eT777/APvn/B9yfxX+Cf3k0fwT+N/e6f479h+z9h/D/udP+4z/AIC/ve/de6//07R+6ezNg7qzWB2xkIew9j9uU+UxNJjd5dbUNd2HiduYWChyVHid5Z3LU1Odm0OJwmcz1VPPQpIK8pCJIJL+Fh7r3RVuvKfanTG9mx+z+1sTWRdn5mumwnZeT25svPYiUZda7JZ3eLbgoqLb2ApYsijXq6aGDGxq1Z9ohglZ3b3XukVje/c8299gbQ3HuvaHXe8cjBW4Ru2MttbK7J6qyucoyq4PHCj2pksud/4HMRV70Mk+XroY0l0SPYrBG/uvdCsu3vlp8u9x5XFbsy46fba4raqiptg4Cno8Nu/bmNpKWDDVeP3xXZnCboz9Hm8/QPFQ1UU+IEcMwM8Pjk00/uvdC5P0jDu7ZrbY7O7Al6p3thcBRUMdHRbqy9duncNFSV8h2/2ZX7dirsPU7RzWNp6FI6itpjV1UlNAfuahpoIZx7r3SG/0E7B/vf8A7LJ/pT7o/wBH395v7+fcf3u33/AP4X/cD+8394P7yaP9G393b/5f/D/H5P4p/luq37nv3Xuv/9S1eDH9w9pw4HH4Lfuw9109Pi65KHHQ0f8Aos3BtHb2Sg+yyWHp8ntyqzNTmMvlsbRlVqKWLDoVUSIaTxyLJ7r3TfmMjXbUjy2wMNjth4bcmSpGra7MxZLZGdbINt2jyrybceAYqrx0OVrMji2h+wWikqqYU7zVWQDS08sXuvdApuCm65+dG6dnyZjb1ZjpOtP7x4HFbl2Pu/A1+0+xNxYumpdx7jm68xUBSGv3Hj6qCSaDH56goYcpEyzRmsxZlM3uvdRqnoDAbK3LnMFkKb5Fdo7aipf7x7Er6bslds7ci3LQ0dTBXYCqn2RW4qoyWextLTRD+ATRVGNaNJXcIqKnv3XuhA6723gF3Rj9yb0G1K7OYSrrKTM9hyJFlM/1TDB4qSiqOyey94NRwZPA5eryNHTxYelqZRkKd4bxqiVE8PuvdDh/c/r3+939w/8AS/ub+4H8S/v5/cz+L4n/AEdfY/efe/8AHz/xv7v/AEf/AN4P9xv8O1W8n+SadH7vv3Xuv//VMrvPsLM7w3rW9i7QOY6CjamGBw74fC75xtfLU71SmyG59057HbtxuPxG6qfAVUNVQ0cmFP2c/hnaKpjLLTy+691xwWd6xw2A2xjaPvnsTunIYqkxWB7Px/VO45tsxbsy1W9PQ5Te2COTzlRuXrbYLZLJ0qV+VbJmaKtp6iGoqpI/O8nuvdKt+vOi9uZrOZrA7N7F6CzO6qra1PNt59ub2yHV+1HhrYoI6er7F61yOU6ylkylXjqSvr5qHITVtRQzrQ6Xp6hz7917oX979WUnUeLo635A9npvvZmd3BDTbJGwNx1nV+4drvVy0eGosTQ0mFpzT1O1KE1gqqzIUtXQ1dJNLErRTxxI6e691j2bsTd296jE9i9X/I6gr+ssHWyUm2+ta2vxG5KaSppnWolqu3OycrPuWryO6qw4zJfb50U4yC089LFHVA1Mkvv3XujK/wB0Opf4dr17a+78v9+f9E3989ufwL++X2v8H/gf9+ftvD/BvD/k32Vvs/vPXfX7917r/9Y+O/8Avz5K4bAUG+8i/UnUmyGw+fx+KpshHP2dkdybbwFNNk6J9w5XG1u38f11k8NSJpzsVKlZRtUeKSKWaMqJfde6KNWfISn37FhN09p9Y5zE1q7l2LTbTw+1Nsb12Ftym3dnavGUtRmNybqoUq03BSx4Hxzth6ShmocvFDJTSw1RKn37r3Rlqn49R0YfF7Z7u3P11u/KY7O7gi2TR7ux5kmx9RLMm4d0Z3A9i5/eGO622hR1rw4mPHY5MLUK8oSlqKd1Ma+690hsd8Us3vbaMe5di03y12dueqzEmWjrs3ufM7hoMRlMNRvTS4jc2B7N3pUbvhqKKdEyMVTDR1tRUzMiU9WFLRe/de6Djtn44Z/435veG9tqbyqt0UlNX7Or9zR5Tb6SYPJ43IV+Pni3ZnMds1YMTS4TaO4JqionqTQGlx1Oss88yCJ2b3XurVv78dyfxL+6Pg6d8v8Ax8Pi/uVun/RN/cr+4v3Xg/v35Ptvtv70/wCU+X7f7i/7Xh+3/wAo9+691//XOJv3ZVPt+PH9q9s9sdXYLr+TL5DNUXXuJnyVG+03rKKLA7Knye6dwVSTJDEtLkqZMXV0CS0ddWpGlaRC7Te690mtqbw3xuEbn69k25sWuqBurGUmU2hv+rp8DnchsLI7bnx2MzsTCvqsLTVFJSrkJMfGJKbGV81OoeqjQNFF7r3T5TbGp+us9VybI3S2z9rdg5bFPkKTbm127d7G21vPF4Kl2VV03YvalTlMrDXRZOfGUhhpaAS4nH1EWuoMtIIQPde6EzCdhbh7cm33D1fk+w92dUxUe2cJkt27H7BxuY7S3H2PQRU0ea3VX7gymYgpNi7I2kzURR8fjspBlaCKukgpCJKcz+691n6u6b2P11mKLJYjsvMwdhYTNYyHDbm7x2xmN2Z/+7eWxpO4Np5Pc2x8zSbKq9nbswuPmfGUk7WqjTxVsaNohll917o638R7J/gH9+f491V/Af70/Y/Z/wB7N2/6OP7t/wAP/g/8a/iP8F+9/iP9+v8AIvtNP8E/h/8Ald/Jz7917r//0Dy5enp6zde55BtyHaO+dz7brsp1/WbspNwmbtTEYDbMe8tz7/2HX4xd47DqN0YlapYmFfQwZSuONrDR04gqIKtvde6Aup+RtX2lk6RY929fybZyb7T23Tb0j2NU9jVFHj03ZgqOfZG9dl7XoqOjwlfvnaFQlDhavKZCCCgySRVkgqICtIfde6fc9N1x2TvDP9bUvxh3n8hKqKWbNbo3nkOsM/tfckOEoGw+I3Rn8ZWblqcFtKhyU1RFFSUy09W9VUUxkkoYqiCL0e690vtr4ru+CWgze39p7LxWEy0GKzHW/TVTsjKbOwG1ttCmzlNmYO0u1cluXJ1G6OtvuKeimpsljsFhslTVDwQZOKeCokeD3Xun/GY/441W59tdB9t5DZHT2TnxVDkdq7d6V3tv/pbNUdXQtPicpgMng8XuDFRbAopqqhaLG4EvU66CKWsiqSEvH7r3Rnf7rdi/6Ov7pfxjK/6Jf4T/AHS/vf8AcbJ1/wB2Ptv7sfd/3a0/wX+7n93P3Lfwn737793waP3ffuvdf//RFvMd1/H2l3BUvW0s9Fm8W2ezy7Q3Llc1tikwG58TtCXb5w21IHqYI9lZ6gdZHxNFQmjqJiscTGZXkK+690XJ96UWU3NnY9hY3O4X/SFl5M9tTetU+48bjNzbXx9XQ5HMz4/b2ZyrzUuQOUpA0NVXeWqpVjCxmIzzRv7r3RgetfmZ2xvkbhn37hMJlMQ+3KmCfceP3uuL3RidsVEC0mQEVXvHKyUO5dk1OcEcr0s5nrUmnlWmlMZOj3XuhByXelDv7anXe5l773T1XPtih3WdpV21gcHs2ny+xYCzrunG1+OlbD7O3XAFx/jzle1PUvNE9IlPUyUs0fuvdKLFfInem8p91ZbrjoGHObkkwO1s9j9yb53TXYbAbPoXxkeI3FSZWs3DRZHdWZeWthp5ceoiqMfSlOaqBnZZfde6df8ASNl/N/fr/TPjv9JPi/v1/cj+7GyfN/fH+Af3V/0df3Q0/wAQ/hf94f8Ac99x/Fft/P8AufxT7D/Jvfuvdf/Sk1HRvdE+fzWz8f0Ts7pyXdtbXbpxuQ3ktZv/AHRlztTL0Lz0OC3FWV9VSnLybnyD0tLiaimTIZFY5IwHRJDP7r3SYznRGG3lk6imPcHTe25sbURUO5KrYu0N3ZzY+PzamqzFVjuxcj9zDi13dPRoaiooHTHjGqyUiRSeEF/de6RUeC7Aq9mNC+b6m7l6029k3yFTSU0u2cbXbPlMldH/ABeiqN2NtvIYpclGkwxxpZJ2r0V3gV4gxPuvdcKfZ3XsG4IcLF1J2Ztyl3ZjKWJMRT9rY/cdVU5ab7Kknm2H/D2pq/duKrSpkMWYqvtft5jKFIgijb3Xujf9G7Pk29vZM7JtvdmxJI8VlqTY+YD7dho6uPI0dBU5Xbm5us46+lqa3OZ3B4+rqa3CzYZqN44mmSSKURVJ917oYP7s9p/6N/4v/dql0/6Rv4t/fX+I7G/gn9wP7xfY/wB4P4Vq/jf+jT+9nr/hP3X3H8D9fk+5/wAm9+691//TNhuXO0/Yu448Xtj475/c+awnZGarMmm4+w+waLde3cWsGYr49x4nE4aDLVGW3LhtwRvQS1C1FFUyUMbTUjSAGeX3Xugxzv8AEs9m9vwbD6v69qoI9gVAzeI7p3HVVvXuPldJlpMTurr6fBYarpodvVksseHrqjxIklTUgiJSC3uvdA/jYewtj5vJ02TzfSPVeRpsa9JHhOk8Lsrcu/M6+RrcFhDtenw2Qpc/U1W2Z8hNDlpVpIhk5ato3pnVEMS+6907bM7Y6W2/uPL9E7q2zvn497e3llNuw7g3buXcmKq989Wbix1Bj4s4c0M3SiHCbXf7d6ijqapq4fxGrirEhpwj3917oxGE+PHdGJ7Hxe/9q7g3p2osmzMfi81u49hYfK78yGx4Z6vL5vE7uqc3iKLcm013RtWuK42GkkpZ8jktbCemUpVL7r3RkvsOv/sP4l/og6m/vl/A/s/v/wC8+Q/if95/F/d3+833P3f8C+28H+V6Puv+Af7n3urj37r3X//UNt3/ANkdybq3DHi+t+383jcdhJk25nclszYG1dgZLtrMmuhzm4917S3dNXZ/buMyOLGQbD0eFzFVja5cnS1E1WwpVqHb3Xukhle4Nxdjbuo6cbX3tt+n2nWVtLu7BZDAbPlGbo8dVQT5raWdz+OyL4PE5vInxvQZ+k3DlvsKlA80Bo3aD37r3QPbAr+q4N157beRzmB2TurdXY+YyuEo8DsWi31mJcNkp8huChwK5DNLtrbWMzj7wenkSsyaS4OdITV0ZjbSkPuvdCNuDblT2Ym3cT3/AIveWbz+WFdhNoZvMUGzc12pmYq+toqTHZbetFsWPD7Y29FNUpHRw5KlqpcVEsSyysZKuE+/de6FDYPWHdexNj7b1ds53qjIUG5Vwku0Rv7beSruxsdgs3X5GfYGQg8dfkqWuoto4ebGr9gtG9NS3rkeaIOV917owv8Asv3Q/wDstP239yu1v4b/AHs/vL/cX/S5kvv/AO8v8Q+8+w/0g/e/Y/wzR+xq817/AOQ21/s+/de6/9UzOY35s3dmSxNP03kcXh5qpNo7Tj2p2pu/sTp/b2cppctR1lDt1tp5zZu56DE7W3NNVV1AMhUfdCsrpZ1jcmFUT3Xugzl2vPQM9H3h1tR1HSVXh8y2Px2zNu757VzdV5KSpqaNtp5TacWMq9l9aYfO4145Kb+GrLBjKVEhenoSiJ7r3SKg3vTYnFYfrnDdcbJ61E+ENdBvrAtRdnby67zGChgjyW5M5tOpw1fiq6kqFjoqCCrqa1o6JKhmqjcxlfde6FXouav3LuCjly2+Nu9R7hrNsS4vPV+egot0UWUqtwz1u3dmYiipayowm29o47OZnHy0G5NvUUsP+5EY2eaWOZ2af3Xulp0vRbUGZrMLvSq6y3d15vyjnwO69rdjbPqsF2Bmo56DJUFDHLjKDGZObfe19uPtymOWFFWS0NZI/lp51g0QD3Xujvf6Etw/Z/Y+fCf3Z/0Efxb7vVtfwf3j/vj/AHh/uj/Db/3M/wBFv8O9P3H2v3/2vP33n/d9+691/9Y5XY/VW0M1vTcsGAzOb25vzDU0eM3JW4nei7lwUO6NjU1Tu7G5us2h2e8H8b2fh8zUtV1tLRY+XIJNUJIrzAPIPde6LzUYD431mIzFbnt/9ubCrN2PQVuB7C2xvPc23dl9kZPedd91PmNv7CXzde5nOVlFV1FLR0ssNVTzzwmNIGjeOFfde6MbXy93bSyuSxcG1KbuDb1In8ZGa2vVRYbfW59l1WLaqo6io6nxWGx2y4mmxNTI9S8WVx9JUlVEcKVALr7r3T/i93bHy2Rzybj6635VYbsHbEuF3xt7LLjajrt8vuClxePzeFosVv3YMW38ZsytnxMeq48888xq1SSLXKfde663TvPBrR0OfoN79V7e3dNjI9kUmK3Lt3eNVs/L1eOlxO2etolWo/g9NuOqydakNDRUFFkKClr6md5Ep/M7j37r3Qm/6DJv9FP2urJfwD+5X2n90v7zbB/0M/xj+H+D+KfxT+PfZ/3e/g3+R/wK/g1/5dq+4/d9+691/9c+Hfhnnwu5cH2fHtvc25KzOZPd3VtVubYuTnyPXecrIjSVGPy9JmJ8vuPI/wAFx9RRVX8apMbkJcLj65HmEmNR0h917pJbU783t2xmsDt/aHx+hxGVrsfNgt8bjbYtADT5CmpIqKlzu3MZNnNr0FbX1FLja0S1OAV6/GQQIHgd5aZYvde6CbamE3Zjd70uWwG8d6p2TgslmMZN1XtXd23Zs5mty0+VzVdtbJbco+ydx1m3sDPlMNUV1XPt6GSGp+1JiAmko1hl917oZafsXfeUwEsn3Wb6p3T0lSZmg3JJLkYs12hk/sHxNVlMBt/ES0PbVHuXMNRVNS9FjpcNRNkJWiVHjjce/de6XHTuI39vPL9ibm2/VSVG28xHtbJ4uPclTi02/wBhVoycWPqKPDR7y3NUbm23uPb2LxdL40gp6XENk8rJOzfcSzJ7917o7X+j6l/u1/dX+6NB/c/Rp/jX8Oq/9IP8Dt/d3+4X/AX7f+Nf8ub+Kfxb7f8AgXq1eP8Af9+691//0D77o/gX33emv/RN9x/efeP8Y/v9/pF/g/3X9yq3V/cr7f8A3F69fh/jX8C/yP8AiP8AEdPp+59+691n3T/d/wD0bYX73+Dfwr+8WH839wP9Jv8Aef8AjX92Md9p95/AP9/n9hr0ef7f/cB9jq+59Pk9+690X3sn+I/xqPyf6Qv4L/DaP+8v91f7rfc+S+U/i/8AdD7T/jIH3n8H8f3H90v29Wr+G/7k/N7917oxmzNf2Ozv4H/dj+G+Sk/gH8V+3/0v+P8AvJWfb/3o/wBIf+/r89v81/eX93z/AHfn5v7917pFQfw++5tP+iP7/wDvRiv4h/s2f96P9Cnj/vph/svtvL/v3P75/deX+Gfwz937+33f+T/b+/de6sx/3Lfw/wD5eXk/hX/Zk6/t/wCA/wDnL/oa/iv/AFU/ef8AVu9+691//9k=";
    // txturelight8
    //return "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dW0AAAAMYnVpbHRpblByb29mAAAACXByb29mQ01ZSwA4QklNBDsAAAAAAi0AAAAQAAAAAQAAAAAAEnByaW50T3V0cHV0T3B0aW9ucwAAABcAAAAAQ3B0bmJvb2wAAAAAAENsYnJib29sAAAAAABSZ3NNYm9vbAAAAAAAQ3JuQ2Jvb2wAAAAAAENudENib29sAAAAAABMYmxzYm9vbAAAAAAATmd0dmJvb2wAAAAAAEVtbERib29sAAAAAABJbnRyYm9vbAAAAAAAQmNrZ09iamMAAAABAAAAAAAAUkdCQwAAAAMAAAAAUmQgIGRvdWJAb+AAAAAAAAAAAABHcm4gZG91YkBv4AAAAAAAAAAAAEJsICBkb3ViQG/gAAAAAAAAAAAAQnJkVFVudEYjUmx0AAAAAAAAAAAAAAAAQmxkIFVudEYjUmx0AAAAAAAAAAAAAAAAUnNsdFVudEYjUHhsQFIAAAAAAAAAAAAKdmVjdG9yRGF0YWJvb2wBAAAAAFBnUHNlbnVtAAAAAFBnUHMAAAAAUGdQQwAAAABMZWZ0VW50RiNSbHQAAAAAAAAAAAAAAABUb3AgVW50RiNSbHQAAAAAAAAAAAAAAABTY2wgVW50RiNQcmNAWQAAAAAAAAAAABBjcm9wV2hlblByaW50aW5nYm9vbAAAAAAOY3JvcFJlY3RCb3R0b21sb25nAAAAAAAAAAxjcm9wUmVjdExlZnRsb25nAAAAAAAAAA1jcm9wUmVjdFJpZ2h0bG9uZwAAAAAAAAALY3JvcFJlY3RUb3Bsb25nAAAAAAA4QklNA+0AAAAAABAASAAAAAEAAQBIAAAAAQABOEJJTQQmAAAAAAAOAAAAAAAAAAAAAD+AAAA4QklNBA0AAAAAAAQAAAAeOEJJTQQZAAAAAAAEAAAAHjhCSU0D8wAAAAAACQAAAAAAAAAAAQA4QklNJxAAAAAAAAoAAQAAAAAAAAABOEJJTQP1AAAAAABIAC9mZgABAGxmZgAGAAAAAAABAC9mZgABAKGZmgAGAAAAAAABADIAAAABAFoAAAAGAAAAAAABADUAAAABAC0AAAAGAAAAAAABOEJJTQP4AAAAAABwAAD/////////////////////////////A+gAAAAA/////////////////////////////wPoAAAAAP//////////////////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b3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bXBNTTpEb2N1bWVudElEPSJhZG9iZTpkb2NpZDpwaG90b3Nob3A6OGYxNTgxMGEtMjRhMC0xMTc4LWIwZDYtYTExY2Y2MTU5MWQ4IiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjFhMjhjZTg0LTZlZTAtNDVhNi1hOTM1LTU1MGYyMGU1NTk3MSIgeG1wTU06T3JpZ2luYWxEb2N1bWVudElEPSJDRTk3QzhCMUZBOTNDNjNDNzFFQ0Q3RUY4OTUyNEEzQSIgZGM6Zm9ybWF0PSJpbWFnZS9qcGVnIiBwaG90b3Nob3A6Q29sb3JNb2RlPSIzIiBwaG90b3Nob3A6SUNDUHJvZmlsZT0ic1JHQiBJRUM2MTk2Ni0yLjEiIHhtcDpDcmVhdGVEYXRlPSIyMDE1LTAzLTI2VDE1OjIzOjI3LTA0OjAwIiB4bXA6TW9kaWZ5RGF0ZT0iMjAxNS0wNC0xNlQxNDo1NjoxNS0wNDowMCIgeG1wOk1ldGFkYXRhRGF0ZT0iMjAxNS0wNC0xNlQxNDo1NjoxNS0wNDowMCI+IDx4bXBNTTpIaXN0b3J5PiA8cmRmOlNlcT4gPHJkZjpsaSBzdEV2dDphY3Rpb249InNhdmVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOjcwMzcyMWZiLTQ0MDctNDQ0YS05NDcxLTQyMWEwMjBiOGNkMCIgc3RFdnQ6d2hlbj0iMjAxNS0wNC0xNlQxNDo1NjoxNS0wNDowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTQgKE1hY2ludG9zaCkiIHN0RXZ0OmNoYW5nZWQ9Ii8iLz4gPHJkZjpsaSBzdEV2dDphY3Rpb249InNhdmVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOjFhMjhjZTg0LTZlZTAtNDVhNi1hOTM1LTU1MGYyMGU1NTk3MSIgc3RFdnQ6d2hlbj0iMjAxNS0wNC0xNlQxNDo1NjoxNS0wNDowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTQgKE1hY2ludG9zaCkiIHN0RXZ0OmNoYW5nZWQ9Ii8iLz4gPC9yZGY6U2VxPiA8L3htcE1NOkhpc3Rvcnk+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDw/eHBhY2tldCBlbmQ9InciPz7/4gxYSUNDX1BST0ZJTEUAAQEAAAxITGlubwIQAABtbnRyUkdCIFhZWiAHzgACAAkABgAxAABhY3NwTVNGVAAAAABJRUMgc1JHQgAAAAAAAAAAAAAAAAAA9tYAAQAAAADTLUhQICAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABFjcHJ0AAABUAAAADNkZXNjAAABhAAAAGx3dHB0AAAB8AAAABRia3B0AAACBAAAABRyWFlaAAACGAAAABRnWFlaAAACLAAAABRiWFlaAAACQAAAABRkbW5kAAACVAAAAHBkbWRkAAACxAAAAIh2dWVkAAADTAAAAIZ2aWV3AAAD1AAAACRsdW1pAAAD+AAAABRtZWFzAAAEDAAAACR0ZWNoAAAEMAAAAAxyVFJDAAAEPAAACAxnVFJDAAAEPAAACAxiVFJDAAAEPAAACAx0ZXh0AAAAAENvcHlyaWdodCAoYykgMTk5OCBIZXdsZXR0LVBhY2thcmQgQ29tcGFueQAAZGVzYwAAAAAAAAASc1JHQiBJRUM2MTk2Ni0yLjEAAAAAAAAAAAAAABJzUkdCIElFQzYxOTY2LTIuMQAAAAAAAAAAAAAAAAAA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";
    // texturelight10
    //return "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aGVuUHJpbnRpbmdib29sAAAAAA5jcm9wUmVjdEJvdHRvbWxvbmcAAAAAAAAADGNyb3BSZWN0TGVmdGxvbmcAAAAAAAAADWNyb3BSZWN0UmlnaHRsb25nAAAAAAAAAAtjcm9wUmVjdFRvcGxvbmcAAAAAADhCSU0D7QAAAAAAEABIAAAAAQABAEgAAAABAAE4QklNBCYAAAAAAA4AAAAAAAAAAAAAP4AAADhCSU0D8gAAAAAACgAA////////AAA4QklNBA0AAAAAAAQAAAAeOEJJTQQZAAAAAAAEAAAAHjhCSU0D8wAAAAAACQAAAAAAAAAAAQA4QklNJxAAAAAAAAoAAQAAAAAAAAABOEJJTQP1AAAAAABIAC9mZgABAGxmZgAGAAAAAAABAC9mZgABAKGZmgAGAAAAAAABADIAAAABAFoAAAAGAAAAAAABADUAAAABAC0AAAAGAAAAAAABOEJJTQP4AAAAAABwAAD/////////////////////////////A+gAAAAA/////////////////////////////wPoAAAAAP////////////////////////////8D6AAAAAD/////////////////////////////A+gAADhCSU0ECAAAAAAAEAAAAAEAAAJAAAACQAAAAAA4QklNBB4AAAAAAAQAAAAAOEJJTQQaAAAAAANPAAAABgAAAAAAAAAAAAAAiwAAACwAAAANAHQAZQB4AHQAdQByAGUAbABpAGcAaAB0ADkAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAACwAAACLAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAEAAAAAAABudWxsAAAAAgAAAAZib3VuZHNPYmpjAAAAAQAAAAAAAFJjdDEAAAAEAAAAAFRvcCBsb25nAAAAAAAAAABMZWZ0bG9uZwAAAAAAAAAAQnRvbWxvbmcAAACLAAAAAFJnaHRsb25nAAAALAAAAAZzbGljZXNWbExzAAAAAU9iamMAAAABAAAAAAAFc2xpY2UAAAASAAAAB3NsaWNlSURsb25nAAAAAAAAAAdncm91cElEbG9uZwAAAAAAAAAGb3JpZ2luZW51bQAAAAxFU2xpY2VPcmlnaW4AAAANYXV0b0dlbmVyYXRlZAAA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cC8xLjAvIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOkRvY3VtZW50SUQ9ImFkb2JlOmRvY2lkOnBob3Rvc2hvcDpiNTIwMDNmZi0yNWY5LTExNzgtOWQyNy1kNDE5Mzc0YTNjNGYiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6ZWEwMjIyYTItMjYwMi00NTJhLWJiNGUtYzEyOWZjZjQ3OGE3IiB4bXBNTTpPcmlnaW5hbERvY3VtZW50SUQ9IkNFOTdDOEIxRkE5M0M2M0M3MUVDRDdFRjg5NTI0QTNBIiBkYzpmb3JtYXQ9ImltYWdlL2pwZWciIHBob3Rvc2hvcDpMZWdhY3lJUFRDRGlnZXN0PSJDRENGRkE3REE4QzdCRTA5MDU3MDc2QUVBRjA1QzM0RSIgcGhvdG9zaG9wOkNvbG9yTW9kZT0iMyIgcGhvdG9zaG9wOklDQ1Byb2ZpbGU9InNSR0IgSUVDNjE5NjYtMi4xIiB4bXA6Q3JlYXRlRGF0ZT0iMjAxNS0wMy0yNlQxNToyMzoyNy0wNDowMCIgeG1wOk1vZGlmeURhdGU9IjIwMTUtMDQtMTdUMjE6MzY6MjAtMDQ6MDAiIHhtcDpNZXRhZGF0YURhdGU9IjIwMTUtMDQtMTdUMjE6MzY6MjAtMDQ6MDAiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTQgKE1hY2ludG9zaCkiPiA8eG1wTU06SGlzdG9yeT4gPHJkZjpTZXE+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJzYXZlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDo2ZjA0N2M2Yi0yOWU0LTRjODUtOWQ3Yi00OTI3ZDJkNjczNDQiIHN0RXZ0OndoZW49IjIwMTUtMDQtMTZUMTU6MDI6MTUtMDQ6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCBDQyAyMDE0IChNYWNpbnRvc2gpIiBzdEV2dDpjaGFuZ2VkPSIvIi8+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJzYXZlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDplYTAyMjJhMi0yNjAyLTQ1MmEtYmI0ZS1jMTI5ZmNmNDc4YTciIHN0RXZ0OndoZW49IjIwMTUtMDQtMTdUMjE6MzY6MjAtMDQ6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCBDQyAyMDE0IChNYWNpbnRvc2gpIiBzdEV2dDpjaGFuZ2VkPSIvIi8+IDwvcmRmOlNlcT4gPC94bXBNTTpIaXN0b3J5PiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8P3hwYWNrZXQgZW5kPSJ3Ij8+/+IMWElDQ19QUk9GSUxFAAEBAAAMSExpbm8CEAAAbW50clJHQiBYWVogB84AAgAJAAYAMQAAYWNzcE1TRlQAAAAASUVDIHNSR0IAAAAAAAAAAAAAAAAAAPbWAAEAAAAA0y1IUCAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAARY3BydAAAAVAAAAAzZGVzYwAAAYQAAABsd3RwdAAAAfAAAAAUYmtwdAAAAgQAAAAUclhZWgAAAhgAAAAUZ1hZWgAAAiwAAAAUYlhZWgAAAkAAAAAUZG1uZAAAAlQAAABwZG1kZAAAAsQAAACIdnVlZAAAA0wAAACGdmlldwAAA9QAAAAkbHVtaQAAA/gAAAAUbWVhcwAABAwAAAAkdGVjaAAABDAAAAAMclRSQwAABDwAAAgMZ1RSQwAABDwAAAgMYlRSQwAABDwAAAgMdGV4dAAAAABDb3B5cmlnaHQgKGMpIDE5OTggSGV3bGV0dC1QYWNrYXJkIENvbXBhbnkAAGRlc2MAAAAAAAAAEnNSR0IgSUVDNjE5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";
    // texturelight11
  return "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R0JDAAAAAwAAAABSZCAgZG91YkBv4AAAAAAAAAAAAEdybiBkb3ViQG/gAAAAAAAAAAAAQmwgIGRvdWJAb+AAAAAAAAAAAABCcmRUVW50RiNSbHQAAAAAAAAAAAAAAABCbGQgVW50RiNSbHQAAAAAAAAAAAAAAABSc2x0VW50RiNQeGxAUgAAAAAAAAAAAAp2ZWN0b3JEYXRhYm9vbAEAAAAAUGdQc2VudW0AAAAAUGdQcwAAAABQZ1BDAAAAAExlZnRVbnRGI1JsdAAAAAAAAAAAAAAAAFRvcCBVbnRGI1JsdAAAAAAAAAAAAAAAAFNjbCBVbnRGI1ByY0BZAAAAAAAAAAAAEGNyb3BXaGVuUHJpbnRpbmdib29sAAAAAA5jcm9wUmVjdEJvdHRvbWxvbmcAAAAAAAAADGNyb3BSZWN0TGVmdGxvbmcAAAAAAAAADWNyb3BSZWN0UmlnaHRsb25nAAAAAAAAAAtjcm9wUmVjdFRvcGxvbmcAAAAAADhCSU0D7QAAAAAAEABIAAAAAQABAEgAAAABAAE4QklNBCYAAAAAAA4AAAAAAAAAAAAAP4AAADhCSU0D8gAAAAAACgAA////////AAA4QklNBA0AAAAAAAQAAAAeOEJJTQQZAAAAAAAEAAAAHjhCSU0D8wAAAAAACQAAAAAAAAAAAQA4QklNJxAAAAAAAAoAAQAAAAAAAAABOEJJTQP1AAAAAABIAC9mZgABAGxmZgAGAAAAAAABAC9mZgABAKGZmgAGAAAAAAABADIAAAABAFoAAAAGAAAAAAABADUAAAABAC0AAAAGAAAAAAABOEJJTQP4AAAAAABwAAD/////////////////////////////A+gAAAAA/////////////////////////////wPoAAAAAP////////////////////////////8D6AAAAAD/////////////////////////////A+gAADhCSU0ECAAAAAAAEAAAAAEAAAJAAAACQAAAAAA4QklNBB4AAAAAAAQAAAAAOEJJTQQaAAAAAANRAAAABgAAAAAAAAAAAAAAiwAAACwAAAAOAHQAZQB4AHQAdQByAGUAbABpAGcAaAB0ADEAMAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAALAAAAIsAAAAAAAAAAAAA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bwBwACAAQwBDACAAMgAwADEANAAAAAEAOEJJTQQGAAAAAAAHAAgAAAABAQD/4Q5MaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLwA8P3hwYWNrZXQgYmVnaW49Iu+7vyIgaWQ9Ilc1TTBNcENlaGlIenJlU3pOVGN6a2M5ZCI/PiA8eDp4bXBtZXRhIHhtbG5zOng9ImFkb2JlOm5zOm1ldGEvIiB4OnhtcHRrPSJBZG9iZSBYTVAgQ29yZSA1LjYtYzAxNCA3OS4xNTY3OTcsIDIwMTQvMDgvMjAtMDk6NTM6MDIgICAgICAgICI+IDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+IDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdEV2dD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlRXZlbnQjIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bXBNTTpEb2N1bWVudElEPSJhZG9iZTpkb2NpZDpwaG90b3Nob3A6OTU1YWYwNDItMjVmYi0xMTc4LTlkMjctZDQxOTM3NGEzYzRmIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjg1MjY0MmYzLTcyMmEtNDI3Ny1hNzAzLTgzZmRlM2FhMWIwMCIgeG1wTU06T3JpZ2luYWxEb2N1bWVudElEPSJDRTk3QzhCMUZBOTNDNjNDNzFFQ0Q3RUY4OTUyNEEzQSIgZGM6Zm9ybWF0PSJpbWFnZS9qcGVnIiBwaG90b3Nob3A6TGVnYWN5SVBUQ0RpZ2VzdD0iQ0RDRkZBN0RBOEM3QkUwOTA1NzA3NkFFQUYwNUMzNEUiIHBob3Rvc2hvcDpDb2xvck1vZGU9IjMiIHBob3Rvc2hvcDpJQ0NQcm9maWxlPSJzUkdCIElFQzYxOTY2LTIuMSIgeG1wOkNyZWF0ZURhdGU9IjIwMTUtMDMtMjZUMTU6MjM6MjctMDQ6MDAiIHhtcDpNb2RpZnlEYXRlPSIyMDE1LTA0LTE3VDIxOjQ5OjM4LTA0OjAwIiB4bXA6TWV0YWRhdGFEYXRlPSIyMDE1LTA0LTE3VDIxOjQ5OjM4LTA0OjAwIiB4bXA6Q3JlYXRvclRvb2w9IkFkb2JlIFBob3Rvc2hvcCBDQyAyMDE0IChNYWNpbnRvc2gpIj4gPHhtcE1NOkhpc3Rvcnk+IDxyZGY6U2VxPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0ic2F2ZWQiIHN0RXZ0Omluc3RhbmNlSUQ9InhtcC5paWQ6NmYwNDdjNmItMjllNC00Yzg1LTlkN2ItNDkyN2QyZDY3MzQ0IiBzdEV2dDp3aGVuPSIyMDE1LTA0LTE2VDE1OjAyOjE1LTA0OjAwIiBzdEV2dDpzb2Z0d2FyZUFnZW50PSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxNCAoTWFjaW50b3NoKSIgc3RFdnQ6Y2hhbmdlZD0iLyIvPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0ic2F2ZWQiIHN0RXZ0Omluc3RhbmNlSUQ9InhtcC5paWQ6ODUyNjQyZjMtNzIyYS00Mjc3LWE3MDMtODNmZGUzYWExYjAwIiBzdEV2dDp3aGVuPSIyMDE1LTA0LTE3VDIxOjQ5OjM4LTA0OjAwIiBzdEV2dDpzb2Z0d2FyZUFnZW50PSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxNCAoTWFjaW50b3NoKSIgc3RFdnQ6Y2hhbmdlZD0iLyIvPiA8L3JkZjpTZXE+IDwveG1wTU06SGlzdG9yeT4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg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";
    // texturelight9a
    //return "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AAAAAAAQAEgAAAABAAEASAAAAAEAAThCSU0EJgAAAAAADgAAAAAAAAAAAAA/gAAAOEJJTQPyAAAAAAAKAAD///////8AADhCSU0EDQAAAAAABAAAAB44QklNBBkAAAAAAAQAAAAeOEJJTQPzAAAAAAAJAAAAAAAAAAABADhCSU0nEAAAAAAACgABAAAAAAAAAAE4QklNA/UAAAAAAEgAL2ZmAAEAbGZmAAYAAAAAAAEAL2ZmAAEAoZmaAAYAAAAAAAEAMgAAAAEAWgAAAAYAAAAAAAEANQAAAAEALQAAAAYAAAAAAAE4QklNA/gAAAAAAHAAAP////////////////////////////8D6AAAAAD/////////////////////////////A+gAAAAA/////////////////////////////wPoAAAAAP////////////////////////////8D6AAAOEJJTQQIAAAAAAAQAAAAAQAAAkAAAAJAAAAAADhCSU0EHgAAAAAABAAAAAA4QklNBBoAAAAAA08AAAAGAAAAAAAAAAAAAACLAAAALAAAAA0AdABlAHgAdAB1AHIAZQBsAGkAZwBoAHQAOQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAALAAAAIsAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAQAAAAAAAG51bGwAAAACAAAABmJvdW5kc09iamMAAAABAAAAAAAAUmN0MQAAAAQAAAAAVG9wIGxvbmcAAAAAAAAAAExlZnRsb25nAAAAAAAAAABCdG9tbG9uZwAAAIsAAAAAUmdodGxvbmcAAAAsAAAABnNsaWNlc1ZsTHMAAAABT2JqYwAAAAEAAAAAAAVzbGljZQAAABIAAAAHc2xpY2VJRGxvbmcAAAAAAAAAB2dyb3VwSURsb25nAAAAAAAAAAZvcmlnaW5lbnVtAAAADEVTbGljZU9yaWdpbgAAAA1hdXRvR2VuZXJhdGVkAAAAAFR5cGVlbnVtAAAACkVTbGljZVR5cGUAAAAASW1nIAAAAAZib3VuZHNPYmpjAAAAAQAAAAAAAFJjdDEAAAAEAAAAAFRvcCBsb25nAAAAAAAAAABMZWZ0bG9uZwAAAAAAAAAAQnRvbWxvbmcAAACLAAAAAFJnaHRs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80skbff/ADU7hP2zd6P0hH8j1P3Ni2fft78fyfD/ANt93+vppKf/2ThCSU0EIQAAAAAAXQAAAAEBAAAADwBBAGQAbwBiAGUAIABQAGgAbwB0AG8AcwBoAG8AcAAAABcAQQBkAG8AYgBlACAAUABoAG8AdABvAHMAaABvAHAAIABDAEMAIAAyADAAMQA0AAAAAQA4QklNBAYAAAAAAAcACAAAAAEBAP/hDkxodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMDE0IDc5LjE1Njc5NywgMjAxNC8wOC8yMC0wOTo1MzowMiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0RXZ0PSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VFdmVudCMiIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOkRvY3VtZW50SUQ9ImFkb2JlOmRvY2lkOnBob3Rvc2hvcDpiMGExZTcyMy0yNWZjLTExNzgtOWQyNy1kNDE5Mzc0YTNjNGYiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6ZDgzMWVhOTYtMDZiYy00N2VkLWI2ZTktMDEzYjkxZjM4ODIxIiB4bXBNTTpPcmlnaW5hbERvY3VtZW50SUQ9IkNFOTdDOEIxRkE5M0M2M0M3MUVDRDdFRjg5NTI0QTNBIiBkYzpmb3JtYXQ9ImltYWdlL2pwZWciIHBob3Rvc2hvcDpMZWdhY3lJUFRDRGlnZXN0PSJDRENGRkE3REE4QzdCRTA5MDU3MDc2QUVBRjA1QzM0RSIgcGhvdG9zaG9wOkNvbG9yTW9kZT0iMyIgcGhvdG9zaG9wOklDQ1Byb2ZpbGU9InNSR0IgSUVDNjE5NjYtMi4xIiB4bXA6Q3JlYXRlRGF0ZT0iMjAxNS0wMy0yNlQxNToyMzoyNy0wNDowMCIgeG1wOk1vZGlmeURhdGU9IjIwMTUtMDQtMTdUMjE6NTc6MzctMDQ6MDAiIHhtcDpNZXRhZGF0YURhdGU9IjIwMTUtMDQtMTdUMjE6NTc6MzctMDQ6MDAiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTQgKE1hY2ludG9zaCkiPiA8eG1wTU06SGlzdG9yeT4gPHJkZjpTZXE+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJzYXZlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDo2ZjA0N2M2Yi0yOWU0LTRjODUtOWQ3Yi00OTI3ZDJkNjczNDQiIHN0RXZ0OndoZW49IjIwMTUtMDQtMTZUMTU6MDI6MTUtMDQ6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCBDQyAyMDE0IChNYWNpbnRvc2gpIiBzdEV2dDpjaGFuZ2VkPSIvIi8+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJzYXZlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDpkODMxZWE5Ni0wNmJjLTQ3ZWQtYjZlOS0wMTNiOTFmMzg4MjEiIHN0RXZ0OndoZW49IjIwMTUtMDQtMTdUMjE6NTc6MzctMDQ6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCBDQyAyMDE0IChNYWNpbnRvc2gpIiBzdEV2dDpjaGFuZ2VkPSIvIi8+IDwvcmRmOlNlcT4gPC94bXBNTTpIaXN0b3J5PiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg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";
  }

  function getImageFromBase64(base64, type) {
    var img = new Image();
    img.src = "data:image/" + type + ";base64, " + base64;

    return img;
  }

  function getImageDataFromImage(img) {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    imageData = ctx.getImageData(0, 0, img.width, img.height).data;

    return imageData;
  }

  function getSamplesFromImage(img, samples) {
    var imageData = getImageDataFromImage(img);
    var imageDataGrays = [];
    var textureOffsetX = 0;
    var textureOffsetY = 0;

    // Read grays from image
    for(var i = 0; i < imageData.length; i+=4) {
      imageDataGrays.push(1 - imageData[i]/255);
    }

    inkTextureImageDataGrays = imageDataGrays;

    // Read samples from mirrored-and-tiled grays
    for (var i = 0; i < textureSamplesLength; i++) {
      // Get normalized pixel within texture
      var T_s = textureOffsetX / (img.width - 1);
      var T_t = textureOffsetY / (img.height - 1);
      var s = Math.abs(Math.abs(T_s - 1) % 2 - 1);
      var t = Math.abs(Math.abs(T_t - 1) % 2 - 1);
      var x = Math.floor(s * (img.width - 1));
      var y = Math.floor(t * (img.height - 1));
      textureSampleLocations.push({x: x, y: y});
      var d = imageDataGrays[x + y * img.width];
      samples[i] = d;
      //samples[i] = 100 + Math.random()*155;
      
      // Step texture offset randomly [-1, 1]
      textureOffsetX += (Math.random() * 2 | 0) === 1 ? -1 : 1;
      textureOffsetY += (Math.random() * 2 | 0) === 1 ? -1 : 1;
    }

  }

} // Ploma

// ------------------------------------------
// Ploma.getStrokeImageData
//
// Returns image data for the input stroke,
// against a transparent canvas, clipped to
// the stroke's bounds.  Input stroke is to
// be a an array of JSON objects of point
// data:
//
// [{x, y, p}, {x, y, p}, ...]
//
Ploma.getStrokeImageData = function(inputStroke) {
  // Make a local copy
  var stroke = [];
  for(var i = 0; i < inputStroke.length; i++) {
    stroke.push(inputStroke[i]);
  }

  // For drawing and getting image data later
  var canvas = document.createElement('canvas');

  // Precalculate necessary bounds
  var minx = Infinity;
  var miny = Infinity;
  var maxx = 0;
  var maxy = 0;
  for(var i = 0; i < stroke.length; i++) {
    var point = stroke[i];
    minx = Math.min(minx, point.x);
    miny = Math.min(miny, point.y);
    maxx = Math.max(maxx, point.x);
    maxy = Math.max(maxy, point.y);
  }
  var w = maxx - minx + 8;
  var h = maxy - miny + 8;
  canvas.setAttribute('width', Math.ceil(w));
  canvas.setAttribute('height', Math.ceil(h));

  // Shift points to new origin
  for(var i = 0; i < stroke.length; i++) {
    var point = stroke[i];
    point.x = point.x - minx + 4;
    point.y = point.y - miny + 4;
  }

  // Instantiate Ploma on this new canvas
  var ploma = new Ploma(canvas);

  // Draw stroke onto temp canvas
  ploma.beginStroke(
    stroke[0].x,
    stroke[0].y,
    stroke[0].p
  );
  for(var i = 1; i < stroke.length - 1; i++) {
    ploma.extendStroke(
      stroke[i].x,
      stroke[i].y,
      stroke[i].p
    );
  }
  ploma.endStroke(
    stroke[stroke.length - 1].x,
    stroke[stroke.length - 1].y,
    stroke[stroke.length - 1].p
  );

  // Return the image data
  return canvas.getContext('2d').getImageData(0, 0, w, h);
};