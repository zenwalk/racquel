dojo.provide("racquelDijits.racquelSearchSettings");
dojo.declare("racquelDijits.racquelSearchSettings",[],{
	constructor:function(){
		this._isSite = true;
		this._isRoute = true;
		this._isCatchment = true;
		this._isElev = true;
		this._isLCM2K = true;
		this._isUpstream = true;
		this._qcCatchment = true;
		this._useNetLoc = true;
	},
	setSite:function(onoff){
		if (onoff){
			this._isSite = true;
		}
		else {
			this._isSite = false;
		}
	},
	setRoute:function(onoff){
		if (onoff){
			this._isRoute = true;
		}
		else { this._isRoute = false;}
	},
	setCatchment:function(onoff){
		if(onoff){
			this._isCatchment = true;
		}
		else {
			this._isCatchment = false;
		}
	},
	setElev:function(onoff){
		if (onoff && this._isCatchment){
			this._isElev = true;
		}
		else {
			this._isElev = false;
		}
	},
	setLCM2K:function(onoff){
		if (onoff && this._isCatchment){
			this._isLCM2K = true;
		}
		else {
			this._isLCM2K = false;
		}
	},
	setUpstream:function(onoff){
		if (onoff && this._isCatchment){
			this._isUpstream = true;
		}
		else {
			this._isUpstream = false;
		}
	},
	setCatchmentQC:function(onoff){
		if (onoff && this._isCatchment && this._isRoute){
			this._qcCatchment = true;
		}
		else{
			this._qcCatchment = false;
		} 
	},
	setUseNetLoc:function(onoff){
		if (onoff && this._isRoute){
			this._useNetLoc = true;
		}
		else {
			this._useNetLoc = false;
		}
	},
	doSite:function(){ return this._isSite;},
	doRoute: function(){ return this._isRoute;},
	doCatchment: function() { return this._isCatchment;},
	doElev: function() { return this._isElev;},
	doLCM2K: function() { return this._isLCM2K;},
	doUpstream: function() {return this._isUpstream;},
	doCatchmentQC: function() {return this._qcCatchment;},
	useNetLocation: function() {return this._useNetLoc;}
	
});

