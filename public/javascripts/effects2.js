// Copyright (c) 2005 Thomas Fuchs (http://mir.aculo.us)
// 
// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:
// 
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
// LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


	Effect2 = {}
	
	/* ------------- transitions ------------- */

	Effect2.Transitions = {}
	Effect2.Transitions.linear = function(pos) {
		return pos;
	}
	Effect2.Transitions.sinoidal = function(pos) {
		return (-Math.cos(pos*Math.PI)/2) + 0.5;
	}
	Effect2.Transitions.reverse  = function(pos) {
		return 1-pos;
	}
	Effect2.Transitions.flicker = function(pos) {
		return ((-Math.cos(pos*Math.PI)/4) + 0.75) + Math.random(0.25);
	}
	Effect2.Transitions.wobble = function(pos) {
		return (-Math.cos(pos*Math.PI*(9*pos))/2) + 0.5;
	}
	
	/* ------------- core effects ------------- */

	Effect2.Base = function() {};
	Effect2.Base.prototype = {
	  setOptions: function(options) {
	    this.options = {
	      transition: Effect2.Transitions.sinoidal,
	      duration:   1.0,   // seconds
	      fps:        25.0,  // max. 100fps
	      sync:       false, // true for combining
	      from:       0.0,
	      to:         1.0
	    }.extend(options || {});
	  },
	  start: function(options) {
	    this.setOptions(options || {});
	    this.currentFrame    = 0;
		  this.startOn  = new Date().getTime();
		  this.finishOn = this.startOn + (this.options.duration*1000);
		  if(this.options.beforeStart) this.options.beforeStart(this);
	    if(!this.options.sync) this.loop();	
	  },
	  loop: function() {
		 timePos = new Date().getTime();
		 if(timePos >= this.finishOn) {
			this.render(this.options.to);
			if(this.finish) this.finish(); 
			if(this.options.afterFinish) this.options.afterFinish(this);
			return;	
		 }
		 pos   = (timePos - this.startOn) / (this.finishOn - this.startOn);
		 frame = Math.round(pos * this.options.fps * this.options.duration);
		 if(frame > this.currentFrame) {
			this.render(pos);
			this.currentFrame = frame;
		 }
		 this.timeout = setTimeout(this.loop.bind(this), 10);
	  },
	  render: function(pos) {
		 if(this.options.transition) pos = this.options.transition(pos);
	  	 pos  = pos * (this.options.to-this.options.from);
	     pos += this.options.from; 
	  	 if(this.options.beforeUpdate) this.options.beforeUpdate(this);
	  	 if(this.update) this.update(pos);
	  	 if(this.options.afterUpdate) this.options.afterUpdate(this);	
	  },
	  cancel: function() {
		 if(this.timeout) clearTimeout(this.timeout);
	  }
	}
	
	Effect2.Parallel = Class.create();
		Effect2.Parallel.prototype = (new Effect2.Base()).extend({
		  initialize: function(effects) {
		    this.effects = effects || [];
		  	 this.start(arguments[1]);
		  },
		  update: function(position) {
		  	 for (var i = 0; i < this.effects.length; i++)
		  		this.effects[i].render(position);	
		  },
		  finish: function(position) {
		  	 for (var i = 0; i < this.effects.length; i++)
		  	  	if(this.effects[i].finish) this.effects[i].finish(position);
		  }
		});

  Effect2.Opacity = Class.create();
  Effect2.Opacity.prototype = (new Effect2.Base()).extend({
	  initialize: function() {
	    this.element = $(arguments[0] || document.rootElement);
	    options = {
	      from: 0.0,
	      to:   1.0
	  	}.extend(arguments[1] || {});
	  	this.start(options);
	  },
	  update: function(position) {
	  	this.setOpacity(position);
	  }, 
	  setOpacity: function(opacity) {
	  	opacity = (opacity == 1) ? 0.99999 : opacity;
	  	this.element.style.opacity = opacity;
	  	this.element.style.filter = "alpha(opacity:"+opacity*100+")";
	  }
	});

	Effect2.MoveBy = Class.create();
   Effect2.MoveBy.prototype = (new Effect2.Base()).extend({
     initialize: function(element, toTop, toLeft) {
     	 this.element      = $(element);
    	 this.originalTop  = 
         this.element.style.top ? parseFloat(this.element.style.top) : 0;
       this.originalLeft = 
         this.element.style.left ? parseFloat(this.element.style.left) : 0;
       this.toTop        = toTop;
     	 this.toLeft       = toLeft;
       if(this.element.style.position == "")
         this.element.style.position = "relative";
       this.start(arguments[3]);
     },
     update: function(position) {
	    topd  = this.toTop  * position + this.originalTop;
	    leftd = this.toLeft * position + this.originalLeft;
   	 this.setPosition(topd, leftd);
     },
     setPosition: function(topd, leftd) {
     	 this.element.style.top  = topd  + "px";
       this.element.style.left = leftd + "px";
     }
	});

	Effect2.Scale = Class.create();
	Effect2.Scale.prototype = (new Effect2.Base()).extend({
	  initialize: function(element, percent) {
	    this.element = $(element)
	    options = {
	      scaleX: true,
	      scaleY: true,
	      scaleContent: true,
	      scaleFromCenter: false,
	      scaleMode: 'box',        // 'box' or 'contents'
	      scaleFrom: 100.0
	    }.extend(arguments[2] || {});
	    this.originalTop    = this.element.offsetTop;
	    this.originalLeft   = this.element.offsetLeft;
	    if (this.element.style.fontSize=="") this.sizeEm = 1.0;
	    if (this.element.style.fontSize && this.element.style.fontSize.indexOf("em")>0)
	       this.sizeEm      = parseFloat(this.element.style.fontSize);
	    this.factor = (percent/100.0) - (options.scaleFrom/100.0);
	    if(options.scaleMode=='box') {
	      this.originalHeight = this.element.clientHeight;
	      this.originalWidth  = this.element.clientWidth; 
	    } else 
	    if(options.scaleMode=='contents') {
	      this.originalHeight = this.element.scrollHeight;
	      this.originalWidth  = this.element.scrollWidth;
	    }
	    this.start(options);
	  },

	  update: function(position) {
	    currentScale = (this.options.scaleFrom/100.0) + (this.factor * position);
	    if(this.options.scaleContent && this.sizeEm) 
	      this.element.style.fontSize = this.sizeEm*currentScale + "em";
	    this.setDimensions(
		   this.originalWidth * currentScale, 
		   this.originalHeight * currentScale);
	  },

	  setDimensions: function(width, height) {
	    if(this.options.scaleX) this.element.style.width = width + 'px';
	    if(this.options.scaleY) this.element.style.height = height + 'px';
	    if(this.options.scaleFromCenter) {
	      topd  = (height - this.originalHeight)/2;
	      leftd = (width  - this.originalWidth)/2;
	      if(this.element.style.position=='absolute') {
	        if(this.options.scaleY) this.element.style.top = this.originalTop-topd + "px";
	        if(this.options.scaleX) this.element.style.left = this.originalLeft-leftd + "px";
	      } else {
	        if(this.options.scaleY) this.element.style.top = -topd + "px";
	        if(this.options.scaleX) this.element.style.left = -leftd + "px";
	      }
	    }
	  }
	});
	
	/* ------------- prepackaged effects ------------- */
	
	Effect2.Fade =	function(element) {
		  options = {
			from: 1.0,
			to:   0.0,
			afterFinish: function(effect) 
			  { Element.hide(effect.element);
			    effect.setOpacity(1); } 
			}.extend(arguments[1] || {});
		  new Effect2.Opacity(element,options);
		}

