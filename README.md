Lens.js
-------

A gravitational lensing library in Javascript. The aim is to have the library contain a gravitational lens object and the mathematics needed to work with the lens. All the Javascript that deals with display in the browser, and interaction, will be kept separate so that this library can be reused in multiple places.

See also [LensToy](http://slowe.github.com/LensToy/).

Example
-------

    // Create an instance of a lens. Width and height are in pixels. 
    // Pixscale is arcseconds/pixel.
    var gravlens = new Lens({ 'width': 400, 'height': 400, 'pixscale':0.25 });

    // Add the lens mass and source brightness components (units=arcseconds):
    gravlens.add({plane: "lens", theta_e: 10.0, x:  0.0, y:   0.0});
    gravlens.add({plane: "lens", theta_e:  3.0, x:  7.0, y: -27.0});
    gravlens.add({plane: "lens", theta_e:  3.0, x: 37.0, y:  37.0});
    gravlens.add({plane: "lens", theta_e:  3.0, x: 17.0, y:  52.0});
    gravlens.add({plane: "source", size:  1.25, x:  0.0, y:   0.0});

    // Calculate the deflection angle vector field, alpha(x,y):
    gravlens.calculateAlpha();

    // gravlens now contains a 1D array of gravlens.alpha and
    // gravlens.mag, which can be unpacked into 2D maps. 
    // Each gravlens.alpha[i] contains { x, y }
    // and each gravlens.mag[i] contains { kappa, inverse }
	console.log(gravlens.alpha);
	console.log(gravlens.mag);

    // Now use this to calculate the lensed surface brightness:
    gravlens.calculateImage();

    // gravlens now contains a 1D array of gravlens.predictedimage
    // values, which can be unpacked into a 2D image.
    console.log(gravlens.predictedimage)


Credits
-------

* Phil Marshall ([University of Oxford](http://www2.physics.ox.ac.uk/research/astrophysics))
* Stuart Lowe ([LCOGT](http://lcogt.net/))
* Aprajita Verma ([University of Oxford](http://www2.physics.ox.ac.uk/research/astrophysics))
