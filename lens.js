/*
 * Javascript Gravitational Lensing Library
 * 2013 Stuart Lowe (http://lcogt.net/), Phil Marshall (University of Oxford)
 *
 * Licensed under the MPL http://www.mozilla.org/MPL/MPL-1.1.txt
 *
 */
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
    // 1) array to hold the predicted image
    this.predictedimage = new Array(this.w*this.h);
    // 2) array to hold alpha at each (x,y)
    this.alpha = new Array(this.w*this.h);
    return this; // Return the Lens
}
Lens.prototype.add = function(component){
    
// Input is an object containing:
//   plane - e.g. 'lens' or 'source'
//   x and y positions (arcsec relative to centre of grid)
//  lenses only: theta_e (SIS model, in arcsec)
//  sources only: size (Gaussian sigma, in arcsec)
    
    // Check inputs... inputs are in arcseconds
    if(!component) return this;
    if(!component.plane || typeof component.plane!=="string") return this;
    if(component.plane != "lens" && component.plane != "source") return this;
    if(component.plane == "lens"){
        if(typeof component.x!=="number" || typeof component.y!=="number" || typeof component.theta_e!=="number") return this;
    }else if (component.plane == "source"){
        if(typeof component.x!=="number" || typeof component.y!=="number" || typeof component.size!=="number") return this;
    }
    
    // Rescale angular coordinates and distances to pixels
    component.x = Math.round(component.x / this.pixscale + this.w/2)
    component.y = Math.round(component.y / this.pixscale + this.h/2)
    if(component.plane == "lens") component.theta_e = Math.round(component.theta_e / this.pixscale)
    if(component.plane == "source") component.size = Math.round(component.size / this.pixscale)
    
    if(component.plane == "lens") this.lens.push(component);
    if(component.plane == "source") this.source.push(component);
    
    return this; // Allow this function to be chainable
}
Lens.prototype.xy2ang = function(xy){
    return { x: (xy.x - this.w/2)*this.pixscale , y: (xy.y - this.h/2)*this.pixscale }
}
Lens.prototype.ang2xy = function(ang){

    return Math.round(ang. / this.pixscale + this.w/2)

}
Lens.prototype.removeAll = function(plane){
    if(!plane) return this;
    if(typeof plane !== "string") return this;
    if(plane == "source") this.source = [];
    if(plane == "lens") this.lens = [];
    return this;
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
            this.alpha[i].x += this.lens[j].theta_e*cosphi;
            this.alpha[i].y += this.lens[j].theta_e*sinphi;
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
            delta.x = col - this.source[0].x - this.alpha[i].x;
            delta.y = row - this.source[0].y - this.alpha[i].y;
            r2 = ( delta.x*delta.x + delta.y*delta.y );
            this.predictedimage[i] = Math.exp(-r2/50.0);
                  // MAGIC number sigma=5 pixels, unlensed source radius...
            i++;
        }
    }
    
    return this; // Allow this function to be chainable
}
