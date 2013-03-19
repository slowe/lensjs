(function(exports) {
	exports.Canvas = Canvas;

	// Extra mathematical/helper functions that will be useful - inspired by http://alexyoung.github.com/ico/
	var G = {};
	G.sum = function(a) { var i, sum; for (i = 0, sum = 0; i < a.length; sum += a[i++]) {}; return sum; };
	if (typeof Array.prototype.max === 'undefined') G.max = function(a) { return Math.max.apply({}, a); };
	else G.max = function(a) { return a.max(); };
	if (typeof Array.prototype.min === 'undefined') G.min = function(a) { return Math.min.apply({}, a); };
	else G.min = function(a) { return a.min(); };
	G.mean = function(a) { return G.sum(a) / a.length; };
	G.stddev = function(a) { return Math.sqrt(G.variance(a)); };
	G.log10 = function(v) { return Math.log(v)/2.302585092994046; };
	G.variance = function(a) { var mean = G.mean(a), variance = 0; for (var i = 0; i < a.length; i++) variance += Math.pow(a[i] - mean, 2); return variance / (a.length - 1); };
	if (typeof Object.extend === 'undefined') {
		G.extend = function(destination, source) {
			for (var property in source) {
				if (source.hasOwnProperty(property)) destination[property] = source[property];
			}
			return destination;
		};
	} else G.extend = Object.extend;

	// We need to set up the canvas. This may mean attaching to an existing <div>
	// By the end of this function we have this.ctx available with events attached.
	// Make sure you have set the width/height of the canvas element
	function Canvas(input){

		this.id = (input && typeof input.id=="string") ? input.id : "LensToy";
		this.src = (input && typeof input.src=="string") ? input.src : "";
		this.width = (input && typeof input.width=="number") ? input.width : parseInt(getStyle(this.id, 'width'), 10);
		this.height = (input && typeof input.height=="number") ? input.height : parseInt(getStyle(this.id, 'height'), 10);
		this.events = { load:"", click:"", mousemove:"" };	// Let's define some events
		this.clipboard = {};
		this.clipboardData = {};

		// Now we want to build the <canvas> element that will hold our image
		var el = document.getElementById(this.id);
		//if(console && typeof console.log=="function") console.log('setup',el,id)
		if(el!=null){
			// Look for a <canvas> with the specified ID or fall back on a <div>
			if(typeof el=="object" && el.tagName != "CANVAS"){
				// Looks like the element is a container for our <canvas>
				el.setAttribute('id',this.id+'holder');
				var canvas = document.createElement('canvas');
				canvas.style.display='block';
				canvas.setAttribute('width',this.width);
				canvas.setAttribute('height',this.height);
				canvas.setAttribute('id',this.id);
				el.appendChild(canvas);
				// For excanvas we need to initialise the newly created <canvas>
				if(/*@cc_on!@*/false) el = G_vmlCanvasManager.initElement(this.canvas);
			}else{
				// Define the size of the canvas
				// Excanvas doesn't seem to attach itself to the existing
				// <canvas> so we make a new one and replace it.
				if(/*@cc_on!@*/false){
					var canvas = document.createElement('canvas');
					canvas.style.display='block';
					canvas.setAttribute('width',this.width);
					canvas.setAttribute('height',this.height);
					canvas.setAttribute('id',this.id);
					el.parentNode.replaceChild(canvas,el);
					if(/*@cc_on!@*/false) el = G_vmlCanvasManager.initElement(elcanvas);
				}else{
					el.setAttribute('width',this.width);
					el.setAttribute('height',this.height);
				}   
			}
			this.canvas = document.getElementById(this.id);
		}else this.canvas = el;
		this.ctx = (this.canvas) ? this.canvas.getContext("2d") : null;
	
		// The object didn't exist before so we add event listeners to it
		var _obj = this;
		addEvent(this.canvas,"click",function(e){
			_obj.getCursor(e);
			_obj.trigger("click",{x:_obj.cursor.x,y:_obj.cursor.y});
		});
		addEvent(this.canvas,"mousemove",function(e){
			_obj.getCursor(e);
			_obj.trigger("mousemove",{x:_obj.cursor.x,y:_obj.cursor.y})
		});
		addEvent(this.canvas,"mouseout",function(e){
			_obj.trigger("mouseout")
		});
		addEvent(this.canvas,"mouseover",function(e){
			_obj.trigger("mouseover")
		});
		return this;
	}

	Canvas.prototype.clear = function(){
		this.ctx.clearRect(0,0,this.width,this.height);
	}

	Canvas.prototype.blur = function(imageData, w, h){
	
		var steps = 3;
		var scale = 4;
		// Kernel width 0.9", trades off with alpha channel...
		var smallW = Math.round(w / scale);
		var smallH = Math.round(h / scale);
	
		var canvas = document.createElement("canvas");
		canvas.width = w;
		canvas.height = h;
		var ctx = canvas.getContext("2d");
		ctx.putImageData(imageData,0,0);
	
		var copy = document.createElement("canvas");
		copy.width = smallW;
		copy.height = smallH;
		var copyCtx = copy.getContext("2d");
	
		// Convolution with square top hat kernel, by shifting and redrawing image...
		// Does not get brightness quite right...
		for (var i=0;i<steps;i++) {
			var scaledW = Math.max(1,Math.round(smallW - 2*i));
			var scaledH = Math.max(1,Math.round(smallH - 2*i));
			
			copyCtx.clearRect(0,0,smallW,smallH);
			copyCtx.drawImage(canvas, 0, 0, w, h, 0, 0, scaledW, scaledH);
			ctx.drawImage(copy, 0, 0, scaledW, scaledH, 0, 0, w, h);
		}
	
		return ctx.getImageData(0, 0, w, h);
	
	}

	Canvas.prototype.overlay = function(imageData){
	
		// Because of the way putImageData replaces all the pixel values, 
		// we have to create a temporary canvas and put it there.
		var overlayCanvas = document.createElement("canvas");
		overlayCanvas.width = this.width;
		overlayCanvas.height = this.height;
		overlayCanvas.getContext("2d").putImageData(imageData, 0, 0);
	
		// Now we can combine the new image with our existing canvas
		// whilst preserving transparency
		this.ctx.drawImage(overlayCanvas, 0, 0);
	}

	Canvas.prototype.overlayFromClipboard = function(name){
		if(this.ctx){
			if(!name || typeof name!=="string") name = "default";
			if(!this.clipboard[name]) return this;

			this.overlay(this.clipboard[name]);
		}
		return this;
	}

	Canvas.prototype.copyToClipboard = function(name,img){
		if(this.ctx){
			if(!name || typeof name!=="string") name = "default";

			// Will fail if the browser thinks the image was cross-domain
			try {
				this.clipboard[name] = (img) ? img : this.ctx.getImageData(0, 0, this.width, this.height);
				this.clipboardData[name] = this.clipboard[name].data;
			}catch(e){};
		}
		return this;
	}
	
	Canvas.prototype.pasteFromClipboard = function(name){
		if(this.ctx){
			if(!name || typeof name!=="string") name = "default";
			if(!this.clipboard[name]) return this;

			// Will fail if the browser thinks the image was cross-domain
			try {
				this.clipboard[name].data = this.clipboardData[name];
				this.ctx.putImageData(this.clipboard[name], 0, 0);
			}catch(e){};
		}
		return this;
	}
	
	
	Canvas.prototype.getCursor = function(e){
		var x;
		var y;
		if (e.pageX != undefined && e.pageY != undefined){
			x = e.pageX;
			y = e.pageY;
		}else{
			x = e.clientX + document.body.scrollLeft + document.body.scrollLeft +document.documentElement.scrollLeft;
			y = e.clientY + document.body.scrollTop + document.body.scrollTop +document.documentElement.scrollTop;
		}
	
		var target = e.target
		while(target){
			x -= target.offsetLeft;
			y -= target.offsetTop;
			target = target.offsetParent;
		}
		this.cursor = {x:x, y:y};
		return this.cursor;
	}
	
	// Attach a handler to an event for the Canvas object in a style similar to that used by jQuery
	// .bind(eventType[,eventData],handler(eventObject));
	// .bind("resize",function(e){ console.log(e); });
	// .bind("resize",{me:this},function(e){ console.log(e.data.me); });
	Canvas.prototype.bind = function(ev,e,fn){
		if(typeof ev!="string") return this;
		if(typeof fn==="undefined"){
			fn = e;
			e = {};
		}else{
			e = {data:e}
		}
		if(typeof e!="object" || typeof fn!="function") return this;
		if(this.events[ev]) this.events[ev].push({e:e,fn:fn});
		else this.events[ev] = [{e:e,fn:fn}];
		return this;
	}
	// Trigger a defined event with arguments. This is for internal-use to be
	// sure to include the correct arguments for a particular event
	Canvas.prototype.trigger = function(ev,args){
		if(typeof ev != "string") return;
		if(typeof args != "object") args = {};
		var o = [];
		if(typeof this.events[ev]=="object"){
			for(var i = 0 ; i < this.events[ev].length ; i++){
				var e = G.extend(this.events[ev][i].e,args);
				if(typeof this.events[ev][i].fn == "function") o.push(this.events[ev][i].fn.call(this,e))
			}
		}
		if(o.length > 0) return o;
	}
		


	// Helpful functions
	
	// Cross-browser way to add an event
	if(typeof addEvent!="function"){
		function addEvent(oElement, strEvent, fncHandler){
			if(!oElement) return;
			if(oElement.addEventListener) oElement.addEventListener(strEvent, fncHandler, false);
			else if(oElement.attachEvent) oElement.attachEvent("on" + strEvent, fncHandler);
		}
	}
	
	function trim(s) {
		s = s.replace(/(^\s*)|(\s*$)/gi,"");
		s = s.replace(/[ ]{2,}/gi," ");
		s = s.replace(/\n /,"\n");
		return s;
	}
	
	// A non-jQuery dependent function to get a style
	function getStyle(el, styleProp) {
		if (typeof window === 'undefined') return;
		var style;
		var el = document.getElementById(el);
		if(!el) return null;
		if(el.currentStyle) style = el.currentStyle[styleProp];
		else if (window.getComputedStyle) style = document.defaultView.getComputedStyle(el, null).getPropertyValue(styleProp);
		if(style && style.length === 0) style = null;
		return style;
	}
})(typeof exports !== "undefined" ? exports : window);
