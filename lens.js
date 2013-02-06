/*
 * Javascript Gravitational Lensing Library
 * 2013 Stuart Lowe (http://lcogt.net/), Phil Marshall (University of Oxford)
 *
 * Licensed under the MPL http://www.mozilla.org/MPL/MPL-1.1.txt
 *
 */

function Lens(input){

	// Process any input parameters
	this.w = (input && typeof input.width=="number") ? input.width : 0;
	this.h = (input && typeof input.height=="number") ? input.height : 0;

	this.scale = 4;

	// An array of lens components
	this.lens = [];

	// Let's put a source in the centre
	this.source = { x: parseInt(this.w/2), y: parseInt(this.h/2) };


	// Create 1D arrays
	// 1) array to hold the predicted image
	this.predictedimage = new Array(this.w*this.h);
	// 2) array to hold alpha at each (x,y)
	this.alpha = new Array(this.w*this.h);


	return this; // Return the Lens
}

Lens.prototype.addLensComponent = function(component){
	this.lens.push(component);
	
	return this; // Allow this function to be chainable
}

Lens.prototype.setScale = function(s){
	this.scale = s;

	return this; // Allow this function to be chainable
}

// This function will populate this.alpha
Lens.prototype.calculateAlpha = function(){

	// Set array to zero initially
	for(var i = 0 ; i < this.w*this.h ; i++){
		this.alpha[i] = { x: 0.0, y: 0.0 };
	}

	// Declare outside the for loop for efficiency
	var x, y, r, cosphi, sinphi;

	// Loop over lens components
	for(var j = 0 ; j < this.lens.length ; j++){
		for(var i = 0 ; i < this.w*this.h ; i++){
			x = i % this.w - this.lens[j].x;
			y = Math.floor(i/this.w) - this.lens[j].y;
			r = Math.sqrt(x*x+y*y);
			cosphi = x/r;
			sinphi = y/r;
			
			// Add on contribution from this component
			this.alpha[i].x += this.lens[j].theta_e*this.scale*cosphi;
			this.alpha[i].y += this.lens[j].theta_e*this.scale*sinphi;
		}
	}

	return this; // Allow this function to be chainable
}

// This function will populate this.predictedimage
Lens.prototype.calculateImage = function(){

	// Define some variables outside of the loop
	// as declaring them is expensive
	var delta = { x: 0, y: 0 };
	var i = 0;
	var r2 = 0;
	var row, col;

	// Loop over x and y. Store 1-D pixel index as i.
	for(row = 0 ; row < this.h ; row++){
		for(col = 0 ; col < this.w ; col++){
			delta.x = col - this.source.x - this.alpha[i].x;
			delta.y = row - this.source.y - this.alpha[i].y;

			r2 = ( delta.x*delta.x + delta.y*delta.y );
			this.predictedimage[i] = Math.exp(-r2/50.0);
                  // MAGIC number sigma=5 pixels, unlensed source radius...

			i++;
		}
	}
	
	return this; // Allow this function to be chainable
}
