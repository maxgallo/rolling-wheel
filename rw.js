var RollingWheel = function(config){

    var RollingWheelEngine = function(config){

        this.canvas                    = config.canvas_dom_element;
        this.is_drag_enabled           = !!config.is_drag_enabled;
        this.is_click_for_spin_enabled = !!config.is_click_for_spin_enabled && !this.is_drag_enabled;
        this.margin                    = config.margin ? config.margin : 0;
        this.image_src                 = config.image_src ? config.image_src : false;
        this.disable_during_intertial  = config.disable_during_intertial ? true : false;

        this.force_clockwise        = (config.force_verse == 'clockwise') ? true : false;
        this.force_counterclockwise = (config.force_verse == 'counterclockwise') ? true : false;

        this.mode = {
            image : false,
            draw  : false
        }

        if(this.image_src){
            this.mode.image = true;
            this.mode.draw  = false;
        } else {
            this.mode.image = false;
            this.mode.draw  = true;
        }

        this.acceleration       = 0.025;
        this.mouse_up_max_speed = 13;

        this.context = this.canvas.getContext("2d");

        this.canvas_info = {
            center_x : this.canvas.width / 2,
            center_y : this.canvas.height / 2,
            offset_left : this.canvas.offsetLeft,
            offset_top  : this.canvas.offsetTop,
            smaller_size : (this.canvas.width > this.canvas.height) ? this.canvas.height : this.canvas.width
        }

        /* Status variables */
        this.current_angle             = 0;
        this.is_mouse_down             = 0;
        this.first_time_mouse_down     = 0;
        this.first_ever_dragging_angle = false;
        this.start_dragging_angle      = false;
        this.starting_animation_angle  = false;
        this.last_t                    = 0;
        this.delta_v                   = 0;
        this.next_animation_frame_id   = 0;
        this.animation_timeout_list    = [];
        this.inertial_rotation_active  = false;
        this.is_locked                 = false;
        this.force_stop_animation      = false;

        this.requestAnimFrame = 
            window.requestAnimationFrame       || 
            window.webkitRequestAnimationFrame || 
            window.mozRequestAnimationFrame    || 
            window.oRequestAnimationFrame      ||
            window.msRequestAnimationFrame     ;

        this.cancelAnimationFrame = 
            window.cancelAnimationFrame              ||
            window.webkitCancelRequestAnimationFrame || 
            window.webkitCancelAnimationFrame        ||
            window.mozCancelRequestAnimationFrame    ||
            window.mozCancelAnimationFrame           ||
            window.oCancelRequestAnimationFrame      ||
            window.oCancelAnimationFrame             ||
            window.msCancelRequestAnimationFrame     || 
            window.msCancelAnimationFrame            ;

        this.cancelAnimationFrame = this.cancelAnimationFrame.bind(window)

        this.events = {
            inertiaDidStopEvent  : config.inertiaDidStopEvent,
            inertiaDidStartEvent : config.inertiaDidStartEvent
        }

        this.currentAnimationTimeouts = []


        if(this.mode.draw){
            this.parseData(config.colors);    
        } else {
            this.image_data     = new Image();
            this.image_data.src = config.image_src;
            this.image_data.onload = function(){
                this.drawWheel()
            }.bind(this)
        }

        this.is_mobile = (function() {
            if(navigator.userAgent.match(/Android/i)
                    || navigator.userAgent.match(/webOS/i)
                    || navigator.userAgent.match(/iPhone/i)
                    || navigator.userAgent.match(/iPad/i)
                    || navigator.userAgent.match(/iPod/i)
                    || navigator.userAgent.match(/BlackBerry/i)
                    || navigator.userAgent.match(/Windows Phone/i)) {
                return true;
            }
            return false;
        })()
        this.init();
    }


    RollingWheelEngine.prototype = {
        internal_radius : 70,
        item_numbers    : 0,
        angle_unit      : 0,
        margin_unit     : 0,

        animateFps      : 1000,
        animateNow      : null,
        animateThen     : null,
        animateInterval : null,
        animateDelta    : null,

        init: function(){

            this.drawWheel();

            if(this.is_drag_enabled){
                this.addEventListeners('drag');
            } else {
                this.addEventListeners('tap');
                // add some event listeners for non dragging options
            }
        },
        parseData: function(data){

            this.data         = data;
            this.item_numbers = data.length;
            this.angle_unit   = (2*Math.PI - this.margin) / this.item_numbers; 

            this.margin_unit  = this.margin / this.item_numbers; 
        },
        getDataAtIndex:function(index){
            return this.data[index];
        },
        getData: function(index){
            return this.data;
        },
        drawImage: function(){

            var x_pos = -this.canvas_info.smaller_size/2;
            var y_pos = -this.canvas_info.smaller_size/2;

            this.context.drawImage(this.image_data, x_pos, y_pos, this.canvas_info.smaller_size, this.canvas_info.smaller_size);

        },
        drawWheel: function() {
            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height); // clear the entire canvas rect

            if(ctx = this.context ){

                ctx.save();
                ctx.translate(this.canvas_info.center_x, this.canvas_info.center_y); // Remaps the (0,0) position on the canvas

                if(this.mode.draw){
                    var data            = this.getData(),
                        current_angle   = -this.current_angle,
                        external_radius = this.canvas_info.smaller_size/2,
                        internal_radius = this.internal_radius,
                        item_numbers    = this.item_numbers,
                        angle_unit      = this.angle_unit,
                        margin_unit     = this.margin_unit;

                    var angle;
                    for(var i = 0; i < item_numbers; i++) {

                        angle = current_angle + angle_unit * i + margin_unit * i;

                        ctx.beginPath();
                        ctx.fillStyle = data[i];
                        ctx.arc(0, 0, external_radius, angle, angle + angle_unit, false);
                        ctx.arc(0, 0, internal_radius, angle + angle_unit, angle, true);
                        ctx.stroke();
                        ctx.fill();
                    }
                    ctx.closePath();
                    ctx.restore();

                    //Arrow TODO: move this shit out
                    ctx.fillStyle = "black";
                    ctx.beginPath();

                    var cx = this.canvas_info.center_x,
                        base = 12;

                    ctx.moveTo(cx - base/2, 0  ); //0 
                    ctx.lineTo(cx + base/2, 0  ); //1 
                    ctx.lineTo(cx + base/2, 30 ); //2
                    ctx.lineTo(cx + base  , 30 ); //3
                    ctx.lineTo(cx         , 45 ); //4
                    ctx.lineTo(cx - base  , 30 ); //5
                    ctx.lineTo(cx - base/2, 30 ); //6 
                    ctx.lineTo(cx - base/2, 0  ); //7
                    ctx.fill();
                    ctx.closePath();
                } else {

                    ctx.rotate(-this.current_angle); // rotate to selected angle
                    this.drawImage();
                    ctx.restore(); 
                }
            }
            
        },
        startSpin: function(callback_method){
            var composite_animation_object = [
                { "type" : "acceleration" , "time" : 1500 } ,
                { "type" : "constant"     , "time" : 30000000 } 
            ];
            this.beginCompositeAnimation(composite_animation_object);
        },
        stopSpin: function(callback_method){
            var composite_animation_object = [
                { "type" : "deceleration" , "callback" : this.fireEvent.bind(this, 'inertia_did_stop')}
            ];
            this.beginCompositeAnimation(composite_animation_object);
        },
        stopSpinImmediately: function(){
            this.force_stop_animation = true;
        },
        randomSpin: function(callback_method){

            var random = Math.random();
            var min = 1000, max = 2000;

            var acceleration_time = Math.max(min, Math.min(random*max, max)) + 1500;

            var composite_animation_object = [
                { "type" : "acceleration" , "time" : acceleration_time } ,
                { "type" : "constant"     , "time" : 3000 } ,
                { "type" : "deceleration" , "callback" : this.fireEvent.bind(this, 'inertia_did_stop')}
            ];

            this.beginCompositeAnimation(composite_animation_object);
        },
        beginCompositeAnimation: function(composite_animation){
            this.force_stop_animation = false
            if(this.is_locked){ return false;}

            var current_time = (new Date()).getTime();
            var last_animation_end_relative_time = 0;
            var animation, is_constant, relative_starting_time, acceleration;

            this.fireEvent('inertia_did_start');
            this.currentAnimationTimeouts = []

            for( var k = 0; k < composite_animation.length; k++ ){
                animation     = composite_animation[k];     
                switch(animation.type) { 
                    case "acceleration": 
                        acceleration = this.acceleration/10;
                        break; 
                    case "deceleration": 
                        acceleration = this.acceleration/15;
                        break;     
                    default: // "consant" 
                        acceleration = 0;
                        break; 
                }

                relative_starting_time = last_animation_end_relative_time;
                absolute_starting_time = relative_starting_time + current_time;

                var tt = setTimeout(function(acc, start_time, time, type, callback){
                    this.beginAnimation(acc, start_time, this.delta_v, time, type, callback);
                }.bind(this, acceleration, absolute_starting_time, animation.time, animation.type, animation.callback), relative_starting_time);

                this.animation_timeout_list.push(tt);
                last_animation_end_relative_time += animation.time;
                this.currentAnimationTimeouts.push(tt);
            }
        },
        animationTypeAcceleration  : function(v0, t, a){return v0 * t - .5 * a * Math.pow(t,2);} ,
        animationTypeConstantSpeed : function(v0, t, a){return v0 * t;} ,
        beginAnimation: function(acceleration, starting_time, starting_velocity, animation_duration, animation_type, callback){
            starting_velocity         = Math.round(starting_velocity);
            //console.log('begin animation type: ' + animation_type + ' with v0: ' + starting_velocity + ' and a: '+acceleration);

            var current_angle = this.current_angle;
            var animation_type_method;

            switch(animation_type) { 
                case "acceleration": 
                    animation_type_method = this.animationTypeAcceleration;
                    break;
                case "deceleration": 
                    animation_type_method = this.animationTypeAcceleration;

                    if(this.animation_timeout_list.length > 0){
                        for(var k=0; k< this.animation_timeout_list.length; k++){
                            //console.log('clearing: ' + this.animation_timeout_list[k]);
                            window.clearTimeout(this.animation_timeout_list[k]);
                        }
                        this.animation_timeout_list = [];
                    }
                    break;     
                default: // "consant" 
                    animation_type_method = this.animationTypeConstantSpeed;
                    break; 
            }

            this.starting_animation_angle = current_angle || this.current_angle;        

            var duration = Math.floor(animation_duration ? animation_duration : Math.abs(starting_velocity)/ acceleration); 
                verse    = (starting_velocity >= 0) ? 1 : -1; 

            //console.log('start acceleration with speed: ' + starting_velocity + ' and duration (sec): ' + duration / 1000);
            if(this.next_animation_frame_id){
                this.cancelAnimationFrame(this.next_animation_frame_id);

                if(window.cancelAnimationFrame){
                    window.cancelAnimationFrame(this.next_animation_frame_id);   
                }
            }

            this.inertial_rotation_active = true;

            this.animateThen = Date.now()
            this.animateInterval  = 1000 / this.animateFps
            this.animate(acceleration, starting_time, duration, verse, starting_velocity, animation_type_method, callback);
        },
        animate: function(acceleration, start_time, duration, verse, starting_speed, animation_type, callback) {

            // update
            var current_msec_time = (new Date()).getTime();
            var time              = current_msec_time - start_time;

            if(time > duration || this.is_mouse_down) {
                if(callback){ callback()}
                return;
            };

            if(this.force_stop_animation){
                this.clearAnimationData()
                return;
            }

            this.next_animation_frame_id = this.requestAnimFrame.call(window, function() {
                this.animate(acceleration, start_time, duration, verse, starting_speed, animation_type, callback);
            }.bind(this));

            this.animateNow = Date.now();
            this.animateDelta = this.animateNow - this.animateThen;

            if(this.animateDelta > this.animateInterval) {
                this.animateThen = this.animateNow - (this.animateDelta % this.animateInterval)
               
                var temp_new_angle = animation_type(starting_speed, time, verse * acceleration),
                    new_angle      = temp_new_angle / 1000 + this.starting_animation_angle;

                this.storeAnimationData(new_angle, current_msec_time);
                this.drawWheel();
            }
        },
        fireEvent: function(event_type) {

            switch(event_type) {
                case 'inertia_did_stop':
                    this.inertial_rotation_active = false;

                    if(this.mode.draw){
                        this.showColor();
                    }

                    if(this.events.inertiaDidStopEvent){
                        this.events.inertiaDidStopEvent();
                    }

                    break;
                case 'inertia_did_start':

                    if(this.events.inertiaDidStartEvent){
                        this.events.inertiaDidStartEvent();
                    }

                    break;    
                default:
                    
            }

        },
        showColor: function() {
            var ctx = this.context;
            ctx.save();

            var item_numbers      = this.item_numbers,
                angle_unit        = this.angle_unit + this.margin_unit,
                selector_position = 3/2*Math.PI; // clockwise starting from (1,0)
                current_angle     = this.current_angle + this.margin_unit/2;

            var index = Math.floor(((current_angle + selector_position) / angle_unit) % item_numbers);
            if(index < 0){
                index = item_numbers + index;
            }

            ctx.beginPath();
            ctx.arc(this.canvas_info.center_x, this.canvas_info.center_y, this.internal_radius - 20 ,0, 2*Math.PI);

            ctx.fillStyle = this.getDataAtIndex(index);;
            ctx.fill();
            ctx.restore();
        },
        customTapEvent: function(e){
            var _x, _y;
            if(e instanceof TouchEvent){
                _x = e.touches[0].pageX,
                _y = e.touches[0].pageY;
                e.preventDefault();
            } else {
                _x = e.clientX;
                _y = e.clientY;
            } 
            return {x:_x, y:_y}
        },
        isEverythingOk:function(){
            if(this.inertial_rotation_active && this.disable_during_intertial){
                return false;
            }
            if(this.is_locked){ 
                return false;
            }
            return true;
        },
        handleMouseDown: function(e) {
            if(!this.isEverythingOk()){ return;}
            if(this.is_click_for_spin_enabled){
                return this.randomSpin()
            }
            if (this.force_stop_animation) this.force_stop_animation = false;
            var tap = this.customTapEvent(e);

            //console.log('x: ' + tap.x + ' y: ' + tap.y + '    '  + this.context.isPointInPath(tap.x,tap.y));
            //var in_stroke = this.context.isPointInStroke(tap.x,tap.y)
            //console.log('in_stroke: ' + in_stroke);
            // console.log('this.inertial_rotation_active: ' + this.inertial_rotation_active)
            // console.log('this.disable_during_intertial: ' + this.disable_during_intertial)

            this.is_mouse_down         = true;
            this.first_time_mouse_down = true;
            
        },
        handleMouseOut: function(e) {
            this.is_mouse_down = false;
        },
        handleMouseUp: function(e) {
            if(!this.isEverythingOk()){ return;}

            this.is_mouse_down         = false;
            this.first_time_mouse_down = false;

            this.delta_v = Math.max(-this.mouse_up_max_speed, Math.min(this.delta_v, this.mouse_up_max_speed));

            this.fireEvent('inertia_did_start');
            this.beginAnimation(this.acceleration/8, (new Date()).getTime(), this.delta_v, false, "deceleration", this.fireEvent.bind(this, 'inertia_did_stop'));
        },
        handleMouseMove: function(e) {
            if (!this.is_mouse_down || this.is_locked) {
                return;
            }

            var ie = this.customTapEvent(e);

            mouseX = parseInt(ie.x - this.canvas_info.offset_left);
            mouseY = parseInt(ie.y - this.canvas_info.offset_top);

            var temp_angle = Math.atan2(this.canvas_info.center_y - mouseY, mouseX - this.canvas_info.center_x);

            if(!this.first_ever_dragging_angle){
                // this will run only once

                this.first_ever_dragging_angle = temp_angle;
                if(this.current_angle != 0){
                    this.first_ever_dragging_angle -= this.current_angle;
                }
                this.first_time_mouse_down = false;
            } else {
                if(this.first_time_mouse_down){
                    // this will run one per drag
                    this.start_dragging_angle =  temp_angle - this.first_ever_dragging_angle - this.current_angle;
                    this.first_time_mouse_down = false;
                }
            }
            var next_angle = temp_angle - this.start_dragging_angle - this.first_ever_dragging_angle;

            if(
                   this.force_clockwise        && (next_angle > this.current_angle)
                || (this.force_counterclockwise && (next_angle < this.current_angle))
            ){
                this.start_dragging_angle =  temp_angle - this.first_ever_dragging_angle - this.current_angle;
                return;
            }

            this.storeAnimationData(next_angle, (new Date()).getTime());
            this.drawWheel();
        },
        clearAnimationData:function(){
            var temp;
            for (var i = 0; i < this.currentAnimationTimeouts.length; i++) {
                temp = this.currentAnimationTimeouts[i];
                window.clearTimeout(temp);
            };
            
            this.delta_v = 0

        },
        storeAnimationData: function(next_angle, current_time){
            var delta_t  = (current_time - this.last_t)/1000,
                delta_s  = (next_angle - this.current_angle);

            this.delta_v = delta_s / delta_t;
            this.last_t  = current_time;

            this.current_angle = next_angle;
        },
        lock: function(){
            this.is_locked = true;
        },
        unlock: function(){
            this.is_locked = false;
        },
        addEventListeners: function(type){

            if(this.is_mobile){
                this.canvas.addEventListener("touchstart" , 
                    function(e){
                        this.handleMouseDown(e);
                    }.bind(this), 
                false);
                this.canvas.addEventListener("touchend"    , 
                    function(e){
                        this.handleMouseUp(e);
                    }.bind(this), 
                false);

                if(type == 'drag'){
                    this.canvas.addEventListener("touchmove"  , 
                        function(e){
                            this.handleMouseMove(e);
                        }.bind(this), 
                    false);
                    this.canvas.addEventListener("touchleave"   , 
                        function(e){
                            this.handleMouseOut(e);
                        }.bind(this),
                    false);
                }

            } else {
                this.canvas.addEventListener("mousedown" , 
                    function(e){
                        this.handleMouseDown(e);
                    }.bind(this), 
                false);
               this.canvas.addEventListener("mouseup"    , 
                    function(e){
                        this.handleMouseUp(e);
                    }.bind(this), 
                false);

                if(type == 'drag'){
                    this.canvas.addEventListener("mousemove"  , 
                        function(e){
                            this.handleMouseMove(e);
                        }.bind(this), 
                    false);
                    
                    this.canvas.addEventListener("mouseout"   , 
                        function(e){
                            this.handleMouseOut(e);
                        }.bind(this),
                    false);  
                } 
            }
        }
    } //RollingWheelEngine

    var _rolling_wheel_engine = new RollingWheelEngine(config);

    return {
        randomSpin : _rolling_wheel_engine.randomSpin.bind(_rolling_wheel_engine),
        startSpin  : _rolling_wheel_engine.startSpin.bind(_rolling_wheel_engine),
        stopSpin   : _rolling_wheel_engine.stopSpin.bind(_rolling_wheel_engine),
        lock       : _rolling_wheel_engine.lock.bind(_rolling_wheel_engine),
        unlock     : _rolling_wheel_engine.unlock.bind(_rolling_wheel_engine),
        stopSpinImmediately: _rolling_wheel_engine.stopSpinImmediately.bind(_rolling_wheel_engine),
    }
}
