JSM.Navigation = function ()
{
	this.canvas = null;
	this.camera = null;
	this.drawCallback = null;
	this.resizeCallback = null;
	
	this.mouse = null;
	this.touch = null;
	
	this.cameraFixUp = null;
	this.cameraEnableOrbit = null;
	this.cameraEnablePan = null;
	this.cameraEnableZoom = null;
	this.cameraNearDistanceLimit = null;
	this.cameraFarDistanceLimit = null;
	
	this.orbitCenter = null;
};

JSM.Navigation.prototype.Init = function (canvas, camera, drawCallback, resizeCallback)
{
	this.canvas = canvas;
	this.camera = camera;
	this.drawCallback = drawCallback;
	this.resizeCallback = resizeCallback;

	this.mouse = new JSM.Mouse ();
	this.touch = new JSM.Touch ();
	
	this.cameraFixUp = true;
	this.cameraEnableOrbit = true;
	this.cameraEnablePan = true;
	this.cameraEnableZoom = true;
	this.cameraNearDistanceLimit = 0.1;
	this.cameraFarDistanceLimit = 1000.0;
	
	this.orbitCenter = this.camera.center.Clone ();

	var myThis = this;
	if (document.addEventListener) {
		document.addEventListener ('mousemove', function (event) {myThis.OnMouseMove (event);});
		document.addEventListener ('mouseup', function (event) {myThis.OnMouseUp (event);});
	}
	if (this.canvas.addEventListener) {
		this.canvas.addEventListener ('mousedown', function (event) {myThis.OnMouseDown (event);}, false);
		this.canvas.addEventListener ('DOMMouseScroll', function (event) {myThis.OnMouseWheel (event);}, false);
		this.canvas.addEventListener ('mousewheel', function (event) {myThis.OnMouseWheel (event);}, false);
		this.canvas.addEventListener ('touchstart', function (event) {myThis.OnTouchStart (event);}, false);
		this.canvas.addEventListener ('touchmove', function (event) {myThis.OnTouchMove (event);}, false);
		this.canvas.addEventListener ('touchend', function (event) {myThis.OnTouchEnd (event);}, false);
		this.canvas.addEventListener ('contextmenu', function (event) {myThis.OnContextMenu (event);}, false);
	}
	if (window.addEventListener) {
		window.addEventListener ('resize', function (event) {myThis.OnResize (event);}, false);
	}
	
	return true;
};

JSM.Navigation.prototype.SetCamera = function (eye, center, up)
{
	this.camera.Set (eye, center, up);
	this.orbitCenter = this.camera.center.Clone ();
};

JSM.Navigation.prototype.EnableFixUp = function (enable)
{
	this.cameraFixUp = enable;
};

JSM.Navigation.prototype.EnableOrbit = function (enable)
{
	this.cameraEnableOrbit = enable;
};

JSM.Navigation.prototype.EnablePan = function (enable)
{
	this.cameraEnablePan = enable;
};

JSM.Navigation.prototype.EnableZoom = function (enable)
{
	this.cameraEnableZoom = enable;
};

JSM.Navigation.prototype.SetNearDistanceLimit = function (limit)
{
	this.cameraNearDistanceLimit = limit;
};

JSM.Navigation.prototype.SetFarDistanceLimit = function (limit)
{
	this.cameraFarDistanceLimit = limit;
};

JSM.Navigation.prototype.SetOrbitCenter = function (orbitCenter)
{
	this.orbitCenter = orbitCenter;
};

JSM.Navigation.prototype.FitInWindow = function (center, radius)
{
	var offsetToOrigo = JSM.CoordSub (this.camera.center, center);
	this.camera.center = center;
	this.camera.eye = JSM.CoordSub (this.camera.eye, offsetToOrigo);
	
	var centerEyeDirection = JSM.CoordSub (this.camera.eye, this.camera.center).Normalize ();
	var fieldOfView = this.camera.fieldOfView / 2.0;
	if (this.canvas.width < this.canvas.height) {
		fieldOfView = fieldOfView * this.canvas.width / this.canvas.height;
	}
	var distance = radius / Math.sin (fieldOfView * JSM.DegRad);
	
	this.camera.eye = this.camera.center.Clone ().Offset (centerEyeDirection, distance);
	this.orbitCenter = this.camera.center.Clone ();
};

JSM.Navigation.prototype.Orbit = function (angleX, angleY)
{
	var radAngleX = angleX * JSM.DegRad;
	var radAngleY = angleY * JSM.DegRad;
	
	var viewDirection = JSM.CoordSub (this.camera.center, this.camera.eye).Normalize ();
	var horizontalDirection = JSM.VectorCross (viewDirection, this.camera.up).Normalize ();
	var differentCenter = !this.orbitCenter.IsEqual (this.camera.center);
	
	if (this.cameraFixUp) {
		var originalAngle = viewDirection.AngleTo (this.camera.up);
		var newAngle = originalAngle + radAngleY;
		if (JSM.IsGreater (newAngle, 0.0) && JSM.IsLower (newAngle, Math.PI)) {
			this.camera.eye.Rotate (horizontalDirection, -radAngleY, this.orbitCenter);
			if (differentCenter) {
				this.camera.center.Rotate (horizontalDirection, -radAngleY, this.orbitCenter);
			}
		}
		this.camera.eye.Rotate (this.camera.up, -radAngleX, this.orbitCenter);
		if (differentCenter) {
			this.camera.center.Rotate (this.camera.up, -radAngleX, this.orbitCenter);
		}
	} else {
		var verticalDirection = JSM.VectorCross (horizontalDirection, viewDirection).Normalize ();
		this.camera.eye.Rotate (horizontalDirection, -radAngleY, this.orbitCenter);
		this.camera.eye.Rotate (verticalDirection, -radAngleX, this.orbitCenter);
		if (differentCenter) {
			this.camera.center.Rotate (horizontalDirection, -radAngleY, this.orbitCenter);
			this.camera.center.Rotate (verticalDirection, -radAngleX, this.orbitCenter);
		}
		this.camera.up = verticalDirection;
	}
};

