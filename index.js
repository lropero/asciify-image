'use strict';

var lwip = require('lwip');

// Set of basic characters ordered by increasing "darkness"
// Used as pixels in the ASCII image
var chars = ' .,:;i1tfLCG08@',
    num_c = chars.length - 1;

module.exports = function (path, second, third) {
  // Organize arguments
  if (third) {
    var opts     = second;
    var callback = third;
  } else {
    var opts     = {};
    var callback = second;
  }

  // First open image to get initial properties
  lwip.open(path, function(err, image) {
    if (err) return console.log('Error loading image:', err);

    // Setup options
    var options = {
      fit:     opts.fit     ? opts.fit               : 'original',
      width:   opts.width   ? parseInt(opts.width)   : image.width(),
      height:  opts.height  ? parseInt(opts.height)  : image.height(),
      c_ratio: opts.c_ratio ? parseInt(opts.c_ratio) : 2,

      as_string:  opts.format === 'array' ? false : true
    }

    var new_dims = calculate_dims(image, options);

    // Resize to requested dimensions
    image.resize(new_dims[0], new_dims[1], function (err, image) {
      if (err) return console.log('Error resizing image:', err);

      var ascii = '';
      if (!options.as_string) ascii = [];

      // Normalization for the returned intensity so that it maps to a char
      var norm  = (255 * 4 / num_c);

      // Get and convert pixels
      var i, j, c;
      for (j = 0; j < image.height(); j++) {        // height

        // Add new array if type
        if (!options.as_string) ascii.push([]);

        for (i = 0; i < image.width(); i++) {       // width
          for (c = 0; c < options.c_ratio; c++) {   // character ratio

            var next = chars.charAt(Math.round(intensity(image, i, j) / norm));

            if (options.as_string)
              ascii += next;

            else
              ascii[j].push(next);
          }
        }

        if (options.as_string) ascii += '\n';
      }

      callback(ascii);

    });
  });
}

/**
 * Calculates the new dimensions of the image, given the options.
 *
 * @param [Image]  img  - The image (only width and height props needed)
 * @param [Object] opts - The options object
 *
 * @returns [Array] An array of the format [width, height]
 */
var calculate_dims = function (img, opts) {
  switch (opts.fit) {

    // Scale down by width
    case 'width':
      return [opts.width, img.height() * (opts.width / img.width())];

    // Scale down by height
    case 'height':
      return [img.width() * (opts.height / img.height()), opts.height];

    // Scale by width and height (ignore aspect ratio)
    case 'none':
      return [opts.width, opts.height];

    // Scale down to fit inside box matching width/height of options
    case 'box':
      var w_ratio = img.width()  / opts.width,
          h_ratio = img.height() / opts.height,
          neww, newh;

      if (w_ratio > h_ratio) {
          newh = Math.round(img.height() / w_ratio);
          neww = opts.width;
      } else {
          neww = Math.round(img.width() / h_ratio);
          newh = opts.height;
      }
      return [neww, newh];

    // Don't change width/height
    // Also the default in case of bad argument
    case 'original':
    default:
      // Let them know, but continue
      if (opts.fit !== 'original')
        console.error('Invalid option "fit", assuming "original"');

      return [img.width(), img.height()];

  }
}

/**
 * Calculates the "intensity" at a point (x, y) in the image, (0, 0) being the
 *   top left corner of the image. Linear combination of rgb_weights with RGB
 *   values at the specified point. Converts alpha from [0, 100] to [0, 255].
 *
 * @param [Image] i - The image object
 * @param [int]   x - The x coord
 * @param [int]   y - The y coord
 *
 * @returns [int] An int in [0, 1020] representing the intensity of the pixel
 */
var intensity = function (i, x, y) {
  var color = i.getPixel(x, y);
  return color.r + color.g + color.b + (color.a * 2.55); // alpha * 255 / 100
}
