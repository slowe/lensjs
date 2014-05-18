//----------------------------------------------------------------------------
/*
 * Javascript Gravitational Lensing Library
 * 2013 Stuart Lowe (http://lcogt.net/), Phil Marshall (University of Oxford)
 *
 * Licensed under the MPL http://www.mozilla.org/MPL/MPL-1.1.txt
 *
 */
//----------------------------------------------------------------------------
// Enclose the Javascript
(function(exports) {
	exports.Lens = Lens;

	function Lens(input){
		// INPUTS:
		//    width       calculation (canvas) grid width in pixels
		//    height      calculation (canvas) grid height in pixels
		//    pixscale    pixel scale arcsec per pixel: this is used to 
		//                   convert angular coordinates and distances to pixels    
		// Set some defaults in case of no input...
		this.w = 0;
		this.h = 0;
		this.pixscale = 1.0;
		// An array of lens components:
		this.lens = [];
		// An array of source components:
		this.source = [];
		// Some working arrays:
		this.predictedimage = [];
		this.trueimage = [];
		this.alpha = []
		  
		// Sanity check the input. We must get a width, a height and a pixscale (arcseconds/pixel)
		if(!input) return this;
		if(input.width && typeof input.width!=="number") return this;
		if(input.height && typeof input.height!=="number") return this;
		if(input.pixscale && typeof input.pixscale!=="number") return this;
		
		// Process any input parameters
		this.w = input.width;
		this.h = input.height;
		this.pixscale = input.pixscale;
		// Create 1D arrays
		// 1) array to hold the predicted and true image
		this.predictedimage = new Array(this.w*this.h);
		this.trueimage = new Array(this.w*this.h);
		// 2) arrays to hold vector alpha at each (x,y)
		this.alpha = new Array(this.w*this.h);
		// 3) arrays to hold tensor magnification (kappa, gamma etc) at each (x,y)
		this.mag = new Array(this.w*this.h);
		
		return this; // Return the Lens, ready to be manipulated.
	}
	//----------------------------------------------------------------------------
	// Add a component to the model - either lens mass or source brightness
	Lens.prototype.add = function(component){
	
		// Input is an object containing:
		//   plane - e.g. 'lens' or 'source'
		//   x and y positions (arcsec relative to centre of grid)
		//   lenses only: theta_e (SIS model, in arcsec)
		//   sources only: size (Gaussian sigma, in arcsec)

		// Check inputs... coordinates/distances are in arcseconds
		if(!component) return this;
		if(!component.plane || typeof component.plane!=="string") return this;
		if(component.plane != "lens" && component.plane != "source") return this;
		if(component.plane == "lens"){
			if(typeof component.x!=="number" || typeof component.y!=="number" || typeof component.theta_e!=="number") return this;
		}else if (component.plane == "source"){
			if(typeof component.x!=="number" || typeof component.y!=="number" || typeof component.size!=="number") return this;
		}
		
		// Transform angular coordinates and distances to pixel coordinate system:
		var coords = this.ang2pix({x:component.x, y:component.y});

		// Construct a new version of the component otherwise the original gets changed
		var c = { x : coords.x, y: coords.y, theta_e: component.theta_e, plane : component.plane };

		if(c.plane == "lens"){
			c.theta_e = component.theta_e;
			c.theta_e_px = c.theta_e / this.pixscale;
		}
		if(c.plane == "source"){
			c.size = component.size;
			c.size_px = c.size / this.pixscale;
		}

		// Push the c into the relevant array:
		if(c.plane == "lens") this.lens.push(c);
		if(c.plane == "source") this.source.push(c);

		return this; // Allow this function to be chainable
	}
	//----------------------------------------------------------------------------
	// From an x,y position in pixel coords, 
    // get the equivalent index in the 1D array
	Lens.prototype.xy2i = function(x,y){
		var i = y + x*this.h;
		if(i >= this.w*this.h) i = this.w*this.h-1;
		return i;
	}
	Lens.prototype.altxy2i = function(x,y){
		var i = x + y*this.w;
		if(i >= this.h*this.w) i = this.h*this.w-1;
		return i;
	}
	//----------------------------------------------------------------------------
	// Coordinate transformations - note that canvas y runs from top to bottom!
	Lens.prototype.pix2ang = function(pix){
		// Check inputs
		if(!pix || typeof pix.x!=="number" || typeof pix.y!=="number") return { x: 0, y: 0 };
		return { x: (pix.x - this.w/2)*this.pixscale , y: (this.h/2 - pix.y)*this.pixscale };
	}
	Lens.prototype.ang2pix = function(ang){
		// Check inputs
		if(!ang || typeof ang.x!=="number" || typeof ang.y!=="number") return { x: 0, y: 0 };
		return { x: Math.round(ang.x / this.pixscale + this.w/2), y: Math.round(this.h/2 - ang.y / this.pixscale) } 
	}
	//----------------------------------------------------------------------------
	// Cleaning up (typically before replotting)
	Lens.prototype.removeAll = function(plane){
		if(!plane) return this;
		if(typeof plane !== "string") return this;
		if(plane == "source") this.source = [];
		if(plane == "lens") this.lens = [];
		return this;
	}
	//----------------------------------------------------------------------------
	// This function will populate this.alpha and this.mag, and compute critical curves and caustics:
	Lens.prototype.calculateAlpha = function(){
	
		// Set arrays to zero initially:
		for(var i = 0 ; i < this.w*this.h ; i++){
			this.alpha[i] = { x: 0.0, y: 0.0 };
			this.mag[i] = {kappa: 0.0, gamma1: 0.0, gamma2: 0.0, inverse: 0.0}
		}
		// Declare outside the for loop for efficiency
		var x, y, r, cosphi, sinphi;
		// Loop over pixels:
		for(var i = 0 ; i < this.w*this.h ; i++){
			// Loop over lens components:
			for(var j = 0 ; j < this.lens.length ; j++){
				x = i % this.w - this.lens[j].x;
				y = Math.floor(i/this.w) - this.lens[j].y;
				r = Math.sqrt(x*x+y*y);
				cosphi = x/r;
				sinphi = y/r;
				costwophi = 1 - 2*sinphi*sinphi;
				sintwophi = 2*sinphi*cosphi;
				// Add lensing effects of just this component:
				this.alpha[i].x += this.lens[j].theta_e_px*cosphi;
				this.alpha[i].y += this.lens[j].theta_e_px*sinphi;
				kappa = 0.5 * this.lens[j].theta_e_px / r
				this.mag[i].kappa += kappa;
				this.mag[i].gamma1 += kappa * costwophi;
				this.mag[i].gamma2 += kappa * sintwophi;
			}
			// Inverse magnification at this pixel:
			this.mag[i].inverse = (1.0-this.mag[i].kappa)*(1.0-this.mag[i].kappa) - this.mag[i].gamma1*this.mag[i].gamma1 - this.mag[i].gamma2*this.mag[i].gamma2
		}
		// TO BE TRANSFERRED FROM LENSWRANGLER...
		// Calculate critical curve as set of x,y points:
		//   this.critcurve = contour(this.w,this.h,this.mag.inverse,0.0)
		// Map to the source plane to get corresponding caustic:
		//   this.caustic = this.map(this.critcurve,this.alpha)
		return this; // Allow this function to be chainable
	}
	//----------------------------------------------------------------------------
	// This function will populate this.predictedimage
	Lens.prototype.calculateImage = function(){
		// Define some variables outside of the loop
		// as declaring them is expensive
		var d = { x: 0, y: 0 };
		var i = 0;
		var r2 = 0;
        var factor = 1.0/(0.693*this.source[0].size_px*this.source[0].size_px)
        // Since for a Gaussian, half light radius (size) = sigma * sqrt(2*ln(2))
		var ns = this.source.length;
		var row, col, s, v;
		// Loop over x and y. Store 1-D pixel index as i.
		for(row = 0 ; row < this.h ; row++){
			for(col = 0 ; col < this.w ; col++){
				v = 0;
				for(s = 0 ; s < ns ; s++){
					d.x = col - this.source[0].x - this.alpha[i].x;
					d.y = row - this.source[0].y - this.alpha[i].y;
					r2 = ( d.x*d.x + d.y*d.y );
					// MAGIC number sigma=5 pixels, unlensed source radius...
					// v += Math.exp(-r2/50.0);
                    // Using correct source size:
					v += Math.exp(-factor*r2);
				}
				this.predictedimage[i++] = v;
			}
		}
		
		return this; // Allow this function to be chainable
	}
	//----------------------------------------------------------------------------
	// This function will populate this.trueimage
	Lens.prototype.calculateTrueImage = function(){
		// Define some variables outside of the loop
		// as declaring them is expensive
		var d = { x: 0, y: 0 };
		var i = 0;
		var r2 = 0;
        var factor = 1.0/(0.693*this.source[0].size_px*this.source[0].size_px)
        // Since for a Gaussian, half light radius (size) = sigma * sqrt(2*ln(2))
		var ns = this.source.length;
		var row, col, s, v;
		// Loop over x and y. Store 1-D pixel index as i.
		for(row = 0 ; row < this.h ; row++){
			for(col = 0 ; col < this.w ; col++){
				v = 0;
				for(s = 0 ; s < ns ; s++){
					d.x = col - this.source[0].x;
					d.y = row - this.source[0].y;
					r2 = ( d.x*d.x + d.y*d.y );
					// MAGIC number sigma=5 pixels, unlensed source radius...
					// v += Math.exp(-r2/50.0);
                    // Using correct source size:
					v += Math.exp(-factor*r2);
				}
				this.trueimage[i++] = v;
			}
		}
		
		return this; // Allow this function to be chainable
	}

})(typeof exports !== "undefined" ? exports : window);