JSM.Navigation.prototype.Pan = function (moveX, moveY)
{
	var viewDirection = JSM.CoordSub (this.camera.center, this.camera.eye).Normalize ();
	var horizontalDirection = JSM.VectorCross (viewDirection, this.camera.up).Normalize ();
	var verticalDirection = JSM.VectorCross (horizontalDirection, viewDirection).Normalize ();
	
	this.camera.eye.Offset (horizontalDirection, -moveX);
	this.camera.center.Offset (horizontalDirection, -moveX);

	this.camera.eye.Offset (verticalDirection, moveY);
	this.camera.center.Offset (verticalDirection, moveY);
};

JSM.Navigation.prototype.Zoom = function (zoomIn)
{
	var direction = JSM.CoordSub (this.camera.center, this.camera.eye);
	var distance = direction.Length ();
	if (zoomIn && distance < this.cameraNearDistanceLimit) {
		return 0;
	} else if (!zoomIn && distance > this.cameraFarDistanceLimit) {
		return 0;
	}

	var move = distance * 0.1;
	if (!zoomIn) {
		move = move * -1.0;
	}

	this.camera.eye.Offset (direction, move);
};

JSM.Navigation.prototype.DrawCallback = function ()
{
	if (this.drawCallback !== undefined && this.drawCallback !== null) {
		this.drawCallback ();
	}
};

JSM.Navigation.prototype.ResizeCallback = function ()
{
	if (this.resizeCallback !== undefined && this.resizeCallback !== null) {
		this.resizeCallback ();
	}
};

JSM.Navigation.prototype.OnMouseDown = function (event)
{
	event.preventDefault ();
	this.mouse.Down (event, this.canvas);
};

JSM.Navigation.prototype.OnMouseMove = function (event)
{
	event.preventDefault ();
	this.mouse.Move (event, this.canvas);
	if (!this.mouse.down) {
		return;
	}

	var ratio = 0.0;
	if (this.mouse.button == 1) {
		if (!this.cameraEnableOrbit) {
			return;
		}
		
		ratio = 0.5;
		this.Orbit (this.mouse.diffX * ratio, this.mouse.diffY * ratio);
		this.DrawCallback ();
	} else if (this.mouse.button == 3) {
		if (!this.cameraEnablePan) {
			return;
		}
		
		var eyeCenterDistance = this.camera.eye.DistanceTo (this.camera.center);
		ratio = 0.001 * eyeCenterDistance;
		this.Pan (this.mouse.diffX * ratio, this.mouse.diffY * ratio);
		this.DrawCallback ();
	}
};

JSM.Navigation.prototype.OnMouseUp = function (event)
{
	event.preventDefault ();
	this.mouse.Up (event, this.canvas);
};

JSM.Navigation.prototype.OnMouseOut = function (event)
{
	event.preventDefault ();
	this.mouse.Out (event, this.canvas);
};

JSM.Navigation.prototype.OnMouseWheel = function (event)
{
	event.preventDefault ();
	if (!this.cameraEnableZoom) {
		return;
	}

	var eventParameters = event;
	if (eventParameters === null) {
		eventParameters = window.event;
	}
	
	var delta = 0;
	if (eventParameters.detail) {
		delta = -eventParameters.detail;
	} else if (eventParameters.wheelDelta) {
		delta = eventParameters.wheelDelta / 40;
	}

	var zoomIn = delta > 0;
	this.Zoom (zoomIn);
	this.DrawCallback ();
};

JSM.Navigation.prototype.OnTouchStart = function (event)
{
	event.preventDefault ();
	this.touch.Start (event, this.canvas);
};

JSM.Navigation.prototype.OnTouchMove = function (event)
{
	event.preventDefault ();
	this.touch.Move (event, this.canvas);
	if (!this.touch.down) {
		return;
	}

	if (!this.cameraEnableOrbit) {
		return;
	}
	
	var ratio = 0.5;
	this.Orbit (this.touch.diffX * ratio, this.touch.diffY * ratio);
	this.DrawCallback ();
};

JSM.Navigation.prototype.OnTouchEnd = function (event)
{
	event.preventDefault ();
	this.touch.End (event, this.canvas);
};

JSM.Navigation.prototype.OnContextMenu = function (event)
{
	event.preventDefault ();
};

JSM.Navigation.prototype.OnResize = function (event)
{
	event.preventDefault ();
	this.ResizeCallback ();
};