Effect2.Appear =	function(element) {
  options = {
  from: 0.0,
  to:   1.0,
  beforeStart: function(effect)  
    { effect.setOpacity(0);
      Element.show(effect.element); },
  afterUpdate: function(effect)  
    { Element.show(effect.element); }
  }.extend(arguments[1] || {});
  new Effect2.Opacity(element,options);
}

	Effect2.Puff = function(element) {
	  new Effect2.Parallel(
	   [ new Effect2.Scale(element, 200, { sync: true, scaleFromCenter: true }), 
	     new Effect2.Opacity(element, { sync: true, to: 0.0, from: 1.0 } ) ], 
	     { duration: 1.0, 
		    afterUpdate: function(effect) 
		     { effect.effects[0].element.style.position = 'absolute'; },
		    afterFinish: function(effect)
		     { Element.hide(effect.effects[0].element); }
	     }
     );
	}

	Effect2.BlindUp = function(element) {
	  $(element).style.overflow = 'hidden';
	  new Effect2.Scale(element, 0, 
	    { scaleContent: false, 
        scaleX: false, 
        afterFinish: function(effect) 
          { Element.hide(effect.element) } 
      }.extend(arguments[1] || {})
	  );
	}

	Effect2.BlindDown = function(element) {
	  $(element).style.height   = '0px';
	  $(element).style.overflow = 'hidden';
	  Element.show(element);
	  new Effect2.Scale(element, 100, 
		  { scaleContent: false, 
			  scaleX: false, 
			  scaleMode: 'contents',
			  scaleFrom: 0
	    }.extend(arguments[1] || {})
	  );
	}

	Effect2.SwitchOff = function(element) {
		new Effect2.Appear(element,
		  { duration: 0.4,
			 transition: Effect2.Transitions.flicker,
			 afterFinish: function(effect)
			  {  effect.element.style.overflow = 'hidden';
				  new Effect2.Scale(effect.element, 1, 
				   { duration: 0.3, scaleFromCenter: true,
					  scaleX: false, scaleContent: false,
					  afterUpdate: function(effect) { 
						 if(effect.element.style.position=="")
						   effect.element.style.position = 'relative'; },
					  afterFinish: function(effect) { Element.hide(effect.element); }
				   } )
			  }
		  } )
	}

	Effect2.DropOut = function(element) {
		new Effect2.Parallel(
		  [ new Effect2.MoveBy(element, 100, 0, { sync: true }), 
		    new Effect2.Opacity(element, { sync: true, to: 0.0, from: 1.0 } ) ], 
		  { duration: 0.5, 
			 afterFinish: function(effect)
			   { Element.hide(effect.effects[0].element); } 
		  });
	}

	Effect2.Shake = function(element) {
		new Effect2.MoveBy(element, 0, 20, 
		  { duration: 0.05, afterFinish: function(effect) {
		new Effect2.MoveBy(effect.element, 0, -40, 
		  { duration: 0.1, afterFinish: function(effect) { 
		new Effect2.MoveBy(effect.element, 0, 40, 
		  { duration: 0.1, afterFinish: function(effect) {	
		new Effect2.MoveBy(effect.element, 0, -40, 
		  { duration: 0.1, afterFinish: function(effect) {	
		new Effect2.MoveBy(effect.element, 0, 40, 
		  { duration: 0.1, afterFinish: function(effect) {	
		new Effect2.MoveBy(effect.element, 0, -20, 
		  { duration: 0.05, afterFinish: function(effect) {	
		}}) }}) }}) }}) }}) }});
	}
	
	Effect2.SlideDown = function(element) {
		  $(element).style.height   = '0px';
		  $(element).style.overflow = 'hidden';
		  $(element).firstChild.style.position = 'relative';
		  Element.show(element);
		  new Effect2.Scale(element, 100, 
			 { scaleContent: false, 
				scaleX: false, 
				scaleMode: 'contents',
				scaleFrom: 0,
				afterUpdate: function(effect) 
				  { effect.element.firstChild.style.bottom = 
				      (effect.originalHeight - effect.element.clientHeight) + 'px'; }
		    }.extend(arguments[1] || {})
		  );
		}
		
		Effect2.SlideUp = function(element) {
			  $(element).style.overflow = 'hidden';
			  $(element).firstChild.style.position = 'relative';
			  Element.show(element);
			  new Effect2.Scale(element, 0, 
				 { scaleContent: false, 
					scaleX: false, 
					afterUpdate: function(effect) 
					  { effect.element.firstChild.style.bottom = 
					      (effect.originalHeight - effect.element.clientHeight) + 'px'; },
			    afterFinish: function(effect)
			      { Element.hide(effect.element); }
			   }.extend(arguments[1] || {})
			  );
			}